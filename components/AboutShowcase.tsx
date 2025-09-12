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
import Image from 'next/image';

type Props = {
  title?: string;
  paragraphs?: string[];
  imageSrc: string;
  imageAlt?: string;
  logoSrc?: string;
  logoAlt?: string;
  anchorId?: string; // id del section para navegación con hash
  /** Intensidad base desktop (px máx. de desplazamiento). Default 80 */
  desktopMaxShift?: number;
  /** Intensidad base mobile (px máx. de desplazamiento). Default 46 */
  mobileMaxShift?: number;
  /** iPad tuning: tipografía y dimensiones ligeramente mayores */
  ipad?: boolean;
  /** Forzar a ocupar toda la pantalla en alto */
  fullScreen?: boolean;
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
  anchorId,
  desktopMaxShift = 80,
  mobileMaxShift = 46,
  ipad = false,
  fullScreen = false,
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
    // Evitar parallax en dispositivos táctiles (iPhone/iPad) y cuando el usuario prefiere menos movimiento
    const isCoarsePointer =
      typeof window !== 'undefined' && typeof window.matchMedia === 'function'
        ? window.matchMedia('(pointer: coarse)').matches
        : false;
    if (prefersReduced || isCoarsePointer) return;

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
    <Box
      as="section"
      id={anchorId}
      w="100%"
      ref={sectionRef}
      bg="white"
      _dark={{ bg: "gray.900" }}
      scrollMarginTop={{ base: "56px", md: "64px" }}
      minH={fullScreen ? "100vh" : undefined}
    >
      <Grid templateColumns={{ base: "1fr", md: "1.5fr 1fr" }} gap={0} alignItems="stretch">
        {/* IZQUIERDA */}
        <GridItem
          bg={leftBg}
          color="white"
          px={{ base: ipad ? 8 : 6, md: ipad ? 14 : 10, lg: ipad ? 16 : 14 }}
          py={{ base: ipad ? 10 : 8, md: ipad ? 14 : 12 }}
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
                  fontSize={ipad ? { base: "3rem", md: "4.2rem" } : { base: "2.6rem", md: "3.8rem" }}
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
                  fontSize={ipad
                    ? { base: i === 0 ? "xl" : "lg", md: i === 0 ? "2xl" : "xl" }
                    : { base: i === 0 ? "lg" : "md", md: i === 0 ? "xl" : "lg" }
                  }
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
        <GridItem position="relative" minH={{ base: fullScreen ? "100vh" : "60vw", md: fullScreen ? "100vh" : "80vh" }} overflow="hidden">
          {/* Capa con “sangre”: top/bottom negativos para cubrir cuando se traslada */}
          <Box position="absolute" left={0} right={0} top={`-${bleed}px`} bottom={`-${bleed}px`} overflow="hidden">
            <Box position="absolute" inset={0}>
              <Image
                ref={imgRef as any}
                src={imageSrc}
                alt={imageAlt}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                priority={false}
                style={{
                  objectFit: 'cover',
                  transform: prefersReduced ? undefined : `translate3d(0, ${y}px, 0) scale(${ipad ? 1.08 : 1.06})`,
                  transition: 'transform 40ms linear',
                  willChange: 'transform',
                }}
                draggable={false}
              />
            </Box>
          </Box>

          {/* Logo centrado (usa logoSrc y sin desplazamiento lateral) */}
          <Box position="absolute" inset={0} display="grid" placeItems="center" pointerEvents="none">
            <ChakraImage
              src={logoSrc}
              alt={logoAlt}
              maxW={{ base: "85%", md: "65%" }}
              maxH={{ base: "85%", md: "80%" }}
              objectFit="contain"
              opacity={0.95}
              fallbackSrc="/sayrowhite.png"
              filter="drop-shadow(0 4px 20px rgba(0,0,0,.35))"
            />
          </Box>
        
        </GridItem>
      </Grid>
    </Box>
  );
}
