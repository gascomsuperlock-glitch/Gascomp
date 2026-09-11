"use client";

import { BadgeCheck, HeartHandshake, MapPin, TicketCheck } from "lucide-react";
import type { Product } from "@/features/catalog/model/types";
import type { IconType } from "@/shared/lib/icon-types";
import { EditorHeading } from "@/shared/components/ui/editor-fields";

export type TicketService = "warranty" | "care" | "service-center";

export const ticketServices: Record<TicketService, {
  title: string;
  eyebrow: string;
  description: string;
  url: string;
  icon: IconType;
  accent: string;
}> = {
  warranty: {
    title: "Warranty Claim",
    eyebrow: "PRODUCT PROTECTION",
    description: "Request a warranty review by providing purchase details and evidence of the product issue.",
    url: "/klaim-garansi",
    icon: BadgeCheck,
    accent: "bg-[#edf4ff] text-[#0035b9]",
  },
  care: {
    title: "Gascomp Care",
    eyebrow: "CUSTOMER SUPPORT",
    description: "Ask a question or report an issue that the product tutorials and FAQs did not resolve.",
    url: "https://gascompsuperlock.com/kontak/",
    icon: HeartHandshake,
    accent: "bg-[#e9f5ed] text-[#3f8056]",
  },
  "service-center": {
    title: "Service Center",
    eyebrow: "PRODUCT REPAIR",
    description: "Find after-sales service and request support before bringing the product to a service center.",
    url: "https://gascompsuperlock.com/kontak/?layanan=service-center",
    icon: MapPin,
    accent: "bg-[#fff3e8] text-[#a65b27]",
  },
};

export function TicketServiceCard({ product, service }: { product: Product; service: TicketService }) {
  const item = ticketServices[service];
  const Icon = item.icon;
  const separator = item.url.includes("?") ? "&" : "?";
  const ticketUrl = `${item.url}${separator}sku=${encodeURIComponent(product.sku)}&product=${encodeURIComponent(product.name)}`;
  const isInternal = item.url.startsWith("/");

  return (
    <div>
      <EditorHeading title={item.title} copy={`Access support for ${product.name} (${product.sku}).`} />
      <article className="mt-7 overflow-hidden rounded-[24px] border border-[#2c3038]/9 bg-[#fafbfc]">
        <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="flex items-start gap-4">
            <span className={`grid size-12 shrink-0 place-items-center rounded-2xl ${item.accent}`}><Icon className="size-5" /></span>
            <div>
              <p className="text-[9px] font-extrabold tracking-[0.14em] text-[#879096]">{item.eyebrow}</p>
              <h3 className="mt-2 text-xl font-extrabold tracking-[-0.03em]">{item.title}</h3>
              <p className="mt-2 max-w-xl text-xs leading-5 text-[#707a80]">{item.description}</p>
              <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-bold text-[#69747b]"><span className="rounded-full bg-white px-3 py-1.5 shadow-sm">SKU: {product.sku}</span><span className="rounded-full bg-white px-3 py-1.5 shadow-sm">Product: {product.name}</span></div>
            </div>
          </div>
          <a href={ticketUrl} target={isInternal ? undefined : "_blank"} rel={isInternal ? undefined : "noreferrer"} className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-[#0035b9] px-5 text-xs font-extrabold text-white shadow-[0_10px_24px_rgba(0,53,185,0.2)]"><TicketCheck className="size-4" /> Submit ticket</a>
        </div>
        <div className="border-t border-[#2c3038]/8 bg-white px-6 py-4 text-[10px] leading-4 text-[#858e93] sm:px-8">{isInternal ? "The button opens the Warranty Claim form on the Gascomp Help Center." : "The button opens an official Gascomp channel in a new tab. Customer data is not stored in this admin panel."}</div>
      </article>
    </div>
  );
}
