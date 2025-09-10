import { ReactNode } from "react";
import Head from "next/head";
import { Box } from "@chakra-ui/react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import { useRouter } from "next/router";
import dynamic from 'next/dynamic';
const ContactWidget = dynamic(() => import('./ContactWidget'), { ssr: false });

type Props = {
  children: ReactNode;
  title?: string;
};

export default function Layout({ children, title }: Props) {
  const router = useRouter();
  const isHome = router.pathname === "/";
  return (
    <>
      <Head>
        <title>{title || "Sayro Bienes Raíces"}</title>
        <meta name="description" content="El mejor precio, rápido y seguro." />
        {/* Fuentes: Cinzel (titulares) + Montserrat (texto) */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cinzel:wght@700;800;900&family=Montserrat:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
      </Head>
      <Box minH="100vh" display="flex" flexDirection="column">
        <Navbar />
        {/* En home, sin padding-top para que el hero quede debajo de la navbar fija
            En otras páginas, reservamos espacio para que el contenido no quede oculto */}
        <Box as="main" flex="1" pt={{ base: isHome ? 0 : 14, md: isHome ? 0 : 16 }}>
          {children}
        </Box>
        <Footer />
        <ContactWidget />
      </Box>
    </>
  );
}
