export type ReportResult = { success?: boolean; reportId?: string; error?: string; fieldErrors?: Record<string, string> };
export type ReportProgress = { phase: "uploading" | "processing"; percent: number };
export const REPORT_CONNECTION_ERROR = "Report confirmation was interrupted. Your details and video are still available. Please try again.";
export const REPORT_TIMEOUT_ERROR = "Report confirmation timed out. Your details and video are still available. Please try again.";

export function submitReport(data: FormData, onProgress: (value: ReportProgress) => void, signal: AbortSignal): Promise<ReportResult> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    let settled = false;
    let timer: ReturnType<typeof setTimeout>;
    const finish = (result: ReportResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal.removeEventListener("abort", cancel);
      resolve(result);
    };
    const cancel = () => { finish({ error: REPORT_CONNECTION_ERROR }); xhr.abort(); };
    const expire = () => { finish({ error: REPORT_TIMEOUT_ERROR }); xhr.abort(); };
    const watch = (ms: number) => { clearTimeout(timer); timer = setTimeout(expire, ms); };
    if (signal.aborted) { finish({ error: REPORT_CONNECTION_ERROR }); return; }
    signal.addEventListener("abort", cancel, { once: true });
    xhr.open("POST", "/care-direct/reports");
    xhr.timeout = 10 * 60_000;
    xhr.responseType = "json";
    xhr.upload.onprogress = (event) => {
      if (settled) return;
      watch(45_000);
      onProgress({ phase: "uploading", percent: event.lengthComputable ? Math.min(100, Math.round(event.loaded / event.total * 100)) : 0 });
    };
    xhr.upload.onload = () => {
      if (settled) return;
      watch(105_000);
      onProgress({ phase: "processing", percent: 100 });
    };
    xhr.onload = () => {
      const result = xhr.response;
      if (result && typeof result === "object" && ((xhr.status >= 200 && xhr.status < 300 && result.success === true && typeof result.reportId === "string" && result.reportId.length > 0) || typeof result.error === "string")) finish(result);
      else finish({ error: REPORT_CONNECTION_ERROR });
    };
    xhr.onerror = () => finish({ error: REPORT_CONNECTION_ERROR });
    xhr.ontimeout = expire;
    xhr.onabort = () => finish({ error: REPORT_CONNECTION_ERROR });
    onProgress({ phase: "uploading", percent: 0 });
    watch(45_000);
    try { xhr.send(data); } catch { finish({ error: REPORT_CONNECTION_ERROR }); }
  });
}
