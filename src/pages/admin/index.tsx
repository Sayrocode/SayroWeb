import type { GetServerSideProps } from 'next';
import React from 'react';
import { getIronSession } from 'iron-session';
import Layout from '../../components/Layout';
import { sessionOptions, AppSession } from '../../lib/session';
import { Box, Button, Container, Heading, Text, SimpleGrid, Image, Flex, Spacer, HStack, Input, InputGroup, InputLeftElement, IconButton, Badge, AspectRatio, Menu, MenuButton, MenuItem, MenuList, Tooltip, Skeleton, Checkbox, Switch, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, RadioGroup, Stack, Radio, NumberInput, NumberInputField, useToast } from '@chakra-ui/react';
import { SearchIcon } from '@chakra-ui/icons';
import { FiMoreVertical, FiExternalLink, FiCopy, FiRefreshCw, FiTrash2, FiEdit2 } from 'react-icons/fi';
import { useRouter } from 'next/router';
import useSWR from 'swr';
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
  const { data, mutate, isLoading } = useSWR('/api/admin/properties?take=50', fetcher);
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
  // Carousel
  const [carouselMsg, setCarouselMsg] = React.useState('');
  const [carouselCopies, setCarouselCopies] = React.useState<Record<number, {headline: string, description: string}>>({});
  // Preview
  const [preview, setPreview] = React.useState<any | null>(null);
  const [previewLoading, setPreviewLoading] = React.useState(false);
  const items = (data?.items || []).filter((p: any) => {
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
    if (r.ok) mutate();
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
      <Container maxW="7xl" py={8}>
        <Flex align="center" mb={3} gap={3} wrap="wrap">
          <Heading size="lg">Propiedades</Heading>
          <Badge colorScheme="gray" variant="subtle">{data?.total ?? 0} total</Badge>
          <Spacer />
          <HStack spacing={2}>
            <Button as={Link} href="/admin/leads" colorScheme="green" variant="solid">Leads</Button>
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
          {(isLoading && (!data || !data.items)) ? Array.from({ length: 6 }).map((_, i) => (
            <Box key={i} borderWidth="1px" rounded="lg" overflow="hidden" bg="white" p={0}>
              <Skeleton height="180px" />
              <Box p={3}>
                <Skeleton height="20px" mb={2} />
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
                <Box as={Link} href={`/admin/properties/${p.id}`} _hover={{ textDecoration: 'none' }}>
                  <Text fontWeight="bold" noOfLines={1} cursor="pointer">{p.title}</Text>
                </Box>
                <HStack mt={2} spacing={2} color="gray.600" wrap="wrap">
                  {p.propertyType && <Badge colorScheme="green" variant="subtle" rounded="full">{p.propertyType}</Badge>}
                  {p.status && <Badge variant="outline" rounded="full">{p.status}</Badge>}
                  {p.price && <Text fontWeight="semibold" color="green.700">{p.price}</Text>}
                  {p.publicId && <Badge variant="subtle" rounded="full">ID {p.publicId}</Badge>}
                </HStack>
                <HStack mt={3} spacing={2}>
                  <Button as={Link} href={`/admin/properties/${p.id}`} size="sm" colorScheme="blue" leftIcon={<FiEdit2 />}>Editar</Button>
                  <Button size="sm" variant="outline" colorScheme="red" leftIcon={<FiTrash2 />} onClick={() => onDelete(p.id)}>Eliminar</Button>
                </HStack>
              </Box>
            </Box>
          ))}
        </SimpleGrid>

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
