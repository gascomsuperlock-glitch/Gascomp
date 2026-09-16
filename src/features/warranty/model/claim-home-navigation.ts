const CLAIM_BACK_ENTRY = "gascompWarrantyBackEntry";
const CLAIM_PATH = "/klaim-garansi";

type ClaimWindow = Pick<Window, "history" | "location" | "addEventListener" | "removeEventListener">;

export function installClaimHomeNavigation(browser: ClaimWindow): () => void {
  if (browser.location.pathname !== CLAIM_PATH) return () => {};

  // Keep the original claim entry underneath a same-URL entry. Back reaches
  // that original entry, which is replaced with home without revisiting /dll/.
  // Preserve framework history state and avoid stacking entries on remount.
  if (!browser.history.state?.[CLAIM_BACK_ENTRY]) {
    browser.history.pushState({ ...browser.history.state, [CLAIM_BACK_ENTRY]: true }, "", browser.location.href);
  }

  let leaving = false;
  function onBack(event: PopStateEvent) {
    if (leaving || browser.location.pathname !== CLAIM_PATH || event.state?.[CLAIM_BACK_ENTRY]) return;
    leaving = true;
    browser.location.replace("/");
  }
  browser.addEventListener("popstate", onBack);
  return () => browser.removeEventListener("popstate", onBack);
}

export function returnHomeFromClaim(browser: ClaimWindow): boolean {
  if (browser.location.pathname !== CLAIM_PATH || !browser.history.state?.[CLAIM_BACK_ENTRY]) return false;
  // Reuse the browser-Back path so the visible link consumes the extra entry.
  browser.history.back();
  return true;
}
