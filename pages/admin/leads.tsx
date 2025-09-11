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
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useToast,
  IconButton,
} from '@chakra-ui/react';
import { SearchIcon } from '@chakra-ui/icons';
import { FaWhatsapp } from 'react-icons/fa';
import { FiMail, FiPhone, FiChevronDown, FiCopy } from 'react-icons/fi';
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
  const primaryHref = `${PHONE_CALL_SCHEME}:${digits}`;
  return (
    <Menu>
      <MenuButton as={Button} size='xs' colorScheme='green' rightIcon={<FiChevronDown />} leftIcon={<FiPhone />} rounded='full'>
        Llamar
      </MenuButton>
      <MenuList>
        <MenuItem as='a' href={primaryHref}>Predeterminado ({PHONE_CALL_SCHEME})</MenuItem>
        <MenuItem as='a' href={`tel:${digits}`}>Teléfono (tel:)</MenuItem>
        <MenuItem as='a' href={`sip:${digits}`}>VoIP (sip:)</MenuItem>
        <MenuItem as='a' href={`callto:${digits}`}>Callto</MenuItem>
        <MenuItem onClick={async () => {
          try { await navigator.clipboard.writeText(phone); toast({ title: 'Copiado', status: 'success', duration: 1500 }); }
          catch { toast({ title: 'No se pudo copiar', status: 'error', duration: 1500 }); }
        }} icon={<FiCopy />}>Copiar número</MenuItem>
      </MenuList>
    </Menu>
  );
}

function LeadCard({ l }: { l: Lead }) {
  const msg = `Hola ${l.name || ''}. Vi tu interés en ${l.property?.title || l.propertyPublicId || 'nuestra propiedad'}.`;
  return (
    <Box borderWidth='1px' rounded='lg' bg='white' p={4}>
      <HStack mb={1} spacing={2} color='gray.600' fontSize='sm'>
        <Badge variant='subtle' colorScheme={l.source === 'meta' ? 'purple' : 'gray'} textTransform='none'>{l.source}</Badge>
        <Spacer />
        <Text>{new Date(l.createdAt).toLocaleString()}</Text>
      </HStack>
      <Heading as='h3' size='md' mb={1}>{l.name || 'Sin nombre'}</Heading>
      {l.message && (
        <Text mb={3} color='gray.700'>{l.message.slice(0, 160)}</Text>
      )}
      <Stack spacing={2} color='gray.700'>
        <HStack spacing={2}>
          <FiPhone />
          {l.phone ? (
            <CLink href={`tel:${digitsOnly(l.phone)}`} color='green.700'>{l.phone}</CLink>
          ) : (
            <Text color='gray.500'>-</Text>
          )}
          <Spacer />
          <CallMenu phone={l.phone} />
          {l.phone && (
            <Button
              as='a'
              href={`https://wa.me/${digitsOnly(l.phone)}?text=${encodeURIComponent(msg)}`}
              target='_blank'
              rel='noopener noreferrer'
              size='xs'
              bg='green.600'
              color='white'
              _hover={{ bg: 'green.700' }}
              leftIcon={<FaWhatsapp />}
              rounded='full'
            >
              WhatsApp
            </Button>
          )}
        </HStack>
        <HStack spacing={2}>
          <FiMail />
          {l.email ? (
            <CLink href={`mailto:${l.email}?subject=${encodeURIComponent('Seguimiento — Sayro Bienes Raíces')}&body=${encodeURIComponent(`Hola ${l.name || ''}, sobre ${l.property?.title || l.propertyPublicId || 'tu consulta'}:`)}`} color='blue.600'>
              {l.email}
            </CLink>
          ) : (
            <Text color='gray.500'>-</Text>
          )}
          <Spacer />
          {l.email && (
            <Button
              as='a'
              href={`mailto:${l.email}?subject=${encodeURIComponent('Seguimiento — Sayro Bienes Raíces')}&body=${encodeURIComponent(`Hola ${l.name || ''}, sobre ${l.property?.title || l.propertyPublicId || 'tu consulta'}:`)}`}
              size='xs'
              colorScheme='blue'
              variant='outline'
              leftIcon={<FiMail />}
              rounded='full'
            >
              Email
            </Button>
          )}
        </HStack>
        <HStack spacing={2}>
          <Text fontSize='sm' color='gray.600'>Propiedad:</Text>
          {l.property?.publicId || l.propertyPublicId ? (
            <Link href={`/propiedades/${l.property?.publicId || l.propertyPublicId}`} target='_blank'>
              {l.property?.title || l.propertyPublicId}
            </Link>
          ) : (<Text color='gray.500'>-</Text>)}
        </HStack>
        {(l.utm_source || l.utm_campaign) && (
          <Box fontSize='xs' color='gray.600'>
            {l.utm_source && <Badge mr={1}>{l.utm_source}</Badge>}
            {l.utm_campaign && <Badge mr={1} variant='outline'>{l.utm_campaign}</Badge>}
          </Box>
        )}
      </Stack>
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

  const badgeCount = showLeads ? (q ? aggregated.length : (total || 0)) : showEgo ? (egoTotal || 0) : (ebTotal || 0);

  return (
    <SWRConfig value={{ revalidateOnFocus: false, revalidateOnReconnect: false, dedupingInterval: 15000 }}>
    <Layout title='Leads'>
      <Container maxW='7xl' py={{ base: 6, md: 10 }}>
        <HStack mb={4} spacing={3} align='center'>
          <Heading size='lg'>Leads</Heading>
          <Badge colorScheme='gray' variant='subtle'>{badgeCount} total</Badge>
          <Spacer />
          <HStack>
            <Button size='sm' variant={source === '' ? 'solid' : 'outline'} onClick={() => setSource('')}>Todos</Button>
            <Button size='sm' variant={source === 'meta' ? 'solid' : 'outline'} onClick={() => setSource('meta')}>Meta</Button>
            <Button size='sm' variant={source === 'website' ? 'solid' : 'outline'} onClick={() => setSource('website')}>Website</Button>
            <Button size='sm' variant={source === 'easybroker' ? 'solid' : 'outline'} onClick={() => setSource('easybroker')}>EasyBroker</Button>
            <Button size='sm' variant={source === 'ego' ? 'solid' : 'outline'} onClick={() => setSource('ego')}>EGO</Button>
          </HStack>
          <InputGroup w={{ base: 'full', md: '320px' }}>
            <InputLeftElement pointerEvents='none'><SearchIcon color='gray.400' /></InputLeftElement>
            <Input placeholder='Buscar nombre, email, teléfono, mensaje' value={qInput} onChange={(e) => setQInput(e.target.value)} bg='white' />
          </InputGroup>
          <Button as={Link} href='/admin' variant='outline'>Volver</Button>
        </HStack>

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
          <EasyBrokerSection visible onTotal={(n) => setEbTotal(n)} />
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
