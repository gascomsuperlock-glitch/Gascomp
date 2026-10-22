// Client-side decoding/encoding can exhaust a mobile renderer's memory. A
// worker timeout cannot recover a crashed tab; let the server verify originals.
export function shouldDeferVideoProcessing(): boolean {
  if (typeof navigator === "undefined") return false;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
    || (typeof memory === "number" && memory <= 4)
    || (navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 4);
}
