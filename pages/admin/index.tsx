import type { GetServerSideProps } from 'next';
import React from 'react';
import { getIronSession } from 'iron-session';
import Layout from '../../components/Layout';
import { sessionOptions, AppSession } from '../../lib/session';
import { Box, Button, Container, Heading, Text, SimpleGrid, Image, Flex, Spacer, HStack, Input, InputGroup, InputLeftElement, IconButton, Badge, AspectRatio, Menu, MenuButton, MenuItem, MenuList, Tooltip, Skeleton, Checkbox, Switch, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, RadioGroup, Stack, Radio, NumberInput, NumberInputField, useToast, Wrap, WrapItem, Breadcrumb, BreadcrumbItem, Select, BreadcrumbLink } from '@chakra-ui/react';
import { SearchIcon } from '@chakra-ui/icons';
import { FiMoreVertical, FiExternalLink, FiCopy, FiRefreshCw, FiTrash2, FiEdit2 } from 'react-icons/fi';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import useSWRInfinite from 'swr/infinite';
import Link from 'next/link';

type Props = {
  username: string;
};

export default function AdminHome({ username }: Props) {
  const router = useRouter();
  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/admin/login');
  };
  const fetcher = (url: string) => fetch(url).then((r) => r.json());
  const PAGE_SIZE = 36;
  const getKey = (index: number) => `/api/admin/properties?take=${PAGE_SIZE}&page=${index + 1}`;
  const { data, mutate, size, setSize, isLoading } = useSWRInfinite(getKey, fetcher);
  const pages = data || [];
  const total: number = pages.length ? (pages[0]?.total ?? 0) : 0;
  const aggregated = pages.flatMap((p: any) => Array.isArray(p?.items) ? p.items : []);
  const isInitial = !data || data.length === 0;
  const isLoadingMore = isLoading || (size > 0 && !!data && typeof data[size - 1] === 'undefined');
  const isReachingEnd = (pages.length > 0 && (pages[pages.length - 1]?.items?.length || 0) < PAGE_SIZE) || (total > 0 && aggregated.length >= total);
  const loaderRef = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    const el = loaderRef.current;
    if (!el) return;
    const ob = new IntersectionObserver((entries) => {
      const e = entries[0];
      if (e.isIntersecting && !isLoadingMore && !isReachingEnd) {
        setSize((s) => s + 1);
      }
    }, { rootMargin: '300px 0px' });
    ob.observe(el);
    return () => ob.disconnect();
  }, [loaderRef.current, isLoadingMore, isReachingEnd, setSize]);
  const [qRaw, setQRaw] = React.useState('');
  const [qDebounced, setQDebounced] = React.useState('');
  React.useEffect(() => {
    const h = setTimeout(() => setQDebounced(qRaw), 350);
    return () => clearTimeout(h);
  }, [qRaw]);
  const [type, setType] = React.useState('');
  const [city, setCity] = React.useState('');
  const [range, setRange] = React.useState('');
  const [campaignMode, setCampaignMode] = React.useState(false);
  const [selected, setSelected] = React.useState<number[]>([]);
  const [isOpen, setIsOpen] = React.useState(false);
  const [adType, setAdType] = React.useState<'single'|'carousel'>('single');
  const [budget, setBudget] = React.useState(150);
  const [days, setDays] = React.useState(7);
  const toast = useToast();
  // Copy fields (single)
  const [copyHeadline, setCopyHeadline] = React.useState('');
  const [copyDesc, setCopyDesc] = React.useState('');
  const [copyPrimary, setCopyPrimary] = React.useState('');
  const [genLoading, setGenLoading] = React.useState(false);
  const [egoLoading, setEgoLoading] = React.useState(false);
  const [imgLoading, setImgLoading] = React.useState(false);
  // Carousel
  const [carouselMsg, setCarouselMsg] = React.useState('');
  const [carouselCopies, setCarouselCopies] = React.useState<Record<number, {headline: string, description: string}>>({});
  // Preview
  const [preview, setPreview] = React.useState<any | null>(null);
  const [previewLoading, setPreviewLoading] = React.useState(false);
  const items = aggregated; // no filtro por texto aquí; lo maneja la búsqueda avanzada

  const typeOptions = React.useMemo(() => Array.from(new Set((items || []).map((p: any) => p.propertyType).filter(Boolean))) as string[], [items]);
  const cityOptions = React.useMemo(() => {
    const arr = (items || []).map((p: any) => (p.locationText || '').split(',').pop()?.trim()).filter(Boolean) as string[];
    return Array.from(new Set(arr));
  }, [items]);
  const inRange = (amount?: number | null) => {
    if (!range || !amount || amount <= 0) return true;
    if (range === '0-1000') return amount < 1_000_000;
    if (range === '1000-2000') return amount >= 1_000_000 && amount < 2_000_000;
    if (range === '2000-3000') return amount >= 2_000_000 && amount < 3_000_000;
    if (range === '3000+') return amount >= 3_000_000;
    return true;
  };
  const filtered = items.filter((p: any) => {
    const okT = !type || p.propertyType === type;
    const lastCity = (p.locationText || '').split(',').pop()?.trim();
    const okC = !city || lastCity === city;
    const okR = inRange((p as any).priceAmount);
    return okT && okC && okR;
  });

  // ===== Super-búsqueda estilo catálogo público =====
  function norm(s: string): string {
    return String(s || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  type ParsedQuery = {
    terms: string[];
    typeHints: string[];
    bedrooms?: number;
    bathrooms?: number;
    parking?: number;
    sizeMin?: number;
    sizeRangeMin?: number;
    sizeRangeMax?: number;
    sizeGuess?: number;
    impliedLandBySize?: boolean;
    place?: string | null;
  };

  function parseQuery(qRaw: string): ParsedQuery {
    const q = norm(qRaw);
    const tokens = q.split(/[^a-z0-9ñ]+/).filter(Boolean);
    const typeHints: string[] = [];
    const maybeType = (w: string) => {
      const w2 = norm(w);
      if (["casa", "casas"].includes(w2)) typeHints.push("casa");
      if (["departamento", "dep", "depa", "deptos", "departamentos"].includes(w2)) typeHints.push("departamento");
      if (["terreno", "lote", "predio", "parcela"].includes(w2)) typeHints.push("terreno");
      if (["oficina", "local", "bodega", "nave"].includes(w2)) typeHints.push(w2);
    };
    tokens.forEach(maybeType);

    // Amenities
    let bedrooms: number | undefined;
    let bathrooms: number | undefined;
    let parking: number | undefined;
    const recM = qRaw.match(/(\d+)\s*(recamaras?|recámaras?|habitaciones?|rec\b)/i);
    const banM = qRaw.match(/(\d+)\s*(banos?|baños?)/i);
    const estM = qRaw.match(/(\d+)\s*(estacionamientos?|cocheras?|autos?)/i);
    if (recM) bedrooms = parseInt(recM[1], 10);
    if (banM) bathrooms = parseInt(banM[1], 10);
    if (estM) parking = parseInt(estM[1], 10);

    // Tamaño
    let sizeMin: number | undefined;
    const sizeRegex = /(\d{2,6})\s*(m2|m²|mts2|mts|metros\s*cuadrados?|metros2|metros)/i;
    const sizeMatch = qRaw.match(sizeRegex);
    if (sizeMatch) sizeMin = parseInt(sizeMatch[1], 10);

    let sizeRangeMin: number | undefined;
    let sizeRangeMax: number | undefined;
    let sizeGuess: number | undefined;
    const numericTokens = tokens.map((t) => (/^\d{2,6}$/.test(t) ? parseInt(t, 10) : NaN)).filter((n) => !Number.isNaN(n)) as number[];
    const impliedLandBySize = numericTokens.length > 0 && !recM && !banM && !estM && !sizeMatch;
    if (numericTokens.length) {
      const guess = numericTokens.find((n) => n >= 50 && n <= 200000);
      if (typeof guess === 'number') {
        sizeRangeMin = Math.max(0, Math.floor(guess * 0.75));
        sizeRangeMax = Math.ceil(guess * 1.35);
        sizeGuess = guess;
      }
    }

    // Lugar: intentamos extraer después de "en " o por coincidencias contra locationText
    let place: string | null = null;
    const enIdx = tokens.indexOf('en');
    if (enIdx >= 0 && enIdx < tokens.length - 1) {
      place = tokens.slice(enIdx + 1, enIdx + 4).join(' ');
    }

    return { terms: tokens, typeHints, bedrooms, bathrooms, parking, sizeMin, sizeRangeMin, sizeRangeMax, sizeGuess, impliedLandBySize, place };
  }

  function getSizeSqmAdmin(p: any): number | null {
    const typeText = norm(p?.propertyType || '');
    if (typeText.includes('terreno')) {
      if (typeof p?.lotSize === 'number') return p.lotSize;
      if (typeof p?.constructionSize === 'number') return p.constructionSize;
      return null;
    }
    if (typeof p?.constructionSize === 'number') return p.constructionSize;
    if (typeof p?.lotSize === 'number') return p.lotSize;
    return null;
  }

  const advancedFiltered = React.useMemo(() => {
    const qx = (qDebounced || '').trim();
    const parsed = parseQuery(qx);
    const sMin = 0;
    const sMax = Infinity;

    return filtered.filter((p: any) => {
      const title = norm(p.title || '');
      const id = norm(String(p.publicId || ''));
      const loc = norm(String(p.locationText || ''));
      const typeText = norm(p.propertyType || '');

      if (qx) {
        const hasSignals = Boolean(parsed.typeHints.length || parsed.bedrooms || parsed.bathrooms || parsed.parking || parsed.place || parsed.sizeMin || parsed.sizeRangeMin);
        const qn = norm(qx);
        const textMatch = title.includes(qn) || id.includes(qn) || loc.includes(qn) || typeText.includes(qn);
        if (!hasSignals && !textMatch) return false;
      }

      if (parsed.typeHints.length) {
        const okType = parsed.typeHints.some((hint) => typeText.includes(hint));
        if (!okType) return false;
      }

      if (parsed.impliedLandBySize && !typeText.includes('terreno')) return false;

      if (typeof parsed.bedrooms === 'number') {
        if (!(typeof p?.bedrooms === 'number' && p.bedrooms >= parsed.bedrooms)) return false;
      }
      if (typeof parsed.bathrooms === 'number') {
        if (!(typeof p?.bathrooms === 'number' && p.bathrooms >= parsed.bathrooms)) return false;
      }
      if (typeof parsed.parking === 'number') {
        if (!(typeof p?.parkingSpaces === 'number' && p.parkingSpaces >= parsed.parking)) return false;
      }

      if (parsed.place) {
        const placeNorm = norm(parsed.place);
        if (placeNorm && !loc.includes(placeNorm)) return false;
      }

      const sqm = getSizeSqmAdmin(p);
      if (typeof parsed.sizeMin === 'number') {
        if (!(typeof sqm === 'number' && sqm >= parsed.sizeMin)) return false;
      }
      if (typeof parsed.sizeRangeMin === 'number' && typeof parsed.sizeRangeMax === 'number') {
        if (typeof sqm === 'number') {
          if (sqm < parsed.sizeRangeMin || sqm > parsed.sizeRangeMax) return false;
        }
      }

      return true;
    });
  }, [filtered, qDebounced, type, city, range]);

  const onDelete = async (id: number) => {
    if (!confirm('¿Eliminar esta propiedad?')) return;
    const r = await fetch(`/api/admin/properties/${id}`, { method: 'DELETE' });
    if (r.ok) mutate();
  };

  const doSync = async () => {
    if (!confirm('Importar/actualizar propiedades desde EasyBroker?')) return;
    const r = await fetch('/api/admin/sync', { method: 'POST' });
    if (r.ok) { await mutate(); }
  };

  const downloadImages = async () => {
    if (!confirm('Descargar y guardar imágenes de todas las propiedades (Turso)?\nSe registrará el progreso en la consola del navegador.')) return;
    setImgLoading(true);
    try {
      const url = '/api/admin/properties/images/download?onlyMissing=1&take=200&start=0&stream=1';
      const r = await fetch(url, { method: 'POST' });
      // Si el endpoint soporta streaming, leer línea por línea y hacer console.log
      if ((r as any).body && typeof (r as any).body.getReader === 'function') {
        const reader = (r as any).body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffered = '';
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          buffered += chunk;
          let idx;
          while ((idx = buffered.indexOf('\n')) >= 0) {
            const line = buffered.slice(0, idx).trimEnd();
            buffered = buffered.slice(idx + 1);
            // eslint-disable-next-line no-console
            if (line) console.log(line);
          }
        }
        const tail = buffered.trim();
        if (tail) {
          // eslint-disable-next-line no-console
          console.log(tail);
        }
      } else {
        // Fallback: intentar parsear JSON si no hay streaming disponible
        const j = await r.json().catch(() => ({}));
        // eslint-disable-next-line no-console
        console.log('Resultado descarga imágenes:', j);
      }
      await mutate();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Error al descargar imágenes:', e);
    } finally {
      setImgLoading(false);
    }
  };

  const doEgoScrape = async () => {
    if (!confirm('Iniciar scraping (headless) desde EgoRealEstate?')) return;
    setEgoLoading(true);
    try {
      const r = await fetch('/api/admin/ego/scrape', { method: 'POST' });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        alert(`Error al ejecutar scraper: ${j?.error || r.statusText}`);
      }
      await mutate();
    } finally {
      setEgoLoading(false);
    }
  };

  const toggleSelect = (id: number) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const openCampaign = () => {
    if (!selected.length) {
      toast({ title: 'Selecciona al menos una propiedad', status: 'warning', duration: 2000 });
      return;
    }
    if (adType === 'single' && selected.length > 1) {
      setAdType('carousel');
    }
    setIsOpen(true);
  };

  const createCampaign = async () => {
    const body: any = { propertyIds: selected, adType, dailyBudget: budget, durationDays: days };
    if (adType === 'single') {
      body.copy = { headline: copyHeadline, description: copyDesc, primaryText: copyPrimary };
    } else {
      body.message = carouselMsg;
      body.copies = Object.entries(carouselCopies).map(([propertyId, v]) => ({ propertyId: Number(propertyId), ...v }));
    }
    const r = await fetch('/api/admin/meta/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json();
    setIsOpen(false);
    if (r.ok && j.ok) {
      toast({ title: 'Campaña creada (PAUSED)', description: 'Revisa en Meta Ads Manager', status: 'success', duration: 3000 });
    } else {
      toast({ title: 'Previsualización', description: j?.reason || 'Faltan credenciales META_* o SITE_BASE_URL. Se devolvió el storySpec para revisión en la consola.', status: 'info', duration: 5000 });
      // eslint-disable-next-line no-console
      console.log('Meta storySpec preview:', j?.storySpec || j);
    }
  };

  const requestPreview = async () => {
    setPreviewLoading(true);
    try {
      const body: any = { propertyIds: selected, adType, dailyBudget: budget, durationDays: days, dryRun: true };
      if (adType === 'single') {
        body.copy = { headline: copyHeadline, description: copyDesc, primaryText: copyPrimary };
      } else {
        body.message = carouselMsg;
        body.copies = Object.entries(carouselCopies).map(([propertyId, v]) => ({ propertyId: Number(propertyId), ...v }));
      }
      const r = await fetch('/api/admin/meta/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const j = await r.json();
      if (j?.storySpec) setPreview(j.storySpec);
      else setPreview(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const selectedItems: any[] = React.useMemo(() => {
    const dict = new Map<number, any>((items || []).map((p: any) => [p.id, p]));
    return selected.map((id) => dict.get(id)).filter(Boolean);
  }, [selected, items]);

  function FacebookSinglePreview({ spec }: { spec: any }) {
    const linkData = spec?.link_data || {};
    const image = linkData.image_url || null;
    return (
      <Box borderWidth='1px' rounded='md' bg='white' color='gray.800' maxW='480px' overflow='hidden'>
        <Box p={3} borderBottomWidth='1px'>
          <HStack spacing={2}>
            <Box boxSize='28px' bg='gray.200' rounded='full' />
            <Box>
              <Text fontWeight='semibold'>Sayro Bienes Raíces</Text>
              <Text fontSize='xs' color='gray.500'>Patrocinado · Facebook</Text>
            </Box>
          </HStack>
          {linkData.message && <Text mt={3}>{linkData.message}</Text>}
        </Box>
        {image && (
          <Box>
            <AspectRatio ratio={1200/628}>
              <Image src={image} alt={linkData.name || 'Anuncio'} objectFit='cover' />
            </AspectRatio>
          </Box>
        )}
        <HStack p={3} spacing={3} align='stretch' borderTopWidth='1px'>
          <Box flex='1'>
            <Text fontSize='xs' color='gray.500'>sayro.mx</Text>
            <Text fontWeight='bold' noOfLines={1}>{linkData.name}</Text>
            <Text fontSize='sm' color='gray.600' noOfLines={1}>{linkData.description}</Text>
          </Box>
          <Box alignSelf='center'>
            <Button size='sm' colorScheme='blue' variant='outline'>Más información</Button>
          </Box>
        </HStack>
      </Box>
    );
  }

  function FacebookCarouselPreview({ spec }: { spec: any }) {
    const car = spec?.carousel_data || {};
    const children = Array.isArray(car.child_attachments) ? car.child_attachments : [];
    return (
      <Box borderWidth='1px' rounded='md' bg='white' color='gray.800' maxW='520px' overflow='hidden'>
        <Box p={3} borderBottomWidth='1px'>
          <HStack spacing={2}>
            <Box boxSize='28px' bg='gray.200' rounded='full' />
            <Box>
              <Text fontWeight='semibold'>Sayro Bienes Raíces</Text>
              <Text fontSize='xs' color='gray.500'>Patrocinado · Facebook</Text>
            </Box>
          </HStack>
          {car.message && <Text mt={3}>{car.message}</Text>}
        </Box>
        <Box p={3}>
          <HStack spacing={3} overflowX='auto'>
            {children.map((c: any, i: number) => (
              <Box key={i} minW='180px' maxW='180px' borderWidth='1px' rounded='md' overflow='hidden'>
                <AspectRatio ratio={1}>
                  <Image src={c.image_url || '/image3.jpg'} alt={c.name || 'card'} objectFit='cover' />
                </AspectRatio>
                <Box p={2}>
                  <Text fontWeight='bold' fontSize='sm' noOfLines={1}>{c.name}</Text>
                  <Text fontSize='xs' color='gray.600' noOfLines={2}>{c.description}</Text>
                </Box>
              </Box>
            ))}
          </HStack>
        </Box>
      </Box>
    );
  }

  const generateCopy = async () => {
    setGenLoading(true);
    const r = await fetch('/api/admin/meta/suggest-copy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ propertyIds: selected, adType }) });
    const j = await r.json();
    setGenLoading(false);
    if (j?.type === 'single' && j.copy) {
      setCopyHeadline(j.copy.headline || '');
      setCopyDesc(j.copy.description || '');
      setCopyPrimary(j.copy.primaryText || '');
    } else if (j?.type === 'carousel') {
      setCarouselMsg(j.message || 'Explora propiedades destacadas');
      const dict: Record<number, {headline: string, description: string}> = {};
      (j.copies || []).forEach((c: any) => { if (c?.id) dict[c.id] = { headline: c.headline || '', description: c.description || '' }; });
      setCarouselCopies(dict);
    } else {
      toast({ title: 'No se pudo generar', status: 'warning', duration: 2000 });
    }
  };
  return (
    <Layout title="Admin">
      <Box bg="#F7F4EC">
      <Container maxW="7xl" py={8}>
        <Stack align="center" mb={4} spacing={3}>
          <Breadcrumb fontSize='sm' color='gray.600' mb={1}>
            <BreadcrumbItem><BreadcrumbLink as={Link} href='/admin'>Inicio</BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbItem isCurrentPage><BreadcrumbLink href='#'>Propiedades</BreadcrumbLink></BreadcrumbItem>
          </Breadcrumb>
          <HStack spacing={3} align="center" mt={-1}>
            <Heading size="lg" textAlign="center" color="#0E3B30">Catálogo de Propiedades</Heading>
            <Badge colorScheme="gray" variant="subtle">{total || 0} total</Badge>
          </HStack>
          <Wrap spacing={3} justify="center">
            <WrapItem flex='1 1 260px'>
              <InputGroup>
                <InputLeftElement pointerEvents="none"><SearchIcon color="gray.400" /></InputLeftElement>
                <Input placeholder="Buscar" value={qRaw} onChange={(e) => setQRaw(e.target.value)} bg="white" />
              </InputGroup>
            </WrapItem>
            <WrapItem>
              <Select bg='white' placeholder='Tipo' value={type} onChange={(e) => setType(e.target.value)} minW='140px'>
                {typeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
              </Select>
            </WrapItem>
            <WrapItem>
              <Select bg='white' placeholder='Ciudad' value={city} onChange={(e) => setCity(e.target.value)} minW='140px'>
                {cityOptions.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </WrapItem>
            <WrapItem>
              <Select bg='white' placeholder='Rango precio' value={range} onChange={(e) => setRange(e.target.value)} minW='160px'>
                <option value='0-1000'>&lt; $1M</option>
                <option value='1000-2000'>$1M - $2M</option>
                <option value='2000-3000'>$2M - $3M</option>
                <option value='3000+'>$3M+</option>
              </Select>
            </WrapItem>
            <WrapItem>
              <HStack px={3} py={2} borderWidth="1px" rounded="md" bg="white">
                <Text fontSize="sm">Campaign Mode</Text>
                <Switch isChecked={campaignMode} onChange={(e) => { setCampaignMode(e.target.checked); setSelected([]); }} />
              </HStack>
            </WrapItem>
            <WrapItem>
              <Button onClick={logout} variant="outline" colorScheme="red" size="sm">Cerrar sesión</Button>
            </WrapItem>
          </Wrap>
        </Stack>

        <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} spacing={{ base: 4, md: 6 }}>
          {(isInitial && aggregated.length === 0) ? Array.from({ length: 6 }).map((_, i) => (
            <Box key={i} borderWidth="1px" rounded="lg" overflow="hidden" bg="white" p={0}>
              <Skeleton height="180px" />
              <Box p={3}>
                <Skeleton height="20px" mb={2} />
                <Skeleton height="16px" width="60%" />
              </Box>
            </Box>
          )) : advancedFiltered.map((p: any) => (
            <Box
              key={p.id}
              borderWidth="1px"
              rounded="lg"
              overflow="hidden"
              bg="white"
              _hover={{ boxShadow: 'lg', transform: 'translateY(-2px)' }}
              transition="all 0.15s ease"
              cursor={campaignMode ? 'pointer' : 'default'}
              onClick={(e) => { if (campaignMode) { e.preventDefault(); toggleSelect(p.id); } }}
            >
              <Box position="relative">
                <AspectRatio ratio={16/9}>
                  <Box
                    as={Link}
                    href={`/admin/properties/${p.id}`}
                    display="block"
                    onClick={(e: any) => { if (campaignMode) { e.preventDefault(); e.stopPropagation(); toggleSelect(p.id); } }}
                  >
                    <Image src={p.coverUrl || '/image3.jpg'} alt={p.title} w="100%" h="100%" objectFit="cover" cursor="pointer" />
                  </Box>
                </AspectRatio>
                {campaignMode && (
                  <Checkbox
                    isChecked={selected.includes(p.id)}
                    onChange={() => toggleSelect(p.id)}
                    position="absolute"
                    top="2"
                    left="2"
                    bg="white"
                    px={2}
                    py={1}
                    rounded="md"
                  />
                )}
                <Menu placement="bottom-end" isLazy>
                  <MenuButton
                    as={IconButton}
                    aria-label="Acciones"
                    icon={<FiMoreVertical />}
                    size="sm"
                    variant="solid"
                    position="absolute"
                    top="2"
                    right="2"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  />
                  <MenuList>
                    <MenuItem as={Link} href={`/admin/properties/${p.id}`} icon={<FiEdit2 />}>Editar</MenuItem>
                    <MenuItem as={Link} href={`/propiedades/${encodeURIComponent(p.publicId)}`} target="_blank" icon={<FiExternalLink />}>Ver público</MenuItem>
                    <MenuItem icon={<FiCopy />} onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigator.clipboard.writeText(`${window.location.origin}/propiedades/${p.publicId}`); }}>Copiar enlace público</MenuItem>
                    <MenuItem icon={<FiTrash2 />} onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(p.id); }}>
                      Eliminar
                    </MenuItem>
                  </MenuList>
                </Menu>
              </Box>
              <Box p={3}>
                <Box
                  as={Link}
                  href={`/admin/properties/${p.id}`}
                  _hover={{ textDecoration: 'none' }}
                  onClick={(e: any) => { if (campaignMode) { e.preventDefault(); e.stopPropagation(); toggleSelect(p.id); } }}
                >
                  <Text fontWeight="bold" noOfLines={1} cursor="pointer">{p.title}</Text>
                </Box>
                <HStack mt={2} spacing={2} color="gray.600" wrap="wrap">
                  {p.propertyType && <Badge colorScheme="green" variant="subtle" rounded="full">{p.propertyType}</Badge>}
                  {p.status && <Badge variant="outline" rounded="full">{p.status}</Badge>}
                  {p.price && <Text fontWeight="semibold" color="green.700">{p.price}</Text>}
                  {p.publicId && <Badge variant="subtle" rounded="full">ID {p.publicId}</Badge>}
                </HStack>
                <HStack mt={3} spacing={2}>
                  <Button as={Link} href={`/admin/properties/${p.id}`} size="sm" colorScheme="blue" leftIcon={<FiEdit2 />} isDisabled={campaignMode} onClick={(e) => { if (campaignMode) { e.preventDefault(); e.stopPropagation(); } }}>Editar</Button>
                  <Button size="sm" variant="outline" colorScheme="red" leftIcon={<FiTrash2 />} isDisabled={campaignMode} onClick={(e) => { if (campaignMode) { e.preventDefault(); e.stopPropagation(); } else { onDelete(p.id); } }}>Eliminar</Button>
                </HStack>
              </Box>
            </Box>
          ))}
        </SimpleGrid>

        {/* Sentinel para cargar más */}
        <Box ref={loaderRef} h="1px" />

        {/* Indicador de carga incremental */}
        {isLoadingMore && (
          <Box mt={6}>
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
              {Array.from({ length: 3 }).map((_, i) => (
                <Box key={i} borderWidth="1px" rounded="lg" overflow="hidden" bg="white" p={0}>
                  <Skeleton height="180px" />
                  <Box p={3}>
                    <Skeleton height="20px" mb={2} />
                    <Skeleton height="16px" width="60%" />
                  </Box>
                </Box>
              ))}
            </SimpleGrid>
          </Box>
        )}

        {campaignMode && (
          <Flex position="fixed" bottom={6} left={0} right={0} justify="center">
            <HStack spacing={3} bg="white" borderWidth="1px" rounded="full" px={4} py={2} boxShadow="md">
              <Text fontWeight="medium">{selected.length} seleccionadas</Text>
              <RadioGroup value={adType} onChange={(v: any) => setAdType(v)}>
                <HStack spacing={4}>
                  <Radio value='single' isDisabled={selected.length !== 1}>Single</Radio>
                  <Radio value='carousel'>Carrusel</Radio>
                </HStack>
              </RadioGroup>
              <Button colorScheme="purple" onClick={openCampaign}>Crear anuncio</Button>
            </HStack>
          </Flex>
        )}

        <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} size='full' scrollBehavior='inside'>
          <ModalOverlay />
          <ModalContent rounded='0' h='100vh'>
            <ModalHeader>Crear anuncio en Meta</ModalHeader>
            <ModalBody>
              <Stack spacing={4}>
                <RadioGroup value={adType} onChange={(v: any) => setAdType(v)}>
                  <Stack direction='row'>
                    <Radio value='single' isDisabled={selected.length !== 1}>Single</Radio>
                    <Radio value='carousel'>Carrusel</Radio>
                  </Stack>
                </RadioGroup>
                <HStack>
                  <Text w="140px">Presupuesto diario (MXN)</Text>
                  <NumberInput value={budget} min={50} onChange={(_, v) => setBudget(Number.isFinite(v) ? v : 150)}>
                    <NumberInputField />
                  </NumberInput>
                </HStack>
                <HStack>
                  <Text w="140px">Duración (días)</Text>
                  <NumberInput value={days} min={1} max={30} onChange={(_, v) => setDays(Number.isFinite(v) ? v : 7)}>
                    <NumberInputField />
                  </NumberInput>
                </HStack>
                {adType === 'single' ? (
                  <Stack spacing={3}>
                    <HStack>
                      <Text w='140px'>Titular</Text>
                      <Input value={copyHeadline} onChange={(e) => setCopyHeadline(e.target.value)} placeholder='Hasta 40 caracteres' />
                    </HStack>
                    <HStack>
                      <Text w='140px'>Descripción</Text>
                      <Input value={copyDesc} onChange={(e) => setCopyDesc(e.target.value)} placeholder='Hasta 60 caracteres' />
                    </HStack>
                    <HStack>
                      <Text w='140px'>Texto principal</Text>
                      <Input value={copyPrimary} onChange={(e) => setCopyPrimary(e.target.value)} placeholder='Hasta 125 caracteres' />
                    </HStack>
                    <HStack>
                      <Button onClick={generateCopy} isLoading={genLoading} colorScheme='purple'>Generar con OpenAI</Button>
                      <Text fontSize='sm' color='gray.600'>Usa detalles de la propiedad para proponer copy.</Text>
                    </HStack>
                    <HStack>
                      <Button onClick={requestPreview} isLoading={previewLoading} colorScheme='blue' variant='outline'>Vista previa</Button>
                      <Text fontSize='sm' color='gray.600'>Ve cómo se vería en el feed.</Text>
                    </HStack>
                    {preview && preview.link_data && (
                      <Box pt={2}><FacebookSinglePreview spec={preview} /></Box>
                    )}
                  </Stack>
                ) : (
                  <Stack spacing={3}>
                    <HStack>
                      <Text w='140px'>Mensaje carrusel</Text>
                      <Input value={carouselMsg} onChange={(e) => setCarouselMsg(e.target.value)} placeholder='Texto breve para el carrusel' />
                    </HStack>
                    <Button onClick={generateCopy} isLoading={genLoading} colorScheme='purple' alignSelf='start'>Generar con OpenAI</Button>
                    {Object.keys(carouselCopies).length > 0 && (
                      <Box borderWidth='1px' rounded='md' p={3}>
                        <Text fontWeight='medium' mb={2}>Títulos sugeridos por tarjeta:</Text>
                        <Stack spacing={1} maxH='180px' overflow='auto'>
                          {Object.entries(carouselCopies).slice(0, 10).map(([pid, v]) => (
                            <Text key={pid} fontSize='sm'>#{pid}: {v.headline} — {v.description}</Text>
                          ))}
                        </Stack>
                      </Box>
                    )}
                    <HStack>
                      <Button onClick={requestPreview} isLoading={previewLoading} colorScheme='blue' variant='outline'>Vista previa</Button>
                      <Text fontSize='sm' color='gray.600'>Muestra el carrusel como en Facebook.</Text>
                    </HStack>
                    {preview && preview.carousel_data && (
                      <Box pt={2}><FacebookCarouselPreview spec={preview} /></Box>
                    )}
                  </Stack>
                )}
                <Text fontSize='sm' color='gray.600'>El anuncio se crea en estado PAUSED para que lo revises y publiques desde Meta Ads Manager.</Text>
              </Stack>
            </ModalBody>
            <ModalFooter>
              <Button mr={3} onClick={() => setIsOpen(false)}>Cancelar</Button>
              <Button colorScheme='purple' onClick={createCampaign}>Crear</Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </Container>
      </Box>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async ({ req, res }) => {
  const session = await getIronSession<AppSession>(req, res, sessionOptions);
  if (!session.user) {
    return { redirect: { destination: '/admin/login', permanent: false } };
  }
  return { props: { username: session.user.username } };
};
