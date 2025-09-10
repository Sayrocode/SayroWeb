// Minimal FB landing page fallback using property by id
import type { GetServerSideProps } from 'next';
import Layout from 'components/Layout';
import { Box, Container, Heading, AspectRatio, Image as ChakraImage, HStack, Text, Button } from '@chakra-ui/react';

type PageProps = { property: any | null };

export default function FbLanding({ property }: PageProps) {
  if (!property) {
    return (
      <Layout title='Propiedad no disponible'>
        <Container py={16}><Heading size='lg'>Propiedad no disponible</Heading></Container>
      </Layout>
    );
  }
  const title = property.title || `Propiedad ${property.public_id}`;
  const cover = property.title_image_full || property.title_image_thumb || '/image3.jpg';
  return (
    <Layout title={title}>
      <Box bg='#0E3B30' color='white'>
        <Container maxW='7xl' py={{ base: 8, md: 12 }}>
          <HStack align='start' spacing={{ base: 6, md: 10 }}>
            <Box flex='1'>
              <AspectRatio ratio={16/9} rounded='lg' overflow='hidden'>
                <ChakraImage src={cover} alt={title} objectFit='cover' />
              </AspectRatio>
              <Heading mt={4} size='lg'>{title}</Heading>
              <HStack mt={2} spacing={4} color='whiteAlpha.900'>
                <Text>{property.property_type}</Text>
                <Text>ID {property.public_id}</Text>
              </HStack>
            </Box>
            <Box flex='1' bg='white' color='gray.800' rounded='lg' p={6}>
              <Heading as='h2' size='md' mb={2}>Quiero más información</Heading>
              <Text fontSize='sm' color='gray.600' mb={4}>Déjanos tus datos y te contactamos hoy.</Text>
              <Button as='a' href={`/propiedades/${property.public_id}`} colorScheme='green'>Ver en sitio</Button>
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
