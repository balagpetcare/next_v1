#!/usr/bin/env node
/**
 * Restore VectorMap module when the directory was manually renamed to VectorMap_backup on a server.
 * Safe: only runs when VectorMap is missing and VectorMap_backup exists.
 *
 * Usage: node scripts/restore-vectormap-module.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const TARGET = path.join(ROOT, "src/larkon-admin/components/VectorMap");
const BACKUP = path.join(ROOT, "src/larkon-admin/components/VectorMap_backup");

function main() {
  if (fs.existsSync(TARGET)) {
    const indexPath = path.join(TARGET, "index.tsx");
    if (fs.existsSync(indexPath)) {
      console.log("VectorMap module already present:", path.relative(ROOT, TARGET));
      return;
    }
    console.error("VectorMap directory exists but index.tsx is missing. Run: git checkout -- src/larkon-admin/components/VectorMap");
    process.exit(1);
  }

  if (fs.existsSync(BACKUP)) {
    fs.renameSync(BACKUP, TARGET);
    console.log("Restored VectorMap from VectorMap_backup");
    return;
  }

  console.error("VectorMap missing and no VectorMap_backup found.");
  console.error("Restore from git: git checkout -- src/larkon-admin/components/VectorMap");
  process.exit(1);
}

main();
