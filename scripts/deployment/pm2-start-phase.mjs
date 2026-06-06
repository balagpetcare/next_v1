#!/usr/bin/env node
/**
 * Start or restart bpa_web PM2 processes for a deployment phase.
 *
 * Usage:
 *   node scripts/deployment/pm2-start-phase.mjs 1
 *   node scripts/deployment/pm2-start-phase.mjs 1-2 --restart
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..", "..");
const require = createRequire(import.meta.url);
const { getPhaseProcessList } = require("./panel-registry.cjs");

const phase = process.argv[2];
const restart = process.argv.includes("--restart");

if (!phase) {
  console.error("Usage: node scripts/deployment/pm2-start-phase.mjs <1|2|3|1-2|all> [--restart]");
  process.exit(1);
}

let names;
try {
  names = getPhaseProcessList(phase);
} catch (err) {
  console.error(err.message);
  process.exit(1);
}

const ecosystem = path.join(ROOT, "ecosystem.config.js");
const only = names.join(",");
const subcommand = restart ? "restart" : "start";

console.log(`PM2 ${subcommand} phase ${phase}: ${only}\n`);

const result = spawnSync("pm2", [subcommand, ecosystem, "--only", only], {
  cwd: ROOT,
  stdio: "inherit",
  shell: process.platform === "win32",
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

if (!restart) {
  spawnSync("pm2", ["save"], { cwd: ROOT, stdio: "inherit", shell: process.platform === "win32" });
}

console.log(`\n✓ PM2 ${subcommand} complete for phase ${phase}`);
