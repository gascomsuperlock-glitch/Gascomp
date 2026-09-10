import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function Brand({ inverse = false, compact = false }: { inverse?: boolean; compact?: boolean }) {
  return (
    <Link href="/" className="inline-flex shrink-0 items-center" aria-label="Gascomp Beranda">
      <Image
        src="/gascomp-logo.png"
        alt="Gascomp"
        width={1080}
        height={179}
        className={cn(
          "h-auto object-contain",
          compact ? "w-24" : "w-36 sm:w-44",
          inverse && "brightness-0 invert",
        )}
      />
    </Link>
  );
}
