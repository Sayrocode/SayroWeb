// components/AboutSplitHero.tsx
import {
    Box,
    Container,
    Grid,
    GridItem,
    Heading,
    Text,
    Stack,
    useColorModeValue,
    Image as ChakraImage,
  } from "@chakra-ui/react";
  
  type AboutSplitHeroProps = {
    title?: string;
    paragraphs?: string[];
    imageSrc: string;         // imagen única del showcase
    imageAlt?: string;
    logoSrc?: string;         // logo centrado encima de la imagen
    logoAlt?: string;
    caption?: string;         // texto pequeño al pie de la imagen (opcional)
  };
  
  export default function AboutSplitHero({
    title = "¿Quiénes somos?",
    paragraphs = [
      "Somos una empresa líder en el sector inmobiliario de la Ciudad de Querétaro, México, con más de 33 años de experiencia respaldando nuestro trabajo.",
      "Nuestro compromiso es garantizar que cada cliente obtenga el mejor precio, con rapidez y seguridad, asegurando la máxima rentabilidad de sus operaciones inmobiliarias y la mayor optimización en sus inversiones.",
      "Nos especializamos en la comercialización de bienes raíces en venta y renta de todo tipo en la Ciudad de Querétaro.",
    ],
    imageSrc,
    imageAlt = "Edificio moderno",
    logoSrc = "/logos/sayro-logo.svg",
    logoAlt = "Sayro Bienes Raíces S.A. de C.V.",
    caption,
  }: AboutSplitHeroProps) {
    const leftBg = useColorModeValue("#0E3B30", "#0E3B30"); // verde profundo como tu mock
    const leftFg = useColorModeValue("white", "white");
  
    return (
      <Box as="section" bg="white" _dark={{ bg: "gray.900" }} py={{ base: 8, md: 10 }}>
        <Container maxW="7xl" px={{ base: 4, md: 6 }}>
          <Grid
            templateColumns={{ base: "1fr", md: "1.05fr 1fr" }}
            gap={{ base: 6, md: 8 }}
            alignItems="stretch"
          >
            {/* Lado izquierdo: bloque verde, tipografía grande y legible */}
            <GridItem
              bg={leftBg}
              color={leftFg}
              rounded={{ base: "xl", md: "xl" }}
              overflow="hidden"
              px={{ base: 6, md: 10 }}
              py={{ base: 8, md: 12 }}
            >
              {/* Etiqueta superior tal como en el mock */}
              <Text
                textAlign="center"
                fontSize="sm"
                fontWeight="bold"
                color="whiteAlpha.900"
                mb={4}
              >
                Este menú es corredizo
              </Text>
  
              <Heading
                as="h2"
                // serif grande; si usas una display (ej. Playfair/DM Serif) ponla aquí:
                fontFamily="'DM Serif Display', ui-serif, Georgia, serif"
                fontWeight="400"
                fontSize={{ base: "2.25rem", md: "3rem" }}
                lineHeight="1.1"
                textAlign="left"
                mb={{ base: 6, md: 8 }}
                letterSpacing="-0.01em"
              >
                {title}
              </Heading>
  
              <Stack spacing={{ base: 3, md: 4 }} maxW="42ch">
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
  
            {/* Lado derecho: una sola imagen con el logo centrado encima */}
            <GridItem
              position="relative"
              rounded="xl"
              overflow="hidden"
              minH={{ base: "56vw", md: "70vh" }}
            >
              {/* Imagen */}
              <ChakraImage
                src={imageSrc}
                alt={imageAlt}
                objectFit="cover"
                w="100%"
                h="100%"
              />
  
              {/* Logo centrado */}
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
                    // ajusta tamaño del logo como en el mock
                    maxW={{ base: "48%", md: "42%" }}
                    opacity={0.95}
                    filter="drop-shadow(0 4px 20px rgba(0,0,0,.35))"
                  />
                </Box>
              )}
  
              {/* Caption inferior sutil (opcional) */}
              {caption && (
                <Text
                  position="absolute"
                  bottom={3}
                  left="50%"
                  transform="translateX(-50%)"
                  fontSize="sm"
                  color="white"
                  textShadow="0 2px 12px rgba(0,0,0,.6)"
                  fontWeight="semibold"
                >
                  {caption}
                </Text>
              )}
            </GridItem>
          </Grid>
        </Container>
      </Box>
    );
  }
  