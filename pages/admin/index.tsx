import type { GetServerSideProps } from 'next';
import React from 'react';
import { getIronSession } from 'iron-session';
import Layout from 'components/Layout';
import { sessionOptions, AppSession } from 'lib/session';
import { Box, Button, Container, Heading, Text, SimpleGrid, Image, Flex, Spacer, HStack, Input, InputGroup, InputLeftElement, IconButton, Badge, AspectRatio, Menu, MenuButton, MenuItem, MenuList, Tooltip, Skeleton, Checkbox, Switch, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, RadioGroup, Stack, Radio, NumberInput, NumberInputField, useToast } from '@chakra-ui/react';
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
  const [q, setQ] = React.useState('');
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
  const [preview, setPreview] = React.useState<any | null>(null);
  const [previewLoading, setPreviewLoading] = React.useState(false);
  const items = aggregated.filter((p: any) => {
    const term = q.trim().toLowerCase();
    if (!term) return true;
    return (
      String(p.title || '').toLowerCase().includes(term) ||
      String(p.publicId || '').toLowerCase().includes(term) ||
      String(p.propertyType || '').toLowerCase().includes(term) ||
      String(p.status || '').toLowerCase().includes(term)
    );
  });

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
      // For carousel we rely on API to generate defaults unless provided elsewhere
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
    const image = linkData.image_url || (Array.isArray(linkData.image_hash) ? null : null);
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
                  <Image src={c.image_url} alt={c.name || 'card'} objectFit='cover' />
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
      // Keep simple UX; advanced per-card copy omitted here.
    } else {
      toast({ title: 'No se pudo generar', status: 'warning', duration: 2000 });
    }
  };
  return (
    <Layout title="Admin">
      <Container maxW="7xl" py={8}>
        <Flex align="center" mb={3} gap={3} wrap="wrap">
          <Heading size="lg">Propiedades</Heading>
          <Badge colorScheme="gray" variant="subtle">{total || 0} total</Badge>
          <Spacer />
          <HStack spacing={2}>
            <Button as={Link} href="/admin/leads" colorScheme="green" variant="solid">Leads</Button>
            <Button as={Link} href="/admin/contacts" colorScheme="purple" variant="outline">Contactos EGO</Button>
            <InputGroup w={{ base: 'full', md: '280px' }}>
              <InputLeftElement pointerEvents="none"><SearchIcon color="gray.400" /></InputLeftElement>
              <Input placeholder="Buscar por título, ID, tipo, status" value={q} onChange={(e) => setQ(e.target.value)} bg="white" />
            </InputGroup>
            <Tooltip label="Importar desde EasyBroker">
              <Button colorScheme="green" onClick={doSync} isLoading={isLoading} leftIcon={<FiRefreshCw />}>
                Importar
              </Button>
            </Tooltip>
            <HStack px={3} py={2} borderWidth="1px" rounded="md" bg="white">
              <Text fontSize="sm">Campaign Mode</Text>
              <Switch isChecked={campaignMode} onChange={(e) => { setCampaignMode(e.target.checked); setSelected([]); }} />
            </HStack>
            <Button onClick={logout} variant="outline" colorScheme="red">Cerrar sesión</Button>
          </HStack>
        </Flex>

        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
          {(isInitial && aggregated.length === 0) ? Array.from({ length: 6 }).map((_, i) => (
            <Box key={i} borderWidth="1px" rounded="lg" overflow="hidden" bg="white" p={0}>
              <Skeleton height="180px" />
              <Box p={3}>
                <Skeleton height="20px" mb="2" />
                <Skeleton height="16px" width="60%" />
              </Box>
            </Box>
          )) : items.map((p: any) => (
            <Box
              key={p.id}
              borderWidth="1px"
              rounded="lg"
              overflow="hidden"
              bg="white"
              _hover={{ boxShadow: 'lg', transform: 'translateY(-2px)' }}
              transition="all 0.15s ease"
            >
              <Box position="relative">
                <AspectRatio ratio={16/9}>
                  <Box as={Link} href={`/admin/properties/${p.id}`} display="block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.titleImageFull || p.titleImageThumb || '/image1.jpg'}
                      alt={p.title || 'Propiedad'}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </Box>
                </AspectRatio>
                <Menu>
                  <MenuButton as={IconButton} icon={<FiMoreVertical />} size="sm" position="absolute" top="2" right="2" aria-label="Más" />
                  <MenuList>
                    <MenuItem as={Link} href={`/admin/properties/${p.id}`} icon={<FiEdit2 />}>Editar</MenuItem>
                    <MenuItem as={Link} href={`/propiedades/${p.publicId}`} icon={<FiExternalLink />} target="_blank">Ver pública</MenuItem>
                    <MenuItem icon={<FiCopy />} onClick={() => navigator.clipboard.writeText(`${location.origin}/propiedades/${p.publicId}`)}>Copiar URL</MenuItem>
                    <MenuItem icon={<FiTrash2 />} onClick={() => onDelete(p.id)} color="red.600">Eliminar</MenuItem>
                  </MenuList>
                </Menu>
              </Box>
              <Box p={3}>
                <HStack>
                  <Heading size="sm" noOfLines={1}>{p.title || 'Sin título'}</Heading>
                </HStack>
                <HStack mt={1} spacing={2} color="gray.600" fontSize="sm">
                  <Badge>{p.propertyType || 'Tipo'}</Badge>
                  <Badge variant="outline">{p.status || 'Status'}</Badge>
                </HStack>
                <HStack mt={2}>
                  {!campaignMode ? (
                    <Button as={Link} href={`/admin/properties/${p.id}`} size="sm" colorScheme="blue">Editar</Button>
                  ) : (
                    <Checkbox isChecked={selected.includes(p.id)} onChange={() => toggleSelect(p.id)} />
                  )}
                </HStack>
              </Box>
            </Box>
          ))}
        </SimpleGrid>
        <Box ref={loaderRef} h="1px" />
        {isLoadingMore && (
          <Box mt={6}>
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
              {Array.from({ length: 3 }).map((_, i) => (
                <Box key={i} borderWidth="1px" rounded="lg" overflow="hidden" bg="white">
                  <Skeleton height="180px" />
                  <Box p={3}>
                    <Skeleton height="20px" mb="2" />
                    <Skeleton height="16px" width="60%" />
                  </Box>
                </Box>
              ))}
            </SimpleGrid>
          </Box>
        )}

        {campaignMode && (
          <Flex position="fixed" bottom="4" left="0" right="0" justify="center">
            <HStack bg="white" p={3} rounded="full" shadow="md" borderWidth="1px">
              <Text>{selected.length} seleccionadas</Text>
              <Button onClick={openCampaign} colorScheme="purple">Crear campaña</Button>
            </HStack>
          </Flex>
        )}

        <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} size="lg">
          <ModalOverlay />
          <ModalContent>
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
                      <Text fontSize='sm' color='gray.600'>Usa detalles de la(s) propiedad(es) para proponer copy.</Text>
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
                    <Text fontSize='sm' color='gray.600'>Se generará un carrusel con los elementos seleccionados.</Text>
                    <HStack>
                      <Button onClick={requestPreview} isLoading={previewLoading} colorScheme='blue' variant='outline'>Vista previa</Button>
                      <Text fontSize='sm' color='gray.600'>Muestra el carrusel como en Facebook.</Text>
                    </HStack>
                    {preview && preview.carousel_data && (
                      <Box pt={2}><FacebookCarouselPreview spec={preview} /></Box>
                    )}
                  </Stack>
                )}
                <Text fontSize='sm' color='gray.600'>El anuncio se crea en estado PAUSED para revisar y publicar desde Meta Ads Manager.</Text>
              </Stack>
            </ModalBody>
            <ModalFooter>
              <Button mr={3} onClick={() => setIsOpen(false)}>Cancelar</Button>
              <Button colorScheme='purple' onClick={createCampaign}>Crear</Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </Container>
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
