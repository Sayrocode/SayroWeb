import { GetServerSideProps } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_BASE_URL || "https://www.sayro.com";

const staticPaths = [
  "/",
  "/propiedades",
  "/anunciate",
  "/servicios",
  "/nosotros",
  "/contacto",
  "/aviso-de-privacidad",
  "/terminos",
  "/catalogo-mls",
  "/noticias",
];

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const urls = staticPaths
    .map((path) => `<url><loc>${`${BASE_URL}`.replace(/\/$/, "")}${path}</loc></url>`)
    .join("");

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  res.setHeader("Content-Type", "text/xml");
  res.write(sitemap);
  res.end();

  return { props: {} };
};

export default function SiteMap() {
  return null;
}
