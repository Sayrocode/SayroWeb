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

const GREEN = "#013927"; // unificado con About/WhatWeDo/Services

export default function HomeContactSection() {
  const sectionBg = useColorModeValue("#fffcf1", "gray.900");

  return (
    <Box
      as="section"
      id="contacto"
      bg={sectionBg}
      pt={{ base: 8, md: 12 }}
      pb={0}
      // margen de scroll para que el ancla no quede oculta bajo el navbar fijo
      scrollMarginTop={{ base: "56px", md: "64px" }}
    >
      {/* Full-bleed: sin márgenes horizontales */}
      <Container maxW="100%" px={0} py={0} position="relative">
        {/* Sin espacios entre verde e imagen en desktop */}
        <Grid
          templateColumns={{ base: "1fr", md: "1.1fr 1.2fr" }}
          gap={{ base: 0, md: 0 }}
          alignItems="stretch"
        >
          {/* Panel izquierdo */}
          <GridItem>
            <Box
              bg={GREEN}
              color="white"
              /* Bordes responsivos: en móvil (stack) redondea arriba; en desktop, sin esquinas (par con imagen) */
              borderTopLeftRadius={{ base: "lg", md: "none" }}
              borderTopRightRadius={{ base: "lg", md: "none" }}
              borderBottomLeftRadius={{ base: "none", md: "none" }}
              borderBottomRightRadius={{ base: "none", md: "none" }}
              pl={{ base: 6, md: 10 }}
              pr={{ base: 2, md: 0 }}
              py={{ base: 8, md: 12 }}
              position="relative"
              minH={{ base: "", md: "520px" }}
              /* Sin borde/sombra para que no se vea separación */
              border="none"
              boxShadow="none"
              overflow="visible" /* permite que el retrato cruce al lado derecho */
              h="full"
            >
              <Heading
                as="h2"
                fontSize={{ base: "2xl", md: "5xl" }}
                letterSpacing="wide"
                fontFamily="'Binggo Wood', heading"
                textTransform="uppercase"
                mb={{ base: 5, md: 6 }}
              >
                CONTACTO
              </Heading>

              {/* Retrato del asesor: arriba del texto en mobile y tablet; flotante a la derecha en desktop */}
              <ChakraImage
                src="/director.jpg"
                alt="Retrato"
                position={{ base: 'relative', md: 'relative', lg: 'absolute' }}
                top={{ base: 'auto', md: 'auto', lg: '16%' }}
                right={{ base: 'auto', md: 'auto', lg: 0 }}
                transform={{ base: 'none', md: 'none', lg: 'translateX(50%)' }}
                w={{ base: 28, sm: 32, md: 40, lg: 56, xl: 64 }}
                h="auto"
                rounded="md"
                shadow="xl"
                border="1px solid rgba(255,255,255,.6)"
                display="block"
                zIndex={2}
                loading="eager"
                decoding="async"
                fetchPriority="high"
                mx={{ base: 'auto', md: 'auto', lg: 'unset' }}
                mb={{ base: 4, md: 6, lg: 0 }}
              />

              {/* Contenido textual con espacio reservado para el retrato */}
              {/* Acerca el texto al retrato; reserva ~mitad de la foto + pequeño margen */}
              <VStack align={{ base: 'center', md: 'start' }} textAlign={{ base: 'center', md: 'left' }} spacing={{ base: 1.5, md: 2 }} pr={{ base: 0, md: 28 }}>
                <Text fontSize={{ base: "lg", md: "2xl" }}>
                  Raul Martín Salamanca Riba
                </Text>
                <Text fontSize={{ base: "md", md: "xl" }} fontStyle="italic" fontWeight="semibold">
                  Director
                </Text>

                <Box h={{ base: 2, md: 4 }} />

                <Text fontSize={{ base: "sm", md: "lg" }} fontStyle="italic">
                  Av. Circunvalación 11-5
                </Text>
                <Text fontSize={{ base: "sm", md: "lg" }} fontStyle="italic">
                  Col. Diligencias C.P. 76020 Qro. Qro.
                </Text>
                <Text fontSize={{ base: "sm", md: "lg" }} fontStyle="italic">
                  <Link href="tel:+524422133030" _hover={{ textDecoration: 'underline' }}>(442)213-30-30</Link>
                </Text>
                <Text fontSize={{ base: "sm", md: "lg" }} fontStyle="italic">
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

              
            </Box>
          </GridItem>

          {/* Imagen derecha */}
          <GridItem>
            <Box
              role="img"
              aria-label="Edificio"
              /* En móvil, redondea abajo; en desktop, sin esquinas */
              borderTopLeftRadius={{ base: "none", md: "none" }}
              borderTopRightRadius={{ base: "none", md: "none" }}
              borderBottomLeftRadius={{ base: "lg", md: "none" }}
              borderBottomRightRadius={{ base: "lg", md: "none" }}
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
                objectPosition={{ base: 'center', md: 'center right' }}
                bg={GREEN} /* fondo verde mientras carga para mantener estética */
                display="block" /* elimina gap por baseline de imagen */
                draggable={false}
                loading="eager"
                decoding="async"
                fetchPriority="high"
              />
            </Box>
          </GridItem>
        </Grid>
      </Container>
    </Box>
  );
}
