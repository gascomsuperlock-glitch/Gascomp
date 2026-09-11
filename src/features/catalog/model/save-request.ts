import type { SiteContent } from "./types";

export type SaveResult = { success: true; content: SiteContent } | { success: false; error: string };

export async function requestContentSave(content: SiteContent, send: typeof fetch = fetch): Promise<SaveResult> {
  let response: Response;
  try {
    response = await send("/admin/content", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(content),
      redirect: "error",
    });
  } catch {
    return { success: false, error: "The save response was interrupted. Your edits are still in this tab. Check your connection and retry Save; the previous request may have reached the server." };
  }

  const errors: Record<number, string> = {
    401: "Your admin session has expired. Sign in again in another tab, then retry Save here to keep your edits.",
    403: "The server rejected the save request origin. Open the admin panel on the configured production domain.",
    404: "The save endpoint is unavailable. Deploy the latest application on the hosting server, then retry Save.",
    413: "The upload exceeds the server size limit. Reduce the selected images and retry Save.",
    502: "The hosting server is unavailable (HTTP 502). Your edits are still in this tab. Retry when the server recovers.",
    503: "The hosting server is unavailable (HTTP 503). Your edits are still in this tab. Retry when the server recovers.",
    504: "The hosting server timed out (HTTP 504). The save may still be processing. Keep this tab open and check the product in another tab before retrying.",
  };
  if (errors[response.status]) return { success: false, error: errors[response.status] };

  if (response.headers.get("content-type")?.includes("application/json")) {
    try {
      const result = await response.json();
      if (response.ok && result?.success === true && Array.isArray(result.content?.products)) return result;
      if (result?.success === false && typeof result.error === "string") return result;
    } catch {
      // A proxy can truncate a response after the server has saved the content.
    }
  }
  return { success: false, error: `The server returned an invalid save response (HTTP ${response.status}). Keep this tab open and check the hosting logs before retrying.` };
}
