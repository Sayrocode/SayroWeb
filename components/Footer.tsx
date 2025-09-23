// components/Footer.tsx
import React from 'react';
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
  Collapse,
  Flex,
  Button,
} from "@chakra-ui/react";
import NextLink from "next/link";
import { useRouter } from "next/router";
import { navStart } from "../lib/nav";
import {
  FiFacebook,
  FiInstagram,
  FiLinkedin,
  FiMail,
  FiPhone,
  FiMapPin,
  FiChevronDown,
} from "react-icons/fi";

/** Item de link con punto verde y hover sutil */
function NavLinkItem({ href, children, onClick }: { href: string; children: React.ReactNode; onClick?: (e: any) => void }) {
  return (
    <HStack as="li" spacing={3} align="center">
      <Box boxSize="2.5" bg="brand.100" rounded="full" flexShrink={0} />
      <Link
        as={NextLink}
        href={href}
        onClick={onClick}
        fontSize="sm"
        color="white"
        _hover={{ color: "brand.100", transform: "translateX(2px)" }}
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
  collapsible = false,
  defaultOpen = true,
}: {
  title: string;
  withDivider?: boolean;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  React.useEffect(() => setOpen(defaultOpen), [defaultOpen]);
  const HeadingEl = (
    <Flex
      align="center"
      justify="space-between"
      onClick={() => collapsible && setOpen((v) => !v)}
      cursor={collapsible ? 'pointer' : 'default'}
      userSelect="none"
      py={{ base: 1, md: 0 }}
    >
      <Text
        fontSize="xs"
        color="white"
        textTransform="uppercase"
        letterSpacing="widest"
        fontFamily='heading'
      >
        {title}
      </Text>
      {collapsible && (
        <Icon
          as={FiChevronDown}
          transform={open ? 'rotate(180deg)' : 'rotate(0)'}
          transition="transform .15s ease-out"
        />
      )}
    </Flex>
  );

  return (
    <Box
      pl={{ md: withDivider ? 6 : 0 }}
      borderLeft={{ md: withDivider ? "1px solid" : "none" }}
      borderColor="whiteAlpha.200"
    >
      {HeadingEl}
      <Box w="28" h="1" bg="brand.100" my={3} opacity={0.95} borderRadius="full" display={{ base: collapsible ? 'none' : 'block', md: 'block' }} />
      <Collapse in={open} animateOpacity style={{ overflow: 'hidden' }}>
        <VStack as="ul" align="start" spacing={2.5} pt={{ base: 2, md: 0 }}>
          {children}
        </VStack>
      </Collapse>
      {collapsible && <Box h="1px" bg="whiteAlpha.200" mt={4} display={{ base: 'block', md: 'none' }} />}
    </Box>
  );
}

export default function Footer() {
  const iconSize = useBreakpointValue({ base: 4, md: 5 });
  const dividerWidth = useBreakpointValue({ base: "140px", md: "220px" });
  const isMobile = useBreakpointValue({ base: true, md: false });
  const router = useRouter();

  function prewarmContactoAssets() {
    if (typeof window === 'undefined') return;
    try { import('components/HomeContactSection'); } catch {}
    try {
      ['/contactohero.jpg?v=1', '/director.jpg'].forEach((src) => {
        const img = new window.Image();
        (img as any).decoding = 'async';
        (img as any).loading = 'eager';
        img.src = src;
      });
    } catch {}
  }

  function handleNavClick(e: React.MouseEvent, href: string) {
    // Igual que en Navbar: tratamos anclas de la home como scroll suave
    if (!href.startsWith('/#')) {
      const same = (href === router.asPath) || (href === router.pathname);
      if (!same) navStart();
      return;
    }
    if (href === '/#contacto') prewarmContactoAssets();
    const id = href.slice(2);
    if (router.pathname !== '/') {
      e.preventDefault();
      navStart();
      router.push(`/#${id}`);
      return;
    }
    e.preventDefault();
    try {
      const url = new URL(window.location.href);
      url.hash = id;
      window.history.replaceState(null, '', url.toString());
    } catch {}
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
        requestAnimationFrame(tryScroll);
      }
    };
    tryScroll();
  }

  return (
    <Box bg="#013927" color="white">
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
            columns={{ base: 1, sm: 2, md: 3 }}
            spacingX={{ base: 6, md: 10 }}
            spacingY={{ base: 8, md: 10 }}
            flex="1"
            minW={{ lg: "60%" }}
          >
            <NavGroup title="Secciones" collapsible={!!isMobile} defaultOpen={!isMobile}>
              <NavLinkItem href="/" onClick={(e) => handleNavClick(e as any, "/")}>Inicio</NavLinkItem>
              <NavLinkItem href="/#nosotros" onClick={(e) => handleNavClick(e as any, "/#nosotros")}>Nosotros</NavLinkItem>
              <NavLinkItem href="/#servicios" onClick={(e) => handleNavClick(e as any, "/#servicios")}>Servicios</NavLinkItem>
              <NavLinkItem href="/#contacto" onClick={(e) => handleNavClick(e as any, "/#contacto")}>Contacto</NavLinkItem>
            </NavGroup>

            <NavGroup title="Propiedades" withDivider collapsible={!!isMobile} defaultOpen={!isMobile}>
              <NavLinkItem href="/propiedades">Ver todas</NavLinkItem>
            </NavGroup>

            <NavGroup title="Soporte" withDivider collapsible={!!isMobile} defaultOpen={!isMobile}>
              
              <NavLinkItem href="/aviso-de-privacidad">Aviso de Privacidad</NavLinkItem>
              <NavLinkItem href="/terminos">Términos y Condiciones</NavLinkItem>
            </NavGroup>
          </SimpleGrid>

          {/* DERECHA: redes + línea verde + datos */}
          <Box
            w={{ base: "full", lg: "auto" }}
            textAlign={{ base: "center", md: "left", lg: "right" }}
          >
            <HStack justify={{ base: "center", md: "flex-start", lg: "flex-end" }} spacing={4} mb={3}>
              {[{ href: 'https://facebook.com', icon: FiFacebook, label: 'Facebook' }, { href: 'https://instagram.com', icon: FiInstagram, label: 'Instagram' }, { href: 'https://linkedin.com', icon: FiLinkedin, label: 'LinkedIn' }].map((s) => (
                <Link key={s.label} href={s.href} isExternal aria-label={s.label} _focus={{ boxShadow: '0 0 0 2px rgba(255,255,255,0.6)', borderRadius: 'md' }}>
                  <Button variant="ghost" color="white" _hover={{ bg: 'whiteAlpha.200' }} _active={{ bg: 'whiteAlpha.300' }} p={3} minW="unset" borderRadius="md">
                    <Icon as={s.icon} boxSize={{ base: 5, md: iconSize }} />
                  </Button>
                </Link>
              ))}
            </HStack>

            <Box
              h="2px"
              bg="brand.100"
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
      <Box bg="#0E3B30">
        <Container maxW="7xl" py={{ base: 4, md: 5 }} px={{ base: 4, md: 6 }}>
          <Stack
            direction={{ base: "column", md: "row" }}
            spacing={{ base: 4, md: 6 }}
            align={{ base: "center", md: "center" }}
            justify="space-between"
            fontSize={{ base: "xs", md: "sm" }}
            color="whiteAlpha.900"
            textAlign={{ base: "center", md: "left" }}
          >
            

            <Text>
              © {new Date().getFullYear()} Sayro Bienes Raíces — Sitio desarrollado por Sayro
            </Text>
          </Stack>
        </Container>
      </Box>
    </Box>
  );
}
