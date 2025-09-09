import type { GetServerSideProps } from 'next';
import { getIronSession } from 'iron-session';
import { AppSession, sessionOptions } from '../../../src/lib/session';
import Layout from '../../../src/components/Layout';
import useSWR from 'swr';
import { Box, Container, Heading, Tab, TabList, TabPanel, TabPanels, Tabs, Table, Thead, Tr, Th, Tbody, Td, Badge, Text, HStack, Button, Link as CLink, Spacer } from '@chakra-ui/react';
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
              <HStack spacing={2} align='center'>
                <FiPhone />
                <CLink href={`tel:${digitsOnly(l.phone || '')}`} color='green.700'>{l.phone || '-'}</CLink>
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
              <HStack spacing={2} mt={1} align='center'>
                <FiMail />
                <CLink href={l.email ? `mailto:${l.email}?subject=${encodeURIComponent('Seguimiento — Sayro Bienes Raíces')}&body=${encodeURIComponent(`Hola ${l.name || ''}, sobre ${l.property?.title || l.propertyPublicId || 'tu consulta'}:`)}` : '#'} color='blue.600'>
                  {l.email || '-'}
                </CLink>
              </HStack>
              <Badge mt={1} variant='subtle' colorScheme={l.source === 'meta' ? 'purple' : 'gray'}>{l.source}</Badge>
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

  // EgoRealEstate contacts (solo lectura, sin importar en Vercel)
  type EgoC = { id: number; name?: string | null; phone?: string | null; email?: string | null; createdText?: string | null; responsible?: string | null; personId?: string | null };
  const { data: ego } = useSWR('/api/admin/egocontacts?take=100', fetcher);
  const egoItems: EgoC[] = ego?.items || [];

  return (
    <Layout title='Leads'>
      <Container maxW='7xl' py={{ base: 6, md: 10 }}>
        <Heading mb={4}>Leads</Heading>
        <Tabs colorScheme='green'>
          <TabList>
            <Tab>Meta</Tab>
            <Tab>Website</Tab>
            <Tab>EgoRealEstate</Tab>
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
              <HStack mb={3}>
                <Heading size='md'>Contactos EGO</Heading>
                <Badge variant='subtle'>{ego?.total ?? 0} total</Badge>
                <Spacer />
                {/* Botón de importar deshabilitado para despliegue sin scrapers */}
              </HStack>
              {egoItems.length === 0 ? (
                <Text color='gray.600'>No hay contactos aún.</Text>
              ) : (
                <Table size='sm' variant='simple'>
                  <Thead>
                    <Tr>
                      <Th>Nombre</Th>
                      <Th>Contacto</Th>
                      <Th>Creada</Th>
                      <Th>Responsable</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {egoItems.map((c) => (
                      <Tr key={c.id}>
                        <Td>{c.name || '-'}</Td>
                        <Td>
                          <HStack spacing={2} align='center'>
                            <CLink href={c.phone ? `tel:${c.phone}` : '#'} color='green.700'>{c.phone || '-'}</CLink>
                            <CLink href={c.email ? `mailto:${c.email}` : '#'} color='blue.600'>{c.email || '-'}</CLink>
                          </HStack>
                        </Td>
                        <Td>{c.createdText || '-'}</Td>
                        <Td>{c.responsible || '-'}</Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              )}
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
                          <HStack spacing={2} align='center'>
                            <FiPhone />
                            <CLink href={`tel:${digitsOnly(c.phone || '')}`} color='green.700'>{c.phone || '-'}</CLink>
                            {c.phone && (
                              <Button as='a' href={`https://wa.me/${digitsOnly(c.phone)}?text=${encodeURIComponent(`Hola ${c.name || ''}. Te contacto de Sayro Bienes Raíces.`)}`} target='_blank' rel='noopener noreferrer' size='xs' colorScheme='whatsapp' leftIcon={<FaWhatsapp />} rounded='full'>WhatsApp</Button>
                            )}
                          </HStack>
                          <HStack spacing={2} mt={1} align='center'>
                            <FiMail />
                            <CLink href={c.email ? `mailto:${c.email}?subject=${encodeURIComponent('Seguimiento — Sayro Bienes Raíces')}` : '#'} color='blue.600'>
                              {c.email || '-'}
                            </CLink>
                          </HStack>
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

