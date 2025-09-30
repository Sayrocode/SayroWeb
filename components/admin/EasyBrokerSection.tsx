import React from 'react';
import useSWR from 'swr';
import { Box, Button, Heading, HStack, Link as CLink, SimpleGrid, Spacer, Stack, Text, useToast, Badge } from '@chakra-ui/react';
import { FiMail, FiPhone, FiCopy } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import { PHONE_CALL_SCHEME } from '../../lib/site';

type Props = {
  visible: boolean;
  q?: string;
  onTotal?: (n: number) => void;
  defaultMode?: 'contacts' | 'requests';
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function digitsOnly(s?: string | null) {
  if (!s) return '';
  const d = String(s).replace(/\D+/g, '');
  return d.startsWith('52') ? d : `52${d}`;
}

export default function EasyBrokerSection({ visible, q, onTotal, defaultMode }: Props) {
  const [mode, setMode] = React.useState<'contacts' | 'requests'>(defaultMode || 'contacts');
  React.useEffect(() => { if (defaultMode) setMode(defaultMode); }, [defaultMode]);
  const url = !visible ? null : (mode === 'contacts' ? '/api/admin/easybroker/contacts' : '/api/admin/easybroker/contact-requests');
  const { data: eb } = useSWR(url, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 30000,
    shouldRetryOnError: false,
  });
  const ebItems: any[] = eb?.items || [];
  const normQ = (q || '').trim().toLowerCase();
  const filtered: any[] = normQ
    ? ebItems.filter((c: any) => {
        const hay = [
          c?.name,
          c?.full_name,
          c?.email,
          c?.phone,
          c?.notes,
          c?.message,
        ]
          .filter(Boolean)
          .map((s: any) => String(s).toLowerCase());
        return hay.some((s: string) => s.includes(normQ));
      })
    : ebItems;
  React.useEffect(() => { if (typeof onTotal === 'function') onTotal(filtered?.length || 0); }, [filtered?.length, onTotal]);

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

  return (
    <>
      <HStack mt={12} mb={3} spacing={3} align='center'>
        <Heading size='lg'>EasyBroker</Heading>
        <Spacer />
        <HStack spacing={2}>
          <Button size='sm' variant={mode === 'contacts' ? 'solid' : 'outline'} onClick={() => setMode('contacts')}>Contactos</Button>
          <Button size='sm' variant={mode === 'requests' ? 'solid' : 'outline'} onClick={() => setMode('requests')}>Contact Requests</Button>
        </HStack>
      </HStack>
      {ebItems.length === 0 ? (
        <Text color='gray.600'>Conecta EASYBROKER_API_KEY para cargar contactos.</Text>
      ) : filtered.length === 0 ? (
        <Text color='gray.600'>No hay contactos que coincidan con la búsqueda.</Text>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={5}>
          {filtered.slice(0, 180).map((c: any, i: number) => (
            <Box key={i} borderWidth='1px' rounded='lg' bg='white' p={4}>
              <Heading as='h3' size='md' mb={2}>{c.name || c.full_name || '-'}</Heading>
              <Stack spacing={1} color='gray.700'>
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
                {mode === 'requests' ? (
                  <>
                    {c.message && <Text color='gray.700' fontSize='sm'>{c.message}</Text>}
                    {(c.created_at || c.createdAt) && (
                      <Text color='gray.600' fontSize='sm'>
                        {new Date(c.created_at || c.createdAt).toLocaleString?.() || String(c.created_at || c.createdAt)}
                      </Text>
                    )}
                    {(c.property_public_id || c.property_id || c.property?.public_id) && (
                      <Text color='gray.600' fontSize='sm'>Propiedad: {c.property_public_id || c.property_id || c.property?.public_id}</Text>
                    )}
                  </>
                ) : (
                  c.notes && <Text color='gray.600' fontSize='sm'>{c.notes}</Text>
                )}
              </Stack>
            </Box>
          ))}
        </SimpleGrid>
      )}
    </>
  );
}
