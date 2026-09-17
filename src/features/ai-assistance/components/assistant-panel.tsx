"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { LoaderCircle, MessageCircle, MessageSquarePlus, Send, X } from "lucide-react";
import { useContent } from "@/features/catalog/hooks/use-content";
import { LanguageSelector } from "@/shared/components/language-selector";
import { useLanguage } from "@/shared/i18n/language-context";
import type { AppLanguage } from "@/shared/i18n/language";
import { getWhatsappUrl, normalizeWhatsapp } from "@/shared/lib/whatsapp";
import { assistantCopy } from "./copy";

type ChatState = {
  messages: Array<{ id: string; role: "user" | "assistant"; text: string; status?: string; createdAt: string }>;
  availability: "ready" | "offline" | "paused" | "unavailable";
  pending: boolean;
  greeting: string | null;
  handoff: string | null;
};
type Submission = { requestId: string; text: string; language: AppLanguage; sku?: string };

class ChatRequestError extends Error {
  constructor(readonly status: number) { super("Chat request failed."); }
}

async function readChat(path: string, body?: object, cancellation?: AbortSignal): Promise<ChatState> {
  const timeout = AbortSignal.timeout(15000);
  const response = await fetch(`/api/ai-assistance/${path}`, {
    method: body ? "POST" : "GET", credentials: "same-origin", cache: "no-store",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    signal: cancellation ? AbortSignal.any([cancellation, timeout]) : timeout,
  });
  if (!response.ok) throw new ChatRequestError(response.status);
  return response.json();
}

export function AssistantPanel() {
  const pathname = usePathname();
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return null;
  return <PublicAssistant />;
}

function HandoffContact({ number, language }: { number: string; language: AppLanguage }) {
  const t = assistantCopy[language];
  return normalizeWhatsapp(number)
    ? <a href={getWhatsappUrl(number, undefined, undefined, language)} target="_blank" rel="noopener noreferrer" className="mt-2 flex min-h-11 items-center justify-center gap-2 rounded-xl border border-green-200 bg-green-50 px-2 text-center text-xs font-bold text-green-900 hover:bg-green-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0035b9]"><MessageCircle aria-hidden="true" className="size-4 shrink-0" />{t.whatsapp}</a>
    : <p className="mt-2 text-xs text-slate-600">{t.noContact}</p>;
}

function PublicAssistant() {
  const { content } = useContent();
  const { language } = useLanguage();
  const t = assistantCopy[language];
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<ChatState | null>(null);
  const [loadedLanguage, setLoadedLanguage] = useState<AppLanguage | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<"read" | "send" | "reset" | null>(null);
  const [sending, setSending] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [reload, setReload] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const history = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const launcher = useRef<HTMLButtonElement>(null);
  const generation = useRef(0);
  const submission = useRef<Submission | null>(null);
  const sendLock = useRef(false);
  const resetLock = useRef(false);
  const activeLanguage = useRef(language);
  const initializing = loadedLanguage !== language;
  const latestAssistantHasHandoff = state?.messages.filter((message) => message.role === "assistant").at(-1)?.status === "handoff";

  useEffect(() => { activeLanguage.current = language; }, [language]);

  useEffect(() => {
    const element = dialog.current;
    if (open && element && !element.open) element.showModal();
    if (!open && element?.open) element.close();
  }, [open]);

  useEffect(() => {
    if (!open || sending || resetting) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const controller = new AbortController();
    const current = ++generation.current;
    async function refresh(initial: boolean) {
      try {
        const next = initial
          ? await readChat("session", { language }, controller.signal)
          : await readChat(`messages?language=${language}`, undefined, controller.signal);
        if (cancelled || current !== generation.current) return;
        setState(next);
        setLoadedLanguage(language);
        setError((previous) => previous === "read" ? null : previous);
        // Poll only while the dialog is visible. Reads also settle expired jobs.
        timer = setTimeout(() => void refresh(false), next.pending ? 2000 : 10000);
      } catch (cause) {
        if (cancelled || current !== generation.current) return;
        if (!initial && cause instanceof ChatRequestError && cause.status === 401) {
          void refresh(true);
          return;
        }
        setError((previous) => previous === "send" || previous === "reset" ? previous : "read");
        timer = setTimeout(() => void refresh(initial), 10000);
      }
    }
    void refresh(true);
    return () => { cancelled = true; controller.abort(); clearTimeout(timer); };
  }, [open, language, sending, resetting, reload]);

  useEffect(() => {
    const element = history.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [state?.messages.length, state?.pending, state?.availability, error, open]);

  async function send(event: FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || sendLock.current || resetLock.current || initializing || state?.pending) return;
    sendLock.current = true;
    generation.current++;
    setSending(true);
    setError(null);
    const previous = submission.current;
    const product = content.products.find((item) => window.location.pathname === `/produk/${item.slug}`);
    const request = previous && previous.text === text && previous.language === language
      ? previous
      : { requestId: crypto.randomUUID(), text, language, ...(product ? { sku: product.sku } : {}) };
    submission.current = request;
    try {
      const next = await readChat("messages", request);
      if (activeLanguage.current === request.language) setState(next);
      setDraft("");
      submission.current = null;
      requestAnimationFrame(() => input.current?.focus());
    } catch {
      setError("send");
    } finally {
      sendLock.current = false;
      setSending(false);
    }
  }

  async function startNewConversation() {
    if (resetLock.current || sendLock.current || sending || initializing) return;
    resetLock.current = true;
    generation.current++;
    setResetting(true);
    setError(null);
    const resetLanguage = language;
    try {
      const next = await readChat("session", { language: resetLanguage, newConversation: true });
      submission.current = null;
      setDraft("");
      setError(null);
      if (activeLanguage.current === resetLanguage) {
        setState(next);
        setLoadedLanguage(resetLanguage);
      } else {
        setState(null);
        setLoadedLanguage(null);
      }
      requestAnimationFrame(() => {
        if (dialog.current?.open) input.current?.focus();
      });
    } catch {
      setError("reset");
    } finally {
      resetLock.current = false;
      setResetting(false);
    }
  }

  function close() {
    setOpen(false);
    launcher.current?.focus();
  }

  return <>
    <button ref={launcher} type="button" onClick={() => setOpen(true)} aria-label={t.open} aria-haspopup="dialog" aria-expanded={open} aria-controls="gascomp-assistant" className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-[calc(1rem+env(safe-area-inset-right))] z-[60] flex min-h-14 items-center gap-2 rounded-full border border-white/70 bg-[#0035b9] px-4 text-sm font-bold text-white shadow-xl hover:bg-[#002c98] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0035b9] sm:bottom-6 sm:right-6">
      <MessageCircle aria-hidden="true" className="size-6" /><span>Gascomp Assistant</span>
    </button>
    <dialog ref={dialog} id="gascomp-assistant" aria-labelledby="gascomp-assistant-title" onCancel={close} onClose={close} className="fixed inset-auto right-[max(0.5rem,env(safe-area-inset-right))] bottom-[max(0.5rem,env(safe-area-inset-bottom))] m-0 h-[min(680px,calc(100dvh-1rem))] max-h-[calc(100dvh-1rem)] w-[min(420px,calc(100vw-1rem))] max-w-none overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/25 sm:right-6 sm:bottom-6">
      <div className="flex h-full min-h-0 flex-col">
        <header className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-200 p-3">
          <div className="min-w-0"><h2 id="gascomp-assistant-title" className="text-base font-extrabold">Gascomp Assistant</h2><p className="text-xs text-slate-600">{state?.availability === "ready" && !initializing ? t.ready : "Gascomp"}</p></div>
          <button autoFocus type="button" onClick={close} aria-label={t.close} className="grid size-11 shrink-0 place-items-center rounded-full hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-[#0035b9]"><X aria-hidden="true" className="size-5" /></button>
        </header>
        <div className="flex shrink-0 items-center justify-between gap-2 px-3 pt-2">
          <button type="button" onClick={() => void startNewConversation()} disabled={resetting || sending || initializing} className="flex min-h-11 min-w-0 items-center gap-1.5 rounded-xl px-2 text-xs font-bold text-[#0035b9] hover:bg-[#edf4ff] disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0035b9]">
            {resetting ? <LoaderCircle aria-hidden="true" className="size-4 shrink-0 animate-spin" /> : <MessageSquarePlus aria-hidden="true" className="size-4 shrink-0" />}
            <span className="truncate">{resetting ? t.startingNewChat : t.newChat}</span>
          </button>
          <LanguageSelector />
        </div>
        <div ref={history} role="log" aria-label={t.history} aria-live="polite" aria-relevant="additions text" className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-3">
          {initializing && !error && <p role="status" className="text-sm text-slate-600">{t.loading}</p>}
          {!initializing && state?.greeting && <p className="whitespace-pre-wrap break-words rounded-xl bg-slate-100 p-3 text-sm leading-6">{state.greeting}</p>}
          {state?.messages.map((message) => <div key={message.id} className={`max-w-[95%] rounded-xl p-3 ${message.role === "user" ? "ml-auto bg-[#0035b9] text-white" : "bg-slate-100"}`}><p className="mb-1 text-[10px] font-bold opacity-75">{message.role === "user" ? t.you : "Gascomp Assistant"}</p><p className="whitespace-pre-wrap break-words text-sm leading-6 [overflow-wrap:anywhere]">{message.text}</p>{message.role === "assistant" && message.status === "handoff" && <HandoffContact number={content.whatsappNumber} language={language} />}</div>)}
          {!initializing && !state?.greeting && !state?.messages.length && state?.availability === "ready" && <p className="text-sm text-slate-600">{t.empty}</p>}
          {!initializing && state && state.availability !== "ready" && <div className="rounded-xl bg-amber-50 p-3 text-sm leading-6 text-amber-950"><p>{t[state.availability]}</p>{state.handoff && <p className="mt-2 whitespace-pre-wrap break-words">{state.handoff}</p>}{!latestAssistantHasHandoff && !error && <HandoffContact number={content.whatsappNumber} language={language} />}</div>}
          {error && <div role="alert" className="rounded-xl bg-red-50 p-3 text-xs leading-5 text-red-800">
            <p>{error === "send" ? t.sendError : error === "reset" ? t.newChatError : t.error}</p>
            <button type="button" disabled={resetting || (error === "send" && (sending || initializing || state?.pending || !draft.trim()))} onClick={() => {
              if (error === "send") input.current?.form?.requestSubmit();
              else if (error === "reset") void startNewConversation();
              else { setError(null); setReload((value) => value + 1); }
            }} className="min-h-11 font-bold underline disabled:opacity-40">{t.retry}</button>
            {!latestAssistantHasHandoff && <HandoffContact number={content.whatsappNumber} language={language} />}
          </div>}
          {state?.pending && <p role="status" className="flex items-center gap-2 text-sm text-slate-600"><LoaderCircle aria-hidden="true" className="size-4 animate-spin" />{t.waiting}</p>}
        </div>
        <div className="shrink-0 border-t border-slate-200 p-3">
          <form onSubmit={send} className="flex items-end gap-2">
            <label className="min-w-0 flex-1"><span className="sr-only">{t.message}</span><textarea ref={input} value={draft} onChange={(event) => setDraft(event.target.value)} rows={2} maxLength={2000} disabled={sending || resetting || initializing || state?.pending} placeholder={t.placeholder} className="block min-h-12 w-full resize-none rounded-xl border border-slate-300 p-2 text-base focus-visible:outline-2 focus-visible:outline-[#0035b9] disabled:bg-slate-100" onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} /></label>
            <button type="submit" disabled={!draft.trim() || sending || resetting || initializing || state?.pending} aria-label={sending ? t.sending : error === "send" ? t.retry : t.send} className="grid size-12 shrink-0 place-items-center rounded-xl bg-[#0035b9] text-white hover:bg-[#002c98] disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0035b9]">{sending ? <LoaderCircle aria-hidden="true" className="size-5 animate-spin" /> : <Send aria-hidden="true" className="size-5" />}</button>
          </form>
          <p className="mt-2 text-[10px] leading-4 text-slate-500">{t.privacy}</p>
        </div>
      </div>
    </dialog>
  </>;
}
