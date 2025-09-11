import type { GetStaticPaths, GetStaticProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import Layout from '../../../components/Layout';
import PropertyCard from '../../../components/PropertyCard';
import { Box, Breadcrumb, BreadcrumbItem, BreadcrumbLink, Container, Heading, SimpleGrid, Text } from '@chakra-ui/react';

type EBOperation = { prices?: { amount?: number; currency?: string; formatted_amount?: string }[] };
type EBProperty = {
  public_id: string;
  title?: string;
  title_image_full?: string;
  title_image_thumb?: string;
  location?: unknown;
  property_type?: string;
  bedrooms?: number;
  bathrooms?: number;
  parking_spaces?: number;
  operations?: EBOperation[];
  lot_size?: number | null;
  construction_size?: number | null;
};

type PageProps = { q: string; items: EBProperty[] };

const POPULAR_QUERIES = [
  'casa queretaro',
  'departamento queretaro',
  'terreno queretaro',
  'casa juriquilla',
  'casa centro historico queretaro',
];

function slugify(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export default function SearchLanding({ q, items }: PageProps) {
  const title = `Propiedades: ${q}`;
  const desc = `Encuentra ${q} con Sayro Bienes Raíces.`;
  return (
    <Layout title={title}>
      <Head>
        <title>{title}</title>
        <meta name='description' content={desc} />
      </Head>
      <Container maxW='7xl' py={{ base: 8, md: 12 }}>
        <Breadcrumb fontSize='sm' color='gray.600' mb={2}>
          <BreadcrumbItem><BreadcrumbLink as={Link} href='/'>Inicio</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbItem><BreadcrumbLink as={Link} href='/propiedades'>Propiedades</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbItem isCurrentPage><BreadcrumbLink href='#'>Búsqueda</BreadcrumbLink></BreadcrumbItem>
        </Breadcrumb>
        <Heading mb={4}>Resultados para “{q}”</Heading>
        {items.length === 0 ? (
          <Text color='gray.600'>Sin resultados. Explora el catálogo completo.</Text>
        ) : (
          <SimpleGrid columns={{ base: 1, sm: 2, md: 3 }} spacing={6}>
            {items.map((p) => <PropertyCard key={p.public_id} property={p as any} />)}
          </SimpleGrid>
        )}
        <Box mt={8}>
          <Link href='/propiedades'>Ver todas las propiedades</Link>
        </Box>
      </Container>
    </Layout>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const paths = POPULAR_QUERIES.map((q) => ({ params: { slug: slugify(q) } }));
  return { paths, fallback: 'blocking' };
};

async function fetchList(base: string, q: string) {
  const url = `${base}/api/properties?limit=24&page=1&q=${encodeURIComponent(q)}&fast=1`;
  const r = await fetch(url);
  if (!r.ok) return [];
  const j = await r.json();
  const content = Array.isArray(j?.content) ? j.content : [];
  return content as EBProperty[];
}

function getBaseUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  return process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
}

export const getStaticProps: GetStaticProps<PageProps> = async (ctx) => {
  const slug = String(ctx.params?.slug || '').trim();
  const q = POPULAR_QUERIES.find((s) => slugify(s) === slug) || slug.replace(/-/g, ' ');
  const base = getBaseUrl();
  const items = await fetchList(base, q);
  return {
    props: { q, items },
    revalidate: 300, // 5 min ISR
  };
};

