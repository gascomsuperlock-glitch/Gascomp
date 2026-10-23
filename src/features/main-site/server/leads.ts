import "server-only";
import { createAdminSupabaseClient } from "@/shared/integrations/supabase/server";
import { getAdminSession } from "@/features/auth/server/session";
import { validateLead } from "../model/lead.mjs";
import { mainSiteEnabled, publicSiteOrigin } from "./release";

const json = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
export async function submitLead(request: Request) {
  if (!mainSiteEnabled()) return json({ error: "Unavailable" }, 404);
  const secret = process.env.GASCOMP_TURNSTILE_SECRET_KEY;
  const client = createAdminSupabaseClient((input, init) =>
    fetch(input, { ...init, signal: AbortSignal.timeout(10_000) }),
  );
  if (!secret || !client) return json({ error: "Service unavailable" }, 503);
  if (
    request.headers.get("origin") !== publicSiteOrigin() ||
    request.headers.get("sec-fetch-site") === "cross-site"
  )
    return json({ error: "Invalid origin" }, 403);
  if (
    !request.headers.get("content-type")?.startsWith("application/json") ||
    !request.body
  )
    return json({ error: "Invalid request" }, 415);
  const reader = request.body.getReader();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let body;
  try {
    const deadline = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("Timeout")), 10_000);
    });
    const chunks = [];
    let size = 0;
    while (true) {
      const part = await Promise.race([reader.read(), deadline]);
      if (part.done) break;
      if ((size += part.value.byteLength) > 24_000) {
        void reader.cancel().catch(() => {});
        return json({ error: "Request too large" }, 413);
      }
      chunks.push(part.value);
    }
    body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    void reader.cancel().catch(() => {});
    return json({ error: "Invalid request" }, 400);
  } finally {
    clearTimeout(timer);
    reader.releaseLock();
  }
  let lead;
  try {
    lead = validateLead(body);
  } catch {
    return json({ error: "Check form fields" }, 400);
  }
  if (
    typeof body.token !== "string" ||
    body.token.length < 1 ||
    body.token.length > 2048
  )
    return json({ error: "Verification required" }, 400);
  try {
    const verification = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        redirect: "error",
        signal: AbortSignal.timeout(8_000),
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret, response: body.token }),
      },
    );
    if (!verification.ok)
      return json({ error: "Verification unavailable" }, 503);
    const result = await verification.json();
    if (
      result.success !== true ||
      result.hostname !== new URL(publicSiteOrigin()).hostname ||
      result.action !== "main-site-lead"
    )
      return json({ error: "Verification failed" }, 403);
    const saved = await client.rpc("submit_main_site_lead", {
      p_id: lead.id,
      p_kind: lead.kind,
      p_name: lead.name,
      p_email: lead.email,
      p_phone: lead.phone,
      p_message: lead.message,
    });
    if (saved.error)
      return json(
        {
          error:
            saved.error.code === "P0001"
              ? "Submission limit reached"
              : "Submission could not be saved",
        },
        saved.error.code === "P0001" ? 429 : 503,
      );
    return json({ id: saved.data }, 201);
  } catch {
    return json({ error: "Service unavailable" }, 503);
  }
}

export async function listLeads(request: Request) {
  if (!(await getAdminSession())) return json({ error: "Unauthorized" }, 401);
  const client = createAdminSupabaseClient((input, init) =>
    fetch(input, { ...init, signal: AbortSignal.timeout(10_000) }),
  );
  if (!client) return json({ error: "Service unavailable" }, 503);
  const value = new URL(request.url).searchParams.get("page") || "1";
  const page = /^\d{1,5}$/.test(value) ? Math.max(1, Number(value)) : 1;
  try {
    const { data, error } = await client
      .from("main_site_leads")
      .select("id,kind,name,email,phone,message,status,created_at")
      .order("created_at", { ascending: false })
      .range((page - 1) * 50, page * 50 - 1);
    return error
      ? json({ error: "Service unavailable" }, 503)
      : json({ leads: data });
  } catch {
    return json({ error: "Service unavailable" }, 503);
  }
}

export async function updateLead(request: Request) {
  if (!(await getAdminSession())) return json({ error: "Unauthorized" }, 401);
  const origin = request.headers.get("origin");
  try {
    const url = new URL(origin || "");
    if (
      !["https:", "http:"].includes(url.protocol) ||
      url.origin !== origin ||
      url.host !== (request.headers.get("host") || new URL(request.url).host)
    )
      return json({ error: "Invalid origin" }, 403);
  } catch {
    return json({ error: "Invalid origin" }, 403);
  }
  if (
    !request.body ||
    !request.headers.get("content-type")?.startsWith("application/json")
  )
    return json({ error: "Invalid request" }, 400);
  const reader = request.body.getReader();
  const chunks = [];
  let size = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const deadline = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("Timeout")), 5000);
    });
    while (true) {
      const part = await Promise.race([reader.read(), deadline]);
      if (part.done) break;
      if ((size += part.value.byteLength) > 512) {
        void reader.cancel().catch(() => {});
        return json({ error: "Request too large" }, 413);
      }
      chunks.push(part.value);
    }
    const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (
      !/^[a-f0-9-]{36}$/i.test(body.id || "") ||
      !["new", "in_progress", "resolved"].includes(body.status)
    )
      return json({ error: "Invalid status" }, 400);
    const client = createAdminSupabaseClient((input, init) =>
      fetch(input, { ...init, signal: AbortSignal.timeout(10_000) }),
    );
    if (!client) return json({ error: "Service unavailable" }, 503);
    const { data, error } = await client
      .from("main_site_leads")
      .update({ status: body.status })
      .eq("id", body.id)
      .select("id")
      .maybeSingle();
    return error
      ? json({ error: "Update failed" }, 503)
      : data
        ? json({ id: data.id })
        : json({ error: "Not found" }, 404);
  } catch {
    void reader.cancel().catch(() => {});
    return json({ error: "Update failed" }, 503);
  } finally {
    clearTimeout(timer);
    reader.releaseLock();
  }
}
