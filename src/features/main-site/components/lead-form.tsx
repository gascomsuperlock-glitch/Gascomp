"use client";
import Script from "next/script";
import { useRef, useState } from "react";

type Turnstile = {
  render: (element: HTMLElement, options: Record<string, unknown>) => string;
  reset: (id: string) => void;
};
export function LeadForm({
  kind,
  language,
  siteKey,
}: {
  kind: "contact" | "reseller";
  language: "id" | "en";
  siteKey: string;
}) {
  const id = language === "id";
  const container = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  const submissionId = useRef<string | null>(null);
  const [token, setToken] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "success" | "error">(
    "idle",
  );
  const api = () => (window as unknown as { turnstile?: Turnstile }).turnstile;
  function mount() {
    if (!container.current || widget.current !== null || !api()) return;
    widget.current = api()!.render(container.current, {
      sitekey: siteKey,
      action: "main-site-lead",
      language,
      callback: (value: string) => setToken(value),
      "expired-callback": () => setToken(""),
      "error-callback": () => {
        setToken("");
        setState("error");
      },
    });
  }
  if (!siteKey)
    return (
      <p role="status" className="main-form-error">
        {id
          ? "Formulir sementara tidak tersedia. Silakan hubungi tim melalui Pusat Bantuan."
          : "The form is temporarily unavailable. Please contact the team through the Help Center."}{" "}
        <a href="https://support.gascompsuperlock.com/">
          {id ? "Buka Pusat Bantuan" : "Open Help Center"}
        </a>
      </p>
    );
  return (
    <form
      className="main-lead-form"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!token || state === "sending") return;
        const form = event.currentTarget;
        const data = new FormData(form);
        submissionId.current ??= crypto.randomUUID();
        setState("sending");
        try {
          const response = await fetch("/api/main-site/leads", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: AbortSignal.timeout(20_000),
            body: JSON.stringify({
              id: submissionId.current,
              kind,
              name: data.get("name"),
              email: data.get("email"),
              phone: data.get("phone"),
              message: data.get("message"),
              consent: data.get("consent") === "on",
              token,
            }),
          });
          if (!response.ok) throw new Error("Submission failed");
          setState("success");
          form.reset();
          submissionId.current = null;
        } catch {
          setState("error");
        } finally {
          setToken("");
          if (widget.current !== null) api()?.reset(widget.current);
        }
      }}
    >
      <label>
        {id ? "Nama" : "Name"}
        <input
          name="name"
          autoComplete="name"
          required
          minLength={2}
          maxLength={120}
        />
      </label>
      <label>
        Email
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
        />
      </label>
      <label>
        {id ? "Nomor Telepon" : "Phone Number"}
        <input
          name="phone"
          type="tel"
          autoComplete="tel"
          required
          minLength={7}
          maxLength={30}
        />
      </label>
      <label>
        {id ? "Pesan" : "Message"}
        <textarea name="message" required minLength={10} maxLength={4000} />
      </label>
      <label>
        <span>
          <input name="consent" type="checkbox" required />{" "}
          {id
            ? "Saya setuju data ini digunakan untuk menindaklanjuti permintaan saya."
            : "I agree that these details may be used to follow up on my request."}
        </span>
      </label>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        onReady={mount}
        onError={() => setState("error")}
      />
      <div ref={container} />
      <button className="main-button" disabled={!token || state === "sending"}>
        {state === "sending"
          ? id
            ? "Mengirim…"
            : "Sending…"
          : id
            ? "Kirim Pesan"
            : "Send Message"}
      </button>
      {state === "success" && (
        <p role="status" className="main-form-success">
          {id
            ? "Pesan Anda sudah tersimpan. Tim kami akan menindaklanjutinya."
            : "Your message has been saved. Our team will follow up."}
        </p>
      )}
      {state === "error" && (
        <p role="alert" className="main-form-error">
          {id
            ? "Pesan belum berhasil dikirim. Periksa koneksi, selesaikan verifikasi, lalu coba lagi."
            : "Your message could not be sent. Check your connection, complete verification, and try again."}
        </p>
      )}
    </form>
  );
}
