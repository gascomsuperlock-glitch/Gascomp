export type CareDirectStatus = "new" | "in_progress" | "resolved";
export type CareDirectFieldErrors = Partial<Record<"name" | "problem" | "whatsapp" | "orderNumber" | "video", string>>;
export type CareDirectReport = {
  id: string;
  name: string;
  problem: string;
  whatsapp: string;
  orderNumber: string;
  status: CareDirectStatus;
  createdAt: string;
  updatedAt: string;
  video: { name: string; mimeType: string; size: number };
};
export const MAX_CARE_DIRECT_VIDEO_BYTES = 50 * 1024 * 1024;
