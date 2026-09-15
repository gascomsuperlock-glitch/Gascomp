"use client";

import { startTransition, useEffect, useRef, useState } from "react";
import { Copy, LoaderCircle, Plus, Search, ShieldCheck, X } from "lucide-react";
import type { CareActionState, CareMember } from "../model/types";
import { createCareMemberAction, listCareMembers, resetCarePasswordAction } from "../server/admin-actions";
import { CareMemberCard } from "./care-member-card";
import { deleteCareMembersAction } from "../server/member-deletion-actions";
import { CareCoverageAdmin } from "./care-coverage-admin";

const button = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-bold transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0035b9]";
const input = "mt-1 min-h-11 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0035b9]";
const errors: Record<string, string> = {
  unavailable: "GascompCare is unavailable. Check the Supabase configuration and migration, then retry.",
  unauthorized: "Your admin session has expired. Sign in again.",
  invalidInput: "Check the member details and try again.",
  duplicateUsername: "That username is already in use. Choose another username.",
  rateLimited: "Too many attempts. Please wait before trying again.",
  requestFailed: "The request could not be completed. Refresh and check the member list before retrying.",
};
const message = (key?: string) => errors[key ?? "requestFailed"] ?? errors.requestFailed;

export function CareAdmin() {
  const [search, setSearch] = useState("");
  const [request, setRequest] = useState({ query: "", page: 1, revision: 0 });
  const [result, setResult] = useState<{ key: string; members: CareMember[]; total: number; error?: string }>();
  const key = JSON.stringify(request);
  const [selected, setSelected] = useState<CareMember>();
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [operation, setOperation] = useState<"create" | "reset" | "delete">();
  const deleting = useRef(false);
  const [selecting, setSelecting] = useState(false);
  const [checked, setChecked] = useState<string[]>([]);
  const [deletionFeedback, setDeletionFeedback] = useState<{ error?: string; success?: string }>();
  const checkAll = useRef<HTMLInputElement>(null);
  const [actionError, setActionError] = useState<string>();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [credentials, setCredentials] = useState<CareActionState["credentials"]>();
  const [copyStatus, setCopyStatus] = useState("");
  const detailHeading = useRef<HTMLHeadingElement>(null);
  const loading = result?.key !== key;
  const visibleChecked = checked.filter((id) => result?.members.some((member) => member.id === id));
  const allChecked = Boolean(result?.members.length) && visibleChecked.length === result?.members.length;
  useEffect(() => {
    if (checkAll.current) checkAll.current.indeterminate = visibleChecked.length > 0 && !allChecked;
  }, [visibleChecked.length, allChecked, selecting, loading]);
  const pages = Math.max(1, Math.ceil((result?.total ?? 0) / 20));

  useEffect(() => {
    let active = true;
    startTransition(async () => {
      try {
        const response = await listCareMembers({ query: request.query, page: request.page });
        if (active) setResult({ key, ...response });
      } catch {
        if (active) setResult({ key, members: [], total: 0, error: "requestFailed" });
      }
    });
    return () => { active = false; };
  }, [key, request.page, request.query]);

  function clearFeedback() {
    setCredentials(undefined);
    setCopyStatus("");
    setActionError(undefined);
    setFieldErrors({});
  }

  function refresh() {
    setRequest((current) => ({ ...current, revision: current.revision + 1 }));
  }

  function focusDetails() {
    requestAnimationFrame(() => detailHeading.current?.focus());
  }

  async function createMember(formData: FormData) {
    if (busy) return;
    clearFeedback();
    setBusy(true);
    setOperation("create");
    try {
      const response = await createCareMemberAction({}, formData);
      if (!response.success) {
        setActionError(message(response.error));
        setFieldErrors(response.fieldErrors ?? {});
        return;
      }
      setSelected(response.member);
      setCreating(false);
      setCredentials(response.credentials);
      refresh();
      focusDetails();
    } catch {
      setActionError(message());
    } finally {
      setBusy(false);
      setOperation(undefined);
    }
  }

  function resetPassword() {
    if (!selected || busy) return;
    clearFeedback();
    if (!window.confirm(`Reset the password for ${selected.username}? Their current password and all active sessions will stop working.`)) return;
    setBusy(true);
    setOperation("reset");
    setChecked([]);
    startTransition(async () => {
      try {
        const response = await resetCarePasswordAction(selected.id);
        if (!response.success) { setActionError(message(response.error)); return; }
        setCredentials(response.credentials);
        setSelected(response.member ?? { ...selected, mustChangePassword: true });
        refresh();
      } catch {
        setActionError(message());
      } finally {
        setBusy(false);
        setOperation(undefined);
      }
    });
  }

  function deleteMembers(ids: string[]) {
    if (busy || deleting.current || loading || !ids.length) return;
    if (!window.confirm(`Delete ${ids.length === 1 ? "this member" : `${ids.length} selected members`}? They will be removed from the member list and lose account access. Their purchase and claim history will be retained.`)) return;
    deleting.current = true;
    setBusy(true);
    setOperation("delete");
    setDeletionFeedback(undefined);
    startTransition(async () => {
      try {
        const response = await deleteCareMembersAction(ids);
        if (response.error) {
          setDeletionFeedback({ error: message(response.error) });
          refresh();
          return;
        }
        if (selected && response.deletedIds.includes(selected.id)) {
          clearFeedback();
          setSelected(undefined);
          setCreating(false);
        }
        setChecked([]);
        setDeletionFeedback({ success: `${response.deletedIds.length} member(s) deleted. Purchase and claim history has been retained.` });
        setRequest((current) => ({ ...current, page: 1, revision: current.revision + 1 }));
      } catch {
        setDeletionFeedback({ error: "The deletion response could not be confirmed. The list is being refreshed; check it before retrying." });
        refresh();
      } finally {
        deleting.current = false;
        setBusy(false);
        setOperation(undefined);
      }
    });
  }

  async function copyCredentials() {
    if (!credentials) return;
    try {
      await navigator.clipboard.writeText(`Username: ${credentials.username}\nTemporary password: ${credentials.password}`);
      setCopyStatus("Copied. Send these credentials to the buyer manually.");
    } catch {
      setCopyStatus("Copy is unavailable. Select and copy the credentials shown below.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><h2 className="text-xl font-extrabold text-[#172b4d]">GascompCare members</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Create buyer accounts and manage access to their virtual member cards. Accounts, verified Care purchases, and claim records are saved immediately.</p></div>
        <button type="button" disabled={busy} className={`${button} bg-[#0035b9] text-white hover:bg-[#002c98]`} onClick={() => { setChecked([]); clearFeedback(); setSelected(undefined); setCreating(true); focusDetails(); }}><Plus aria-hidden="true" className="size-4" /> Create Member</button>
      </div>
      <div className="grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <section aria-label="Members" className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
          <form onSubmit={(event) => { event.preventDefault(); if (busy) return; setChecked([]); clearFeedback(); setSelected(undefined); setCreating(false); setRequest((current) => ({ query: search.trim(), page: 1, revision: current.revision + 1 })); }} className="flex items-end gap-2">
            <label className="min-w-0 flex-1 text-xs font-bold text-slate-600">Search members<input type="search" value={search} maxLength={100} disabled={busy} onChange={(event) => { setSearch(event.target.value); setChecked([]); }} placeholder="Name, username, or member number" className={input} /></label>
            <button disabled={busy} type="submit" className={button} aria-label="Search members"><Search aria-hidden="true" className="size-4" /></button>
          </form>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button type="button" disabled={busy || loading || Boolean(result?.error)} aria-pressed={selecting} onClick={() => { setSelecting(!selecting); setChecked([]); }} className={button}>{selecting ? "Done Selecting" : "Select Members"}</button>
            {selecting && <>
              <label className="inline-flex min-h-11 items-center gap-2 px-2 text-xs font-bold"><input ref={checkAll} type="checkbox" checked={allChecked} disabled={busy || loading || Boolean(result?.error) || !result?.members.length} onChange={(event) => setChecked(event.target.checked ? (result?.members.map((member) => member.id) ?? []) : [])} className="size-4 accent-[#0035b9]" /> Select all on this page</label>
              <button type="button" disabled={busy || !checked.length} onClick={() => setChecked([])} className={button}>Clear selection</button>
              <button type="button" disabled={busy || loading || Boolean(result?.error) || !visibleChecked.length} onClick={() => deleteMembers(visibleChecked)} className={`${button} text-red-700`}>{operation === "delete" ? "Deleting..." : `Delete Selected (${visibleChecked.length})`}</button>
            </>}
          </div>
          {deletionFeedback?.error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{deletionFeedback.error}</p>}
          {deletionFeedback?.success && <p role="status" className="mt-4 rounded-xl bg-green-50 p-3 text-sm text-green-800">{deletionFeedback.success}</p>}
          <div className="mt-5" aria-live="polite" aria-busy={loading}>
            {loading ? <p className="flex items-center gap-2 py-10 text-sm text-slate-600"><LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> Loading members...</p> : result?.error ? <div role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800"><p>{message(result.error)}</p><button type="button" disabled={busy} onClick={refresh} className={`${button} mt-3`}>Retry</button></div> : !result?.members.length ? <div className="py-12 text-center"><ShieldCheck aria-hidden="true" className="mx-auto size-9 text-slate-400" /><h3 className="mt-3 font-bold">{request.query ? "No matching members" : "No members yet"}</h3><p className="mt-2 text-sm text-slate-600">{request.query ? "Try another name, username, or member number." : "Create an account after confirming the buyer's purchase."}</p></div> : <ul className="divide-y divide-slate-100">{result.members.map((member) => <li key={member.id} className="flex min-w-0 items-center gap-2">{selecting && <label className="flex min-h-11 shrink-0 items-center p-2"><span className="sr-only">Select {member.name} ({member.username})</span><input type="checkbox" disabled={busy} checked={checked.includes(member.id)} onChange={(event) => setChecked((current) => event.target.checked ? [...current, member.id] : current.filter((id) => id !== member.id))} className="size-4 accent-[#0035b9]" /></label>}<button type="button" disabled={busy} aria-pressed={selected?.id === member.id} onClick={() => { clearFeedback(); setSelected(member); setCreating(false); focusDetails(); }} className={`min-w-0 w-full rounded-xl p-3 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0035b9] ${selected?.id === member.id ? "bg-blue-50" : "hover:bg-slate-50"}`}><span className="block break-words text-sm font-bold text-[#172b4d]">{member.name}</span><span className="mt-1 block break-all text-xs leading-5 text-slate-600">{member.username} · {member.memberNumber}</span><span className="mt-1 block text-xs font-bold text-[#0035b9]">View member</span></button></li>)}</ul>}
          </div>
          {!loading && !result?.error && (result?.total ?? 0) > 0 && <nav aria-label="Member pages" className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4"><p className="mr-auto text-xs text-slate-600">{result?.total} members · Page {request.page} of {pages}</p>{Array.from({ length: Math.min(5, pages) }, (_, index) => Math.max(1, Math.min(request.page - 2, pages - 4)) + index).map((page) => <button key={page} type="button" disabled={busy || page === request.page} aria-current={page === request.page ? "page" : undefined} onClick={() => { setChecked([]); clearFeedback(); setSelected(undefined); setCreating(false); setRequest((current) => ({ ...current, page })); }} className={`${button} px-3 ${page === request.page ? "bg-blue-50 text-blue-800" : ""}`}>{page}</button>)}</nav>}
        </section>

        <div className="min-w-0 space-y-6">
          {(creating || selected) && <section aria-label={creating ? "Create member" : "Member details"} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
            <div className="flex items-start justify-between gap-3"><h3 ref={detailHeading} tabIndex={-1} className="text-lg font-extrabold text-[#172b4d] outline-none">{creating ? "Create Member" : "Member details"}</h3><button type="button" disabled={busy} onClick={() => { clearFeedback(); setCreating(false); setSelected(undefined); }} aria-label="Close member panel" className={`${button} px-3`}><X aria-hidden="true" className="size-4" /></button></div>
            {actionError && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{actionError}</p>}
            {creating ? <form onSubmit={(event) => { event.preventDefault(); const formData = new FormData(event.currentTarget); startTransition(() => createMember(formData)); }} className="mt-5 space-y-4"><fieldset disabled={busy} className="space-y-4">{([
              ["name", "Customer name", "text", 100], ["username", "Username", "text", 32], ["whatsapp", "WhatsApp number", "tel", 30], ["orderReference", "Shopee order reference (optional)", "text", 100],
            ] as const).map(([name, label, type, maxLength]) => <label key={name} className="block text-sm font-bold text-slate-700">{label}<input name={name} type={type} required={name !== "orderReference"} maxLength={maxLength} minLength={name === "username" ? 3 : undefined} pattern={name === "username" ? "[a-zA-Z0-9._\\-]{3,32}" : undefined} autoCapitalize={name === "username" ? "none" : undefined} autoComplete="off" aria-invalid={Boolean(fieldErrors[name])} aria-describedby={fieldErrors[name] ? `care-${name}-error` : name === "username" ? "care-username-help" : undefined} className={input} />{fieldErrors[name] && <span id={`care-${name}-error`} className="mt-1 block text-xs font-normal text-red-700">{fieldErrors[name] === "duplicateUsername" ? "That username is already in use." : name === "whatsapp" ? "Enter a valid phone number with at least six digits." : "Check this field and try again."}</span>}</label>)}<p id="care-username-help" className="text-xs leading-5 text-slate-500">Usernames use 3–32 letters, numbers, periods, underscores, or hyphens. Account creation does not issue warranty coverage.</p><button type="submit" className={`${button} bg-[#0035b9] text-white hover:bg-[#002c98]`}>{busy && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}{operation === "create" ? "Creating..." : "Create account"}</button></fieldset></form> : selected && <div className="mt-5 space-y-5"><CareMemberCard name={selected.name} memberNumber={selected.memberNumber} /><dl className="grid gap-3 text-sm">{[["Username", selected.username], ["WhatsApp", selected.whatsapp], ["Shopee order reference", selected.orderReference || "Not provided"], ["Created", new Date(selected.createdAt).toLocaleDateString("en-GB", { timeZone: "Asia/Jakarta" })], ["Password", selected.mustChangePassword ? "Must change at next sign-in" : "Set by member"]].map(([label, value]) => <div key={label}><dt className="text-xs font-bold text-slate-500">{label}</dt><dd className="mt-1 break-words text-slate-800">{value}</dd></div>)}</dl><div className="flex flex-wrap gap-2"><button type="button" onClick={resetPassword} disabled={busy} className={button}>{operation === "reset" ? "Resetting..." : "Reset Password"}</button><button type="button" onClick={() => deleteMembers([selected.id])} disabled={busy || loading} className={`${button} text-red-700`}>{operation === "delete" ? "Deleting..." : "Delete Member"}</button></div></div>}
            {credentials && <div role="status" className="mt-5 rounded-xl border border-cyan-200 bg-cyan-50 p-4"><h4 className="font-bold text-[#172b4d]">Temporary sign-in details</h4><p className="mt-2 text-xs leading-5 text-slate-600">Copy these details before closing this panel. The member must change their password at first sign-in. Share manually in the buyer&apos;s private chat.</p><dl className="mt-3 space-y-2 text-sm"><div><dt className="font-bold">Username</dt><dd className="select-all break-all font-mono">{credentials.username}</dd></div><div><dt className="font-bold">Temporary password</dt><dd className="select-all break-all font-mono">{credentials.password}</dd></div></dl><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => void copyCredentials()} className={button}><Copy aria-hidden="true" className="size-4" /> Copy credentials</button><button type="button" onClick={() => { setCredentials(undefined); setCopyStatus(""); }} className={button}>Dismiss</button></div>{copyStatus && <p className="mt-3 text-xs">{copyStatus}</p>}</div>}
          </section>}
          {selected && !creating && <CareCoverageAdmin key={selected.id} memberId={selected.id} />}
          <section aria-label="Card preview" className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6"><h3 className="text-lg font-extrabold text-[#172b4d]">Card Preview</h3><p className="mb-5 mt-2 text-sm leading-6 text-slate-600">Sample only. This card does not belong to a customer or issue warranty rights.</p><CareMemberCard name="Sample Member" memberNumber="GC-DEMO-0001" sample /></section>
        </div>
      </div>
    </div>
  );
}
