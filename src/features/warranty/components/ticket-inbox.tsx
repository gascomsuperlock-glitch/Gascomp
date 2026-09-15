"use client";

import { useState } from "react";
import { ExternalLink, Inbox, Search, Trash2 } from "lucide-react";
import { TicketVideoPreview } from "./ticket-video-preview";
import { deleteWarrantyTicketsAction, updateWarrantyTicketStatusAction } from "@/features/warranty/server/admin-actions";
import { WARRANTY_TICKET_STATUSES, type WarrantyTicket, type WarrantyTicketStatus } from "@/features/warranty/model/types";

export const ticketStatusLabels: Record<WarrantyTicketStatus, string> = {
  new: "New",
  reviewing: "Under review",
  approved: "Approved",
  rejected: "Rejected",
  closed: "Closed",
};

export function TicketInbox({ tickets, setTickets, onTicketUpdated, initialQuery = "" }: { initialQuery?: string; tickets: WarrantyTicket[]; setTickets: React.Dispatch<React.SetStateAction<WarrantyTicket[]>>; onTicketUpdated?: (ticket: WarrantyTicket) => void }) {
  const [query, setQuery] = useState(initialQuery);
  const [busyTicket, setBusyTicket] = useState("");
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState("");
  const visibleTickets = tickets.filter((ticket) => `${ticket.ticketId} ${ticket.customer.name} ${ticket.customer.whatsapp} ${ticket.product.name} ${ticket.product.sku} ${ticket.purchase.orderNumber}`.toLowerCase().includes(query.trim().toLowerCase()));

  const selectedIds = visibleTickets.filter((ticket) => selected.has(ticket.ticketId)).map((ticket) => ticket.ticketId);
  const allSelected = visibleTickets.length > 0 && selectedIds.length === visibleTickets.length;
  const busy = deleting || Boolean(busyTicket);

  async function deleteTickets(ids: string[]) {
    if (busy || !ids.length) return;
    if (!window.confirm(`Delete ${ids.length} ticket(s) from the inbox? Claim history will be retained to prevent repeat claims. This takes effect immediately and does not use Save.`)) return;
    setDeleting(true);
    setError("");
    setNotice("");
    try {
      const result = await deleteWarrantyTicketsAction(ids);
      const removed = new Set(result.deletedIds);
      setTickets((current) => current.filter((ticket) => !removed.has(ticket.ticketId)));
      setSelected((current) => new Set([...current].filter((id) => !removed.has(id))));
      if (result.error) setError(result.error);
      if (removed.size) setNotice(`${removed.size} ticket(s) deleted.`);
    } catch {
      setError("The deletion result could not be confirmed. Refresh the inbox before retrying.");
    } finally {
      setDeleting(false);
    }
  }

  async function changeStatus(ticket: WarrantyTicket, status: WarrantyTicketStatus) {
    setBusyTicket(ticket.ticketId);
    setError("");
    try {
    const result = await updateWarrantyTicketStatusAction(ticket.ticketId, status);
    if (result.success) {
      const updatedTicket = { ...ticket, status, updatedAt: result.updatedAt };
      setTickets((current) => current.map((item) => item.ticketId === ticket.ticketId ? updatedTicket : item));
      onTicketUpdated?.(updatedTicket);
    } else {
      setError(result.error ?? "The ticket status could not be updated.");
    }
    } catch {
      setError("The ticket status could not be updated. Please try again.");
    } finally {
      setBusyTicket("");
    }
  }

  return (
    <section>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-xs font-bold text-[#0035b9]">WARRANTY CLAIMS</p><h2 className="mt-2 text-3xl font-extrabold tracking-[-0.045em]">Ticket inbox</h2><p className="mt-2 text-sm text-[#707a80]">Review the purchase details, issue, and evidence submitted by each customer.</p></div>
        <label className="flex h-11 w-full items-center gap-2 rounded-full border border-[#2c3038]/10 bg-white px-4 shadow-sm sm:w-80"><Search className="size-4 text-[#899197]" /><input aria-label="Search warranty tickets" value={query} disabled={busy} onChange={(event) => { setQuery(event.target.value); setSelected(new Set()); }} placeholder="Search tickets, SKUs, or customers" className="w-full bg-transparent text-xs font-semibold outline-none" /></label>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl border border-[#2c3038]/10 bg-white p-4">
        <label className="flex min-h-11 items-center gap-2 text-xs font-bold"><input type="checkbox" checked={allSelected} ref={(el) => { if (el) el.indeterminate = selectedIds.length > 0 && !allSelected; }} disabled={busy || !visibleTickets.length} onChange={() => setSelected(allSelected ? new Set() : new Set(visibleTickets.map((ticket) => ticket.ticketId)))} /> Select all results</label>
        <span className="text-xs">{selectedIds.length} selected</span>
        <button type="button" disabled={busy || !selectedIds.length} onClick={() => setSelected(new Set())} className="min-h-11 px-3 text-xs font-bold disabled:opacity-40">Clear selection</button>
        <button type="button" disabled={busy || !selectedIds.length || selectedIds.length > 100} onClick={() => void deleteTickets(selectedIds)} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#b63c35] px-4 text-xs font-bold text-white disabled:opacity-40"><Trash2 className="size-4" />{deleting ? "Deleting…" : "Delete selected"}</button>
        {selectedIds.length > 100 && <p className="text-xs">Select no more than 100 tickets at a time.</p>}
      </div>
      {notice && <p role="status" className="mt-3 text-sm text-[#318257]">{notice}</p>}
      {error && <p role="alert" className="mt-5 rounded-xl bg-[#fff0ef] p-4 text-xs font-semibold text-[#ad4037]">{error}</p>}
      <div className="mt-7 space-y-4">
        {visibleTickets.map((ticket) => (
          <article key={ticket.ticketId} className="overflow-hidden rounded-[22px] border border-[#2c3038]/8 bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b border-[#2c3038]/8 p-5 sm:flex-row sm:items-center sm:justify-between">
              <label className="flex min-h-11 items-center gap-2 text-xs font-bold"><input type="checkbox" aria-label={`Select ticket ${ticket.ticketId}`} checked={selected.has(ticket.ticketId)} disabled={busy} onChange={(event) => { const checked = event.target.checked; setSelected((current) => { const next = new Set(current); if (checked) next.add(ticket.ticketId); else next.delete(ticket.ticketId); return next; }); }} />Select</label>
              <div><p className="text-[10px] font-extrabold tracking-[0.12em] text-[#0035b9]">{ticket.ticketId}</p><h3 className="mt-1 text-base font-extrabold">{ticket.product.name} · {ticket.product.sku}</h3><p className="mt-1 text-[10px] text-[#858e93]">Submitted {new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(ticket.submittedAt))}</p></div>
              <label className="flex items-center gap-2 text-[10px] font-extrabold text-[#69747b]">STATUS<select value={ticket.status} disabled={busy} onChange={(event) => changeStatus(ticket, event.target.value as WarrantyTicketStatus)} className="h-10 rounded-full border border-[#2c3038]/10 bg-white px-3 text-xs font-extrabold outline-none disabled:opacity-50">{WARRANTY_TICKET_STATUSES.map((status) => <option key={status} value={status}>{ticketStatusLabels[status]}</option>)}</select></label>
            </div>
            <div className="px-5 pt-3"><button type="button" disabled={busy} onClick={() => void deleteTickets([ticket.ticketId])} className="inline-flex min-h-11 items-center gap-2 text-xs font-bold text-[#b63c35] disabled:opacity-40"><Trash2 className="size-4" />Delete ticket</button></div>
            <div className="grid gap-6 p-5 lg:grid-cols-3">
              <div><p className="text-[9px] font-extrabold tracking-[0.12em] text-[#8b9397]">CUSTOMER</p><p className="mt-2 text-xs font-extrabold">{ticket.customer.name}</p><a href={`mailto:${ticket.customer.email}`} className="mt-1 block break-all text-[11px] text-[#58666e] hover:text-[#0035b9]">{ticket.customer.email}</a><a href={`https://wa.me/${ticket.customer.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="mt-1 block text-[11px] font-bold text-[#318257]">{ticket.customer.whatsapp}</a></div>
              <div><p className="text-[9px] font-extrabold tracking-[0.12em] text-[#8b9397]">PURCHASE</p><dl className="mt-2 space-y-1 text-[11px] text-[#58666e]"><div><dt className="inline font-bold">Order: </dt><dd className="inline">{ticket.purchase.orderNumber}</dd></div><div><dt className="inline font-bold">Store: </dt><dd className="inline">{ticket.purchase.store}</dd></div><div><dt className="inline font-bold">Date: </dt><dd className="inline">{ticket.purchase.date}</dd></div><div><dt className="inline font-bold">Price: </dt><dd className="inline">{new Intl.NumberFormat("en-US", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(ticket.purchase.price)}</dd></div></dl></div>
              <div className="min-w-0"><p className="text-[9px] font-extrabold tracking-[0.12em] text-[#8b9397]">PRIVATE EVIDENCE</p><div className="mt-2 flex flex-wrap gap-2">{ticket.evidence.map((file) => file.kind === "video" ? <TicketVideoPreview key={file.id} url={`/admin/tiket/${ticket.ticketId}/lampiran/${file.id}`} /> : <a key={file.id} href={`/admin/tiket/${ticket.ticketId}/lampiran/${file.id}`} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[#edf4ff] px-3 text-[10px] font-extrabold text-[#0035b9]"><ExternalLink className="size-3" /> {file.kind === "invoice" ? "Invoice" : "Photo"}</a>)}</div></div>
            </div>
            <div className="border-t border-[#2c3038]/8 bg-[#faf9f6] px-5 py-4"><p className="text-[9px] font-extrabold tracking-[0.12em] text-[#8b9397]">ISSUE</p><p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-[#566269]">{ticket.problem}</p></div>
          </article>
        ))}
        {visibleTickets.length === 0 && <div className="rounded-[22px] border border-dashed border-[#2c3038]/15 bg-white p-12 text-center"><Inbox className="mx-auto size-8 text-[#a6adb1]" /><p className="mt-3 text-sm font-extrabold">{tickets.length ? "No tickets found" : "No warranty tickets yet"}</p><p className="mt-1 text-xs text-[#858e93]">Submissions from the warranty claim form will appear here.</p></div>}
      </div>
    </section>
  );
}
