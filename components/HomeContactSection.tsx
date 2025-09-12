import { Box, Container, Grid, GridItem, Heading, Text, VStack, HStack, Icon, Link, Image as ChakraImage, useColorModeValue } from "@chakra-ui/react";
import { FaFacebook, FaInstagram } from "react-icons/fa";

/*
  HomeContactSection
  ------------------------------------------------------------------
  Sección de contacto para portada (index) que replica el layout
  compartido: panel izquierdo verde con títulos y datos de contacto,
  imagen grande a la derecha, y retrato flotante sobrepuesto.

  Imágenes usadas por defecto (puedes reemplazarlas en /public):
  - Fondo edificio:   /contactohero.jpg
  - Retrato director: /director.jpg

  Si deseas usar otras, coloca, por ejemplo:
    /public/contact/building.jpg y /public/contact/director.png
  y actualiza los src abajo.
*/

const GREEN = "#0E3B30"; // acorde al diseño

export default function HomeContactSection() {
  const sectionBg = useColorModeValue("#FBF6E9", "gray.900");

  return (
    <Box as="section" bg={sectionBg} pt={{ base: 8, md: 12 }} pb={0}>
      {/* Full-bleed: sin márgenes horizontales */}
      <Container maxW="100%" px={0} py={0} position="relative">
        {/* Sin espacios entre verde e imagen en desktop */}
        <Grid templateColumns={{ base: "1fr", md: "1.1fr 1.2fr" }} gap={{ base: 6, md: 0 }} alignItems="stretch">
          {/* Panel izquierdo */}
          <GridItem>
            <Box
              bg={GREEN}
              color="white"
              /* Esquinas exteriores redondeadas; costado al centro recto */
              borderTopLeftRadius={{ base: "none", md: "none" }}
              borderBottomLeftRadius={{ base: "none", md: "none" }}
              borderTopRightRadius={{ base: "lg", md: "none" }}
              borderBottomRightRadius={{ base: "lg", md: "none" }}
              pl={{ base: 6, md: 10 }}
              pr={{ base: 2, md: 0 }}
              py={{ base: 8, md: 12 }}
              position="relative"
              minH={{ md: "520px" }}
              /* Sin borde/sombra para que no se vea separación */
              border="none"
              boxShadow="none"
              overflow="visible" /* permite que el retrato cruce al lado derecho */
              h="full"
            >
              <Heading
                as="h2"
                fontSize={{ base: "2xl", md: "4xl" }}
                letterSpacing="wide"
                textTransform="uppercase"
                mb={{ base: 5, md: 6 }}
              >
                CONTACTO
              </Heading>

              {/* Contenido textual con espacio reservado para el retrato */}
              {/* Acerca el texto al retrato; reserva ~mitad de la foto + pequeño margen */}
              <VStack align="start" spacing={{ base: 1.5, md: 2 }} pr={{ base: 0, md: 30 }}>
                <Text fontSize={{ base: "xl", md: "2xl" }}>
                  Raul Martín Salamanca Riba
                </Text>
                <Text fontSize={{ base: "lg", md: "2xl" }} fontStyle="italic" fontWeight="semibold">
                  Director
                </Text>

                <Box h={{ base: 2, md: 4 }} />

                <Text fontSize={{ base: "md", md: "lg" }} fontStyle="italic">
                  Av. Circunvalación 11-5
                </Text>
                <Text fontSize={{ base: "md", md: "lg" }} fontStyle="italic">
                  Col. Diligencias C.P. 76020 Qro. Qro.
                </Text>
                <Text fontSize={{ base: "md", md: "lg" }} fontStyle="italic">
                  (442)213-30-30
                </Text>
                <Text fontSize={{ base: "md", md: "lg" }} fontStyle="italic">
                  9:00 a 17:00 (lunes a viernes)
                </Text>
              </VStack>

              {/* Bloque de redes (abajo-izquierda) */}
              <Box position="absolute" left={{ base: 4, md: 6 }} bottom={{ base: 4, md: 6 }}>
                <Text fontWeight="semibold" mb={2}>
                  Síguenos
                </Text>
                <HStack spacing={4}>
                  <Link href="https://facebook.com/" isExternal aria-label="Facebook">
                    <Icon as={FaFacebook} boxSize={6} />
                  </Link>
                  <Link href="https://instagram.com/" isExternal aria-label="Instagram">
                    <Icon as={FaInstagram} boxSize={6} />
                  </Link>
                </HStack>
              </Box>

              {/* Retrato flotante */}
              <ChakraImage
                src="/director.jpg" // retrato (actualiza si subes otro)
                alt="Retrato"
                position="absolute"
                top={{ base: "14%", md: "18%" }}
                right={{ base: 0, md: 0 }}
                left="auto"
                transform="translateX(50%)" /* mitad sobre el borde de unión */
                w={{ base: 40, md: 56 }}
                h="auto"
                rounded="md"
                shadow="xl"
                border="1px solid rgba(255,255,255,.6)"
                display={{ base: "none", sm: "block" }}
                zIndex={2}
              />
            </Box>
          </GridItem>

          {/* Imagen derecha */}
          <GridItem>
            <Box
              role="img"
              aria-label="Edificio"
              /* Esquinas exteriores redondeadas; costado al centro recto */
              borderTopRightRadius={{ base: "none", md: "none" }}
              borderBottomRightRadius={{ base: "none", md: "none" }}
              borderTopLeftRadius={{ base: "lg", md: "none" }}
              borderBottomLeftRadius={{ base: "lg", md: "none" }}
              overflow="hidden"
              position="relative"
              minH={{ base: 56, md: 96 }}
              border="none"
              boxShadow="none"
              h="full"
            >
              <ChakraImage
                src="/contactohero.jpg?v=1" // imagen del edificio
                alt="Fachada"
                w="100%"
                h="100%"
                objectFit="cover"
                bg={GREEN} /* fondo verde mientras carga para mantener estética */
                display="block" /* elimina gap por baseline de imagen */
                draggable={false}
              />
            </Box>
          </GridItem>
        </Grid>
      </Container>
    </Box>
  );
}
