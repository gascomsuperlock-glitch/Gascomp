"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { ArrowRight, KeyRound, MessageCircle, ShieldCheck } from "lucide-react";
import { SiteHeader } from "@/shared/components/site-header";
import { useLanguage } from "@/shared/i18n/language-context";
import { useContent } from "@/features/catalog/hooks/use-content";
import { getWhatsappUrl } from "@/shared/lib/whatsapp";
import { careCopy } from "../model/copy";
import type { CareActionState, CareMember } from "../model/types";
import { loginCareAction, changeCarePasswordAction, logoutCareAction } from "../server/member-actions";
import type { CareCustomerCoverageResult } from "../model/customer-coverage";
import { CareCoverageSummary } from "./care-coverage-summary";
import { CareMemberCard } from "./care-member-card";

const inputClass = "mt-2 min-h-12 w-full rounded-xl border border-[#021b40]/20 bg-white px-4 text-base outline-none focus:border-[#0035b9] focus:ring-2 focus:ring-[#0035b9]/20";
const buttonClass = "inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#0035b9] px-6 text-sm font-bold text-white transition hover:bg-[#021b40] disabled:opacity-60";

function CareShell({ children }: { children: ReactNode }) {
  const { language } = useLanguage();
  const { content } = useContent();
  const router = useRouter();
  const previousLanguage = useRef(language);
  useEffect(() => {
    if (previousLanguage.current !== language) {
      previousLanguage.current = language;
      router.refresh();
    }
  }, [language, router]);
  const copy = careCopy[language];
  return <div className="min-h-screen bg-[#f6f8fb] text-[#021b40] [&_a:focus-visible]:outline-2 [&_a:focus-visible]:outline-offset-4 [&_a:focus-visible]:outline-[#0035b9] [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-offset-4 [&_button:focus-visible]:outline-[#0035b9]">
    <SiteHeader compact />
    <main className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-16">{children}
      {content.whatsappNumber && <div className="mt-9 border-t border-[#021b40]/10 pt-6"><p className="max-w-xl text-sm leading-6 text-[#566779]">{copy.accountHelp}</p><a href={getWhatsappUrl(content.whatsappNumber, "GascompCare", undefined, language)} target="_blank" rel="noreferrer" className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[#0035b9]"><MessageCircle aria-hidden="true" className="size-4" />{copy.contact}</a></div>}
    </main>
  </div>;
}

export function CareUnavailable() {
  const { language } = useLanguage();
  return <CareShell><h1 className="text-3xl font-extrabold">GascompCare</h1><p role="status" className="mt-5 max-w-lg text-base leading-7 text-[#566779]">{careCopy[language].unavailable}</p></CareShell>;
}

export function CareLoginForm() {
  const { language } = useLanguage();
  const copy = careCopy[language];
  const [state, action, pending] = useActionState<CareActionState, FormData>(loginCareAction, {});
  return <CareShell><div className="grid items-start gap-10 md:grid-cols-2"><div><span className="inline-flex rounded-full bg-[#dceeff] p-3 text-[#0035b9]"><ShieldCheck aria-hidden="true" className="size-6" /></span><h1 className="mt-5 text-4xl font-extrabold tracking-tight">{copy.loginTitle}</h1><p className="mt-4 max-w-md text-base leading-7 text-[#566779]">{copy.loginIntro}</p></div><form action={action} aria-busy={pending} className="space-y-5 rounded-3xl border border-[#021b40]/10 bg-white p-6 shadow-sm sm:p-8"><Field label={copy.username} name="username" autoComplete="username" minLength={3} maxLength={32} /><Field label={copy.password} name="password" type="password" autoComplete="current-password" maxLength={128} /><ActionError state={state} /><button disabled={pending} className={`${buttonClass} w-full`}>{pending ? copy.pending : copy.login}<ArrowRight aria-hidden="true" className="size-4" /></button></form></div></CareShell>;
}

export function CarePasswordForm({ mustChangePassword }: { mustChangePassword: boolean }) {
  const { language } = useLanguage();
  const copy = careCopy[language];
  const [state, action, pending] = useActionState<CareActionState, FormData>(changeCarePasswordAction, {});
  return <CareShell><div className="mx-auto max-w-lg"><h1 className="text-3xl font-extrabold tracking-tight">{copy.passwordTitle}</h1><p className="mt-4 text-sm leading-7 text-[#566779]">{mustChangePassword ? copy.firstPassword : copy.passwordIntro}</p><form action={action} aria-busy={pending} className="mt-6 space-y-5 rounded-3xl border border-[#021b40]/10 bg-white p-6 sm:p-8"><Field label={copy.currentPassword} name="currentPassword" type="password" autoComplete="current-password" maxLength={128} /><Field label={copy.newPassword} name="password" type="password" autoComplete="new-password" minLength={8} maxLength={128} description={copy.passwordHelp} /><Field label={copy.confirmPassword} name="confirmPassword" type="password" autoComplete="new-password" minLength={8} maxLength={128} /><ActionError state={state} /><button disabled={pending} className={`${buttonClass} w-full`}>{pending ? copy.pending : copy.save}</button></form><div className="mt-6 flex flex-wrap items-center justify-between gap-4">{!mustChangePassword && <Link href="/gascomp-care" className="text-sm font-bold text-[#0035b9]">{copy.back}</Link>}<LogoutForm /></div></div></CareShell>;
}

function Field({ label, name, description, ...props }: { label: string; name: string; description?: string; type?: string; autoComplete: string; minLength?: number; maxLength: number }) {
  const [value, setValue] = useState("");
  return <div><label htmlFor={`care-${name}`} className="text-sm font-bold">{label}</label><input id={`care-${name}`} name={name} required {...props} value={value} onChange={(event) => setValue(event.target.value)} aria-describedby={description ? `care-${name}-help` : undefined} className={inputClass} autoCapitalize="none" spellCheck={false} />{description && <p id={`care-${name}-help`} className="mt-2 text-xs leading-5 text-[#566779]">{description}</p>}</div>;
}

function ActionError({ state }: { state: CareActionState }) {
  const { language } = useLanguage();
  const errors = careCopy[language].errors;
  const key = state.error || (Object.keys(state.fieldErrors ?? {}).length ? "invalidInput" : undefined);
  if (!key) return null;
  return <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm leading-6 text-red-800">{errors[key as keyof typeof errors] ?? errors.requestFailed}{key === "unauthorized" && <Link href="/gascomp-care/login" className="ml-2 underline">{careCopy[language].login}</Link>}</p>;
}

function LogoutButton() {
  const { pending } = useFormStatus();
  const { language } = useLanguage();
  return <button disabled={pending} className="min-h-11 rounded-full border border-[#021b40]/20 px-5 text-sm font-bold disabled:opacity-60">{pending ? careCopy[language].pending : careCopy[language].logout}</button>;
}
function LogoutForm() { return <form action={logoutCareAction}><LogoutButton /></form>; }

export function CareMemberPage({ member, coverage }: { member: CareMember; coverage: CareCustomerCoverageResult }) {
  const { language } = useLanguage();
  const copy = careCopy[language];
  return <CareShell><div className="mb-8 flex flex-wrap items-start justify-between gap-5"><div><h1 className="text-4xl font-extrabold tracking-tight">{copy.memberTitle}</h1><p className="mt-3 text-sm text-[#566779]">{copy.memberIntro}</p></div><LogoutForm /></div><div className="grid items-start gap-7 md:grid-cols-2"><CareMemberCard name={member.name} memberNumber={member.memberNumber} language={language} /><section className="min-w-0 rounded-3xl border border-[#021b40]/10 bg-white p-6 sm:p-8"><h2 className="text-lg font-extrabold">{copy.profile}</h2><dl className="mt-6 space-y-5">{[[copy.name, member.name], [copy.username, member.username], [copy.memberNumber, member.memberNumber]].map(([label, value]) => <div key={label}><dt className="text-xs font-semibold text-[#566779]">{label}</dt><dd className="mt-1 break-words text-sm font-bold">{value}</dd></div>)}</dl><Link href="/gascomp-care/change-password" className="mt-7 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[#0035b9]"><KeyRound aria-hidden="true" className="size-4" />{copy.passwordTitle}</Link></section></div><CareCoverageSummary result={coverage} /></CareShell>;
}

export function CareLoading() {
  const { language } = useLanguage();
  return <CareShell><p role="status" className="py-12 text-center font-semibold">{careCopy[language].loading}</p></CareShell>;
}

export function CareError({ reset }: { reset: () => void }) {
  const { language } = useLanguage();
  const copy = careCopy[language];
  return <CareShell><h1 className="text-3xl font-extrabold">GascompCare</h1><p role="alert" className="mt-5 max-w-lg leading-7">{copy.unavailable}</p><button onClick={reset} className={`${buttonClass} mt-6`}>{copy.retry}</button></CareShell>;
}
