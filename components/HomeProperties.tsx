import { Box, Container, Heading, SimpleGrid } from '@chakra-ui/react';
import PropertyCard from './PropertyCard';

export default function HomeProperties({ items = [] as any[] }) {
  return (
    <Box py={{ base: 8, md: 12 }}>
      <Container maxW="7xl">
        <Heading size="lg" mb={4}>Propiedades destacadas</Heading>
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
          {items.map((p) => <PropertyCard key={p.id} p={p} />)}
        </SimpleGrid>
      </Container>
    </Box>
  );
}

