import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Layout from '../../../components/Layout';
import Link from 'next/link';
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
  Switch,
  useToast,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  FormControl,
  FormLabel,
  Textarea,
  useColorModeValue,
} from '@chakra-ui/react';
import { getIronSession } from 'iron-session';
import { AppSession, sessionOptions } from '../../../lib/session';
import { useEffect, useMemo, useState } from 'react';

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

type Props = { username: string };

export const getServerSideProps: GetServerSideProps<Props> = async ({ req, res }) => {
  const session = await getIronSession<AppSession>(req, res, sessionOptions);
  if (!session.user) {
    return { redirect: { destination: '/admin/login', permanent: false } };
  }
  return { props: { username: session.user.username } };
};

function parseTags(tagsJson?: string | null): string[] {
  if (!tagsJson) return [];
  try { const arr = JSON.parse(tagsJson); return Array.isArray(arr) ? arr : []; } catch { return []; }
}

export default function AdminNewsIndex({}: Props) {
  const toast = useToast();
  const [q, setQ] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [tags, setTags] = useState('');
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [includeDrafts, setIncludeDrafts] = useState(true);

  const border = useColorModeValue('blackAlpha.200', 'whiteAlpha.200');

  const load = async () => {
    setLoading(true);
    try {
      const sp = new URLSearchParams();
      if (q) sp.set('q', q);
      if (from) sp.set('from', from);
      if (to) sp.set('to', to);
      if (tags) sp.set('tags', tags);
      if (!includeDrafts) sp.set('includeDrafts', 'false');
      const r = await fetch(`/api/admin/news?${sp.toString()}`);
      const j = await r.json();
      setItems(j.items || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Create/Edit modal state
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [editing, setEditing] = useState<NewsItem | null>(null);
  const [title, setTitle] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [tagsStr, setTagsStr] = useState('');
  const [published, setPublished] = useState(false);
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setTitle(''); setCoverUrl(''); setExcerpt(''); setContent(''); setTagsStr(''); setPublished(false);
    onOpen();
  };
  const openEdit = (n: NewsItem) => {
    setEditing(n);
    setTitle(n.title || '');
    setCoverUrl(n.coverUrl || '');
    setExcerpt(n.excerpt || '');
    setContent(n.content || '');
    setTagsStr(parseTags(n.tagsJson).join(', '));
    setPublished(Boolean(n.publishedAt));
    onOpen();
  };

  const save = async () => {
    setSaving(true);
    try {
      const body: any = { title, content, excerpt, coverUrl, tags: tagsStr.split(',').map((s) => s.trim()).filter(Boolean) };
      if (editing) {
        body.published = published;
        const r = await fetch(`/api/admin/news/${editing.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (!r.ok) throw new Error('No se pudo actualizar');
      } else {
        const r = await fetch('/api/admin/news', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (!r.ok) throw new Error('No se pudo crear');
      }
      await load();
      onClose();
      toast({ title: editing ? 'Actualizado' : 'Creado', status: 'success', duration: 1500 });
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message || String(e), status: 'error', duration: 2500 });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    if (!confirm('¿Eliminar esta noticia?')) return;
    const r = await fetch(`/api/admin/news/${id}`, { method: 'DELETE' });
    if (r.ok) { toast({ title: 'Eliminado', status: 'success', duration: 1200 }); await load(); }
    else toast({ title: 'No se pudo eliminar', status: 'error' });
  };

  const togglePublish = async (n: NewsItem) => {
    const r = await fetch(`/api/admin/news/${n.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ published: !n.publishedAt }) });
    if (r.ok) { await load(); toast({ title: !n.publishedAt ? 'Publicado' : 'Despublicado', status: 'success', duration: 1200 }); }
    else toast({ title: 'No se pudo cambiar estado', status: 'error' });
  };

  return (
    <Layout title="Admin · Noticias">
      <Head>
        <title>Admin · Noticias</title>
      </Head>
      <Box bg='#F7F4EC' minH='100vh' py={8}>
        <Container maxW='7xl'>
          <HStack justify='space-between' mb={4} align='center'>
            <Heading size='lg' color='#0E3B30'>Noticias</Heading>
            <Button colorScheme='teal' onClick={openCreate}>Nueva</Button>
          </HStack>
          <Stack direction={{ base: 'column', md: 'row' }} spacing={3} bg='white' p={4} rounded='xl' borderWidth='1px' borderColor={border} align='center'>
            <Input placeholder='Buscar por título o texto' value={q} onChange={(e) => setQ(e.target.value)} />
            <Input type='date' value={from} onChange={(e) => setFrom(e.target.value)} />
            <Input type='date' value={to} onChange={(e) => setTo(e.target.value)} />
            <Input placeholder='Etiquetas (coma separadas)' value={tags} onChange={(e) => setTags(e.target.value)} />
            <HStack>
              <Text>Incluir borradores</Text>
              <Switch isChecked={includeDrafts} onChange={(e) => setIncludeDrafts(e.target.checked)} />
            </HStack>
            <Button colorScheme='teal' onClick={load} isLoading={loading}>Buscar</Button>
          </Stack>

          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6} mt={6}>
            {(items || []).map((n) => {
              const date = n.publishedAt || n.createdAt;
              const t = parseTags(n.tagsJson);
              return (
                <Box key={n.id} borderWidth='1px' borderColor={border} rounded='xl' bg='white' overflow='hidden'>
                  <Box as={Link} href={`/noticias/${n.slug}`} target='_blank' display='block'>
                    <Image src={n.coverUrl || '/image3.jpg'} alt={n.title} w='100%' h='160px' objectFit='cover' />
                  </Box>
                  <Box p={4}>
                    <Heading size='sm' noOfLines={2}>{n.title}</Heading>
                    <HStack spacing={2} wrap='wrap' mt={2}>
                      {t.slice(0, 3).map((tag) => (<Tag key={tag} colorScheme='teal' size='sm'><TagLabel>{tag}</TagLabel></Tag>))}
                      <Text fontSize='sm' color='gray.600' ml='auto'>{new Date(date).toLocaleDateString('es-MX')}</Text>
                    </HStack>
                    <HStack mt={3} spacing={2}>
                      <Button size='sm' colorScheme='blue' variant='outline' onClick={() => openEdit(n)}>Editar</Button>
                      <Button size='sm' colorScheme={n.publishedAt ? 'yellow' : 'green'} onClick={() => togglePublish(n)}>{n.publishedAt ? 'Despublicar' : 'Publicar'}</Button>
                      <Button size='sm' colorScheme='red' variant='outline' onClick={() => remove(n.id)}>Eliminar</Button>
                    </HStack>
                  </Box>
                </Box>
              );
            })}
          </SimpleGrid>
        </Container>
      </Box>

      <Modal isOpen={isOpen} onClose={onClose} size='xl' scrollBehavior='inside'>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{editing ? 'Editar noticia' : 'Nueva noticia'}</ModalHeader>
          <ModalBody>
            <Stack spacing={3}>
              <FormControl>
                <FormLabel>Título</FormLabel>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
              </FormControl>
              <FormControl>
                <FormLabel>Cover URL</FormLabel>
                <Input value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} placeholder='https://…' />
              </FormControl>
              <FormControl>
                <FormLabel>Extracto</FormLabel>
                <Textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)} rows={2} />
              </FormControl>
              <FormControl>
                <FormLabel>Contenido</FormLabel>
                <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={10} />
              </FormControl>
              <FormControl>
                <FormLabel>Etiquetas (coma separadas)</FormLabel>
                <Input value={tagsStr} onChange={(e) => setTagsStr(e.target.value)} />
              </FormControl>
              {editing && (
                <HStack pt={2}>
                  <Text>Publicado</Text>
                  <Switch isChecked={published} onChange={(e) => setPublished(e.target.checked)} />
                </HStack>
              )}
            </Stack>
          </ModalBody>
          <ModalFooter>
            <Button mr={3} onClick={onClose}>Cancelar</Button>
            <Button colorScheme='teal' onClick={save} isLoading={saving}>{editing ? 'Guardar' : 'Crear'}</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Layout>
  );
}
