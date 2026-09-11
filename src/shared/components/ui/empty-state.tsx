import type { IconType } from "@/shared/lib/icon-types";

export function AdminEmpty({ icon: Icon, text, action, onClick }: { icon: IconType; text: string; action: string; onClick: () => void }) {
  return <div className="rounded-[20px] border border-dashed border-[#2c3038]/14 p-10 text-center"><Icon className="mx-auto size-8 text-[#b0b6b9]" /><p className="mt-3 text-xs font-semibold text-[#7d878c]">{text}</p><button type="button" onClick={onClick} className="mt-4 text-xs font-extrabold text-[#0035b9]">{action}</button></div>;
}
