import { chmodSync, existsSync, lstatSync, mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { root, vaultPath } from "../shared/paths.mjs";

const chromeDefault = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
export const serviceLabels = { worker: "com.gascomp.ai-assistance.worker", chrome: "com.gascomp.ai-assistance.chrome" };
const escapeXml = (value) => String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[character]);
const string = (value) => `<string>${escapeXml(value)}</string>`;

function url(value, name) {
  let parsed;
  try { parsed = new URL(value); } catch { throw new Error(`${name} must be a valid URL`); }
  if (parsed.username || parsed.password || parsed.search || parsed.hash) throw new Error(`${name} must not contain credentials, query, or fragment`);
  return parsed;
}
const isLoopback = (parsed) => ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname);
const expandPath = (value) => resolve(value.startsWith("~/") ? join(homedir(), value.slice(2)) : value);

export function workerEnvironment(environment = process.env) {
  const site = url(environment.GASCOMP_AI_SITE_URL, "GASCOMP_AI_SITE_URL");
  if (site.pathname !== "/" || !(site.protocol === "https:" || (site.protocol === "http:" && isLoopback(site)))) throw new Error("GASCOMP_AI_SITE_URL must be an HTTPS origin; loopback HTTP is allowed");
  const token = environment.GASCOMP_AI_WORKER_TOKEN ?? "";
  if (token.length < 32 || /[\r\n]/.test(token)) throw new Error("GASCOMP_AI_WORKER_TOKEN must contain at least 32 characters without line breaks");
  const model = environment.GASCOMP_AI_MODEL?.trim();
  if (!model) throw new Error("GASCOMP_AI_MODEL is required");
  const responseMode = environment.GASCOMP_AI_RESPONSE_MODE || "grounded";
  if (!["grounded", "exact"].includes(responseMode)) throw new Error("GASCOMP_AI_RESPONSE_MODE must be grounded or exact");
  const modelUrl = url(environment.GASCOMP_AI_MODEL_BASE_URL || "http://127.0.0.1:11434/v1", "GASCOMP_AI_MODEL_BASE_URL");
  if (modelUrl.protocol !== "http:" || !isLoopback(modelUrl)) throw new Error("The model endpoint must use loopback HTTP");
  const cdp = url(environment.GASCOMP_AI_CHROME_CDP_URL || "http://127.0.0.1:9222", "GASCOMP_AI_CHROME_CDP_URL");
  // The generated Chrome process binds IPv4 loopback; do not accept a mismatched endpoint.
  if (cdp.protocol !== "http:" || cdp.hostname !== "127.0.0.1" || cdp.pathname !== "/" || !cdp.port) throw new Error("Generated Chrome requires an http://127.0.0.1:PORT CDP origin");
  const hermesRoot = expandPath(environment.GASCOMP_AI_HERMES_ROOT || "~/.hermes/hermes-agent");
  const hosts = environment.GASCOMP_AI_BROWSER_HOSTS || "support.gascompsuperlock.com";
  if (!hosts.split(",").every((host) => /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+gascompsuperlock\.com$/.test(host) || host === "gascompsuperlock.com")) throw new Error("Browser hosts must be explicit Gascomp hostnames separated by commas");
  return {
    GASCOMP_AI_SITE_URL: site.origin,
    GASCOMP_AI_WORKER_TOKEN: token,
    GASCOMP_AI_MODEL_BASE_URL: modelUrl.href.replace(/\/$/, ""),
    GASCOMP_AI_MODEL: model,
    GASCOMP_AI_RESPONSE_MODE: responseMode,
    GASCOMP_AI_HERMES_ROOT: hermesRoot,
    GASCOMP_AI_HERMES_PYTHON: expandPath(environment.GASCOMP_AI_HERMES_PYTHON || join(hermesRoot, "venv/bin/python")),
    GASCOMP_AI_VAULT: expandPath(environment.GASCOMP_AI_VAULT || vaultPath("customer-support")),
    ...(environment.GASCOMP_AI_SOURCE_VAULT ? { GASCOMP_AI_SOURCE_VAULT: expandPath(environment.GASCOMP_AI_SOURCE_VAULT) } : {}),
    GASCOMP_AI_CHROME_CDP_URL: cdp.origin,
    GASCOMP_AI_BROWSER_HOSTS: hosts,
  };
}

function plist(label, arguments_, repository, directory, logName) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>Label</key>${string(label)}
<key>ProgramArguments</key><array>${arguments_.map(string).join("")}</array>
<key>WorkingDirectory</key>${string(repository)}
<key>RunAtLoad</key><true/>
<key>KeepAlive</key><dict><key>SuccessfulExit</key><false/></dict>
<key>ThrottleInterval</key><integer>15</integer>
<key>Umask</key><integer>63</integer>
<key>StandardOutPath</key>${string(join(directory, `${logName}.log`))}
<key>StandardErrorPath</key>${string(join(directory, `${logName}.log`))}
</dict></plist>
`;
}

export function serviceFiles({ environment, repository = root, node = process.execPath, chrome = chromeDefault }) {
  const directory = join(repository, "scraping/.private/ai-assistance/services");
  const port = new URL(environment.GASCOMP_AI_CHROME_CDP_URL).port;
  return {
    directory,
    config: join(directory, "worker-environment.json"),
    worker: plist(serviceLabels.worker, [node, join(repository, "scripts/ai-assistance/worker-launcher.mjs"), join(directory, "worker-environment.json")], repository, directory, "worker"),
    chrome: plist(serviceLabels.chrome, [chrome, "--headless=new", "--remote-debugging-address=127.0.0.1", `--remote-debugging-port=${port}`, `--user-data-dir=${join(directory, "chrome-profile")}`, "--no-first-run", "--no-default-browser-check", "--disable-background-networking", "about:blank"], repository, directory, "chrome"),
  };
}

export function generateServices(options) {
  const files = serviceFiles(options);
  // Refuse symlinked private directory ancestors and refuse overwriting existing configuration.
  let current = files.directory;
  while (current !== dirname(current)) {
    if (existsSync(current) && lstatSync(current).isSymbolicLink()) throw new Error("Service paths must not contain symlinks");
    current = dirname(current);
  }
  const paths = [files.config, ...Object.values(serviceLabels).map((label) => join(files.directory, `${label}.plist`))];
  if (paths.some((path) => existsSync(path))) throw new Error("Service files already exist; edit the private configuration or move the previous files before regenerating");
  mkdirSync(files.directory, { recursive: true, mode: 0o700 });
  chmodSync(files.directory, 0o700);
  writeFileSync(paths[0], `${JSON.stringify(options.environment, null, 2)}\n`, { flag: "wx", mode: 0o600 });
  writeFileSync(paths[1], files.worker, { flag: "wx", mode: 0o600 });
  writeFileSync(paths[2], files.chrome, { flag: "wx", mode: 0o600 });
  return files;
}

function main() {
  const arguments_ = process.argv.slice(2);
  if (arguments_.some((argument) => !["--generate", "--help"].includes(argument))) throw new Error("Supported options: --generate, --help");
  if (arguments_.includes("--help")) {
    process.stdout.write("Preview: node scripts/ai-assistance/launchd.mjs\nGenerate private service files: add --generate. This command never activates services.\n");
    return;
  }
  const environment = workerEnvironment();
  const files = arguments_.includes("--generate") ? generateServices({ environment }) : serviceFiles({ environment });
  process.stdout.write(arguments_.includes("--generate") ? "Private service files generated. No services activated.\n" : "Preview only. No files written.\n");
  process.stdout.write(`Service directory: ${files.directory}\nLabels: ${Object.values(serviceLabels).join(", ")}\nConfiguration values and secrets are not printed. See docs/setup/ai-assistance.md for manual activation.\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { main(); } catch { process.stderr.write("Service generation failed. Check required configuration, safe paths, and existing private service files.\n"); process.exitCode = 1; }
}
