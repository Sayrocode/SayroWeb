// components/DualCTASection.tsx
import NextLink from "next/link";
import {
  Box,
  Container,
  Heading,
  SimpleGrid,
  Text,
  AspectRatio,
  Image as ChakraImage,
  useColorModeValue,
  VisuallyHidden,
} from "@chakra-ui/react";

type CardProps = {
  title: string;
  href: string;          // destino (ej. "/#anuncia")
  imgSrc: string;        // url de la imagen
  imgAlt?: string;
  subtitle?: string;     // opcional, se muestra bajo el título
};

function ClickCard({ title, href, imgSrc, imgAlt, subtitle }: CardProps) {
  const ring = useColorModeValue("white", "whiteAlpha.700");

  return (
    <Box
      as={NextLink}
      href={href}
      role="link"
      aria-label={title}
      position="relative"
      rounded="xl"
      overflow="hidden"
      outline="0"
      _focusVisible={{ boxShadow: `0 0 0 4px ${ring}` }}
      _hover={{ transform: "translateY(-2px)" }}
      transition="transform 160ms ease, box-shadow 160ms ease"
    >
      {/* Imagen con ratio 4:3 para aspecto editorial; cambia si quieres 16:9 */}
      <AspectRatio ratio={4 / 3}>
        <ChakraImage
          src={imgSrc}
          alt={imgAlt || title}
          objectFit="cover"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      </AspectRatio>

      {/* Overlay de oscurecido + blur suave */}
      <Box
        pointerEvents="none"
        position="absolute"
        inset={0}
        bg="blackAlpha.500"
        backdropFilter="saturate(120%) blur(0px)"
        transition="all .2s ease"
        _groupHover={{ bg: "blackAlpha.600", backdropFilter: "saturate(130%) blur(1px)" }}
      />

      {/* Texto centrado */}
      <Box
        pointerEvents="none"
        position="absolute"
        inset={0}
        display="grid"
        placeItems="center"
        textAlign="center"
        px={4}
      >
        <Box>
          <Heading
            as="h3"
            fontSize={{ base: "2xl", md: "3xl" }}
            color="white"
            letterSpacing="widest"
            textTransform="uppercase"
            fontWeight="black"
            lineHeight="1.1"
            textShadow="0 2px 16px rgba(0,0,0,.35)"
          >
            {title}
          </Heading>
          {subtitle && (
            <Text mt={2} color="whiteAlpha.900" fontSize={{ base: "sm", md: "md" }}>
              {subtitle}
            </Text>
          )}
        </Box>
      </Box>
    </Box>
  );
}

type DualCTASectionProps = {
  advertiseHref?: string;
  acquireHref?: string;
  advertiseImage?: string;
  acquireImage?: string;
};

export default function DualCTASection({
  advertiseHref = "/#anuncia",
  acquireHref = "/#adquiere",
  advertiseImage = "anuncia.png",
  acquireImage = "adquiere.png",
}: DualCTASectionProps) {
  const bg = useColorModeValue("#FBF6E9", "gray.900"); // crema claro como el mock
  const titleColor = useColorModeValue("black", "white");

  return (
    <Box as="section" bg={bg} py={{ base: 10, md: 14 }}>
      <Container maxW="7xl">
        <Heading
          as="h2"
          size="md"
          textAlign="center"
          color={titleColor}
          mb={{ base: 6, md: 8 }}
          letterSpacing="wide"
          textTransform="uppercase"
        >
          Anunciantes y Adquirientes
        </Heading>

        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={{ base: 4, md: 8 }}>
          <ClickCard
            title="Anuncia"
            href={advertiseHref}
            imgSrc={advertiseImage}
            imgAlt="Anuncia tu propiedad"
            subtitle="Publica con nosotros y llega a más compradores"
          />
          <ClickCard
            title="Adquiere"
            href={acquireHref}
            imgSrc={acquireImage}
            imgAlt="Encuentra tu próxima propiedad"
            subtitle="Explora inmuebles seleccionados para ti"
          />
        </SimpleGrid>

        {/* SEO: ayudas para lectores de pantalla */}
        <VisuallyHidden>
          <Text>Sección con dos accesos: Anuncia y Adquiere.</Text>
        </VisuallyHidden>
      </Container>
    </Box>
  );
}
