import { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import Layout from 'components/Layout';
import {
  Box,
  Container,
  Heading,
  Text,
  HStack,
  Button,
  ButtonGroup,
  useColorModeValue,
} from '@chakra-ui/react';

const GREEN = '#0E3B30';

export default function CatalogoMLSPage() {
  const [mode, setMode] = useState<'venta' | 'renta'>('venta');
  const embedSrc = mode === 'venta' ? '/api/embed/mls?path=/properties' : '/api/embed/mls?path=/rentals';

  const bg = useColorModeValue('white', 'gray.800');
  const border = useColorModeValue('blackAlpha.200', 'whiteAlpha.200');

  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // Auto-resize iframe to fit embedded content height (same-origin via proxy)
  useEffect(() => {
    const el = iframeRef.current;
    if (!el) return;
    let ro: ResizeObserver | null = null;
    let mo: MutationObserver | null = null;
    function resizeOnce() {
      try {
        const doc = el.contentDocument || el.contentWindow?.document;
        if (!doc) return;
        const h1 = doc.documentElement?.scrollHeight || 0;
        const h2 = doc.body?.scrollHeight || 0;
        const h = Math.max(h1, h2, 0);
        if (h && el.height !== String(h)) el.style.height = `${h}px`;
      } catch {}
    }
    function onLoad() { resizeOnce(); tryAttachObservers(); }
    function tryAttachObservers() {
      try {
        const doc = el.contentDocument || el.contentWindow?.document;
        if (!doc) return;
        // ResizeObserver on body/html
        if ('ResizeObserver' in window) {
          ro = new (window as any).ResizeObserver(() => resizeOnce());
          if (doc.body) ro.observe(doc.body);
          ro.observe(doc.documentElement);
        }
        // MutationObserver as fallback
        mo = new MutationObserver(() => resizeOnce());
        mo.observe(doc.documentElement, { childList: true, subtree: true, attributes: true, characterData: true });
        // Also listen for hash changes inside iframe
        el.contentWindow?.addEventListener('hashchange', resizeOnce);
        // initial
        setTimeout(resizeOnce, 50);
        setTimeout(resizeOnce, 300);
        setTimeout(resizeOnce, 1200);
      } catch {}
    }
    el.addEventListener('load', onLoad);
    // In case it already loaded
    setTimeout(resizeOnce, 50);
    return () => {
      try { el.removeEventListener('load', onLoad); } catch {}
      try { if (ro) ro.disconnect(); } catch {}
      try { if (mo) mo.disconnect(); } catch {}
    };
  }, [embedSrc]);

  return (
    <Layout title={`Catálogo MLS — ${mode === 'venta' ? 'Venta' : 'Renta'}`}>
      <Head>
        <meta name="robots" content="index,follow" />
      </Head>

      {/* Hero */}
      <Box as="header" bg={GREEN} color="white" py={{ base: 10, md: 14 }}>
        <Container maxW="7xl" px={{ base: 4, md: 6 }}>
          <Heading as="h1" fontSize={{ base: '2xl', md: '3xl' }} lineHeight="short">
            Catálogo MLS
          </Heading>
          <Text mt={2} color="whiteAlpha.900">
            Explora propiedades publicadas en EasyBroker.
          </Text>
        </Container>
      </Box>

      {/* Filtros simples: Venta / Renta */}
      <Container maxW="7xl" px={{ base: 4, md: 6 }} my={{ base: 6, md: 8 }}>
        <HStack justify="space-between" align={{ base: 'stretch', md: 'center' }} flexDir={{ base: 'column', md: 'row' }} gap={4}>
          <Box id="contenido">
            <Heading as="h2" fontSize={{ base: 'xl', md: '2xl' }}>
              {mode === 'venta' ? 'Propiedades en venta | Sayro Bienes Raíces' : 'Propiedades en renta | Sayro Bienes Raíces'}
            </Heading>
          </Box>

          <HStack spacing={4}>
            <ButtonGroup isAttached variant="outline" colorScheme="green">
              <Button onClick={() => setMode('venta')} isActive={mode === 'venta'}>Venta</Button>
              <Button onClick={() => setMode('renta')} isActive={mode === 'renta'}>Renta</Button>
            </ButtonGroup>
          </HStack>
        </HStack>

        {/* Embed proxy (iframe) */}
        <Box
          mt={{ base: 4, md: 6 }}
          // Full-bleed: cancel Container horizontal padding
          mx={{ base: -4, md: -6 }}
          bg={bg}
          borderWidth={0}
          borderColor="transparent"
          rounded="none"
          overflow="hidden"
          boxShadow="none"
        >
          <Box
            as="iframe"
            title={mode === 'venta' ? 'MLS — Venta (embed)' : 'MLS — Renta (embed)'}
            src={embedSrc}
            width="100%"
            // Height will be controlled dynamically; keep a sensible min-height
            height="1400"
            loading="lazy"
            style={{ border: '0', display: 'block', margin: 0, padding: 0 }}
            // Prevent frame-busting; allow required capabilities only
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
            referrerPolicy="strict-origin-when-cross-origin"
            ref={iframeRef as any}
          />
        </Box>
      </Container>
    </Layout>
  );
}
