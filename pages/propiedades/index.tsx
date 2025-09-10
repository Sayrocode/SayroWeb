import Layout from 'components/Layout';
import { Box, Container, Heading, SimpleGrid } from '@chakra-ui/react';
import PropertyCard from 'components/PropertyCard';

type Prop = { id: number; publicId: string; title?: string | null; titleImageFull?: string | null; titleImageThumb?: string | null; propertyType?: string | null; status?: string | null; locationText?: string | null };

export default function PropertiesPage({ items = [] as Prop[] }: { items?: Prop[] }) {
  return (
    <Layout title='Propiedades'>
      <Container maxW='7xl' py={{ base: 8, md: 12 }}>
        <Heading mb={4}>Propiedades</Heading>
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
          {items.map((p) => (<PropertyCard key={p.id} p={p} />))}
        </SimpleGrid>
      </Container>
    </Layout>
  );
}

export async function getServerSideProps({ req }: any) {
  const proto = (req.headers['x-forwarded-proto'] as string) || (process.env.NODE_ENV === 'production' ? 'https' : 'http');
  const base = `${proto}://${req.headers.host}`;
  try {
    const r = await fetch(`${base}/api/properties`);
    const j = await r.json();
    const items: Prop[] = Array.isArray(j?.content) ? j.content.map((raw: any, i: number) => ({
      id: i + 1,
      publicId: raw.public_id || String(i + 1),
      title: raw.title || null,
      titleImageFull: raw.title_image_full || null,
      titleImageThumb: raw.title_image_thumb || null,
      propertyType: raw.property_type || null,
      status: raw.status || null,
      locationText: (raw.location && (raw.location.name || raw.location.state)) || '',
    })) : [];
    return { props: { items } };
  } catch {
    return { props: { items: [] } };
  }
}
