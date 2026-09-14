"use client";

import { useContent } from "@/features/catalog/hooks/use-content";
import { dictionaries } from "@/shared/i18n/dictionaries";
import { useLanguage } from "@/shared/i18n/language-context";
import { getWhatsappUrl, normalizeWhatsapp } from "@/shared/lib/whatsapp";

export function FloatingWhatsappButton() {
  const { content } = useContent();
  const { language } = useLanguage();

  if (!normalizeWhatsapp(content.whatsappNumber)) return null;

  return (
    <a
      href={getWhatsappUrl(content.whatsappNumber, undefined, undefined, language)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={dictionaries[language].whatsapp.floatingLabel}
      className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-[calc(1rem+env(safe-area-inset-right))] z-[60] grid size-14 place-items-center rounded-full border border-white/70 bg-[#25d366] text-white shadow-[0_12px_30px_rgba(18,140,73,0.38)] transition duration-200 hover:scale-105 hover:bg-[#20bd5a] focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-[#128c49] active:scale-95 sm:bottom-6 sm:right-6 sm:size-16"
    >
      <svg
        viewBox="0 0 16 16"
        aria-hidden="true"
        className="size-8 fill-current sm:size-9"
      >
        <path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93a7.9 7.9 0 0 0-2.327-5.607M7.994 14.521a6.57 6.57 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.25a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.591-6.592 6.591m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.514.646-.63.775-.116.133-.232.148-.43.05-1.17-.578-1.94-1.033-2.713-2.349-.205-.353.205-.329.59-1.094.065-.133.033-.247-.017-.346-.05-.099-.445-1.072-.61-1.47-.161-.387-.323-.334-.445-.34-.116-.007-.247-.007-.379-.007a.73.73 0 0 0-.528.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.132 1.394 2.132 3.383 2.992.472.205.84.326 1.129.418.474.151.904.129 1.246.079.38-.058 1.171-.48 1.336-.943.164-.462.164-.858.116-.943-.05-.084-.182-.132-.38-.23" />
      </svg>
    </a>
  );
}
