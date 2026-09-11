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
