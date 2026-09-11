export function normalizeWhatsapp(number: string) {
  const digits = number.replace(/\D/g, "");
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  return digits;
}

export function getWhatsappUrl(number: string, productName?: string, issue?: string) {
  const context = productName ? ` with ${productName}` : "";
  const issueText = issue ? ` My issue: ${issue}.` : "";
  const message = `Hello Gascomp Admin, I need help${context}.${issueText}`;
  return `https://wa.me/${normalizeWhatsapp(number)}?text=${encodeURIComponent(message)}`;
}
