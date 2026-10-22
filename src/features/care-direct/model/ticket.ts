import { careDirectCopy } from "./copy";

export function buildCareDirectTicket(data: FormData, reportId: string, origin: string, language: "id" | "en") {
  const copy = careDirectCopy[language];
  const value = (key: string) => String(data.get(key) ?? "").trim();
  const video = data.get("video");
  return [copy.ticket, `${copy.report}: ${reportId}`, `${copy.name}: ${value("name")}`,
    `${copy.whatsapp}: ${value("whatsapp")}`, `${copy.orderNumber}: ${value("orderNumber")}`,
    `${copy.problem}:\n${value("problem")}`, `${copy.video}: ${video instanceof File ? video.name : ""}`,
    `${copy.videoLink}: ${new URL(`/admin/care-direct/reports/${encodeURIComponent(reportId)}/video`, origin).href}`,
    `[✓] ${copy.agreeNoReturn}`, `[✓] ${copy.agreeNoReview}`].join("\n\n");
}
