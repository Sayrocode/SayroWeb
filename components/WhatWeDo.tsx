import { Box, Container, Heading, SimpleGrid, Text, Image, HStack, Link, Icon } from '@chakra-ui/react';
import { FaFacebookF, FaInstagram } from 'react-icons/fa';

type Props = {
  imageSrc?: string;
  instagramUrl?: string;
  facebookUrl?: string;
};

export default function WhatWeDo({ imageSrc = '/know.png', instagramUrl, facebookUrl }: Props) {
  return (
    <Box py={{ base: 10, md: 14 }} bg='gray.50'>
      <Container maxW='7xl'>
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={8} alignItems='center'>
          <Box>
            <Heading size='lg' mb={4}>Qué hacemos</Heading>
            <Text color='gray.700' mb={4}>Venta, renta y asesoría inmobiliaria con atención personalizada y procesos claros.</Text>
            <HStack spacing={4}>
              {facebookUrl && (
                <Link href={facebookUrl} isExternal color='blue.600' display='inline-flex' alignItems='center'>
                  <Icon as={FaFacebookF} mr={1} /> Facebook
                </Link>
              )}
              {instagramUrl && (
                <Link href={instagramUrl} isExternal color='pink.600' display='inline-flex' alignItems='center'>
                  <Icon as={FaInstagram} mr={1} /> Instagram
                </Link>
              )}
            </HStack>
          </Box>
          <Box>
            <Image src={imageSrc} alt='Qué hacemos' rounded='md' shadow='sm' width='100%' height='auto' />
          </Box>
        </SimpleGrid>
      </Container>
    </Box>
  );
}
