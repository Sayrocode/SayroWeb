import { ReactNode } from "react";
import Head from "next/head";
import { Box } from "@chakra-ui/react";
import Navbar from "./Navbar";
import Footer from "./Footer";

type Props = {
  children: ReactNode;
  title?: string;
};

export default function Layout({ children, title }: Props) {
  return (
    <>
      <Head>
        <title>{title || "Sayro Bienes Raíces"}</title>
        <meta name="description" content="El mejor precio, rápido y seguro." />
      </Head>
      <Box minH="100vh" display="flex" flexDirection="column">
        <Navbar />
        <Box as="main" flex="1">
          {children}
        </Box>
        <Footer />
      </Box>
    </>
  );
}
