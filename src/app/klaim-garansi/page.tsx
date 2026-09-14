import type { Metadata } from "next";
import { WarrantyClaimPage as WarrantyClaimPageContent } from "@/features/warranty/components/warranty-claim-page";

export const metadata: Metadata = {
  title: "Warranty Claim",
  description: "Submit a warranty claim for a Gascomp product.",
};

export default async function WarrantyClaimPage({
  searchParams,
}: {
  searchParams: Promise<{ sku?: string | string[]; product?: string | string[] }>;
}) {
  const query = await searchParams;
  const defaultSku = typeof query.sku === "string" ? query.sku.slice(0, 80) : "";
  const defaultProduct = typeof query.product === "string" ? query.product.slice(0, 180) : "";

  return <WarrantyClaimPageContent defaultProduct={defaultProduct} defaultSku={defaultSku} />;
}
