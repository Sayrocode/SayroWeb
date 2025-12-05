// components/Hero.tsx
import {
  Box,
  Container,
  Heading,
  Text,
  Button,
  VStack,
} from "@chakra-ui/react";
import { motion } from "framer-motion";
import NextLink from "next/link";
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import Image from 'next/image';

const MotionBox = motion(Box);

type HeroProps = {
  backgroundUrl?: string;
  title?: string;
  subtitle?: string;
  ctaLabel?: string;
  ctaHref?: string;
};

export default function Hero({
  backgroundUrl = "/hero.png",
  title = "Sayro Bienes Raíces",
  subtitle = "El mejor precio, rápido y seguro.",
  ctaLabel = "Ver propiedades",
  ctaHref = "/propiedades",
}: HeroProps) {
  const router = useRouter();
  // Prefetch catálogo para clic instantáneo
  useEffect(() => {
    try { router.prefetch('/propiedades'); } catch {}
  }, [router]);
  // Tinte verde + leve oscurecido para legibilidad
 // Verde MUY transparente + contraste con negro
 const overlay =
 "linear-gradient(0deg, rgba(6,78,59,.08), rgba(6,78,59,.08)), \
  linear-gradient(180deg, rgba(0,0,0,.10) 0%, rgba(0,0,0,.18) 45%, rgba(0,0,0,.28) 100%), \
  radial-gradient(1600px 600px at 50% 20%, rgba(0,0,0,.04) 0%, transparent 70%)";
  return (
    <header id="hero" role="banner" aria-label="Hero Sayro Bienes Raíces">
      <Box position="relative" minH={{ base: "80vh", md: "100vh" }} display="flex" alignItems="center" overflow="hidden">
        {/* Imagen LCP optimizada */}
        <Box position="absolute" inset={0} zIndex={0} aria-hidden>
          <Image
            src={backgroundUrl}
            alt=""
            fill
            priority
            fetchPriority="high"
            sizes="100vw"
            style={{ objectFit: 'cover', objectPosition: 'center' }}
          />
          {/* Overlays para legibilidad (replican el bgImage anterior) */}
          <Box position="absolute" inset={0} pointerEvents="none" sx={{ backgroundImage: overlay, backgroundRepeat: 'no-repeat', backgroundSize: 'cover', backgroundPosition: 'center' }} />
        </Box>
        <Container maxW="7xl">
          <VStack
            spacing={{ base: 4, md: 6 }}
            align="center"
            textAlign="center"
            position="relative"
            zIndex={1}
          >
            <MotionBox
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              <Heading
                as="h1"
                textTransform="uppercase"
                color="#013927"
                fontWeight="extrabold"
                fontSize={{ base: "4xl", md: "6xl", lg: "7xl" }}
                letterSpacing="wide"
                lineHeight={1.1}
                // sombra marcada para parecerse al ejemplo
                textShadow="0 2px 20px rgba(0,0,0,0.65), 0 0 10px rgba(255,255,255,0.15)"
                // Usa Binggo Wood si está disponible; si no, cae a Cinzel
                fontFamily="'Binggo Wood', heading"
              >
                {title}
              </Heading>

              <Text
                mt={{ base: 2, md: 3 }}
                color="whiteAlpha.900"
                fontSize={{ base: "md", md: "lg" }}
                textTransform="uppercase"
                letterSpacing="widest"
                className="text-shiny-white"
              >
                {subtitle}
              </Text>
            </MotionBox>

            <Button
              as={NextLink}
              href={ctaHref || "/propiedades"}
              variant="link"
              color="whiteAlpha.900"
              fontWeight="semibold"
              letterSpacing="widest"
              fontSize="sm"
              mt={{ base: 1, md: 2 }}
              _hover={{ opacity: 0.9, textDecoration: "none" }}
              className="text-shiny-white"
            >
              {ctaLabel}
            </Button>
          </VStack>
        </Container>
      </Box>
    </header>
  );
}
