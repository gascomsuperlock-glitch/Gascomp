"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { returnHomeFromClaim } from "@/features/warranty/model/claim-home-navigation";

export function ClaimHomeLink({ children, className }: { children: ReactNode; className: string }) {
  return <Link href="/" className={className} onClick={(event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (returnHomeFromClaim(window)) event.preventDefault();
  }}>{children}</Link>;
}
