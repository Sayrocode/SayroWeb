import { Box, Heading, HStack, Badge, AspectRatio, Text } from '@chakra-ui/react';
import NextLink from 'next/link';

export default function PropertyCard({ p }: { p: any }) {
  return (
    <Box borderWidth="1px" rounded="lg" overflow="hidden" bg="white" _hover={{ boxShadow: 'lg', transform: 'translateY(-2px)' }} transition="all 0.15s ease">
      <Box position="relative">
        <AspectRatio ratio={16/9}>
          <Box as={NextLink} href={`/propiedades/${p.publicId}`} display="block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.titleImageFull || p.titleImageThumb || '/image1.jpg'} alt={p.title || 'Propiedad'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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

