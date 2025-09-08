// components/WhatWeDo.tsx
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
  usePrefersReducedMotion,
  useBreakpointValue,
  Image as ChakraImage,
  Link,
} from "@chakra-ui/react";
import { FaInstagram, FaFacebookF } from "react-icons/fa";
import { useEffect, useMemo, useRef, useState } from "react";

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

export default function WhatWeDo({
  id = "que-hacemos",
  leftTitle = "¿Qué hacemos?",
  leftBodyTop =
    "Brindamos asesoría profesional y personalizada a particulares y empresas interesadas en comprar, vender o rentar inmuebles en Querétaro.",
  rightTitle = "¿Cómo lo hacemos?",
  rightBody =
    "Ofrecemos un servicio integral que proporciona seguridad, confianza y acompañamiento en cada etapa del proceso inmobiliario, ya sea en la compra, venta o renta de su propiedad. Nuestro valor agregado: contamos con uno de los inventarios más amplios de inmuebles en Querétaro. Y si no tenemos lo que busca, lo encontramos por usted.",
  ctaHref = "/contacto",
  ctaText = "Contáctanos",
  imageSrc,
  imageAlt = "Atención profesional inmobiliaria",
  imageObjectPosition = "center right",
  instagramUrl = "https://www.instagram.com/",
  facebookUrl = "https://www.facebook.com/",
  brandName = "Sayro Bienes Raíces",
}: WhatWeDoProps) {
  const green = "#013927";
  const prefersReduced = usePrefersReducedMotion();
  const amplitude = useBreakpointValue({ base: 18, md: 32, lg: 48 }) || 24;
  const imgRef = useRef<HTMLImageElement | null>(null);
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const [revealed, setRevealed] = useState(false);

  // Parallax suave para la imagen (solo si el usuario no lo desactiva)
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

  // Aparición suave del contenido para que el cambio entre secciones se vea más limpio
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        if (e?.isIntersecting) {
          setRevealed(true);
          io.disconnect();
        }
      },
      { rootMargin: "-40px 0px", threshold: 0.25 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // JSON-LD para SEO
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
        templateColumns={{ base: "1fr", md: "1.5fr 1fr", lg: "1.5fr 1fr" }}
        gap={0}
        minH={{ base: "auto", md: "80vh" }}
      >
        {/* Contenido a la izquierda (verde) */}
        <GridItem
          bg={green}
          color="white"
          display="flex"
          flexDir="column"
          justifyContent="center"
          px={{ base: 6, md: 10, lg: 14 }}
          py={{ base: 10, md: 14 }}
          sx={
            prefersReduced
              ? undefined
              : {
                  opacity: revealed ? 1 : 0,
                  transform: revealed ? "translateY(0)" : "translateY(18px)",
                  transition:
                    "opacity .45s ease-out, transform .55s cubic-bezier(.22,.61,.36,1)",
                  willChange: "opacity, transform",
                }
          }
        >
          <Stack spacing={{ base: 8, md: 10 }} align="center" textAlign="left" mx="auto" w="full">
            {/* Disposición “entrelazada”: cada bloque en su propia fila y alineado a lados opuestos */}
            <Box
              w="full"
              display={{ base: "block", md: "grid" }}
              gridTemplateColumns={{ md: "repeat(12, 1fr)" }}
              rowGap={{ base: 8, md: 8 }}
              columnGap={{ md: 8 }}
            >
              {/* Bloque izquierdo - Fila 1, alineado a la izquierda */}
              <Box
                gridColumn={{ md: "2 / span 7", lg: "2 / span 8" }}
                gridRow={{ md: 1 }}
                textAlign={{ base: "left", md: "left" }}
                mb={{ base: 8, md: 0 }}
              >
                <Heading
                  as="h2"
                  fontFamily="heading"
                  fontWeight="700"
                  fontSize={{ base: "1.5rem", md: "2rem" }}
                  letterSpacing=".02em"
                  lineHeight={1.15}
                >
                  {leftTitle}
                </Heading>
                <Text mt={2} fontSize={{ base: "sm", md: "md" }} lineHeight={1.9} color="whiteAlpha.900">
                  {leftBodyTop}
                </Text>
              </Box>

              {/* Bloque derecho - Fila 2, alineado a la derecha */}
              <Box
                gridColumn={{ md: "4 / -2", lg: "3 / -2" }}
                gridRow={{ md: 2 }}
                textAlign={{ base: "left", md: "right" }}
                w="full"
              >
                <Heading
                  as="h3"
                  fontFamily="heading"
                  fontWeight="700"
                  fontSize={{ base: "1.5rem", md: "2rem" }}
                  letterSpacing=".02em"
                  lineHeight={1.15}
                >
                  {rightTitle}
                </Heading>
                <Text mt={2} fontSize={{ base: "sm", md: "md" }} lineHeight={1.9} color="whiteAlpha.900">
                  {rightBody}
                </Text>
              </Box>
            </Box>

            <Button
              as={NextLink}
              href={ctaHref}
              variant="outline"
              color="white"
              borderColor="white"
              px={{ base: 6, md: 8 }}
              rounded="md"
              _hover={{ bg: "whiteAlpha.200" }}
              _active={{ bg: "whiteAlpha.300" }}
              _focusVisible={{ boxShadow: "0 0 0 3px rgba(255,255,255,.55)" }}
            >
              {ctaText.toUpperCase()}
            </Button>

            <HStack spacing={6}>
              <IconButton
                as={Link}
                href={facebookUrl}
                aria-label="Facebook"
                icon={<FaFacebookF />}
                variant="ghost"
                color="white"
                fontSize="lg"
                _hover={{ bg: "whiteAlpha.200" }}
                isExternal
              />
              <IconButton
                as={Link}
                href={instagramUrl}
                aria-label="Instagram"
                icon={<FaInstagram />}
                variant="ghost"
                color="white"
                fontSize="lg"
                _hover={{ bg: "whiteAlpha.200" }}
                isExternal
              />
            </HStack>
          </Stack>
        </GridItem>

        {/* Imagen a la derecha */}
        <GridItem position="relative" overflow="hidden" h={{ base: "clamp(260px, 50vh, 420px)", md: "auto" }}>
          <ChakraImage
            ref={imgRef}
            src={imageSrc}
            alt={imageAlt}
            w="100%"
            h="100%"
            objectFit="cover"
            objectPosition={{ base: "center", md: imageObjectPosition }}
            style={{ transform: "translate3d(0, var(--y, 0), 0) scale(var(--s, 1.06))" }}
            transition="transform .2s ease-out"
            willChange="transform"
            draggable={false}
          />
          <Box position="absolute" inset={0} bgGradient="linear(to-b, transparent, rgba(0,0,0,.22))" pointerEvents="none" />
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
