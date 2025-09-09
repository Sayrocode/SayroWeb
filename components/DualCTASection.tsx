import { Box, Container, Heading, Text, Button, HStack } from '@chakra-ui/react';
import NextLink from 'next/link';

export default function DualCTASection() {
  return (
    <Box bg='green.700' color='white' py={{ base: 10, md: 14 }}>
      <Container maxW='7xl'>
        <Heading size='lg' mb={3}>¿Listo para empezar?</Heading>
        <Text mb={5} color='whiteAlpha.800'>Publica tu propiedad o contáctanos para una asesoría.</Text>
        <HStack spacing={4}>
          <Button as={NextLink} href='/anunciate' colorScheme='whiteAlpha' variant='solid'>Anunciar propiedad</Button>
          <Button as={NextLink} href='/contacto' colorScheme='whiteAlpha' variant='outline'>Contactar</Button>
        </HStack>
      </Container>
    </Box>
  );
}

