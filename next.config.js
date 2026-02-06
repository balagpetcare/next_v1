/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow loading images served by the BPA API (port 3000) via next/image.
  // (If you use plain <img>, this is harmless.)
   // .next ফোল্ডারের ভেতরে SITE_MODE অনুযায়ী সাব-ফোল্ডার তৈরি করবে
  distDir: process.env.SITE_MODE ? `.next/${process.env.SITE_MODE}` : '.next',
  
  reactStrictMode: true,
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
};

module.exports = nextConfig;



// /** @type {import('next').NextConfig} */
// const nextConfig = {
//   // .next ফোল্ডারের ভেতরে SITE_MODE অনুযায়ী সাব-ফোল্ডার তৈরি করবে
//   distDir: process.env.SITE_MODE ? `.next/${process.env.SITE_MODE}` : '.next',
  
//   reactStrictMode: true,
// };

// module.exports = nextConfig;