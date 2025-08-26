// components/AboutSplitHeroParallax.tsx
import {
  Box,
  Grid,
  GridItem,
  Heading,
  Text,
  Stack,
  Image as ChakraImage,
  useColorModeValue,
  usePrefersReducedMotion,
  Center,
} from "@chakra-ui/react";
import { useEffect, useRef, useState } from "react";

type Props = {
  title?: string;
  paragraphs?: string[];
  imageSrc: string;          // imagen del showcase (única)
  imageAlt?: string;
  logoSrc?: string;          // logo centrado sobre la imagen
  logoAlt?: string;
  /** Intensidad del parallax (0.1–0.6 recomendado). Default: 0.28 */
  parallaxStrength?: number;
};

export default function AboutSplitHeroParallax({
  title = "¿Quiénes somos?",
  paragraphs = [
    "Somos una empresa líder en el sector inmobiliario de la Ciudad de Querétaro, México, con más de 33 años de experiencia respaldando nuestro trabajo.",
    "Nuestro compromiso es garantizar que cada cliente obtenga el mejor precio, con rapidez y seguridad, asegurando la máxima rentabilidad de sus operaciones inmobiliarias y la mayor optimización en sus inversiones.",
    "Nos especializamos en la comercialización de bienes raíces en venta y renta de todo tipo en la Ciudad de Querétaro.",
  ],
  imageSrc,
  imageAlt = "Edificio moderno",
  logoSrc = "/logos/sayro-sello-blanco.svg",
  logoAlt = "Sayro Bienes Raíces S.A. de C.V.",
  parallaxStrength = 0.28,
}: Props) {
  const leftBg = useColorModeValue("#0E3B30", "#0E3B30"); // verde profundo
  const prefersReduced = usePrefersReducedMotion();

  // --- PARALLAX ---
  const rightRef = useRef<HTMLDivElement | null>(null);
  const [y, setY] = useState(0);

  useEffect(() => {
    if (prefersReduced) return; // respeta reduce-motion

    const handleScroll = () => {
      const el = rightRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      // Desfase proporcional al scroll, más sutil que 1:1
      // translateY negativo cuando vamos bajando:
      const offset = -rect.top * parallaxStrength;
      setY(offset);
    };

    handleScroll(); // inicial
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [parallaxStrength, prefersReduced]);

  return (
    // Full-bleed: sin contenedor ni padding
    <Box as="section" w="100%" bg="white" _dark={{ bg: "gray.900" }}>
      <Grid
        templateColumns={{ base: "1fr", md: "1.05fr 1fr" }}
        gap={0}                 // ❌ sin espacios
        alignItems="stretch"
      >
        {/* COLUMNA IZQUIERDA */}
        <GridItem
          bg={leftBg}
          color="white"
          px={{ base: 6, md: 10 }}     // padding interno (solo del bloque)
          py={{ base: 8, md: 12 }}
        >
        
<Center>
          <Heading
            as="p"
            fontFamily="'DM Serif Display', ui-serif, Georgia, serif"
            fontWeight="400"
            fontSize={{ base: "2.25rem", md: "5rem" }}
            lineHeight="1.1"
            mb={{ base: 6, md: 8 }}
            letterSpacing="-0.01em"
          >
            {title}
          </Heading>
          </Center>
          <Stack spacing={{ base: 3, md: 4 }} maxW="42ch" mx="auto">
            {paragraphs.map((p, i) => (
              <Text
                key={i}
                fontSize={{ base: "md", md: "lg" }}
                lineHeight={{ base: 1.8, md: 1.85 }}
                opacity={0.98}
                textAlign="center"
              >
                {p}
              </Text>
            ))}
          </Stack>
        </GridItem>

        {/* COLUMNA DERECHA (PARALLAX) */}
        <GridItem
          ref={rightRef}
          position="relative"
          minH={{ base: "58vw", md: "80vh" }} // alto generoso y sin bordes
          overflow="hidden"
        >
          {/* Capa de imagen: hacemos la imagen un poco más alta para que el translate no descubra bordes */}
          <Box
            position="absolute"
            inset={0}
            overflow="hidden"
          >
            <ChakraImage
              src={imageSrc}
              alt={imageAlt}
              w="100%"
              h="120%"                // ↑ más alta para que “sobre”
              objectFit="cover"
              transform={!prefersReduced ? `translateY(${y}px)` : undefined}
              transition="transform 40ms linear"
              willChange="transform"
            />
          </Box>

          {/* Logo centrado al medio */}
          {logoSrc && (
            <Box
              position="absolute"
              inset={0}
              display="grid"
              placeItems="center"
              pointerEvents="none"
            >
              <ChakraImage
                src={logoSrc}
                alt={logoAlt}
                maxW={{ base: "48%", md: "42%" }}
                opacity={0.95}
                filter="drop-shadow(0 4px 20px rgba(0,0,0,.35))"
              />
            </Box>
          )}
        </GridItem>
      </Grid>
    </Box>
  );
}
