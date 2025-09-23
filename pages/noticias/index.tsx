import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Layout from '../../components/Layout';
import {
  Box,
  Container,
  Heading,
  Text,
  Stack,
  HStack,
  SimpleGrid,
  Input,
  Button,
  Tag,
  TagLabel,
  Image,
  useColorModeValue,
} from '@chakra-ui/react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

type NewsItem = {
  id: number;
  slug: string;
  title: string;
  excerpt?: string | null;
  coverUrl?: string | null;
  content: string;
  tagsJson?: string | null;
  publishedAt?: string | null;
  createdAt: string;
};

type Props = { initial: { items: NewsItem[]; page: number; total: number; pageSize: number } };

export const getServerSideProps: GetServerSideProps<Props> = async ({ query, req }) => {
  // Prefer the current host during SSR to avoid cross-domain fetch returning HTML
  const runtimeBase = req ? `${(req.headers['x-forwarded-proto'] as string) || 'http'}://${req.headers.host}` : '';
  const base = runtimeBase || (process.env.NEXT_PUBLIC_SITE_URL || '');
  const sp = new URLSearchParams();
  if (query.q) sp.set('q', String(query.q));
  if (query.tags) sp.set('tags', String(query.tags));
  if (query.from) sp.set('from', String(query.from));
  if (query.to) sp.set('to', String(query.to));
  if (query.page) sp.set('page', String(query.page));
  const url = `${base}/api/news?${sp.toString()}`;
  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const initial = await r.json();
    return { props: { initial } };
  } catch {
    // Fallback to empty state to avoid SSR crash if upstream returns HTML or fails
    return { props: { initial: { items: [], page: 1, total: 0, pageSize: 12 } as any } };
  }
};

function parseTags(tagsJson?: string | null): string[] {
  if (!tagsJson) return [];
  try { const arr = JSON.parse(tagsJson); return Array.isArray(arr) ? arr : []; } catch { return []; }
}

export default function NewsIndex({ initial }: Props) {
  const router = useRouter();
  const [q, setQ] = useState<string>(String(router.query.q || ''));
  const [from, setFrom] = useState<string>(String(router.query.from || ''));
  const [to, setTo] = useState<string>(String(router.query.to || ''));
  const [tags, setTags] = useState<string>(String(router.query.tags || ''));
  const [items, setItems] = useState<NewsItem[]>(initial.items || []);
  const [loading, setLoading] = useState(false);

  const border = useColorModeValue('blackAlpha.200', 'whiteAlpha.200');

  useEffect(() => { setItems(initial.items || []); }, [initial.items]);

  const applyFilters = () => {
    const sp = new URLSearchParams();
    if (q) sp.set('q', q);
    if (from) sp.set('from', from);
    if (to) sp.set('to', to);
    if (tags) sp.set('tags', tags);
    router.push({ pathname: '/noticias', query: Object.fromEntries(sp.entries()) }, undefined, { shallow: true });
  };

  const cards = items.map((n) => {
    const t = parseTags(n.tagsJson);
    const date = n.publishedAt || n.createdAt;
    return (
      <Box key={n.id} borderWidth='1px' borderColor={border} rounded='xl' bg='white' overflow='hidden' _hover={{ boxShadow: 'md' }} transition='box-shadow .2s ease'>
        <Box as={Link} href={`/noticias/${n.slug}`} display='block'>
          <Image src={n.coverUrl || '/image3.jpg'} alt={n.title} w='100%' h='180px' objectFit='cover' />
        </Box>
        <Box p={4}>
          <Stack spacing={2}>
            <Heading as={Link} href={`/noticias/${n.slug}`} size='md' noOfLines={2}>{n.title}</Heading>
            <HStack spacing={2} wrap='wrap'>
              {t.slice(0, 4).map((tag) => (
                <Tag key={tag} colorScheme='teal' size='sm'><TagLabel>{tag}</TagLabel></Tag>
              ))}
              <Text fontSize='sm' color='gray.600' ml='auto'>{new Date(date).toLocaleDateString('es-MX')}</Text>
            </HStack>
            <Text color='gray.700' noOfLines={3}>{n.excerpt || n.content}</Text>
            <Box>
              <Button as={Link} href={`/noticias/${n.slug}`} colorScheme='teal' variant='solid' size='sm'>Leer más</Button>
            </Box>
          </Stack>
        </Box>
      </Box>
    );
  });

  return (
    <Layout title="Noticias | Sayro Bienes Raíces">
      <Head>
        <title>Noticias | Sayro Bienes Raíces</title>
        <meta name='description' content='Noticias y consejos inmobiliarios en Querétaro.' />
      </Head>
      <Box bg='#F7F4EC' minH='100vh' py={10}>
        <Container maxW='7xl'>
          <Heading size='lg' color='#0E3B30' mb={4}>Noticias</Heading>
          <Stack direction={{ base: 'column', md: 'row' }} spacing={3} bg='white' p={4} rounded='xl' borderWidth='1px' borderColor={border} align='center'>
            <Input placeholder='Buscar por título o texto' value={q} onChange={(e) => setQ(e.target.value)} />
            <Input type='date' value={from} onChange={(e) => setFrom(e.target.value)} />
            <Input type='date' value={to} onChange={(e) => setTo(e.target.value)} />
            <Input placeholder='Etiquetas (coma separadas)' value={tags} onChange={(e) => setTags(e.target.value)} />
            <Button colorScheme='teal' onClick={applyFilters} isLoading={loading}>Buscar</Button>
          </Stack>
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6} mt={6}>
            {cards}
          </SimpleGrid>
        </Container>
      </Box>
    </Layout>
  );
}
