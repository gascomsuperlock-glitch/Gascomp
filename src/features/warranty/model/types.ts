export const WARRANTY_TICKET_STATUSES = [
  "new",
  "reviewing",
  "approved",
  "rejected",
  "closed",
] as const;

export type WarrantyTicketStatus = (typeof WARRANTY_TICKET_STATUSES)[number];
export type WarrantyEvidenceKind = "invoice" | "photo" | "video";

export type WarrantyEvidence = {
  id: string;
  kind: WarrantyEvidenceKind;
  originalName: string;
  storedName?: string;
  storagePath?: string;
  mimeType: string;
  size: number;
};

export type WarrantyTicket = {
  ticketId: string;
  status: WarrantyTicketStatus;
  solution?: WarrantySolution | null;
  submittedAt: string;
  updatedAt: string;
  customer: {
    name: string;
    email: string;
    whatsapp: string;
  };
  product: {
    id?: string;
    name: string;
    sku: string;
  };
  purchase: {
    store: string;
    date: string;
    orderNumber: string;
    price: number;
  };
  problem: string;
  evidence: WarrantyEvidence[];
};

export const WARRANTY_SOLUTIONS = {
  warranty_claim: "Klaim Garansi",
  missing_item: "Kirim Barang Kurang",
  wrong_item: "Kirim Barang Salah",
  return_refund: "Retur/Refund",
  spare_part: "Kirim sparepart",
  partial_refund: "Refund dana sebagian",
  usage_guidance: "Edukasi cara pemakaian/kendala",
} as const;
export type WarrantySolution = keyof typeof WARRANTY_SOLUTIONS;
export function isWarrantySolution(value: unknown): value is WarrantySolution {
  return typeof value === "string" && Object.hasOwn(WARRANTY_SOLUTIONS, value);
}
export function ticketStatusLabel(status: WarrantyTicketStatus) {
  const labels: Record<WarrantyTicketStatus, string> = {
    new: "New", reviewing: "Under review", approved: "Approved", rejected: "Rejected", closed: "Closed",
  };
  return labels[status];
}
