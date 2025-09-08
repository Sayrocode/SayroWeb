import type { GetServerSideProps } from 'next';
import { getIronSession } from 'iron-session';
import { AppSession, sessionOptions } from '../../lib/session';
import Layout from '../../components/Layout';
import useSWR from 'swr';
import { Box, Container, Heading, Tab, TabList, TabPanel, TabPanels, Tabs, Table, Thead, Tr, Th, Tbody, Td, Badge, Text, HStack, IconButton, Tooltip, Stack, Button, Link as CLink } from '@chakra-ui/react';
import { FaWhatsapp } from 'react-icons/fa';
import { FiMail, FiPhone } from 'react-icons/fi';
import Link from 'next/link';

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

function digitsOnly(s?: string | null) {
  if (!s) return '';
  const d = String(s).replace(/\D+/g, '');
  return d.startsWith('52') ? d : `52${d}`; // asume MX si no tiene código
}

function LeadsTable({ items }: { items: Lead[] }) {
  if (!items.length) return <Text color='gray.600'>Sin registros.</Text>;
  return (
    <Table size='sm' variant='simple'>
      <Thead>
        <Tr>
          <Th>Fecha</Th>
          <Th>Nombre</Th>
          <Th>Contacto</Th>
          <Th>Propiedad</Th>
          <Th>UTM</Th>
        </Tr>
      </Thead>
      <Tbody>
        {items.map((l) => (
          <Tr key={l.id}>
            <Td whiteSpace='nowrap'>{new Date(l.createdAt).toLocaleString()}</Td>
            <Td>{l.name || '-'}<Box color='gray.600' fontSize='xs'>{l.message?.slice(0,120)}</Box></Td>
            <Td>
              <Stack spacing={1} align='start'>
                <HStack spacing={2}>
                  <FiPhone />
                  <CLink href={`tel:${digitsOnly(l.phone || '')}`} color='green.700'>{l.phone || '-'}</CLink>
                  {l.phone && (<Box as={FaWhatsapp} color='whatsapp.500' fontSize='lg' aria-label='WhatsApp' />)}
                  {l.phone && (
                    <Button
                      as='a'
                      href={`https://wa.me/${digitsOnly(l.phone)}?text=${encodeURIComponent(`Hola ${l.name || ''}. Vi tu interés en ${l.property?.title || l.propertyPublicId || 'nuestra propiedad'}.`)}`}
                      target='_blank'
                      rel='noopener noreferrer'
                      size='xs'
                      colorScheme='whatsapp'
                      leftIcon={<FaWhatsapp />}
                      rounded='full'
                    >
                      WhatsApp
                    </Button>
                  )}
                </HStack>
                <HStack spacing={2}>
                  <FiMail />
                  <CLink href={l.email ? `mailto:${l.email}?subject=${encodeURIComponent('Seguimiento — Sayro Bienes Raíces')}&body=${encodeURIComponent(`Hola ${l.name || ''}, sobre ${l.property?.title || l.propertyPublicId || 'tu consulta'}:`)}` : '#'} color='blue.600'>
                    {l.email || '-'}
                  </CLink>
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
                <Badge variant='subtle' colorScheme={l.source === 'meta' ? 'purple' : 'gray'}>{l.source}</Badge>
              </Stack>
            </Td>
            <Td>
              {l.property?.publicId || l.propertyPublicId ? (
                <Link href={`/propiedades/${l.property?.publicId || l.propertyPublicId}`} target='_blank'>
                  {l.property?.title || l.propertyPublicId}
                </Link>
              ) : (
                '-'
              )}
            </Td>
            <Td>
              <Box fontSize='xs' color='gray.600'>
                {l.utm_source && <Badge mr={1}>{l.utm_source}</Badge>}
                {l.utm_campaign && <Badge mr={1} variant='outline'>{l.utm_campaign}</Badge>}
              </Box>
            </Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
}

export default function LeadsPage() {
  const { data } = useSWR('/api/admin/leads', fetcher);
  const items: Lead[] = data?.items || [];
  const metaLeads = items.filter((l) => l.source === 'meta');
  const websiteLeads = items.filter((l) => l.source !== 'meta');

  const { data: eb } = useSWR('/api/admin/easybroker/contacts', fetcher);
  const ebItems: any[] = eb?.items || [];

  return (
    <Layout title='Leads'>
      <Container maxW='7xl' py={{ base: 6, md: 10 }}>
        <Heading mb={4}>Leads</Heading>
        <Tabs colorScheme='green'>
          <TabList>
            <Tab>Meta</Tab>
            <Tab>Website</Tab>
            <Tab>EasyBroker</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>
              <LeadsTable items={metaLeads} />
            </TabPanel>
            <TabPanel>
              <LeadsTable items={websiteLeads} />
            </TabPanel>
            <TabPanel>
              {!ebItems.length ? (
                <Text color='gray.600'>Conecta EASYBROKER_API_KEY para cargar contactos.</Text>
              ) : (
                <Table size='sm'>
                  <Thead><Tr><Th>Nombre</Th><Th>Contacto</Th><Th>Notas</Th></Tr></Thead>
                  <Tbody>
                    {ebItems.slice(0,200).map((c: any, i: number) => (
                      <Tr key={i}>
                        <Td>{c.name || c.full_name || '-'}</Td>
                        <Td>
                          <Stack spacing={1} align='start'>
                            <HStack spacing={2}>
                              <FiPhone />
                              <CLink href={`tel:${digitsOnly(c.phone || '')}`} color='green.700'>{c.phone || '-'}</CLink>
                              {c.phone && (<Box as={FaWhatsapp} color='whatsapp.500' fontSize='lg' aria-label='WhatsApp' />)}
                              {c.phone && (
                                <Button as='a' href={`https://wa.me/${digitsOnly(c.phone)}?text=${encodeURIComponent(`Hola ${c.name || ''}. Te contacto de Sayro Bienes Raíces.`)}`} target='_blank' rel='noopener noreferrer' size='xs' colorScheme='whatsapp' leftIcon={<FaWhatsapp />} rounded='full'>WhatsApp</Button>
                              )}
                            </HStack>
                            <HStack spacing={2}>
                              <FiMail />
                              <CLink href={c.email ? `mailto:${c.email}?subject=${encodeURIComponent('Seguimiento — Sayro Bienes Raíces')}` : '#'} color='blue.600'>
                                {c.email || '-'}
                              </CLink>
                              {c.email && (
                                <Button as='a' href={`mailto:${c.email}?subject=${encodeURIComponent('Seguimiento — Sayro Bienes Raíces')}`} size='xs' colorScheme='blue' variant='outline' leftIcon={<FiMail />} rounded='full'>Email</Button>
                              )}
                            </HStack>
                          </Stack>
                        </Td>
                        <Td>{c.notes || '-'}</Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              )}
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Container>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ req, res }) => {
  const session = await getIronSession<AppSession>(req, res, sessionOptions);
  if (!session.user) return { redirect: { destination: '/admin/login', permanent: false } };
  return { props: {} };
};
