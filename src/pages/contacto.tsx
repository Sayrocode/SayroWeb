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
} from "@chakra-ui/react";
import { FiMail, FiPhone, FiMapPin, FiClock, FiArrowRight } from "react-icons/fi";
import { FaWhatsapp, FaFacebook, FaInstagram } from "react-icons/fa";
import Layout from "components/Layout";

const GREEN = "#0E3B30";
const GREEN_DARK = "#0B2B23";

// ✅ Ajusta tus datos
const WHATSAPP_NUMBER = "521234567890"; // solo dígitos, con país (52 México)
const EMAIL_TO = "hola@tu-dominio.com";
const ADDRESS = "Querétaro, Qro., México";
const HOURS = "Lun–Vie 9:00–18:00";

export default function ContactoPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  const waHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    "Hola, me gustaría más información."
  )}`;

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

      <Box as="main" bg="gray.900">
        {/* HERO */}
        <Box
          position="relative"
          bgImage="url(/images/contact-hero.jpg)"
          bgSize="cover"
          bgPos="center"
          bgRepeat="no-repeat"
          minH={{ base: "36vh", md: "48vh" }}
        >
          <Box
            position="absolute"
            inset={0}
            bg="linear-gradient(0deg, rgba(0,0,0,.55) 0%, rgba(0,0,0,.25) 55%, rgba(0,0,0,.15) 100%)"
          />
          <Container maxW="7xl" position="relative" zIndex={1} h="100%">
            <Box display="grid" placeItems="center" h="100%">
              <Heading
                as="p"
                mt={15}
                color="white"
                fontSize={{ base: "2xl", md: "4xl" }}
                letterSpacing="-0.01em"
                textAlign="center"
                textShadow="0 2px 18px rgba(0,0,0,.5)"
              >
                ¿Hablamos?
              </Heading>
              <Text
                mt={2}
                color="whiteAlpha.900"
                textAlign="center"
                maxW="620px"
              >
                Escríbenos y cuéntanos qué necesitas; estamos listos para ayudarte.
              </Text>
            </Box>
          </Container>
        </Box>

        {/* CONTENIDO */}
        <Container bgColor={'white'} maxW="auto" py={{ base: 10, md: 14 }}>
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
                  href={waHref}
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
            <GridItem>
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
      </Box>
      </Layout>
    </>
  );
}
