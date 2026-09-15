export function normalizeWhatsapp(number: string) {
  const digits = number.replace(/\D/g, "");
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  return digits;
}

export function getWhatsappUrl(number: string, productName?: string, issue?: string, language: AppLanguage = "en") {
  const context = productName ? (language === "id" ? ` untuk ${productName}` : ` with ${productName}`) : "";
  const issueText = issue ? (language === "id" ? ` Kendala saya: ${issue}.` : ` My issue: ${issue}.`) : "";
  const message = language === "id"
    ? `Halo Admin Gascomp, saya membutuhkan bantuan${context}.${issueText}`
    : `Hello Gascomp Admin, I need help${context}.${issueText}`;
  return `https://wa.me/${normalizeWhatsapp(number)}?text=${encodeURIComponent(message)}`;
}
import type { AppLanguage } from "@/shared/i18n/language";

export function getWarrantyWhatsappUrl(number: string, ticketId?: string, adminUrl?: string) {
  const destination = normalizeWhatsapp(number);
  if (!destination) return null;
  const message = ["kak, aku sudah claim garansi", ticketId ? `Ticket: ${ticketId}` : "", adminUrl ?? ""].filter(Boolean).join("\n");
  return `https://wa.me/${destination}?text=${encodeURIComponent(message)}`;
}
