#!/usr/bin/env node
/**
 * Fail production builds when SITE_MODE is set (must use unified .next/).
 * Invoked from package.json prebuild.
 */
if (process.env.SITE_MODE) {
  console.error(
    "[guard-production-build] SITE_MODE must not be set for `npm run build`.\n" +
      "  Production uses a unified .next/ artifact shared by all bpa-web-* PM2 processes.\n" +
      "  For panel dev, use: npm run dev:admin, dev:owner, etc.",
  );
  process.exit(1);
}
