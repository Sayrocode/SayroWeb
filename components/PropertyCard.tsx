import { Box, Heading, HStack, Badge, AspectRatio, Text } from '@chakra-ui/react';
import NextLink from 'next/link';
import Image from 'next/image';

export default function PropertyCard({ p }: { p: any }) {
  return (
    <Box borderWidth="1px" rounded="lg" overflow="hidden" bg="white" _hover={{ boxShadow: 'lg', transform: 'translateY(-2px)' }} transition="all 0.15s ease">
      <Box position="relative">
        <AspectRatio ratio={16/9}>
          <Box as={NextLink} href={`/propiedades/${p.publicId}`} display="block" position="relative">
            <Image
              src={p.titleImageFull || p.titleImageThumb || '/image1.jpg'}
              alt={p.title || 'Propiedad'}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
              style={{ objectFit: 'cover' }}
              loading="lazy"
            />
          </Box>
        </AspectRatio>
      </Box>
      <Box p={3}>
        <HStack>
          <Heading size="sm" noOfLines={1}>{p.title || 'Sin título'}</Heading>
        </HStack>
        <HStack mt={1} spacing={2} color="gray.600" fontSize="sm">
          <Badge>{p.propertyType || 'Tipo'}</Badge>
          <Badge variant="outline">{p.status || 'Status'}</Badge>
        </HStack>
        <Text mt={1} fontSize='sm' color='gray.600' noOfLines={1}>{p.locationText}</Text>
      </Box>
    </Box>
  );
}
