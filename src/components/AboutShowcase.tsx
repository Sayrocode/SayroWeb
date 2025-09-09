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
  useBreakpointValue,
  Center,
} from "@chakra-ui/react";
import { useEffect, useRef, useState } from "react";

type Props = {
  title?: string;
  paragraphs?: string[];
  imageSrc: string;
  imageAlt?: string;
  logoSrc?: string;
  logoAlt?: string;
  /** Intensidad base desktop (px máx. de desplazamiento). Default 80 */
  desktopMaxShift?: number;
  /** Intensidad base mobile (px máx. de desplazamiento). Default 46 */
  mobileMaxShift?: number;
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
  logoSrc = "/sayrowhite.png",
  logoAlt = "Sayro Bienes Raíces S.A. de C.V.",
  desktopMaxShift = 80,
  mobileMaxShift = 46,
}: Props) {
  const leftBg = useColorModeValue("#013927", "#013927");
  const prefersReduced = usePrefersReducedMotion();

  // Intensidad responsive
  const maxShift = useBreakpointValue(
    { base: mobileMaxShift, md: desktopMaxShift },
    { fallback: "md" }
  ) as number;

  const sectionRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [y, setY] = useState(0);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (prefersReduced) return;

    let raf = 0;
    const update = () => {
      const el = sectionRef.current;
      if (!el) return;

      const r = el.getBoundingClientRect();
      const vh = window.innerHeight || 1;

      // progreso 0..1 desde que empieza a entrar hasta que sale
      const total = r.height + vh;
      const progress = Math.min(1, Math.max(0, (vh - r.top) / total));

      // -maxShift .. +maxShift (para que en móvil baje/ suba sin “jalar” bordes)
      const translate = (progress - 0.5) * 2 * maxShift;

      setY(translate);
    };

    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [maxShift, prefersReduced]);

  // Aparición suave del bloque izquierdo
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

  // “Sangre” vertical para que el translate nunca descubra fondo.
  // Usamos top/bottom negativos en vez de height arbitraria.
  const bleed = Math.max(30, Math.round(maxShift * 1.2)); // px extra arriba/abajo

  return (
    <Box as="section" w="100%" ref={sectionRef} bg="white" _dark={{ bg: "gray.900" }}>
      <Grid templateColumns={{ base: "1fr", md: "1.5fr 1fr" }} gap={0} alignItems="stretch">
        {/* IZQUIERDA */}
        <GridItem
          bg={leftBg}
          color="white"
          px={{ base: 6, md: 10, lg: 14 }}
          py={{ base: 8, md: 12 }}
        >
          {/* Animamos solo el contenido para mantener el fondo verde visible */}
          <Box
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
            <Center textAlign="center">
              <Box>
                <Heading
                  as="h2" // semántico; si quieres conservar "p", cámbialo
                  fontFamily="heading"
                  fontWeight="700"
                  fontSize={{ base: "2.6rem", md: "3.8rem" }}
                  lineHeight="1.08"
                  letterSpacing=".02em"
                  mb={{ base: 3, md: 4 }}
                  textShadow="0 1px 10px rgba(0,0,0,.22)"
                >
                  {title}
                </Heading>

                {/* Línea/acento centrada debajo del título */}
                <Box
                  aria-hidden
                  mx="auto"
                  w={{ base: "64px", md: "88px" }}
                  h="3px"
                  bg="green.300"
                  rounded="full"
                  mb={{ base: 5, md: 7 }}
                />
              </Box>
            </Center>

            <Stack
              spacing={{ base: 4, md: 5 }}
              maxW="62ch"               // ancho de lectura ideal
              mx="auto"
            >
              {paragraphs.map((p, i) => (
                <Text
                  key={i}
                  fontSize={{ base: i === 0 ? "lg" : "md", md: i === 0 ? "xl" : "lg" }} // “lead” en el primero
                  lineHeight={{ base: 1.85, md: 1.9 }}
                  color={i === 0 ? "whiteAlpha.950" : "whiteAlpha.900"}                  // más contraste en el primero
                  letterSpacing=".005em"
                  sx={{
                    textWrap: "balance",   // cortes de línea más agradables (soporte variable)
                    hyphens: "auto",
                  }}
                  textAlign="center"
                >
                  {p}
                </Text>
              ))}
            </Stack>
          </Box>
        </GridItem>

        {/* DERECHA: Imagen con parallax */}
        <GridItem position="relative" minH={{ base: "60vw", md: "80vh" }} overflow="hidden">
          {/* Capa con “sangre”: top/bottom negativos para cubrir cuando se traslada */}
          <Box position="absolute" left={0} right={0} top={`-${bleed}px`} bottom={`-${bleed}px`} overflow="hidden">
            <ChakraImage
              ref={imgRef}
              src={imageSrc}
              alt={imageAlt}
              w="100%"
              h="100%"
              objectFit="cover"
              transform={
                prefersReduced ? undefined : `translate3d(0, ${y}px, 0) scale(1.06)`
              }
              transition="transform 40ms linear"
              willChange="transform"
              draggable={false}
            />
          </Box>

          {/* Logo centrado */}
         
            <Box position="absolute" inset={0} display="grid" placeItems="center" pointerEvents="none">
              <ChakraImage
                src={"/sayrowhite.png"}
                alt={logoAlt}
                maxW={{ base: "48%", md: "100%" }}
                opacity={0.95}
                mr={20}
                filter="drop-shadow(0 4px 20px rgba(0,0,0,.35))"
              />
            </Box>
        
        </GridItem>
      </Grid>
    </Box>
  );
}
