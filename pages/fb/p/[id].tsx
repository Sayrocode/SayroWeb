import type { GetServerSideProps } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Layout from '../../../components/Layout';
import { Box, Button, Container, Heading, HStack, Input, Stack, Text, Textarea, AspectRatio, Image as ChakraImage, useToast } from '@chakra-ui/react';
import { useEffect, useMemo, useState } from 'react';
import { trackLead, trackViewContent } from '../../../lib/fbpixel';

type EBOperation = { type?: string; amount?: number; currency?: string; formatted_amount?: string };
type EBImage = { url?: string | null };
type EBProperty = {
  public_id: string;
  title?: string | null;
  title_image_full?: string | null;
  title_image_thumb?: string | null;
  description?: string | null;
  location?: any;
  property_type?: string | null;
  status?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  parking_spaces?: number | null;
  operations?: EBOperation[];
  property_images?: EBImage[];
};

type PageProps = { property: EBProperty | null; canonicalUrl: string };

function pickPrice(ops?: EBOperation[]) {
  if (!ops?.length) return 'Precio a consultar';
  const sale = ops.find((o) => o.type === 'sale');
  const rental = ops.find((o) => o.type === 'rental');
  const ch = sale || rental || ops[0];
  if (ch?.formatted_amount) return ch.formatted_amount;
  if (typeof ch?.amount === 'number') {
    const cur = ch.currency || 'MXN';
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(ch.amount);
  }
  return 'Precio a consultar';
}

function firstImage(p: EBProperty) {
  const candidate =
    p.title_image_full ||
    p.title_image_thumb ||
    (Array.isArray(p.property_images) && (p.property_images[0]?.url as string)) ||
    '';
  return typeof candidate === 'string' && candidate.startsWith('/') ? candidate : '/image3.jpg';
}

export default function FbLanding({ property, canonicalUrl }: PageProps) {
  const r = useRouter();
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('Me interesa esta propiedad. ¿Podemos agendar una visita?');

  const cover = useMemo(() => (property ? firstImage(property) : '/image3.jpg'), [property]);
  const price = property ? pickPrice(property.operations) : '';

  useEffect(() => {
    if (!property) return;
    trackViewContent({ content_ids: [property.public_id], content_name: property.title || 'Propiedad', content_type: 'product' });
  }, [property]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!property) return;
    setSubmitting(true);
    try {
      const params = new URLSearchParams(r.asPath.split('?')[1] || '');
      const query = Object.fromEntries(params.entries());
      const body = { name, phone, email, message, propertyPublicId: property.public_id, pagePath: r.pathname };
      const q = new URLSearchParams(query as any);
      const resp = await fetch(`/api/leads?${q.toString()}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (resp.ok) {
        toast({ title: '¡Gracias! Te contactaremos pronto.', status: 'success', duration: 2500 });
        trackLead({ content_ids: [property.public_id] });
        setName(''); setPhone(''); setEmail('');
      } else {
        toast({ title: 'No se pudo enviar', status: 'error' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!property) {
    return (
      <Layout title="Propiedad no disponible">
        <Container py={16}><Heading size='lg'>Propiedad no disponible</Heading></Container>
      </Layout>
    );
  }

  const title = property.title || `Propiedad ${property.public_id}`;
  const desc = `${property.property_type || 'Propiedad'} · ${price}`;

  return (
    <Layout title={title}>
      <Head>
        <title>{title}</title>
        <meta name="description" content={desc} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={desc} />
        <meta property="og:image" content={cover} />
        <meta property="og:url" content={canonicalUrl} />
      </Head>

      <Box bg="#0E3B30" color='white'>
        <Container maxW='7xl' py={{ base: 8, md: 12 }}>
          <Stack direction={{ base: 'column', md: 'row' }} spacing={{ base: 6, md: 10 }} align='start'>
            <Box flex='1'>
              <AspectRatio ratio={16/9} rounded='lg' overflow='hidden'>
                <ChakraImage src={cover} alt={title} objectFit='cover' />
              </AspectRatio>
              <Heading mt={4} fontFamily='heading' size='lg'>{title}</Heading>
              <HStack mt={2} spacing={4} color='whiteAlpha.900'>
                <Text>{property.property_type}</Text>
                <Text fontWeight='bold'>{price}</Text>
                <Text>ID {property.public_id}</Text>
              </HStack>
            </Box>
            <Box flex='1' bg='white' color='gray.800' rounded='lg' p={6}>
              <Heading as='h2' fontFamily='heading' size='md' mb={2}>Quiero más información</Heading>
              <Text fontSize='sm' color='gray.600' mb={4}>Déjanos tus datos y te contactamos hoy.</Text>
              <Box as='form' onSubmit={onSubmit}>
                <Stack spacing={3}>
                  <Input placeholder='Nombre completo' value={name} onChange={(e) => setName(e.target.value)} required />
                  <Input placeholder='Teléfono (WhatsApp)' value={phone} onChange={(e) => setPhone(e.target.value)} required />
                  <Input placeholder='Email (opcional)' type='email' value={email} onChange={(e) => setEmail(e.target.value)} />
                  <Textarea placeholder='Mensaje' value={message} onChange={(e) => setMessage(e.target.value)} rows={3} />
                  <Button type='submit' colorScheme='green' isLoading={submitting}>Enviar</Button>
                  <Button as='a' href={`https://wa.me/52?text=${encodeURIComponent(`${title} - ${canonicalUrl}`)}`} target='_blank' rel='noopener noreferrer' variant='outline' colorScheme='green'>Escríbenos por WhatsApp</Button>
                </Stack>
              </Box>
              <Text mt={3} fontSize='xs' color='gray.500'>Protegemos tus datos. Uso exclusivo para esta consulta.</Text>
            </Box>
          </Stack>
        </Container>
      </Box>
    </Layout>
  );
}

function getBaseUrl(ctx: Parameters<GetServerSideProps>[0]) {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  const proto = (ctx.req.headers['x-forwarded-proto'] as string) || (process.env.NODE_ENV === 'production' ? 'https' : 'http');
  const host = ctx.req.headers.host;
  return `${proto}://${host}`;
}

const EB_API_BASE = 'https://api.easybroker.com/v1';

export const getServerSideProps: GetServerSideProps<PageProps> = async (ctx) => {
  const { id } = ctx.query as { id: string };
  const base = getBaseUrl(ctx);
  const canonicalUrl = `${base}/fb/p/${encodeURIComponent(id)}`;

  let property: EBProperty | null = null;
  try {
    // Priorizar nuestra API (Turso)
    const r1 = await fetch(`${base}/api/properties/${encodeURIComponent(id)}`);
    if (r1.ok) {
      property = (await r1.json()) as EBProperty;
    } else if (process.env.EASYBROKER_API_KEY) {
      // Fallback a EB solo para datos; imágenes se sanitizan a local
      const r2 = await fetch(`${EB_API_BASE}/properties/${encodeURIComponent(id)}`, {
        headers: { accept: 'application/json', 'X-Authorization': process.env.EASYBROKER_API_KEY as string },
      });
      if (r2.ok) {
        const j = (await r2.json()) as EBProperty;
        // Sanitizar imágenes: usar solo local placeholder
        property = {
          ...j,
          title_image_full: '/image3.jpg',
          title_image_thumb: '/image3.jpg',
          property_images: [],
        } as EBProperty;
      }
    }
  } catch {}

  return { props: { property, canonicalUrl } };
};
