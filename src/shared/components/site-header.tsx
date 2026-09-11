import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { Brand } from "@/shared/components/brand";
import { cn } from "@/shared/lib/utils";

export function SiteHeader({ compact = false }: { compact?: boolean }) {
  return (
    <header className="relative z-40 border-b border-[#2c3038]/8 bg-[#ffffff]/90 backdrop-blur-xl">
      <div className={cn("mx-auto flex min-h-[72px] flex-wrap items-center justify-between gap-3 px-5 py-3 sm:px-8", compact ? "max-w-6xl" : "max-w-7xl")}>
        <Brand />
        <nav className="flex items-center gap-2 sm:gap-7" aria-label="Main navigation">
          <Link href="/#produk" className="hidden text-sm font-semibold text-[#566169] transition hover:text-[#2c3038] sm:block">
            Choose a product
          </Link>
          <Link href="/#bantuan" className="hidden text-sm font-semibold text-[#566169] transition hover:text-[#2c3038] sm:block">
            Help center
          </Link>
          <Link
            href="/admin/login"
            prefetch={false}
            className="inline-flex min-h-10 shrink-0 items-center justify-center whitespace-nowrap rounded-full border border-[#0035b9]/20 px-3 text-xs font-bold text-[#0035b9] transition hover:bg-[#0035b9]/5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0035b9] sm:px-4 sm:text-sm"
          >
            Admin login
          </Link>
          <a
            href="#hubungi"
            className="grid size-10 place-items-center rounded-full bg-[#0035b9] text-white shadow-[0_7px_20px_rgba(13,79,215,0.25)] transition hover:-translate-y-0.5"
            aria-label="Contact support"
          >
            <MessageCircle className="size-4" />
          </a>
        </nav>
      </div>
    </header>
  );
}
