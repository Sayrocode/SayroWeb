import Head from 'next/head';
import Layout from 'components/Layout';
import { Box, Container, Heading, Text, AspectRatio, HStack, Button } from '@chakra-ui/react';
import Image from 'next/image';
import type { GetServerSideProps } from 'next';

type PageProps = { property: any | null };

export default function PropertyDetail({ property }: PageProps) {
  if (!property) {
    return (
      <Layout title='Propiedad no disponible'>
        <Container py={16}><Heading size='lg'>Propiedad no disponible</Heading></Container>
      </Layout>
    );
  }
  const cover = property?.title_image_full || property?.title_image_thumb || '/image3.jpg';
  const title = property?.title || `Propiedad ${property?.public_id}`;
  const desc = `${property?.property_type || 'Propiedad'} — ${property?.public_id}`;
  return (
    <Layout title={title}>
      <Head>
        <title>{title}</title>
        <meta name='description' content={desc} />
      </Head>
      <Box bg='#0E3B30' color='white'>
        <Container maxW='7xl' py={{ base: 8, md: 12 }}>
          <HStack align='start' spacing={{ base: 6, md: 10 }}>
            <Box flex='1'>
              <AspectRatio ratio={16/9} rounded='lg' overflow='hidden'>
                <Box position='relative'>
                  <Image src={cover} alt={title} fill sizes='100vw' style={{ objectFit: 'cover' }} />
                </Box>
              </AspectRatio>
              <Heading mt={4} size='lg'>{title}</Heading>
              <HStack mt={2} spacing={4} color='whiteAlpha.900'>
                <Text>{property.property_type}</Text>
                <Text>ID {property.public_id}</Text>
              </HStack>
            </Box>
            <Box flex='1' bg='white' color='gray.800' rounded='lg' p={6}>
              <Heading as='h2' size='md' mb={2}>Contáctanos</Heading>
              <Text fontSize='sm' color='gray.600' mb={4}>Déjanos tus datos y te contactamos hoy.</Text>
              <Button as='a' href={`/contacto`} colorScheme='green'>Quiero información</Button>
            </Box>
          </HStack>
        </Container>
      </Box>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps<PageProps> = async (ctx) => {
  const { id } = ctx.query as { id: string };
  const proto = (ctx.req.headers['x-forwarded-proto'] as string) || (process.env.NODE_ENV === 'production' ? 'https' : 'http');
  const base = `${proto}://${ctx.req.headers.host}`;
  try {
    const r = await fetch(`${base}/api/properties/${encodeURIComponent(id)}`);
    if (!r.ok) return { props: { property: null } };
    const property = await r.json();
    return { props: { property } };
  } catch {
    return { props: { property: null } };
  }
};
