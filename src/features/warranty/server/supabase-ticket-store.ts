import "server-only";
import { randomBytes } from "node:crypto";
import path from "node:path";
import { createAdminSupabaseClient } from "@/shared/integrations/supabase/server";
import type { WarrantyEvidence, WarrantyEvidenceKind, WarrantyTicket, WarrantyTicketStatus } from "../model/types";
import type { WarrantyTicketInput } from "../model/input";
import { allowedExtension, evidenceInputs } from "../model/evidence";

const WARRANTY_BUCKET = "warranty-evidence";

export async function saveSupabaseTicket(input: WarrantyTicketInput, ticketId: string, submittedAt: string) {
  const client = createAdminSupabaseClient();
  if (!client) throw new Error("Supabase is not configured.");
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

export async function listSupabaseTickets(): Promise<WarrantyTicket[]> {
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

export async function updateSupabaseTicketStatus(ticketId: string, status: WarrantyTicketStatus) {
  const client = createAdminSupabaseClient();
  if (!client) throw new Error("Supabase is not configured.");
  const result = await client.from("warranty_tickets").update({ status }).eq("ticket_id", ticketId).select("updated_at").single();
  if (result.error) throw result.error;
  return String(result.data.updated_at);
}

export async function readSupabaseEvidence(ticketId: string, evidenceId: string) {
  const client = createAdminSupabaseClient();
  if (!client) return null;
  const metadata = await client.from("warranty_evidence").select("original_name, storage_path, mime_type").eq("ticket_id", ticketId).eq("id", evidenceId).maybeSingle();
  if (metadata.error || !metadata.data) return null;
  const file = await client.storage.from(WARRANTY_BUCKET).download(metadata.data.storage_path);
  if (file.error) return null;
  return { bytes: Buffer.from(await file.data.arrayBuffer()), name: metadata.data.original_name, mimeType: metadata.data.mime_type };
}
