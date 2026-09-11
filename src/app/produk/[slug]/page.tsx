import type { Metadata } from "next";
import { ProductHelpPage } from "@/features/catalog/components/product-help-page";
import { getPublicProductBySlug } from "@/features/catalog/server/content-store";

export async function generateMetadata({ params }: PageProps<"/produk/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = await getPublicProductBySlug(slug);

  return {
    title: product ? `${product.name} Guide` : "Product Guide",
    description: product?.description ?? "Gascomp product usage guide.",
  };
}

export default async function ProductPage({ params }: PageProps<"/produk/[slug]">) {
  const { slug } = await params;
  return <ProductHelpPage slug={slug} />;
}
