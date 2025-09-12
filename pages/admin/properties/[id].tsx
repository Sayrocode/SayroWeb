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
  Tooltip,
} from '@chakra-ui/react';
import { CloseIcon, AddIcon, MinusIcon } from '@chakra-ui/icons';
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
  const [dlLoading, setDlLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const toast = useToast();
  const [publishing, setPublishing] = useState(false);

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
    filename: m.filename || null,
  })), [data]);

  const ebUrls = useMemo(() => (Array.isArray(data?.ebImages) ? data!.ebImages : [])
    // Prefer highest-quality URLs from EB payloads
    .map((img: any) => img?.url_full || img?.title_image_full || img?.url)
    .filter(Boolean) as string[], [data]);

  const gallery = useMemo(() => {
    const all = [...localUrls.map((o) => o.url), ...ebUrls];
    const cover = all[0] || '/image3.jpg';
    return { cover, all };
  }, [localUrls, ebUrls]);

  // Paginación de miniaturas (evitar cargar 50 de golpe)
  const [thumbsCount, setThumbsCount] = useState<number>(18);
  useEffect(() => {
    // reset when gallery changes
    setThumbsCount(18);
  }, [gallery.all?.length]);

  const [coverSrc, setCoverSrc] = useState<string>('');
  const [zoomByUrl, setZoomByUrl] = useState<Record<string, number>>({});
  const getZoom = (u: string) => (zoomByUrl[u] ?? 1.0);
  const setZoom = (u: string, z: number) => setZoomByUrl((m) => ({ ...m, [u]: Math.max(1.0, Math.min(1.6, Number.isFinite(z) ? z : 1.0)) }));
  const adjustZoom = (u: string, delta: number) => setZoom(u, getZoom(u) + delta);
  const toggleWhiteBorderZoom = (u: string) => setZoom(u, Math.abs(getZoom(u) - 1.0) < 0.02 ? 1.15 : 1.0);

  // Canvas export helpers to create a cropped (zoomed) image client-side
  async function fetchImageAsObjectUrl(src: string): Promise<string> {
    // Always fetch to avoid CORS tainting when drawing on canvas
    const r = await fetch(src, { cache: 'no-cache' });
    if (!r.ok) throw new Error(`No se pudo cargar imagen (${r.status})`);
    const blob = await r.blob();
    return URL.createObjectURL(blob);
  }

  async function exportCoverAsBlob(): Promise<Blob> {
    if (!coverSrc) throw new Error('No hay imagen seleccionada');
    const objectUrl = await fetchImageAsObjectUrl(coverSrc);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error('Error al decodificar la imagen'));
        el.src = objectUrl;
      });

      const CANVAS_W = 1600; // 16:9
      const CANVAS_H = 900;
      const canvas = document.createElement('canvas');
      canvas.width = CANVAS_W;
      canvas.height = CANVAS_H;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('No se pudo crear canvas');

      const zoom = getZoom(coverSrc);
      const baseScale = Math.max(CANVAS_W / img.naturalWidth, CANVAS_H / img.naturalHeight);
      const scale = baseScale * (isFinite(zoom) ? zoom : 1.0);
      const drawW = img.naturalWidth * scale;
      const drawH = img.naturalHeight * scale;
      const dx = (CANVAS_W - drawW) / 2;
      const dy = (CANVAS_H - drawH) / 2;
      ctx.drawImage(img, dx, dy, drawW, drawH);

      const blob: Blob = await new Promise((resolve) => canvas.toBlob((b) => resolve(b as Blob), 'image/jpeg', 0.92));
      return blob;
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  async function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  async function uploadZoomedImage(saveMode: 'new' | 'replace') {
    if (!id) return;
    try {
      setSaving(true);
      const blob = await exportCoverAsBlob();
      const base64 = await blobToBase64(blob);
      const z = getZoom(coverSrc).toFixed(2);
      const filename = `zoom-${z}.jpg`;
      // Create new image
      const r = await fetch(`/api/admin/properties/${id}/images`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, mimeType: 'image/jpeg', base64 }),
      });
      if (!r.ok) throw new Error('No se pudo subir la imagen');
      const obj = await r.json();
      const newUrl = `/api/admin/images/${encodeURIComponent(obj.key)}`;

      // Update UI state with the new media
      setData((d) => d ? { ...d, media: [...d.media, obj] } : d);

      if (saveMode === 'replace') {
        const key = localMap.get(coverSrc);
        if (key) {
          // Delete old image
          await fetch(`/api/admin/images/${encodeURIComponent(key)}`, { method: 'DELETE' });
          setData((d) => d ? { ...d, media: d.media.filter((m) => m.key !== key) } : d);
        }
      }

      setCoverSrc(newUrl);
      toast({ title: saveMode === 'replace' ? 'Imagen reemplazada' : 'Imagen creada', status: 'success', duration: 1500 });
    } catch (e: any) {
      toast({ title: e?.message || 'Error al procesar', status: 'error', duration: 2000 });
    } finally {
      setSaving(false);
    }
  }
  useEffect(() => {
    setCoverSrc(gallery.cover);
  }, [gallery.cover]);

  // Initialize per-image zoom from filename pattern like "zoom-1.15.jpg" when media loads
  useEffect(() => {
    const next: Record<string, number> = {};
    for (const m of localUrls) {
      if (!m || !m.url) continue;
      const name = m.filename || '';
      const match = name.match(/zoom[-_]?([0-9]+(?:\.[0-9]+)?)/i);
      if (match && match[1]) {
        const z = parseFloat(match[1]);
        if (Number.isFinite(z) && z >= 1.0 && z <= 2.0) next[m.url] = z;
      }
    }
    if (Object.keys(next).length) setZoomByUrl((prev) => ({ ...next, ...prev }));
  }, [localUrls.map((m) => m.url).join('|')]);

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
      operations: data.operations,
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
      operations: data.operations,
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

  const downloadEBImages = async () => {
    if (!id) return;
    if (!confirm('Descargar imágenes desde EasyBroker para esta propiedad?')) return;
    setDlLoading(true);
    try {
      const r = await fetch(`/api/admin/properties/${id}/images/download?onlyMissing=1&stream=1`, { method: 'POST' });
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
      } else {
        await r.json().catch(() => ({}));
      }
      // Refresh media listing
      const rr = await fetch(`/api/admin/properties/${id}`);
      if (rr.ok) setData(await rr.json());
      toast({ title: 'Imágenes descargadas', status: 'success', duration: 2000 });
    } catch (e) {
      toast({ title: 'Error al descargar', status: 'error', duration: 2000 });
    } finally {
      setDlLoading(false);
    }
  };

  const publishToEasyBroker = async () => {
    if (!id) return;
    if (!confirm('Enviar esta propiedad a EasyBroker usando las imágenes locales?')) return;
    setPublishing(true);
    try {
      const r = await fetch(`/api/admin/easybroker/properties/${id}/publish`, { method: 'POST' });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j?.ok) throw new Error(j?.error || 'No se pudo publicar');
      toast({ title: 'Publicada en EasyBroker', status: 'success', duration: 2000 });
    } catch (e: any) {
      toast({ title: 'Error al publicar', description: e?.message || String(e), status: 'error', duration: 2500 });
    } finally {
      setPublishing(false);
    }
  };

  // Map of local url -> key to allow deleting from cover/thumbs
  const localMap = useMemo(() => {
    const m = new Map<string, string>();
    localUrls.forEach((o) => m.set(o.url, o.key));
    return m;
  }, [localUrls]);

  const price = pickPrice(data?.operations);
  // Remount the price editor when formatted price changes
  const [priceKey, setPriceKey] = useState<string>('');
  useEffect(() => { setPriceKey(price || ''); }, [price]);
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
                <Box overflow="hidden" rounded="lg" position="relative">
                  <ChakraImage
                    src={coverSrc}
                    alt={data.title || `Propiedad ${data.publicId}`}
                    objectFit="cover"
                    fallbackSrc="/image3.jpg"
                    w="100%"
                    h="100%"
                    transform={`scale(${getZoom(coverSrc)})`}
                    transformOrigin="center"
                    transition="transform 0.2s ease"
                  />
                  <HStack spacing={1} position="absolute" bottom="2" right="2">
                    <Tooltip label="Reducir zoom" placement="top">
                      <IconButton aria-label="Reducir zoom" icon={<MinusIcon />} size="sm" onClick={() => adjustZoom(coverSrc, -0.05)} />
                    </Tooltip>
                    <Tooltip label="Aumentar zoom" placement="top">
                      <IconButton aria-label="Aumentar zoom" icon={<AddIcon />} size="sm" onClick={() => adjustZoom(coverSrc, 0.05)} />
                    </Tooltip>
                    <Tooltip label="Quitar marco blanco" placement="top">
                      <Button size="sm" variant="outline" onClick={() => toggleWhiteBorderZoom(coverSrc)}>Marco</Button>
                    </Tooltip>
                  </HStack>
                </Box>
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
              <HStack mt={2} spacing={2} justify="flex-end">
                <Button size="sm" variant="outline" onClick={() => uploadZoomedImage('new')} isLoading={saving}>Guardar con zoom</Button>
                {localMap.has(coverSrc) && (
                  <Button size="sm" colorScheme="green" onClick={() => uploadZoomedImage('replace')} isLoading={saving}>Reemplazar con zoom</Button>
                )}
              </HStack>
            </Box>

            {gallery.all.length > 0 && (
              <>
              <SimpleGrid columns={{ base: 3, sm: 4, md: 5 }} spacing={2}>
                {gallery.all.slice(0, thumbsCount).map((u, i) => (
                  <Box key={i} position="relative">
                    <AspectRatio ratio={1}>
                      <Box overflow="hidden" rounded="md">
                        <ChakraImage
                          src={u}
                          alt={`${data.title || 'Propiedad'} - ${i + 1}`}
                          objectFit="cover"
                          fallbackSrc="/image3.jpg"
                          w="100%"
                          h="100%"
                          loading="lazy"
                          transform={`scale(${getZoom(u)})`}
                          transformOrigin="center"
                          transition="transform 0.2s ease"
                          cursor="pointer"
                          _hover={{ opacity: 0.9 }}
                          onClick={() => setCoverSrc(u)}
                        />
                      </Box>
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
              {gallery.all.length > thumbsCount && (
                <Box mt={3} textAlign="center">
                  <Button size="sm" variant="outline" onClick={() => setThumbsCount((n) => n + 18)}>
                    Cargar más ({thumbsCount}/{gallery.all.length})
                  </Button>
                </Box>
              )}
              </>
            )}

            <Box mt={4}>
              <HStack mb={2}>
                <Button onClick={downloadEBImages} isLoading={dlLoading} colorScheme='green' variant='outline'>Descargar imágenes EB</Button>
                <Button onClick={publishToEasyBroker} isLoading={publishing} colorScheme='purple'>Publicar en EasyBroker</Button>
              </HStack>
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

            <Editable
              key={priceKey}
              defaultValue={price}
              onSubmit={async (next) => {
                if (!id) return;
                const raw = String(next || '').trim();
                const digits = raw
                  .replace(/[^0-9.,]/g, '')
                  .replace(/\.(?=.*\.)/g, '')
                  .replace(/,(?=.*,)/g, '')
                  .replace(/[,.]/g, '');
                const amount = parseInt(digits || '', 10);
                if (!Number.isFinite(amount) || amount <= 0) {
                  toast({ title: 'Precio inválido', description: 'Ingresa un número válido', status: 'error', duration: 1500 });
                  return;
                }

                const currentOps = Array.isArray(data?.operations) ? [...(data!.operations as any[])] : [];
                let idx = currentOps.findIndex((o) => (o?.type || '').toLowerCase() === 'sale');
                if (idx < 0) idx = currentOps.findIndex((o) => (o?.type || '').toLowerCase() === 'rental');
                if (idx < 0) idx = currentOps.length ? 0 : -1;
                const base = idx >= 0 ? (currentOps[idx] || {}) : {};
                const nextOp = {
                  ...base,
                  type: base.type || 'sale',
                  amount,
                  currency: base.currency || 'MXN',
                } as any;
                const newOps = idx >= 0 ? [...currentOps.slice(0, idx), nextOp, ...currentOps.slice(idx + 1)] : [...currentOps, nextOp];

                setData((d) => (d ? { ...d, operations: newOps } : d));

                try {
                  setSaving(true);
                  const r = await fetch(`/api/admin/properties/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ operations: newOps }),
                  });
                  if (!r.ok) throw new Error('No se pudo actualizar el precio');
                  toast({ title: 'Precio actualizado', status: 'success', duration: 1200 });
                } catch (e: any) {
                  toast({ title: e?.message || 'Error al actualizar', status: 'error', duration: 1500 });
                } finally {
                  setSaving(false);
                }
              }}
            >
              <Text fontSize="3xl" fontWeight="extrabold" color="green.700">
                <EditablePreview />
              </Text>
              <EditableInput fontSize="3xl" fontWeight="extrabold" color="green.700" />
            </Editable>

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
