/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ["assets.easybroker.com"],
    formats: ["image/avif", "image/webp"],
  },
  experimental: { externalDir: true },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Avoid bundling libsql-related packages; load at runtime instead
      config.externals = config.externals || [];
      config.externals.push(
        '@libsql/client',
        '@libsql/core',
        '@libsql/hrana-client',
        '@prisma/adapter-libsql'
      );
    }
    return config;
  }
};

module.exports = nextConfig;
