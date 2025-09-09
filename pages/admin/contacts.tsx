import type { GetServerSideProps } from 'next';
import React from 'react';
import { getIronSession } from 'iron-session';
import { AppSession, sessionOptions } from 'lib/session';
import Layout from 'components/Layout';
import Link from 'next/link';
import useSWRInfinite from 'swr/infinite';
import { Box, Button, Container, Heading, Text, SimpleGrid, HStack, Input, InputGroup, InputLeftElement, Badge, Stack, Spacer, Skeleton, Editable, EditablePreview, EditableInput } from '@chakra-ui/react';
import { SearchIcon } from '@chakra-ui/icons';

type EgoContact = {
  id: number;
  personId?: string | null;
  name?: string | null;
  role?: string | null;
  phone?: string | null;
  email?: string | null;
  createdText?: string | null;
  createdAtEgo?: string | null;
  responsible?: string | null;
  updatedAt?: string;
};

export default function AdminEgoContacts() {
  const fetcher = (url: string) => fetch(url).then((r) => r.json());
  const [q, setQ] = React.useState('');
  const PAGE_SIZE = 60;
  const getKey = (index: number) => `/api/admin/egocontacts?take=${PAGE_SIZE}&page=${index + 1}${q ? `&q=${encodeURIComponent(q)}` : ''}`;
  const { data, size, setSize, mutate, isLoading } = useSWRInfinite(getKey, fetcher);
  const pages = data || [];
  const total: number = pages.length ? (pages[0]?.total ?? 0) : 0;
  const aggregated: EgoContact[] = pages.flatMap((p: any) => Array.isArray(p?.items) ? p.items : []);
  const isInitial = !data || data.length === 0;
  const isLoadingMore = isLoading || (size > 0 && !!data && typeof data[size - 1] === 'undefined');
  const isReachingEnd = (pages.length > 0 && (pages[pages.length - 1]?.items?.length || 0) < PAGE_SIZE) || (total > 0 && aggregated.length >= total);
  const loaderRef = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => { setSize(1); }, [q, setSize]);
  React.useEffect(() => {
    const el = loaderRef.current;
    if (!el) return;
    const ob = new IntersectionObserver((entries) => {
      const e = entries[0];
      if (e.isIntersecting && !isLoadingMore && !isReachingEnd) setSize((s) => s + 1);
    }, { root: null, rootMargin: '1200px 0px', threshold: 0 });
    ob.observe(el);
    return () => ob.disconnect();
  }, [loaderRef.current, isLoadingMore, isReachingEnd, setSize]);

  const [editingId, setEditingId] = React.useState<number | null>(null);
  const [form, setForm] = React.useState<Partial<EgoContact>>({});

  const startEdit = (c: EgoContact) => { setEditingId(c.id); setForm(c); };
  const cancelEdit = () => { setEditingId(null); setForm({}); };
  const saveEdit = async () => {
    if (editingId == null) return;
    const r = await fetch(`/api/admin/egocontacts/${editingId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    if (r.ok) { cancelEdit(); await mutate(); }
  };
  const remove = async (id: number) => {
    if (!confirm('¿Eliminar contacto?')) return;
    const r = await fetch(`/api/admin/egocontacts/${id}`, { method: 'DELETE' });
    if (r.ok) await mutate();
  };

  return (
    <Layout title="Contactos EGO">
      <Container maxW="7xl" py={8}>
        <HStack mb={4} spacing={3} align="center">
          <Heading size="lg">Contactos (EgoRealEstate)</Heading>
          <Badge colorScheme="gray" variant="subtle">{total || 0} total</Badge>
          <Spacer />
          <InputGroup w={{ base: 'full', md: '300px' }}>
            <InputLeftElement pointerEvents="none"><SearchIcon color="gray.400" /></InputLeftElement>
            <Input placeholder="Buscar nombre, email, teléfono" value={q} onChange={(e) => setQ(e.target.value)} bg="white" />
          </InputGroup>
          {/* Importación de scrapers deshabilitada en Vercel */}
          <Button as={Link} href="/admin" variant="outline">Volver</Button>
        </HStack>

        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={5}>
          {(isInitial && aggregated.length === 0) ? Array.from({ length: 6 }).map((_, i) => (
            <Box key={i} borderWidth="1px" rounded="lg" bg="white" p={4}>
              <Skeleton height="20px" mb={2} />
              <Skeleton height="16px" mb={1} />
              <Skeleton height="16px" mb={1} />
              <Skeleton height="16px" mb={1} />
            </Box>
          )) : aggregated.map((c) => (
            <Box key={c.id} borderWidth="1px" rounded="lg" bg="white" p={4}>
              {editingId === c.id ? (
                <Stack spacing={2} color="gray.700">
                  <Input value={form.name || ''} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder='Nombre' />
                  <HStack>
                    <Input value={form.phone || ''} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder='Teléfono' />
                    <Input value={form.email || ''} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder='Email' />
                  </HStack>
                  <HStack>
                    <Input value={form.role || ''} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} placeholder='Rol' />
                    <Input value={form.responsible || ''} onChange={(e) => setForm((f) => ({ ...f, responsible: e.target.value }))} placeholder='Responsable' />
                  </HStack>
                  <HStack>
                    <Input value={form.createdText || ''} onChange={(e) => setForm((f) => ({ ...f, createdText: e.target.value }))} placeholder='Creada' />
                    <Input value={form.personId || ''} onChange={(e) => setForm((f) => ({ ...f, personId: e.target.value }))} placeholder='Person ID' />
                  </HStack>
                  <HStack>
                    <Button size='sm' colorScheme='green' onClick={saveEdit}>Guardar</Button>
                    <Button size='sm' variant='outline' onClick={cancelEdit}>Cancelar</Button>
                  </HStack>
                </Stack>
              ) : (
                <>
                  <Heading as="h3" size="md" mb={2}>{c.name || 'Sin nombre'}</Heading>
                  <Stack spacing={1} color="gray.700">
                    {c.role && <Text><b>Rol:</b> {c.role}</Text>}
                    {c.phone && <Text><b>Tel:</b> {c.phone}</Text>}
                    {c.email && <Text><b>Email:</b> {c.email}</Text>}
                    {c.createdText && <Text><b>Creada:</b> {c.createdText}</Text>}
                    {c.responsible && <Text><b>Responsable:</b> {c.responsible}</Text>}
                    {c.personId && (
                      <Text><b>Persona ID:</b> {c.personId}</Text>
                    )}
                  </Stack>
                  <HStack mt={3} spacing={2}>
                    <Button size='sm' colorScheme='blue' onClick={() => startEdit(c)}>Editar</Button>
                    <Button size='sm' variant='outline' colorScheme='red' onClick={() => remove(c.id)}>Eliminar</Button>
                  </HStack>
                </>
              )}
            </Box>
          ))}
        </SimpleGrid>
        <Box ref={loaderRef} h="1px" />
        {isLoadingMore && (
          <Box mt={6}>
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={5}>
              {Array.from({ length: 3 }).map((_, i) => (
                <Box key={i} borderWidth="1px" rounded="lg" bg="white" p={4}>
                  <Skeleton height="20px" mb={2} />
                  <Skeleton height="16px" mb={1} />
                  <Skeleton height="16px" mb={1} />
                </Box>
              ))}
            </SimpleGrid>
          </Box>
        )}

        {!isLoadingMore && !isReachingEnd && (
          <Box textAlign="center" mt={6}>
            <Button onClick={() => setSize(size + 1)} variant="outline">Cargar más</Button>
          </Box>
        )}
      </Container>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ req, res }) => {
  const session = await getIronSession<AppSession>(req, res, sessionOptions);
  if (!session.user) {
    return { redirect: { destination: '/admin/login', permanent: false } };
  }
  return { props: {} };
};
