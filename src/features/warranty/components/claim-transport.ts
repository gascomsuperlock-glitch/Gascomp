import type { WarrantyClaimState } from "../server/claim-actions";

export type ClaimProgress = { phase: "uploading" | "processing"; percent: number };
export const CLAIM_CONNECTION_ERROR = "The connection was interrupted before confirmation arrived. Your details and files are still here. Contact support to check whether your claim was received before trying again.";
export const CLAIM_TIMEOUT_ERROR = "Confirmation is taking too long. Your details and files are still here. Contact support to check whether your claim was received before trying again.";

// Upload progress measures transport only; 100% is not a saved-ticket confirmation.
export function submitClaim(formData: FormData, onProgress: (progress: ClaimProgress) => void): Promise<WarrantyClaimState> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    let settled = false;
    let timer: ReturnType<typeof setTimeout>;
    const finish = (result: WarrantyClaimState) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(result);
    };
    const expire = () => {
      finish({ error: CLAIM_TIMEOUT_ERROR });
      xhr.abort();
    };
    const watch = (ms: number) => { clearTimeout(timer); timer = setTimeout(expire, ms); };
    xhr.open("POST", "/warranty/claims");
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
      if (result && typeof result === "object" && ((xhr.status >= 200 && xhr.status < 300 && result.success === true && typeof result.ticketId === "string") || typeof result.error === "string")) finish(result);
      else finish({ error: CLAIM_CONNECTION_ERROR });
    };
    xhr.onerror = () => finish({ error: CLAIM_CONNECTION_ERROR });
    xhr.ontimeout = expire;
    xhr.onabort = () => finish({ error: CLAIM_CONNECTION_ERROR });
    onProgress({ phase: "uploading", percent: 0 });
    watch(45_000);
    try { xhr.send(formData); } catch { finish({ error: CLAIM_CONNECTION_ERROR }); }
  });
}
