"use client";

import { useEffect, useRef } from "react";
import { CheckCircle2, CircleAlert, TriangleAlert } from "lucide-react";

export type TicketDeleteResult = {
  deletedCount: number;
  requestedCount: number;
  error?: string;
};

export function TicketDeleteResultDialog({ result, onClose }: { result: TicketDeleteResult; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const failed = Boolean(result.error) || result.deletedCount < result.requestedCount;
  const partial = failed && result.deletedCount > 0;
  const title = partial ? "Some tickets could not be deleted" : failed ? "Deletion failed" : "Tickets deleted successfully";
  const Icon = partial ? TriangleAlert : failed ? CircleAlert : CheckCircle2;

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);

  return (
    <dialog ref={dialog} onClose={(event) => { if (!event.currentTarget.open) onClose(); }} aria-labelledby="ticket-delete-result-title" aria-describedby="ticket-delete-result-description" className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto overscroll-contain rounded-3xl border-0 bg-white p-6 text-[#2c3038] shadow-2xl backdrop:bg-black/45 sm:p-8">
      <Icon aria-hidden="true" className={`mx-auto size-12 ${failed ? "text-[#b63c35]" : "text-[#318257]"}`} />
      <h2 id="ticket-delete-result-title" className="mt-4 text-center text-xl font-extrabold">{title}</h2>
      <div id="ticket-delete-result-description" className="mt-3 space-y-3 text-center text-sm leading-6 text-[#53657c]">
        {result.deletedCount > 0 && <p>{result.deletedCount} of {result.requestedCount} ticket(s) deleted from the inbox.</p>}
        {failed && <p>{result.error || "Some tickets were not deleted. Please retry the remaining selection."}</p>}
        {partial && <p>The remaining tickets are still available in the inbox.</p>}
      </div>
      <form method="dialog" className="mt-6"><button autoFocus type="submit" className="min-h-11 w-full rounded-full bg-[#0035b9] px-5 text-sm font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0035b9]">OK</button></form>
    </dialog>
  );
}
