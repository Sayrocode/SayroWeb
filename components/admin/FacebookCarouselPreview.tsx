import { AspectRatio, Box, HStack, Text } from '@chakra-ui/react';
import Image from 'next/image';

export default function FacebookCarouselPreview({ spec }: { spec: any }) {
  const car = spec?.carousel_data || {};
  const children = Array.isArray(car.child_attachments) ? car.child_attachments : [];
  return (
    <Box borderWidth='1px' rounded='md' bg='white' color='gray.800' maxW='520px' overflow='hidden'>
      <Box p={3} borderBottomWidth='1px'>
        <HStack spacing={2}>
          <Box boxSize='28px' bg='gray.200' rounded='full' />
          <Box>
            <Text fontWeight='semibold'>Sayro Bienes Raíces</Text>
            <Text fontSize='xs' color='gray.500'>Patrocinado · Facebook</Text>
          </Box>
        </HStack>
        {car.message && <Text mt={3}>{car.message}</Text>}
      </Box>
      <Box p={3}>
        <HStack spacing={3} overflowX='auto'>
          {children.map((c: any, i: number) => (
            <Box key={i} minW='180px' maxW='180px' borderWidth='1px' rounded='md' overflow='hidden'>
              <AspectRatio ratio={1}>
                <Image src={c.image_url || '/image3.jpg'} alt={c.name || 'card'} fill style={{ objectFit: 'cover' }} />
              </AspectRatio>
              <Box p={2}>
                <Text fontWeight='bold' fontSize='sm' noOfLines={1}>{c.name}</Text>
                <Text fontSize='xs' color='gray.600' noOfLines={2}>{c.description}</Text>
              </Box>
            </Box>
          ))}
        </HStack>
      </Box>
    </Box>
  );
}

