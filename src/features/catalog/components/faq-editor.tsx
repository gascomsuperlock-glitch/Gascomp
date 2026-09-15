"use client";

import { CircleHelp, Plus, Trash2 } from "lucide-react";
import { createId } from "@/shared/lib/create-id";
import type { Product } from "@/features/catalog/model/types";
import { Field, EditorHeading, fieldClass, areaClass } from "@/shared/components/ui/editor-fields";

import { AdminEmpty } from "@/shared/components/ui/empty-state";

export function FaqEditor({ product, update }: { product: Product; update: (updater: (product: Product) => Product) => void }) {
  function addFaq() {
    update((current) => ({ ...current, faqs: [...current.faqs, { id: createId("faq"), question: "New question", answer: "Write an answer for the customer." }] }));
  }
  return (
    <div>
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row"><EditorHeading title="Frequently asked questions" copy="Use the language customers normally use when asking a question." /><button type="button" onClick={addFaq} className="inline-flex h-11 w-full shrink-0 items-center justify-center gap-2 sm:h-10 sm:w-auto rounded-full bg-[#0035b9] px-4 text-xs font-extrabold text-white"><Plus className="size-3.5" /> Add</button></div>
      <div className="mt-7 space-y-3">
        {product.faqs.map((faq, index) => (
          <article key={faq.id} className="rounded-[20px] border border-[#2c3038]/9 bg-[#fbfaf7] p-4 sm:p-5">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 sm:flex">
              <span className="mt-1 grid size-7 shrink-0 place-items-center rounded-full bg-[#edf4ff] text-[10px] font-extrabold text-[#0035b9]">{index + 1}</span>
              <div className="col-span-2 row-start-2 min-w-0 flex-1 space-y-4"><Field label="Question"><input value={faq.question} onChange={(event) => update((current) => ({ ...current, faqs: current.faqs.map((item) => item.id === faq.id ? { ...item, question: event.target.value } : item) }))} className={fieldClass} /></Field><Field label="Answer"><textarea value={faq.answer} onChange={(event) => update((current) => ({ ...current, faqs: current.faqs.map((item) => item.id === faq.id ? { ...item, answer: event.target.value } : item) }))} className={areaClass} /></Field></div>
              <button type="button" onClick={() => update((current) => ({ ...current, faqs: current.faqs.filter((item) => item.id !== faq.id) }))} className="col-start-2 row-start-1 grid size-8 shrink-0 place-items-center rounded-full text-[#9b7770] hover:bg-[#feeae5] hover:text-[#c9482d]" aria-label="Delete FAQ"><Trash2 className="size-3.5" /></button>
            </div>
          </article>
        ))}
        {product.faqs.length === 0 && <AdminEmpty icon={CircleHelp} text="No frequently asked questions yet." action="Add the first FAQ" onClick={addFaq} />}
      </div>
    </div>
  );
}
