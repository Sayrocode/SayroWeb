import Layout from 'components/Layout';
import { Box, Container, Heading, Text, Image, SimpleGrid, Stack } from '@chakra-ui/react';

export default function NosotrosPage() {
  return (
    <Layout title='Nosotros'>
      <Box bg='gray.900' color='white'>
        <Container maxW='7xl' py={{ base: 14, md: 16 }}>
          <Heading textTransform='uppercase'>Sobre nosotros</Heading>
          <Text mt={2} color='whiteAlpha.900'>Más de 30 años asesorando con confianza y resultados en Querétaro.</Text>
        </Container>
      </Box>
      <Box py={{ base: 10, md: 14 }}>
        <Container maxW='7xl'>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={8} alignItems='center'>
            <Stack spacing={3} color='gray.700'>
              <Heading size='lg'>Compromiso y resultados</Heading>
              <Text>Garantizamos el mejor precio, con rapidez y seguridad.</Text>
              <Text>Nos especializamos en venta y renta en Querétaro.</Text>
            </Stack>
            <Image src='/about.png' alt='Nosotros' rounded='md' shadow='md' />
          </SimpleGrid>
        </Container>
      </Box>
    </Layout>
  );
}

export async function getServerSideProps() { return { props: {} }; }
