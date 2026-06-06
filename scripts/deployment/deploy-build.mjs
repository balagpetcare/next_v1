#!/usr/bin/env node
/**
 * Production deploy build pipeline (lint → typecheck → build → validate panels).
 *
 * Usage: node scripts/deployment/deploy-build.mjs [--skip-lint] [--skip-typecheck]
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..", "..");

const args = new Set(process.argv.slice(2));
const skipLint = args.has("--skip-lint");
const skipTypecheck = args.has("--skip-typecheck");

function run(label, cmd, cmdArgs, extraEnv = {}) {
  console.log(`\n▶ ${label}\n`);
  const result = spawnSync(cmd, cmdArgs, {
    cwd: ROOT,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: { ...process.env, ...extraEnv, SITE_MODE: "" },
  });
  if (result.status !== 0) {
    console.error(`\n✗ ${label} failed (exit ${result.status ?? 1})`);
    process.exit(result.status ?? 1);
  }
  console.log(`✓ ${label}`);
}

console.log("bpa_web deploy-build pipeline\n");

if (process.env.SITE_MODE) {
  console.error("Unset SITE_MODE before deploy build.");
  process.exit(1);
}

if (!skipLint) {
  run("lint", "npm", ["run", "lint"]);
}

if (!skipTypecheck) {
  run("typecheck", "npx", ["tsc", "--noEmit", "-p", "tsconfig.json"]);
}

run("build", "npm", ["run", "build"], { SITE_MODE: "" });
run("validate:panels", "npm", ["run", "validate:panels"]);

console.log("\n✓ deploy-build pipeline complete");
