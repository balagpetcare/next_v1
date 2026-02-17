/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow loading images served by the BPA API (port 3000) via next/image.
  // (If you use plain <img>, this is harmless.)
   // .next ফোল্ডারের ভেতরে SITE_MODE অনুযায়ী সাব-ফোল্ডার তৈরি করবে
  distDir: process.env.SITE_MODE ? `.next/${process.env.SITE_MODE}` : '.next',
  
  reactStrictMode: true,

  turbopack: {
    resolveAlias: {
      '@larkon': './src/larkon-admin',
      '@larkon/*': './src/larkon-admin/*',
    },
  },

  // Proxy /api/* to backend (port 3000) so same-origin requests avoid CORS and cookies work
  async rewrites() {
    const apiTarget = process.env.API_BASE_URL || "http://localhost:3000";
    return [
      { source: "/api/:path*", destination: `${apiTarget}/api/:path*` },
    ];
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

  // Silence Sass deprecation warnings from Larkon/Bootstrap SCSS (Dart Sass 2.x / 3.x).
  // Template code is unchanged; warnings will be addressed when upgrading the theme.
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



// /** @type {import('next').NextConfig} */
// const nextConfig = {
//   // .next ফোল্ডারের ভেতরে SITE_MODE অনুযায়ী সাব-ফোল্ডার তৈরি করবে
//   distDir: process.env.SITE_MODE ? `.next/${process.env.SITE_MODE}` : '.next',
  
//   reactStrictMode: true,
// };

// module.exports = nextConfig;