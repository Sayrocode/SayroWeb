import React from 'react';
import useSWRInfinite from 'swr/infinite';
import {
  Badge,
  Box,
  Button,
  Heading,
  HStack,
  Link as CLink,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  SimpleGrid,
  Spacer,
  Stack,
  Text,
  useDisclosure,
  useToast,
} from '@chakra-ui/react';
import { FiMail, FiPhone, FiCopy } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import { PHONE_CALL_SCHEME } from '../../lib/site';

type Props = {
  q: string;
  visible: boolean;
  onTotal?: (n: number) => void;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function digitsOnly(s?: string | null) {
  if (!s) return '';
  const d = String(s).replace(/\D+/g, '');
  return d.startsWith('52') ? d : `52${d}`;
}

function CallMenu({ phone }: { phone?: string | null }) {
  const toast = useToast();
  if (!phone) return null;
  const digits = digitsOnly(phone);
  const primaryHref = `${PHONE_CALL_SCHEME}:${digits}`;
  return (
    <HStack spacing={2}>
      <Button as='a' href={primaryHref} size='xs' colorScheme='green' rounded='full'>Llamar</Button>
      <Button
        onClick={async () => {
          try { await navigator.clipboard.writeText(phone); toast({ title: 'Copiado', status: 'success', duration: 1500 }); }
          catch { toast({ title: 'No se pudo copiar', status: 'error', duration: 1500 }); }
        }}
        size='xs'
        variant='outline'
        leftIcon={<FiCopy />}
        rounded='full'
      >Copiar</Button>
    </HStack>
  );
}

export default function EgoSection({ q, visible, onTotal }: Props) {
  const [pendingMore, setPendingMore] = React.useState(false);
  const toast = useToast();
  const [pushState, setPushState] = React.useState<Record<number, 'idle'|'loading'|'done'>>({});
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [previewPayload, setPreviewPayload] = React.useState<{ id: number; payload: Record<string, any> } | null>(null);
  const EGO_PAGE_SIZE = 30;
  const getEgoKey = (index: number) => (visible)
    ? `/api/admin/egocontacts?take=${EGO_PAGE_SIZE}&page=${index + 1}${q ? `&q=${encodeURIComponent(q)}` : ''}`
    : null;
  const { data: egoData, size: egoSize, setSize: setEgoSize, isLoading: egoLoading, mutate: mutateEgo } = useSWRInfinite(
    getEgoKey,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 30000,
      persistSize: true,
      revalidateFirstPage: false,
    }
  );
  const egoPages = egoData || [];
  const egoTotal: number = egoPages.length ? (egoPages[0]?.total ?? 0) : 0;
  const egoItems: any[] = egoPages.flatMap((p: any) => Array.isArray(p?.items) ? p.items : []);
  const egoLastCount = egoPages.length ? (egoPages[egoPages.length - 1]?.items?.length || 0) : 0;
  const egoEnd = (egoLastCount < EGO_PAGE_SIZE) || (egoTotal > 0 && egoItems.length >= egoTotal);
  const egoLoaderRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => { if (typeof onTotal === 'function') onTotal(egoTotal || 0); }, [egoTotal, onTotal]);

  // Reset pagination when query changes
  React.useEffect(() => { setEgoSize(1); }, [q, setEgoSize]);

  // Avoid re-creating observer each render; use refs for dynamic flags
  const egoLoadingRef = React.useRef(egoLoading);
  const egoEndRef = React.useRef(egoEnd);
  React.useEffect(() => { egoLoadingRef.current = egoLoading; }, [egoLoading]);
  React.useEffect(() => { egoEndRef.current = egoEnd; }, [egoEnd]);
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
    if (!visible) return;
    const el = egoLoaderRef.current;
    if (!el) return;
    const ob = new IntersectionObserver((entries) => {
      const e = entries[0];
      if (e.isIntersecting && !egoLoadingRef.current && !egoEndRef.current && scrollingDownRef.current) {
        setPendingMore(true);
        React.startTransition(() => { void setEgoSize((s) => s + 1); });
      }
    }, { root: null, rootMargin: '800px 0px', threshold: 0 });
    ob.observe(el);
    return () => ob.disconnect();
  }, [visible, setEgoSize]);
  React.useEffect(() => { if (!egoLoading) setPendingMore(false); }, [egoLoading]);

  const buildPayload = (contact: any) => {
    const extras: string[] = [];
    if (contact?.personId) extras.push(`ID persona: ${contact.personId}`);
    if (contact?.responsible) extras.push(`Responsable: ${contact.responsible}`);
    if (contact?.role) extras.push(`Rol: ${contact.role}`);
    if (contact?.createdText) extras.push(`Creada: ${contact.createdText}`);
    const baseMessage = String(contact?.notes || contact?.message || '').trim();
    const messageLines = [
      '[EGO] Contacto importado desde Ego Real Estate.',
      baseMessage,
      extras.join(' | '),
    ].filter(Boolean);
    const message = messageLines.join('\n');
    return {
      name: contact?.name || undefined,
      phone: contact?.phone || undefined,
      email: contact?.email || undefined,
      message,
      source: 'egoRealEstate',
    };
  };

  const confirmPush = React.useCallback((contact: any) => {
    const id = contact?.id;
    if (!id) return;
    const payload = buildPayload(contact);
    setPreviewPayload({ id, payload });
    onOpen();
  }, [onOpen]);

  const pushToEasyBroker = React.useCallback(async (contact: any) => {
    const id = contact?.id;
    if (!id) return;
    setPushState((prev) => ({ ...prev, [id]: 'loading' }));
    const payload = buildPayload(contact);
    try {
      const resp = await fetch('/api/admin/easybroker/contact-requests', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) {
        const info = await resp.json().catch(() => ({}));
        throw new Error(info?.error || `status_${resp.status}`);
      }
      setPushState((prev) => ({ ...prev, [id]: 'done' }));
      toast({ title: 'Enviado a EasyBroker', status: 'success', duration: 2000 });
    } catch (error: any) {
      console.warn('pushToEasyBroker', error);
      setPushState((prev) => ({ ...prev, [id]: 'idle' }));
      toast({ title: 'No se pudo enviar a EasyBroker', description: error?.message || 'Error desconocido', status: 'error', duration: 3500 });
    }
  }, [toast]);

  return (
    <>
      <Heading size='lg' mt={12} mb={3}>Contactos EGO</Heading>
      <HStack mb={4}>
        <Badge variant='subtle'>{egoTotal || 0} total</Badge>
        <Spacer />
      </HStack>
      {egoItems.length === 0 ? (
        <Text color='gray.600'>No hay contactos aún.</Text>
      ) : (
        <>
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={5}>
            {egoItems.map((c: any) => (
              <Box key={c.id} borderWidth='1px' rounded='lg' bg='white' p={4}>
                <Heading as='h3' size='md' mb={2}>{c.name || 'Sin nombre'}</Heading>
                <Stack spacing={1} color='gray.700'>
                  {c.role && <Text><b>Rol:</b> {c.role}</Text>}
                  <Stack direction={{ base: 'column', sm: 'row' }} spacing={2} align={{ base: 'stretch', sm: 'center' }}>
                    <FiPhone />
                    <CLink href={c.phone ? `tel:${digitsOnly(c.phone)}` : '#'} color='green.700' wordBreak='break-word'>
                      {c.phone || '-'}
                    </CLink>
                    <Spacer display={{ base: 'none', sm: 'block' }} />
                    <HStack spacing={2}>
                      <CallMenu phone={c.phone} />
                      {c.phone && (
                        <Button as='a' href={`https://wa.me/${digitsOnly(c.phone)}?text=${encodeURIComponent(`Hola ${c.name || ''}. Te contacto de Sayro Bienes Raíces.`)}`} target='_blank' rel='noopener noreferrer' size={{ base: 'sm', md: 'xs' }} w={{ base: 'full', sm: 'auto' }} bgColor={'green.400'} leftIcon={<FaWhatsapp />} rounded='full'>
                          WhatsApp
                        </Button>
                      )}
                    </HStack>
                  </Stack>
                  <Stack direction={{ base: 'column', sm: 'row' }} spacing={2} align={{ base: 'stretch', sm: 'center' }}>
                    <FiMail />
                    <CLink href={c.email ? `mailto:${c.email}?subject=${encodeURIComponent('Seguimiento — Sayro Bienes Raíces')}` : '#'} color='blue.600'>
                      {c.email || '-'}
                    </CLink>
                  </Stack>
                  {c.createdText && <Text><b>Creada:</b> {c.createdText}</Text>}
                  {c.responsible && <Text><b>Responsable:</b> {c.responsible}</Text>}
                  {c.personId && <Text><b>Persona ID:</b> {c.personId}</Text>}
                </Stack>
                <Button
                  mt={4}
                  colorScheme='green'
                  variant={pushState[c.id] === 'done' ? 'outline' : 'solid'}
                  onClick={() => confirmPush(c)}
                  isLoading={pushState[c.id] === 'loading'}
                  isDisabled={pushState[c.id] === 'done'}
                >
                  {pushState[c.id] === 'done' ? 'Agregado a EasyBroker' : 'Agregar a EasyBroker'}
                </Button>
              </Box>
            ))}
          </SimpleGrid>
          <Box ref={egoLoaderRef} h='1px' />
          {(!egoEnd && (pendingMore || egoLoading)) && (
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
          {!egoEnd && !egoLoading && !pendingMore && (
            <Box textAlign='center' mt={6}>
              <Button onClick={() => setEgoSize(egoSize + 1)} variant='outline'>Cargar más</Button>
            </Box>
          )}
        </>
      )}

      <Modal isOpen={isOpen} onClose={() => { setPreviewPayload(null); onClose(); }} isCentered size='lg'>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Confirmar envío a EasyBroker</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {previewPayload ? (
              <Stack spacing={3} fontSize='sm'>
                <Text>Así se enviará la información:</Text>
                <Box bg='gray.50' borderWidth='1px' rounded='md' p={3} fontFamily='mono'>
                  {JSON.stringify(previewPayload.payload, null, 2)}
                </Box>
              </Stack>
            ) : (
              <Text>Cargando…</Text>
            )}
          </ModalBody>
          <ModalFooter>
            <HStack spacing={3}>
              <Button variant='ghost' onClick={() => { setPreviewPayload(null); onClose(); }}>Cancelar</Button>
              <Button colorScheme='green' onClick={() => {
                if (!previewPayload) return;
                const contact = egoItems.find((c: any) => c.id === previewPayload.id);
                if (contact) {
                  onClose();
                  void pushToEasyBroker(contact);
                }
              }}>Enviar a EasyBroker</Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
