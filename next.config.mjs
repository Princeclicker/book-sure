/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  typescript: {
    ignoreBuildErrors: true,
  },

  images: {
    unoptimized: true,
  },

  // These work with Webpack builds. For Turbopack, native modules
  // must be lazy-required (see lib/db/index.ts).
  serverExternalPackages: [
    'better-sqlite3',
    'pg',
    'nodemailer',
    'resend',
  ],
}

export default nextConfig
