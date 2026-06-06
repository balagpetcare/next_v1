#!/usr/bin/env node
/**
 * Simulate VPS production install (npm ci --omit=dev) and verify build-time deps exist.
 * Does not run full next build (slow); checks postcss/tailwind/typescript resolution.
 *
 * Usage: node scripts/validate-production-build.mjs
 */
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const require = createRequire(import.meta.url);

const BUILD_DEPS = ["tailwindcss", "postcss", "autoprefixer", "typescript", "next"];

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, {
    cwd: ROOT,
    stdio: "inherit",
    shell: process.platform === "win32",
    ...opts,
  });
  if (result.status !== 0) {
    throw new Error(`${cmd} ${args.join(" ")} failed`);
  }
}

console.log("Production dependency check (npm ci --omit=dev)\n");

run("npm", ["ci", "--omit=dev"]);

console.log("\nResolving build-time packages from node_modules...\n");

for (const pkg of BUILD_DEPS) {
  try {
    const resolved = require.resolve(pkg, { paths: [ROOT] });
    console.log(`OK  ${pkg} -> ${path.relative(ROOT, resolved)}`);
  } catch {
    console.error(`FAIL ${pkg} not resolvable after npm ci --omit=dev`);
    process.exit(1);
  }
}

console.log("\nPostCSS config load test...");
const postcssConfig = require(path.join(ROOT, "postcss.config.js"));
if (!postcssConfig?.plugins?.tailwindcss || !postcssConfig?.plugins?.autoprefixer) {
  console.error("FAIL postcss.config.js missing tailwindcss/autoprefixer plugins");
  process.exit(1);
}
console.log("OK  postcss.config.js plugins configured");

console.log("\nProduction build dependency validation: PASS");
console.log("Run npm run build for full compile verification.");
