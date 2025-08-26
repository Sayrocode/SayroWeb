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
  chakra,
  useColorModeValue,
  Icon,
} from "@chakra-ui/react";
import { useEffect, useRef } from "react";
import { FiShield, FiHeart, FiThumbsUp } from "react-icons/fi";
import Layout from "components/Layout";

/* --------------------------- HERO con parallax --------------------------- */

function AboutHero({
  title = "SOBRE NOSOTROS",
  imageSrc = "/images/hero-nosotros.jpg", // cambia por tu ruta
  imageAlt = "Interiores de una sala elegante",
  height = { base: "52vh", md: "64vh" },
}: {
  title?: string;
  imageSrc?: string;
  imageAlt?: string;
  height?: any;
}) {
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLDivElement | null>(null);

  // Parallax: la imagen se desplaza levemente HACIA ABAJO al hacer scroll
  useEffect(() => {
    const section = sectionRef.current;
    const img = imgRef.current;
    if (!section || !img) return;

    const update = () => {
      const r = section.getBoundingClientRect();
      const vh = window.innerHeight || 1;

      // progreso 0..1 desde que empieza a verse hasta que termina de salir
      const progress = Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height)));
      // Queremos que se mueva HACIA ABAJO: -20px -> +25px
      const translate = -20 + progress * 45;
      img.style.transform = `translateY(${translate}px) scale(1.08)`;
    };

    update();

    const io = new IntersectionObserver(() => update(), {
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
  }, []);

  return (
    <Box as="header" ref={sectionRef} position="relative" w="100%" minH={height} overflow="hidden">
      {/* Imagen como capa absoluta, sin espacios en blanco */}
      <Box
        ref={imgRef}
        position="absolute"
        inset={0}
        bgImage={`url(${imageSrc})`}
        bgSize="cover"
        bgPos="center"
        willChange="transform"
        transition="transform .12s ease-out"
      />
      {/* Overlay sutil para contraste */}
      <Box position="absolute" inset={0} bg="blackAlpha.600" />

      {/* Contenido */}
      <Container maxW="7xl" h="100%" position="relative" display="flex" alignItems="center">
        <Heading
          as="h1"
          fontFamily="'DM Serif Display', ui-serif, Georgia, serif"
          fontWeight="700"
          color="white"
          fontSize={{ base: "2.25rem", md: "3.5rem", lg: "4rem" }}
          letterSpacing="-0.02em"
          textTransform="uppercase"
          lineHeight="1.05"
        >
          {title}
        </Heading>
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
    <Layout >
      <Head>
        <title>Sobre nosotros — Sayro Bienes Raíces</title>
        <meta
          name="description"
          content="Más de 30 años ofreciendo asesoría inmobiliaria en Querétaro. Conoce nuestra historia, valores y por qué somos tu mejor aliado."
        />
        <link rel="canonical" href="https://tu-dominio.com/nosotros" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }} />
      </Head>

      {/* HERO */}
      <AboutHero
        title="SOBRE NOSOTROS"
        imageSrc="image1.jpg" // pon tu imagen
        imageAlt="Sala acogedora de un hogar moderno"
      />

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

            {/* Bloque elegante (imagen fija opaca para ritmo visual; puedes cambiar por un logo grande o una textura) */}
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
