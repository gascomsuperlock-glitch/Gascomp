"use server";

import { headers } from "next/headers";
import {
  MAX_PHOTO_COUNT,
  saveWarrantyTicket,
  validateEvidenceFile,
  type WarrantyTicketInput,
} from "@/lib/warranty-tickets";

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

function getFile(formData: FormData, name: string) {
  const value = formData.get(name);
  return value instanceof File && value.size > 0 ? value : undefined;
}

function getFiles(formData: FormData, name: string) {
  return formData.getAll(name).filter((value): value is File => value instanceof File && value.size > 0);
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
    return { error: "Tunggu sebentar sebelum mengirim tiket berikutnya." };
  }

  if (readText(formData, "company", 100)) {
    return { error: "Pengajuan tidak dapat diproses." };
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
  const invoice = getFile(formData, "invoice");
  const damagePhotos = getFiles(formData, "damagePhotos");
  const damageVideo = getFile(formData, "damageVideo");
  const agreement = formData.get("agreement") === "yes";
  const fieldErrors: WarrantyClaimState["fieldErrors"] = {};

  if (values.name.length < 2) fieldErrors.name = "Masukkan nama lengkap.";
  if (!/^\S+@\S+\.\S+$/.test(values.email)) fieldErrors.email = "Masukkan alamat email yang valid.";
  if (!/^\+?[0-9]{9,16}$/.test(values.whatsapp.replace(/[\s-]/g, ""))) fieldErrors.whatsapp = "Masukkan nomor WhatsApp yang valid.";
  if (!values.product) fieldErrors.product = "Masukkan nama produk.";
  if (!values.sku) fieldErrors.sku = "Masukkan SKU produk.";
  if (!values.store) fieldErrors.store = "Masukkan nama toko tempat pembelian.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(values.purchaseDate)) fieldErrors.purchaseDate = "Pilih tanggal pembelian.";
  if (!values.orderNumber) fieldErrors.orderNumber = "Masukkan nomor pesanan.";
  if (!Number.isSafeInteger(purchasePrice) || purchasePrice <= 0) fieldErrors.purchasePrice = "Masukkan harga pembelian dalam Rupiah.";
  if (values.problem.length < 15) fieldErrors.problem = "Jelaskan kendala produk minimal 15 karakter.";
  if (!invoice) fieldErrors.invoice = "Unggah invoice atau bukti pembelian.";
  if (damagePhotos.length === 0) fieldErrors.damagePhotos = "Unggah minimal satu foto kondisi produk.";
  if (damagePhotos.length > MAX_PHOTO_COUNT) fieldErrors.damagePhotos = `Maksimal ${MAX_PHOTO_COUNT} foto.`;
  if (!damageVideo) fieldErrors.damageVideo = "Unggah video yang memperlihatkan kendala produk.";
  if (!agreement) fieldErrors.agreement = "Persetujuan diperlukan untuk mengirim klaim.";

  if (invoice) {
    const invoiceError = validateEvidenceFile(invoice, "invoice");
    if (invoiceError) fieldErrors.invoice = invoiceError;
  }
  if (damageVideo) {
    const videoError = validateEvidenceFile(damageVideo, "video");
    if (videoError) fieldErrors.damageVideo = videoError;
  }
  for (const photo of damagePhotos) {
    const photoError = validateEvidenceFile(photo, "photo");
    if (photoError) {
      fieldErrors.damagePhotos = photoError;
      break;
    }
  }

  if (Object.keys(fieldErrors).length > 0 || !invoice) {
    return { error: "Periksa kembali data pengajuan.", fieldErrors };
  }

  const input: WarrantyTicketInput = { ...values, purchasePrice, invoice, damagePhotos, damageVideo };
  try {
    const result = await saveWarrantyTicket(input);
    recentSubmissions.set(clientId, now);
    return { success: true, ticketId: result.ticketId };
  } catch {
    return { error: "Tiket belum dapat disimpan. Silakan coba kembali." };
  }
}
