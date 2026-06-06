#!/usr/bin/env node
/**
 * Verify PM2 panel registry injects SITE_MODE for every panel process.
 */
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { PANELS, createPm2Apps } = require("./panel-registry.cjs");

const apps = createPm2Apps({ cwd: process.cwd() });
let failed = false;

for (const panel of PANELS) {
  const app = apps.find((a) => a.name === panel.name);
  if (!app) {
    console.error(`✗ missing PM2 app: ${panel.name}`);
    failed = true;
    continue;
  }
  const { SITE_MODE, NEXT_PUBLIC_DEFAULT_PANEL } = app.env;
  if (SITE_MODE !== panel.siteMode) {
    console.error(`✗ ${panel.name}: SITE_MODE=${SITE_MODE} expected ${panel.siteMode}`);
    failed = true;
  } else if (NEXT_PUBLIC_DEFAULT_PANEL !== panel.siteMode) {
    console.error(
      `✗ ${panel.name}: NEXT_PUBLIC_DEFAULT_PANEL=${NEXT_PUBLIC_DEFAULT_PANEL} expected ${panel.siteMode}`,
    );
    failed = true;
  } else {
    console.log(`✓ ${panel.name} → SITE_MODE=${SITE_MODE} :${panel.port}`);
  }
}

if (failed) process.exit(1);
console.log("\n✓ All panels have runtime SITE_MODE configured");
