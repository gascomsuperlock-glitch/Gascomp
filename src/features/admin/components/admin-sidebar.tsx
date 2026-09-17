"use client";

import Link from "next/link";
import { BookOpen, ChevronRight, HelpCircle, Inbox, LayoutDashboard, MapPin, MessageCircle, Settings, ShieldCheck, X } from "lucide-react";
import { Brand } from "@/shared/components/brand";
import type { MainView } from "@/features/admin/model/types";
import type { IconType } from "@/shared/lib/icon-types";

export function AdminSidebar({ view, setView, open, close }: { view: MainView; setView: (view: MainView) => void; open: boolean; close: () => void }) {
  const items: Array<[MainView, IconType, string]> = [
    ["overview", LayoutDashboard, "Overview"],
    ["content", BookOpen, "Help content"],
    ["tickets", Inbox, "Warranty tickets"],
    ["care", ShieldCheck, "GascompCare"],
    ["service-centers", MapPin, "Service Centers"],
    ["ai-assistance", MessageCircle, "AI Assistance"],
    ["settings", Settings, "Settings"],
  ];

  return (
    <>
      {open && <button type="button" className="fixed inset-0 z-40 bg-[#2c3038]/35 backdrop-blur-sm lg:hidden" onClick={close} aria-label="Close menu" />}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-[244px] flex-col bg-[#2c3038] p-4 text-white transition-transform lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-12 items-center justify-between px-2"><Brand inverse /><button type="button" onClick={close} className="grid size-8 place-items-center rounded-lg bg-white/8 lg:hidden" aria-label="Close menu"><X className="size-4" /></button></div>
        <p className="mt-7 px-3 text-[9px] font-bold tracking-[0.15em] text-white/35">MAIN MENU</p>
        <nav className="mt-2 space-y-1">
          {items.map(([value, Icon, label]) => (
            <button key={value} type="button" onClick={() => { setView(value); close(); }} className={`flex h-11 w-full items-center gap-3 rounded-xl px-3 text-xs font-bold transition ${view === value ? "bg-white text-[#2c3038]" : "text-white/60 hover:bg-white/7 hover:text-white"}`}><Icon className={`size-4 ${view === value ? "text-[#0035b9]" : ""}`} /> {label}</button>
          ))}
        </nav>
        <div className="mt-auto rounded-2xl bg-white/[0.055] p-4">
          <div className="flex items-center gap-2 text-[10px] font-bold text-white/50"><HelpCircle className="size-3.5 text-[#73d4f4]" /> NEED HELP?</div>
          <p className="mt-2 text-[11px] leading-5 text-white/65">Manage the guides customers see after scanning a QR code.</p>
          <Link href="/" className="mt-3 inline-flex items-center gap-1 text-[10px] font-extrabold text-[#73d4f4]">View website <ChevronRight className="size-3" /></Link>
        </div>
      </aside>
    </>
  );
}
