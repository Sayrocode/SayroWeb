import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../../components/Layout';
import Link from 'next/link';
import {
  Box,
  Button,
  Container,
  Heading,
  Text,
  SimpleGrid,
  Stack,
  AspectRatio,
  Image as ChakraImage,
  HStack,
  Badge,
  Icon,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  Editable,
  EditablePreview,
  EditableInput,
  EditableTextarea,
  useToast,
  IconButton,
  Input,
} from '@chakra-ui/react';
import { CloseIcon } from '@chakra-ui/icons';
import { FiMapPin, FiHome, FiDroplet } from 'react-icons/fi';

type PropDetail = {
  id: number;
  publicId: string;
  title: string | null;
  titleImageFull: string | null;
  titleImageThumb: string | null;
  propertyType: string | null;
  status: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  parkingSpaces: number | null;
  lotSize: number | null;
  constructionSize: number | null;
  brokerName: string | null;
  locationText: string | null;
  media: { key: string; mimeType: string; size: number; filename?: string | null }[];
  ebImages: any[];
  operations?: { type?: string; amount?: number; currency?: string; formatted_amount?: string }[];
  description?: string | null;
};

export default function AdminPropertyEdit() {
  const router = useRouter();
  const { id } = router.query as { id?: string };
  const [data, setData] = useState<PropDetail | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const toast = useToast();

  useEffect(() => {
    if (!id) return;
    (async () => {
      const r = await fetch(`/api/admin/properties/${id}`);
      if (r.ok) setData(await r.json());
    })();
  }, [id]);

  const setField = (k: keyof PropDetail, v: any) => setData((d) => (d ? { ...d, [k]: v } : d));

  // Helpers for price and html
  const stripHtml = (html?: string | null) => (html ? html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim() : '');
  const pickPrice = (ops?: PropDetail['operations']) => {
    const arr = ops || [];
    if (!arr.length) return 'Precio a consultar';
    const sale = arr.find((o) => o.type === 'sale');
    const rental = arr.find((o) => o.type === 'rental');
    const chosen = sale || rental || arr[0];
    if (chosen.formatted_amount) return chosen.formatted_amount;
    if (typeof chosen.amount === 'number') {
      const currency = chosen.currency || 'MXN';
      return new Intl.NumberFormat('es-MX', { style: 'currency', currency, maximumFractionDigits: 0 }).format(chosen.amount);
    }
    return 'Precio a consultar';
  };

  // Build gallery (local first), then EB
  const localUrls = useMemo(() => (data?.media || []).map((m) => ({
    key: m.key,
    url: `/api/admin/images/${encodeURIComponent(m.key)}`,
  })), [data]);

  const ebUrls = useMemo(() => (Array.isArray(data?.ebImages) ? data!.ebImages : [])
    .map((img: any) => img?.url || img?.url_full || img?.title_image_full)
    .filter(Boolean) as string[], [data]);

  const gallery = useMemo(() => {
    const all = [...localUrls.map((o) => o.url), ...ebUrls];
    const cover = all[0] || '/image3.jpg';
    const thumbs = all.slice(0, 12);
    return { cover, thumbs };
  }, [localUrls, ebUrls]);

  const [coverSrc, setCoverSrc] = useState<string>('');
  useEffect(() => {
    setCoverSrc(gallery.cover);
  }, [gallery.cover]);

  const save = async () => {
    if (!id || !data) return;
    setSaving(true);
    const body: any = {
      title: data.title,
      propertyType: data.propertyType,
      status: data.status,
      bedrooms: data.bedrooms,
      bathrooms: data.bathrooms,
      parkingSpaces: data.parkingSpaces,
      lotSize: data.lotSize,
      constructionSize: data.constructionSize,
      brokerName: data.brokerName,
      locationText: data.locationText,
    };
    const r = await fetch(`/api/admin/properties/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    setSaving(false);
    if (r.ok) toast({ title: 'Guardado', status: 'success', duration: 1500 });
  };

  const saveWithDesc = async () => {
    if (!id || !data) return;
    setSaving(true);
    const body: any = {
      title: data.title,
      propertyType: data.propertyType,
      status: data.status,
      bedrooms: data.bedrooms,
      bathrooms: data.bathrooms,
      parkingSpaces: data.parkingSpaces,
      lotSize: data.lotSize,
      constructionSize: data.constructionSize,
      brokerName: data.brokerName,
      locationText: data.locationText,
      description: desc,
    };
    const r = await fetch(`/api/admin/properties/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    setSaving(false);
    if (r.ok) toast({ title: 'Guardado', status: 'success', duration: 1500 });
  };

  const removeImage = async (key: string) => {
    if (!confirm('¿Eliminar imagen?')) return;
    const r = await fetch(`/api/admin/images/${encodeURIComponent(key)}`, { method: 'DELETE' });
    if (r.ok) setData((d) => d ? { ...d, media: d.media.filter((m) => m.key !== key) } : d);
  };

  const uploadFiles = async (files: FileList | null) => {
    if (!files || !id) return;
    for (const f of Array.from(files)) {
      const base64 = await toBase64(f);
      const r = await fetch(`/api/admin/properties/${id}/images`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: f.name, mimeType: f.type || 'application/octet-stream', base64 }),
      });
      if (r.ok) {
        const obj = await r.json();
        setData((d) => d ? { ...d, media: [...d.media, obj] } : d);
      }
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  // Map of local url -> key to allow deleting from cover/thumbs
  const localMap = useMemo(() => {
    const m = new Map<string, string>();
    localUrls.forEach((o) => m.set(o.url, o.key));
    return m;
  }, [localUrls]);

  const price = pickPrice(data?.operations);
  const cleanDesc = stripHtml(data?.description ?? '');
  const [desc, setDesc] = useState<string>(cleanDesc);
  useEffect(() => {
    setDesc(stripHtml(data?.description ?? ''));
  }, [data?.description]);

  if (!data) {
    return (
      <Layout title="Editar propiedad">
        <Container maxW="5xl" py={8}><Text>Cargando…</Text></Container>
      </Layout>
    );
  }

  return (
    <Layout title={`Editar ${data.publicId}`}>
      <Container maxW="7xl" py={{ base: 6, md: 10 }}>
        <Breadcrumb fontSize="sm" color="gray.600" mb={3}>
          <BreadcrumbItem>
            <BreadcrumbLink as={Link} href="/admin">Panel</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem isCurrentPage>
            <BreadcrumbLink href="#">Editar {data.publicId}</BreadcrumbLink>
          </BreadcrumbItem>
        </Breadcrumb>

        <SimpleGrid columns={{ base: 1, lg: 5 }} spacing={{ base: 6, md: 8 }}>
          {/* Galería (igual al público, con X para borrar locales) */}
          <Box gridColumn={{ base: '1 / -1', lg: '1 / 4' }}>
            <Box position="relative">
              <AspectRatio ratio={16 / 9} mb={3}>
                <ChakraImage
                  src={coverSrc}
                  alt={data.title || `Propiedad ${data.publicId}`}
                  objectFit="cover"
                  fallbackSrc="/image3.jpg"
                  rounded="lg"
                />
              </AspectRatio>
              {localMap.has(coverSrc) && (
                <IconButton
                  aria-label="Eliminar imagen"
                  icon={<CloseIcon />}
                  size="sm"
                  colorScheme="red"
                  position="absolute"
                  top="2"
                  right="2"
                  onClick={() => {
                    const key = localMap.get(coverSrc)!;
                    removeImage(key);
                  }}
                />
              )}
            </Box>

            {gallery.thumbs.length > 0 && (
              <SimpleGrid columns={{ base: 3, sm: 4, md: 5 }} spacing={2}>
                {gallery.thumbs.map((u, i) => (
                  <Box key={i} position="relative">
                    <AspectRatio ratio={1}>
                      <ChakraImage
                        src={u}
                        alt={`${data.title || 'Propiedad'} - ${i + 1}`}
                        objectFit="cover"
                        fallbackSrc="/image3.jpg"
                        rounded="md"
                        cursor="pointer"
                        _hover={{ opacity: 0.9 }}
                        onClick={() => setCoverSrc(u)}
                      />
                    </AspectRatio>
                    {localMap.has(u) && (
                      <IconButton
                        aria-label="Eliminar imagen"
                        icon={<CloseIcon />}
                        size="xs"
                        colorScheme="red"
                        position="absolute"
                        top="2"
                        right="2"
                        onClick={(e) => {
                          e.stopPropagation();
                          const key = localMap.get(u)!;
                          removeImage(key);
                        }}
                      />)
                    }
                  </Box>
                ))}
              </SimpleGrid>
            )}

            <Box mt={4}>
              <Input type="file" ref={fileRef} multiple accept="image/*" onChange={(e) => uploadFiles(e.target.files)} />
            </Box>
          </Box>

          {/* Panel derecho sticky con edición inline */}
          <Stack gridColumn={{ base: '1 / -1', lg: '4 / 6' }} spacing={4} position={{ lg: 'sticky' }} top={{ lg: 6 }} alignSelf="start">
            <HStack spacing={2}>
              {data.propertyType && (
                <Badge colorScheme="green" rounded="full" px={2}>
                  {data.propertyType}
                </Badge>
              )}
              {(
                <Badge
                  variant="subtle"
                  rounded="full"
                  px={2}
                  cursor="pointer"
                  title="Cambiar estado"
                  onClick={async () => {
                    if (!id) return;
                    const current = (data.status || 'unknown').toLowerCase();
                    const next = current === 'available' ? 'retired' : 'retired';
                    // unknown -> retired, retired -> available, available -> retired
                    const resolved = current === 'retired' ? 'available' : next;
                    const prev = data.status;
                    setField('status', resolved);
                    try {
                      const r = await fetch(`/api/admin/properties/${id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: resolved }),
                      });
                      if (!r.ok) throw new Error('No se pudo actualizar');
                      toast({ title: `Estado actualizado a ${resolved}`, status: 'success', duration: 1200 });
                    } catch (e) {
                      // revert
                      setField('status', prev as any);
                      toast({ title: 'No se pudo actualizar estado', status: 'error', duration: 1500 });
                    }
                  }}
                  colorScheme={
                    (data.status || 'unknown').toLowerCase() === 'available'
                      ? 'green'
                      : (data.status || 'unknown').toLowerCase() === 'retired'
                      ? 'gray'
                      : 'yellow'
                  }
                >
                  {data.status || 'unknown'}
                </Badge>
              )}
              <Badge variant="subtle" rounded="full" px={2}>
                ID {data.publicId}
              </Badge>
            </HStack>

            <Editable value={data.title ?? ''} onChange={(v) => setField('title', v)}>
              <Heading as="h1" size="lg" lineHeight="1.2">
                <EditablePreview />
              </Heading>
              <EditableInput />
            </Editable>

            {data.locationText !== null && (
              <HStack color="gray.600" spacing={2}>
                <Icon as={FiMapPin} />
                <Editable value={data.locationText || ''} onChange={(v) => setField('locationText', v)} w="full">
                  <Text><EditablePreview /></Text>
                  <EditableInput />
                </Editable>
              </HStack>
            )}

            <Text fontSize="3xl" fontWeight="extrabold" color="green.700">{price}</Text>

            {/* Resumen/Descripción editable */}
            <Editable value={desc} onChange={(v) => setDesc(v)}>
              <Text whiteSpace="pre-wrap" color="gray.800"><EditablePreview /></Text>
              <EditableTextarea rows={6} />
            </Editable>

            <HStack spacing={6} color="gray.700">
              {typeof data.bedrooms === 'number' && (
                <HStack spacing={1}>
                  <Icon as={FiHome} />
                  <Text>{data.bedrooms} rec</Text>
                </HStack>
              )}
              {typeof data.bathrooms === 'number' && (
                <HStack spacing={1}>
                  <Icon as={FiDroplet} />
                  <Text>{data.bathrooms} baños</Text>
                </HStack>
              )}
              {typeof data.parkingSpaces === 'number' && (
                <HStack spacing={1}>
                  <Box as="span">🚗</Box>
                  <Text>{data.parkingSpaces} estac.</Text>
                </HStack>
              )}
            </HStack>

            <Button colorScheme="green" onClick={() => saveWithDesc()} isLoading={saving}>Guardar cambios</Button>
          </Stack>
        </SimpleGrid>
      </Container>
    </Layout>
  );
}

function toBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Protect page server-side
import type { GetServerSideProps } from 'next';
import { getIronSession } from 'iron-session';
import { sessionOptions, AppSession } from '../../../lib/session';

export const getServerSideProps: GetServerSideProps = async ({ req, res }) => {
  const session = await getIronSession<AppSession>(req, res, sessionOptions);
  if (!session.user) {
    return { redirect: { destination: '/admin/login', permanent: false } };
  }
  return { props: {} };
};
