import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Box,
  Container,
  Heading,
  SimpleGrid,
  Stack,
  HStack,
  Text,
  Image as ChakraImage,
  AspectRatio,
  useColorModeValue,
} from '@chakra-ui/react';
import { FaBuilding, FaHome, FaWarehouse } from 'react-icons/fa';
import { MdOutlineBusinessCenter, MdStorefront } from 'react-icons/md';
import { GiBarn, GiFactory, GiSpade } from 'react-icons/gi';

type Cat = {
  key: string;
  label: string;
  icon: any;
  ebTypes: string[]; // posibles valores de EB para intentar previsualización
};

const CATEGORIES: Cat[] = [
  { key: 'departamentos', label: 'DEPARTAMENTOS', icon: FaBuilding, ebTypes: ['Departamento'] },
  { key: 'casas', label: 'CASAS', icon: FaHome, ebTypes: ['Casa'] },
  { key: 'oficinas', label: 'OFICINAS / DESPACHOS', icon: MdOutlineBusinessCenter, ebTypes: ['Oficina', 'Despacho'] },
  { key: 'bodegas', label: 'BODEGAS', icon: FaWarehouse, ebTypes: ['Bodega'] },
  { key: 'granjas', label: 'GRANJAS', icon: GiBarn, ebTypes: ['Granja', 'Rancho'] },
  { key: 'locales', label: 'LOCALES COMERCIALES', icon: MdStorefront, ebTypes: ['Local', 'Local comercial'] },
  { key: 'terrenos', label: 'TERRENOS', icon: GiSpade, ebTypes: ['Terreno', 'Lote'] },
  { key: 'naves', label: 'NAVES INDUSTRIALES', icon: GiFactory, ebTypes: ['Nave industrial'] },
];

type PreviewMap = Record<string, string>; // key -> image url

async function fetchPreview(ebTypes: string[]): Promise<string | null> {
  try {
    // intentamos con el primer tipo, luego fallback con los demás
    for (const t of ebTypes) {
      const params = new URLSearchParams();
      params.append('limit', '1');
      params.append('search[property_types][]', t);
      const r = await fetch(`/api/easybroker?${params.toString()}`, { cache: 'no-store' });
      if (!r.ok) continue;
      const j = await r.json();
      const it = Array.isArray(j.content) && j.content[0];
      const url = it?.title_image_full || it?.title_image_thumb || (Array.isArray(it?.property_images) && it.property_images[0]?.url) || null;
      if (url) return url as string;
    }
  } catch {}
  return null;
}

export default function PropertyCategories() {
  const [hovered, setHovered] = useState<string | null>(null);
  const [previews, setPreviews] = useState<PreviewMap>({});
  const panelBg = useColorModeValue('#6c8f79', '#2f4f3f');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const entries: [string, string | null][] = await Promise.all(
        CATEGORIES.map(async (c) => [c.key, await fetchPreview(c.ebTypes)])
      );
      if (!cancelled) {
        const obj: PreviewMap = {} as any;
        for (const [k, v] of entries) obj[k] = v || '/image3.jpg';
        setPreviews(obj);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const left = CATEGORIES.slice(0, 4);
  const right = CATEGORIES.slice(4);
  const active = hovered ?? '';
  const activeUrl = active ? (previews[active] || '/image3.jpg') : '';
  const activeLabel = active ? (CATEGORIES.find((c) => c.key === active)?.label || '') : '';

  const Item = ({ c }: { c: Cat }) => (
    <HStack
      spacing={{ base: 4, md: 5 }}
      py={{ base: 2, md: 4 }}
      px={2}
      rounded='md'
      _hover={{ bg: 'blackAlpha.100', cursor: 'pointer' }}
      onMouseEnter={() => setHovered(c.key)}
      onFocus={() => setHovered(c.key)}
      onClick={(e) => { e.preventDefault(); }}
      as={Link}
      href={`/propiedades?type=${encodeURIComponent(c.key)}`}
    >
      <Box as={c.icon} boxSize={{ base: '44px', md: '64px' }} color='white' />
      <Text
        fontFamily='body'
        fontWeight='700'
        fontSize={{ base: 'xl', md: '2xl' }}
        letterSpacing='wider'
      >
        {c.label}
      </Text>
    </HStack>
  );

  return (
    <Box bg={panelBg} py={{ base: 12, md: 20 }} color='white' minH={{ base: '70vh', md: '640px' }}>
      <Container maxW='7xl' position='relative' onMouseLeave={() => setHovered(null)}>
        <Heading
          fontFamily='heading'
          fontWeight='700'
          letterSpacing='0.08em'
          fontSize={{ base: '2.3rem', md: '3.5rem' }}
          mb={8}
          textAlign='center'
          textTransform='uppercase'
        >
          INMUEBLES
        </Heading>

        {/* Dos columnas de categorías, sin imagen por defecto */}
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
          <Stack spacing={3}>
            {left.map((c) => (
              <Item key={c.key} c={c} />
            ))}
          </Stack>
          <Stack spacing={3}>
            {right.map((c) => (
              <Item key={c.key} c={c} />
            ))}
          </Stack>
        </SimpleGrid>

        {/* Overlay de previsualización: solo visible al hacer hover */}
        {active && (
          <Box
            position='absolute'
            top={{ base: '84px', md: '110px' }}
            left={{ base: '50%', md: '0' }}
            transform={{ base: 'translateX(-50%)', md: 'none' }}
            w={{ base: '92%', md: '60%' }}
            maxW='900px'
            rounded='lg'
            overflow='hidden'
            shadow='xl'
            transition='opacity 0.2s ease'
          >
            <Box position='relative'>
              <AspectRatio ratio={16/9}>
                <ChakraImage src={activeUrl} alt={activeLabel} objectFit='cover' />
              </AspectRatio>
              <Box position='absolute' top='0' left='0' right='0' bg='blackAlpha.600' px={4} py={3}>
                <HStack>
                  <Text fontWeight='bold'>{activeLabel}</Text>
                </HStack>
              </Box>
              <Box position='absolute' bottom='0' left='0' right='0' bg='blackAlpha.700' px={4} py={3}>
                <Text as={Link} href={`/propiedades?type=${encodeURIComponent(active)}`} textDecor='underline' fontWeight='bold' fontSize='lg'>VER MÁS</Text>
              </Box>
            </Box>
          </Box>
        )}
      </Container>
    </Box>
  );
}
