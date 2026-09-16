"use client";

import dynamic from "next/dynamic";
import { startTransition, useEffect, useRef, useState } from "react";
import { LoaderCircle, MapPin, Plus, Save, Search, Trash2, X } from "lucide-react";
import { INDONESIA_PROVINCES } from "../model/provinces";
import { isGoogleMapsUrl, validateServiceCenterInput } from "../model/input";
import type { ServiceCenter, ServiceCenterInput } from "../model/types";
import { importGoogleMapsAction } from "../server/maps-actions";
import type { GoogleMapsImportData } from "../model/google-maps-import";
import { deleteServiceCenterAction, listServiceCentersAction, saveServiceCenterAction } from "../server/actions";

const ServiceCenterMap = dynamic(() => import("./service-center-map"), {
  ssr: false,
  loading: () => <p role="status" className="flex min-h-80 items-center justify-center text-sm text-slate-600">Loading map...</p>,
});

const button = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-bold transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0035b9]";
const input = "mt-1 min-h-11 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 text-base font-normal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0035b9]";
const primaryButton = `${button} bg-[#0035b9] text-white hover:bg-[#002c98]`;

type Draft = Omit<ServiceCenterInput, "latitude" | "longitude"> & { latitude: string; longitude: string };
type ListResult = { revision: number; centers: ServiceCenter[]; error?: string };

function emptyDraft(): Draft {
  return { name: "", provinceCode: "", city: "", address: "", phone: "", whatsapp: "", hours: "", mapsUrl: "", latitude: "", longitude: "", active: true };
}

function toDraft(center: ServiceCenter): Draft {
  return { ...center, latitude: String(center.latitude), longitude: String(center.longitude) };
}

function errorMessage(error?: string) {
  return error && error !== "requestFailed"
    ? error
    : "The request could not be confirmed. Your draft is preserved. Check the location list before retrying.";
}

export function ServiceCenterAdmin() {
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<ListResult>();
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState<Draft>();
  const [baseline, setBaseline] = useState("");
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [feedback, setFeedback] = useState<{ error?: string; success?: string }>();
  const [importing, setImporting] = useState(false);
  const [importFeedback, setImportFeedback] = useState<{ error?: string; message?: string }>();
  const [importedData, setImportedData] = useState<GoogleMapsImportData>();
  const importVersion = useRef(0);
  const lastImportUrl = useRef("");
  const saving = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const errorNotice = useRef<HTMLParagraphElement>(null);
  const addButton = useRef<HTMLButtonElement>(null);
  const loading = result?.revision !== revision;
  const dirty = Boolean(draft && JSON.stringify(draft) !== baseline);
  const centers = result?.centers ?? [];
  const query = search.trim().toLocaleLowerCase("en");
  const visibleCenters = centers.filter((center) => {
    const province = INDONESIA_PROVINCES.find((item) => item.code === center.provinceCode);
    return [center.name, center.city, center.address, province?.nameEn, province?.nameId].join(" ").toLocaleLowerCase("en").includes(query);
  });

  useEffect(() => {
    let active = true;
    startTransition(async () => {
      try {
        const response = await listServiceCentersAction();
        if (active) setResult({ revision, ...response });
      } catch {
        if (active) setResult({ revision, centers: [], error: "requestFailed" });
      }
    });
    return () => { active = false; };
  }, [revision]);

  useEffect(() => {
    if (!dirty) return;
    const warnBeforeLeave = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeLeave);
    return () => window.removeEventListener("beforeunload", warnBeforeLeave);
  }, [dirty]);

  useEffect(() => () => { importVersion.current++; }, []);

  useEffect(() => {
    if (feedback?.error) errorNotice.current?.focus();
  }, [feedback]);

  function resetImport() {
    importVersion.current++;
    lastImportUrl.current = "";
    setImporting(false);
    setImportFeedback(undefined);
    setImportedData(undefined);
  }

  function mergeImported(current: Draft, data: GoogleMapsImportData, replace = false): Draft {
    const next = { ...current };
    for (const key of ["name", "provinceCode", "city", "address", "phone", "hours"] as const) {
      if (data[key] && (replace || !current[key].trim())) next[key] = data[key];
    }
    if (data.latitude !== undefined && data.longitude !== undefined && (replace || (!current.latitude.trim() && !current.longitude.trim()))) {
      next.latitude = String(data.latitude);
      next.longitude = String(data.longitude);
    }
    return next;
  }

  async function readMapsLink(raw: string) {
    const url = raw.trim();
    if (saving.current || !url) return;
    const version = ++importVersion.current;
    lastImportUrl.current = url;
    setImportedData(undefined);
    setImportFeedback(undefined);
    if (!isGoogleMapsUrl(url)) {
      setImporting(false);
      setImportFeedback({ error: "Paste a valid HTTPS Google Maps place link." });
      return;
    }
    setImporting(true);
    try {
      const response = await importGoogleMapsAction(url);
      if (version !== importVersion.current) return;
      if (response.error || !response.data) {
        setImportFeedback({ error: response.error || "No place details could be read. Enter the location manually." });
        return;
      }
      const data = response.data;
      setDraft((current) => current && current.mapsUrl.trim() === url ? mergeImported(current, data) : current);
      setImportedData(data);
      setImportFeedback({ message: `Available details filled into empty fields. Existing details were kept. ${response.warning || "Review the details before saving."}` });
    } catch {
      if (version === importVersion.current) setImportFeedback({ error: "The link could not be read. Try again or enter the location manually." });
    } finally {
      if (version === importVersion.current) setImporting(false);
    }
  }

  function canLeaveDraft() {
    return !dirty || window.confirm("Discard the unsaved changes to this location?");
  }

  function openDraft(center?: ServiceCenter) {
    if (busy || !canLeaveDraft()) return;
    resetImport();
    const nextDraft = center ? toDraft(center) : emptyDraft();
    setDraft(nextDraft);
    setBaseline(JSON.stringify(nextDraft));
    setFeedback(undefined);
    requestAnimationFrame(() => {
      heading.current?.focus();
      heading.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }

  function updateDraft<Key extends keyof Draft>(key: Key, value: Draft[Key]) {
    if (saving.current) return;
    if (key === "mapsUrl") resetImport();
    setDraft((current) => current ? { ...current, [key]: value } : current);
    setFeedback(undefined);
  }

  async function saveLocation() {
    if (!draft || saving.current || importing) return;
    if (!draft.latitude.trim() || !draft.longitude.trim()) {
      setFeedback({ error: "Choose a location on the map or enter both coordinates." });
      return;
    }
    const validation = validateServiceCenterInput({ ...draft, latitude: Number(draft.latitude), longitude: Number(draft.longitude) });
    if (!validation.value) {
      setFeedback({ error: validation.error });
      return;
    }
    saving.current = true;
    setBusy(true);
    setFeedback(undefined);
    try {
      const response = await saveServiceCenterAction(validation.value);
      if (response.error || !response.center) {
        setFeedback({ error: errorMessage(response.error) });
        return;
      }
      const center = response.center;
      setResult((current) => ({
        revision,
        centers: [...(current?.centers ?? []).filter((item) => item.id !== center.id), center].sort((left, right) => left.name.localeCompare(right.name, "en")),
      }));
      const nextDraft = toDraft(center);
      setDraft(nextDraft);
      setBaseline(JSON.stringify(nextDraft));
      setFeedback({ success: center.active ? "Location saved. It is now visible in the public service center directory." : "Location saved as inactive. It is hidden from the public service center directory." });
    } catch {
      setFeedback({ error: errorMessage() });
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  async function deleteLocation() {
    if (!draft?.id || saving.current || loading || result?.error) return;
    const id = draft.id;
    const name = centers.find(center => center.id === id)?.name ?? draft.name;
    const message = `Permanently delete "${name}"? It will be removed from the admin list and public directory. This cannot be undone.${dirty ? " Unsaved changes to this location will also be discarded." : ""}`;
    if (!window.confirm(message)) return;
    saving.current = true;
    setBusy(true);
    setDeleting(true);
    resetImport();
    setFeedback(undefined);
    try {
      const response = await deleteServiceCenterAction(id);
      if (response.error || response.deletedId !== id) {
        setFeedback({ error: errorMessage(response.error) });
        return;
      }
      setResult(current => ({ revision, centers: (current?.centers ?? []).filter(center => center.id !== id) }));
      setDraft(undefined);
      setBaseline("");
      setFeedback({ success: `"${name}" has been deleted from the service center directory.` });
      requestAnimationFrame(() => addButton.current?.focus());
    } catch {
      setFeedback({ error: "Deletion could not be confirmed. Your draft is preserved. Refresh the location list before retrying." });
    } finally {
      saving.current = false;
      setBusy(false);
      setDeleting(false);
    }
  }

  const latitude = Number(draft?.latitude);
  const longitude = Number(draft?.longitude);
  const hasCoordinates = Boolean(draft?.latitude.trim() && draft.longitude.trim()) && Number.isFinite(latitude) && Number.isFinite(longitude) && latitude >= -11.1 && latitude <= 6.2 && longitude >= 94.9 && longitude <= 141.1;
  const previewCenters: ServiceCenter[] = draft && hasCoordinates ? [{ ...draft, id: draft.id ?? "draft-location", name: draft.name || "Location preview", latitude, longitude }] : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-[#172b4d]">Service centers</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Manage Gascomp service locations across all 38 Indonesian provinces. Select Save location to publish your changes. Inactive locations stay available here for future updates.</p>
        </div>
        <button ref={addButton} type="button" disabled={busy || loading || Boolean(result?.error)} className={primaryButton} onClick={() => openDraft()}><Plus aria-hidden="true" className="size-4" /> Add location</button>
      </div>

      {!draft && feedback?.success && <p role="status" className="rounded-xl bg-green-50 p-4 text-sm leading-6 text-green-800">{feedback.success}</p>}
      <div className="grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <section aria-label="Service center locations" className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
          <label className="block text-sm font-bold text-slate-700">
            Search locations
            <span className="relative mt-1 block"><Search aria-hidden="true" className="absolute left-3 top-3.5 size-4 text-slate-500" /><input type="search" value={search} maxLength={200} onChange={(event) => setSearch(event.target.value)} placeholder="Name, city, province, or address" className={`${input} mt-0 pl-10`} /></span>
          </label>
          <div aria-live="polite" aria-busy={loading} className="mt-5">
            {loading ? <p className="flex items-center gap-2 py-10 text-sm text-slate-600"><LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> Loading locations...</p> : result?.error ? <div role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800"><p>{errorMessage(result.error)}</p><button type="button" disabled={busy} className={`${button} mt-3`} onClick={() => setRevision((current) => current + 1)}>Retry</button></div> : !visibleCenters.length ? <div className="py-12 text-center"><MapPin aria-hidden="true" className="mx-auto size-9 text-slate-400" /><h3 className="mt-3 font-bold">{query ? "No matching locations" : "No service centers yet"}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{query ? "Try another name, city, or province." : "Add your first official location to help customers find service nearby."}</p>{query && <button type="button" className={`${button} mt-4`} onClick={() => setSearch("")}>Clear search</button>}</div> : <ul className="max-h-[44rem] space-y-2 overflow-y-auto p-1">{visibleCenters.map((center) => <li key={center.id}><button type="button" disabled={busy} aria-pressed={draft?.id === center.id} onClick={() => openDraft(center)} className={`w-full min-w-0 rounded-xl border p-4 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0035b9] ${draft?.id === center.id ? "border-blue-200 bg-blue-50" : "border-slate-100 hover:bg-slate-50"}`}><span className="flex flex-wrap items-start justify-between gap-2"><span className="min-w-0 break-words text-sm font-bold text-[#172b4d]">{center.name}</span><span className={`rounded-full px-2 py-1 text-xs font-bold ${center.active ? "bg-green-50 text-green-800" : "bg-slate-100 text-slate-600"}`}>{center.active ? "Active" : "Inactive"}</span></span><span className="mt-2 block break-words text-xs leading-5 text-slate-600">{center.city} · {INDONESIA_PROVINCES.find((province) => province.code === center.provinceCode)?.nameEn}</span><span className="mt-2 block text-xs font-bold text-[#0035b9]">Edit location</span></button></li>)}</ul>}
          </div>
          {!loading && !result?.error && <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4"><p className="text-xs text-slate-600">{visibleCenters.length} of {centers.length} locations</p><button type="button" disabled={busy} className={button} onClick={() => setRevision((current) => current + 1)}>Refresh list</button></div>}
        </section>

        {draft ? <section aria-label="Location editor" className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
          <div className="flex items-start justify-between gap-3"><div><h3 ref={heading} tabIndex={-1} className="text-lg font-extrabold text-[#172b4d] outline-none">{draft.id ? "Edit location" : "Add location"}</h3><p className="mt-2 text-xs text-slate-500">{dirty ? "Unsaved changes" : "Fields marked * are required."}</p></div><button type="button" disabled={busy} aria-label="Close location editor" className={`${button} px-3`} onClick={() => { if (!canLeaveDraft()) return; resetImport(); setDraft(undefined); setFeedback(undefined); addButton.current?.focus(); }}><X aria-hidden="true" className="size-4" /></button></div>
          {feedback?.error && <p ref={errorNotice} tabIndex={-1} role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm leading-6 text-red-800">{feedback.error}</p>}
          {feedback?.success && <p role="status" className="mt-4 rounded-xl bg-green-50 p-3 text-sm leading-6 text-green-800">{feedback.success}</p>}
          <form className="mt-5" onSubmit={(event) => { event.preventDefault(); startTransition(() => saveLocation()); }}>
            <fieldset disabled={busy} className="min-w-0 space-y-4">
              <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
                <label htmlFor="service-center-maps-link" className="block text-sm font-bold text-slate-700">Google Maps link (optional)</label>
                <input id="service-center-maps-link" type="url" maxLength={2048} value={draft.mapsUrl}
                  onChange={(event) => updateDraft("mapsUrl", event.target.value)}
                  onPaste={(event) => {
                    const value = event.clipboardData.getData("text").trim();
                    event.preventDefault();
                    updateDraft("mapsUrl", value.slice(0, 2048));
                    if (value.length <= 2048) void readMapsLink(value);
                    else setImportFeedback({ error: "This link is too long. Copy a shorter Google Maps Share link." });
                  }}
                  onBlur={() => { if (draft.mapsUrl.trim() && draft.mapsUrl.trim() !== lastImportUrl.current) void readMapsLink(draft.mapsUrl); }}
                  placeholder="https://maps.app.goo.gl/..." aria-describedby="service-center-maps-help" className={input} />
                <p id="service-center-maps-help" className="mt-2 text-xs leading-5 text-slate-600">Paste a Google Maps Share link to fill available details automatically. Existing fields stay unchanged. Check the name, address, and pin before saving; confirm WhatsApp separately.</p>
                <button type="button" disabled={busy || importing || !draft.mapsUrl.trim()} onClick={() => void readMapsLink(draft.mapsUrl)} className={`${button} mt-3 bg-white`}>
                  {importing && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}{importing ? "Reading Google Maps..." : "Read Google Maps link"}
                </button>
                {importing && <p role="status" className="mt-3 text-sm text-blue-800">Reading place details. You can keep editing while this loads.</p>}
                {importFeedback?.error && <p role="alert" className="mt-3 text-sm leading-6 text-red-800">{importFeedback.error}</p>}
                {importFeedback?.message && <p role="status" className="mt-3 text-sm leading-6 text-slate-700">{importFeedback.message}</p>}
                {importedData && <button type="button" className={`${button} mt-3 bg-white`} onClick={() => {
                  if (!window.confirm("Replace the matching form fields with the details read from Google Maps? Changes are not saved yet.")) return;
                  setDraft((current) => current ? mergeImported(current, importedData, true) : current);
                  setImportFeedback({ message: "Imported fields replaced. Review all details, then select Save location." });
                }}>Replace matching fields</button>}
              </div>

              <label className="block text-sm font-bold text-slate-700">Service center name *<input required maxLength={150} value={draft.name} onChange={(event) => updateDraft("name", event.target.value)} className={input} /></label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block min-w-0 text-sm font-bold text-slate-700">Province *<select required value={draft.provinceCode} onChange={(event) => updateDraft("provinceCode", event.target.value)} className={input}><option value="">Select a province</option>{INDONESIA_PROVINCES.map((province) => <option key={province.code} value={province.code}>{province.nameEn}</option>)}</select></label>
                <label className="block min-w-0 text-sm font-bold text-slate-700">City / regency *<input required maxLength={120} value={draft.city} onChange={(event) => updateDraft("city", event.target.value)} className={input} /></label>
              </div>
              <label className="block text-sm font-bold text-slate-700">Full address *<textarea required maxLength={1000} rows={3} value={draft.address} onChange={(event) => updateDraft("address", event.target.value)} className={`${input} py-3`} /></label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block min-w-0 text-sm font-bold text-slate-700">Phone (optional)<input type="tel" maxLength={30} value={draft.phone} onChange={(event) => updateDraft("phone", event.target.value)} className={input} /></label>
                <label className="block min-w-0 text-sm font-bold text-slate-700">WhatsApp (optional)<input type="tel" maxLength={30} value={draft.whatsapp} onChange={(event) => updateDraft("whatsapp", event.target.value)} placeholder="+62..." className={input} /></label>
              </div>
              <label className="block text-sm font-bold text-slate-700">Opening hours (optional)<textarea maxLength={300} rows={2} value={draft.hours} onChange={(event) => updateDraft("hours", event.target.value)} className={`${input} py-3`} /></label>
              <div className="space-y-3">
                <div><h4 className="text-sm font-bold text-slate-700">Map location *</h4><p id="service-center-coordinates-help" className="mt-1 text-xs leading-5 text-slate-500">Click the map to place the pin, or enter latitude and longitude below. Confirm the pin matches the address in Indonesia before saving.</p></div>
                <div className={`isolate overflow-hidden rounded-xl border border-slate-200 ${busy ? "pointer-events-none opacity-60" : ""}`} aria-busy={busy}>
                  <ServiceCenterMap centers={previewCenters} selectedId={previewCenters[0]?.id} onSelect={() => {}} language="en" onLocationPick={busy ? undefined : (lat, lng) => { if (saving.current) return; setDraft((current) => current ? { ...current, latitude: lat.toFixed(6), longitude: lng.toFixed(6) } : current); setFeedback(undefined); }} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block min-w-0 text-sm font-bold text-slate-700">Latitude *<input type="number" required step="any" min={-11.1} max={6.2} aria-describedby="service-center-coordinates-help" value={draft.latitude} onChange={(event) => updateDraft("latitude", event.target.value)} className={input} /></label>
                  <label className="block min-w-0 text-sm font-bold text-slate-700">Longitude *<input type="number" required step="any" min={94.9} max={141.1} aria-describedby="service-center-coordinates-help" value={draft.longitude} onChange={(event) => updateDraft("longitude", event.target.value)} className={input} /></label>
                </div>
              </div>
              <label className="flex min-h-11 items-start gap-3 rounded-xl bg-slate-50 p-4"><input type="checkbox" checked={draft.active} onChange={(event) => updateDraft("active", event.target.checked)} className="mt-0.5 size-4 accent-[#0035b9]" /><span className="text-sm font-bold text-slate-700">Active location<span className="mt-1 block text-xs font-normal leading-5 text-slate-600">Visible to customers after saving. Uncheck and save to hide this location.</span></span></label>
              <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4"><button type="submit" disabled={busy || importing || loading || Boolean(result?.error)} className={primaryButton}>{busy && !deleting ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <Save aria-hidden="true" className="size-4" />}{busy && !deleting ? "Saving..." : "Save location"}</button>{dirty && <button type="button" className={button} onClick={() => { if (!canLeaveDraft()) return; resetImport(); setDraft(JSON.parse(baseline) as Draft); setFeedback(undefined); }}>Discard changes</button>}{draft.id && <button type="button" disabled={busy || loading || Boolean(result?.error)} className={`${button} border-red-200 text-red-700 hover:bg-red-50 sm:ml-auto`} onClick={() => startTransition(() => deleteLocation())}>{deleting ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <Trash2 aria-hidden="true" className="size-4" />}{deleting ? "Deleting..." : "Delete location"}</button>}</div>
            </fieldset>
          </form>
        </section> : <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center"><MapPin aria-hidden="true" className="mx-auto size-9 text-slate-400" /><h3 className="mt-3 font-bold text-[#172b4d]">Manage a service location</h3><p className="mt-2 text-sm leading-6 text-slate-600">Choose a location to update its details, or add a new service center.</p></section>}
      </div>
    </div>
  );
}
