import { MAX_CARE_DIRECT_VIDEO_BYTES, type CareDirectFieldErrors } from "./types";
export const SUBMISSION_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function parseCareDirectInput(form: FormData) {
  const fieldErrors: CareDirectFieldErrors = {};
  const value = (key: string) => typeof form.get(key) === "string" ? String(form.get(key)).trim() : "";
  const name = value("name"), problem = value("problem"), orderNumber = value("orderNumber");
  const whatsapp = value("whatsapp").replace(/[\s()+.-]/g, "").replace(/^0/, "62");
  if (!name || name.length > 120) fieldErrors.name = "Enter a name of up to 120 characters.";
  if (!problem || problem.length > 5000) fieldErrors.problem = "Describe the problem in up to 5,000 characters.";
  if (!/^\d{8,15}$/.test(whatsapp)) fieldErrors.whatsapp = "Enter a valid WhatsApp number including its country code.";
  if (!orderNumber || orderNumber.length > 120) fieldErrors.orderNumber = "Enter an order number of up to 120 characters.";
  const video = form.get("video");
  if (!(video instanceof File) || !video.size || video.size > MAX_CARE_DIRECT_VIDEO_BYTES || form.getAll("video").length !== 1) fieldErrors.video = "Choose one video up to 50 MB.";
  return { input: { name, problem, whatsapp, orderNumber, submissionId: value("submissionId").toLowerCase() }, video, fieldErrors };
}
