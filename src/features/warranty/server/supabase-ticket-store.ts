import "server-only";
import { DUPLICATE_CLAIM_ERROR, EXPIRED_CLAIM_ERROR, normalizeClaimIdentity } from "../model/claim-eligibility";
import { randomBytes } from "node:crypto";
import path from "node:path";
import { createAdminSupabaseClient } from "@/shared/integrations/supabase/server";
import type { WarrantyEvidence, WarrantyEvidenceKind, WarrantyTicket, WarrantyTicketStatus, WarrantySolution } from "../model/types";
import type { WarrantyTicketInput } from "../model/input";
import { allowedExtension, evidenceInputs } from "../model/evidence";

import { claimStorageFetch, uploadClaimEvidence } from "./claim-storage";

const WARRANTY_BUCKET = "warranty-evidence";

export async function saveSupabaseTicket(input: WarrantyTicketInput, ticketId: string, submittedAt: string) {
  const client = createAdminSupabaseClient(claimStorageFetch());
  if (!client) throw new Error("Supabase is not configured.");
  // Check existing tickets before uploading evidence, including legacy records.
  for (let offset = 0; ; offset += 500) {
    const result = await client.from("warranty_tickets").select("order_number, sku").order("ticket_id").range(offset, offset + 499);
    if (result.error) throw result.error;
    const rows = result.data ?? [];
    if (rows.some((row) => normalizeClaimIdentity(row.order_number) === normalizeClaimIdentity(input.orderNumber) && normalizeClaimIdentity(row.sku) === normalizeClaimIdentity(input.sku))) throw new Error(DUPLICATE_CLAIM_ERROR);
    if (rows.length < 500) break;
  }
  const productResult = await client.from("products").select("id").eq("sku", input.sku).limit(1).maybeSingle();
  if (productResult.error) throw productResult.error;
  const productId = (productResult.data as { id: string } | null)?.id ?? null;
  const evidence: WarrantyEvidence[] = evidenceInputs(input).map((item) => ({
    id: `${ticketId}-${item.id}`, kind: item.kind, originalName: path.basename(item.file.name),
    storagePath: `tickets/${ticketId}/${item.id}-${randomBytes(5).toString("hex")}${allowedExtension(item.file, item.kind)}`,
    mimeType: item.file.type, size: item.file.size,
  }));
  const attemptedPaths: string[] = [];
  let inserted = false;
  try {
    const insertTicket = await client.from("warranty_tickets").insert({
      ticket_id: ticketId, status: "new", submitted_at: submittedAt,
      customer_name: input.name, customer_email: input.email, customer_whatsapp: input.whatsapp,
      product_id: productId, product_name: input.product, sku: input.sku,
      store: input.store, purchase_date: input.purchaseDate, order_number: input.orderNumber,
      purchase_price: input.purchasePrice, problem: input.problem,
    });
    if (insertTicket.error) {
      if (insertTicket.error.message.includes("duplicate_warranty_claim")) throw new Error(DUPLICATE_CLAIM_ERROR);
      if (insertTicket.error.message.includes("expired_warranty_claim")) throw new Error(EXPIRED_CLAIM_ERROR);
      throw insertTicket.error;
    }
    inserted = true;
    const items = evidenceInputs(input).map((item, index) => ({ ...item, metadata: evidence[index] }))
      .sort((a, b) => b.file.size - a.file.size);
    await uploadClaimEvidence(items, async (item) => {
      const storagePath = item.metadata.storagePath!;
      // Include uncertain uploads in cleanup if their response is lost.
      attemptedPaths.push(storagePath);
      const upload = await client.storage.from(WARRANTY_BUCKET).upload(storagePath, item.file, { contentType: item.file.type, upsert: false });
      if (upload.error) throw upload.error;
    });
    const metadata = await client.from("warranty_evidence").insert(evidence.map((item) => ({
      id: item.id, ticket_id: ticketId, kind: item.kind, original_name: item.originalName,
      storage_path: item.storagePath, mime_type: item.mimeType, size_bytes: item.size,
    })));
    if (metadata.error) throw metadata.error;
    return {
      ticketId, status: "new" as const, submittedAt, updatedAt: submittedAt,
      customer: { name: input.name, email: input.email, whatsapp: input.whatsapp },
      product: { id: productId ?? undefined, name: input.product, sku: input.sku },
      purchase: { store: input.store, date: input.purchaseDate, orderNumber: input.orderNumber, price: input.purchasePrice },
      problem: input.problem, evidence,
    };
  } catch (error) {
    if (inserted) {
      const cleanup = createAdminSupabaseClient(claimStorageFetch(8_000));
      if (cleanup) {
        const results = await Promise.allSettled([
          ...(attemptedPaths.length ? [cleanup.storage.from(WARRANTY_BUCKET).remove(attemptedPaths)] : []),
          cleanup.from("warranty_tickets").delete().eq("ticket_id", ticketId),
        ]);
        if (results.some((result) => result.status === "rejected" || result.value.error)) console.error("Warranty claim cleanup failed; reconcile incomplete evidence.");
      }
    }
    throw error;
  }
}

export async function listSupabaseTickets(bounds?: { start: string; end: string }): Promise<WarrantyTicket[]> {
  const client = createAdminSupabaseClient();
  if (!client) return [];
  const ticketRows: Record<string, unknown>[] = [];
  const evidenceRows: Record<string, unknown>[] = [];
  for (const [table, rows, order] of [
    ["warranty_tickets", ticketRows, "ticket_id"],
    ["warranty_evidence", evidenceRows, "id"],
  ] as const) {
    if (bounds && table === "warranty_evidence") continue;
    for (let offset = 0; ; offset += 500) {
      let query = client.from(table).select("*").order(order).range(offset, offset + 499);
      if (bounds) query = query.gte("submitted_at", bounds.start).lt("submitted_at", bounds.end);
      const result = await query;
      if (result.error) throw result.error;
      rows.push(...(result.data ?? []));
      if ((result.data ?? []).length < 500) break;
    }
  }
  return ticketRows.filter((row) => !row.deleted_at).sort((a, b) => String(b.submitted_at).localeCompare(String(a.submitted_at))).map((row) => ({
    ticketId: String(row.ticket_id), status: row.status as WarrantyTicketStatus,
    solution: row.solution as WarrantySolution | null,
    submittedAt: String(row.submitted_at), updatedAt: String(row.updated_at),
    customer: { name: String(row.customer_name), email: String(row.customer_email), whatsapp: String(row.customer_whatsapp) },
    product: { id: row.product_id ? String(row.product_id) : undefined, name: String(row.product_name), sku: String(row.sku) },
    purchase: { store: String(row.store), date: String(row.purchase_date), orderNumber: String(row.order_number), price: Number(row.purchase_price) },
    problem: String(row.problem),
    evidence: evidenceRows.filter((item) => item.ticket_id === row.ticket_id).map((item) => ({ id: String(item.id), kind: item.kind as WarrantyEvidenceKind, originalName: String(item.original_name), storagePath: String(item.storage_path), mimeType: String(item.mime_type), size: Number(item.size_bytes) })),
  }));
}

export async function updateSupabaseTicketStatus(ticketId: string, status: WarrantyTicketStatus | undefined, solution: WarrantySolution | undefined) {
  const client = createAdminSupabaseClient();
  if (!client) throw new Error("Supabase is not configured.");
  const result = await client.from("warranty_tickets").update({ ...(status ? { status } : {}), ...(solution !== undefined ? { solution } : {}) }).eq("ticket_id", ticketId).is("deleted_at", null).select("updated_at").single();
  if (result.error) throw result.error;
  return String(result.data.updated_at);
}

export async function readSupabaseEvidence(ticketId: string, evidenceId: string) {
  const client = createAdminSupabaseClient();
  if (!client) return null;
  const ticket = await client.from("warranty_tickets").select("*").eq("ticket_id", ticketId).maybeSingle();
  if (ticket.error || !ticket.data || ticket.data.deleted_at) return null;
  const metadata = await client.from("warranty_evidence").select("original_name, storage_path, mime_type").eq("ticket_id", ticketId).eq("id", evidenceId).maybeSingle();
  if (metadata.error || !metadata.data) return null;
  const file = await client.storage.from(WARRANTY_BUCKET).download(metadata.data.storage_path);
  if (file.error) return null;
  return { bytes: Buffer.from(await file.data.arrayBuffer()), name: metadata.data.original_name, mimeType: metadata.data.mime_type };
}

export async function deleteSupabaseTicket(ticketId: string) {
  const client = createAdminSupabaseClient();
  if (!client) throw new Error("Supabase is not configured.");
  const result = await client.from("warranty_tickets").update({ deleted_at: new Date().toISOString() }).eq("ticket_id", ticketId);
  if (result.error) throw result.error;
}
