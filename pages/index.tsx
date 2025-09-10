import Head from "next/head";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState, PropsWithChildren } from "react";
import Hero from "../components/Hero"; // above-the-fold: keep static

// Reemplaza PropertyCategories por grid de servicios
const ServicesGridLazy = dynamic(() => import("components/ServicesGrid"), { ssr: true, loading: () => null });
import Layout from "components/Layout";

// Below-the-fold components via dynamic import (code-splitting)
const DualCTASectionLazy = dynamic(() => import("components/DualCTASection"), {
  ssr: false,
  loading: () => null,
});
const AboutShowcaseLazy = dynamic(() => import("components/AboutShowcase"), {
  ssr: true,
  loading: () => null,
});
const WhatWeDoLazy = dynamic(() => import("components/WhatWeDo"), {
  ssr: true,
  loading: () => null,
});
const HomePropertiesLazy = dynamic(() => import("../components/HomeProperties"), {
  ssr: false,
  loading: () => null,
});

// Mount children only when they enter the viewport to avoid loading their chunks early
function Viewport({ children, rootMargin = "300px 0px" }: PropsWithChildren<{ rootMargin?: string }>) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (show) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        if (e?.isIntersecting) {
          setShow(true);
          io.disconnect();
        }
      },
      { rootMargin }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [show, rootMargin]);
  return <div ref={ref}>{show ? children : null}</div>;
}

export default function HomePage() {
  const title = "Propiedades en venta y renta — Sayro Bienes Raíces";
  const description =
    "Encuentra tu próxima propiedad con Sayro Bienes Raíces. Inventario actualizado, atención personalizada y procesos claros.";

  return (
    <>
    <Layout>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        {/* Opcional: Open Graph / Twitter meta */}
      </Head>

  
      <main id="contenido">

        <Hero />

      
        <Viewport>
          <DualCTASectionLazy />
        </Viewport>

          <div id="nosotros" />
          <AboutShowcaseLazy
            imageSrc="/about.png"
            imageAlt="Fachada curvada"
            logoSrc="/logos/sayro-sello-blanco.svg"
            logoAlt="SR · Sayro Bienes Raíces S.A. de C.V."
            title="¿Quiénes somos?"
            paragraphs={[
              "Somos una empresa líder en el sector inmobiliario de la Ciudad de Querétaro, México, con más de 33 años de experiencia respaldando nuestro trabajo.",
              "Nuestro compromiso es garantizar que cada cliente obtenga el mejor precio, con rapidez y seguridad, asegurando la máxima rentabilidad de sus operaciones inmobiliarias y la mayor optimización en sus inversiones.",
              "Nos especializamos en la comercialización de bienes raíces en venta y renta de todo tipo en la Ciudad de Querétaro.",
            ]}
          />

          <WhatWeDoLazy
            imageSrc="know.png"
            instagramUrl="https://instagram.com/tu_cuenta"
            facebookUrl="https://facebook.com/tu_pagina"
          />

        <Viewport>
          <HomePropertiesLazy />
        </Viewport>
        <div id="servicios" />
        <Viewport>
          <ServicesGridLazy />
        </Viewport>

      </main>
      </Layout>
    </>
  );
}
