'use client';
import React from 'react';
import dynamic from 'next/dynamic';
import {
  Box,
  Stack,
  HStack,
  Text,
  Input,
  Textarea,
  Button,
  RadioGroup,
  Radio,
  NumberInput,
  NumberInputField,
  Select,
  useToast,
} from '@chakra-ui/react';

type Props = {
  selected: number[];
  onClose: () => void;
};

const FacebookSinglePreview = dynamic(() => import('./FacebookSinglePreview'), { ssr: false, loading: () => <Box>Generando vista previa…</Box> });
const FacebookCarouselPreview = dynamic(() => import('./FacebookCarouselPreview'), { ssr: false, loading: () => <Box>Generando vista previa…</Box> });

export default function CampaignModalContent({ selected, onClose }: Props) {
  const toast = useToast();
  const [adType, setAdType] = React.useState<'single'|'carousel'>(selected.length > 1 ? 'carousel' : 'single');
  const [budget, setBudget] = React.useState(150);
  const [days, setDays] = React.useState(7);
  // Single
  const [copyHeadline, setCopyHeadline] = React.useState('');
  const [copyDesc, setCopyDesc] = React.useState('');
  const [copyPrimary, setCopyPrimary] = React.useState('');
  // Native copy generation
  const [nativeLoading, setNativeLoading] = React.useState(false);
  const [nativeBase, setNativeBase] = React.useState('');
  const [nativeOptions, setNativeOptions] = React.useState<Array<{headline: string, description: string, primaryText: string}>>([]);
  const [nativeChoice, setNativeChoice] = React.useState<number>(0);
  // Carousel
  const [carouselMsg, setCarouselMsg] = React.useState('');
  const [carouselOptions, setCarouselOptions] = React.useState<Record<number, Array<{headline: string, description: string}>>>({});
  const [carouselChoice, setCarouselChoice] = React.useState<Record<number, number>>({});
  const [carouselCopies, setCarouselCopies] = React.useState<Record<number, {headline: string, description: string}>>({});
  // Preview
  const [preview, setPreview] = React.useState<any | null>(null);
  const [previewLoading, setPreviewLoading] = React.useState(false);

  const generateCopyNative = async () => {
    setNativeLoading(true);
    try {
      const r = await fetch('/api/admin/meta/suggest-copy-native?count=5', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyIds: selected, adType, baseDescription: nativeBase }),
      });
      const j = await r.json();
      if (j?.type === 'single' && Array.isArray(j.options)) {
        setNativeOptions(j.options);
        setNativeChoice(0);
        const c = j.options[0] || { headline: '', description: '', primaryText: '' };
        setCopyHeadline(c.headline || '');
        setCopyDesc(c.description || '');
        setCopyPrimary(c.primaryText || '');
        toast({ title: 'Se generaron 5 opciones (nativo)', status: 'success', duration: 1500 });
      } else if (j?.type === 'carousel' && Array.isArray(j.options)) {
        const dict: Record<number, Array<{headline: string, description: string}>> = {};
        const chosen: Record<number, {headline: string, description: string}> = {};
        const choiceIdx: Record<number, number> = {};
        (j.options || []).forEach((entry: any) => {
          dict[entry.id] = entry.options || [];
          choiceIdx[entry.id] = 0;
          const c = (entry.options || [])[0] || { headline: '', description: '' };
          chosen[entry.id] = c;
        });
        setCarouselOptions(dict);
        setCarouselChoice(choiceIdx);
        setCarouselCopies(chosen);
        toast({ title: '5 opciones por propiedad (nativo)', status: 'success', duration: 1500 });
      }
    } finally {
      setNativeLoading(false);
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
    onClose();
    if (r.ok && j.ok) {
      toast({ title: 'Campaña creada (PAUSED)', description: 'Revisa en Meta Ads Manager', status: 'success', duration: 3000 });
    } else {
      toast({ title: 'Previsualización', description: j?.reason || 'Faltan credenciales META_* o SITE_BASE_URL. Se devolvió el storySpec para revisión en la consola.', status: 'info', duration: 5000 });
      // eslint-disable-next-line no-console
      console.log('Meta storySpec preview:', j?.storySpec || j);
    }
  };

  return (
    <Box>
      <Stack spacing={4}>
        <HStack>
          <Text w='140px'>Tipo de anuncio</Text>
          <RadioGroup onChange={(v) => setAdType(v as any)} value={adType}>
            <HStack>
              <Radio value='single'>Single</Radio>
              <Radio value='carousel'>Carrusel</Radio>
            </HStack>
          </RadioGroup>
        </HStack>
        <HStack>
          <Text w='140px'>Presupuesto diario</Text>
          <NumberInput value={budget} min={50} max={100000} onChange={(_, n) => setBudget(Number.isFinite(n) ? n : 0)} maxW='200px'>
            <NumberInputField />
          </NumberInput>
        </HStack>
        <HStack>
          <Text w='140px'>Duración (días)</Text>
          <NumberInput value={days} min={1} max={90} onChange={(_, n) => setDays(Number.isFinite(n) ? n : 1)} maxW='200px'>
            <NumberInputField />
          </NumberInput>
        </HStack>

        {adType === 'single' ? (
          <Stack spacing={3}>
            <HStack align='start'>
              <Text w='140px' pt={2}>Descripción base</Text>
              <Textarea value={nativeBase} onChange={(e) => setNativeBase(e.target.value)} placeholder='Opcional: base para generar copy' rows={2} />
            </HStack>
            <HStack>
              <Button onClick={generateCopyNative} isLoading={nativeLoading} colorScheme='green'>Generar (Modelo Nativo)</Button>
            </HStack>
            {nativeOptions.length > 0 && (
              <HStack align='center'>
                <Text w='140px'>Elegir opción</Text>
                <Select value={nativeChoice} onChange={(e) => { const i = parseInt(e.target.value, 10) || 0; setNativeChoice(i); const c = nativeOptions[i] || nativeOptions[0]; setCopyHeadline(c.headline||''); setCopyDesc(c.description||''); setCopyPrimary(c.primaryText||''); }} maxW='240px'>
                  {nativeOptions.map((_, i) => (<option key={i} value={i}>Opción {i+1}</option>))}
                </Select>
              </HStack>
            )}
            <HStack>
              <Text w='140px'>Headline</Text>
              <Input value={copyHeadline} onChange={(e) => setCopyHeadline(e.target.value)} placeholder='Encabezado' />
            </HStack>
            <HStack>
              <Text w='140px'>Descripción</Text>
              <Input value={copyDesc} onChange={(e) => setCopyDesc(e.target.value)} placeholder='Descripción breve' />
            </HStack>
            <HStack>
              <Text w='140px'>Texto principal</Text>
              <Textarea value={copyPrimary} onChange={(e) => setCopyPrimary(e.target.value)} placeholder='Texto del anuncio' rows={3} />
            </HStack>
            <HStack>
              <Button onClick={requestPreview} isLoading={previewLoading} colorScheme='blue' variant='outline'>Vista previa</Button>
              <Button onClick={createCampaign} colorScheme='purple'>Crear</Button>
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
            <HStack align='start'>
              <Text w='140px' pt={2}>Descripción base</Text>
              <Textarea value={nativeBase} onChange={(e) => setNativeBase(e.target.value)} placeholder='Opcional: idea general para titular cada tarjeta' rows={2} />
            </HStack>
            <Button onClick={generateCopyNative} isLoading={nativeLoading} colorScheme='green' alignSelf='start'>Generar (Modelo Nativo)</Button>
            {Object.keys(carouselCopies).length > 0 && (
              <Box borderWidth='1px' rounded='md' p={3}>
                <Text fontWeight='medium' mb={2}>Elegir opción por propiedad:</Text>
                <Stack spacing={2} maxH='260px' overflow='auto'>
                  {Object.entries(carouselOptions).map(([pid, opts]) => (
                    <HStack key={pid} spacing={3}>
                      <Text minW='64px'>#{pid}</Text>
                      <Select size='sm' value={(carouselChoice as any)[pid] ?? 0} onChange={(e) => {
                        const i = parseInt(e.target.value, 10) || 0;
                        setCarouselChoice((c) => ({ ...c, [pid]: i }));
                        const option = opts[i] || opts[0];
                        setCarouselCopies((prev) => ({ ...prev, [Number(pid)]: { headline: option.headline, description: option.description } }));
                      }} maxW='260px'>
                        {opts.map((o, i) => (<option key={i} value={i}>{`Opción ${i+1}: ${o.headline.slice(0,36)}`}</option>))}
                      </Select>
                    </HStack>
                  ))}
                </Stack>
              </Box>
            )}
            <HStack>
              <Button onClick={requestPreview} isLoading={previewLoading} colorScheme='blue' variant='outline'>Vista previa</Button>
              <Button onClick={createCampaign} colorScheme='purple'>Crear</Button>
            </HStack>
            {preview && preview.carousel_data && (
              <Box pt={2}><FacebookCarouselPreview spec={preview} /></Box>
            )}
          </Stack>
        )}
        <Text fontSize='sm' color='gray.600'>El anuncio se crea en estado PAUSED para que lo revises y publiques desde Meta Ads Manager.</Text>
      </Stack>
    </Box>
  );
}

