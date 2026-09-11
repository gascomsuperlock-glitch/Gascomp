"use server";

import { headers } from "next/headers";
import { saveWarrantyTicket } from "@/features/warranty/server/ticket-service";
import { validateEvidenceSelection } from "@/features/warranty/model/evidence";
import type { WarrantyTicketInput } from "@/features/warranty/model/input";

export type WarrantyClaimState = {
  error?: string;
  fieldErrors?: Partial<Record<"name" | "email" | "whatsapp" | "product" | "sku" | "store" | "purchaseDate" | "orderNumber" | "purchasePrice" | "problem" | "invoice" | "damagePhotos" | "damageVideo" | "agreement", string>>;
  success?: boolean;
  ticketId?: string;
};

const recentSubmissions = new Map<string, number>();

function readText(formData: FormData, name: string, maxLength: number) {
  return String(formData.get(name) ?? "").trim().slice(0, maxLength);
}

function getFiles(formData: FormData, name: string) {
  return formData.getAll(name).filter((value): value is File => value instanceof File && (value.name !== "" || value.size > 0));
}

export async function createWarrantyClaim(
  _previousState: WarrantyClaimState,
  formData: FormData,
): Promise<WarrantyClaimState> {
  const requestHeaders = await headers();
  const clientId = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || "localhost";
  const now = Date.now();
  const previousSubmission = recentSubmissions.get(clientId) ?? 0;
  if (now - previousSubmission < 30_000) {
    return { error: "Please wait before submitting another ticket." };
  }

  if (readText(formData, "company", 100)) {
    return { error: "The submission could not be processed." };
  }

  const values = {
    name: readText(formData, "name", 120),
    email: readText(formData, "email", 180),
    whatsapp: readText(formData, "whatsapp", 30),
    product: readText(formData, "product", 180),
    sku: readText(formData, "sku", 80),
    store: readText(formData, "store", 160),
    purchaseDate: readText(formData, "purchaseDate", 10),
    orderNumber: readText(formData, "orderNumber", 120),
    problem: readText(formData, "problem", 3000),
  };
  const purchasePriceText = readText(formData, "purchasePrice", 16).replace(/\D/g, "");
  const purchasePrice = Number(purchasePriceText);
  const invoices = getFiles(formData, "invoice");
  const invoice = invoices[0];
  const damagePhotos = getFiles(formData, "damagePhotos");
  const damageVideos = getFiles(formData, "damageVideo");
  const damageVideo = damageVideos[0];
  const agreement = formData.get("agreement") === "yes";
  const fieldErrors: WarrantyClaimState["fieldErrors"] = {};

  if (values.name.length < 2) fieldErrors.name = "Enter your full name.";
  if (!/^\S+@\S+\.\S+$/.test(values.email)) fieldErrors.email = "Enter a valid email address.";
  if (!/^\+?[0-9]{9,16}$/.test(values.whatsapp.replace(/[\s-]/g, ""))) fieldErrors.whatsapp = "Enter a valid WhatsApp number.";
  if (!values.product) fieldErrors.product = "Enter the product name.";
  if (!values.sku) fieldErrors.sku = "Enter the product SKU.";
  if (!values.store) fieldErrors.store = "Enter the store where the product was purchased.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(values.purchaseDate)) fieldErrors.purchaseDate = "Select the purchase date.";
  if (!values.orderNumber) fieldErrors.orderNumber = "Enter the order number.";
  if (!Number.isSafeInteger(purchasePrice) || purchasePrice <= 0) fieldErrors.purchasePrice = "Enter the purchase price in Indonesian Rupiah.";
  if (values.problem.length < 15) fieldErrors.problem = "Describe the product issue in at least 15 characters.";
  if (!agreement) fieldErrors.agreement = "Consent is required to submit a claim.";

  for (const [field, files, kind] of [
    ["invoice", invoices, "invoice"],
    ["damagePhotos", damagePhotos, "photo"],
    ["damageVideo", damageVideos, "video"],
  ] as const) {
    const error = validateEvidenceSelection(files, kind);
    if (error) fieldErrors[field] = error;
  }

  if (Object.keys(fieldErrors).length > 0 || !invoice) {
    return { error: "Review the submission details.", fieldErrors };
  }

  const input: WarrantyTicketInput = { ...values, purchasePrice, invoice, damagePhotos, damageVideo };
  try {
    const result = await saveWarrantyTicket(input);
    recentSubmissions.set(clientId, now);
    return { success: true, ticketId: result.ticketId };
  } catch {
    return { error: "The ticket could not be saved. Please try again." };
  }
}
