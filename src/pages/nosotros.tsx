// pages/nosotros.tsx
import Head from "next/head";
import NextLink from "next/link";
import {
  Box,
  Container,
  Grid,
  GridItem,
  Heading,
  Text,
  Stack,
  SimpleGrid,
  Button,
  Image as ChakraImage,
  useColorModeValue,
  usePrefersReducedMotion,
  Icon,
} from "@chakra-ui/react";
import { keyframes } from "@emotion/react";
import { FiShield, FiHeart, FiThumbsUp } from "react-icons/fi";
import Layout from "components/Layout";

/* ========= Animaciones (Emotion) ========= */
const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(16px) }
  to   { opacity: 1; transform: translateY(0) }
`;

/* ========= HERO (idéntico en size/acomodo al de /servicios) ========= */
function HeroNosotros() {
  const prefersReduced = usePrefersReducedMotion();
  const anim = prefersReduced ? undefined : `${fadeUp} .6s ease .05s both`;

  return (
    <Box as="section" position="relative" bg="gray.900" color="white">
      {/* Fondo */}
      <Box position="absolute" inset={0} zIndex={0} aria-hidden>
        <ChakraImage
          src="/image1.jpg"                 // ← tu imagen para "Nosotros"
          alt="Sala acogedora de un hogar moderno"
          w="100%"
          h={{ base: "42vh", md: "48vh", lg: "52vh" }}  // ← mismas alturas
          objectFit="cover"
          draggable={false}
        />
        <Box
          position="absolute"
          inset={0}
          bg="blackAlpha.600"
          h={{ base: "42vh", md: "48vh", lg: "52vh" }}  // ← mismas alturas
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

      {/* Texto (mismo acomodo y estilos) */}
      <Container maxW="7xl" position="relative" zIndex={1} py={{ base: 16, md: 20 }}>
        <Heading
          as="h1"
          fontFamily="'DM Serif Display', ui-serif, Georgia, serif"
          fontWeight="400"
          fontSize={{ base: "2.2rem", md: "3.2rem" }}   // ← igual que servicios
          lineHeight="1.1"
          letterSpacing="-0.01em"
          textTransform="uppercase"
          animation={anim}
        >
          SOBRE NOSOTROS
        </Heading>
        {/* opcional: subtítulo; si no lo quieres, borra este <Text> */}
        <Text mt={3} maxW="3xl" color="whiteAlpha.900" animation={anim}>
          Más de 30 años asesorando con confianza y resultados en Querétaro.
        </Text>
      </Container>
    </Box>
  );
}

/* --------------------------- Tarjeta de valor --------------------------- */

function ValueCard({
  icon,
  title,
  desc,
}: {
  icon: any;
  title: string;
  desc: string;
}) {
  const bg = useColorModeValue("white", "gray.800");
  const b = useColorModeValue("blackAlpha.200", "whiteAlpha.200");

  return (
    <Box
      role="article"
      bg={bg}
      border="1px solid"
      borderColor={b}
      rounded="xl"
      p={6}
      transition="transform .18s ease, box-shadow .18s ease"
      _hover={{ transform: "translateY(-4px)", boxShadow: "lg" }}
    >
      <Stack direction="row" spacing={4} align="center" mb={2}>
        <Icon as={icon} boxSize={6} color="green.600" />
        <Heading as="h3" size="md">
          {title}
        </Heading>
      </Stack>
      <Text color={useColorModeValue("gray.700", "gray.300")}>{desc}</Text>
    </Box>
  );
}

/* --------------------------------- PAGE --------------------------------- */

export default function NosotrosPage() {
  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Sayro Bienes Raíces",
    url: "https://tu-dominio.com/nosotros",
    logo: "https://tu-dominio.com/logos/logo.png",
    sameAs: [
      "https://www.facebook.com/tu-cuenta",
      "https://www.instagram.com/tu-cuenta",
    ],
  };

  return (
    <>
      <Layout>
        <Head>
          <title>Sobre nosotros — Sayro Bienes Raíces</title>
          <meta
            name="description"
            content="Más de 30 años ofreciendo asesoría inmobiliaria en Querétaro. Conoce nuestra historia, valores y por qué somos tu mejor aliado."
          />
          <link rel="canonical" href="https://tu-dominio.com/nosotros" />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
          />
        </Head>

        {/* === HERO unificado con /servicios === */}
        <HeroNosotros />

        {/* ¿Quiénes somos? */}
        <Box as="section" bg={useColorModeValue("white", "gray.900")} py={{ base: 10, md: 14 }}>
          <Container maxW="7xl">
            <Grid templateColumns={{ base: "1fr", md: "1.1fr 1fr" }} gap={{ base: 8, md: 12 }} alignItems="center">
              <GridItem>
                <Heading
                  as="h2"
                  fontFamily="'DM Serif Display', ui-serif, Georgia, serif"
                  fontWeight="500"
                  fontSize={{ base: "2xl", md: "3xl" }}
                  letterSpacing="-0.01em"
                  mb={4}
                  color={useColorModeValue("green.800", "green.200")}
                >
                  ¿Quiénes somos?
                </Heading>
                <Stack spacing={4} color={useColorModeValue("gray.700", "gray.300")} maxW="60ch" lineHeight={1.9}>
                  <Text>
                    Somos una empresa líder en el sector inmobiliario de Querétaro, con más de 30 años ofreciendo
                    asesoría profesional y resultados medibles.
                  </Text>
                  <Text>
                    Nuestro compromiso es que cada cliente obtenga el mejor precio, con rapidez y seguridad, maximizando la
                    rentabilidad de sus operaciones y optimizando sus inversiones.
                  </Text>
                </Stack>
              </GridItem>

              <GridItem>
                <Box
                  role="img"
                  aria-label="Equipo inmobiliario"
                  rounded="xl"
                  minH={{ base: "40vh", md: "48vh" }}
                  bgImage="url(/image3.jpg)"
                  bgPos="center"
                  bgSize="cover"
                  _after={{
                    content: '""',
                    position: "absolute",
                    inset: 0,
                    rounded: "xl",
                    bgGradient: "linear(to-b, transparent, rgba(0,0,0,.25))",
                  }}
                  position="relative"
                  overflow="hidden"
                />
              </GridItem>
            </Grid>
          </Container>
        </Box>

        {/* ¿Qué hacemos? / ¿Cómo lo hacemos? */}
        <Box as="section" bg={useColorModeValue("#0E3B30", "#0E3B30")} color="white" py={{ base: 12, md: 16 }}>
          <Container maxW="7xl">
            <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={{ base: 10, md: 12 }} alignItems="center">
              <GridItem>
                <Heading as="h3" size="md" mb={3} textTransform="uppercase" letterSpacing="wider">
                  ¿Qué hacemos?
                </Heading>
                <Text opacity={0.95} lineHeight={1.9} maxW="55ch">
                  Brindamos asesoría profesional y personalizada a particulares y empresas para comprar, vender o rentar
                  inmuebles en Querétaro.
                </Text>
              </GridItem>
              <GridItem>
                <Heading as="h3" size="md" mb={3} textTransform="uppercase" letterSpacing="wider">
                  ¿Cómo lo hacemos?
                </Heading>
                <Text opacity={0.95} lineHeight={1.9} maxW="55ch" mb={6}>
                  Servicio integral con seguridad, confianza y acompañamiento en cada etapa del proceso. Contamos con uno
                  de los inventarios más amplios de la ciudad y, si no lo tenemos, lo encontramos por ti.
                </Text>

                <Stack direction={{ base: "column", sm: "row" }} spacing={4}>
                  <Button
                    as={NextLink}
                    href="/contacto"
                    variant="outline"
                    colorScheme="whiteAlpha"
                    rounded="full"
                    px={6}
                  >
                    Contáctanos
                  </Button>
                  <Button
                    as={NextLink}
                    href="/propiedades"
                    bg="white"
                    color="green.800"
                    _hover={{ bg: "white" }}
                    rounded="full"
                    px={6}
                  >
                    Ver propiedades
                  </Button>
                </Stack>
              </GridItem>
            </Grid>
          </Container>
        </Box>

        {/* Nuestros valores */}
        <Box as="section" bg={useColorModeValue("gray.50", "gray.900")} py={{ base: 12, md: 16 }}>
          <Container maxW="7xl">
            <Heading
              as="h3"
              size="lg"
              textAlign="center"
              mb={{ base: 8, md: 10 }}
              fontFamily="'DM Serif Display', ui-serif, Georgia, serif"
            >
              Nuestros valores
            </Heading>

            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
              <ValueCard
                icon={FiShield}
                title="Confianza"
                desc="Transparencia total, contratos claros y acompañamiento real en cada paso."
              />
              <ValueCard
                icon={FiThumbsUp}
                title="Eficiencia"
                desc="Procesos optimizados para vender o rentar más rápido y mejor."
              />
              <ValueCard
                icon={FiHeart}
                title="Cercanía"
                desc="Escuchamos primero. Cada operación se adapta a tus metas y contexto."
              />
            </SimpleGrid>
          </Container>
        </Box>

        {/* CTA Final */}
        <Box
          as="section"
          py={{ base: 12, md: 16 }}
          bgGradient="linear(to-r, green.900, green.700)"
          color="white"
          textAlign="center"
        >
          <Container maxW="7xl">
            <Heading
              as="h3"
              size="lg"
              mb={3}
              fontFamily="'DM Serif Display', ui-serif, Georgia, serif"
              letterSpacing="-0.01em"
            >
              ¿Listo para hablar de tu próximo paso?
            </Heading>
            <Text opacity={0.95} mb={6}>
              Agenda una llamada y descubre cómo podemos ayudarte a lograrlo.
            </Text>
            <Button
              as={NextLink}
              href="/contacto"
              size="lg"
              bg="white"
              color="green.800"
              _hover={{ bg: "white" }}
              rounded="full"
              px={8}
            >
              Agenda una llamada
            </Button>
          </Container>
        </Box>
      </Layout>
    </>
  );
}
