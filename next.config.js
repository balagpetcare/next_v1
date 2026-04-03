/** @type {import('next').NextConfig} */
// Canonical Next config for bpa_web. Do not add a parallel next.config.mjs — it caused split-brain
// (Turbopack workarounds and redirects lived only in .mjs while `next dev` loaded this file).
const nextConfig = {
  // Allow loading images served by the BPA API (port 3000) via next/image.
  distDir: process.env.SITE_MODE ? `.next/${process.env.SITE_MODE}` : ".next",

  reactStrictMode: true,

  // Workaround for Next 16.1+ Turbopack 404 on nested dynamic routes; staff patient detail/edit use flat patient-detail / patient-edit;
  // staff pharmacy requisition detail uses nested .../pharmacy/requisitions/[requisitionId]; legacy flat requisition-detail redirects there.
  experimental: {
    turbopackClientSideNestedAsyncChunking: true,
  },

  turbopack: {
    resolveAlias: {
      "@larkon": "./src/larkon-admin",
      "@larkon/*": "./src/larkon-admin/*",
    },
  },

  // Redirect wrong staff doctor URLs (profile/approvals etc.) to correct list pages so they don't 404.
  // Redirect staff supply-request create paths to flat canonical route (Turbopack / nested route stability).
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
      {
        source: "/staff/branch/:branchId/inventory/stock-requests/new",
        destination: "/staff/branch/:branchId/inventory/stock-request-create",
        permanent: false,
      },
      // Nested .../stock-requests/:id can 404 under Turbopack; detail lives at flat stock-request-detail/:id
      {
        source: "/staff/branch/:branchId/inventory/stock-requests/:requestId(\\d+)",
        destination: "/staff/branch/:branchId/inventory/stock-request-detail/:requestId",
        permanent: false,
      },
      {
        source: "/staff/branch/:branchId/pharmacy/requisitions/new",
        destination: "/staff/branch/:branchId/pharmacy/requisition-create",
        permanent: false,
      },
      // Legacy flat requisition-detail URL → canonical nested .../pharmacy/requisitions/:requisitionId
      {
        source: "/staff/branch/:branchId/pharmacy/requisition-detail/:requisitionId(\\d+)",
        destination: "/staff/branch/:branchId/pharmacy/requisitions/:requisitionId",
        permanent: false,
      },
      // Staff clinic patients: flat canonical routes (Turbopack / nested sibling stability; see docs)
      {
        source: "/staff/branch/:branchId/clinic/patients/register",
        destination: "/staff/branch/:branchId/clinic/patient-register",
        permanent: false,
      },
      {
        source: "/staff/branch/:branchId/clinic/patients/:patientId(\\d+)/edit",
        destination: "/staff/branch/:branchId/clinic/patient-edit/:patientId",
        permanent: false,
      },
      {
        source: "/staff/branch/:branchId/clinic/patients/:patientId(\\d+)",
        destination: "/staff/branch/:branchId/clinic/patient-detail/:patientId",
        permanent: false,
      },
      // Services & Pricing catalog: flat canonical URL (Turbopack / nested route stability; same idea as patient-* routes)
      {
        source: "/staff/branch/:branchId/clinic/services-pricing/catalog",
        destination: "/staff/branch/:branchId/clinic/services-pricing-catalog",
        permanent: false,
      },
      {
        source: "/staff/branch/:branchId/clinic/services-pricing/matrix",
        destination: "/staff/branch/:branchId/clinic/services-pricing-matrix",
        permanent: false,
      },
      {
        source: "/staff/branch/:branchId/clinic/services-pricing/agreements",
        destination: "/staff/branch/:branchId/clinic/services-pricing-agreements",
        permanent: false,
      },
      {
        source: "/staff/branch/:branchId/clinic/services-pricing/services/:serviceId(\\d+)/content",
        destination: "/staff/branch/:branchId/clinic/services-pricing-service-content/:serviceId",
        permanent: false,
      },
      // Doctor approval detail: canonical nested URL (flat doctor-approvals-detail removed from rewrites)
      {
        source: "/staff/branch/:branchId/clinic/doctors/profile/approvals/:requestId",
        destination: "/staff/branch/:branchId/clinic/doctors/approvals/:requestId",
        permanent: false,
      },
      {
        source: "/staff/branch/:branchId/clinic/doctor-approvals-detail/:requestId",
        destination: "/staff/branch/:branchId/clinic/doctors/approvals/:requestId",
        permanent: false,
      },
    ];
  },

  // Profile segment rewrites in beforeFiles. Do NOT put /api/v1/* in beforeFiles: requests must hit
  // app/api/v1/[[...path]]/route.js first so Set-Cookie works on shared login (e.g. localhost:3104).
  async rewrites() {
    function resolveApiTarget() {
      let raw =
        process.env.API_BASE_URL ||
        process.env.NEXT_PUBLIC_API_BASE_URL ||
        "http://localhost:3000";
      raw = String(raw).replace(/\/+$/, "");
      if (!raw) raw = "http://localhost:3000";
      try {
        const withScheme = /^https?:\/\//i.test(raw) ? raw : `http://${raw}`;
        const u = new URL(withScheme);
        const port = u.port ? parseInt(u.port, 10) : u.protocol === "https:" ? 443 : 80;
        if (
          (u.hostname === "localhost" || u.hostname === "127.0.0.1") &&
          port >= 3100 &&
          port <= 3107
        ) {
          return "http://localhost:3000";
        }
      } catch (_) {
        /* keep raw */
      }
      return raw;
    }
    const apiTarget = resolveApiTarget();
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
      destination:
        segment === "service-assignment"
          ? "/staff/branch/:branchId/clinic/doctors-service-assignment"
          : segment === "approvals"
            ? "/staff/branch/:branchId/clinic/doctors-approvals"
            : `${staffDoctors}/${segment}`,
    }));
    // Nested .../clinic/doctors/service-assignment can 404 under some Next dev/bundlers (see patient-*, services-pricing-*).
    // Physical page: clinic/doctors-service-assignment; public URL stays .../doctors/service-assignment.
    const staffDoctorServiceAssignmentRewrite = {
      source: "/staff/branch/:branchId/clinic/doctors/service-assignment",
      destination: "/staff/branch/:branchId/clinic/doctors-service-assignment",
    };
    // Same Turbopack/nested-route stability issue as service-assignment: .../doctors/approvals → flat doctors-approvals.
    const staffDoctorApprovalsRewrite = {
      source: "/staff/branch/:branchId/clinic/doctors/approvals",
      destination: "/staff/branch/:branchId/clinic/doctors-approvals",
    };
    // Medicine control: injection-tokens nested under .../medicine-control/* can 404 under Turbopack (same class as patient-*, doctors-service-assignment).
    const staffMedicineInjectionTokensRewrite = {
      source: "/staff/branch/:branchId/clinic/medicine-control/injection-tokens",
      destination: "/staff/branch/:branchId/clinic/medicine-control-injection-tokens",
    };
    const staffMedicineInjectionTokensNewRewrite = {
      source: "/staff/branch/:branchId/clinic/medicine-control/injection-tokens/new",
      destination: "/staff/branch/:branchId/clinic/medicine-control-injection-tokens/new",
    };
    // Doctor approval detail uses filesystem route clinic/doctors/approvals/[approvalId] (see redirects for legacy flat/profile URLs).
    return {
      beforeFiles: [
        ...profileSegmentRewrites,
        staffDoctorServiceAssignmentRewrite,
        staffDoctorApprovalsRewrite,
        staffMedicineInjectionTokensRewrite,
        staffMedicineInjectionTokensNewRewrite,
      ],
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

module.exports = nextConfig;
