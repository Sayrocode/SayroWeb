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
  Image as ChakraImage,
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

  /** Parallax SUAVE, sin espacios blancos */
  const imgRef = useRef<HTMLImageElement | null>(null);
  const sectionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (prefersReduced) return;
  
    const section = sectionRef.current;
    const img = imgRef.current;
    if (!section || !img) return;
  
    const FROM = -40; // inicia ARRIBA (-40px)
    const TO = 40;    // termina ABAJO (+40px)
  
    const update = () => {
      const r = section.getBoundingClientRect();
      const vh = window.innerHeight || 1;
  
      // progreso 0..1 mientras la sección entra y sale del viewport
      const progress = Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height)));
  
      // ahora se mueve de -40px a +40px (baja)
      const translate = FROM + progress * (TO - FROM);
      img.style.transform = `translateY(${translate}px) scale(1.08)`;
    };
  
    update();
  
    const io = new IntersectionObserver(update, {
      threshold: Array.from({ length: 11 }, (_, i) => i / 10),
    });
    io.observe(section);
  
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
  
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [prefersReduced]);
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
    <Box
      as="section"
      id={id}
      ref={sectionRef}
      w="100vw"
      position="relative"
      left="50%"
      right="50%"
      ml="-50vw"
      mr="-50vw"
      /* sin padding/márgenes para que quede pegado a los bordes */
    >
      <Grid
        templateColumns={{ base: "1fr", md: "1fr 1fr" }}
        gap={0}
        alignItems="stretch"
        minH={{ base: "70vh", md: "80vh" }}
      >
        {/* Lado IZQUIERDO (verde), sin bordes ni espacios */}
        <GridItem position="relative" overflow="hidden">
          <ChakraImage
            ref={imgRef}
            src={imageSrc}
            alt={imageAlt}
            w="100%"
            h="100%"
            objectFit="cover"
            objectPosition={imageObjectPosition}
            transform="scale(1.06)"          // un pelín de zoom para que el parallax no deje bordes
            transition="transform .2s ease-out"
            willChange="transform"
            draggable={false}
          />
          {/* Sombreado sutil inferior para contraste */}
          <Box position="absolute" inset={0} bgGradient="linear(to-b, transparent, rgba(0,0,0,.22))" />
        </GridItem>
       

        {/* Lado DERECHO (IMAGEN) — full-bleed con parallax */}
        <GridItem
          bg={green}
          color="white"
          display="flex"
          flexDir="column"
          justifyContent="center"
          px={{ base: 6, md: 12 }}
          py={{ base: 10, md: 10 }}
          position="relative"
        >
          <Stack spacing={{ base: 6, md: 7 }} align="center" textAlign="center" maxW="56ch" mx="auto">
            <Stack spacing={2}>
              <Heading
                as="h2"
                fontFamily="'DM Serif Display', ui-serif, Georgia, serif"
                fontWeight="400"
                fontSize={{ base: "xl", md: "2xl" }}
                letterSpacing="-0.01em"
              >
                {leftTitle}
              </Heading>
              <Text fontSize={{ base: "sm", md: "md" }} lineHeight={1.9} opacity={0.98}>
                {leftBodyTop}
              </Text>
            </Stack>

            <Stack spacing={2}>
              <Heading
                as="h3"
                fontFamily="'DM Serif Display', ui-serif, Georgia, serif"
                fontWeight="400"
                fontSize={{ base: "xl", md: "2xl" }}
                letterSpacing="-0.01em"
              >
                {rightTitle}
              </Heading>
              <Text fontSize={{ base: "sm", md: "md" }} lineHeight={1.9} opacity={0.98}>
                {rightBody}
              </Text>
            </Stack>

            <Button
              as={NextLink}
              href={ctaHref}
              variant="outline"
              borderColor="whiteAlpha.700"
              color="white"
              _hover={{ bg: "white", color: green }}
              rounded="md"
              px={8}
            >
              {ctaText}
            </Button>
          </Stack>

          {/* Redes, pegadas a la ESQUINA inferior izquierda */}
          <HStack spacing={4} position="absolute" left={{ base: 6, md: 12 }} bottom={{ base: 6, md: 8 }}>
            <IconButton
              as={NextLink}
              href={facebookUrl}
              aria-label="Facebook"
              icon={<FaFacebookF />}
              variant="ghost"
              color="whiteAlpha.900"
              _hover={{ color: "white" }}
              size="lg"
            />
            <IconButton
              as={NextLink}
              href={instagramUrl}
              aria-label="Instagram"
              icon={<FaInstagram />}
              variant="ghost"
              color="whiteAlpha.900"
              _hover={{ color: "white" }}
              size="lg"
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
