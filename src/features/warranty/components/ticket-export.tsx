"use client";
import { useEffect, useState } from "react";
import { ChevronDown, Download, FileSpreadsheet } from "lucide-react";
import { availableTicketDates, dateRangeBounds, jakartaDate } from "../model/ticket-export";
import type { WarrantyTicket } from "../model/types";

export function TicketExport({ tickets }: { tickets: WarrantyTicket[] }) {
  const dates = availableTicketDates(tickets);
  const [today, setToday] = useState(() => jakartaDate());
  useEffect(() => {
    const update = () => setToday(jakartaDate());
    const interval = window.setInterval(update, 30_000);
    document.addEventListener("visibilitychange", update);
    return () => { window.clearInterval(interval); document.removeEventListener("visibilitychange", update); };
  }, []);
  const available = dates ? { start: dates.start, end: today } : null;
  const [selection, setSelection] = useState({ start: "", end: "" });
  const start = selection.start || available?.start || "";
  const end = selection.end || available?.end || "";
  let rangeError = "";
  if (available) {
    try {
      dateRangeBounds(start, end);
      if (start < available.start || end > available.end) rangeError = "Choose dates within the available data range.";
    } catch (error) { rangeError = error instanceof Error ? error.message : "Select valid dates."; }
  }
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function download() {
    if (!available || rangeError) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch(`/admin/warranty-tickets/export?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`, { cache: "no-store" });
      if (!response.ok) { const result = await response.json(); throw new Error(result.error); }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a"); link.href = url; link.download = `warranty-tickets-${start}-to-${end}.csv`;
      document.body.append(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
      const count = response.headers.get("X-Ticket-Count");
      setMessage(count === "0" ? "No tickets in this date range. Downloaded the column headers." : `Exported ${count} ticket(s).`);
    } catch (error) { setError(error instanceof Error ? error.message : "The export failed. Please try again."); }
    finally { setBusy(false); }
  }
  return <details className="group mt-4 rounded-2xl border border-[#dfe4ed] bg-white">
    <summary className="flex min-h-16 list-none items-center gap-3 rounded-2xl p-4 hover:bg-[#f8faff] [&::-webkit-details-marker]:hidden"><FileSpreadsheet aria-hidden="true" className="size-5 shrink-0 text-[#0035b9]" /><span className="min-w-0 flex-1 text-sm font-extrabold">Export Report<span className="mt-1 block text-xs font-normal text-[#626d79]">Choose dates and download a spreadsheet</span></span><ChevronDown aria-hidden="true" className="size-4 shrink-0 text-[#626d79] group-open:rotate-180" /></summary>
    <div className="border-t border-[#e6e9ef] p-4">
    <div className="flex flex-wrap items-end gap-3">
      <label className="flex min-w-0 max-w-full flex-col gap-2 text-xs font-bold">Start Date<input type="date" name="report-start" value={start} min={available?.start} max={available?.end} disabled={busy || !available} onChange={event => setSelection({ start: event.target.value, end })} className="min-h-11 min-w-0 max-w-full rounded-xl border border-[#cfd7e4] bg-white px-3 text-sm" /></label>
      <label className="flex min-w-0 max-w-full flex-col gap-2 text-xs font-bold">End Date<input type="date" name="report-end" value={end} min={start || available?.start} max={available?.end} disabled={busy || !available} onChange={event => setSelection({ start, end: event.target.value })} className="min-h-11 min-w-0 max-w-full rounded-xl border border-[#cfd7e4] bg-white px-3 text-sm" /></label>
      <button type="button" disabled={busy || !available || Boolean(rangeError)} onClick={() => void download()} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#0035b9] px-4 py-2 text-xs font-bold text-white hover:bg-[#002c98] disabled:opacity-40"><Download aria-hidden="true" className="size-4 shrink-0" />{busy ? "Preparing export…" : "Export Spreadsheet (CSV)"}</button>
    </div>
    <p className="mt-3 max-w-3xl text-xs leading-5 text-[#626d79]">Includes all Pending and Done tickets submitted between both dates (Jakarta time), regardless of search or selection. In Excel or Google Sheets, import phone and order columns as text to preserve their digits.</p>
    <p className="mt-2 text-xs text-[#707a80]">{available ? `Available from ${available.start}. Choose an end date up to today (${today}).` : "No ticket data available to export."}</p>
    {rangeError && <p role="alert" className="mt-2 text-xs text-[#ad4037]">{rangeError}</p>}
    {message && <p role="status" className="mt-2 text-xs">{message}</p>}
    {error && <p role="alert" className="mt-2 text-xs text-[#ad4037]">{error}</p>}
    </div>
  </details>;
}
