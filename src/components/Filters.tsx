import {
    Box,
    Select,
    Input,
    Button,
    HStack,
  } from "@chakra-ui/react";
  
  export default function Filters() {
    return (
      <Box mb={6}>
        <HStack spacing={4} flexWrap="wrap">
          <Input placeholder="Buscar..." w="200px" />
          <Select placeholder="Ciudad" w="200px">
            <option>Ciudad de México</option>
            <option>Guadalajara</option>
            <option>Monterrey</option>
          </Select>
          <Select placeholder="Rango de precio" w="200px">
            <option>0 - 1,000,000</option>
            <option>1,000,000 - 3,000,000</option>
            <option>3,000,000+</option>
          </Select>
          <Button colorScheme="brand">Filtrar</Button>
        </HStack>
      </Box>
    );
  }
  