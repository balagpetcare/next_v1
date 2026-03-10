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

  // Proxy /api/v1/* to backend (port 3000). beforeFiles + fallback so API hits backend.
  async rewrites() {
    const apiTarget = process.env.API_BASE_URL || "http://localhost:3000";
    const apiRewrite = { source: "/api/v1/:path*", destination: `${apiTarget}/api/v1/:path*` };
    return {
      beforeFiles: [apiRewrite],
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
