import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { Brand } from "@/components/brand";
import { cn } from "@/lib/utils";

export function SiteHeader({ compact = false }: { compact?: boolean }) {
  return (
    <header className="relative z-40 border-b border-[#2c3038]/8 bg-[#ffffff]/90 backdrop-blur-xl">
      <div className={cn("mx-auto flex h-[72px] items-center justify-between px-5 sm:px-8", compact ? "max-w-6xl" : "max-w-7xl")}>
        <Brand />
        <nav className="flex items-center gap-2 sm:gap-7" aria-label="Navigasi utama">
          <Link href="/#produk" className="hidden text-sm font-semibold text-[#566169] transition hover:text-[#2c3038] sm:block">
            Pilih produk
          </Link>
          <Link href="/#bantuan" className="hidden text-sm font-semibold text-[#566169] transition hover:text-[#2c3038] sm:block">
            Pusat bantuan
          </Link>
          <a
            href="#hubungi"
            className="grid size-10 place-items-center rounded-full bg-[#0035b9] text-white shadow-[0_7px_20px_rgba(13,79,215,0.25)] transition hover:-translate-y-0.5"
            aria-label="Hubungi bantuan"
          >
            <MessageCircle className="size-4" />
          </a>
        </nav>
      </div>
    </header>
  );
}
