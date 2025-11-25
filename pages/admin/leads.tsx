import type { GetServerSideProps } from 'next';
import React from 'react';
import { getIronSession } from 'iron-session';
import { AppSession, sessionOptions } from '../../lib/session';
import Layout from '../../components/Layout';
import useSWRInfinite from 'swr/infinite';
import dynamic from 'next/dynamic';
import {
  Box,
  Container,
  Heading,
  SimpleGrid,
  Text,
  HStack,
  Stack,
  Button,
  Link as CLink,
  Spacer,
  Badge,
  Input,
  InputGroup,
  InputLeftElement,
  useToast,
  IconButton,
} from '@chakra-ui/react';
import { SearchIcon } from '@chakra-ui/icons';
import { FaWhatsapp } from 'react-icons/fa';
import { FiMail, FiPhone, FiCopy } from 'react-icons/fi';
import Link from 'next/link';
import { PHONE_CALL_SCHEME } from '../../lib/site';
import { SWRConfig } from 'swr';

type Lead = {
  id: number;
  source: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  message?: string | null;
  propertyId?: number | null;
  propertyPublicId?: string | null;
  createdAt: string;
  utm_source?: string | null;
  utm_campaign?: string | null;
  property?: { id: number; publicId: string; title: string | null } | null;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function useDebouncedValue<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

function digitsOnly(s?: string | null) {
  if (!s) return '';
  const d = String(s).replace(/\D+/g, '');
  return d.startsWith('52') ? d : `52${d}`; // asume MX si no tiene código
}

function CallMenu({ phone }: { phone?: string | null }) {
  const toast = useToast();
  if (!phone) return null;
  const digits = digitsOnly(phone);
  return (
    <Box display="flex" alignItems="center" columnGap={2} rowGap={2}>
      <Button
        size='xs'
        colorScheme='green'
        rounded='full'
        onClick={() => { try { window.location.href = `tel:${digits}`; } catch {} }}
      >
        Llamar
      </Button>
      <Button
        size='xs'
        variant='outline'
        onClick={async () => {
          try { await navigator.clipboard.writeText(phone); toast({ title: 'Copiado', status: 'success', duration: 1500 }); }
          catch { toast({ title: 'No se pudo copiar', status: 'error', duration: 1500 }); }
        }}
      >
        Copiar
      </Button>
    </Box>
  );
}

function LeadCard({ l }: { l: Lead }) {
  const toast = useToast();
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState<Lead>({ ...l });

  const saveEdit = async () => {
    try {
      const r = await fetch(`/api/admin/leads?id=${l.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: draft.name,
          email: draft.email,
          phone: draft.phone,
          message: draft.message,
          propertyPublicId: draft.propertyPublicId,
        }),
      });
      if (!r.ok) throw new Error('No se pudo guardar');
      toast({ title: 'Lead actualizado', status: 'success', duration: 1200 });
      setEditing(false);
    } catch (e) {
      toast({ title: 'Error al guardar', status: 'error', duration: 1500 });
    }
  };

  const deleteLead = async () => {
    if (!confirm('¿Eliminar este lead?')) return;
    try {
      const r = await fetch(`/api/admin/leads?id=${l.id}`, { method: 'DELETE' });
      if (!r.ok) throw new Error('No se pudo eliminar');
      toast({ title: 'Lead eliminado', status: 'success', duration: 1200 });
      // remove from UI by reloading page state
      window.dispatchEvent(new CustomEvent('leads:refresh'));
    } catch (e) {
      toast({ title: 'Error al eliminar', status: 'error', duration: 1500 });
    }
  };

  const msg = `Hola ${l.name || ''}. Vi tu interés en ${l.property?.title || l.propertyPublicId || 'nuestra propiedad'}.`;
  return (
    <Box borderWidth='1px' rounded='lg' bg='white' p={4}>
      <Box display="flex" alignItems="center" columnGap={2} mb={1} color='gray.600' fontSize='sm'>
        <Badge variant='subtle' colorScheme={l.source === 'meta' ? 'purple' : 'gray'} textTransform='none'>{l.source}</Badge>
        <Spacer />
        <Text>{new Date(l.createdAt).toLocaleString()}</Text>
      </Box>
      <Heading as='h3' size='md' mb={1} isTruncated>
        {editing ? (
          <Input
            size='sm'
            value={draft.name || ''}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            placeholder='Nombre'
          />
        ) : (
          l.name || 'Sin nombre'
        )}
      </Heading>
      {(l.message || editing) && (
        <Box mb={3}>
          {editing ? (
            <Input
              size='sm'
              value={draft.message || ''}
              onChange={(e) => setDraft((d) => ({ ...d, message: e.target.value }))}
              placeholder='Mensaje'
            />
          ) : (
            <Text color='gray.700'>{l.message}</Text>
          )}
        </Box>
      )}
      <Stack spacing={2} color='gray.700'>
        <Stack direction={{ base: 'column', sm: 'row' }} spacing={2} align={{ base: 'stretch', sm: 'center' }}>
          <FiPhone />
          {editing ? (
            <Input
              size='sm'
              value={draft.phone || ''}
              onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))}
              placeholder='Teléfono'
            />
          ) : l.phone ? (
            <CLink href={`tel:${digitsOnly(l.phone)}`} color='green.700' wordBreak='break-word'>
              {l.phone}
            </CLink>
          ) : (
            <Text color='gray.500'>-</Text>
          )}
          <Spacer display={{ base: 'none', sm: 'block' }} />
          <Box display="flex" alignItems="center" columnGap={2}>
            <CallMenu phone={l.phone} />
            {l.phone && (
              <Button
                as='a'
                href={`https://wa.me/${digitsOnly(l.phone)}?text=${encodeURIComponent(msg)}`}
                target='_blank'
                rel='noopener noreferrer'
                size={{ base: 'sm', md: 'xs' }}
                w={{ base: 'full', sm: 'auto' }}
                bg='green.600'
                color='white'
                _hover={{ bg: 'green.700' }}
                leftIcon={<FaWhatsapp />}
                rounded='full'
              >
                WhatsApp
              </Button>
            )}
          </Box>
        </Stack>
        <Stack direction={{ base: 'column', sm: 'row' }} spacing={2} align={{ base: 'stretch', sm: 'center' }}>
          <FiMail />
          {editing ? (
            <Input
              size='sm'
              value={draft.email || ''}
              onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
              placeholder='Email'
            />
          ) : l.email ? (
            <CLink href={`mailto:${l.email}?subject=${encodeURIComponent('Seguimiento — Sayro Bienes Raíces')}&body=${encodeURIComponent(`Hola ${l.name || ''}, sobre ${l.property?.title || l.propertyPublicId || 'tu consulta'}:`)}`} color='blue.600'>
              {l.email}
            </CLink>
          ) : (
            <Text color='gray.500'>-</Text>
          )}
          <Spacer display={{ base: 'none', sm: 'block' }} />
          {l.email && (
            <Button
              as='a'
              href={`mailto:${l.email}?subject=${encodeURIComponent('Seguimiento — Sayro Bienes Raíces')}&body=${encodeURIComponent(`Hola ${l.name || ''}, sobre ${l.property?.title || l.propertyPublicId || 'tu consulta'}:`)}`}
              size={{ base: 'sm', md: 'xs' }}
              w={{ base: 'full', sm: 'auto' }}
              colorScheme='blue'
              variant='outline'
              leftIcon={<FiMail />}
              rounded='full'
            >
              Email
            </Button>
          )}
        </Stack>
        <Box display="flex" alignItems="center" columnGap={2}>
          <Text fontSize='sm' color='gray.600'>Propiedad:</Text>
          {editing ? (
            <Input
              size='sm'
              value={draft.propertyPublicId || ''}
              onChange={(e) => setDraft((d) => ({ ...d, propertyPublicId: e.target.value }))}
              placeholder='ID propiedad'
            />
          ) : l.property?.publicId || l.propertyPublicId ? (
            <Link href={`/propiedades/${l.property?.publicId || l.propertyPublicId}`} target='_blank'>
              {l.property?.title || l.propertyPublicId}
            </Link>
          ) : (<Text color='gray.500'>-</Text>)}
        </Box>
        {(l.utm_source || l.utm_campaign) && (
          <Box fontSize='xs' color='gray.600' display="flex" columnGap={2} rowGap={2} flexWrap="wrap">
            {l.utm_source && <Badge mr={1}>{l.utm_source}</Badge>}
            {l.utm_campaign && <Badge mr={1} variant='outline'>{l.utm_campaign}</Badge>}
          </Box>
        )}
      </Stack>
      {l.source === 'website' && (
        <Box display="flex" columnGap={2} rowGap={2} mt={3}>
          {editing ? (
            <>
              <Button size='sm' colorScheme='green' onClick={saveEdit}>Guardar</Button>
              <Button size='sm' variant='outline' onClick={() => { setEditing(false); setDraft({ ...l }); }}>Cancelar</Button>
            </>
          ) : (
            <>
              <Button size='sm' variant='outline' onClick={() => setEditing(true)}>Editar</Button>
              <Button size='sm' colorScheme='red' onClick={deleteLead}>Eliminar</Button>
            </>
          )}
        </Box>
      )}
    </Box>
  );
}

const EgoSection = dynamic(() => import('../../components/admin/EgoSection'), { ssr: false, loading: () => <Text>Cargando EGO…</Text> });
const EasyBrokerSection = dynamic(() => import('../../components/admin/EasyBrokerSection'), { ssr: false, loading: () => <Text>Cargando EasyBroker…</Text> });

export default function LeadsPage() {
  const [qInput, setQInput] = React.useState('');
  const q = useDebouncedValue(qInput, 350);
  const [source, setSource] = React.useState<string>(''); // '' | 'meta' | 'website' | 'easybroker' | 'ego'
  const [egoTotal, setEgoTotal] = React.useState<number>(0);
  const [ebTotal, setEbTotal] = React.useState<number>(0);
  // Diferir la carga de secciones secundarias para evitar bloqueo inicial
  const [deferSecondary, setDeferSecondary] = React.useState(true);
  React.useEffect(() => {
    // Usa idle callback si existe, con fallback a timeout corto
    const idle = (cb: () => void) => (typeof (window as any).requestIdleCallback === 'function')
      ? (window as any).requestIdleCallback(cb, { timeout: 1200 })
      : setTimeout(cb, 700) as any;
    const cancel = (id: any) => (typeof (window as any).cancelIdleCallback === 'function')
      ? (window as any).cancelIdleCallback(id)
      : clearTimeout(id);
    const id = idle(() => setDeferSecondary(false));
    return () => cancel(id);
  }, []);
  const PAGE_SIZE = 30;
  const getKey = (index: number) => `/api/admin/leads?take=${PAGE_SIZE}&page=${index + 1}${q ? `&q=${encodeURIComponent(q)}&fast=1` : ''}${source ? `&source=${encodeURIComponent(source)}` : ''}`;
  const { data, size, setSize, isLoading } = useSWRInfinite(
    getKey,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 15000,
      persistSize: true,
      revalidateFirstPage: false,
    }
  );
  const pages = data || [];
  const total: number = pages.length ? (pages[0]?.total ?? 0) : 0;
  const aggregated: Lead[] = pages.flatMap((p: any) => Array.isArray(p?.items) ? p.items : []);
  const isInitial = !data || data.length === 0;
  const isLoadingMore = isLoading || (size > 0 && !!data && typeof data[size - 1] === 'undefined');
  const lastCount = pages.length ? (pages[pages.length - 1]?.items?.length || 0) : 0;
  const isReachingEnd = (lastCount < PAGE_SIZE) || (total > 0 && aggregated.length >= total);
  const loaderRef = React.useRef<HTMLDivElement | null>(null);
  const [lookahead, setLookahead] = React.useState(false);
  const prefetchGuard = React.useRef<number>(0);
  const [pendingMore, setPendingMore] = React.useState(false);
  React.useEffect(() => {
    const onRefresh = () => {
      setSize(1);
    };
    window.addEventListener('leads:refresh', onRefresh as any);
    return () => window.removeEventListener('leads:refresh', onRefresh as any);
  }, [setSize]);
  React.useEffect(() => { setSize(1); }, [q, source, setSize]);
  // Evitar re-crear el observer en cada render; usar refs para flags dinámicos
  const loadingRef = React.useRef(isLoadingMore);
  const endRef = React.useRef(isReachingEnd);
  React.useEffect(() => { loadingRef.current = isLoadingMore; }, [isLoadingMore]);
  React.useEffect(() => { endRef.current = isReachingEnd; }, [isReachingEnd]);
  // Track scroll direction to avoid heavy work while scrolling up
  const lastYRef = React.useRef(0);
  const scrollingDownRef = React.useRef(true);
  React.useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY || 0;
      scrollingDownRef.current = y >= lastYRef.current;
      lastYRef.current = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  React.useEffect(() => {
    const el = loaderRef.current;
    if (!el) return;
    if (q) return; // disable infinite scroll while searching
    const ob = new IntersectionObserver((entries) => {
      const e = entries[0];
      if (e.isIntersecting && !loadingRef.current && !endRef.current && scrollingDownRef.current) {
        setPendingMore(true);
        React.startTransition(() => { void setSize((s) => s + 1); });
      }
    }, { root: null, rootMargin: '1200px 0px', threshold: 0 });
    ob.observe(el);
    return () => ob.disconnect();
  }, [setSize, q]);
  React.useEffect(() => { if (!isLoadingMore) setPendingMore(false); }, [isLoadingMore]);

  // Scroll position persistence for fast back/forward
  React.useEffect(() => {
    const y = Number(sessionStorage.getItem('admin.leads.scroll') || '0');
    if (y > 0) requestAnimationFrame(() => window.scrollTo(0, y));
    return () => {
      try { sessionStorage.setItem('admin.leads.scroll', String(window.scrollY || 0)); } catch {}
    };
  }, []);

  // Lookahead prefetch: cuando termina de cargar una página visible, traer una más en background
  React.useEffect(() => {
    // Visibility rules: filter acts as main section selector
    const visibleLeads = source === '' || source === 'meta' || source === 'website';
    if (!visibleLeads) return;
    if (q) return;                 // evitar durante búsqueda
    if (isLoadingMore) return;
    if (isReachingEnd) return;
    if (prefetchGuard.current === size) return;
    prefetchGuard.current = size;
    const idle = (cb: () => void) => (typeof (window as any).requestIdleCallback === 'function')
      ? (window as any).requestIdleCallback(cb, { timeout: 800 })
      : setTimeout(cb, 150) as any;
    const id = idle(() => {
      setLookahead(true);
      React.startTransition(() => { void setSize(size + 1); });
    });
    return () => { if (typeof (window as any).cancelIdleCallback === 'function') (window as any).cancelIdleCallback(id); else clearTimeout(id as any); };
  }, [size, source, q, isLoadingMore, isReachingEnd, setSize]);
  React.useEffect(() => { if (!isLoadingMore) setLookahead(false); }, [isLoadingMore]);

  // Visibility rules: filter acts as main section selector
  const showLeads = source === '' || source === 'meta' || source === 'website';
  const showEgo = source === '' || source === 'ego';
  const showEasybrokerContacts = source === '' || source === 'easybroker';

  // Contador del badge en el header: cuando está en "Todos",
  // mostrar la suma de las tres secciones visibles (Leads + EGO + EasyBroker).
  // Bajo búsqueda (q) usamos el número de elementos ya agregados para Leads,
  // y los totales reportados por las secciones secundarias.
  let badgeCount: number;
  if (source === '') {
    const leadsCount = q ? aggregated.length : (total || 0);
    badgeCount = leadsCount + (egoTotal || 0) + (ebTotal || 0);
  } else if (source === 'ego') {
    badgeCount = egoTotal || 0;
  } else if (source === 'easybroker') {
    badgeCount = ebTotal || 0;
  } else {
    badgeCount = q ? aggregated.length : (total || 0);
  }

  return (
    <SWRConfig value={{ revalidateOnFocus: false, revalidateOnReconnect: false, dedupingInterval: 15000 }}>
    <Layout title='Leads'>
      <Container maxW='7xl' py={{ base: 4, md: 10 }}>
        <Stack direction={{ base: 'column', md: 'row' }} spacing={{ base: 3, md: 4 }} align={{ base: 'stretch', md: 'center' }} mb={4}>
          <Box display="flex" alignItems="center" columnGap={2}>
            <Heading size='lg'>Leads</Heading>
            <Badge colorScheme='gray' variant='subtle'>{badgeCount} total</Badge>
          </Box>
          <Spacer display={{ base: 'none', md: 'block' }} />
          <Box display="flex" columnGap={2} overflowX={{ base: 'auto', md: 'visible' }} py={{ base: 1, md: 0 }} px={{ base: 1, md: 0 }} sx={{ '::-webkit-scrollbar': { display: 'none' } }}>
            <Button size='sm' variant={source === '' ? 'solid' : 'outline'} onClick={() => setSource('')}>Todos</Button>
            <Button size='sm' variant={source === 'meta' ? 'solid' : 'outline'} onClick={() => setSource('meta')}>Meta</Button>
            <Button size='sm' variant={source === 'website' ? 'solid' : 'outline'} onClick={() => setSource('website')}>Website</Button>
            <Button size='sm' variant={source === 'easybroker' ? 'solid' : 'outline'} onClick={() => setSource('easybroker')}>EasyBroker</Button>
            <Button size='sm' variant={source === 'ego' ? 'solid' : 'outline'} onClick={() => setSource('ego')}>EGO</Button>
          </Box>
          <InputGroup w={{ base: 'full', md: '320px' }}>
            <InputLeftElement pointerEvents='none'><SearchIcon color='gray.400' /></InputLeftElement>
            <Input placeholder='Buscar nombre, email, teléfono, mensaje' value={qInput} onChange={(e) => setQInput(e.target.value)} bg='white' />
          </InputGroup>
          <Button as={Link} href='/admin' variant='outline' w={{ base: 'full', md: 'auto' }}>Volver</Button>
        </Stack>

        {showLeads && (
          <>
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={5}>
              {(isInitial && aggregated.length === 0) ? Array.from({ length: 6 }).map((_, i) => (
                <Box key={i} borderWidth='1px' rounded='lg' bg='white' p={4}>
                  <Box height='20px' bg='gray.100' mb={2} rounded='md' />
                  <Box height='16px' bg='gray.100' mb={1} rounded='md' />
                  <Box height='16px' bg='gray.100' mb={1} rounded='md' />
                  <Box height='16px' bg='gray.100' mb={1} rounded='md' />
                </Box>
              )) : aggregated.map((l) => (
                <LeadCard key={l.id} l={l} />
              ))}
            </SimpleGrid>
            <Box ref={loaderRef} h='1px' />
            {(pendingMore || (isLoadingMore && !lookahead)) && (
              <Box mt={4}>
                <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={5}>
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Box key={i} borderWidth='1px' rounded='lg' bg='white' p={4}>
                      <Box height='20px' bg='gray.100' mb={2} rounded='md' />
                      <Box height='16px' bg='gray.100' mb={1} rounded='md' />
                      <Box height='16px' bg='gray.100' mb={1} rounded='md' />
                      <Box height='16px' bg='gray.100' mb={1} rounded='md' />
                    </Box>
                  ))}
                </SimpleGrid>
              </Box>
            )}
            {!isLoadingMore && !isReachingEnd && (
              <Box textAlign='center' mt={6}>
                <Button onClick={() => setSize(size + 1)} variant='outline'>Cargar más</Button>
              </Box>
            )}
          </>
        )}

        {showEgo && !deferSecondary && (
          <EgoSection q={q} visible onTotal={(n) => setEgoTotal(n)} />
        )}

        {showEasybrokerContacts && !deferSecondary && (
          <EasyBrokerSection visible q={q} onTotal={(n) => setEbTotal(n)} />
        )}
      </Container>
    </Layout>
    </SWRConfig>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ req, res }) => {
  const session = await getIronSession<AppSession>(req, res, sessionOptions);
  if (!session.user) return { redirect: { destination: '/admin/login', permanent: false } };
  return { props: {} };
};
