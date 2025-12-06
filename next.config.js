/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production';
const withBundleAnalyzer = (() => {
  try { return require('@next/bundle-analyzer')({ enabled: process.env.ANALYZE === 'true' }); } catch { return (cfg) => cfg; }
})();
const { aliases, resolveAlias } = require('./path-aliases');
const nextConfig = {
    reactStrictMode: true,
    // Enable Turbopack (Next 16) with default settings; keep webpack config for webpack builds.
    turbopack: {},
    // Tell Next the app root explicitly to avoid picking parent workspace
    outputFileTracingRoot: __dirname,
    eslint: { ignoreDuringBuilds: true },
    images: {
      domains: ["assets.easybroker.com"], // para imágenes de EasyBroker
      formats: ['image/avif', 'image/webp'],
      deviceSizes: [360, 640, 750, 828, 1080, 1200, 1600, 1920],
      imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    },
    // Turbopack (Next 16) needs explicit aliases; keep parity with webpack aliases below.
    experimental: { turbo: { resolveAlias: aliases } },
    webpack: (config) => {
      config.resolve = config.resolve || {};
      config.resolve.alias = { ...(config.resolve.alias || {}), ...aliases };
      return config;
    },
    compiler: {
      removeConsole: process.env.NODE_ENV === 'production',
    },
    async headers() {
      const common = [
        { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        // Allow self-embedding (needed for internal embed/proxy). Still safe.
        { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: "geolocation=(), microphone=(), camera=()" },
      ];
      const cspProd = [
        "base-uri 'self'",
        // Permit self-embedding so our own pages can be iframed (embed proxy)
        "frame-ancestors 'self'",
        // Permitir iframes necesarios (EasyBroker y Google Maps)
        "frame-src 'self' https://sayro-bienes-raices.easybroker.com https://www.google.com https://maps.google.com",
        "default-src 'self'",
        "img-src 'self' data: blob: https:",
        "script-src 'self' 'unsafe-inline' https:",
        "style-src 'self' 'unsafe-inline' https:",
        "font-src 'self' https: data:",
        "connect-src 'self' https:",
        "worker-src 'self' blob:",
      ].join('; ');
      const cspDev = [
        "base-uri 'self'",
        // In dev, keep self-embedding allowed as well
        "frame-ancestors 'self'",
        "frame-src 'self' https://sayro-bienes-raices.easybroker.com https://www.google.com https://maps.google.com",
        "default-src 'self'",
        "img-src 'self' data: blob: http: https:",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' http: https:",
        "style-src 'self' 'unsafe-inline' http: https:",
        "font-src 'self' http: https: data:",
        "connect-src 'self' http: https: ws: wss:",
        "worker-src 'self' blob:",
      ].join('; ');
      const securityHeaders = isProd
        ? [...common, { key: 'Content-Security-Policy', value: cspProd }]
        : [...common]; // En desarrollo, omitimos CSP para no romper React Refresh (eval/ws)
      return [
        { source: '/(.*)', headers: securityHeaders },
      ];
    },
    async rewrites() {
      return [
        // Ensure any direct navigation within the iframe to EB-like paths stays on our proxy
        { source: '/properties', destination: '/api/embed/mls?path=/properties' },
        { source: '/rentals', destination: '/api/embed/mls?path=/rentals' },
        { source: '/property/:path*', destination: '/api/embed/mls?path=/property/:path*' },
        { source: '/p/:path*', destination: '/api/embed/mls?path=/p/:path*' },
        { source: '/search_text', destination: '/api/embed/mls?path=/search_text' },
      ];
    },
  };
  
  module.exports = withBundleAnalyzer(nextConfig);
  
