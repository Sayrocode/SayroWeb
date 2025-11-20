// Local PostCSS config to avoid inheriting parent Tailwind setup
// Mirrors Next.js defaults (no Tailwind) so CSS compiles without extra deps.
/** @type {import('postcss-load-config').Config} */
module.exports = {
  plugins: [
    // Use Next's compiled plugins so we don't need to install them here.
    'next/dist/compiled/postcss-flexbugs-fixes',
    [
      'next/dist/compiled/postcss-preset-env',
      {
        stage: 3,
        autoprefixer: { flexbox: 'no-2009' },
        features: { 'custom-properties': false },
      },
    ],
  ],
};

