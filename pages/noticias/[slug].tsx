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
  VStack,
  Tag,
  TagLabel,
  Image,
  useColorModeValue,
  Textarea,
  Input,
  Button,
  Icon,
} from '@chakra-ui/react';
import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { FiHeart } from 'react-icons/fi';

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
  const [anonId, setAnonId] = useState<string>('');
  // create or get anon id stored in localStorage and cookie
  useEffect(() => {
    try {
      const key = 'anon_id';
      let id = localStorage.getItem(key) || '';
      if (!id) {
        id = (Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)).slice(0, 24);
        localStorage.setItem(key, id);
        document.cookie = `anon_id=${encodeURIComponent(id)}; path=/; max-age=${60 * 60 * 24 * 365}`;
      }
      setAnonId(id);
    } catch {}
  }, []);

  const slug = item.slug;
  const fetcher = (url: string) => fetch(url, { headers: anonId ? { 'x-anon-id': anonId } : undefined }).then(r => r.json());
  const { data: likes, mutate: mutateLikes } = useSWR<{ count: number; liked: boolean }>(`/api/news/${encodeURIComponent(slug)}/like`, fetcher);
  const { data: comments, mutate: mutateComments } = useSWR<{ items: any[] }>(`/api/news/${encodeURIComponent(slug)}/comments`, fetcher);

  const [displayName, setDisplayName] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function toggleLike() {
    if (!anonId) return;
    try {
      const liked = !!likes?.liked;
      const method = liked ? 'DELETE' : 'POST';
      await fetch(`/api/news/${encodeURIComponent(slug)}/like`, { method, headers: { 'x-anon-id': anonId } });
      mutateLikes();
    } catch {}
  }

  async function submitComment() {
    if (!anonId || !content.trim()) return;
    setSubmitting(true);
    try {
      const body = { content: content.trim(), displayName: displayName.trim() || undefined };
      const r = await fetch(`/api/news/${encodeURIComponent(slug)}/comments`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-anon-id': anonId }, body: JSON.stringify(body) });
      if (r.ok) {
        setContent('');
        mutateComments();
      }
    } finally {
      setSubmitting(false);
    }
  }

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
            <HStack spacing={2} wrap='wrap' align='center'>
              {tags.map((tag) => (<Tag key={tag} colorScheme='teal' size='sm'><TagLabel>{tag}</TagLabel></Tag>))}
              <Text fontSize='sm' color='gray.600' ml='auto'>{new Date(date).toLocaleDateString('es-MX')}</Text>
              <Button size='sm' variant={likes?.liked ? 'solid' : 'outline'} colorScheme='pink' leftIcon={<Icon as={FiHeart} />} onClick={toggleLike}>
                {likes ? likes.count : 0} Me gusta
              </Button>
            </HStack>
            <Text whiteSpace='pre-line' fontSize='md' color='gray.800'>
              {item.content}
            </Text>
            {/* Comments */}
            <Box pt={2}>
              <Heading size='md' color='#0E3B30' mb={2}>Comentarios</Heading>
              <VStack align='stretch' spacing={4}>
                <Box>
                  <Input placeholder='Tu nombre (opcional)' value={displayName} onChange={(e) => setDisplayName(e.target.value)} mb={2} />
                  <Textarea placeholder='Escribe tu comentario (anónimo)' value={content} onChange={(e) => setContent(e.target.value)} rows={4} />
                  <HStack mt={2}>
                    <Button colorScheme='teal' onClick={submitComment} isLoading={submitting} isDisabled={!content.trim()}>Publicar</Button>
                    <Text fontSize='sm' color='gray.500'>Se publicará como anónimo.</Text>
                  </HStack>
                </Box>
                <VStack align='stretch' spacing={3} divider={<Box borderBottomWidth='1px' borderColor={border} /> as any}>
                  {(comments?.items || []).map((c) => (
                    <Box key={c.id}>
                      <HStack justify='space-between' mb={1}>
                        <Text fontWeight='semibold'>{c.displayName || 'Anónimo'}</Text>
                        <Text fontSize='xs' color='gray.600'>{new Date(c.createdAt).toLocaleString('es-MX')}</Text>
                      </HStack>
                      <Text whiteSpace='pre-line'>{c.content}</Text>
                    </Box>
                  ))}
                  {(!comments || (comments.items || []).length === 0) && (
                    <Text fontSize='sm' color='gray.600'>Sé el primero en comentar.</Text>
                  )}
                </VStack>
              </VStack>
            </Box>
          </Stack>
        </Container>
      </Box>
    </Layout>
  );
}
