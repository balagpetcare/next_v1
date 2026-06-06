/**
 * Canonical bpa_web panel → port → PM2 name registry.
 * Used by ecosystem.config.js and deployment scripts.
 *
 * Removed (obsolete): bpa-web (generic), bpa-web-mother (use bpa-web-staff on :3100).
 */
const path = require("path");

const DEFAULT_API = "https://api.bangladeshpetassociation.com";

/** @type {Array<{ name: string; port: number; siteUrl: string; phase: number; extraEnv?: Record<string, string>; note?: string }>} */
const PANELS = [
  {
    name: "bpa-web-staff",
    port: 3100,
    siteUrl: "https://staff.bangladeshpetassociation.com",
    phase: 1,
    note: "Serves /staff and /mother on one process",
  },
  {
    name: "bpa-web-admin",
    port: 3103,
    siteUrl: "https://admin.bangladeshpetassociation.com",
    phase: 2,
    extraEnv: {
      AUTH_COOKIE_NAME: "bpa_admin",
      NEXT_PUBLIC_DEFAULT_PANEL: "admin",
    },
  },
  {
    name: "bpa-web-shop",
    port: 3101,
    siteUrl: "https://shop.bangladeshpetassociation.com",
    phase: 3,
    note: "Requires container isolation from bpa-landing on :3101 (bare metal conflict)",
  },
  {
    name: "bpa-web-clinic",
    port: 3102,
    siteUrl: "https://clinic.bangladeshpetassociation.com",
    phase: 3,
  },
  {
    name: "bpa-web-owner",
    port: 3104,
    siteUrl: "https://owner.bangladeshpetassociation.com",
    phase: 3,
    extraEnv: { NEXT_PUBLIC_DEFAULT_PANEL: "owner" },
  },
  {
    name: "bpa-web-producer",
    port: 3105,
    siteUrl: "https://producer.bangladeshpetassociation.com",
    phase: 3,
  },
  {
    name: "bpa-web-country",
    port: 3106,
    siteUrl: "https://country.bangladeshpetassociation.com",
    phase: 3,
  },
  {
    name: "bpa-web-doctor",
    port: 3107,
    siteUrl: "https://doctor.bangladeshpetassociation.com",
    phase: 3,
  },
];

const PM2_PHASES = {
  1: ["bpa-web-staff"],
  2: ["bpa-web-staff", "bpa-web-admin"],
  3: [
    "bpa-web-shop",
    "bpa-web-clinic",
    "bpa-web-owner",
    "bpa-web-producer",
    "bpa-web-country",
    "bpa-web-doctor",
  ],
  "1-2": ["bpa-web-staff", "bpa-web-admin"],
  all: PANELS.map((p) => p.name),
};

const NPM_START_SCRIPTS = Object.fromEntries(
  PANELS.map((p) => {
    const key = p.name.replace(/^bpa-web-/, "");
    return [key, `next start -p ${p.port}`];
  }),
);

/**
 * @param {{ cwd: string; logDir?: string }} options
 */
function createPm2Apps(options) {
  const cwd = options.cwd;
  const logDir = options.logDir || process.env.BPA_PM2_LOG_DIR || path.join(cwd, "logs", "pm2");

  const apiBase = process.env.API_BASE_URL || DEFAULT_API;
  const sharedEnv = {
    NODE_ENV: "production",
    API_BASE_URL: apiBase,
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || apiBase,
    NEXT_PUBLIC_AUTH_BASE_URL: process.env.NEXT_PUBLIC_AUTH_BASE_URL || apiBase,
  };

  const nextBin =
    process.platform === "win32"
      ? path.join(cwd, "node_modules", ".bin", "next.cmd")
      : path.join(cwd, "node_modules", ".bin", "next");

  return PANELS.map((panel) => ({
    name: panel.name,
    cwd,
    script: nextBin,
    args: `start -p ${panel.port}`,
    instances: 1,
    exec_mode: "fork",
    env: {
      ...sharedEnv,
      NEXT_PUBLIC_SITE_URL: panel.siteUrl,
      ...(panel.extraEnv || {}),
    },
    max_memory_restart: "1G",
    error_file: path.join(logDir, `${panel.name}-error.log`),
    out_file: path.join(logDir, `${panel.name}-out.log`),
    merge_logs: true,
    restart_delay: 5000,
    max_restarts: 10,
  }));
}

function getPanelByName(name) {
  return PANELS.find((p) => p.name === name);
}

function getPhaseProcessList(phase) {
  const key = String(phase);
  const list = PM2_PHASES[key];
  if (!list) {
    throw new Error(`Unknown phase: ${phase}. Use 1, 2, 3, 1-2, or all`);
  }
  return list;
}

module.exports = {
  PANELS,
  PM2_PHASES,
  NPM_START_SCRIPTS,
  DEFAULT_API,
  createPm2Apps,
  getPanelByName,
  getPhaseProcessList,
};
