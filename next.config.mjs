/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // ✅ Proxy API calls through Next.js to avoid CORS issues and keep HttpOnly cookies working.
  // Use relative paths from the browser (e.g. /api/v1/auth/login).
  // This rewrite forwards them to your backend API server.
  async rewrites() {
    const apiTarget = process.env.API_BASE_URL || "http://localhost:3000";
    return [
      {
        source: "/api/:path*",
        destination: `${apiTarget}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
