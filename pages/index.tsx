import Head from 'next/head';
import Layout from 'components/Layout';
import Hero from 'components/Hero';
import dynamic from 'next/dynamic';
import { PropsWithChildren, useEffect, useRef, useState } from 'react';

const DualCTASectionLazy = dynamic(() => import('components/DualCTASection'), { ssr: false, loading: () => null });
const AboutShowcaseLazy = dynamic(() => import('components/AboutShowcase'), { ssr: true, loading: () => null });
const WhatWeDoLazy = dynamic(() => import('components/WhatWeDo'), { ssr: true, loading: () => null });
const HomePropertiesLazy = dynamic(() => import('components/HomeProperties'), { ssr: false, loading: () => null });

function Viewport({ children, rootMargin = '300px 0px' }: PropsWithChildren<{ rootMargin?: string }>) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (show) return;
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver((entries) => { const e = entries[0]; if (e?.isIntersecting) { setShow(true); io.disconnect(); } }, { rootMargin });
    io.observe(el); return () => io.disconnect();
  }, [show, rootMargin]);
  return <div ref={ref}>{show ? children : null}</div>;
}

export default function HomePage() {
  const title = 'Propiedades en venta y renta — Sayro Bienes Raíces';
  const description = 'Encuentra tu próxima propiedad con atención personalizada y procesos claros.';
  return (
    <Layout>
      <Head>
        <title>{title}</title>
        <meta name='description' content={description} />
      </Head>
      <main id='contenido'>
        <Hero />
        <Viewport><DualCTASectionLazy /></Viewport>
        <AboutShowcaseLazy imageSrc='/about.png' imageAlt='Fachada' title='¿Quiénes somos?' paragraphs={[
          'Somos una empresa líder en el sector inmobiliario de Querétaro.',
          'Garantizamos el mejor precio, con rapidez y seguridad.',
          'Especialistas en venta y renta de todo tipo de inmuebles.',
        ]} />
        <WhatWeDoLazy imageSrc='/know.png' />
        <Viewport><HomePropertiesLazy items={[]} /></Viewport>
      </main>
    </Layout>
  );
}

export async function getServerSideProps() { return { props: {} }; }
