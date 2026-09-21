"use client";

import { useRef, useState } from "react";
import { ArrowLeft, CheckCheck, ChevronRight, Clock3, Inbox, ListChecks, Search, ShieldCheck, Trash2, X } from "lucide-react";
import { TicketDeleteResultDialog, type TicketDeleteResult } from "./ticket-delete-result";
import { TicketSolution } from "./ticket-solution";
import { TicketExport } from "./ticket-export";
import { TicketDetails } from "./ticket-details";
import styles from "./ticket-workspace.module.css";
import { deleteWarrantyTicketsAction, setWarrantyTicketStatusAction, updateWarrantyTicketStatusAction } from "@/features/warranty/server/admin-actions";
import { WARRANTY_TICKET_STATUSES, ticketStatusLabel, type WarrantyTicketStatus, type WarrantyTicket, type WarrantySolution } from "@/features/warranty/model/types";

const dateFormat = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "Asia/Jakarta" });
const timestampFormat = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" });

export function TicketInbox({ tickets, setTickets, onTicketUpdated, initialQuery = "" }: { initialQuery?: string; tickets: WarrantyTicket[]; setTickets: React.Dispatch<React.SetStateAction<WarrantyTicket[]>>; onTicketUpdated?: (ticket: WarrantyTicket) => void }) {
  const [query, setQuery] = useState(initialQuery);
  const [busyTicket, setBusyTicket] = useState("");
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState("");
  const [deleteResult, setDeleteResult] = useState<TicketDeleteResult | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "done">("all");
  const [activeId, setActiveId] = useState(initialQuery || tickets[0]?.ticketId || "");
  const [showDetail, setShowDetail] = useState(Boolean(initialQuery));
  const [bulkMode, setBulkMode] = useState(false);
  const [limit, setLimit] = useState(20);
  const [solutionDrafts, setSolutionDrafts] = useState<Record<string, WarrantySolution | "">>({});
  const searchInput = useRef<HTMLInputElement>(null);
  const detailHeading = useRef<HTMLHeadingElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const visibleTickets = tickets.filter((ticket) =>
    (filter === "all" || (ticket.status === "closed" ? filter === "done" : filter === "pending")) &&
    `${ticket.ticketId} ${ticket.customer.name} ${ticket.customer.email} ${ticket.customer.whatsapp} ${ticket.product.name} ${ticket.product.sku} ${ticket.purchase.orderNumber}`.toLowerCase().includes(query.trim().toLowerCase()));
  const activeTicket = tickets.find((ticket) => ticket.ticketId === activeId);
  const pendingCount = tickets.filter((ticket) => ticket.status !== "closed").length;

  const selectedIds = visibleTickets.filter((ticket) => selected.has(ticket.ticketId)).map((ticket) => ticket.ticketId);
  const allSelected = visibleTickets.length > 0 && selectedIds.length === visibleTickets.length;
  const busy = deleting || Boolean(busyTicket);

  function resetSelection() {
    setSelected(new Set());
    setActiveId("");
    setShowDetail(false);
    setLimit(20);
  }

  function openTicket(ticket: WarrantyTicket) {
    setNotice("");
    setError("");
    setActiveId(ticket.ticketId);
    setShowDetail(true);
    requestAnimationFrame(() => {
      detailHeading.current?.focus({ preventScroll: true });
      detailHeading.current?.closest("article")?.scrollIntoView({ block: "start", behavior: "instant" });
    });
  }

  function backToList() {
    setShowDetail(false);
    requestAnimationFrame(() => {
      const target = list.current?.querySelector<HTMLButtonElement>('ul [aria-pressed="true"]');
      (target ?? searchInput.current)?.focus({ preventScroll: true });
      (target ?? searchInput.current)?.scrollIntoView({ block: "center", behavior: "instant" });
    });
  }

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
      if (removed.has(activeId)) { setActiveId(""); setShowDetail(false); }
      if (result.error) setError(result.error);
      if (removed.size) setNotice(`${removed.size} ticket(s) deleted.`);
      setDeleteResult({ deletedCount: removed.size, requestedCount: ids.length, error: result.error });
    } catch {
      const message = "The deletion result could not be confirmed. Refresh the inbox before retrying.";
      setError(message);
      setDeleteResult({ deletedCount: 0, requestedCount: ids.length, error: message });
    } finally {
      setDeleting(false);
    }
  }

  async function changeStatus(ticket: WarrantyTicket, status: WarrantyTicketStatus) {
    if (busy || status === ticket.status) return;
    setBusyTicket(ticket.ticketId);
    setError("");
    setNotice("");
    try {
      const result = await setWarrantyTicketStatusAction(ticket.ticketId, status);
      if (!result.success) { setError(result.error); return; }
      const updatedTicket = { ...ticket, status, updatedAt: result.updatedAt };
      setTickets((current) => current.map((item) => item.ticketId === ticket.ticketId ? { ...item, status, updatedAt: result.updatedAt } : item));
      onTicketUpdated?.(updatedTicket);
      setNotice(`Status updated to ${ticketStatusLabel(status)}.`);
    } catch {
      setError("The status update could not be confirmed. Refresh the inbox before retrying.");
    } finally {
      setBusyTicket("");
    }
  }

  async function changeSolution(ticket: WarrantyTicket, solution: WarrantySolution | undefined, done: boolean) {
    if (busy) return false;
    setBusyTicket(ticket.ticketId);
    setError("");
    setNotice("");
    try {
      const result = await updateWarrantyTicketStatusAction(ticket.ticketId, solution, done);
      if (result.success) {
        const updatedTicket: WarrantyTicket = { ...ticket, ...(solution === undefined ? {} : { solution }), status: done ? "closed" : ticket.status, updatedAt: result.updatedAt };
        setTickets((current) => current.map((item) => item.ticketId === ticket.ticketId ? updatedTicket : item));
        onTicketUpdated?.(updatedTicket);
        setNotice(done ? "Ticket marked Done." : "Solution saved.");
        setSolutionDrafts((current) => { const next = { ...current }; delete next[ticket.ticketId]; return next; });
        return true;
      } else {
        setError(result.error ?? "The ticket status could not be updated.");
      }
    } catch {
      setError("The save result could not be confirmed. Refresh the inbox before retrying.");
    } finally {
      setBusyTicket("");
    }
    return false;
  }

  return (
    <section className={styles.workspace} aria-label="Warranty ticket workspace">
      {deleteResult && <TicketDeleteResultDialog result={deleteResult} onClose={() => { setDeleteResult(null); setShowDetail(false); requestAnimationFrame(() => searchInput.current?.focus()); }} />}
      <div className={showDetail && activeTicket ? "hidden xl:block" : ""}>
        <div className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-[#dce4f2] bg-white p-4 sm:gap-4 sm:rounded-3xl sm:p-6">
          <div className="flex min-w-0 items-start gap-4">
            <span className="hidden size-12 shrink-0 place-items-center rounded-2xl bg-[#0035b9] text-white sm:grid"><ShieldCheck aria-hidden="true" className="size-6" /></span>
            <div><p className="hidden text-xs font-extrabold tracking-widest text-[#0035b9] sm:block">WARRANTY CLAIMS</p><h2 className="text-xl font-extrabold tracking-tight sm:mt-2 sm:text-3xl">Ticket Inbox</h2><p className="mt-2 hidden max-w-xl text-sm leading-6 text-[#626d79] sm:block">Review each claim, check the evidence, and choose the next step.</p></div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fff3d6] px-2.5 py-1.5 text-xs font-bold text-[#825510] sm:gap-2 sm:px-3 sm:py-2"><Clock3 aria-hidden="true" className="size-4" />{pendingCount} Pending</span>
        </div>
        <TicketExport tickets={tickets} />
      </div>
      {notice && !(activeTicket && showDetail) && <p role="status" className="mt-4 rounded-xl border border-[#c8e5d4] bg-[#edf8f1] p-4 text-sm font-semibold text-[#216540]">{notice}</p>}
      {error && !(activeTicket && showDetail) && <p role="alert" className="mt-4 rounded-xl border border-[#f2ccc8] bg-[#fff0ef] p-4 text-sm font-semibold text-[#ad4037]">{error}</p>}
      <div className="mt-3 grid items-start gap-5 sm:mt-5 xl:grid-cols-[340px_minmax(0,1fr)]">
        <div ref={list} className={`min-w-0 rounded-2xl border border-[#dfe4ed] bg-white sm:rounded-3xl xl:sticky xl:top-24 xl:max-h-[calc(100dvh-7rem)] xl:overflow-y-auto ${showDetail && activeTicket ? "hidden xl:block" : ""}`}>
          <div className="border-b border-[#e6e9ef] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-extrabold">All Claims <span className="ml-1 text-[#626d79]">({tickets.length})</span></h3><button type="button" disabled={busy || !tickets.length} aria-pressed={bulkMode} onClick={() => { setBulkMode(!bulkMode); setSelected(new Set()); }} className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-xs font-bold text-[#536273] hover:bg-[#edf4ff] disabled:opacity-40"><ListChecks aria-hidden="true" className="size-4" />{bulkMode ? "Exit Selection" : "Select Tickets"}</button></div>
            <label htmlFor="ticket-search" className="sr-only text-xs font-bold text-[#536273] sm:not-sr-only sm:mt-3 sm:block">Search Tickets</label>
            <div className="mt-2 flex min-h-12 items-center gap-2 rounded-xl border border-[#cfd7e4] bg-[#f8faff] px-3 focus-within:border-[#0035b9] focus-within:ring-2 focus-within:ring-[#0035b9]/15">
              <Search aria-hidden="true" className="size-4 shrink-0 text-[#626d79]" />
              <input id="ticket-search" ref={searchInput} type="search" name="ticket-search" autoComplete="off" spellCheck={false} value={query} disabled={busy} onChange={(event) => { setQuery(event.target.value); resetSelection(); }} placeholder="Name, ticket, SKU, or order…" className="min-w-0 flex-1 bg-transparent py-3 text-sm" />
              {query && <button type="button" aria-label="Clear ticket search" disabled={busy} onClick={() => { setQuery(""); resetSelection(); searchInput.current?.focus(); }} className="grid size-11 shrink-0 place-items-center rounded-lg text-[#626d79] hover:bg-[#e4ebf7]"><X aria-hidden="true" className="size-4" /></button>}
            </div>
            <div role="group" aria-label="Filter tickets by status" className="mt-3 grid grid-cols-3 gap-1 rounded-xl bg-[#f0f3f8] p-1">
              {(["all", "pending", "done"] as const).map((value) => <button key={value} type="button" disabled={busy} aria-pressed={filter === value} onClick={() => { setFilter(value); resetSelection(); }} className={`min-h-11 rounded-lg px-2 text-xs font-extrabold disabled:opacity-40 ${filter === value ? "bg-[#0035b9] text-white shadow-sm" : "text-[#536273] hover:bg-white"}`}>{value === "all" ? "All" : value === "pending" ? "Pending" : "Done"}</button>)}
            </div>
            <p role="status" className="mt-3 text-xs text-[#626d79]">{visibleTickets.length} {visibleTickets.length === 1 ? "ticket" : "tickets"} · Newest first</p>
          </div>
          {bulkMode && <div className="space-y-2 border-b border-[#dfe4ed] bg-[#f8faff] p-4">
            <label className="flex min-h-11 items-center gap-3 text-xs font-bold"><input type="checkbox" checked={allSelected} ref={(el) => { if (el) el.indeterminate = selectedIds.length > 0 && !allSelected; }} disabled={busy || !visibleTickets.length} onChange={() => setSelected(allSelected ? new Set() : new Set(visibleTickets.map((ticket) => ticket.ticketId)))} />Select all {visibleTickets.length} results</label>
            <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs font-semibold">{selectedIds.length} selected</span><button type="button" disabled={busy || !selectedIds.length} onClick={() => setSelected(new Set())} className="min-h-11 rounded-lg px-2 text-xs font-bold text-[#536273] hover:bg-white disabled:opacity-40">Clear Selection</button></div>
            <button type="button" disabled={busy || !selectedIds.length || selectedIds.length > 100} onClick={() => void deleteTickets(selectedIds)} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#e7bdb9] bg-[#fff0ef] px-3 text-xs font-bold text-[#a3342b] hover:bg-[#ffe1dd] disabled:opacity-40"><Trash2 aria-hidden="true" className="size-4" />{deleting ? "Deleting…" : "Delete Selected"}</button>
            {selectedIds.length > 100 && <p className="text-xs text-[#a3342b]">Select no more than 100 tickets at a time.</p>}
          </div>}
          <ul aria-label="Ticket list" className="divide-y divide-[#e6e9ef]">
            {visibleTickets.slice(0, limit).map((ticket) => <li key={ticket.ticketId} className={`flex items-center ${activeId === ticket.ticketId ? "bg-[#edf4ff]" : ""}`}>
              {bulkMode && <label className="grid min-h-14 w-11 shrink-0 place-items-center"><span className="sr-only">Select ticket {ticket.ticketId}</span><input type="checkbox" checked={selected.has(ticket.ticketId)} disabled={busy} onChange={(event) => { const checked = event.target.checked; setSelected((current) => { const next = new Set(current); if (checked) next.add(ticket.ticketId); else next.delete(ticket.ticketId); return next; }); }} /></label>}
              <button type="button" disabled={busy} aria-pressed={activeId === ticket.ticketId} aria-controls="ticket-detail" aria-label={`Open ticket ${ticket.ticketId} for ${ticket.customer.name}`} onClick={() => openTicket(ticket)} className={`min-w-0 flex-1 border-l-4 p-4 text-left hover:bg-[#f0f5ff] disabled:opacity-50 ${activeId === ticket.ticketId ? "border-[#0035b9]" : "border-transparent"}`}>
                <span className="flex flex-wrap items-center justify-between gap-2"><span className="text-[11px] font-extrabold text-[#0035b9]">{ticket.ticketId}</span><span className={`rounded-full px-2 py-1 text-[10px] font-extrabold ${ticket.status === "closed" ? "bg-[#e1f2e8] text-[#216540]" : "bg-[#fff0cd] text-[#825510]"}`}>{ticketStatusLabel(ticket.status)}</span></span>
                <span className="mt-3 flex items-center justify-between gap-2"><span className="truncate text-sm font-extrabold">{ticket.customer.name}</span><ChevronRight aria-hidden="true" className="size-4 shrink-0 text-[#0035b9]" /></span>
                <span className="mt-1 block truncate text-xs text-[#536273]">{ticket.product.name}</span>
                <span className="mt-3 flex flex-wrap justify-between gap-2 text-[11px] text-[#626d79]"><span className="max-w-full truncate font-semibold">{ticket.product.sku}</span><time dateTime={ticket.submittedAt}>{dateFormat.format(new Date(ticket.submittedAt))}</time></span>
                {solutionDrafts[ticket.ticketId] !== undefined && <span className="mt-2 block text-xs font-semibold text-[#825510]">Unsaved solution</span>}
              </button>
            </li>)}
          </ul>
          {visibleTickets.length > limit && <div className="p-4"><button type="button" onClick={() => setLimit((current) => current + 20)} className="min-h-11 w-full rounded-xl border border-[#cfd7e4] px-3 text-xs font-bold text-[#0035b9] hover:bg-[#edf4ff]">Show More Tickets ({visibleTickets.length - limit})</button></div>}
          {!visibleTickets.length && <div className="px-5 py-12 text-center"><Inbox aria-hidden="true" className="mx-auto size-9 text-[#8e9bad]" /><p className="mt-4 text-sm font-extrabold">{tickets.length ? "No Matching Tickets" : "No Warranty Tickets Yet"}</p><p className="mt-2 text-xs leading-5 text-[#626d79]">{tickets.length ? "Try another search or status filter." : "New claims will appear here after a customer submits the warranty form."}</p>{(query || filter !== "all") && <button type="button" onClick={() => { setQuery(""); setFilter("all"); resetSelection(); searchInput.current?.focus(); }} className="mt-4 min-h-11 rounded-xl bg-[#edf4ff] px-4 text-xs font-bold text-[#0035b9] hover:bg-[#dce9ff]">Clear Filters</button>}</div>}
        </div>
        <div id="ticket-detail" className={`min-w-0 ${showDetail && activeTicket ? "" : "hidden xl:block"}`}>
          {activeTicket ? <article className="scroll-mt-40 overflow-hidden rounded-3xl border border-[#dfe4ed] bg-white">
            <div className="border-b border-[#e6e9ef] p-4 sm:p-6">
              <button type="button" disabled={busy} onClick={backToList} className="mb-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#dce4f2] px-3 text-xs font-bold text-[#0035b9] hover:bg-[#edf4ff] xl:hidden"><ArrowLeft aria-hidden="true" className="size-4" />Back to Tickets</button>
              <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs font-extrabold tracking-wide text-[#0035b9]">{activeTicket.ticketId}</p><span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${activeTicket.status === "closed" ? "bg-[#e1f2e8] text-[#216540]" : "bg-[#fff0cd] text-[#825510]"}`}>{activeTicket.status === "closed" ? <CheckCheck aria-hidden="true" className="size-4" /> : <Clock3 aria-hidden="true" className="size-4" />}{ticketStatusLabel(activeTicket.status)}</span></div>
              <h3 ref={detailHeading} tabIndex={-1} className="mt-4 scroll-mt-40 text-xl font-extrabold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0035b9]">{activeTicket.product.name}</h3>
              <p className="mt-2 text-sm font-semibold text-[#536273]">SKU: {activeTicket.product.sku}</p>
              <p className="mt-3 text-xs leading-5 text-[#626d79]">Submitted {timestampFormat.format(new Date(activeTicket.submittedAt))} (Jakarta)</p>
            </div>
            <div className="border-b border-[#e6e9ef] px-4 py-4 sm:px-6">
              <label className="flex flex-col gap-2 text-xs font-bold text-[#536273]">Ticket status
                <select aria-label="Ticket status" value={activeTicket.status} disabled={busy} onChange={(event) => void changeStatus(activeTicket, event.target.value as WarrantyTicketStatus)} className="min-h-11 w-full rounded-xl border border-[#cfd7e4] bg-white px-3 text-sm font-semibold text-[#2c3038] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0035b9] disabled:opacity-50 sm:max-w-xs">
                  {WARRANTY_TICKET_STATUSES.map((status) => <option key={status} value={status}>{ticketStatusLabel(status)}</option>)}
                </select>
              </label>
              <p className="mt-2 text-xs leading-5 text-[#626d79]">Status changes save immediately. The saved solution remains unchanged.</p>
            </div>
            <TicketDetails key={`details-${activeTicket.ticketId}`} ticket={activeTicket} />
            <TicketSolution key={`solution-${activeTicket.ticketId}`} ticket={activeTicket} busy={busy} error={showDetail ? error : undefined} notice={showDetail ? notice : undefined} draft={solutionDrafts[activeTicket.ticketId]} onDraftChange={(value) => setSolutionDrafts((current) => { const next = { ...current }; if (value === undefined) delete next[activeTicket.ticketId]; else next[activeTicket.ticketId] = value; return next; })} onSave={(solution, done) => changeSolution(activeTicket, solution, done)} />
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e6e9ef] px-4 py-3 sm:px-6">
              <p className="text-xs text-[#626d79]">Updated {timestampFormat.format(new Date(activeTicket.updatedAt))} (Jakarta)</p>
              <button type="button" disabled={busy} onClick={() => void deleteTickets([activeTicket.ticketId])} className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-xs font-bold text-[#a3342b] hover:bg-[#fff0ef] disabled:opacity-40"><Trash2 aria-hidden="true" className="size-4" />Delete Ticket</button>
            </div>
          </article> : <div className="grid min-h-96 place-items-center rounded-3xl border border-dashed border-[#cfd7e4] bg-white/70 p-8 text-center"><div><Inbox aria-hidden="true" className="mx-auto size-10 text-[#8e9bad]" /><h3 className="mt-4 text-lg font-extrabold">Select a Ticket</h3><p className="mt-2 max-w-xs text-sm leading-6 text-[#626d79]">Choose a claim from the list to review its details, evidence, and solution.</p></div></div>}
        </div>
      </div>
    </section>
  );
}
