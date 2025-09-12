import { ReactNode } from "react";
import Head from "next/head";
import { Box } from "@chakra-ui/react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import { useRouter } from "next/router";
import dynamic from 'next/dynamic';
const ContactWidget = dynamic(() => import('./ContactWidget'), { ssr: false });
import { Cinzel, Montserrat } from 'next/font/google';

const cinzel = Cinzel({ subsets: ['latin'], weight: ['700','800','900'], display: 'swap', variable: '--font-cinzel' });
const montserrat = Montserrat({ subsets: ['latin'], weight: ['500','600','700'], display: 'swap', variable: '--font-montserrat' });

type Props = {
  children: ReactNode;
  title?: string;
};

export default function Layout({ children, title }: Props) {
  const router = useRouter();
  const isHome = router.pathname === "/";
  // Mostrar widget en el sitio público; ocultarlo sólo en el área admin
  const hideContactWidget = router.pathname.startsWith('/admin');
  return (
    <>
      <Head>
        <title>{title || "Sayro Bienes Raíces"}</title>
        <meta name="description" content="El mejor precio, rápido y seguro." />
        {/* Fuentes con next/font (Cinzel/Montserrat) — sin CSS bloqueante */}
        {/* Preconexión a dominios de imágenes para acelerar LCP */}
        <link rel="preconnect" href="https://assets.easybroker.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="//assets.easybroker.com" />
        {/* Preload del logo si aparece encima del doblez */}
        <link rel="preload" as="image" href="/sayrologo.png" />
      </Head>
      <Box minH="100vh" display="flex" flexDirection="column" className={`${cinzel.variable} ${montserrat.variable}`}>
        <Navbar />
        {/* En home, sin padding-top para que el hero quede debajo de la navbar fija
            En otras páginas, reservamos espacio para que el contenido no quede oculto */}
        <Box as="main" flex="1" pt={{ base: isHome ? 0 : 14, md: isHome ? 0 : 16 }}>
          {children}
        </Box>
        <Footer />
        {!hideContactWidget && <ContactWidget />}
      </Box>
    </>
  );
}
