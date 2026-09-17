import { lstatSync, readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { root } from "../shared/paths.mjs";
import { workerEnvironment } from "./launchd.mjs";

export function readPrivateEnvironment(path) {
  const metadata = lstatSync(path);
  if (!metadata.isFile() || (metadata.mode & 0o077) !== 0 || (process.getuid && metadata.uid !== process.getuid())) throw new Error("Worker configuration must be an owner-only regular file");
  return workerEnvironment(JSON.parse(readFileSync(path, "utf8")));
}

export function isolatedEnvironment(configuration, parent = process.env) {
  const environment = { ...configuration, PYTHONUNBUFFERED: "1", PYTHONIOENCODING: "utf-8" };
  for (const name of ["HOME", "PATH", "TMPDIR", "LANG", "LC_ALL"]) if (parent[name]) environment[name] = parent[name];
  return environment;
}

function main() {
  if (process.argv.length !== 3) throw new Error("A private configuration path is required");
  const environment = readPrivateEnvironment(process.argv[2]);
  const child = spawn(join(root, "scraping/.venv/bin/python"), ["-m", "scraping.ai_assistance.worker", "--watch"], { cwd: root, env: isolatedEnvironment(environment), stdio: "inherit", shell: false });
  for (const signal of ["SIGTERM", "SIGINT"]) process.on(signal, () => child.kill(signal));
  child.on("error", () => { process.stderr.write("AI worker could not start. Check the private configuration and Python environment.\n"); process.exitCode = 1; });
  child.on("exit", (code, signal) => { process.exitCode = code ?? (signal ? 1 : 0); });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { main(); } catch { process.stderr.write("AI worker launch configuration is invalid.\n"); process.exitCode = 1; }
}
