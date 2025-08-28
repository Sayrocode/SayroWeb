// components/Footer.tsx
import {
  Box,
  Container,
  Stack,
  SimpleGrid,
  Text,
  Link,
  HStack,
  Icon,
  Wrap,
  WrapItem,
  VStack,
  useBreakpointValue,
} from "@chakra-ui/react";
import NextLink from "next/link";
import {
  FiFacebook,
  FiInstagram,
  FiLinkedin,
  FiMail,
  FiPhone,
  FiMapPin,
} from "react-icons/fi";

/** Item de link con punto verde y hover sutil */
function NavLinkItem({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <HStack as="li" spacing={3} align="center">
      <Box boxSize="2" bg="green.400" rounded="full" flexShrink={0} />
      <Link
        as={NextLink}
        href={href}
        fontSize="sm"
        color="whiteAlpha.900"
        _hover={{ color: "green.300", transform: "translateX(2px)" }}
        transition="all .15s ease-out"
      >
        {children}
      </Link>
    </HStack>
  );
}

/** Grupo con título, subrayado verde y (opcional) separador vertical en ≥ md */
function NavGroup({
  title,
  withDivider = false,
  children,
}: {
  title: string;
  withDivider?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Box
      pl={{ md: withDivider ? 6 : 0 }}
      borderLeft={{ md: withDivider ? "1px solid" : "none" }}
      borderColor="whiteAlpha.200"
    >
      <Text
        fontSize="xs"
        color="gray.400"
        textTransform="uppercase"
        letterSpacing="widest"
        mb={2}
      >
        {title}
      </Text>
      <Box w="28" h="1" bg="green.400" mb={4} opacity={0.9} borderRadius="full" />
      <VStack as="ul" align="start" spacing={2.5}>
        {children}
      </VStack>
    </Box>
  );
}

export default function Footer() {
  const iconSize = useBreakpointValue({ base: 4, md: 5 });
  const dividerWidth = useBreakpointValue({ base: "140px", md: "220px" });

  return (
    <Box bg="#2e3331" color="whiteAlpha.900">
      {/* Sección principal */}
      <Container maxW="7xl" py={{ base: 8, md: 12, lg: 14 }} px={{ base: 4, md: 6 }}>
        <Stack
          direction={{ base: "column", lg: "row" }}
          spacing={{ base: 10, lg: 8 }}
          justify="space-between"
          align="stretch"
        >
          {/* IZQUIERDA: menú en 2 por fila (base/sm), 3 columnas en md+ */}
          <SimpleGrid
            columns={{ base: 2, md: 3 }}
            spacingX={{ base: 6, md: 10 }}
            spacingY={{ base: 8, md: 10 }}
            flex="1"
            minW={{ lg: "60%" }}
          >
            <NavGroup title="Secciones">
              <NavLinkItem href="/">Inicio</NavLinkItem>
              <NavLinkItem href="/nosotros">Nosotros</NavLinkItem>
              <NavLinkItem href="/servicios">Servicios</NavLinkItem>
              <NavLinkItem href="/contacto">Contacto</NavLinkItem>
            </NavGroup>

            <NavGroup title="Propiedades" withDivider>
              <NavLinkItem href="/propiedades">Ver todas</NavLinkItem>
              <NavLinkItem href="/propiedades?operacion=venta">Venta</NavLinkItem>
              <NavLinkItem href="/propiedades?operacion=renta">Renta</NavLinkItem>
            </NavGroup>

            <NavGroup title="Soporte" withDivider>
              <NavLinkItem href="/preguntas-frecuentes">Preguntas frecuentes</NavLinkItem>
              <NavLinkItem href="/aviso-de-privacidad">Aviso de Privacidad</NavLinkItem>
              <NavLinkItem href="/terminos">Términos y Condiciones</NavLinkItem>
            </NavGroup>
          </SimpleGrid>

          {/* DERECHA: redes + línea verde + datos */}
          <Box
            w={{ base: "full", lg: "auto" }}
            textAlign={{ base: "center", md: "left", lg: "right" }}
          >
            <HStack
              justify={{ base: "center", md: "flex-start", lg: "flex-end" }}
              spacing={5}
              mb={3}
            >
              <Link href="https://facebook.com" isExternal aria-label="Facebook">
                <Icon as={FiFacebook} boxSize={iconSize} />
              </Link>
              <Link href="https://instagram.com" isExternal aria-label="Instagram">
                <Icon as={FiInstagram} boxSize={iconSize} />
              </Link>
              <Link href="https://linkedin.com" isExternal aria-label="LinkedIn">
                <Icon as={FiLinkedin} boxSize={iconSize} />
              </Link>
            </HStack>

            <Box
              h="2px"
              bg="green.500"
              w={dividerWidth}
              mx={{ base: "auto", lg: "unset" }}
              ml={{ lg: "auto" }}
              mb={{ base: 4, md: 5 }}
              borderRadius="full"
            />

            <Stack spacing={2} fontSize={{ base: "sm", md: "sm" }}>
              <HStack
                justify={{ base: "center", md: "flex-start", lg: "flex-end" }}
                align="start"
              >
                <Icon as={FiMapPin} mt="2px" />
                <Text>
                  Diligencias, Querétaro 76020
                  <br /> Av. Circunvalación 11-5
                </Text>
              </HStack>
              <HStack
                justify={{ base: "center", md: "flex-start", lg: "flex-end" }}
              >
                <Icon as={FiMail} />
                <Link href="mailto:info@sayro.com">info@sayro.com</Link>
              </HStack>
              <HStack
                justify={{ base: "center", md: "flex-start", lg: "flex-end" }}
              >
                <Icon as={FiPhone} />
                <Link href="tel:+524422133030">(442) 213-30-30</Link>
              </HStack>
            </Stack>
          </Box>
        </Stack>
      </Container>

      {/* Subfooter */}
      <Box bg="#3a3f3d">
        <Container maxW="7xl" py={{ base: 4, md: 5 }} px={{ base: 4, md: 6 }}>
          <Stack
            direction={{ base: "column", md: "row" }}
            spacing={{ base: 4, md: 6 }}
            align={{ base: "center", md: "center" }}
            justify="space-between"
            fontSize={{ base: "xs", md: "sm" }}
            color="gray.200"
            textAlign={{ base: "center", md: "left" }}
          >
            <Wrap spacing={{ base: 2, md: 3 }} justify={{ base: "center", md: "flex-start" }}>
              <WrapItem>
                <Link as={NextLink} href="/terminos" _hover={{ color: "green.300" }}>
                  Términos y Condiciones
                </Link>
              </WrapItem>
              <WrapItem>•</WrapItem>
              <WrapItem>
                <Link as={NextLink} href="/aviso-de-privacidad" _hover={{ color: "green.300" }}>
                  Política de privacidad
                </Link>
              </WrapItem>
              <WrapItem>•</WrapItem>
              <WrapItem>
                <Link as={NextLink} href="/cookies" _hover={{ color: "green.300" }}>
                  Política de Cookies
                </Link>
              </WrapItem>
              <WrapItem>•</WrapItem>
              <WrapItem>
                <Link as={NextLink} href="/datos" _hover={{ color: "green.300" }}>
                  Gestionar datos
                </Link>
              </WrapItem>
            </Wrap>

            <Text>
              © {new Date().getFullYear()} Sayro Bienes Raíces — Sitio desarrollado por Sayro
            </Text>
          </Stack>
        </Container>
      </Box>
    </Box>
  );
}
