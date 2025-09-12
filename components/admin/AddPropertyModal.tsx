import React from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter,
  Button, Stack, HStack, VStack, Input, Textarea, Select, Checkbox, Text,
  FormControl, FormLabel, NumberInput, NumberInputField, useToast, Divider,
} from '@chakra-ui/react';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (id: number) => void;
};

const PROPERTY_TYPES = [
  'Bodega comercial',
  'Bodega industrial',
  'Casa',
  'Casa con uso de suelo',
  'Casa en condominio',
  'Departamento',
  'Edificio',
  'Huerta',
  'Local comercial',
  'Local en centro comercial',
  'Nave industrial',
  'Oficina',
  'Quinta',
  'Rancho',
  'Terreno',
  'Terreno comercial',
  'Terreno industrial',
  'Villa',
];

const STATES: Record<string, string[]> = {
  'Querétaro': ['Querétaro', 'Corregidora', 'El Marqués', 'San Juan del Río', 'Tequisquiapan'],
  'Guanajuato': ['León', 'Irapuato', 'Celaya', 'Salamanca', 'Silao', 'San Miguel de Allende'],
  'Ciudad de México': ['Ciudad de México'],
};

function buildLocationName(address: string, neighborhood: string, city: string, state: string) {
  return [address, neighborhood, city, state, 'México'].filter(Boolean).join(', ');
}

export default function AddPropertyModal({ isOpen, onClose, onCreated }: Props) {
  const toast = useToast();
  const [loading, setLoading] = React.useState(false);

  // Basic fields
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [type, setType] = React.useState(PROPERTY_TYPES[0]);
  const [status, setStatus] = React.useState('available');
  // Moneda fija: MXN (EasyBroker requiere 'mxn' en payload)
  const [currency] = React.useState<'MXN'>('MXN');
  const [saleEnabled, setSaleEnabled] = React.useState(true);
  const [salePrice, setSalePrice] = React.useState<number | undefined>(undefined);
  const [rentEnabled, setRentEnabled] = React.useState(false);
  const [rentPrice, setRentPrice] = React.useState<number | undefined>(undefined);
  const [saleUnit, setSaleUnit] = React.useState<'total'|'square_meter'|'hectare'>('total');
  const [rentUnit, setRentUnit] = React.useState<'total'|'square_meter'|'hectare'>('total');

  const [bedrooms, setBedrooms] = React.useState<number | undefined>(undefined);
  const [bathrooms, setBathrooms] = React.useState<number | undefined>(undefined);
  const [parking, setParking] = React.useState<number | undefined>(undefined);
  const [lotSize, setLotSize] = React.useState<number | undefined>(undefined);
  const [constructionSize, setConstructionSize] = React.useState<number | undefined>(undefined);

  // Location
  const [state, setState] = React.useState<keyof typeof STATES>('Querétaro');
  const [city, setCity] = React.useState(STATES['Querétaro'][0]);
  const [neighborhood, setNeighborhood] = React.useState('');
  const [locationName, setLocationName] = React.useState(''); // e.g., "Sonterra, Querétaro, Querétaro"
  const [address, setAddress] = React.useState('');
  const [postalCode, setPostalCode] = React.useState('');
  const [exteriorNumber, setExteriorNumber] = React.useState('');
  const [crossStreet, setCrossStreet] = React.useState('');
  const [lat, setLat] = React.useState<string>('');
  const [lng, setLng] = React.useState<string>('');

  // Media
  const [imageUrls, setImageUrls] = React.useState<string>('');
  const [files, setFiles] = React.useState<File[]>([]);

  // EB publish
  const [publishEB, setPublishEB] = React.useState(true);

  React.useEffect(() => {
    setCity(STATES[state][0]);
  }, [state]);

  const reset = () => {
    setTitle(''); setDescription(''); setType(PROPERTY_TYPES[0]); setStatus('available');
    setSaleEnabled(true); setSalePrice(undefined); setRentEnabled(false); setRentPrice(undefined); setSaleUnit('total'); setRentUnit('total');
    setBedrooms(undefined); setBathrooms(undefined); setParking(undefined); setLotSize(undefined); setConstructionSize(undefined);
    setState('Querétaro'); setCity(STATES['Querétaro'][0]); setNeighborhood(''); setLocationName(''); setAddress(''); setPostalCode(''); setExteriorNumber(''); setCrossStreet(''); setLat(''); setLng('');
    setImageUrls(''); setFiles([]); setPublishEB(true);
  };

  function toBase64(file: File) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  const onSubmit = async () => {
    if (!title.trim()) { toast({ title: 'Título requerido', status: 'warning' }); return; }
    if (!saleEnabled && !rentEnabled) { toast({ title: 'Selecciona al menos una operación (venta/renta)', status: 'warning' }); return; }
    if (!locationName.trim()) { toast({ title: 'Ubicación (name) requerida', description: 'Escribe: Colonia, Ciudad, Estado. Ejemplo: Sonterra, Querétaro, Querétaro', status: 'warning' }); return; }
    if (saleEnabled && (!salePrice || salePrice <= 0)) { toast({ title: 'Precio de venta inválido', status: 'warning' }); return; }
    if (rentEnabled && (!rentPrice || rentPrice <= 0)) { toast({ title: 'Precio de renta inválido', status: 'warning' }); return; }
    setLoading(true);
    try {
      const operations: any[] = [];
      const currencyLower = 'mxn';
      if (saleEnabled) operations.push({ type: 'sale', active: true, amount: salePrice, currency: currencyLower, unit: saleUnit });
      if (rentEnabled) operations.push({ type: 'rental', active: true, amount: rentPrice, currency: currencyLower, unit: rentUnit });
      const urls = imageUrls.split(/\n|,\s*/).map((s) => s.trim()).filter(Boolean);
      const property_images = urls.map((u) => ({ url: u }));

      const locationText = locationName;
      // 1) Create locally first
      const localResp = await fetch('/api/admin/properties', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title, property_type: type, status,
          bedrooms, bathrooms, parking_spaces: parking, lot_size: lotSize, construction_size: constructionSize,
          locationText, operations, property_images,
        }),
      });
      const local = await localResp.json();
      if (!localResp.ok || !local?.ok) throw new Error(local?.message || 'No se pudo crear en local');
      const localId = local.id as number;

      // 1.1) Subir archivos locales (si se seleccionaron)
      let uploadedLocalUrls: string[] = [];
      if (files.length) {
        for (const f of files) {
          try {
            const base64 = await toBase64(f);
            const r = await fetch(`/api/admin/properties/${localId}/images`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ filename: f.name, mimeType: f.type || 'application/octet-stream', base64 }),
            });
            if (r.ok) {
              const obj = await r.json();
              uploadedLocalUrls.push(`/api/admin/images/${encodeURIComponent(obj.key)}`);
            }
          } catch {}
        }
        if (uploadedLocalUrls.length) {
          // Reflejar en propertyImagesJson
          try {
            await fetch(`/api/admin/properties/${localId}`, {
              method: 'PUT', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ property_images: uploadedLocalUrls.map((u) => ({ url: u })) }),
            });
          } catch {}
        }
      }

      // 2) Optionally publish to EasyBroker (combina URLs ingresadas + subidas a Turso)
      if (publishEB) {
        // Always use public base domain for absolute URLs (required by EasyBroker)
        const publicBase = process.env.NEXT_PUBLIC_SITE_URL || 'https://sayro-web.vercel.app';
        const toAbs = (u: string) => (u.startsWith('http') ? u : `${publicBase}${u}`);
        const property_images2 = [
          ...property_images.map((it) => ({ url: toAbs(it.url) })),
          ...uploadedLocalUrls.map((u) => ({ url: toAbs(u) })),
        ];
        const ebDraft: any = {
          title,
          description,
          property_type: type,
          status: (status || '').toLowerCase().includes('public') ? 'published' : 'not_published',
          location: {
            name: locationName,
            street: address || undefined,
            postal_code: postalCode || undefined,
            latitude: lat ? parseFloat(lat) : undefined,
            longitude: lng ? parseFloat(lng) : undefined,
            exterior_number: exteriorNumber || undefined,
            cross_street: crossStreet || undefined,
          },
          operations,
          // Send images to EB via URL
          property_images: property_images2,
        };
        const ebResp = await fetch('/api/admin/easybroker/properties', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(ebDraft)
        });
        const eb = await ebResp.json();
        if (!ebResp.ok || !eb?.ok) {
          toast({ title: 'Creado en local, pero EasyBroker rechazó', description: String(eb?.data?.error || eb?.message || ebResp.status), status: 'warning', duration: 4000 });
        } else {
          // Persist EB detail + images to local record and try to download images
          const detail = eb.data || {};
          await fetch(`/api/admin/properties/${localId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
            publicId: detail.public_id || undefined,
            eb_detail: detail,
            property_images: detail.property_images || property_images,
          }) });
          // Fire and forget image download
          try { fetch(`/api/admin/properties/${localId}/images/download`, { method: 'POST' }); } catch {}
        }
      }

      toast({ title: 'Propiedad creada', status: 'success' });
      onCreated?.(local.id);
      reset();
      onClose();
    } catch (e: any) {
      toast({ title: 'Error al crear', description: e?.message || String(e), status: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={() => { if (!loading) onClose(); }} size='xl' scrollBehavior='inside'>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Agregar Propiedad</ModalHeader>
        <ModalBody>
          <Stack spacing={4}>
            <FormControl isRequired>
              <FormLabel>Título</FormLabel>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder='Título de la propiedad' />
            </FormControl>
            <FormControl>
              <FormLabel>Descripción</FormLabel>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            </FormControl>

            <HStack>
              <FormControl isRequired>
                <FormLabel>Tipo</FormLabel>
                <Select value={type} onChange={(e) => setType(e.target.value)}>
                  {PROPERTY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel>Estatus</FormLabel>
                <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value='available'>Disponible</option>
                  <option value='publicada'>Publicada</option>
                  <option value='en venta'>En venta</option>
                  <option value='en renta'>En renta</option>
                </Select>
              </FormControl>
            </HStack>

            <Stack borderWidth='1px' rounded='md' p={3}>
              <Text fontWeight='medium'>Operaciones</Text>
              <HStack>
                <Checkbox isChecked={saleEnabled} onChange={(e) => setSaleEnabled(e.target.checked)}>Venta</Checkbox>
                <NumberInput value={salePrice ?? ''} onChange={(_, v) => setSalePrice(Number.isFinite(v) ? v : undefined)} min={0} isDisabled={!saleEnabled}>
                  <NumberInputField placeholder='Precio venta' />
                </NumberInput>
                <Select value={saleUnit} onChange={(e) => setSaleUnit(e.target.value as any)} isDisabled={!saleEnabled} w='220px'>
                  <option value='total'>Total</option>
                  <option value='square_meter'>Por metro cuadrado</option>
                  <option value='hectare'>Por hectárea</option>
                </Select>
              </HStack>
              <HStack>
                <Checkbox isChecked={rentEnabled} onChange={(e) => setRentEnabled(e.target.checked)}>Renta</Checkbox>
                <NumberInput value={rentPrice ?? ''} onChange={(_, v) => setRentPrice(Number.isFinite(v) ? v : undefined)} min={0} isDisabled={!rentEnabled}>
                  <NumberInputField placeholder='Precio renta (mensual)' />
                </NumberInput>
                <Select value={rentUnit} onChange={(e) => setRentUnit(e.target.value as any)} isDisabled={!rentEnabled} w='220px'>
                  <option value='total'>Total</option>
                  <option value='square_meter'>Por metro cuadrado</option>
                  <option value='hectare'>Por hectárea</option>
                </Select>
              </HStack>
              <HStack>
                <Text w='100px'>Moneda</Text>
                <Input value={currency} isReadOnly w='140px' />
                <Text fontSize='xs' color='gray.600'>(Se envía como "mxn" a EasyBroker)</Text>
              </HStack>
            </Stack>

            <Stack borderWidth='1px' rounded='md' p={3}>
              <Text fontWeight='medium'>Ubicación</Text>
              <FormControl isRequired>
                <FormLabel>Nombre de ubicación (name)</FormLabel>
                <Input value={locationName} onChange={(e) => setLocationName(e.target.value)} placeholder='Sonterra, Querétaro, Querétaro' />
                <Text fontSize='xs' color='gray.600' mt={1}>Formato: Colonia, Ciudad, Estado — debe coincidir con EasyBroker locations.</Text>
              </FormControl>
              <HStack>
                <FormControl>
                  <FormLabel>Colonia</FormLabel>
                  <Input value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} />
                </FormControl>
                <FormControl>
                  <FormLabel>Dirección</FormLabel>
                  <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder='Calle y número' />
                </FormControl>
              </HStack>
              <HStack>
                <FormControl>
                  <FormLabel>Código Postal</FormLabel>
                  <Input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder='76000' />
                </FormControl>
                <FormControl>
                  <FormLabel>Número exterior</FormLabel>
                  <Input value={exteriorNumber} onChange={(e) => setExteriorNumber(e.target.value)} placeholder='10' />
                </FormControl>
                <FormControl>
                  <FormLabel>Calle transversal</FormLabel>
                  <Input value={crossStreet} onChange={(e) => setCrossStreet(e.target.value)} placeholder='Av. Insurgentes' />
                </FormControl>
              </HStack>
              <HStack>
                <FormControl>
                  <FormLabel>Latitud</FormLabel>
                  <Input value={lat} onChange={(e) => setLat(e.target.value)} placeholder='Opcional' />
                </FormControl>
                <FormControl>
                  <FormLabel>Longitud</FormLabel>
                  <Input value={lng} onChange={(e) => setLng(e.target.value)} placeholder='Opcional' />
                </FormControl>
              </HStack>
            </Stack>

            <Stack borderWidth='1px' rounded='md' p={3}>
              <Text fontWeight='medium'>Características</Text>
              <HStack>
                <NumberInput value={bedrooms ?? ''} onChange={(_, v) => setBedrooms(Number.isFinite(v) ? v : undefined)} min={0}>
                  <NumberInputField placeholder='Recámaras' />
                </NumberInput>
                <NumberInput value={bathrooms ?? ''} onChange={(_, v) => setBathrooms(Number.isFinite(v) ? v : undefined)} min={0}>
                  <NumberInputField placeholder='Baños' />
                </NumberInput>
                <NumberInput value={parking ?? ''} onChange={(_, v) => setParking(Number.isFinite(v) ? v : undefined)} min={0}>
                  <NumberInputField placeholder='Estacionamientos' />
                </NumberInput>
              </HStack>
              <HStack>
                <NumberInput value={constructionSize ?? ''} onChange={(_, v) => setConstructionSize(Number.isFinite(v) ? v : undefined)} min={0}>
                  <NumberInputField placeholder='Construcción (m²)' />
                </NumberInput>
                <NumberInput value={lotSize ?? ''} onChange={(_, v) => setLotSize(Number.isFinite(v) ? v : undefined)} min={0}>
                  <NumberInputField placeholder='Terreno (m²)' />
                </NumberInput>
              </HStack>
            </Stack>

            <FormControl>
              <FormLabel>Imágenes (URLs, una por línea)</FormLabel>
              <Textarea value={imageUrls} onChange={(e) => setImageUrls(e.target.value)} rows={3} placeholder='https://...jpg\nhttps://...jpg' />
            </FormControl>
            <FormControl>
              <FormLabel>Imágenes (subir archivos)</FormLabel>
              <Input type='file' accept='image/*' multiple onChange={(e) => setFiles(Array.from(e.target.files || []))} />
              <Text fontSize='xs' color='gray.600' mt={1}>
                Si subes archivos, se guardarán en Turso y se publicarán en EasyBroker usando las URLs públicas de tu sitio.
              </Text>
            </FormControl>

            <Divider />
            <Checkbox isChecked={publishEB} onChange={(e) => setPublishEB(e.target.checked)}>Publicar también en EasyBroker</Checkbox>
            <Text color='gray.600' fontSize='sm'>Estados soportados: Querétaro, Guanajuato y Ciudad de México. El país se configura automáticamente a México.</Text>
          </Stack>
        </ModalBody>
        <ModalFooter>
          <Button mr={3} onClick={onClose} isDisabled={loading}>Cancelar</Button>
          <Button colorScheme='green' onClick={onSubmit} isLoading={loading}>Crear</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
