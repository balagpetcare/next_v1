/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.SITE_MODE ? `.next/${process.env.SITE_MODE}` : '.next',

  reactStrictMode: true,

  // Workaround for Next 16.1+ Turbopack 404 on nested dynamic routes (e.g. /owner/clinic/5/packages/2/edit)
  experimental: {
    turbopackClientSideNestedAsyncChunking: true,
  },

  turbopack: {
    resolveAlias: {
      '@larkon': './src/larkon-admin',
      '@larkon/*': './src/larkon-admin/*',
    },
  },

  // Redirect wrong staff doctor URLs (profile/approvals etc.) to correct list pages so they don’t 404.
  // Then redirect old staff doctor profile URL to profile subpath (numeric :doctorId only).
  // Redirect /create → /new for staff supply requests (canonical route is /new)
  async redirects() {
    const staffDoctors = "/staff/branch/:branchId/clinic/doctors";
    const profileToSegment = [
      ["overview", "overview"],
      ["approvals", "approvals"],
      ["availability", "availability"],
      ["schedule-board", "schedule-board"],
      ["credentials", "credentials"],
      ["service-assignment", "service-assignment"],
      ["performance", "performance"],
      ["audit-logs", "audit-logs"],
      ["certifications", "certifications"],
      ["licenses", "licenses"],
      ["package-assignment", "package-assignment"],
      ["assign-existing", "assign-existing"],
      ["invite", "invite"],
    ];
    const profileRedirects = profileToSegment.map(([segment]) => ({
      source: `${staffDoctors}/profile/${segment}`,
      destination: `${staffDoctors}/${segment}`,
      permanent: false,
    }));
    return [
      ...profileRedirects,
      {
        source: "/staff/branch/:branchId/clinic/doctors/:doctorId(\\d+)",
        destination: "/staff/branch/:branchId/clinic/doctors/profile/:doctorId",
        permanent: false,
      },
      {
        source: "/staff/branch/:branchId/clinic/supply-requests/new",
        destination: "/staff/branch/:branchId/clinic/supply-request-create",
        permanent: false,
      },
      {
        source: "/staff/branch/:branchId/clinic/supply-requests/create",
        destination: "/staff/branch/:branchId/clinic/supply-request-create",
        permanent: false,
      },
      {
        source: "/staff/branch/:branchId/clinic/supply-request/create",
        destination: "/staff/branch/:branchId/clinic/supply-request-create",
        permanent: false,
      },
    ];
  },

  // Profile segment rewrites in beforeFiles. API proxy in afterFiles so App Router API route runs first
  // and forwards Set-Cookie (login/auth) reliably; fallback rewrite for API when route not hit.
  async rewrites() {
    const apiTarget = process.env.API_BASE_URL || "http://localhost:3000";
    const apiRewrite = { source: "/api/v1/:path*", destination: `${apiTarget}/api/v1/:path*` };
    const staffDoctors = "/staff/branch/:branchId/clinic/doctors";
    const profileSegmentRewrites = [
      "overview",
      "approvals",
      "availability",
      "schedule-board",
      "credentials",
      "service-assignment",
      "performance",
      "audit-logs",
      "certifications",
      "licenses",
      "package-assignment",
      "assign-existing",
      "invite",
    ].map((segment) => ({
      source: `${staffDoctors}/profile/${segment}`,
      destination: `${staffDoctors}/${segment}`,
    }));
    return {
      // Do NOT put apiRewrite in beforeFiles: so /api/v1/* hits the App Router API route first,
      // which forwards Set-Cookie and makes cookie-based login work on shared login (e.g. 3104).
      beforeFiles: profileSegmentRewrites,
      fallback: [apiRewrite],
    };
  },

  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "3000",
        pathname: "/api/v1/files/**",
      },
    ],
  },

  sassOptions: {
    silenceDeprecations: [
      "import",
      "global-builtin",
      "color-functions",
      "if-function",
    ],
  },
};

export default nextConfig;
