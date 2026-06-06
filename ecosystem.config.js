/**
 * bpa_web production PM2 ecosystem — single build, explicit ports per panel.
 *
 * Usage:
 *   npm run build
 *   npm run deploy:pm2:phase1
 *   npm run deploy:pm2:phase2
 *   pm2 start ecosystem.config.js --only bpa-web-staff,bpa-web-admin
 *
 * Do NOT:
 *   - use `npm run start` for admin/other panels (defaults to staff :3100)
 *   - set SITE_MODE during `npm run build`
 *   - add bpa-web-mother or generic bpa-web (obsolete)
 *
 * @see docs/deployment/PRODUCTION_DEPLOYMENT_PLAN.md
 */
const path = require("path");
const { createPm2Apps } = require("./scripts/deployment/panel-registry.cjs");

module.exports = {
  apps: createPm2Apps({
    cwd: path.resolve(__dirname),
  }),
};
