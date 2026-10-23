"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/shared/i18n/language-context";
type Lead = {
  id: string;
  kind: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  status: string;
  created_at: string;
};
export function LeadsAdmin() {
  const { language } = useLanguage();
  const id = language === "id";
  const [leads, setLeads] = useState<Lead[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/admin/main-site/leads?page=${page}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Load failed");
        const data = await response.json();
        setLeads(data.leads);
        setError(false);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [page]);
  const move = (next: number) => {
    setLoading(true);
    setPage(next);
  };
  return (
    <main className="max-w-5xl mx-auto p-5">
      <Link href="/admin/main-site" className="underline">
        {id ? "Kembali ke migrasi" : "Back to migration"}
      </Link>
      <h1 className="text-3xl font-bold my-6">
        {id ? "Pesan situs utama" : "Main site messages"}
      </h1>
      {loading ? (
        <p role="status">{id ? "Memuat…" : "Loading…"}</p>
      ) : error ? (
        <p role="alert">
          {id
            ? "Pesan tidak dapat dimuat. Periksa sesi dan koneksi database."
            : "Messages could not be loaded. Check your session and database connection."}
        </p>
      ) : !leads.length ? (
        <p>{id ? "Belum ada pesan." : "No messages yet."}</p>
      ) : (
        <div className="space-y-5">
          {leads.map((lead) => (
            <article
              key={lead.id}
              className="border rounded-xl p-5 break-words"
            >
              <p className="text-xs text-slate-500">
                {lead.kind} ·{" "}
                {new Date(lead.created_at).toLocaleString(language)}
              </p>
              <h2 className="font-bold text-lg">{lead.name}</h2>
              <p>
                {lead.email} · {lead.phone}
              </p>
              <p className="whitespace-pre-wrap my-4">{lead.message}</p>
              <label>
                {id ? "Status" : "Status"}{" "}
                <select
                  className="border p-2 rounded"
                  value={lead.status}
                  disabled={saving !== null}
                  onChange={async (event) => {
                    const status = event.target.value;
                    setSaving(lead.id);
                    try {
                      const response = await fetch("/admin/main-site/leads", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ id: lead.id, status }),
                        signal: AbortSignal.timeout(15_000),
                      });
                      if (!response.ok) throw new Error("Update failed");
                      setLeads((current) =>
                        current.map((item) =>
                          item.id === lead.id ? { ...item, status } : item,
                        ),
                      );
                    } catch {
                      setError(true);
                    } finally {
                      setSaving(null);
                    }
                  }}
                >
                  <option value="new">{id ? "Baru" : "New"}</option>
                  <option value="in_progress">
                    {id ? "Diproses" : "In progress"}
                  </option>
                  <option value="resolved">
                    {id ? "Selesai" : "Resolved"}
                  </option>
                </select>
              </label>
            </article>
          ))}
        </div>
      )}
      <nav className="flex gap-6 my-6">
        <button disabled={loading || page === 1} onClick={() => move(page - 1)}>
          {id ? "Sebelumnya" : "Previous"}
        </button>
        <span>{page}</span>
        <button
          disabled={loading || leads.length < 50}
          onClick={() => move(page + 1)}
        >
          {id ? "Berikutnya" : "Next"}
        </button>
      </nav>
    </main>
  );
}
