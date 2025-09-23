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
  Tag,
  TagLabel,
  Image,
  useColorModeValue,
} from '@chakra-ui/react';

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

type Props = { item: NewsItem };

export const getServerSideProps: GetServerSideProps<Props> = async ({ params, req }) => {
  const slug = String(params?.slug || '');
  const runtimeBase = req ? `${(req.headers['x-forwarded-proto'] as string) || 'http'}://${req.headers.host}` : '';
  const base = runtimeBase || (process.env.NEXT_PUBLIC_SITE_URL || '');
  try {
    const r = await fetch(`${base}/api/news/${encodeURIComponent(slug)}`);
    if (!r.ok) return { notFound: true };
    const { item } = await r.json();
    return { props: { item } };
  } catch {
    return { notFound: true };
  }
};

function parseTags(tagsJson?: string | null): string[] {
  if (!tagsJson) return [];
  try { const arr = JSON.parse(tagsJson); return Array.isArray(arr) ? arr : []; } catch { return []; }
}

export default function NewsDetail({ item }: Props) {
  const border = useColorModeValue('blackAlpha.200', 'whiteAlpha.200');
  const tags = parseTags(item.tagsJson);
  const date = item.publishedAt || item.createdAt;
  return (
    <Layout title={`${item.title} | Noticias`}>
      <Head>
        <title>{item.title} | Noticias</title>
        <meta name='description' content={item.excerpt || item.content.slice(0, 140)} />
      </Head>
      <Box bg='#F7F4EC' minH='100vh' py={10}>
        <Container maxW='3xl'>
          <Stack spacing={4} bg='white' borderWidth='1px' borderColor={border} rounded='xl' p={4}>
            {item.coverUrl && (
              <Image src={item.coverUrl} alt={item.title} w='100%' h='320px' objectFit='cover' rounded='lg' />
            )}
            <Heading size='lg' color='#0E3B30'>{item.title}</Heading>
            <HStack spacing={2} wrap='wrap'>
              {tags.map((tag) => (<Tag key={tag} colorScheme='teal' size='sm'><TagLabel>{tag}</TagLabel></Tag>))}
              <Text fontSize='sm' color='gray.600' ml='auto'>{new Date(date).toLocaleDateString('es-MX')}</Text>
            </HStack>
            <Text whiteSpace='pre-line' fontSize='md' color='gray.800'>
              {item.content}
            </Text>
          </Stack>
        </Container>
      </Box>
    </Layout>
  );
}
