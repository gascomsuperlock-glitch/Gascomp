import Link from "next/link";
import type { MainSiteSnapshot } from "../model/types";
import { SafeContent } from "./safe-content";
import "./preview.css";

export function MainSitePreview({
  snapshot,
  selected,
  language,
  failed = false,
}: {
  snapshot: MainSiteSnapshot | null;
  selected?: string;
  language: "id" | "en";
  failed?: boolean;
}) {
  const id = language === "id";
  const record =
    snapshot?.records.find((item) => `${item.kind}-${item.id}` === selected) ??
    (selected
      ? undefined
      : (snapshot?.records.find((item) => item.path === "/") ??
        snapshot?.records[0]));
  const paths = new Map(
    snapshot?.records.map((item) => [
      `${snapshot.source}${item.path}`,
      `/admin/main-site?record=${item.kind}-${item.id}`,
    ]),
  );
  const title = id ? "Migrasi situs utama" : "Main site migration";
  return (
    <main className="migration-preview">
      <header className="migration-header">
        <div>
          <p>GASCOMP SUPERLOCK</p>
          <h1>{title}</h1>
        </div>
        <Link href="/admin">{id ? "Kembali ke admin" : "Back to admin"}</Link>
      </header>
      <p>
        <Link href="/admin/main-site/inbox">
          {id ? "Pesan kontak dan reseller" : "Contact and reseller messages"}
        </Link>
      </p>
      <p className="migration-notice">
        {id
          ? "Pratinjau privat. Konten sumber belum disetujui; formulir lama dinonaktifkan. Gambar masih berasal dari WordPress."
          : "Private preview. Source content is not approved; legacy forms are disabled. Images still come from WordPress."}
      </p>
      {!snapshot ? (
        <section role={failed ? "alert" : "status"}>
          <h2>
            {failed
              ? id
                ? "Snapshot tidak dapat dibaca"
                : "Snapshot could not be read"
              : id
                ? "Belum ada snapshot"
                : "No snapshot yet"}
          </h2>
          <p>
            {id
              ? "Jalankan ekspor publik lokal sebelum meninjau migrasi."
              : "Run the local public export before reviewing the migration."}
          </p>
        </section>
      ) : (
        <>
          <p>
            {snapshot.records.length} {id ? "konten sumber" : "source records"}{" "}
            ·{" "}
            {snapshot.records.reduce((sum, item) => sum + item.forms.length, 0)}{" "}
            {id
              ? "formulir perlu implementasi ulang"
              : "forms need reimplementation"}
          </p>
          <div className="migration-grid">
            <aside>
              <nav aria-label={id ? "Konten sumber" : "Source content"}>
                {(["page", "product", "post"] as const).map((kind) => (
                  <details key={kind} open={kind === "page"}>
                    <summary>
                      {kind} (
                      {
                        snapshot.records.filter((item) => item.kind === kind)
                          .length
                      }
                      )
                    </summary>
                    <ul>
                      {snapshot.records
                        .filter((item) => item.kind === kind)
                        .map((item) => (
                          <li key={`${kind}-${item.id}`}>
                            <Link
                              href={`/admin/main-site?record=${kind}-${item.id}`}
                              aria-current={
                                record === item ? "page" : undefined
                              }
                            >
                              {item.title || item.path}
                            </Link>
                          </li>
                        ))}
                    </ul>
                  </details>
                ))}
              </nav>
            </aside>
            <article>
              {record ? (
                <>
                  <p className="migration-path">{record.path}</p>
                  <h2>{record.title}</h2>
                  {record.forms.length > 0 && (
                    <p className="migration-notice">
                      {id
                        ? "Halaman ini memuat formulir lama. Pengiriman belum tersedia dalam pratinjau."
                        : "This page contains legacy forms. Submission is not available in this preview."}
                    </p>
                  )}
                  <SafeContent
                    nodes={[
                      ...record.images.map((image) => ({
                        tag: "img",
                        ...image,
                      })),
                      ...record.nodes,
                    ]}
                    paths={paths}
                  />
                </>
              ) : (
                <p role="status">
                  {id ? "Konten tidak ditemukan." : "Content not found."}
                </p>
              )}
            </article>
          </div>
        </>
      )}
    </main>
  );
}
