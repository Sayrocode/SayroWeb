'use client';
import React from 'react';
import dynamic from 'next/dynamic';
import LLMClient from '../../lib/llm/workerClient';
import generateAdIdeas from '../../lib/ads/generateAdIdeas';
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
  Image,
  Divider,
} from '@chakra-ui/react';

type Props = {
  selected: number[];
  selectedItems?: Array<any>;
  onClose: () => void;
};

const FacebookSinglePreview = dynamic(() => import('./FacebookSinglePreview'), { ssr: false, loading: () => <Box>Generando vista previa…</Box> });
const FacebookCarouselPreview = dynamic(() => import('./FacebookCarouselPreview'), { ssr: false, loading: () => <Box>Generando vista previa…</Box> });

export default function CampaignModalContent({ selected, selectedItems = [], onClose }: Props) {
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
  // OpenAI generation options
  const [genLocale, setGenLocale] = React.useState<'es'|'en'>('es');
  const [genModel, setGenModel] = React.useState<'gpt-4o-mini'|'gpt-4.1-mini'>('gpt-4o-mini');
  const [genTemp, setGenTemp] = React.useState<number>(0.7);
  const [genTopP, setGenTopP] = React.useState<number>(1.0);
  const [openaiLoading, setOpenaiLoading] = React.useState(false);

  const limit = (s: string, n: number) => (s.length <= n ? s : s.slice(0, n));

  const generateWithOpenAI = async () => {
    setOpenaiLoading(true);
    try {
      const ids = selected.map((n) => String(n));
      const resp = await generateAdIdeas({
        mode: adType,
        propertyIds: ids,
        locale: genLocale,
        model: genModel,
        temperature: genTemp,
        top_p: genTopP,
      } as any);
      if (!resp || (resp as any).ok === false) {
        toast({ title: 'No se pudo generar', description: (resp as any)?.error || '', status: 'error', duration: 2000 });
        return;
      }
      const result = resp as any;
      const items: Array<{ id: string; variants: Array<{ title: string; description: string }> }> = result.items || [];
      if (adType === 'single') {
        const t = items[0];
        const variants = (t?.variants || []).map((v: any) => ({
          headline: v.title,
          description: v.description,
          primaryText: limit(`${v.title}. ${v.description} ${genLocale === 'es' ? 'Conoce más.' : 'Learn more.'}`.trim(), 125),
        }));
        setNativeOptions(variants as any);
        setNativeChoice(0);
        const c = variants[0] || { headline: '', description: '', primaryText: '' };
        setCopyHeadline(c.headline || '');
        setCopyDesc(c.description || '');
        setCopyPrimary(c.primaryText || '');
      } else {
        const dict: Record<number, Array<{headline: string, description: string}>> = {};
        const chosen: Record<number, {headline: string, description: string}> = {};
        const choiceIdx: Record<number, number> = {};
        items.forEach((entry) => {
          const nid = Number(entry.id);
          const key = Number.isFinite(nid) ? nid : (entry.id as any);
          const opts = (entry.variants || []).map((v) => ({ headline: v.title, description: v.description }));
          // We only maintain numeric keys for selected items in UI
          if (typeof key === 'number') {
            dict[key] = opts;
            choiceIdx[key] = 0;
            const c = opts[0] || { headline: '', description: '' };
            chosen[key] = c;
          }
        });
        setCarouselOptions(dict);
        setCarouselChoice(choiceIdx);
        setCarouselCopies(chosen);
      }
      if ((result?.missing || []).length) {
        toast({ title: 'Algunas propiedades sin descripción', description: `IDs: ${(result.missing || []).join(', ')}`, status: 'warning', duration: 3500 });
      }
      toast({ title: 'Se generaron 5 opciones por propiedad (OpenAI)', status: 'success', duration: 1500 });
    } catch (e: any) {
      toast({ title: 'Error generando contenido', description: e?.message || String(e), status: 'error', duration: 2500 });
    } finally {
      setOpenaiLoading(false);
    }
  };

  const generateCopyNative = async () => {
    setNativeLoading(true);
    try {
      // Try client-side LLM worker first (wasm-ready scaffolding)
      const client = LLMClient.instance();
      if (adType === 'single') {
        const opts = await client.generateSingle({ base: nativeBase });
        setNativeOptions(opts);
        setNativeChoice(0);
        const c = opts[0] || { headline: '', description: '', primaryText: '' };
        setCopyHeadline(c.headline || '');
        setCopyDesc(c.description || '');
        setCopyPrimary(c.primaryText || '');
        toast({ title: 'Se generaron 5 opciones (local LLM)', status: 'success', duration: 1500 });
        return;
      }
      // carousel
      const items = selected.map((id) => ({ id }));
      const out = await client.generateCarousel({ items, base: nativeBase });
      const dict: Record<number, Array<{headline: string, description: string}>> = {};
      const chosen: Record<number, {headline: string, description: string}> = {};
      const choiceIdx: Record<number, number> = {};
      out.forEach((entry) => {
        dict[entry.id] = entry.options || [];
        choiceIdx[entry.id] = 0;
        const c = (entry.options || [])[0] || { headline: '', description: '' };
        chosen[entry.id] = c;
      });
      setCarouselOptions(dict);
      setCarouselChoice(choiceIdx);
      setCarouselCopies(chosen);
      toast({ title: 'Opciones por propiedad (local LLM)', status: 'success', duration: 1500 });
    } catch (e) {
      // Fallback to server stub if worker fails
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
          toast({ title: 'Se generaron 5 opciones (stub)', status: 'success', duration: 1500 });
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
          toast({ title: 'Opciones por propiedad (stub)', status: 'success', duration: 1500 });
        }
      } catch {}
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
          <Text w='140px'>Idioma</Text>
          <Select value={genLocale} onChange={(e) => setGenLocale(e.target.value as any)} maxW='220px'>
            <option value='es'>ES (Español)</option>
            <option value='en'>EN (English)</option>
          </Select>
        </HStack>
        <HStack>
          <Text w='140px'>Modelo</Text>
          <Select value={genModel} onChange={(e) => setGenModel(e.target.value as any)} maxW='220px'>
            <option value='gpt-4o-mini'>gpt-4o-mini</option>
            <option value='gpt-4.1-mini'>gpt-4.1-mini</option>
          </Select>
        </HStack>
        <HStack>
          <Text w='140px'>Creatividad</Text>
          <NumberInput value={genTemp} min={0} max={2} step={0.1} onChange={(_, n) => setGenTemp(Number.isFinite(n) ? Number(n.toFixed(2)) : 0.7)} maxW='200px'>
            <NumberInputField />
          </NumberInput>
          <Text w='80px' textAlign='right'>top_p</Text>
          <NumberInput value={genTopP} min={0} max={1} step={0.05} onChange={(_, n) => setGenTopP(Number.isFinite(n) ? Number(n.toFixed(2)) : 1.0)} maxW='140px'>
            <NumberInputField />
          </NumberInput>
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
              <Button onClick={generateWithOpenAI} isLoading={openaiLoading} colorScheme='purple'>Generar contenido</Button>
              <Button onClick={generateCopyNative} isLoading={nativeLoading} colorScheme='gray' variant='outline'>Generar (Nativo)</Button>
            </HStack>
            {nativeOptions.length > 0 && (
              <Stack spacing={2}>
                <HStack align='center'>
                  <Text w='140px'>Elegir opción</Text>
                  <Select value={String(nativeChoice)} onChange={(e) => {
                    const i = parseInt(e.target.value, 10) || 0;
                    setNativeChoice(i);
                    const c = nativeOptions[i] || nativeOptions[0];
                    setCopyHeadline(c.headline || '');
                    setCopyDesc(c.description || '');
                    setCopyPrimary(c.primaryText || '');
                  }} maxW='240px'>
                    {nativeOptions.map((_, i) => (<option key={i} value={i}>{`Opción ${i+1}`}</option>))}
                  </Select>
                </HStack>
                <Box borderWidth='1px' rounded='md' p={3} bg='gray.50'>
                  <Text fontSize='sm' color='gray.600' mb={1}>Vista previa de la opción</Text>
                  <Text fontWeight='semibold'>Título: {copyHeadline || '—'}</Text>
                  <Text>Descripción: {copyDesc || '—'}</Text>
                  <Text>Texto principal: {copyPrimary || '—'}</Text>
                </Box>
              </Stack>
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
            <HStack>
              <Button onClick={generateWithOpenAI} isLoading={openaiLoading} colorScheme='purple'>Generar contenido</Button>
              <Button onClick={generateCopyNative} isLoading={nativeLoading} colorScheme='gray' variant='outline' alignSelf='start'>Generar (Nativo)</Button>
            </HStack>
            {Object.keys(carouselCopies).length > 0 && (
              <Box borderWidth='1px' rounded='md' p={3}>
                <Text fontWeight='medium' mb={3}>Elegir opción por propiedad y ver detalles:</Text>
                <Stack spacing={4} maxH='60vh' overflow='auto'>
                  {selected.map((id) => {
                    const pid = String(id);
                    const opts = carouselOptions[id] || [];
                    const prop = (selectedItems || []).find((p: any) => Number(p?.id) === id) || {};
                    const choiceIdx = (carouselChoice as any)[pid] ?? 0;
                    const chosen = (carouselCopies as any)[id] || { headline: '', description: '' };
                    return (
                      <Box key={pid} borderWidth='1px' rounded='md' p={3} bg='white'>
                        <HStack align='start' spacing={3}>
                          <Image src={prop.coverUrl || '/image3.jpg'} alt={prop.title || ''} w='120px' h='80px' objectFit='cover' rounded='md' />
                          <Box flex='1'>
                            <HStack justify='space-between' align='start'>
                              <Box>
                                <Text fontWeight='semibold' noOfLines={1}>{prop.title || `Propiedad #${pid}`}</Text>
                                <HStack spacing={2} color='gray.600' fontSize='sm'>
                                  {prop.propertyType && <Text>{prop.propertyType}</Text>}
                                  {prop.locationText && <Text>• {prop.locationText}</Text>}
                                  {prop.price && <Text>• {prop.price}</Text>}
                                </HStack>
                              </Box>
                              <Box minW='260px'>
                                <Select size='sm' value={String(choiceIdx)} onChange={(e) => {
                                  const i = parseInt(e.target.value, 10) || 0;
                                  setCarouselChoice((c) => ({ ...c, [pid]: i }));
                                  const option = opts[i] || opts[0];
                                  setCarouselCopies((prev) => ({ ...prev, [id]: { headline: option.headline, description: option.description } }));
                                }} maxW='260px'>
                                  {opts.map((o, i) => (<option key={i} value={i}>{`Opción ${i+1}: ${o.headline.slice(0,48)}`}</option>))}
                                </Select>
                              </Box>
                            </HStack>
                            <Divider my={2} />
                            <Stack spacing={2}>
                              <HStack>
                                <Text w='120px'>Título</Text>
                                <Input value={chosen.headline || ''} onChange={(e) => setCarouselCopies((prev) => ({ ...prev, [id]: { ...prev[id], headline: e.target.value } }))} />
                              </HStack>
                              <HStack align='start'>
                                <Text w='120px' pt={2}>Descripción</Text>
                                <Textarea value={chosen.description || ''} onChange={(e) => setCarouselCopies((prev) => ({ ...prev, [id]: { ...prev[id], description: e.target.value } }))} rows={2} />
                              </HStack>
                            </Stack>
                          </Box>
                        </HStack>
                      </Box>
                    );
                  })}
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
