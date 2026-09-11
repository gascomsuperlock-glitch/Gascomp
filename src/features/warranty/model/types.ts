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
