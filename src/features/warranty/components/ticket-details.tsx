import { ExternalLink, FileText, ImageIcon, MessageCircle, Paperclip, UserRound } from "lucide-react";
import type { WarrantyTicket } from "../model/types";
import { TicketVideoPreview } from "./ticket-video-preview";

export function TicketDetails({ ticket }: { ticket: WarrantyTicket }) {
  return (
    <div className="space-y-6 p-4 sm:p-6">
      <section aria-labelledby="ticket-issue-heading" className="rounded-2xl border border-[#e8dfcb] bg-[#fffaf0] p-4 sm:p-5">
        <h4 id="ticket-issue-heading" className="text-sm font-extrabold">Reported Issue</h4>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[#505967]">{ticket.problem || "No issue description provided."}</p>
      </section>
      <div className="grid gap-6 sm:grid-cols-2">
        <section aria-labelledby="ticket-customer-heading" className="min-w-0">
          <h4 id="ticket-customer-heading" className="flex items-center gap-2 text-sm font-extrabold"><UserRound aria-hidden="true" className="size-4 text-[#0035b9]" />Customer</h4>
          <p className="mt-3 text-sm font-bold">{ticket.customer.name}</p>
          <a href={`mailto:${ticket.customer.email}`} className="mt-1 inline-flex min-h-11 items-center text-sm text-[#536273] underline decoration-[#ccd3de] underline-offset-4 hover:text-[#0035b9]">{ticket.customer.email}</a>
          <div><a href={`https://wa.me/${ticket.customer.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#e8f5ed] px-3 py-2 text-sm font-bold text-[#216540] hover:bg-[#d5eddf]"><MessageCircle aria-hidden="true" className="size-4 shrink-0" /><span>{ticket.customer.whatsapp}</span><ExternalLink aria-hidden="true" className="size-3 shrink-0" /><span className="sr-only">Open WhatsApp in a new tab</span></a></div>
        </section>
        <section aria-labelledby="ticket-purchase-heading" className="min-w-0">
          <h4 id="ticket-purchase-heading" className="flex items-center gap-2 text-sm font-extrabold"><FileText aria-hidden="true" className="size-4 text-[#0035b9]" />Purchase Details</h4>
          <dl className="mt-3 space-y-3 text-sm">
            {[
              ["Order Number", ticket.purchase.orderNumber],
              ["Store", ticket.purchase.store],
              ["Purchase Date", Number.isNaN(new Date(ticket.purchase.date).getTime()) ? "Not provided" : new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "Asia/Jakarta" }).format(new Date(ticket.purchase.date))],
              ["Price", new Intl.NumberFormat("en-US", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(ticket.purchase.price)],
            ].map(([label, value]) => <div key={label} className="grid grid-cols-[100px_minmax(0,1fr)] gap-3"><dt className="text-[#626d79]">{label}</dt><dd className="font-semibold tabular-nums">{value}</dd></div>)}
          </dl>
        </section>
      </div>
      <section aria-labelledby="ticket-evidence-heading" className="border-t border-[#e6e9ef] pt-5">
        <h4 id="ticket-evidence-heading" className="flex items-center gap-2 text-sm font-extrabold"><Paperclip aria-hidden="true" className="size-4 text-[#0035b9]" />Private Evidence<span className="rounded-md bg-[#edf1f7] px-2 py-1 text-xs tabular-nums">{ticket.evidence.length}</span></h4>
        <p className="mt-2 text-xs leading-5 text-[#626d79]">Attachments are only accessible to signed-in administrators.</p>
        <div className="mt-4 grid min-w-0 gap-3">
          {ticket.evidence.map((file, index) => {
            const url = `/admin/tiket/${ticket.ticketId}/lampiran/${file.id}`;
            const label = file.kind === "invoice" ? "Invoice" : file.kind === "video" ? "Video" : "Photo";
            return <div key={file.id} className="min-w-0 rounded-xl border border-[#e1e6ef] p-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#edf4ff] text-[#0035b9]">{file.kind === "photo" ? <ImageIcon aria-hidden="true" className="size-5" /> : <FileText aria-hidden="true" className="size-5" />}</span>
                <div className="min-w-0 flex-1"><p className="text-xs font-extrabold">{label} <span className="font-normal text-[#626d79]">· {new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(file.size / 1024 / 1024)} MB</span></p><p className="mt-1 truncate text-xs text-[#626d79]" title={file.originalName}>{file.originalName}</p></div>
                {file.kind !== "video" && <a href={url} target="_blank" rel="noreferrer" aria-label={`Open ${label.toLowerCase()} ${index + 1} in a new tab`} className="grid size-11 shrink-0 place-items-center rounded-xl text-[#0035b9] hover:bg-[#edf4ff]"><ExternalLink aria-hidden="true" className="size-4" /></a>}
              </div>
              {file.kind === "video" && <div className="mt-3"><TicketVideoPreview url={url} /></div>}
            </div>;
          })}
          {!ticket.evidence.length && <p className="rounded-xl bg-[#f5f7fa] p-4 text-sm text-[#626d79]">No attachments available for this ticket.</p>}
        </div>
      </section>
    </div>
  );
}
