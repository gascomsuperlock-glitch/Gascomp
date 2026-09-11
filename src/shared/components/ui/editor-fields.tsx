export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return <label className="block"><span className="text-[11px] font-extrabold text-[#4f5b62]">{label}</span>{children}{hint && <span className="mt-1.5 block text-[9px] leading-4 text-[#92999d]">{hint}</span>}</label>;
}

export function EditorHeading({ title, copy }: { title: string; copy: string }) {
  return <div><h2 className="text-lg font-extrabold tracking-[-0.025em]">{title}</h2><p className="mt-1.5 max-w-lg text-xs leading-5 text-[#7a8489]">{copy}</p></div>;
}

export const fieldClass = "mt-2 h-11 w-full rounded-xl border border-[#2c3038]/10 bg-white px-3.5 text-sm font-semibold text-[#2c3038] outline-none transition placeholder:text-[#a1a8ac] focus:border-[#0035b9]/45 focus:ring-4 focus:ring-[#0035b9]/8";

export const areaClass = "mt-2 min-h-24 w-full resize-y rounded-xl border border-[#2c3038]/10 bg-white px-3.5 py-3 text-sm font-medium leading-6 text-[#2c3038] outline-none transition placeholder:text-[#a1a8ac] focus:border-[#0035b9]/45 focus:ring-4 focus:ring-[#0035b9]/8";
