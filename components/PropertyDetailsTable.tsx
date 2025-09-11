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
    const loc = property.location;
    if (typeof loc === "string") {
      // Si es string, intentar parsear
      const parts = loc.split(",").map(p => p.trim());
      return {
        state: parts[parts.length - 1] || "",
        municipality: parts[parts.length - 2] || "",
        neighborhood: parts[parts.length - 3] || "",
      };
    }
    if (typeof loc === "object" && loc !== null) {
      return {
        state: loc.state || loc.estado || "",
        municipality: loc.municipality || loc.municipio || loc.city || loc.ciudad || "",
        neighborhood: loc.neighborhood || loc.colonia || loc.name || "",
      };
    }
    return { state: "", municipality: "", neighborhood: "" };
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
    <Box mb={8}>
      <Heading as="h2" size="md" mb={4} color="gray.800" textAlign="center">
        Detalles del inmueble
      </Heading>
      
      <Table variant="simple" size="sm" border="1px" borderColor="gray.200" width="100%">
        <Thead>
          <Tr bg="gray.50">
            <Th border="1px" borderColor="gray.200" fontWeight="bold" textAlign="center" width="33.33%">
              Estado
            </Th>
            <Th border="1px" borderColor="gray.200" fontWeight="bold" textAlign="center" width="33.33%">
              Municipio
            </Th>
            <Th border="1px" borderColor="gray.200" fontWeight="bold" textAlign="center" width="33.33%">
              Colonia
            </Th>
          </Tr>
        </Thead>
        <Tbody>
          <Tr>
            <Td border="1px" borderColor="gray.200" fontWeight="bold" textAlign="center">
              {locationInfo.state || "N/A"}
            </Td>
            <Td border="1px" borderColor="gray.200" fontWeight="bold" textAlign="center">
              {locationInfo.municipality || "N/A"}
            </Td>
            <Td border="1px" borderColor="gray.200" fontWeight="bold" textAlign="center">
              {locationInfo.neighborhood || "N/A"}
            </Td>
          </Tr>
        </Tbody>
      </Table>

      <Table variant="simple" size="sm" border="1px" borderColor="gray.200" mt={2} width="100%">
        <Thead>
          <Tr bg="gray.50">
            <Th border="1px" borderColor="gray.200" fontWeight="bold" textAlign="center" width="33.33%">
              Estado
            </Th>
            <Th border="1px" borderColor="gray.200" fontWeight="bold" textAlign="center" width="33.33%">
              Referencia
            </Th>
            <Th border="1px" borderColor="gray.200" fontWeight="bold" textAlign="center" width="33.33%">
              Tipo de Inmueble
            </Th>
          </Tr>
        </Thead>
        <Tbody>
          <Tr>
            <Td border="1px" borderColor="gray.200" fontWeight="bold" textAlign="center">
              {getCondition()}
            </Td>
            <Td border="1px" borderColor="gray.200" fontWeight="bold" textAlign="center">
              {property.public_id}
            </Td>
            <Td border="1px" borderColor="gray.200" fontWeight="bold" textAlign="center">
              {property.property_type || "N/A"}
            </Td>
          </Tr>
        </Tbody>
      </Table>

      <Table variant="simple" size="sm" border="1px" borderColor="gray.200" mt={2} width="100%">
        <Thead>
          <Tr bg="gray.50">
            <Th border="1px" borderColor="gray.200" fontWeight="bold" textAlign="center" width="33.33%">
              Habitaciones
            </Th>
            <Th border="1px" borderColor="gray.200" fontWeight="bold" textAlign="center" width="33.33%">
              Superficie útil
            </Th>
            <Th border="1px" borderColor="gray.200" fontWeight="bold" textAlign="center" width="33.33%">
              Superficie del Terreno
            </Th>
          </Tr>
        </Thead>
        <Tbody>
          <Tr>
            <Td border="1px" borderColor="gray.200" fontWeight="bold" textAlign="center">
              {formatRooms()}
            </Td>
            <Td border="1px" borderColor="gray.200" fontWeight="bold" textAlign="center">
              {formatM2(property.construction_size)}
            </Td>
            <Td border="1px" borderColor="gray.200" fontWeight="bold" textAlign="center">
              {formatM2(property.lot_size)}
            </Td>
          </Tr>
        </Tbody>
      </Table>

      <Table variant="simple" size="sm" border="1px" borderColor="gray.200" mt={2} width="100%">
        <Thead>
          <Tr bg="gray.50">
            <Th border="1px" borderColor="gray.200" fontWeight="bold" textAlign="center" width="50%">
              {getOperationType()}
            </Th>
            <Th border="1px" borderColor="gray.200" fontWeight="bold" textAlign="center" width="50%">
              Estacionamientos
            </Th>
          </Tr>
        </Thead>
        <Tbody>
          <Tr>
            <Td border="1px" borderColor="gray.200" fontWeight="bold" textAlign="center">
              {getPrice()}
            </Td>
            <Td border="1px" borderColor="gray.200" fontWeight="bold" textAlign="center">
              {property.parking_spaces || 0}
            </Td>
          </Tr>
        </Tbody>
      </Table>

      <Heading as="h3" size="sm" mt={6} mb={3} color="gray.800" textAlign="center">
        Características del inmueble
      </Heading>
      
      <Box bg="gray.50" p={4} borderRadius="md" border="1px" borderColor="gray.200">
        <VStack spacing={2} align="stretch">
          <HStack justify="space-between">
            <Text fontWeight="bold">Tipo de propiedad:</Text>
            <Text>{property.property_type || "N/A"}</Text>
          </HStack>
          <HStack justify="space-between">
            <Text fontWeight="bold">Estado:</Text>
            <Text>{getCondition()}</Text>
          </HStack>
          <HStack justify="space-between">
            <Text fontWeight="bold">Operación:</Text>
            <Badge colorScheme={getOperationType() === "Venta" ? "green" : "blue"}>
              {getOperationType()}
            </Badge>
          </HStack>
          {property.bedrooms && (
            <HStack justify="space-between">
              <Text fontWeight="bold">Recámaras:</Text>
              <Text>{property.bedrooms}</Text>
            </HStack>
          )}
          {property.bathrooms && (
            <HStack justify="space-between">
              <Text fontWeight="bold">Baños:</Text>
              <Text>{property.bathrooms}</Text>
            </HStack>
          )}
          {property.parking_spaces && property.parking_spaces > 0 && (
            <HStack justify="space-between">
              <Text fontWeight="bold">Estacionamientos:</Text>
              <Text>{property.parking_spaces}</Text>
            </HStack>
          )}
          {property.lot_size && (
            <HStack justify="space-between">
              <Text fontWeight="bold">Superficie del terreno:</Text>
              <Text>{formatM2(property.lot_size)}</Text>
            </HStack>
          )}
          {property.construction_size && (
            <HStack justify="space-between">
              <Text fontWeight="bold">Superficie construida:</Text>
              <Text>{formatM2(property.construction_size)}</Text>
            </HStack>
          )}
        </VStack>
      </Box>
    </Box>
  );
}
