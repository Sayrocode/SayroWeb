import Head from "next/head";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState, PropsWithChildren } from "react";
import { Box } from "@chakra-ui/react";
import Hero from "../components/Hero"; // above-the-fold: keep static
import type { GetServerSideProps } from "next";
import { HomepageContent, defaultHomepageContent } from "../lib/homepage-content";
import { getHomepageContentFromDb } from "../lib/homepage-content.server";

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

type Props = {
  homepageContent: HomepageContent;
};

export default function HomePage({ homepageContent }: Props) {
  const title = "Propiedades en venta y renta — Sayro Bienes Raíces";
  const description =
    "Encuentra tu próxima propiedad con Sayro Bienes Raíces. Inventario actualizado, atención personalizada y procesos claros.";
  const isIpad = useIsIpad();
  const content = homepageContent || defaultHomepageContent;
  const { hero, dualCta, about, whatWeDo, contact } = content;

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

        <Hero
          backgroundUrl={hero.backgroundUrl}
          title={hero.title}
          subtitle={hero.subtitle}
          ctaLabel={hero.ctaLabel}
          ctaHref={hero.ctaHref}
        />

      
        <Viewport>
          <DualCTASectionLazy
            heading={dualCta.heading}
            advertiseTitle={dualCta.advertiseTitle}
            advertiseHref={dualCta.advertiseHref}
            advertiseImage={dualCta.advertiseImage}
            acquireTitle={dualCta.acquireTitle}
            acquireHref={dualCta.acquireHref}
            acquireImage={dualCta.acquireImage}
          />
        </Viewport>

          <AboutShowcaseLazy
            anchorId={about.anchorId}
            imageSrc={about.imageSrc}
            imageAlt={about.imageAlt}
            logoSrc={about.logoSrc}
            logoAlt={about.logoAlt}
            title={about.title}
            ipad={isIpad}
            fullScreen={isIpad}
            desktopMaxShift={isIpad ? 100 : undefined as any}
            mobileMaxShift={isIpad ? 58 : undefined as any}
            paragraphs={about.paragraphs}
          />

          <WhatWeDoLazy
            leftTitle={whatWeDo.leftTitle}
            leftBodyTop={whatWeDo.leftBodyTop}
            rightTitle={whatWeDo.rightTitle}
            rightBody={whatWeDo.rightBody}
            ctaHref={whatWeDo.ctaHref}
            ctaText={whatWeDo.ctaText}
            imageSrc={whatWeDo.imageSrc}
            imageAlt={whatWeDo.imageAlt}
            imageObjectPosition={whatWeDo.imageObjectPosition}
            instagramUrl={whatWeDo.instagramUrl}
            facebookUrl={whatWeDo.facebookUrl}
            brandName={whatWeDo.brandName}
            reverseDesktop={whatWeDo.reverseDesktop}
          />

        <HomePropertiesLazy />
        <ServicesGridLazy ipad={isIpad} fullScreen={isIpad} cardScale={isIpad ? 1.15 : 1} />

        {/* Contacto: sección específica del home, debajo de servicios */}
        <Viewport forceId="contacto">
          <HomeContactSectionLazy
            heading={contact.heading}
            name={contact.name}
            role={contact.role}
            addressLines={contact.addressLines}
            phone={contact.phone}
            schedule={contact.schedule}
            directorImage={contact.directorImage}
            buildingImage={contact.buildingImage}
            facebookUrl={contact.facebookUrl}
            instagramUrl={contact.instagramUrl}
          />
        </Viewport>

      </main>
      </Layout>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async () => {
  const homepageContent = await getHomepageContentFromDb();
  return { props: { homepageContent } };
};
