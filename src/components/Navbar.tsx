// components/Navbar.tsx
import {
  Box,
  Container,
  Flex,
  HStack,
  VStack,
  Link as ChakraLink,
  IconButton,
  useDisclosure,
  useColorModeValue,
  VisuallyHidden,
  Drawer,
  DrawerOverlay,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  Divider,
} from "@chakra-ui/react";
import NextLink from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";
import { FiMenu, FiX } from "react-icons/fi";

const links = [
  { name: "Inicio", href: "/" },
  { name: "Nosotros", href: "/nosotros" },
  { name: "Servicios", href: "/servicios" },
  { name: "Contacto", href: "/contacto" },
];

export default function Navbar() {
  const router = useRouter();
  const { isOpen, onOpen, onClose } = useDisclosure();

  const border = useColorModeValue("blackAlpha.200", "whiteAlpha.200");
  const linkColor = useColorModeValue("gray.900", "gray.100");
  const hoverColor = useColorModeValue("gray.700", "white");
  const activeBar = useColorModeValue("green.600", "green.400");
  const bg = useColorModeValue("white", "gray.900");

  const isActive = (href: string) =>
    href === "/" ? router.pathname === "/" : router.pathname.startsWith(href);

  return (
    <>
      {/* Skip link accesible */}
      <ChakraLink
        href="#contenido"
        position="absolute"
        left="-999px"
        _focus={{
          left: "12px",
          top: "10px",
          zIndex: 1000,
          bg: "green.600",
          color: "white",
          px: 3,
          py: 2,
          rounded: "md",
        }}
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
            {/* Desktop: links */}
            <HStack spacing={{ base: 4, md: 6 }} display={{ base: "none", md: "flex" }}>
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

            {/* Logo (siempre visible) */}
            <ChakraLink as={NextLink} href="/" display="inline-flex" alignItems="center">
              <Image
                src="/sayrologo.png" // reemplaza por tu asset
                width={110}
                height={30}
                alt="Sayro Bienes Raíces"
                priority
              />
              <VisuallyHidden>Sayro Bienes Raíces</VisuallyHidden>
            </ChakraLink>

            {/* Mobile: botón menú */}
            <IconButton
              aria-label={isOpen ? "Cerrar menú" : "Abrir menú"}
              icon={isOpen ? <FiX /> : <FiMenu />}
              variant="ghost"
              display={{ base: "inline-flex", md: "none" }}
              onClick={onOpen}
              fontSize="xl"
            />
          </Flex>
        </Container>
      </Box>

      {/* Drawer de navegación móvil */}
      <Drawer isOpen={isOpen} onClose={onClose} placement="top" size="full">
        <DrawerOverlay />
        <DrawerContent bg={bg}>
          <DrawerHeader
            display="flex"
            alignItems="center"
            justifyContent="space-between"
            borderBottomWidth="1px"
            borderColor={border}
            px={{ base: 4, md: 6 }}
          >
            <ChakraLink as={NextLink} href="/" onClick={onClose} display="inline-flex">
              <Image src="/sayrologo.png" width={110} height={30} alt="Sayro Bienes Raíces" />
              <VisuallyHidden>Sayro Bienes Raíces</VisuallyHidden>
            </ChakraLink>
            <IconButton aria-label="Cerrar menú" icon={<FiX />} variant="ghost" onClick={onClose} />
          </DrawerHeader>

          <DrawerBody px={{ base: 4, md: 6 }} py={6}>
            <VStack as="nav" spacing={2} align="stretch" role="menu">
              {links.map((link, i) => (
                <MobileNavItem
                  key={link.href}
                  href={link.href}
                  isActive={isActive(link.href)}
                  activeBar={activeBar}
                  color={linkColor}
                  hoverColor={hoverColor}
                  onClick={onClose}
                >
                  {link.name}
                </MobileNavItem>
              ))}
            </VStack>

            <Divider my={6} borderColor={border} />
            {/* Puedes añadir aquí botones/CTA secundarios si lo necesitas */}
          </DrawerBody>
        </DrawerContent>
      </Drawer>
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
      {/* subrayado activo desktop */}
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

function MobileNavItem({
  href,
  children,
  isActive,
  color,
  hoverColor,
  activeBar,
  onClick,
}: {
  href: string;
  children: React.ReactNode;
  isActive?: boolean;
  color: string;
  hoverColor: string;
  activeBar: string;
  onClick: () => void;
}) {
  return (
    <ChakraLink
      as={NextLink}
      href={href}
      onClick={onClick}
      py={3.5}
      px={1}
      fontSize="lg"
      fontWeight="semibold"
      color={color}
      _hover={{ color: hoverColor, textDecoration: "none" }}
      _focusVisible={{ boxShadow: "0 0 0 2px rgba(0,0,0,0.2)", outline: "none" }}
      position="relative"
      aria-current={isActive ? "page" : undefined}
      role="menuitem"
    >
      {/* barra activa al lado izquierdo en mobile */}
      <Box
        aria-hidden
        position="absolute"
        left={0}
        top={0}
        bottom={0}
        w="3px"
        bg={activeBar}
        transform={isActive ? "scaleY(1)" : "scaleY(0)"}
        transformOrigin="top"
        transition="transform .2s ease"
      />
      <Box pl={3}>{children}</Box>
    </ChakraLink>
  );
}
