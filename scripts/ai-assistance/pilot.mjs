import { createHash, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { root } from "../shared/paths.mjs";

const sleep = (milliseconds) => new Promise((done) => setTimeout(done, milliseconds));
const ensure = (condition, message) => { if (!condition) throw new Error(message); };

export function loopbackOrigin(value) {
  const url = new URL(value);
  ensure(["http:", "https:"].includes(url.protocol) && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname), "Pilot URLs must use loopback HTTP or HTTPS.");
  ensure(!url.username && !url.password && url.pathname === "/" && !url.search && !url.hash, "Pilot URLs must be origins without credentials or paths.");
  return url.origin;
}

export function configuration(args, env) {
  let run = false;
  let durationSeconds = 60;
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === "--run") run = true;
    else if (args[index] === "--duration-seconds") durationSeconds = Number(args[++index]);
    else throw new Error("Supported arguments: --run --duration-seconds NUMBER.");
  }
  ensure(Number.isInteger(durationSeconds) && durationSeconds >= 1 && durationSeconds <= 604800, "Duration must be an integer from 1 to 604800 seconds.");
  const site = loopbackOrigin(env.GASCOMP_AI_SITE_URL || "http://localhost:3100");
  const database = env.GASCOMP_AI_PILOT_DATABASE_URL ? loopbackOrigin(env.GASCOMP_AI_PILOT_DATABASE_URL) : null;
  if (run) {
    ensure(env.GASCOMP_AI_PILOT_ISOLATED === "true" && database, "Running requires GASCOMP_AI_PILOT_ISOLATED=true and a loopback GASCOMP_AI_PILOT_DATABASE_URL for an exclusive disposable database.");
    ensure((env.GASCOMP_AI_WORKER_TOKEN || "").length >= 32, "Running requires a worker token of at least 32 characters in the environment.");
  }
  return { run, durationSeconds, site, database, token: env.GASCOMP_AI_WORKER_TOKEN };
}

export function syntheticSnapshot(revision = 1) {
  const entries = ["en", "id"].flatMap((language) => [
    ...["greeting", "clarification", "handoff"].map((kind) => ({ answer: `Synthetic ${language} ${kind}.`, id: `pilot.${language}.${kind}`, kind, language, questions: [`Synthetic ${kind}`] })),
    { answer: `Synthetic ${language} answer revision ${revision}.\nExact source line.`, id: `pilot.${language}.answer`, kind: "answer", language, questions: ["Synthetic known question"] },
  ]).sort((a, b) => a.id.localeCompare(b.id));
  return { version: createHash("sha256").update(JSON.stringify(entries)).digest("hex"), entries };
}

export async function runPilot(config, { fetchImpl = fetch, output = () => {}, now = Date.now, wait = sleep } = {}) {
  const started = now();
  const metrics = { mode: "synthetic-transport-simulated-worker", requestedDurationSeconds: config.durationSeconds, elapsedSeconds: 0, passed: false, scenarios: {}, requests: 0, answers: 0, handoffs: 0, expiredResultsRejected: 0, duplicateReplies: 0, cycles: 0, requestDurationTotalMs: 0, requestDurationMaxMs: 0 };
  let snapshot = syntheticSnapshot();
  const marker = `synthetic-pilot-${randomUUID()}`;
  async function request(path, { payload, cookie, worker = false, expectedStatus = 200 } = {}) {
    const began = now();
    const response = await fetchImpl(`${config.site}/api/ai-assistance/${path}`, {
      method: payload === undefined ? "GET" : "POST", redirect: "error", signal: AbortSignal.timeout(15000),
      headers: { "Content-Type": "application/json", Origin: config.site, ...(cookie ? { Cookie: cookie } : {}), ...(worker ? { Authorization: `Bearer ${config.token}` } : {}) },
      ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
    });
    metrics.requests += 1;
    const elapsed = now() - began;
    metrics.requestDurationTotalMs += elapsed;
    metrics.requestDurationMaxMs = Math.max(metrics.requestDurationMaxMs, elapsed);
    ensure(response.status === expectedStatus, `Unexpected HTTP status on ${path.split("?")[0]}: ${response.status}.`);
    return { data: await response.json(), cookie: response.headers.get("set-cookie")?.split(";")[0] };
  }
  const worker = async (operation, payload) => (await request(`worker/${operation}`, { worker: true, payload })).data;
  const heartbeat = (ready = true) => worker("heartbeat", { ready, knowledgeVersion: snapshot.version });
  const publish = () => worker("knowledge", { ready: true, snapshot });
  async function session(language = "en") {
    const response = await request("session", { payload: { language } });
    ensure(response.cookie?.startsWith("gascomp_ai_session="), "A private session cookie is required.");
    return { cookie: response.cookie, language };
  }
  const state = async (session) => (await request(`messages?language=${session.language}`, session)).data;
  const send = async (session, requestId = randomUUID(), label = "known") => (await request("messages", { ...session, payload: { language: session.language, requestId, text: `${marker} ${label}` } })).data;
  async function claim() {
    const { job } = await worker("claim", {});
    ensure(job?.text.startsWith(marker), "The exclusive pilot queue contains missing or unrelated work. Stop other workers and use an empty disposable database.");
    return job;
  }
  const complete = (job, answerId) => worker("complete", { jobId: job.id, leaseToken: job.leaseToken, knowledgeVersion: job.knowledgeVersion, answerId });
  async function verifyReply(session, expected, count = 1) {
    const result = await state(session);
    const replies = result.messages.filter((message) => message.role === "assistant");
    if (replies.length > count) metrics.duplicateReplies += replies.length - count;
    ensure(!result.pending && replies.length === count && replies.at(-1).text === expected, "Reply did not match the exact source or expected message count.");
  }
  const answer = (language) => snapshot.entries.find((entry) => entry.id === `pilot.${language}.answer`).answer;
  const handoff = (language) => snapshot.entries.find((entry) => entry.id === `pilot.${language}.handoff`).answer;
  async function known(language = "en") {
    const customer = await session(language);
    await send(customer);
    ensure((await complete(await claim(), `pilot.${language}.answer`)).accepted, "Known source was not accepted.");
    await verifyReply(customer, answer(language));
    metrics.answers += 1;
  }
  async function scenario(name, operation) {
    try { await operation(); metrics.scenarios[name] = "passed"; output({ scenario: name, status: "passed" }); }
    catch (error) { metrics.scenarios[name] = "failed"; throw error; }
  }
  try {
    await publish();
    await heartbeat();
    await scenario("known-bilingual-source", async () => { await known("en"); await known("id"); });
    await scenario("unknown-handoff", async () => {
      const customer = await session();
      await send(customer, randomUUID(), "unknown");
      ensure(!(await complete(await claim(), null)).accepted, "Unknown selection was accepted.");
      await verifyReply(customer, handoff("en")); metrics.handoffs += 1;
    });
    await scenario("duplicate-and-session-isolation", async () => {
      const customer = await session(); const other = await session(); const id = randomUUID();
      await send(customer, id); await send(customer, id);
      const job = await claim();
      ensure((await complete(job, "pilot.en.answer")).accepted, "Original completion failed.");
      ensure(!(await complete(job, "pilot.en.answer")).accepted, "Duplicate completion was accepted.");
      await send(customer, id); await verifyReply(customer, answer("en"));
      const reloaded = await request("session", { ...customer, payload: { language: "en" } });
      ensure(reloaded.data.messages.length === 2, "Session continuity or duplicate submission failed.");
      ensure((await state(other)).messages.length === 0, "A separate session exposed another conversation.");
      await request("messages?language=en", { expectedStatus: 401 }); metrics.answers += 1;
    });
    await scenario("snapshot-change-rejects-stale-result", async () => {
      const customer = await session(); await send(customer); const job = await claim();
      snapshot = syntheticSnapshot(2); await publish(); await heartbeat();
      ensure(!(await complete(job, "pilot.en.answer")).accepted, "An outdated source was accepted.");
      await verifyReply(customer, handoff("en")); metrics.handoffs += 1;
    });
    await scenario("worker-offline-and-recovery", async () => {
      const customer = await session(); await send(customer); const job = await claim();
      await heartbeat(false);
      ensure(!(await complete(job, "pilot.en.answer")).accepted, "Offline worker result was accepted.");
      await verifyReply(customer, handoff("en")); metrics.handoffs += 1;
      await heartbeat(); await known();
    });
    await scenario("deadline-rejects-late-result", async () => {
      const customer = await session(); await send(customer); const job = await claim();
      const deadline = Date.parse(job.expiresAt) + 150;
      let nextHeartbeat = now() + 9000;
      while (now() < deadline) {
        await wait(Math.min(1000, deadline - now()));
        if (now() >= nextHeartbeat) { await heartbeat(); nextHeartbeat = now() + 9000; }
      }
      ensure(!(await complete(job, "pilot.en.answer")).accepted, "A late result was accepted.");
      await verifyReply(customer, handoff("en")); metrics.handoffs += 1; metrics.expiredResultsRejected += 1;
    });
    while (now() - started < config.durationSeconds * 1000) {
      await heartbeat(); await known(metrics.cycles % 2 ? "id" : "en"); metrics.cycles += 1;
      await wait(Math.min(5000, Math.max(0, config.durationSeconds * 1000 - (now() - started))));
      if (metrics.cycles % 20 === 0) output({ cycles: metrics.cycles, elapsedSeconds: Math.floor((now() - started) / 1000) });
    }
    metrics.passed = true;
  } catch {
    // Never serialize response bodies, exception text, cookies, prompts, or tokens.
    metrics.failure = "Pilot assertion or transport failed. Inspect failed scenario and local service health.";
  } finally {
    try { await heartbeat(false); } catch { metrics.passed = false; metrics.cleanupFailed = true; }
    metrics.elapsedSeconds = Math.round((now() - started) / 10) / 100;
  }
  return metrics;
}

export async function main(args = process.argv.slice(2), env = process.env) {
  const config = configuration(args, env);
  if (!config.run) {
    console.log(JSON.stringify({ mode: "dry-run", site: config.site, durationSeconds: config.durationSeconds, minimumRuntimeSeconds: 60, writes: false, note: "Use --run only with an exclusive disposable loopback website/database. This simulates the worker; it does not validate Hermes or a real model." }, null, 2));
    return;
  }
  const report = await runPilot(config, { output: (value) => console.log(JSON.stringify(value)) });
  const directory = resolve(root, ".data", "ai-assistance", "pilot");
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const reportPath = resolve(directory, `${new Date().toISOString().replaceAll(":", "-")}-${randomUUID()}.json`);
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600, flag: "wx" });
  console.log(JSON.stringify({ ...report, reportPath }, null, 2));
  if (!report.passed) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(() => { console.error("Pilot configuration failed. Use loopback origins, an exclusive disposable database, and the documented environment variables."); process.exitCode = 1; });
}
