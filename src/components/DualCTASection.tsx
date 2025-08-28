// components/DualCTASection.tsx
import NextLink from "next/link";
import {
  Box,
  Container,
  Heading,
  SimpleGrid,
  Text,
  AspectRatio,
  Image as ChakraImage,
  useColorModeValue,
  VisuallyHidden,
  usePrefersReducedMotion,
  useBreakpointValue,
  Link,
  Stack,
} from "@chakra-ui/react";
import { useEffect, useMemo, useRef } from "react";

type AnyRef<T> =
  | React.RefObject<T | null>
  | React.MutableRefObject<T | null>;

type CardProps = {
  title: string;
  href: string;
  imgSrc: string;
  imgAlt?: string;
  subtitle?: string;
  /** Intensidad (0.1 – 0.6 aprox) */
  strength: number;
  /** Amplitud base por breakpoint */
  amplitude: number;
  /** Dirección: -1 sube, +1 baja */
  dir: number;
  /** Respeta preferencias del usuario */
  prefersReduced: boolean;
};

function useCardParallax(
  containerRef: AnyRef<HTMLDivElement>,
  imgRef: AnyRef<HTMLImageElement>,
  {
    strength,
    amplitude,
    dir,
    prefersReduced,
  }: { strength: number; amplitude: number; dir: number; prefersReduced: boolean }
) {
  useEffect(() => {
    const el = containerRef.current;
    const img = imgRef.current;
    if (!el || !img) return;

    if (prefersReduced) {
      img.style.setProperty("--y", "0px");
      img.style.setProperty("--s", "1.06");
      return;
    }

    let raf = 0;
    const update = () => {
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      const centerDelta = r.top + r.height / 2 - vh / 2;
      const progress = centerDelta / vh; // ~ -1..1
      const offset = progress * amplitude * (strength * 3.5) * dir;

      img.style.setProperty("--y", `${offset}px`);
      img.style.setProperty("--s", "1.06");
      raf = 0;
    };

    const onScrollResize = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    update();

    const io = new IntersectionObserver(onScrollResize, {
      threshold: Array.from({ length: 11 }, (_, i) => i / 10),
    });
    io.observe(el);

    window.addEventListener("scroll", onScrollResize, { passive: true });
    window.addEventListener("resize", onScrollResize);

    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScrollResize);
      window.removeEventListener("resize", onScrollResize);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [containerRef, imgRef, strength, amplitude, dir, prefersReduced]);
}

function ClickCard({
  title,
  href,
  imgSrc,
  imgAlt,
  subtitle,
  strength,
  amplitude,
  dir,
  prefersReduced,
}: CardProps) {
  const ring = useColorModeValue("white", "whiteAlpha.700");
  const cardRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useCardParallax(cardRef, imgRef, { strength, amplitude, dir, prefersReduced });

  return (
    <Box
      ref={cardRef}
      as={NextLink}
      href={href}
      role="group"
      aria-label={title}
      position="relative"
      rounded="xl"
      overflow="hidden"
      outline="0"
      _focusVisible={{ boxShadow: `0 0 0 4px ${ring}` }}
      _hover={{ transform: "translateY(-2px)" }}
      transition="transform 160ms ease, box-shadow 160ms ease"
    >
      <AspectRatio ratio={{ base: 1, sm: 4 / 3 }}>
        <ChakraImage
          ref={imgRef}
          src={imgSrc}
          alt={imgAlt || title}
          objectFit="cover"
          loading="lazy"
          referrerPolicy="no-referrer"
          style={{ transform: "translate3d(0, var(--y, 0px), 0) scale(var(--s, 1.06))" }}
          transition="transform 60ms linear"
          willChange="transform"
          draggable={false}
        />
      </AspectRatio>

      {/* Overlay */}
      <Box
        pointerEvents="none"
        position="absolute"
        inset={0}
        bg="blackAlpha.450"
        transition="background .18s ease, backdrop-filter .18s ease"
        _groupHover={{ bg: "blackAlpha.600", backdropFilter: "saturate(130%) blur(1px)" }}
      />

      {/* Texto */}
      <Box pointerEvents="none" position="absolute" inset={0} display="grid" placeItems="center" textAlign="center" px={4}>
        <Box>
          <Heading
            as="h3"
            fontSize={{ base: "2xl", md: "3xl" }}
            color="blackAlpha.800"
            letterSpacing="widest"
            textTransform="uppercase"
            fontWeight="black"
            lineHeight="1.1"
            textShadow="0 2px 16px rgba(0,0,0,.35)"
          >
            {title}
          </Heading>
          {subtitle && (
            <Text mt={2} color="blackAlpha.800" fontSize={{ base: "sm", md: "md" }}>
              {subtitle}
            </Text>
          )}
        </Box>
      </Box>
    </Box>
  );
}

type DualCTASectionProps = {
  advertiseHref?: string;
  acquireHref?: string;
  advertiseImage?: string;
  acquireImage?: string;
  parallaxStrength?: number;
  fullBleed?: boolean;
};

export default function DualCTASection({
  advertiseHref = "/#anuncia",
  acquireHref = "/#adquiere",
  advertiseImage = "/anuncia.png",
  acquireImage = "/adquiere.png",
  parallaxStrength = 0.28,
  fullBleed = false,
}: DualCTASectionProps) {
  const bg = useColorModeValue("#FBF6E9", "gray.900"); // crema
  const titleColor = useColorModeValue("black", "white");
  const prefersReduced = usePrefersReducedMotion();

  // Amplitud por breakpoint (más sutil en móvil)
  const amplitude = useBreakpointValue({ base: 14, md: 24, lg: 36 }) ?? 20;

  // Dirección coherente:
  // mobile: ambas +1 (apiladas se mueven igual)
  // desktop: izq -1 / der +1 (profundidad)
  const leftDir = useBreakpointValue({ base: 1, md: -1 }) ?? 1;
  const rightDir = useBreakpointValue({ base: 1, md: 1 }) ?? 1;

  const jsonLd = useMemo(
    () =>
      ({
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: "Anunciantes y Adquirientes",
        description: "Dos accesos rápidos: Anuncia tu propiedad y Adquiere una.",
      } as const),
    []
  );

  return (
    <Box as="section" bg={bg} py={{ base: 10, md: 14 }} px={fullBleed ? 0 : undefined}>
      <Container maxW="7xl" px={fullBleed ? 0 : { base: 4, md: 6 }}>
      <Stack align="center" spacing={4} mb={{ base: 8, md: 10 }}>
  <Heading
    as="p"
    textAlign="center"
    fontFamily="'DM Serif Display', ui-serif, Georgia, serif"
    fontWeight="400"
    fontSize={{ base: "2xl", md: "3xl", lg: "4xl" }}
    letterSpacing="-0.005em"
    lineHeight={1.15}
    textTransform="none"
    bgGradient="linear(to-r, green.700, green.400)"
    bgClip="text"
  >
   ANUNCIANTES Y ADQUIRIENTES
  </Heading>

  <Box
    w="full"
    maxW="520px"
    h="1px"
    bgGradient="linear(to-r, transparent, blackAlpha.200, transparent)"
  />
</Stack>

        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={{ base: 4, md: 8 }}>
          <ClickCard
            title="Anuncia"
            href={advertiseHref}
            imgSrc={advertiseImage}
            imgAlt="Anuncia tu propiedad"
            subtitle="Publica con nosotros y llega a más compradores"
            strength={parallaxStrength}
            amplitude={amplitude}
            dir={leftDir}
            prefersReduced={prefersReduced}
          />
          <ClickCard
            title="Adquiere"
            href={acquireHref}
            imgSrc={acquireImage}
            imgAlt="Encuentra tu próxima propiedad"
            subtitle="Explora inmuebles seleccionados para ti"
            strength={parallaxStrength}
            amplitude={amplitude}
            dir={rightDir}
            prefersReduced={prefersReduced}
          />
        </SimpleGrid>

        {/* SEO / accesibilidad */}
        <VisuallyHidden>
          <Text>Sección con dos accesos: Anuncia y Adquiere.</Text>
        </VisuallyHidden>
        <VisuallyHidden as={Link} href={advertiseHref}>Ir a Anuncia</VisuallyHidden>
        <VisuallyHidden as={Link} href={acquireHref}>Ir a Adquiere</VisuallyHidden>

        {/* JSON-LD */}
        <VisuallyHidden aria-hidden="true">
          <script
            type="application/ld+json"
            // @ts-ignore
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />
        </VisuallyHidden>
      </Container>
    </Box>
  );
}
