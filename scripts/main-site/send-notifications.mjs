import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import { loadEnvFile } from "../shared/env.mjs";

export async function notifyLeads({
  client,
  transport,
  from,
  to,
  origin,
  send = false,
}) {
  if (!send) {
    const result = await client
      .from("main_site_leads")
      .select("id", { count: "exact", head: true })
      .is("notified_at", null);
    if (result.error) throw new Error("Notification queue unavailable");
    return { pending: result.count, sent: 0, dryRun: true };
  }
  const url = new URL(origin);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  )
    throw new Error("Invalid notification origin");
  for (const address of [from, to])
    if (
      typeof address !== "string" ||
      !/^[^\s@,<>]+@[^\s@,<>]+\.[^\s@,<>]+$/.test(address)
    )
      throw new Error("Invalid notification mailbox");
  const claim = randomUUID();
  const result = await client.rpc("claim_main_site_notifications", {
    p_claim: claim,
  });
  if (result.error) throw new Error("Notification queue unavailable");
  let sent = 0;
  for (const lead of result.data || []) {
    if (
      !/^[a-f0-9-]{36}$/i.test(lead.id) ||
      !["contact", "reseller"].includes(lead.kind)
    )
      throw new Error("Invalid notification record");
    // Send an admin link, never customer names, messages, phone numbers or attachments.
    const receipt = await transport.sendMail({
      from,
      to,
      subject: `Gascomp ${lead.kind} inquiry`,
      text: `A new inquiry is available in the private admin inbox.\n${url.origin}/admin/main-site/inbox\nReference: ${lead.id}`,
      messageId: `<${lead.id}@${url.hostname}>`,
      disableFileAccess: true,
      disableUrlAccess: true,
    });
    if (!receipt.accepted?.length)
      throw new Error("Notification was not accepted");
    const saved = await client
      .from("main_site_leads")
      .update({
        notified_at: new Date().toISOString(),
        notification_claim: null,
        notification_claimed_at: null,
      })
      .eq("id", lead.id)
      .eq("notification_claim", claim)
      .select("id");
    if (saved.error || saved.data?.length !== 1)
      throw new Error("Notification acknowledgement failed");
    sent++;
  }
  return { sent, dryRun: false };
}
async function main() {
  if (process.argv.slice(2).some((arg) => arg !== "--send"))
    throw new Error("Usage: send-notifications.mjs [--send]");
  loadEnvFile();
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Database configuration required");
  const send = process.argv.includes("--send");
  if (
    send &&
    (!process.env.GASCOMP_SMTP_HOST ||
      !process.env.GASCOMP_SMTP_USERNAME ||
      !process.env.GASCOMP_SMTP_PASSWORD)
  )
    throw new Error("SMTP configuration required");
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) =>
        fetch(input, { ...init, signal: AbortSignal.timeout(15_000) }),
    },
  });
  const transport = nodemailer.createTransport({
    host: process.env.GASCOMP_SMTP_HOST,
    port: 465,
    secure: true,
    auth: {
      user: process.env.GASCOMP_SMTP_USERNAME,
      pass: process.env.GASCOMP_SMTP_PASSWORD,
    },
    connectionTimeout: 10_000,
    socketTimeout: 20_000,
    tls: { minVersion: "TLSv1.2", rejectUnauthorized: true },
  });
  try {
    console.log(
      JSON.stringify(
        await notifyLeads({
          client,
          transport,
          send,
          from: process.env.GASCOMP_MAIN_SITE_NOTIFY_FROM,
          to: process.env.GASCOMP_MAIN_SITE_NOTIFY_TO,
          origin:
            process.env.GASCOMP_MAIN_SITE_ORIGIN ||
            "https://gascompsuperlock.com",
        }),
      ),
    );
  } finally {
    transport.close();
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main().catch(() => {
    console.error(
      "Notification processing failed. No customer data or credentials are logged. Check configuration and queue state.",
    );
    process.exitCode = 1;
  });
