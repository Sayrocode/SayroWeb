import Layout from 'components/Layout';
import { Box, Container, Heading, SimpleGrid, HStack, Button } from '@chakra-ui/react';
import PropertyCard from 'components/PropertyCard';
import NextLink from 'next/link';
import type { GetServerSideProps } from 'next';

type Prop = { id: number; publicId: string; title?: string | null; titleImageFull?: string | null; titleImageThumb?: string | null; propertyType?: string | null; status?: string | null; locationText?: string | null };

type Props = { items?: Prop[]; page: number; totalPages: number };

export default function PropertiesPage({ items = [] as Prop[], page, totalPages }: Props) {
  return (
    <Layout title='Propiedades'>
      <Container maxW='7xl' py={{ base: 8, md: 12 }}>
        <Heading mb={4}>Propiedades</Heading>
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
          {items.map((p) => (<PropertyCard key={p.id} p={p} />))}
        </SimpleGrid>
        <HStack justify='space-between' mt={8}>
          <Box>
            {page > 1 && (
              <Button as={NextLink} href={`/propiedades?page=${page - 1}`} variant='outline'>Anterior</Button>
            )}
          </Box>
          <Box>
            {page < totalPages && (
              <Button as={NextLink} href={`/propiedades?page=${page + 1}`} colorScheme='green'>Siguiente</Button>
            )}
          </Box>
        </HStack>
      </Container>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const { req, query } = ctx as any;
  const page = Math.max(parseInt(String(query.page ?? '1')) || 1, 1);
  const limit = 24;
  const proto = (req.headers['x-forwarded-proto'] as string) || (process.env.NODE_ENV === 'production' ? 'https' : 'http');
  const base = `${proto}://${req.headers.host}`;
  try {
    const r = await fetch(`${base}/api/properties?limit=${limit}&page=${page}`);
    const j = await r.json();
    const items: Prop[] = Array.isArray(j?.content) ? j.content.map((raw: any, i: number) => ({
      id: (page - 1) * limit + i + 1,
      publicId: raw.public_id || String((page - 1) * limit + i + 1),
      title: raw.title || null,
      titleImageFull: raw.title_image_full || null,
      titleImageThumb: raw.title_image_thumb || null,
      propertyType: raw.property_type || null,
      status: raw.status || null,
      locationText: (raw.location && (raw.location.name || raw.location.state)) || '',
    })) : [];
    const totalPages = Math.max(parseInt(String(j?.pagination?.total_pages ?? '1')) || 1, 1);
    return { props: { items, page, totalPages } };
  } catch {
    return { props: { items: [], page, totalPages: 1 } };
  }
};
