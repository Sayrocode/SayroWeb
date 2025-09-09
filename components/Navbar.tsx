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
import { useEffect, useState } from "react";
import { FiMenu, FiX } from "react-icons/fi";

const publicLinks = [
  { name: "Inicio", href: "/" },
  { name: "Nosotros", href: "/nosotros" },
  { name: "Servicios", href: "/servicios" },
  { name: "Contacto", href: "/contacto" },
  { name: "Noticias", href: "/#noticias" },
];

export default function Navbar() {
  const router = useRouter();
  const { isOpen, onOpen, onClose } = useDisclosure();

  const isHome = router.pathname === "/";
  const isAdmin = router.pathname.startsWith("/admin") && router.pathname !== "/admin/login";
  const adminLinks = [
    { name: "Propiedades", href: "/admin" },
    { name: "Leads", href: "/admin/leads" },
  ];
  const links = isAdmin ? adminLinks : publicLinks;
  const [overHero, setOverHero] = useState(true);
  useEffect(() => {
    if (!isHome) return;
    const hero = document.getElementById("hero");
    if (!hero || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => { setOverHero(entries[0]?.isIntersecting ?? false); },
      { threshold: 0.1 }
    );
    io.observe(hero);
    return () => io.disconnect();
  }, [isHome]);

  const border = useColorModeValue("blackAlpha.200", "whiteAlpha.200");
  const linkColor = useColorModeValue("gray.900", "gray.100");
  const hoverColor = useColorModeValue("gray.700", "white");
  const activeBar = useColorModeValue("green.600", "green.400");
  const bg = isHome ? "transparent" : useColorModeValue("white", "gray.900");
  const drawerBg = useColorModeValue("white", "gray.900");
  const overlayGradient = useColorModeValue(
    "linear-gradient(to bottom, rgba(255,255,255,0.90), rgba(255,255,255,0.72))",
    "linear-gradient(to bottom, rgba(17,24,39,0.90), rgba(17,24,39,0.72))"
  );

  const isActive = (href: string) =>
    href === "/" ? router.pathname === "/" : router.pathname.startsWith(href);

  return (
    <>
      <ChakraLink
        href="#contenido"
        position="absolute"
        left="-999px"
        _focus={{ left: "12px", top: "10px", bg: "green.600", color: "white", px: 3, py: 1, zIndex: 1000, rounded: "md" }}
      >
        <VisuallyHidden>Ir al contenido principal</VisuallyHidden>
      </ChakraLink>

      <Box
        as="nav"
        position="fixed"
        top={0}
        left={0}
        right={0}
        zIndex={20}
        bg={isHome ? (overHero ? "transparent" : bg) : bg}
        borderBottomWidth={isHome && overHero ? 0 : 1}
        borderColor={border}
        transition="background-color .2s ease, border-color .2s ease"
        _before={isHome && overHero ? { content: '""', position: 'absolute', inset: 0, bgGradient: overlayGradient, pointerEvents: 'none' } : undefined}
      >
        <Container maxW="7xl" py={{ base: 3, md: 3 }} px={{ base: 4, md: 6 }}>
          <Flex align="center" justify="space-between">
            <HStack spacing={3} align="center">
              <NextLink href={isAdmin ? "/admin" : "/"}>
                <Image src="/sayrologo.png" alt="Sayro" width={132} height={36} priority />
              </NextLink>
            </HStack>
            <HStack spacing={6} display={{ base: "none", md: "flex" }}>
              {links.map((l) => (
                <ChakraLink
                  key={l.href}
                  as={NextLink}
                  href={l.href}
                  color={linkColor}
                  _hover={{ color: hoverColor, textDecoration: "none" }}
                  position="relative"
                  pb={2}
                >
                  {l.name}
                  {isActive(l.href) && (
                    <Box position="absolute" left={0} right={0} bottom={0} h="2px" bg={activeBar} />
                  )}
                </ChakraLink>
              ))}
            </HStack>

            <IconButton
              aria-label="Abrir menú"
              icon={isOpen ? <FiX /> : <FiMenu />}
              onClick={isOpen ? onClose : onOpen}
              display={{ base: "inline-flex", md: "none" }}
              variant={isHome && overHero ? "ghost" : "outline"}
            />
          </Flex>
        </Container>

        <Drawer isOpen={isOpen} placement="right" onClose={onClose}>
          <DrawerOverlay />
          <DrawerContent bg={drawerBg}>
            <DrawerHeader borderBottomWidth="1px">Menú</DrawerHeader>
            <DrawerBody>
              <VStack align="stretch" spacing={2}>
                {links.map((l) => (
                  <ChakraLink as={NextLink} key={l.href} href={l.href} onClick={onClose} py={2}>
                    {l.name}
                  </ChakraLink>
                ))}
              </VStack>
              <Divider my={4} />
              <ChakraLink as={NextLink} href={isAdmin ? "/" : "/admin/login"}>
                {isAdmin ? "Volver al sitio" : "Admin"}
              </ChakraLink>
            </DrawerBody>
          </DrawerContent>
        </Drawer>
      </Box>
      <Box id="contenido" />
    </>
  );
}

