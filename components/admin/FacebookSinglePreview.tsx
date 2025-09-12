import { AspectRatio, Box, Button, HStack, Text } from '@chakra-ui/react';
import Image from 'next/image';

export default function FacebookSinglePreview({ spec }: { spec: any }) {
  const linkData = spec?.link_data || {};
  const image = linkData.image_url || null;
  return (
    <Box borderWidth='1px' rounded='md' bg='white' color='gray.800' maxW='480px' overflow='hidden'>
      <Box p={3} borderBottomWidth='1px'>
        <HStack spacing={2}>
          <Box boxSize='28px' bg='gray.200' rounded='full' />
          <Box>
            <Text fontWeight='semibold'>Sayro Bienes Raíces</Text>
            <Text fontSize='xs' color='gray.500'>Patrocinado · Facebook</Text>
          </Box>
        </HStack>
        {linkData.message && <Text mt={3}>{linkData.message}</Text>}
      </Box>
      {image && (
        <Box>
          <AspectRatio ratio={1200/628}>
            <Image src={image} alt={linkData.name || 'Anuncio'} fill style={{ objectFit: 'cover' }} />
          </AspectRatio>
        </Box>
      )}
      <HStack p={3} spacing={3} align='stretch' borderTopWidth='1px'>
        <Box flex='1'>
          <Text fontSize='xs' color='gray.500'>sayro.mx</Text>
          <Text fontWeight='bold' noOfLines={1}>{linkData.name}</Text>
          <Text fontSize='sm' color='gray.600' noOfLines={1}>{linkData.description}</Text>
        </Box>
        <Box alignSelf='center'>
          <Button size='sm' colorScheme='blue' variant='outline'>Más información</Button>
        </Box>
      </HStack>
    </Box>
  );
}

