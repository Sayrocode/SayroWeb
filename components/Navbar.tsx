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
import { navStart } from "../lib/nav";
import Image from "next/image";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { FiMenu, FiX } from "react-icons/fi";

const publicLinks = [
  { name: "Inicio", href: "/" },
  { name: "Nosotros", href: "/#nosotros" },
  { name: "Servicios", href: "/#servicios" },
  { name: "Catálogo", href: "/propiedades" },
  { name: "Catálogo MLS", href: "/catalogo-mls" },
  // Cambiamos contacto para apuntar a la sección del home
  { name: "Contacto", href: "/#contacto" },
  // Mantener orden según diseño de referencia
  { name: "Noticias", href: "/noticias" },
];

export default function Navbar() {
  const router = useRouter();
  const { isOpen, onOpen, onClose } = useDisclosure();

  const isHome = router.pathname === "/";
  // Solo mostramos navegación de admin cuando NO estamos en la pantalla de login
  const isAdmin = router.pathname.startsWith("/admin") && router.pathname !== "/admin/login";
  const adminLinks = [
    { name: "Página", href: "/admin/homepage" },
    { name: "Propiedades", href: "/admin" },
    { name: "Leads", href: "/admin/leads" },
    { name: "Noticias", href: "/admin/noticias" },
  ];
  const links = isAdmin ? adminLinks : publicLinks;
  const [overHero, setOverHero] = useState(true);
  useEffect(() => {
    if (!isHome) return;
    const hero = document.getElementById("hero");
    if (!hero || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        setOverHero(entries[0]?.isIntersecting ?? false);
      },
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

  const isActive = (href: string) => {
    const path = router.pathname;
    // Reglas específicas para admin para evitar subrayar Propiedades cuando estamos en Página
    if (isAdmin) {
      if (href === "/admin/homepage") return path.startsWith("/admin/homepage");
      if (href === "/admin") return path === "/admin" || path.startsWith("/admin/properties");
      return path === href || path.startsWith(`${href}/`);
    }
    return href === "/" ? path === "/" : path.startsWith(href);
  };

  function prewarmContactoAssets() {
    if (typeof window === 'undefined') return;
    try { import('components/HomeContactSection'); } catch {}
    try {
      ['/contactohero.jpg?v=1', '/director.jpg'].forEach((src) => {
        const img = new window.Image();
        img.decoding = 'async' as any;
        img.loading = 'eager';
        img.src = src;
      });
    } catch {}
  }

  function handleNavClick(e: React.MouseEvent, href: string) {
    if (!href.startsWith('/#')) {
      // navegación normal; si cambiará de ruta, dispara loader custom
      const same = (href === router.asPath) || (href === router.pathname);
      if (!same) navStart();
      return;
    }
    if (href === '/#contacto') prewarmContactoAssets();
    const id = href.slice(2);
    if (router.pathname !== '/') {
      // Deja que el router navegue con hash para que el ancla funcione tras montar
      e.preventDefault();
      navStart();
      router.push(`/#${id}`);
      return;
    }
    e.preventDefault();
    // Actualiza el hash sin desplazamiento brusco
    try {
      const url = new URL(window.location.href);
      url.hash = id;
      window.history.replaceState(null, '', url.toString());
    } catch {}
    // Si aún no existe (por carga diferida), fuerza el montaje y reintenta scroll
    let attempts = 0;
    const tryScroll = () => {
      const el = document.getElementById(id);
      if (el) {
        const md = typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(min-width: 48em)').matches;
        const headerOffset = md ? 64 : 56;
        const y = el.getBoundingClientRect().top + (window.pageYOffset || document.documentElement.scrollTop) - headerOffset;
        try { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch {}
        try { window.scrollTo({ top: y, behavior: 'smooth' }); } catch {}
      } else if (attempts < 8) {
        attempts += 1;
        if (attempts === 1) {
          try { window.dispatchEvent(new CustomEvent('app:show-section', { detail: { id } } as any)); } catch {}
        }
        setTimeout(tryScroll, attempts === 1 ? 50 : 150);
      }
    };
    tryScroll();
  }

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
        backdropFilter={isHome && !overHero ? "saturate(180%) blur(10px)" : undefined}
        boxShadow={isHome ? (overHero ? "none" : "sm") : "sm"}
        borderBottom={isHome ? (overHero ? undefined : "1px solid") : "1px solid"}
        borderColor={isHome ? (overHero ? undefined : border) : border}
        transition="box-shadow .35s ease, border-color .35s ease, backdrop-filter .35s ease, transform .3s ease"
        position="fixed"
        top={0}
        left={0}
        right={0}
        zIndex={1000}
        role="navigation"
        aria-label="Navegación principal"
      >
        {/* Fondo degradado animado (debajo del contenido) */}
        <Box
          position="absolute"
          inset={0}
          bgGradient={overlayGradient}
          opacity={isHome && !overHero ? 1 : 0}
          transition="opacity .35s ease"
          pointerEvents="none"
          zIndex={0}
        />
        <Container maxW="7xl" px={{ base: 4, md: 6 }} position="relative" zIndex={1}>
          <Flex h={{ base: 14, md: 16 }} align="center" justify="space-between">
            {/* Izquierda: logo mobile + links desktop */}
            <HStack spacing={{ base: 4, md: 6 }} align="center">
              {/* Logo solo en mobile (izquierda) */}
              <ChakraLink
                as={NextLink}
                href={isAdmin ? "/admin" : "/"}
                display={{ base: 'inline-flex', md: 'none' }}
                alignItems="center"
                onClick={() => navStart()}
              >
                <Image src="/sayrologo.png" width={110} height={30} alt="Sayro Bienes Raíces" priority />
                <VisuallyHidden>Sayro Bienes Raíces</VisuallyHidden>
              </ChakraLink>
              {/* Links solo en desktop */}
              <HStack spacing={6} display={{ base: 'none', md: 'flex' }}>
                {links.map((link) => (
                  <NavItem
                    key={link.href}
                    href={link.href}
                    isActive={isActive(link.href)}
                    color={linkColor}
                    hoverColor={hoverColor}
                    activeBar={activeBar}
                    onClick={(e: any) => handleNavClick(e, link.href)}
                    onMouseEnter={link.href === '/#contacto' ? () => prewarmContactoAssets() : undefined}
                    onFocus={link.href === '/#contacto' ? () => prewarmContactoAssets() : undefined}
                  >
                    {link.name}
                  </NavItem>
                ))}
              </HStack>
            </HStack>

            {/* Derecha: logo desktop + botón menú mobile */}
            <HStack align="center" spacing={2}>
              {/* Logo solo en desktop (derecha) */}
              <ChakraLink as={NextLink} href={isAdmin ? "/admin" : "/"} display={{ base: 'none', md: 'inline-flex' }} alignItems="center" onClick={() => navStart()}>
                <Image src="/sayrologo.png" width={110} height={30} alt="Sayro Bienes Raíces" priority />
                <VisuallyHidden>Sayro Bienes Raíces</VisuallyHidden>
              </ChakraLink>
              {/* Botón menú mobile (derecha) */}
              <IconButton
                aria-label={isOpen ? "Cerrar menú" : "Abrir menú"}
                icon={isOpen ? <FiX /> : <FiMenu />}
                display={{ base: 'inline-flex', md: 'none' }}
                onClick={onOpen}
                fontSize="lg"
                variant="ghost"
                bg="transparent"
                color={linkColor}
                _hover={{ bg: 'blackAlpha.100' }}
                _active={{ bg: 'blackAlpha.200' }}
                rounded="full"
              />
            </HStack>
          </Flex>
        </Container>
      </Box>

      {/* Drawer de navegación móvil */}
      <Drawer isOpen={isOpen} onClose={onClose} placement="top" size="full">
        <DrawerOverlay />
        <DrawerContent bg={drawerBg}>
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
                  onClick={(e: any) => { handleNavClick(e, link.href); onClose(); }}
                  onMouseEnter={link.href === '/#contacto' ? () => prewarmContactoAssets() : undefined}
                  onFocus={link.href === '/#contacto' ? () => prewarmContactoAssets() : undefined}
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
  onClick,
  onMouseEnter,
  onFocus,
}: {
  href: string;
  children: React.ReactNode;
  isActive?: boolean;
  color: string;
  hoverColor: string;
  activeBar: string;
  onClick?: (e: any) => void;
  onMouseEnter?: () => void;
  onFocus?: () => void;
}) {
  return (
    <ChakraLink
      as={NextLink}
      href={href}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onFocus={onFocus}
      position="relative"
      fontWeight="bold"
      fontSize="md"
      letterSpacing="wide"
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
  onMouseEnter,
  onFocus,
}: {
  href: string;
  children: React.ReactNode;
  isActive?: boolean;
  color: string;
  hoverColor: string;
  activeBar: string;
  onClick?: (e: any) => void;
  onMouseEnter?: () => void;
  onFocus?: () => void;
}) {
  return (
    <ChakraLink
      as={NextLink}
      href={href}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onFocus={onFocus}
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
