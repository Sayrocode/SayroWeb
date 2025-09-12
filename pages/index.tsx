import Head from "next/head";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState, PropsWithChildren } from "react";
import { Box } from "@chakra-ui/react";
import Hero from "../components/Hero"; // above-the-fold: keep static

// Reemplaza PropertyCategories por grid de servicios
const ServicesGridLazy = dynamic(() => import("components/ServicesGrid"), { ssr: true, loading: () => null });
import Layout from "components/Layout";
import { useIsIpad } from "utils/device";

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
const HomeContactSectionLazy = dynamic(() => import("components/HomeContactSection"), {
  ssr: true,
  loading: () => null,
});

// Mount children only when they enter the viewport to avoid loading their chunks early
// If `forceId` matches the current location hash, mount immediately (useful for anchor targets)
function Viewport({ children, rootMargin = "300px 0px", forceId }: PropsWithChildren<{ rootMargin?: string; forceId?: string }>) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (typeof window !== 'undefined' && forceId && window.location.hash === `#${forceId}`) {
      setShow(true);
      return;
    }
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
    const onHash = () => {
      if (typeof window === 'undefined' || !forceId) return;
      if (window.location.hash === `#${forceId}`) setShow(true);
    };
    const onShowSection = (ev: any) => {
      if (!forceId) return;
      try {
        if (ev?.detail?.id === forceId) setShow(true);
      } catch {}
    };
    window.addEventListener('hashchange', onHash);
    window.addEventListener('app:show-section', onShowSection as any);
    return () => {
      io.disconnect();
      window.removeEventListener('hashchange', onHash);
      window.removeEventListener('app:show-section', onShowSection as any);
    };
  }, [show, rootMargin, forceId]);
  return <div ref={ref}>{show ? children : null}</div>;
}

export default function HomePage() {
  const title = "Propiedades en venta y renta — Sayro Bienes Raíces";
  const description =
    "Encuentra tu próxima propiedad con Sayro Bienes Raíces. Inventario actualizado, atención personalizada y procesos claros.";
  const isIpad = useIsIpad();

  // Reintento robusto de scroll a hash tras montaje y posibles cargas diferidas
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash?.slice(1);
    if (!hash) return;
    let attempts = 0;
    const maxAttempts = 25; // ~2.5s @ 100ms para cubrir loader
    const tryScroll = () => {
      const el = document.getElementById(hash);
      if (el) {
        // Fallback robusto con offset por navbar fija
        const md = typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(min-width: 48em)').matches;
        const headerOffset = md ? 64 : 56;
        const y = el.getBoundingClientRect().top + (window.pageYOffset || document.documentElement.scrollTop) - headerOffset;
        try { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch {}
        try { window.scrollTo({ top: y, behavior: 'smooth' }); } catch {}
      } else if (attempts < maxAttempts) {
        attempts += 1;
        setTimeout(tryScroll, 100);
      }
    };
    requestAnimationFrame(tryScroll);
    const onRouteDone = () => {
      // reintenta cuando el overlay global se oculta
      attempts = 0;
      tryScroll();
    };
    window.addEventListener('app:route-loading-done', onRouteDone as any);
    return () => window.removeEventListener('app:route-loading-done', onRouteDone as any);
  }, []);

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

          <AboutShowcaseLazy
            anchorId="nosotros"
            imageSrc="/about.png"
            imageAlt="Fachada curvada"
            logoSrc="/logos/sayro-sello-blanco.svg"
            logoAlt="SR · Sayro Bienes Raíces S.A. de C.V."
            title="¿Quiénes somos?"
            ipad={isIpad}
            fullScreen={isIpad}
            desktopMaxShift={isIpad ? 100 : undefined as any}
            mobileMaxShift={isIpad ? 58 : undefined as any}
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

        <HomePropertiesLazy />
        <ServicesGridLazy ipad={isIpad} fullScreen={isIpad} cardScale={isIpad ? 1.15 : 1} />

        {/* Contacto: sección específica del home, debajo de servicios */}
        <Viewport forceId="contacto">
          <HomeContactSectionLazy />
        </Viewport>

      </main>
      </Layout>
    </>
  );
}
