#!/usr/bin/env node
/**
 * Verify key panel routes exist after `next build`.
 *
 * Preferred: reads `.next/app-path-routes-manifest.json` (UTF-8, stable).
 * Fallback: parse build stdout (--file or stdin) with UTF-8/UTF-16LE detection.
 *
 * Usage:
 *   node scripts/validate-panel-routes.mjs
 *   npm run build 2>&1 | node scripts/validate-panel-routes.mjs
 *   node scripts/validate-panel-routes.mjs --file build.log
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const PANELS = [
  { name: "Admin", prefixes: ["/admin"] },
  { name: "Owner", prefixes: ["/owner"] },
  { name: "Clinic", prefixes: ["/clinic"] },
  { name: "Doctor", prefixes: ["/doctor"] },
  { name: "Producer", prefixes: ["/producer"] },
  { name: "Country", prefixes: ["/country"] },
  { name: "Mother", prefixes: ["/mother", "/"] },
  { name: "Shop", prefixes: ["/shop"] },
];

const LOGIN_ROUTES = [
  "/admin/login",
  "/owner/login",
  "/clinic/login",
  "/doctor/login",
  "/producer/login",
  "/country/login",
  "/shop/login",
  "/auth/login",
];

function readTextFile(filePath) {
  const buf = fs.readFileSync(filePath);
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) {
    return buf.toString("utf16le");
  }
  if (buf.length >= 2 && buf[0] === 0xfe && buf[1] === 0xff) {
    return buf.swap16().toString("utf16le");
  }
  return buf.toString("utf8");
}

function loadRouteText() {
  const manifestPath = path.join(ROOT, ".next", "app-path-routes-manifest.json");
  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    const routes = Object.values(manifest);
    return { source: manifestPath, text: routes.join("\n"), routes };
  }

  const fileArg = process.argv.indexOf("--file");
  if (fileArg !== -1 && process.argv[fileArg + 1]) {
    const filePath = path.resolve(process.argv[fileArg + 1]);
    return { source: filePath, text: readTextFile(filePath), routes: null };
  }

  if (!process.stdin.isTTY) {
    const chunks = [];
    for (const chunk of fs.readFileSync(0)) chunks.push(chunk);
    const buf = Buffer.concat(chunks);
    const text =
      buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe
        ? buf.toString("utf16le")
        : buf.toString("utf8");
    return { source: "stdin", text, routes: null };
  }

  console.error(
    "No .next/app-path-routes-manifest.json found. Run `npm run build` first or pipe build output.",
  );
  process.exit(1);
}

function hasRoute(routes, text, routePrefix) {
  if (routes) {
    return routes.some(
      (r) => r === routePrefix || r.startsWith(`${routePrefix}/`),
    );
  }
  const pattern = new RegExp(`${routePrefix.replace("/", "\\/")}(?:\\/|\\s|$)`);
  return pattern.test(text);
}

const { source, text, routes } = loadRouteText();
console.log(`Panel route validation (source: ${path.relative(ROOT, source)})\n`);

let failed = 0;
for (const { name, prefixes } of PANELS) {
  const ok = prefixes.some((p) => hasRoute(routes, text, p));
  if (ok) {
    console.log(`OK  ${name} panel routes present`);
  } else {
    failed += 1;
    console.error(`FAIL ${name} panel routes not found`);
  }
}

console.log("\nLogin route checks:");
for (const route of LOGIN_ROUTES) {
  const ok = hasRoute(routes, text, route);
  if (ok) {
    console.log(`OK  ${route}`);
  } else {
    failed += 1;
    console.error(`FAIL ${route} not found`);
  }
}

const buildManifest = path.join(ROOT, ".next", "build-manifest.json");
const routesManifest = path.join(ROOT, ".next", "routes-manifest.json");
for (const [label, file] of [
  ["build-manifest.json", buildManifest],
  ["routes-manifest.json", routesManifest],
]) {
  if (fs.existsSync(file)) {
    console.log(`OK  ${label} exists`);
  } else {
    failed += 1;
    console.error(`FAIL ${label} missing at ${file}`);
  }
}

if (failed) process.exit(1);
console.log("\nAll panel routes and build manifests validated.");
