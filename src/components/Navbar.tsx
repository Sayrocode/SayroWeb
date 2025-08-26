import {
  Box,
  Container,
  Flex,
  HStack,
  Link as ChakraLink,
  useColorModeValue,
  VisuallyHidden,
} from "@chakra-ui/react";
import NextLink from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";

const links = [
  { name: "Inicio", href: "/" },
  { name: "Nosotros", href: "/nosotros" },
  { name: "Servicios", href: "/servicios" },
  { name: "Contacto", href: "/contacto" },

];

export default function Navbar() {
  const router = useRouter();
  const border = useColorModeValue("blackAlpha.200", "whiteAlpha.200");
  const linkColor = useColorModeValue("gray.900", "gray.100");
  const hoverColor = useColorModeValue("gray.700", "white");
  const activeBar = useColorModeValue("green.600", "green.400");
  const bg = useColorModeValue("white", "gray.900");

  const isActive = (href: string) =>
    href === "/" ? router.pathname === "/" : router.pathname.startsWith(href);

  return (
    <>
      {/* Skip link para accesibilidad */}
      <ChakraLink
        href="#contenido"
        position="absolute"
        left="-999px"
        _focus={{ left: "12px", top: "10px", zIndex: 1000, bg: "green.600", color: "white", px: 3, py: 2, rounded: "md" }}
      >
        Saltar al contenido
      </ChakraLink>

      <Box
        as="nav"
        bg={bg}
        boxShadow="sm"
        borderBottom="1px solid"
        borderColor={border}
        position="sticky"
        top={0}
        zIndex={1000}
        role="navigation"
        aria-label="Navegación principal"
      >
        <Container maxW="6xl" px={{ base: 4, md: 6 }}>
          <Flex h={{ base: 14, md: 16 }} align="center" justify="space-between">
            {/* IZQUIERDA: links (como en la imagen) */}
            <HStack spacing={{ base: 4, md: 6 }}>
              {links.map((link) => (
                <NavItem
                  key={link.href}
                  href={link.href}
                  isActive={isActive(link.href)}
                  color={linkColor}
                  hoverColor={hoverColor}
                  activeBar={activeBar}
                >
                  {link.name}
                </NavItem>
              ))}
            </HStack>

            {/* DERECHA: logo */}
            <ChakraLink as={NextLink} href="/" display="inline-flex" alignItems="center">
              {/* Reemplaza la ruta por tu logo real (SVG/PNG) en /public */}
              <Image
                src="/sayrologo.png"
                width={110}
                height={30}
                alt="Sayro Bienes Raíces"
                priority
              />
              <VisuallyHidden>Sayro Bienes Raíces</VisuallyHidden>
            </ChakraLink>
          </Flex>
        </Container>
      </Box>
    </>
  );
}

function NavItem({
  href,
  children,
  isActive,
  color,
  hoverColor,
  activeBar,
}: {
  href: string;
  children: React.ReactNode;
  isActive?: boolean;
  color: string;
  hoverColor: string;
  activeBar: string;
}) {
  return (
    <ChakraLink
      as={NextLink}
      href={href}
      position="relative"
      fontWeight="semibold"
      color={color}
      _hover={{ color: hoverColor, textDecoration: "none" }}
      _focusVisible={{ boxShadow: "0 0 0 2px rgba(0,0,0,0.2)", outline: "none" }}
      aria-current={isActive ? "page" : undefined}
    >
      {children}
      {/* subrayado activo tipo “marker” (similar a tu captura) */}
      <Box
        aria-hidden
        position="absolute"
        left={0}
        right={0}
        bottom={-2}
        h="2px"
        bg={activeBar}
        transformOrigin="left"
        transform={isActive ? "scaleX(1)" : "scaleX(0)"}
        transition="transform .2s ease"
      />
    </ChakraLink>
  );
}
