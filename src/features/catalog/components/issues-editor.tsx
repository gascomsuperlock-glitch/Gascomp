"use client";

import { AlertTriangle, ArrowDown, ArrowUp, CircleHelp, Plus, Trash2 } from "lucide-react";
import { AdminEmpty } from "@/shared/components/ui/empty-state";
import { EditorHeading, Field, areaClass, fieldClass } from "@/shared/components/ui/editor-fields";
import { createId } from "@/shared/lib/create-id";
import type { Product, ProductIssue } from "@/features/catalog/model/types";

type IssuesEditorProps = {
  product: Product;
  update: (updater: (product: Product) => Product) => void;
};

export function IssuesEditor({ product, update }: IssuesEditorProps) {
  function addIssue() {
    update((current) => ({
      ...current,
      issues: [
        ...current.issues,
        {
          id: createId("issue"),
          title: "New customer issue",
          summary: "",
          steps: [""],
        },
      ],
    }));
  }

  function updateIssue(issueId: string, updater: (issue: ProductIssue) => ProductIssue) {
    update((current) => ({
      ...current,
      issues: current.issues.map((issue) => issue.id === issueId ? updater(issue) : issue),
    }));
  }

  function moveIssue(index: number, direction: -1 | 1) {
    update((current) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.issues.length) return current;
      const issues = [...current.issues];
      [issues[index], issues[nextIndex]] = [issues[nextIndex], issues[index]];
      return { ...current, issues };
    });
  }

  function moveStep(issueId: string, index: number, direction: -1 | 1) {
    updateIssue(issueId, (issue) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= issue.steps.length) return issue;
      const steps = [...issue.steps];
      [steps[index], steps[nextIndex]] = [steps[nextIndex], steps[index]];
      return { ...issue, steps };
    });
  }

  return (
    <div>
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row">
        <EditorHeading
          title="Customer issue guides"
          copy="Add the problems customers commonly experience. Each guide appears under ‘What is happening?’ and walks the customer through the steps before they contact support."
        />
        <button type="button" onClick={addIssue} className="inline-flex h-10 w-full shrink-0 items-center justify-center gap-2 rounded-full bg-[#0035b9] px-4 text-xs font-extrabold text-white sm:w-auto">
          <Plus className="size-3.5" /> Add issue
        </button>
      </div>

      <div className="mt-5 flex gap-3 rounded-2xl border border-[#0035b9]/12 bg-[#f3f7ff] p-4 text-xs leading-5 text-[#53657c]">
        <CircleHelp className="mt-0.5 size-4 shrink-0 text-[#0035b9]" />
        <p>Use one guide for one symptom, such as a product that does not turn on, a flame that is too small, or a regulator that does not lock. Select <strong>Save</strong> when the guide is ready to appear on the customer website.</p>
      </div>

      <div className="mt-7 space-y-4">
        {product.issues.map((issue, issueIndex) => (
          <article key={issue.id} className="rounded-[20px] border border-[#2c3038]/9 bg-[#fbfaf7] p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#2c3038]/8 pb-4">
              <div className="flex items-center gap-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#edf4ff] text-[10px] font-extrabold text-[#0035b9]">{issueIndex + 1}</span>
                <strong className="text-xs">Issue guide</strong>
              </div>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => moveIssue(issueIndex, -1)} disabled={issueIndex === 0} className="grid size-8 place-items-center rounded-full text-[#657178] hover:bg-white disabled:cursor-not-allowed disabled:opacity-30" aria-label={`Move issue ${issueIndex + 1} up`}><ArrowUp className="size-3.5" /></button>
                <button type="button" onClick={() => moveIssue(issueIndex, 1)} disabled={issueIndex === product.issues.length - 1} className="grid size-8 place-items-center rounded-full text-[#657178] hover:bg-white disabled:cursor-not-allowed disabled:opacity-30" aria-label={`Move issue ${issueIndex + 1} down`}><ArrowDown className="size-3.5" /></button>
                <button type="button" onClick={() => update((current) => ({ ...current, issues: current.issues.filter((item) => item.id !== issue.id) }))} className="grid size-8 place-items-center rounded-full text-[#9b7770] hover:bg-[#feeae5] hover:text-[#c9482d]" aria-label={`Delete issue ${issueIndex + 1}`}><Trash2 className="size-3.5" /></button>
              </div>
            </div>

            <div className="mt-5 grid gap-5">
              <Field label="Issue title" hint="Use the symptom in the customer's words.">
                <input value={issue.title} onChange={(event) => updateIssue(issue.id, (current) => ({ ...current, title: event.target.value }))} placeholder="Example: The product does not turn on" className={fieldClass} />
              </Field>
              <Field label="Short explanation" hint="This appears below the title before the guide is opened.">
                <textarea value={issue.summary} onChange={(event) => updateIssue(issue.id, (current) => ({ ...current, summary: event.target.value }))} placeholder="Explain what the customer should check first." className={areaClass} />
              </Field>

              <div>
                <div className="flex items-center justify-between gap-3">
                  <div><p className="text-[11px] font-extrabold text-[#4f5b62]">Troubleshooting steps</p><p className="mt-1 text-[9px] leading-4 text-[#92999d]">Customers will follow these steps from top to bottom.</p></div>
                  <button type="button" onClick={() => updateIssue(issue.id, (current) => ({ ...current, steps: [...current.steps, ""] }))} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-[#0035b9]/20 bg-white px-3 text-[10px] font-extrabold text-[#0035b9]"><Plus className="size-3" /> Add step</button>
                </div>
                <div className="mt-3 space-y-2">
                  {issue.steps.map((step, stepIndex) => (
                    <div key={`${issue.id}-step-${stepIndex}`} className="flex items-center gap-2">
                      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#2c3038] text-[10px] font-extrabold text-white">{stepIndex + 1}</span>
                      <input value={step} onChange={(event) => updateIssue(issue.id, (current) => ({ ...current, steps: current.steps.map((item, index) => index === stepIndex ? event.target.value : item) }))} placeholder={`Step ${stepIndex + 1}`} className={`${fieldClass.replace("mt-2 ", "")} min-w-0 flex-1`} />
                      <div className="flex shrink-0">
                        <button type="button" onClick={() => moveStep(issue.id, stepIndex, -1)} disabled={stepIndex === 0} className="grid size-8 place-items-center rounded-full text-[#657178] hover:bg-white disabled:cursor-not-allowed disabled:opacity-30" aria-label={`Move step ${stepIndex + 1} up`}><ArrowUp className="size-3" /></button>
                        <button type="button" onClick={() => moveStep(issue.id, stepIndex, 1)} disabled={stepIndex === issue.steps.length - 1} className="grid size-8 place-items-center rounded-full text-[#657178] hover:bg-white disabled:cursor-not-allowed disabled:opacity-30" aria-label={`Move step ${stepIndex + 1} down`}><ArrowDown className="size-3" /></button>
                        <button type="button" onClick={() => updateIssue(issue.id, (current) => ({ ...current, steps: current.steps.filter((_, index) => index !== stepIndex) }))} className="grid size-8 place-items-center rounded-full text-[#9b7770] hover:bg-[#feeae5] hover:text-[#c9482d]" aria-label={`Delete step ${stepIndex + 1}`}><Trash2 className="size-3" /></button>
                      </div>
                    </div>
                  ))}
                  {issue.steps.length === 0 && <button type="button" onClick={() => updateIssue(issue.id, (current) => ({ ...current, steps: [""] }))} className="w-full rounded-xl border border-dashed border-[#2c3038]/14 p-4 text-xs font-extrabold text-[#0035b9]">Add the first troubleshooting step</button>}
                </div>
              </div>

              <Field label="Safety warning (optional)" hint="Use this when the customer must stop using the product or contact support.">
                <div className="relative">
                  <AlertTriangle className="absolute left-3.5 top-5 size-4 text-[#b76442]" />
                  <textarea value={issue.warning ?? ""} onChange={(event) => updateIssue(issue.id, (current) => ({ ...current, warning: event.target.value || undefined }))} placeholder="Example: Stop using the product if you smell gas." className={`${areaClass} pl-10`} />
                </div>
              </Field>
            </div>
          </article>
        ))}
        {product.issues.length === 0 && <AdminEmpty icon={CircleHelp} text="No customer issue guides yet. This is why the ‘What is happening?’ section is empty on the product page." action="Add the first issue guide" onClick={addIssue} />}
      </div>
    </div>
  );
}
