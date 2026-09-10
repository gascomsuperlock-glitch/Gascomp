import "server-only";

import { randomBytes } from "node:crypto";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { createAdminSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type {
  WarrantyEvidence,
  WarrantyEvidenceKind,
  WarrantyTicket,
  WarrantyTicketStatus,
} from "@/lib/warranty-ticket-types";

const TICKET_ROOT = path.join(process.cwd(), ".data", "warranty-tickets");
const WARRANTY_BUCKET = "warranty-evidence";

const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};
const ALLOWED_INVOICE_TYPES: Record<string, string> = { ...ALLOWED_IMAGE_TYPES, "application/pdf": ".pdf" };
const ALLOWED_VIDEO_TYPES: Record<string, string> = {
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "video/quicktime": ".mov",
};

export const MAX_INVOICE_SIZE = 4 * 1024 * 1024;
export const MAX_PHOTO_SIZE = 4 * 1024 * 1024;
export const MAX_PHOTO_COUNT = 4;
export const MAX_VIDEO_SIZE = 12 * 1024 * 1024;

export type WarrantyTicketInput = {
  name: string;
  email: string;
  whatsapp: string;
  product: string;
  sku: string;
  store: string;
  purchaseDate: string;
  orderNumber: string;
  purchasePrice: number;
  problem: string;
  invoice: File;
  damagePhotos: File[];
  damageVideo?: File;
};

export function validateEvidenceFile(file: File, kind: WarrantyEvidenceKind): string | null {
  const allowedTypes = kind === "invoice" ? ALLOWED_INVOICE_TYPES : kind === "photo" ? ALLOWED_IMAGE_TYPES : ALLOWED_VIDEO_TYPES;
  const maxSize = kind === "invoice" ? MAX_INVOICE_SIZE : kind === "photo" ? MAX_PHOTO_SIZE : MAX_VIDEO_SIZE;
  if (!(file.type in allowedTypes)) {
    if (kind === "invoice") return "Bukti pembelian harus berupa JPG, PNG, WebP, atau PDF.";
    if (kind === "photo") return "Foto kendala harus berupa JPG, PNG, atau WebP.";
    return "Video kendala harus berupa MP4, WebM, atau MOV.";
  }
  if (file.size > maxSize) {
    if (kind === "invoice") return "Ukuran bukti pembelian maksimal 4 MB.";
    if (kind === "photo") return "Ukuran setiap foto maksimal 4 MB.";
    return "Ukuran video kendala maksimal 12 MB.";
  }
  return null;
}

function createTicketId() {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  return `GWC-${date}-${randomBytes(3).toString("hex").toUpperCase()}`;
}

function allowedExtension(file: File, kind: WarrantyEvidenceKind) {
  const types = kind === "invoice" ? ALLOWED_INVOICE_TYPES : kind === "photo" ? ALLOWED_IMAGE_TYPES : ALLOWED_VIDEO_TYPES;
  return types[file.type];
}

function evidenceInputs(input: WarrantyTicketInput) {
  return [
    { id: "invoice", kind: "invoice" as const, file: input.invoice },
    ...input.damagePhotos.map((file, index) => ({ id: `photo-${index + 1}`, kind: "photo" as const, file })),
    ...(input.damageVideo ? [{ id: "video", kind: "video" as const, file: input.damageVideo }] : []),
  ];
}

async function saveLocalTicket(input: WarrantyTicketInput, ticketId: string, submittedAt: string) {
  const ticketDirectory = path.join(TICKET_ROOT, ticketId);
  await mkdir(TICKET_ROOT, { recursive: true });
  await mkdir(ticketDirectory, { recursive: false });
  try {
    const evidence: WarrantyEvidence[] = [];
    for (const item of evidenceInputs(input)) {
      const storedName = `${item.id}${allowedExtension(item.file, item.kind)}`;
      await writeFile(path.join(ticketDirectory, storedName), Buffer.from(await item.file.arrayBuffer()), { flag: "wx" });
      evidence.push({ id: item.id, kind: item.kind, originalName: path.basename(item.file.name), storedName, mimeType: item.file.type, size: item.file.size });
    }
    const ticket: WarrantyTicket = {
      ticketId,
      status: "new",
      submittedAt,
      updatedAt: submittedAt,
      customer: { name: input.name, email: input.email, whatsapp: input.whatsapp },
      product: { name: input.product, sku: input.sku },
      purchase: { store: input.store, date: input.purchaseDate, orderNumber: input.orderNumber, price: input.purchasePrice },
      problem: input.problem,
      evidence,
    };
    await writeFile(path.join(ticketDirectory, "ticket.json"), JSON.stringify({ schemaVersion: 2, ...ticket }, null, 2), { encoding: "utf8", flag: "wx" });
    return ticket;
  } catch (error) {
    await rm(ticketDirectory, { recursive: true, force: true });
    throw error;
  }
}

async function saveSupabaseTicket(input: WarrantyTicketInput, ticketId: string, submittedAt: string) {
  const client = createAdminSupabaseClient();
  if (!client) throw new Error("Supabase belum dikonfigurasi.");
  const productResult = await client.from("products").select("id").eq("sku", input.sku).limit(1).maybeSingle();
  if (productResult.error) throw productResult.error;
  const productId = (productResult.data as { id: string } | null)?.id ?? null;
  const insertTicket = await client.from("warranty_tickets").insert({
    ticket_id: ticketId, status: "new", submitted_at: submittedAt,
    customer_name: input.name, customer_email: input.email, customer_whatsapp: input.whatsapp,
    product_id: productId, product_name: input.product, sku: input.sku,
    store: input.store, purchase_date: input.purchaseDate, order_number: input.orderNumber,
    purchase_price: input.purchasePrice, problem: input.problem,
  });
  if (insertTicket.error) throw insertTicket.error;

  const uploadedPaths: string[] = [];
  try {
    const evidence: WarrantyEvidence[] = [];
    for (const item of evidenceInputs(input)) {
      const storagePath = `tickets/${ticketId}/${item.id}-${randomBytes(5).toString("hex")}${allowedExtension(item.file, item.kind)}`;
      const upload = await client.storage.from(WARRANTY_BUCKET).upload(storagePath, new Uint8Array(await item.file.arrayBuffer()), { contentType: item.file.type, upsert: false });
      if (upload.error) throw upload.error;
      uploadedPaths.push(storagePath);
      const evidenceId = `${ticketId}-${item.id}`;
      const metadata = await client.from("warranty_evidence").insert({
        id: evidenceId, ticket_id: ticketId, kind: item.kind, original_name: path.basename(item.file.name),
        storage_path: storagePath, mime_type: item.file.type, size_bytes: item.file.size,
      });
      if (metadata.error) throw metadata.error;
      evidence.push({ id: evidenceId, kind: item.kind, originalName: path.basename(item.file.name), storagePath, mimeType: item.file.type, size: item.file.size });
    }
    return {
      ticketId, status: "new" as const, submittedAt, updatedAt: submittedAt,
      customer: { name: input.name, email: input.email, whatsapp: input.whatsapp },
      product: { id: productId ?? undefined, name: input.product, sku: input.sku },
      purchase: { store: input.store, date: input.purchaseDate, orderNumber: input.orderNumber, price: input.purchasePrice },
      problem: input.problem, evidence,
    };
  } catch (error) {
    if (uploadedPaths.length) await client.storage.from(WARRANTY_BUCKET).remove(uploadedPaths);
    await client.from("warranty_tickets").delete().eq("ticket_id", ticketId);
    throw error;
  }
}

export async function saveWarrantyTicket(input: WarrantyTicketInput) {
  const ticketId = createTicketId();
  const submittedAt = new Date().toISOString();
  const ticket = isSupabaseConfigured()
    ? await saveSupabaseTicket(input, ticketId, submittedAt)
    : await saveLocalTicket(input, ticketId, submittedAt);
  return { ticketId: ticket.ticketId, submittedAt: ticket.submittedAt };
}

function normalizeLocalTicket(value: Record<string, unknown>): WarrantyTicket | null {
  if (typeof value.ticketId !== "string" || typeof value.submittedAt !== "string") return null;
  const customer = value.customer as Record<string, unknown> | undefined;
  const product = value.product as Record<string, unknown> | undefined;
  const purchase = value.purchase as Record<string, unknown> | undefined;
  const rawEvidence = value.evidence as Record<string, unknown> | WarrantyEvidence[] | undefined;
  let evidence: WarrantyEvidence[] = [];
  if (Array.isArray(rawEvidence)) evidence = rawEvidence;
  else if (rawEvidence) {
    evidence = Object.entries(rawEvidence).flatMap(([id, item]) => {
      if (!item || typeof item !== "object") return [];
      const file = item as Record<string, unknown>;
      return [{ id, kind: id === "damageVideo" ? "video" : "invoice", originalName: String(file.originalName ?? "lampiran"), storedName: String(file.storedName ?? ""), mimeType: String(file.mimeType ?? "application/octet-stream"), size: Number(file.size ?? 0) } as WarrantyEvidence];
    });
  }
  return {
    ticketId: value.ticketId,
    status: (value.status ?? "new") as WarrantyTicketStatus,
    submittedAt: value.submittedAt,
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : value.submittedAt,
    customer: { name: String(customer?.name ?? ""), email: String(customer?.email ?? ""), whatsapp: String(customer?.whatsapp ?? "") },
    product: { name: String(product?.name ?? ""), sku: String(product?.sku ?? "") },
    purchase: { store: String(purchase?.store ?? ""), date: String(purchase?.date ?? ""), orderNumber: String(purchase?.orderNumber ?? "-"), price: Number(purchase?.price ?? 0) },
    problem: String(value.problem ?? ""), evidence,
  };
}

async function listLocalTickets() {
  let directories: string[] = [];
  try { directories = await readdir(TICKET_ROOT); } catch { return []; }
  const tickets = await Promise.all(directories.map(async (directory) => {
    try {
      const value = JSON.parse(await readFile(path.join(TICKET_ROOT, directory, "ticket.json"), "utf8")) as Record<string, unknown>;
      return normalizeLocalTicket(value);
    } catch { return null; }
  }));
  return tickets.filter((ticket): ticket is WarrantyTicket => Boolean(ticket)).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
}

export async function listWarrantyTickets(): Promise<WarrantyTicket[]> {
  if (!isSupabaseConfigured()) return listLocalTickets();
  const client = createAdminSupabaseClient();
  if (!client) return [];
  const [ticketsResult, evidenceResult] = await Promise.all([
    client.from("warranty_tickets").select("*").order("submitted_at", { ascending: false }),
    client.from("warranty_evidence").select("*").order("created_at", { ascending: true }),
  ]);
  if (ticketsResult.error) throw ticketsResult.error;
  if (evidenceResult.error) throw evidenceResult.error;
  const evidenceRows = (evidenceResult.data ?? []) as Array<Record<string, unknown>>;
  return ((ticketsResult.data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    ticketId: String(row.ticket_id), status: row.status as WarrantyTicketStatus,
    submittedAt: String(row.submitted_at), updatedAt: String(row.updated_at),
    customer: { name: String(row.customer_name), email: String(row.customer_email), whatsapp: String(row.customer_whatsapp) },
    product: { id: row.product_id ? String(row.product_id) : undefined, name: String(row.product_name), sku: String(row.sku) },
    purchase: { store: String(row.store), date: String(row.purchase_date), orderNumber: String(row.order_number), price: Number(row.purchase_price) },
    problem: String(row.problem),
    evidence: evidenceRows.filter((item) => item.ticket_id === row.ticket_id).map((item) => ({ id: String(item.id), kind: item.kind as WarrantyEvidenceKind, originalName: String(item.original_name), storagePath: String(item.storage_path), mimeType: String(item.mime_type), size: Number(item.size_bytes) })),
  }));
}

export async function updateWarrantyTicketStatus(ticketId: string, status: WarrantyTicketStatus) {
  if (isSupabaseConfigured()) {
    const client = createAdminSupabaseClient();
    if (!client) throw new Error("Supabase belum dikonfigurasi.");
    const result = await client.from("warranty_tickets").update({ status }).eq("ticket_id", ticketId).select("ticket_id").single();
    if (result.error) throw result.error;
    return;
  }
  const ticketPath = path.join(TICKET_ROOT, ticketId, "ticket.json");
  const value = JSON.parse(await readFile(ticketPath, "utf8")) as Record<string, unknown>;
  value.status = status;
  value.updatedAt = new Date().toISOString();
  await writeFile(ticketPath, JSON.stringify(value, null, 2), "utf8");
}

export async function readWarrantyEvidence(ticketId: string, evidenceId: string) {
  if (isSupabaseConfigured()) {
    const client = createAdminSupabaseClient();
    if (!client) return null;
    const metadata = await client.from("warranty_evidence").select("original_name, storage_path, mime_type").eq("ticket_id", ticketId).eq("id", evidenceId).maybeSingle();
    if (metadata.error || !metadata.data) return null;
    const file = await client.storage.from(WARRANTY_BUCKET).download(metadata.data.storage_path);
    if (file.error) return null;
    return { bytes: Buffer.from(await file.data.arrayBuffer()), name: metadata.data.original_name, mimeType: metadata.data.mime_type };
  }
  const tickets = await listLocalTickets();
  const evidence = tickets.find((item) => item.ticketId === ticketId)?.evidence.find((item) => item.id === evidenceId);
  if (!evidence?.storedName) return null;
  return { bytes: await readFile(path.join(TICKET_ROOT, ticketId, path.basename(evidence.storedName))), name: evidence.originalName, mimeType: evidence.mimeType };
}
