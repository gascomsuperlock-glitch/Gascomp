"use client";

import { useState } from "react";
import { CheckCheck, ClipboardCheck } from "lucide-react";
import { WARRANTY_SOLUTIONS, type WarrantySolution, type WarrantyTicket } from "../model/types";

export function TicketSolution({ ticket, busy, onSave, draft, onDraftChange, error, notice }: {
  ticket: WarrantyTicket;
  busy: boolean;
  error?: string;
  notice?: string;
  draft?: WarrantySolution | "";
  onDraftChange?: (value: WarrantySolution | "" | undefined) => void;
  onSave: (solution: WarrantySolution | undefined, done: boolean) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  const [localSolution, setLocalSolution] = useState<WarrantySolution | "">(ticket.solution ?? "");
  const solution = draft ?? localSolution;
  function setSolution(value: WarrantySolution | "") {
    setLocalSolution(value);
    onDraftChange?.(value);
  }
  const done = ticket.status === "closed";
  const controls = "min-h-11 rounded-xl border border-[#cfd7e4] px-4 py-2 text-sm font-bold disabled:opacity-40";
  async function save() {
    if (await onSave(solution || undefined, true)) { setEditing(false); onDraftChange?.(undefined); }
  }
  return <section aria-labelledby="ticket-solution-heading" className="space-y-4 border-t border-[#dce4f2] bg-[#f5f8ff] p-4 sm:p-6">
    <div><h4 id="ticket-solution-heading" className="flex items-center gap-2 text-sm font-extrabold"><ClipboardCheck aria-hidden="true" className="size-4 text-[#0035b9]" />Resolution</h4><p className="mt-2 text-xs leading-5 text-[#626d79]">{done ? "This claim is complete. You can still edit its solution." : "Choose a solution, then select Done to save and complete this claim."}</p></div>
    {notice && <p role="status" className="rounded-xl border border-[#c8e5d4] bg-[#edf8f1] p-3 text-sm font-semibold text-[#216540]">{notice}</p>}
    {error && <p role="alert" className="rounded-xl border border-[#f2ccc8] bg-[#fff0ef] p-3 text-sm font-semibold text-[#ad4037]">{error}</p>}
    {editing || draft !== undefined || !ticket.solution ? <div className="space-y-3">
      <label className="flex min-w-0 flex-col gap-2 text-xs font-bold">Solution
        <select name="solution" aria-label="Solution" value={solution} disabled={busy} onChange={event => setSolution(event.target.value as WarrantySolution)} className={`${controls} w-full min-w-0 bg-white text-[#2c3038]`}>
          <option value="">Select a solution</option>
          {Object.entries(WARRANTY_SOLUTIONS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      {draft !== undefined && <p className="text-xs font-semibold text-[#825510]">Unsaved selection. Select Done to apply it.</p>}
      <div className="flex flex-wrap gap-2"><button type="button" disabled={busy} onClick={() => void save()} className={`${controls} inline-flex items-center gap-2 bg-[#0035b9] text-white hover:bg-[#002c98]`}><CheckCheck aria-hidden="true" className="size-4" />{busy ? "Saving…" : "Done"}</button>
      {(editing || draft !== undefined) && <button type="button" disabled={busy} onClick={() => { setEditing(false); setLocalSolution(ticket.solution ?? ""); onDraftChange?.(undefined); }} className={`${controls} bg-white text-[#536273] hover:bg-[#edf4ff]`}>Cancel</button>}</div>
    </div> : <div className="flex flex-wrap items-center gap-3">
      <div className="flex-1"><p className="text-xs text-[#626d79]">Saved Solution</p><p className="mt-1 text-sm font-bold">{WARRANTY_SOLUTIONS[ticket.solution]}</p></div>
      <button type="button" disabled={busy} onClick={() => { setSolution(ticket.solution ?? ""); setEditing(true); }} className={`${controls} bg-white text-[#0035b9] hover:bg-[#edf4ff]`}>Edit Solution</button>
      {!done && <button type="button" disabled={busy} onClick={() => void onSave(ticket.solution ?? undefined, true)} className={`${controls} bg-[#0035b9] text-white hover:bg-[#002c98]`}>{busy ? "Saving…" : "Done"}</button>}
    </div>}
    <p className="border-t border-[#dce4f2] pt-3 text-xs leading-5 text-[#626d79]">Done applies immediately. The dashboard Save button is for help content.</p>
  </section>;
}
