import {
  Box,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Heading,
  Text,
  Badge,
  HStack,
  VStack,
} from "@chakra-ui/react";

interface PropertyDetailsTableProps {
  property: {
    public_id: string;
    title?: string;
    property_type?: string | null;
    status?: string | null;
    bedrooms?: number | null;
    bathrooms?: number | null;
    parking_spaces?: number | null;
    lot_size?: number | null;
    construction_size?: number | null;
    location?: any;
    operations?: Array<{
      type?: string;
      amount?: number;
      currency?: string;
      formatted_amount?: string;
    }>;
    broker?: { name?: string | null } | null;
  };
}

export default function PropertyDetailsTable({ property }: PropertyDetailsTableProps) {
  // Función para extraer información de ubicación
  const getLocationInfo = () => {
    const loc = property.location as any;
    // Helper: parse "Colonia, Ciudad, Estado[, País]"
    const parseFromName = (name: string) => {
      const parts = String(name || '')
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean);
      const n = parts.length;
      const state = n >= 2 ? parts[n - 1] : '';
      const municipality = n >= 2 ? parts[n - 2] : '';
      const neighborhood = n >= 3 ? parts[0] : '';
      return { state, municipality, neighborhood };
    };

    if (typeof loc === 'string') {
      return parseFromName(loc);
    }
    if (loc && typeof loc === 'object') {
      let state = loc.state || loc.estado || '';
      let municipality = loc.municipality || loc.municipio || loc.city || loc.ciudad || '';
      let neighborhood = loc.neighborhood || loc.colonia || '';
      // Si faltan campos y name viene con todo junto, dividirlo
      if ((!state || !municipality) && typeof loc.name === 'string' && loc.name) {
        const parsed = parseFromName(loc.name);
        state = state || parsed.state;
        municipality = municipality || parsed.municipality;
        neighborhood = neighborhood || parsed.neighborhood || '';
      } else if (!neighborhood && typeof loc.name === 'string') {
        // Si sólo falta colonia, usar el primer segmento del name
        const first = String(loc.name).split(',')[0]?.trim();
        if (first && first !== state && first !== municipality) neighborhood = first;
      }
      return { state, municipality, neighborhood };
    }
    return { state: '', municipality: '', neighborhood: '' };
  };

  // Función para obtener el precio
  const getPrice = () => {
    if (property.operations && property.operations.length > 0) {
      const operation = property.operations[0];
      return operation.formatted_amount || `$${operation.amount?.toLocaleString() || "N/A"}`;
    }
    return "Consultar precio";
  };

  // Función para obtener el tipo de operación
  const getOperationType = () => {
    if (property.operations && property.operations.length > 0) {
      const operationType = property.operations[0].type;
      return operationType === "sale" ? "Venta" : operationType === "rental" ? "Renta" : "Consultar";
    }
    return "Consultar";
  };

  // Función para obtener el estado/condición
  const getCondition = () => {
    const status = property.status?.toLowerCase();
    if (status?.includes("nuevo") || status?.includes("new")) return "Nuevo";
    if (status?.includes("usado") || status?.includes("used")) return "Usado";
    if (status?.includes("disponible") || status?.includes("available")) return "Disponible";
    return status || "Consultar";
  };

  // Función para formatear metros cuadrados
  const formatM2 = (value: number | null | undefined) => {
    if (!value) return "N/A";
    return `${value.toLocaleString()} m²`;
  };

  // Función para formatear habitaciones
  const formatRooms = () => {
    const bedrooms = property.bedrooms;
    const bathrooms = property.bathrooms;
    
    if (bedrooms && bathrooms) {
      return `${bedrooms} Habitaciones ${bathrooms} Baños`;
    }
    if (bedrooms) {
      return `${bedrooms} Habitaciones`;
    }
    if (bathrooms) {
      return `${bathrooms} Baños`;
    }
    return "N/A";
  };

  const locationInfo = getLocationInfo();

  return (
    <Box mb={8} maxW={{ base: '100%', md: '3xl' }} mx="auto" px={{ base: 2, md: 0 }}>
      <Heading as="h2" size={{ base: 'md', md: 'md' }} mb={4} color="gray.800" textAlign="center">
        Detalles del inmueble
      </Heading>
      
      <Box overflowX="auto" borderRadius="md">
      <Table variant="simple" size="sm" border="1px" borderColor="gray.200" width="100%">
        <Thead>
          <Tr bg="gray.50">
            <Th border="1px" borderColor="gray.200" fontWeight="bold" textAlign="center" width="33.33%" fontSize={{ base: 'xs', md: 'sm' }}>
              Estado
            </Th>
            <Th border="1px" borderColor="gray.200" fontWeight="bold" textAlign="center" width="33.33%" fontSize={{ base: 'xs', md: 'sm' }}>
              Municipio
            </Th>
            <Th border="1px" borderColor="gray.200" fontWeight="bold" textAlign="center" width="33.33%" fontSize={{ base: 'xs', md: 'sm' }}>
              Colonia
            </Th>
          </Tr>
        </Thead>
        <Tbody>
          <Tr>
            <Td border="1px" borderColor="gray.200" fontWeight="bold" textAlign="center" fontSize={{ base: 'sm', md: 'md' }}>
              {locationInfo.state || "N/A"}
            </Td>
            <Td border="1px" borderColor="gray.200" fontWeight="bold" textAlign="center" fontSize={{ base: 'sm', md: 'md' }}>
              {locationInfo.municipality || "N/A"}
            </Td>
            <Td border="1px" borderColor="gray.200" fontWeight="bold" textAlign="center" fontSize={{ base: 'sm', md: 'md' }}>
              {locationInfo.neighborhood || "N/A"}
            </Td>
          </Tr>
        </Tbody>
      </Table>
      </Box>

      <Box overflowX="auto" borderRadius="md" mt={2}>
      <Table variant="simple" size="sm" border="1px" borderColor="gray.200" width="100%">
        <Thead>
          <Tr bg="gray.50">
            <Th border="1px" borderColor="gray.200" fontWeight="bold" textAlign="center" width="33.33%" fontSize={{ base: 'xs', md: 'sm' }}>
              Estado
            </Th>
            <Th border="1px" borderColor="gray.200" fontWeight="bold" textAlign="center" width="33.33%" fontSize={{ base: 'xs', md: 'sm' }}>
              Referencia
            </Th>
            <Th border="1px" borderColor="gray.200" fontWeight="bold" textAlign="center" width="33.33%" fontSize={{ base: 'xs', md: 'sm' }}>
              Tipo de Inmueble
            </Th>
          </Tr>
        </Thead>
        <Tbody>
          <Tr>
            <Td border="1px" borderColor="gray.200" fontWeight="bold" textAlign="center" fontSize={{ base: 'sm', md: 'md' }}>
              {getCondition()}
            </Td>
            <Td border="1px" borderColor="gray.200" fontWeight="bold" textAlign="center" fontSize={{ base: 'sm', md: 'md' }}>
              {property.public_id}
            </Td>
            <Td border="1px" borderColor="gray.200" fontWeight="bold" textAlign="center" fontSize={{ base: 'sm', md: 'md' }}>
              {property.property_type || "N/A"}
            </Td>
          </Tr>
        </Tbody>
      </Table>
      </Box>

      <Box overflowX="auto" borderRadius="md" mt={2}>
      <Table variant="simple" size="sm" border="1px" borderColor="gray.200" width="100%">
        <Thead>
          <Tr bg="gray.50">
            <Th border="1px" borderColor="gray.200" fontWeight="bold" textAlign="center" width="33.33%" fontSize={{ base: 'xs', md: 'sm' }}>
              Habitaciones
            </Th>
            <Th border="1px" borderColor="gray.200" fontWeight="bold" textAlign="center" width="33.33%" fontSize={{ base: 'xs', md: 'sm' }}>
              Superficie útil
            </Th>
            <Th border="1px" borderColor="gray.200" fontWeight="bold" textAlign="center" width="33.33%" fontSize={{ base: 'xs', md: 'sm' }}>
              Superficie del Terreno
            </Th>
          </Tr>
        </Thead>
        <Tbody>
          <Tr>
            <Td border="1px" borderColor="gray.200" fontWeight="bold" textAlign="center" fontSize={{ base: 'sm', md: 'md' }}>
              {formatRooms()}
            </Td>
            <Td border="1px" borderColor="gray.200" fontWeight="bold" textAlign="center" fontSize={{ base: 'sm', md: 'md' }}>
              {formatM2(property.construction_size)}
            </Td>
            <Td border="1px" borderColor="gray.200" fontWeight="bold" textAlign="center" fontSize={{ base: 'sm', md: 'md' }}>
              {formatM2(property.lot_size)}
            </Td>
          </Tr>
        </Tbody>
      </Table>
      </Box>

      <Box overflowX="auto" borderRadius="md" mt={2}>
      <Table variant="simple" size="sm" border="1px" borderColor="gray.200" width="100%">
        <Thead>
          <Tr bg="gray.50">
            <Th border="1px" borderColor="gray.200" fontWeight="bold" textAlign="center" width="50%" fontSize={{ base: 'xs', md: 'sm' }}>
              {getOperationType()}
            </Th>
            <Th border="1px" borderColor="gray.200" fontWeight="bold" textAlign="center" width="50%" fontSize={{ base: 'xs', md: 'sm' }}>
              Estacionamientos
            </Th>
          </Tr>
        </Thead>
        <Tbody>
          <Tr>
            <Td border="1px" borderColor="gray.200" fontWeight="bold" textAlign="center" fontSize={{ base: 'sm', md: 'md' }}>
              {getPrice()}
            </Td>
            <Td border="1px" borderColor="gray.200" fontWeight="bold" textAlign="center" fontSize={{ base: 'sm', md: 'md' }}>
              {property.parking_spaces || 0}
            </Td>
          </Tr>
        </Tbody>
      </Table>
      </Box>

      <Heading as="h3" size={{ base: 'sm', md: 'sm' }} mt={6} mb={3} color="gray.800" textAlign="center">
        Características del inmueble
      </Heading>
      
      <Box bg="gray.50" p={{ base: 3, md: 4 }} borderRadius="md" border="1px" borderColor="gray.200" maxW={{ base: '100%', md: '3xl' }} mx="auto">
        <VStack spacing={2} align="stretch">
          <HStack justify="space-between" fontSize={{ base: 'sm', md: 'md' }}>
            <Text fontWeight="bold">Tipo de propiedad:</Text>
            <Text>{property.property_type || "N/A"}</Text>
          </HStack>
          <HStack justify="space-between" fontSize={{ base: 'sm', md: 'md' }}>
            <Text fontWeight="bold">Estado:</Text>
            <Text>{getCondition()}</Text>
          </HStack>
          <HStack justify="space-between" fontSize={{ base: 'sm', md: 'md' }}>
            <Text fontWeight="bold">Operación:</Text>
            <Badge colorScheme={getOperationType() === "Venta" ? "green" : "blue"}>
              {getOperationType()}
            </Badge>
          </HStack>
          {property.bedrooms && (
            <HStack justify="space-between" fontSize={{ base: 'sm', md: 'md' }}>
              <Text fontWeight="bold">Recámaras:</Text>
              <Text>{property.bedrooms}</Text>
            </HStack>
          )}
          {property.bathrooms && (
            <HStack justify="space-between" fontSize={{ base: 'sm', md: 'md' }}>
              <Text fontWeight="bold">Baños:</Text>
              <Text>{property.bathrooms}</Text>
            </HStack>
          )}
          {property.parking_spaces && property.parking_spaces > 0 && (
            <HStack justify="space-between" fontSize={{ base: 'sm', md: 'md' }}>
              <Text fontWeight="bold">Estacionamientos:</Text>
              <Text>{property.parking_spaces}</Text>
            </HStack>
          )}
          {property.lot_size && (
            <HStack justify="space-between" fontSize={{ base: 'sm', md: 'md' }}>
              <Text fontWeight="bold">Superficie del terreno:</Text>
              <Text>{formatM2(property.lot_size)}</Text>
            </HStack>
          )}
          {property.construction_size && (
            <HStack justify="space-between" fontSize={{ base: 'sm', md: 'md' }}>
              <Text fontWeight="bold">Superficie construida:</Text>
              <Text>{formatM2(property.construction_size)}</Text>
            </HStack>
          )}
        </VStack>
      </Box>
    </Box>
  );
}
