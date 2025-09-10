// pages/contacto.tsx
import Head from "next/head";
import NextLink from "next/link";
import { useState } from "react";
import {
  Box,
  Container,
  Grid,
  GridItem,
  Heading,
  Text,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Button,
  HStack,
  Icon,
  Link,
  InputGroup,
  InputLeftElement,
  useToast,
  VisuallyHidden,
  Divider,
  usePrefersReducedMotion,
  Image as ChakraImage,
} from "@chakra-ui/react";
import { keyframes } from "@emotion/react";
import { FiMail, FiPhone, FiMapPin, FiClock, FiArrowRight } from "react-icons/fi";
import { FaWhatsapp, FaFacebook, FaInstagram } from "react-icons/fa";
import Layout from "components/Layout";
import { WA_PHONE, CONTACT_EMAIL, waHref } from "../lib/site";

const GREEN = "#0E3B30";
const GREEN_DARK = "#0B2B23";

// ✅ Ajusta tus datos
const WHATSAPP_NUMBER = WA_PHONE; // centralizado
const EMAIL_TO = CONTACT_EMAIL;
const ADDRESS = "Querétaro, Qro., México";
const HOURS = "Lun–Vie 9:00–18:00";

/* ========= Animación igual que /servicios ========= */
const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(16px) }
  to   { opacity: 1; transform: translateY(0) }
`;

/* ========= HERO idéntico al de /servicios ========= */
function HeroContacto() {
  const prefersReduced = usePrefersReducedMotion();
  const anim = prefersReduced ? undefined : `${fadeUp} .6s ease .05s both`;

  return (
    <Box as="section" position="relative" bg="gray.900" color="white">
      <Box position="absolute" inset={0} zIndex={0} aria-hidden>
        <ChakraImage
          src="/image6.jpg" // tu imagen de contacto
          alt="Atención y contacto Sayro"
          w="100%"
          h={{ base: "42vh", md: "48vh", lg: "52vh" }}   // ← mismas alturas
          objectFit="cover"
          draggable={false}
        />
        <Box
          position="absolute"
          inset={0}
          bg="blackAlpha.600"
          h={{ base: "42vh", md: "48vh", lg: "52vh" }}   // ← mismas alturas
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
          fontSize={{ base: "2.2rem", md: "3.2rem" }}     // ← iguales a /servicios
          lineHeight="1.1"
          letterSpacing="-0.01em"
          textTransform="uppercase"
          animation={anim}
        >
          CONTACTO
        </Heading>
        <Text mt={3} maxW="3xl" color="whiteAlpha.900" animation={anim}>
          Escríbenos y cuéntanos qué necesitas; estamos listos para ayudarte.
        </Text>
      </Container>
    </Box>
  );
}

export default function ContactoPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  const waUrl = waHref("Hola, me gustaría más información.");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    try {
      const fd = new FormData(e.currentTarget);
      // TODO: envía a tu endpoint real
      await new Promise((r) => setTimeout(r, 700));
      toast({
        title: "Mensaje enviado",
        description: "Gracias por escribirnos. Te contactaremos pronto.",
        status: "success",
      });
      e.currentTarget.reset();
    } catch (err: any) {
      toast({
        title: "No se pudo enviar",
        description: err?.message || "Inténtalo nuevamente.",
        status: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Layout>
        <Head>
          <title>Contacto — Sayro Bienes Raíces</title>
          <meta
            name="description"
            content="Ponte en contacto con Sayro Bienes Raíces. Resolvemos dudas sobre venta, renta y comercialización de inmuebles."
          />
        </Head>

        {/* HERO unificado */}
        <HeroContacto />

        {/* CONTENIDO */}
        <Container bgColor="white" maxW="auto" my={10} py={{ base: 10, md: 14 }}>
          <Grid templateColumns={{ base: "1fr", md: "0.9fr 1.1fr" }} gap={{ base: 6, md: 10 }}>
            {/* LADO IZQUIERDO: Info + redes + WhatsApp */}
            <GridItem>
              <Box
                bg={GREEN}
                color="white"
                rounded="xl"
                p={{ base: 6, md: 8 }}
                border="1px solid"
                borderColor="whiteAlpha.200"
                boxShadow="0 10px 30px rgba(0,0,0,.35)"
              >
                <Heading as="h2" fontSize={{ base: "xl", md: "2xl" }} mb={4}>
                  Información de contacto
                </Heading>

                <HStack align="start" spacing={4} mb={3}>
                  <Icon as={FiMapPin} mt="1" />
                  <Text>{ADDRESS}</Text>
                </HStack>
                <HStack align="start" spacing={4} mb={3}>
                  <Icon as={FiPhone} mt="1" />
                  <Link href={`tel:+${WHATSAPP_NUMBER}`} _hover={{ textDecoration: "underline" }}>
                    +{WHATSAPP_NUMBER}
                  </Link>
                </HStack>
                <HStack align="start" spacing={4} mb={3}>
                  <Icon as={FiMail} mt="1" />
                  <Link href={`mailto:${EMAIL_TO}`} _hover={{ textDecoration: "underline" }}>
                    {EMAIL_TO}
                  </Link>
                </HStack>
                <HStack align="start" spacing={4} mb={6}>
                  <Icon as={FiClock} mt="1" />
                  <Text>{HOURS}</Text>
                </HStack>

                <Button
                  as={Link}
                  href={waUrl}
                  isExternal
                  leftIcon={<FaWhatsapp />}
                  size="md"
                  w="full"
                  bg="white"
                  color={GREEN}
                  _hover={{ bg: "white" }}
                  rounded="full"
                >
                  Escríbenos por WhatsApp
                </Button>

                <Divider my={6} borderColor="whiteAlpha.300" />

                <Heading as="h3" fontSize="md" mb={3}>
                  Síguenos
                </Heading>
                <HStack spacing={4}>
                  <Link href="https://facebook.com/" isExternal aria-label="Facebook">
                    <Icon as={FaFacebook} boxSize="6" />
                    <VisuallyHidden>Facebook</VisuallyHidden>
                  </Link>
                  <Link href="https://instagram.com/" isExternal aria-label="Instagram">
                    <Icon as={FaInstagram} boxSize="6" />
                    <VisuallyHidden>Instagram</VisuallyHidden>
                  </Link>
                </HStack>
              </Box>
            </GridItem>

            {/* LADO DERECHO: Formulario */}
            <GridItem >
              <Box
                bg="white"
                rounded="xl"
                p={{ base: 6, md: 8 }}
                boxShadow="0 10px 30px rgba(0,0,0,.18)"
                border="1px solid"
                borderColor="blackAlpha.100"
              >
                <Heading as="h2" fontSize={{ base: "xl", md: "2xl" }} mb={2} color="gray.800">
                  Envíanos un mensaje
                </Heading>
                <Text color="gray.600" mb={6}>
                  Responderemos lo antes posible.
                </Text>

                <Box as="form" onSubmit={handleSubmit}>
                  <FormControl isRequired mb={4}>
                    <FormLabel>Nombre</FormLabel>
                    <Input name="nombre" placeholder="Tu nombre" />
                  </FormControl>

                  <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>
                    <FormControl isRequired>
                      <FormLabel>Correo electrónico</FormLabel>
                      <InputGroup>
                        <InputLeftElement pointerEvents="none" children={<Icon as={FiMail} color="gray.400" />} />
                        <Input type="email" name="email" placeholder="tucorreo@ejemplo.com" />
                      </InputGroup>
                    </FormControl>
                    <FormControl>
                      <FormLabel>Teléfono</FormLabel>
                      <InputGroup>
                        <InputLeftElement pointerEvents="none" children={<Icon as={FiPhone} color="gray.400" />} />
                        <Input type="tel" name="telefono" placeholder="+52 ..." />
                      </InputGroup>
                    </FormControl>
                  </Grid>

                  <FormControl isRequired mt={4}>
                    <FormLabel>Mensaje</FormLabel>
                    <Textarea name="mensaje" rows={6} placeholder="Cuéntanos qué necesitas" />
                  </FormControl>

                  <HStack mt={6} spacing={4}>
                    <Button
                      type="submit"
                      colorScheme="green"
                      bg={GREEN}
                      _hover={{ bg: GREEN_DARK }}
                      leftIcon={<FiArrowRight />}
                      isLoading={loading}
                    >
                      Enviar
                    </Button>
                    <Button as={NextLink} href="/" variant="ghost">
                      Volver al inicio
                    </Button>
                  </HStack>
                </Box>
              </Box>
            </GridItem>
          </Grid>
        </Container>
      </Layout>
    </>
  );
}
