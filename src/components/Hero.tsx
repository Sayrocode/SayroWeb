// components/Hero.tsx
import {
  Box,
  Container,
  Heading,
  Text,
  Button,
  HStack,
  VStack,
  Stack,
  Input,
  InputGroup,
  InputLeftElement,
  Icon,
  useToken,
  useColorModeValue,
  chakra,
  Badge,
} from "@chakra-ui/react";
import { motion } from "framer-motion";
import { FiSearch, FiPhoneCall, FiChevronDown, FiHome } from "react-icons/fi";
import NextLink from "next/link";

const MotionBox = motion(Box);
const MotionHStack = motion(HStack);

type HeroProps = {
  backgroundUrl?: string;
};

export default function Hero({
  backgroundUrl = "/images/hero.jpg", // cámbialo por tu asset
}: HeroProps) {
  const [green500, green600, blackAlpha700] = useToken("colors", [
    "green.500",
    "green.600",
    "blackAlpha.700",
  ]);

  const overlay = `linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.55) 40%, rgba(0,0,0,0.6) 100%)`;
  const accent = useColorModeValue("whiteAlpha.900", "whiteAlpha.900");
  const sub = useColorModeValue("whiteAlpha.800", "whiteAlpha.800");

  return (
    <header role="banner" aria-label="Hero Sayro Bienes Raíces">
      <Box
        position="relative"
        minH={{ base: "80vh", md: "90vh" }}
        bgImage={`${overlay}, url(${backgroundUrl})`}
        bgPos="center"
        bgSize="cover"
        bgRepeat="no-repeat"
      >
        {/* Gradient edge at bottom */}
        <Box
          position="absolute"
          insetX={0}
          bottom={0}
          h="24"
          bgGradient="linear(to-b, transparent, blackAlpha.700)"
          pointerEvents="none"
        />

        <Container maxW="7xl" h="full" pt={{ base: 28, md: 36 }}>
          <VStack
            align="flex-start"
            spacing={6}
            color={accent}
            maxW={{ base: "full", md: "3xl", lg: "4xl" }}
          >
            <MotionBox
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              <Badge
                colorScheme="green"
                variant="solid"
                rounded="full"
                px={3}
                py={1}
                mb={3}
                bg="green.500"
              >
                Nuevo • Inventario actualizado
              </Badge>

              <Heading
                as="h1"
                lineHeight={1.1}
                fontWeight="extrabold"
                fontSize={{ base: "4xl", md: "6xl", lg: "7xl" }}
                letterSpacing="-0.02em"
                textShadow="0 2px 12px rgba(0,0,0,0.35)"
              >
                SAYRO BIENES RAÍCES
              </Heading>

              <Text
                mt={3}
                fontSize={{ base: "lg", md: "xl" }}
                color={sub}
                maxW="2xl"
              >
                El mejor precio, rápido y seguro. Encuentra tu propiedad ideal
                con atención personalizada y procesos claros.
              </Text>
            </MotionBox>

            {/* Quick Search (decorativo, puedes conectarlo a tus filtros) */}
            <MotionBox
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              w="full"
            >
              <InputGroup
                size="lg"
                maxW={{ base: "full", md: "xl" }}
                bg="white"
                rounded="xl"
                shadow="lg"
              >
                <InputLeftElement pointerEvents="none">
                  <Icon as={FiSearch} color="gray.500" />
                </InputLeftElement>
                <Input
                  aria-label="Buscar propiedades"
                  placeholder="Busca por ubicación, tipo o ID (ej. EB-1234)…"
                  _placeholder={{ color: "gray.500" }}
                  bg="white"
                  color="gray.800"
                  rounded="xl"
                />
              </InputGroup>
            </MotionBox>

            {/* CTAs */}
            <MotionHStack
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.45 }}
              spacing={4}
              pt={2}
              flexWrap="wrap"
            >
              <Button
                as={NextLink}
                href="/propiedades"
                size="lg"
                colorScheme="green"
                bg="green.600"
                _hover={{ bg: "green.500", transform: "translateY(-1px)" }}
                leftIcon={<FiHome />}
                rounded="xl"
              >
                Ver Propiedades
              </Button>

              <Button
                as="a"
                href="https://wa.me/5210000000000?text=Hola%20quisiera%20más%20información"
                size="lg"
                variant="outline"
                colorScheme="whiteAlpha"
                borderColor="whiteAlpha.700"
                _hover={{ bg: "whiteAlpha.200" }}
                leftIcon={<FiPhoneCall />}
                rounded="xl"
              >
                Hablemos por WhatsApp
              </Button>
            </MotionHStack>

            {/* Trust signals */}
            <Stack
              direction={{ base: "column", sm: "row" }}
              spacing={{ base: 3, sm: 6 }}
              pt={4}
              color="whiteAlpha.900"
            >
              <TrustBadge label="+10 años de experiencia" />
              <TrustBadge label="+500 propiedades colocadas" />
              <TrustBadge label="4.9/5 en satisfacción" />
            </Stack>
          </VStack>
        </Container>

        {/* Scroll cue */}
        <chakra.button
          aria-label="Desplazarse a contenido"
          position="absolute"
          left="50%"
          transform="translateX(-50%)"
          bottom={6}
          bg="whiteAlpha.200"
          _hover={{ bg: "whiteAlpha.300" }}
          rounded="full"
          p={2}
          onClick={() =>
            document?.getElementById("contenido")?.scrollIntoView({ behavior: "smooth" })
          }
        >
          <Icon as={FiChevronDown} boxSize={6} color="white" />
        </chakra.button>
      </Box>
    </header>
  );
}

function TrustBadge({ label }: { label: string }) {
  return (
    <HStack
      spacing={2}
      bg="blackAlpha.500"
      px={3}
      py={2}
      rounded="full"
      backdropFilter="auto"
      backdropBlur="6px"
    >
      <Box boxSize={2} bg="green.400" rounded="full" />
      <Text fontWeight="medium">{label}</Text>
    </HStack>
  );
}
