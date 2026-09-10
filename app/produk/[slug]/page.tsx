import type { Metadata } from "next";
import { ProductHelpPage } from "@/components/product-help-page";
import { getPublicProductBySlug } from "@/lib/site-content-store";

export async function generateMetadata({ params }: PageProps<"/produk/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = await getPublicProductBySlug(slug);

  return {
    title: product ? `Panduan ${product.name}` : "Panduan Produk",
    description: product?.description ?? "Panduan penggunaan produk Gascomp.",
  };
}

export default async function ProductPage({ params }: PageProps<"/produk/[slug]">) {
  const { slug } = await params;
  return <ProductHelpPage slug={slug} />;
}
