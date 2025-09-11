import { useMemo } from 'react';
import { Box, Heading, Text, Alert, AlertIcon } from '@chakra-ui/react';

interface PropertyMapProps {
  property: {
    public_id: string;
    title?: string;
    location?: any;
  };
}

export default function PropertyMap({ property }: PropertyMapProps) {
  // Construye la query y el texto legible para mostrar bajo el mapa
  const { embedQuery, locationText } = useMemo(() => {
    const loc: any = (property as any).location;
    let neighborhood = '';
    let city = '';
    let state = '';
    let country = '';

    if (typeof loc === 'string') {
      const parts = loc.split(',').map((s) => s.trim());
      neighborhood = parts[0] || '';
      city = parts[1] || '';
      state = parts[2] || '';
      country = parts[3] || '';
    } else if (loc && typeof loc === 'object') {
      neighborhood = (loc.neighborhood || loc.name || '').toString();
      city = (loc.city || '').toString();
      state = (loc.state || '').toString();
      country = (loc.country || '').toString();
    }

    // Si no hay colonia, usar el primer token de un string
    const firstToken = typeof loc === 'string' ? (loc.split(',')[0]?.trim() || '') : '';
    const base = neighborhood || firstToken;
    // Mostrar solo la colonia (o primer token). Sin ciudad/estado para evitar modo rutas.
    const query = base;
    const text = base;
    return { embedQuery: query, locationText: text };
  }, [property]);

  return (
    <Box mb={8}>
      <Heading as="h2" size="md" mb={4} color="gray.800" textAlign="center">
        Localización del Inmueble
      </Heading>
      
      <Box 
        h="400px" 
        w="100%" 
        borderRadius="md" 
        overflow="hidden"
        border="1px"
        borderColor="gray.200"
        boxShadow="md"
      >
        {embedQuery ? (
          <Box
            as="iframe"
            src={`https://www.google.com/maps?q=${encodeURIComponent(embedQuery)}&z=14&output=embed`}
            width="100%"
            height="100%"
            border="0"
            aria-label={`Mapa de ${embedQuery}`}
          />
        ) : null}
      </Box>

      {!embedQuery && (
        <Alert status="info" mt={4} borderRadius="md">
          <AlertIcon />
          <Text fontSize="sm">
            No se encontró una ubicación válida para esta propiedad.
          </Text>
        </Alert>
      )}

      <Text fontSize="sm" color="gray.600" mt={2} textAlign="center">
        {locationText}
      </Text>
    </Box>
  );
}
