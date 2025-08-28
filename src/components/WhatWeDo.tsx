// components/WhatWeDoFullBleed.tsx
import NextLink from "next/link";
import {
  Box,
  Grid,
  GridItem,
  Heading,
  Text,
  Stack,
  Button,
  HStack,
  IconButton,
  VisuallyHidden,
  useColorModeValue,
  usePrefersReducedMotion,
  useBreakpointValue,
  Image as ChakraImage,
  Link,
} from "@chakra-ui/react";
import { FaInstagram, FaFacebookF } from "react-icons/fa";
import { useEffect, useMemo, useRef } from "react";

type WhatWeDoProps = {
  id?: string;
  leftTitle?: string;
  leftBodyTop?: string;
  rightTitle?: string;
  rightBody?: string;
  ctaHref?: string;
  ctaText?: string;
  imageSrc: string;
  imageAlt?: string;
  imageObjectPosition?: string; // ej. "center right"
  instagramUrl?: string;
  facebookUrl?: string;
  brandName?: string; // para JSON-LD
};

export default function WhatWeDoFullBleed({
  id = "que-hacemos",
  leftTitle = "¿Qué hacemos?",
  leftBodyTop = "Brindamos asesoría profesional y personalizada a particulares y empresas interesadas en comprar, vender o rentar inmuebles en Querétaro.",
  rightTitle = "¿Cómo lo hacemos?",
  rightBody = "Ofrecemos un servicio integral que proporciona seguridad, confianza y acompañamiento en cada etapa del proceso inmobiliario, ya sea en la compra, venta o renta de su propiedad. Contamos con uno de los inventarios más amplios de inmuebles en Querétaro. Y si no tenemos lo que busca, lo encontramos por usted.",
  ctaHref = "/contacto",
  ctaText = "Contáctanos",
  imageSrc,
  imageAlt = "Atención profesional inmobiliaria",
  imageObjectPosition = "center right",
  instagramUrl = "https://www.instagram.com/",
  facebookUrl = "https://www.facebook.com/",
  brandName = "Sayro Bienes Raíces",
}: WhatWeDoProps) {
  const green = useColorModeValue("#0E3B30", "#0E3B30");
  const prefersReduced = usePrefersReducedMotion();
  const amplitude = useBreakpointValue({ base: 18, md: 32, lg: 48 }) || 24;
  const imgRef = useRef<HTMLImageElement | null>(null);
  const sectionRef = useRef<HTMLDivElement | null>(null);

  /** Parallax SUAVE y responsive (usa rAF + amplitud por breakpoint) */
  useEffect(() => {
    if (prefersReduced) return;
    const section = sectionRef.current;
    const img = imgRef.current;
    if (!section || !img) return;

    const FROM = -amplitude;
    const TO = amplitude;
    let raf = 0;

    const update = () => {
      const r = section.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      const progress = Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height)));
      const translate = FROM + progress * (TO - FROM);
      // Variables CSS para evitar layout thrash
      img.style.setProperty("--y", `${translate}px`);
      img.style.setProperty("--s", "1.08");
      raf = 0;
    };

    const onScrollOrResize = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    update();

    const io = new IntersectionObserver(onScrollOrResize, {
      threshold: Array.from({ length: 11 }, (_, i) => i / 10),
    });
    io.observe(section);

    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize);

    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [prefersReduced, amplitude]);

  /** JSON-LD para SEO */
  const jsonLd = useMemo(
    () =>
      ({
        "@context": "https://schema.org",
        "@type": "AboutPage",
        name: `${brandName} — ¿Qué hacemos?`,
        description: `${leftBodyTop} ${rightBody}`,
      } as const),
    [brandName, leftBodyTop, rightBody]
  );

  return (
    <Box as="section" id={id} ref={sectionRef} w="auto" position="relative">
      <Grid
        templateColumns={{ base: "1fr", md: "1fr 1fr" }}
        gap={0}
        // En móvil dejamos que crezca natural; en desktop pedimos altura generosa
        minH={{ base: "auto", md: "80vh" }}
      >
        {/* IMAGEN full-bleed con parallax */}
        <GridItem
          position="relative"
          overflow="hidden"
          // altura agradable en móvil con clamp
          h={{ base: "clamp(260px, 50vh, 420px)", md: "auto" }}
        >
          <ChakraImage
            ref={imgRef}
            src={imageSrc}
            alt={imageAlt}
            w="100%"
            h="100%"
            objectFit="cover"
            objectPosition={{
              base: "center",
              md: imageObjectPosition,
            }}
            // Usamos variables CSS para el parallax
            style={{
              transform:
                "translate3d(0, var(--y, 0), 0) scale(var(--s, 1.06))",
            }}
            transition="transform .2s ease-out"
            willChange="transform"
            draggable={false}
          />
          <Box
            position="absolute"
            inset={0}
            bgGradient="linear(to-b, transparent, rgba(0,0,0,.22))"
            pointerEvents="none"
          />
        </GridItem>

        {/* CONTENIDO */}
        <GridItem
          bg={green}
          color="white"
          display="flex"
          flexDir="column"
          justifyContent="center"
          px={{ base: 6, md: 10, lg: 12 }}
          py={{ base: 10, md: 12 }}
          position="relative"
        >
          <Stack
            spacing={{ base: 6, md: 7 }}
            align={{ base: "center", md: "start", lg: "center" }}
            textAlign={{ base: "center", md: "left", lg: "center" }}
            maxW={{ base: "unset", md: "56ch" }}
            mx="auto"
          >
            {/* acento superior para impacto en móvil */}
            <Box
              display={{ base: "block", md: "none" }}
              w="56px"
              h="2px"
              bg="green.300"
              borderRadius="full"
            />

            <Stack spacing={2}>
              <Heading
                as="h2"
                fontFamily="'DM Serif Display', ui-serif, Georgia, serif"
                fontWeight="400"
                fontSize={{ base: "2xl", md: "3xl" }}
                letterSpacing="-0.01em"
              >
                {leftTitle}
              </Heading>
              <Text fontSize={{ base: "md", md: "md" }} lineHeight={1.8} opacity={0.98}>
                {leftBodyTop}
              </Text>
            </Stack>

            <Stack spacing={2}>
              <Heading
                as="h3"
                fontFamily="'DM Serif Display', ui-serif, Georgia, serif"
                fontWeight="400"
                fontSize={{ base: "2xl", md: "3xl" }}
                letterSpacing="-0.01em"
              >
                {rightTitle}
              </Heading>
              <Text fontSize={{ base: "md", md: "md" }} lineHeight={1.8} opacity={0.98}>
                {rightBody}
              </Text>
            </Stack>

            <Button
              as={NextLink}
              href={ctaHref}
              variant="solid"
              bg="white"
              color={green}
              _hover={{ bg: "whiteAlpha.900" }}
              rounded="md"
              px={8}
              size="lg"
              w={{ base: "full", sm: "auto" }} // CTA ancho completo en móvil
            >
              {ctaText}
            </Button>

            {/* Redes: visibles dentro del flujo en móvil */}
            <HStack spacing={4} display={{ base: "flex", md: "none" }}>
              <IconButton
                as={Link}
                href={facebookUrl}
                aria-label="Facebook"
                icon={<FaFacebookF />}
                variant="ghost"
                color="whiteAlpha.900"
                _hover={{ color: "white" }}
                size="lg"
                isExternal
              />
              <IconButton
                as={Link}
                href={instagramUrl}
                aria-label="Instagram"
                icon={<FaInstagram />}
                variant="ghost"
                color="whiteAlpha.900"
                _hover={{ color: "white" }}
                size="lg"
                isExternal
              />
            </HStack>
          </Stack>

          {/* Redes pegadas a la esquina en desktop */}
          <HStack
            spacing={4}
            position="absolute"
            left={{ md: 10, lg: 12 }}
            bottom={{ md: 8 }}
            display={{ base: "none", md: "flex" }}
          >
            <IconButton
              as={Link}
              href={facebookUrl}
              aria-label="Facebook"
              icon={<FaFacebookF />}
              variant="ghost"
              color="whiteAlpha.900"
              _hover={{ color: "white" }}
              size="lg"
              isExternal
            />
            <IconButton
              as={Link}
              href={instagramUrl}
              aria-label="Instagram"
              icon={<FaInstagram />}
              variant="ghost"
              color="whiteAlpha.900"
              _hover={{ color: "white" }}
              size="lg"
              isExternal
            />
          </HStack>
        </GridItem>
      </Grid>

      {/* SEO helper */}
      <VisuallyHidden aria-hidden="true">
        <script
          type="application/ld+json"
          // @ts-ignore
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </VisuallyHidden>
    </Box>
  );
}
