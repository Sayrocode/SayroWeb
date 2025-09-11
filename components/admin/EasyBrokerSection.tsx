import React from 'react';
import useSWR from 'swr';
import { Box, Heading, HStack, Link as CLink, SimpleGrid, Spacer, Stack, Text } from '@chakra-ui/react';
import { FiMail, FiPhone } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';

type Props = {
  visible: boolean;
  onTotal?: (n: number) => void;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function digitsOnly(s?: string | null) {
  if (!s) return '';
  const d = String(s).replace(/\D+/g, '');
  return d.startsWith('52') ? d : `52${d}`;
}

export default function EasyBrokerSection({ visible, onTotal }: Props) {
  const { data: eb } = useSWR(visible ? '/api/admin/easybroker/contacts' : null, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 30000,
    shouldRetryOnError: false,
  });
  const ebItems: any[] = eb?.items || [];
  React.useEffect(() => { if (typeof onTotal === 'function') onTotal(ebItems?.length || 0); }, [ebItems?.length, onTotal]);

  return (
    <>
      <Heading size='lg' mt={12} mb={3}>EasyBroker</Heading>
      {!ebItems.length ? (
        <Text color='gray.600'>Conecta EASYBROKER_API_KEY para cargar contactos.</Text>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={5}>
          {ebItems.slice(0, 180).map((c: any, i: number) => (
            <Box key={i} borderWidth='1px' rounded='lg' bg='white' p={4}>
              <Heading as='h3' size='md' mb={2}>{c.name || c.full_name || '-'}</Heading>
              <Stack spacing={1} color='gray.700'>
                <HStack>
                  <FiPhone />
                  <CLink href={`tel:${digitsOnly(c.phone || '')}`} color='green.700'>{c.phone || '-'}</CLink>
                  <Spacer />
                  {c.phone && (
                    <CLink as='a' href={`https://wa.me/${digitsOnly(c.phone)}?text=${encodeURIComponent(`Hola ${c.name || ''}. Te contacto de Sayro Bienes Raíces.`)}`} target='_blank' rel='noopener noreferrer' color='green.600'>
                      <FaWhatsapp />
                    </CLink>
                  )}
                </HStack>
                <HStack>
                  <FiMail />
                  <CLink href={c.email ? `mailto:${c.email}?subject=${encodeURIComponent('Seguimiento — Sayro Bienes Raíces')}` : '#'} color='blue.600'>
                    {c.email || '-'}
                  </CLink>
                </HStack>
                {c.notes && <Text color='gray.600' fontSize='sm'>{c.notes}</Text>}
              </Stack>
            </Box>
          ))}
        </SimpleGrid>
      )}
    </>
  );
}

