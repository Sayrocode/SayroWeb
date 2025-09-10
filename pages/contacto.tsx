import Layout from 'components/Layout';
import { Box, Container, Heading, Text, Stack, Input, Textarea, Button } from '@chakra-ui/react';

export default function ContactoPage() {
  return (
    <Layout title='Contacto'>
      <Container maxW='lg' py={{ base: 10, md: 14 }}>
        <Heading mb={2}>Contáctanos</Heading>
        <Text mb={6} color='gray.600'>Déjanos tus datos y te contactamos.</Text>
        <Box as='form'>
          <Stack spacing={3}>
            <Input placeholder='Nombre' />
            <Input placeholder='Teléfono' />
            <Input placeholder='Email' type='email' />
            <Textarea placeholder='Mensaje' rows={4} />
            <Button colorScheme='green'>Enviar</Button>
          </Stack>
        </Box>
      </Container>
    </Layout>
  );
}

export async function getServerSideProps() { return { props: {} }; }
