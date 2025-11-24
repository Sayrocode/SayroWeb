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
  strength: number; // no usado (parallax desactivado)
  amplitude: number; // no usado
  dir: number; // no usado
  prefersReduced: boolean; // no usado
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

    // Evitar parallax en dispositivos táctiles (iPhone/iPad) y cuando el usuario prefiere menos movimiento
    const isCoarsePointer =
      typeof window !== 'undefined' && typeof window.matchMedia === 'function'
        ? window.matchMedia('(pointer: coarse)').matches
        : false;

    if (prefersReduced || isCoarsePointer) {
      img.style.setProperty("--y", "0px");
      img.style.setProperty("--s", "1.06");
      return;
    }

    let raf = 0;
    const update = () => {
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      // Normaliza [-1, 1] con respecto al centro de la pantalla
      const centerDelta = r.top + r.height / 2 - vh / 2;
      const norm = Math.max(-1, Math.min(1, centerDelta / (vh / 2)));
      // Movimiento reducido + zoom sutil. Mantener offset pequeño para evitar bordes.
      const sFactor = Math.max(0.12, Math.min(0.2, Math.abs(norm) * 0.12)); // 1.12..1.2 como máximo
      const scale = 1.1 + sFactor * 0.2; // ligeramente reactivo (1.1 - 1.124 aprox)
      const reducedAmp = Math.min(18, Math.max(6, amplitude));
      const reducedStrength = Math.max(0.1, Math.min(0.35, strength));
      const offset = norm * reducedAmp * reducedStrength * dir;

      img.style.setProperty("--y", `${offset.toFixed(2)}px`);
      img.style.setProperty("--s", `${scale.toFixed(3)}`);
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
  // Parallax sutil
  useCardParallax(cardRef, imgRef, { strength, amplitude, dir, prefersReduced });

  return (
    <Box
      ref={cardRef}
      as={NextLink}
      href={href}
      role="group"
      aria-label={title}
      position="relative"
      rounded="none"
      overflow="hidden"
      outline="0"
      borderWidth="1px"
      borderColor={useColorModeValue("blackAlpha.300", "whiteAlpha.400")}
      _focusVisible={{ boxShadow: `0 0 0 4px ${ring}` }}
      transition="box-shadow 160ms ease"
    >
      <AspectRatio ratio={{ base: 1, sm: 4 / 3 }}>
        <ChakraImage
          ref={imgRef}
          src={imgSrc}
          alt={imgAlt || title}
          objectFit="cover"
          loading="lazy"
          referrerPolicy="no-referrer"
          style={{ transform: "translate3d(0, var(--y, 0px), 0) scale(var(--s, 1.10))" }}
          transition="transform 60ms linear"
          willChange="transform"
          draggable={false}
        />
      </AspectRatio>

      {/* Overlay claro, más transparente */}
      <Box
        pointerEvents="none"
        position="absolute"
        inset={0}
        bg="whiteAlpha.400"
        transition="background .18s ease"
        _groupHover={{ bg: "whiteAlpha.300" }}
      />

      {/* Texto central negro */}
      <Box pointerEvents="none" position="absolute" inset={0} display="grid" placeItems="center" textAlign="center" px={4}>
        <Box>
          <Heading
            as="h3"
            fontSize={{ base: "2xl", md: "3xl" }}
            color="black"
            letterSpacing="widest"
            textTransform="uppercase"
            fontWeight="bold"
            lineHeight="1.1"
            whiteSpace="pre-line"
          >
            {title}
          </Heading>
          {/* En el diseño no hay subtítulo visible */}
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
  heading?: string;
  advertiseTitle?: string;
  acquireTitle?: string;
};

export default function DualCTASection({
  advertiseHref = "/anunciate",
  acquireHref = "/propiedades",
  advertiseImage = "/anuncia.png",
  acquireImage = "/adquiere.png",
  parallaxStrength = 0.24,
  fullBleed = false,
  heading = "ANUNCIANTES Y ADQUIERENTES",
  advertiseTitle = "¿VENDES\nO\nRENTAS?",
  acquireTitle = "¿ADQUIERES?",
}: DualCTASectionProps) {
  const bg = useColorModeValue("#FBF6E9", "gray.900"); // crema
  const titleColor = useColorModeValue("black", "white");
  const prefersReduced = usePrefersReducedMotion();

  // Amplitud por breakpoint (más sutil en móvil)
  const amplitude = useBreakpointValue({ base: 10, md: 14, lg: 18 }) ?? 12;

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
        name: "Anunciantes y Adquierentes",
        description: "Dos accesos rápidos: ¿Vendes o rentas? y ¿Adquieres?",
      } as const),
    []
  );

  return (
    <Box as="section" bg={bg} py={{ base: 10, md: 14 }} px={fullBleed ? 0 : undefined}>
      <Container maxW="7xl" px={fullBleed ? 0 : { base: 4, md: 6 }}>
      <Stack align="center" spacing={2} mb={{ base: 8, md: 10 }}>
        <Heading
          as="h2"
          textAlign="center"
         fontFamily="'Binggo Wood', heading"
          fontWeight="extrabold"
          fontSize={{ base: "2xl", md: "3xl", lg: "4xl" }}
          color={titleColor}
          letterSpacing="wide"
          textTransform="uppercase"

        >
          {heading}
        </Heading>
      </Stack>

        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={{ base: 4, md: 8 }}>
          <ClickCard
            title={advertiseTitle}
            href={advertiseHref}
            imgSrc={advertiseImage}
            imgAlt="Anuncia tu propiedad"
            subtitle={undefined}
            strength={parallaxStrength}
            amplitude={amplitude}
            dir={leftDir}
            prefersReduced={prefersReduced}
          />
          <ClickCard
            title={acquireTitle}
            href={acquireHref}
            imgSrc={acquireImage}
            imgAlt="Encuentra tu próxima propiedad"
            subtitle={undefined}
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
