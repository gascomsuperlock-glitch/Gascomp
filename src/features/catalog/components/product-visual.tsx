import { Flame, Gauge, LockKeyhole } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { getProductImageSource } from "@/features/catalog/model/product-utils";
import type { ProductImage, ProductTone } from "@/features/catalog/model/types";

const tones: Record<ProductTone, { bg: string; shell: string; glow: string }> = {
  orange: { bg: "bg-[#dfeaff]", shell: "bg-[#0035b9]", glow: "bg-[#a8c3f5]" },
  navy: { bg: "bg-[#dfe7ea]", shell: "bg-[#233847]", glow: "bg-[#9fb1b8]" },
  green: { bg: "bg-[#dfe9df]", shell: "bg-[#4f745e]", glow: "bg-[#a9c3af]" },
};

export function ProductVisual({ tone, image, alt = "Gascomp product photo", className }: { tone: ProductTone; image?: ProductImage; alt?: string; className?: string }) {
  const palette = tones[tone];
  const Icon = tone === "orange" ? Gauge : tone === "navy" ? LockKeyhole : Flame;

  if (image) {
    const source = getProductImageSource(image);
    return (
      <div className={cn("relative isolate overflow-hidden bg-[#f4f5f7]", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={source} alt={image.alt || alt} className="size-full object-contain p-3" />
        {image.isPrimary && <span className="absolute bottom-3 left-3 rounded-full bg-white/90 px-2.5 py-1 text-[8px] font-extrabold tracking-[0.12em] text-[#0035b9] shadow-sm">PRIMARY PHOTO</span>}
      </div>
    );
  }

  return (
    <div className={cn("relative isolate overflow-hidden", palette.bg, className)} aria-hidden="true">
      <div className={cn("absolute -right-8 -top-9 size-32 rounded-full blur-2xl opacity-70", palette.glow)} />
      <div className="absolute inset-x-6 bottom-5 h-4 rounded-[50%] bg-[#2c3038]/10 blur-md" />
      <div className="absolute left-1/2 top-1/2 h-[62%] w-[46%] -translate-x-1/2 -translate-y-[46%]">
        <div className="absolute inset-x-[19%] top-0 h-[18%] rounded-t-xl bg-[#fcfaf5] shadow-sm">
          <div className="absolute inset-x-[15%] top-[42%] h-px bg-[#2c3038]/20" />
        </div>
        <div className={cn("absolute inset-x-0 bottom-[12%] top-[14%] rounded-[28%_28%_22%_22%] shadow-[0_14px_25px_rgba(44,48,56,0.22)]", palette.shell)}>
          <div className="absolute left-1/2 top-[18%] grid size-11 -translate-x-1/2 place-items-center rounded-full border-4 border-white/25 bg-[#2c3038]/15 text-white">
            <Icon className="size-5" strokeWidth={1.8} />
          </div>
          <div className="absolute inset-x-[18%] bottom-[19%] h-[19%] rounded-md border border-white/25 bg-white/12" />
          <div className="absolute bottom-[8%] left-1/2 h-1.5 w-9 -translate-x-1/2 rounded-full bg-white/25" />
        </div>
        <div className="absolute inset-x-[11%] bottom-0 h-[18%] rounded-b-xl bg-[#2c3038] shadow-sm" />
      </div>
      <div className="absolute bottom-4 left-4 rounded-full border border-white/50 bg-white/65 px-2.5 py-1 text-[9px] font-bold tracking-[0.14em] text-[#566169] backdrop-blur-sm">
        GASCOMP
      </div>
    </div>
  );
}
