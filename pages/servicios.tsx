import Layout from 'components/Layout';
import { Box, Container, Heading, Text, SimpleGrid, Stack } from '@chakra-ui/react';

export default function ServiciosPage() {
  return (
    <Layout title='Servicios'>
      <Box bg='gray.900' color='white'>
        <Container maxW='7xl' py={{ base: 14, md: 16 }}>
          <Heading textTransform='uppercase'>Servicios</Heading>
          <Text mt={2} color='whiteAlpha.900'>Venta, renta y asesoría con atención personalizada.</Text>
        </Container>
      </Box>
      <Container maxW='7xl' py={{ base: 10, md: 14 }}>
        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
          <Stack borderWidth='1px' rounded='md' p={5}>
            <Heading size='md'>Venta</Heading>
            <Text color='gray.700'>Acompañamiento en todo el proceso para vender.</Text>
          </Stack>
          <Stack borderWidth='1px' rounded='md' p={5}>
            <Heading size='md'>Renta</Heading>
            <Text color='gray.700'>Encontramos al inquilino ideal.</Text>
          </Stack>
          <Stack borderWidth='1px' rounded='md' p={5}>
            <Heading size='md'>Asesoría</Heading>
            <Text color='gray.700'>Te ayudamos a decidir con información.</Text>
          </Stack>
        </SimpleGrid>
      </Container>
    </Layout>
  );
}

export async function getServerSideProps() { return { props: {} }; }
