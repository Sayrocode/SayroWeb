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
} from "@chakra-ui/react";
import { useEffect, useRef, useState } from "react";

type CardProps = {
  title: string;
  href: string;        // destino (ej. "/#anuncia")
  imgSrc: string;      // url de la imagen
  imgAlt?: string;
  subtitle?: string;   // opcional
  parallaxOffset?: number; // desplazamiento Y aplicado a la imagen
};

function ClickCard({ title, href, imgSrc, imgAlt, subtitle, parallaxOffset = 0 }: CardProps) {
  const ring = useColorModeValue("white", "whiteAlpha.700");

  return (
    <Box
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
      {/* Mantener un solo hijo dentro de AspectRatio */}
      <AspectRatio ratio={4 / 3}>
        <ChakraImage
          src={imgSrc}
          alt={imgAlt || title}
          objectFit="cover"
          loading="lazy"
          referrerPolicy="no-referrer"
          // Parallax + pequeño scale para evitar bordes
          transform={`translateY(${parallaxOffset}px) scale(1.06)`}
          transition="transform 40ms linear"
          willChange="transform"
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
      <Box
        pointerEvents="none"
        position="absolute"
        inset={0}
        display="grid"
        placeItems="center"
        textAlign="center"
        px={4}
      >
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
            <Text mt={2}  color="blackAlpha.800" fontSize={{ base: "sm", md: "md" }}>
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
  /** Igual que en AboutSplitHeroParallax para ir sincronizados */
  parallaxStrength?: number; // 0.1 – 0.6 (default 0.28)
  /** Si quieres que el bloque sea full-bleed (sin espacios laterales) */
  fullBleed?: boolean;
};

export default function DualCTASection({
  advertiseHref = "/#anuncia",
  acquireHref = "/#adquiere",
  advertiseImage = "anuncia.png",
  acquireImage = "adquiere.png",
  parallaxStrength = 0.28,
  fullBleed = false,
}: DualCTASectionProps) {
  const bg = useColorModeValue("#FBF6E9", "gray.900"); // crema
  const titleColor = useColorModeValue("black", "white");
  const prefersReduced = usePrefersReducedMotion();

  // --- Parallax sincronizado (misma fórmula que el split-hero) ---
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const [y, setY] = useState(0);

  useEffect(() => {
    if (prefersReduced) return;

    let raf = 0;
    const onScroll = () => {
      const el = sectionRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      // desplazamiento proporcional al scroll
      const offset = -rect.top * parallaxStrength;
      setY(offset);
      raf = requestAnimationFrame(() => {}); // mantener fluido en navegadores viejos
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [parallaxStrength, prefersReduced]);

  // Si reduce-motion, no movemos las imágenes
  const leftOffset = prefersReduced ? 0 : y;
  const rightOffset = prefersReduced ? 0 : y;

  const Section = (
    <Box as="section" ref={sectionRef} bg={bg} py={{ base: 10, md: 14 }}>
      <Container maxW="7xl">
        <Heading
          as="h2"
          size="md"
          textAlign="center"
          color={titleColor}
          mb={{ base: 6, md: 8 }}
          letterSpacing="wide"
          textTransform="uppercase"
        >
          Anunciantes y Adquirientes
        </Heading>

        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={{ base: 4, md: 8 }}>
          <ClickCard
            title="Anuncia"
            href={advertiseHref}
            imgSrc={advertiseImage}
            imgAlt="Anuncia tu propiedad"
            subtitle="Publica con nosotros y llega a más compradores"
            parallaxOffset={leftOffset}
          />
          <ClickCard
            title="Adquiere"
            href={acquireHref}
            imgSrc={acquireImage}
            imgAlt="Encuentra tu próxima propiedad"
            subtitle="Explora inmuebles seleccionados para ti"
            parallaxOffset={rightOffset}
          />
        </SimpleGrid>

        {/* SEO / accesibilidad */}
        <VisuallyHidden>
          <Text>Sección con dos accesos: Anuncia y Adquiere.</Text>
        </VisuallyHidden>
      </Container>
    </Box>
  );

  // Opción "full-bleed" sin márgenes laterales si lo quieres pegar al borde
  if (fullBleed) {
    return (
      <Box as="section" ref={sectionRef} bg={bg} py={{ base: 8, md: 12 }} w="100%">
        <Box maxW="7xl" mx="auto" px={{ base: 0, md: 0 }}>
          {Section.props.children}
        </Box>
      </Box>
    );
  }

  return Section;
}
