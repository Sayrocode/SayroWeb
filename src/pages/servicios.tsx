// pages/servicios.tsx
import Head from "next/head";
import NextLink from "next/link";
import {
  Box,
  Container,
  Grid,
  GridItem,
  SimpleGrid,
  Stack,
  Heading,
  Text,
  Button,
  AspectRatio,
  Image as ChakraImage,
  HStack,
  Icon,
  useColorModeValue,
  usePrefersReducedMotion,
  VisuallyHidden,
  Divider,
} from "@chakra-ui/react";
import { keyframes } from "@emotion/react"; // ✅ IMPORT CORRECTO
import {
  FiTrendingUp,
  FiPercent,
  FiFileText,
  FiSearch,
  FiShield,
  FiCompass,
  FiPhoneCall,
} from "react-icons/fi";
import Layout from "components/Layout";

/* ========= Animaciones (Emotion) ========= */
const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(16px) }
  to   { opacity: 1; transform: translateY(0) }
`;

const shine = keyframes`
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(200%); }
`;

/* ========= Sección: Hero ========= */
function HeroServices() {
  const prefersReduced = usePrefersReducedMotion();
  const anim = prefersReduced ? undefined : `${fadeUp} .6s ease .05s both`;

  return (
    <Box as="section" position="relative" bg="gray.900" color="white">
      <Box position="absolute" inset={0} zIndex={0} aria-hidden>
        <ChakraImage
          src="/image2.jpg" // coloca tu imagen aquí
          alt="Interior elegante"
          w="100%"
          h={{ base: "42vh", md: "48vh", lg: "52vh" }}
          objectFit="cover"
       
        />
        <Box
          position="absolute"
          inset={0}
          bg="blackAlpha.600"
       h={{ base: "42vh", md: "48vh", lg: "52vh" }}
          sx={{
            "&::after": {
              content: '""',
              position: "absolute",
              inset: 0,
              background:
                "radial-gradient(1200px 180px at 20% 20%, rgba(255,255,255,.10), transparent 60%)",
            },
          }}
        />
      </Box>

      <Container maxW="7xl" position="relative" zIndex={1} py={{ base: 16, md: 20 }}>
        <Heading
          as="h1"
          fontFamily="heading"
          fontWeight="700"
          fontSize={{ base: "2.2rem", md: "3.2rem" }}
          lineHeight="1.1"
          letterSpacing="-0.01em"
          animation={anim}
        >
          SOBRE NUESTROS SERVICIOS
        </Heading>
        <Text mt={3} maxW="3xl" color="whiteAlpha.900" animation={anim}>
          Estrategia, representación y acompañamiento integral para vender, comprar o rentar con
          seguridad y el mejor retorno posible.
        </Text>
      </Container>
    </Box>
  );
}

/* ========= Sección: Intro (inspirada en tu imagen #1) ========= */
function ServicesIntro() {
  const border = useColorModeValue("blackAlpha.200", "whiteAlpha.200");

  return (
    <Box as="section" py={{ base: 10, md: 14 }}>
      <Container maxW="7xl">
        <Grid
          templateColumns={{ base: "1fr", md: "1.05fr 1fr" }}
          gap={{ base: 8, md: 10 }}
          alignItems="center"
        >
          <GridItem>
            <Heading
              as="h2"
              fontSize={{ base: "1.7rem", md: "2rem" }}
              letterSpacing="wide"
              borderBottom="3px solid"
              borderColor={border}
              pb={2}
              mb={6}
            >
              Comercialización de Propiedades
            </Heading>
            <Stack spacing={4} color={useColorModeValue("gray.700", "gray.200")}>
              <Text>
                Nos especializamos en inmuebles de tipo residencial, así como en inmuebles y terrenos
                para desarrollos habitacionales, comerciales e industriales.
              </Text>
              <Text>
                Brindamos representación y asesoría inmobiliaria de propiedades en venta o renta a través
                de nuestro <em>servicio integral</em>.
              </Text>
              <Text>
                Nuestro compromiso es que obtengas el mejor precio con rapidez, seguridad y una experiencia
                clara en cada etapa del proceso.
              </Text>
            </Stack>
          </GridItem>

          <GridItem>
            <AspectRatio ratio={16 / 9} rounded="xl" overflow="hidden" shadow="lg">
              <ChakraImage
                src="/image5.jpg" // coloca tu imagen
                alt="Ambiente interior con luz natural"
                objectFit="cover"
              />
            </AspectRatio>
          </GridItem>
        </Grid>
      </Container>
    </Box>
  );
}

/* ========= Tarjeta de servicio ========= */
type Service = {
  icon: any;
  title: string;
  desc: string;
};

const SERVICES: Service[] = [
  {
    icon: FiTrendingUp,
    title: "Marketing Digital",
    desc:
      "Estrategia, inversión y análisis continuo para generar demanda real y atraer a los compradores correctos.",
  },
  {
    icon: FiFileText,
    title: "Dictamen Comercial",
    desc:
      "Opinión de Valor Comercial basada en investigación de mercado para fijar un precio competitivo y realista.",
  },
  {
    icon: FiPercent,
    title: "Dictamen Fiscal",
    desc:
      "Determinamos, antes de promover, si habrá impuestos por la venta, su monto y cómo impactan en el saldo neto.",
  },
  {
    icon: FiSearch,
    title: "Estudio y Análisis de Mercado",
    desc:
      "Conocemos el valor real del inmueble para ayudarte a decidir con datos, integrando dictámenes comercial, jurídico y fiscal.",
  },
  {
    icon: FiShield,
    title: "Dictamen Jurídico",
    desc:
      "Revisión del estatus legal para asegurar una comercialización sin sorpresas a lo largo del proceso de venta.",
  },
  {
    icon: FiCompass,
    title: "Asesoría en Búsqueda de Bienes",
    desc:
      "Te guiamos con opciones reales para comprar o alquilar un buen inmueble según tu perfil y objetivos.",
  },
];

function ServiceCard({ icon, title, desc }: Service) {
  const cardBg = useColorModeValue("white", "gray.800");
  const border = useColorModeValue("blackAlpha.200", "whiteAlpha.200");
  const prefersReduced = usePrefersReducedMotion();
  const anim = prefersReduced ? undefined : `${fadeUp} .55s ease both`;

  return (
    <Box
      role="article"
      bg={cardBg}
      rounded="xl"
      border="1px solid"
      borderColor={border}
      p={6}
      shadow="md"
      position="relative"
      overflow="hidden"
      _hover={{ transform: "translateY(-4px)", shadow: "xl" }}
      transition="all .18s ease"
      animation={anim}
    >
      {/* Shine sutil */}
      <Box
        position="absolute"
        top={0}
        left="-40%"
        w="40%"
        h="100%"
        bgGradient="linear(to-b, transparent, whiteAlpha.200, transparent)"
        transform="skewX(-18deg)"
        pointerEvents="none"
        animation={`${shine} 3.2s ease-in-out infinite`}
      />
      <HStack spacing={4} align="start">
        <Box
          w={12}
          h={12}
          rounded="full"
          bg={useColorModeValue("green.50", "green.900")}
          display="grid"
          placeItems="center"
          color={useColorModeValue("green.700", "green.200")}
          flexShrink={0}
        >
          <Icon as={icon} boxSize={5} />
        </Box>
        <Box>
          <Heading as="h3" size="md" mb={2} letterSpacing="tight">
            {title}
          </Heading>
          <Text color={useColorModeValue("gray.700", "gray.200")}>{desc}</Text>
        </Box>
      </HStack>
    </Box>
  );
}

/* ========= Sección: Grid de servicios ========= */
function ServicesGrid() {
  return (
    <Box as="section" py={{ base: 10, md: 14 }} bg={useColorModeValue("gray.50", "gray.900")}>
      <Container maxW="7xl">
        <Heading as="h2" size="lg" textAlign="center" mb={{ base: 8, md: 10 }}>
          Nuestros Servicios
        </Heading>
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
          {SERVICES.map((s, i) => (
            <ServiceCard key={i} {...s} />
          ))}
        </SimpleGrid>
      </Container>
    </Box>
  );
}

/* ========= CTA ========= */
function CTASection() {
  return (
    <Box
      as="section"
      py={{ base: 10, md: 14 }}
      bgGradient="linear(to-r, green.800, green.600)"
      color="white"
      position="relative"
      overflow="hidden"
    >
      {/* textura sutil */}
      <Box
        position="absolute"
        inset={0}
        opacity={0.08}
        bg="url('/images/noise.png')"
        bgRepeat="repeat"
        aria-hidden
      />
      <Container maxW="7xl" position="relative">
        <Grid templateColumns={{ base: "1fr", md: "2fr 1fr" }} gap={8} alignItems="center">
          <GridItem>
            <Heading as="h3" size="lg" letterSpacing="-0.01em">
              ¿Listo para vender, comprar o rentar con confianza?
            </Heading>
            <Text mt={3} opacity={0.95} maxW="2xl">
              Conectemos y definamos una estrategia a tu medida. Nuestro equipo te acompaña en cada
              paso.
            </Text>
          </GridItem>
          <GridItem>
            <HStack justify={{ base: "flex-start", md: "flex-end" }}>
              <Button
                as={NextLink}
                href="/contacto"
                size="lg"
                colorScheme="whiteAlpha"
                bg="white"
                color="green.800"
                _hover={{ bg: "white" }}
                leftIcon={<FiPhoneCall />}
                rounded="full"
              >
                Contáctanos
              </Button>
            </HStack>
          </GridItem>
        </Grid>
      </Container>
    </Box>
  );
}

/* ========= Página ========= */
export default function ServiciosPage() {
  return (
    <>
    <Layout>
      <Head>
        <title>Servicios — Sayro Bienes Raíces</title>
        <meta
          name="description"
          content="Marketing, dictámenes comercial/fiscal/jurídico, estudio de mercado y asesoría para comprar, vender o rentar inmuebles en Querétaro."
        />
      </Head>

      <HeroServices />
      <ServicesIntro />
      <ServicesGrid />
      <CTASection />

      {/* SEO extra para lectores */}
      <VisuallyHidden>
        <Text>Somos especialistas inmobiliarios con servicio integral en Querétaro, México.</Text>
      </VisuallyHidden>

      <Divider opacity={0} mb={8} />
      </Layout>
    </>
  );
}
