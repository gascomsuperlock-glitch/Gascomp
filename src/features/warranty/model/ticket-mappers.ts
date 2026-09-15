import { isWarrantySolution, type WarrantyTicket, type WarrantyEvidence, type WarrantyTicketStatus } from "./types";

export function normalizeLocalTicket(value: Record<string, unknown>): WarrantyTicket | null {
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
      return [{ id, kind: id === "damageVideo" ? "video" : "invoice", originalName: String(file.originalName ?? "evidence"), storedName: String(file.storedName ?? ""), mimeType: String(file.mimeType ?? "application/octet-stream"), size: Number(file.size ?? 0) } as WarrantyEvidence];
    });
  }
  return {
    ticketId: value.ticketId,
    status: (value.status ?? "new") as WarrantyTicketStatus,
    solution: isWarrantySolution(value.solution) ? value.solution : null,
    submittedAt: value.submittedAt,
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : value.submittedAt,
    customer: { name: String(customer?.name ?? ""), email: String(customer?.email ?? ""), whatsapp: String(customer?.whatsapp ?? "") },
    product: { name: String(product?.name ?? ""), sku: String(product?.sku ?? "") },
    purchase: { store: String(purchase?.store ?? ""), date: String(purchase?.date ?? ""), orderNumber: String(purchase?.orderNumber ?? "-"), price: Number(purchase?.price ?? 0) },
    problem: String(value.problem ?? ""), evidence,
  };
}
