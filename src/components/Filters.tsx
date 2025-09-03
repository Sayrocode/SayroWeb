import {
  Box,
  Select,
  Input,
  Button,
  HStack,
  useColorModeValue,
} from "@chakra-ui/react";

export type FiltersState = {
  q: string;
  city: string;
  price: "" | "0-1000000" | "1000000-3000000" | "3000000+";
  size: "" | "0-200" | "200-500" | "500-1000" | "1000+";
};

type Props = {
  value: FiltersState;
  onChange: (next: FiltersState) => void;
  onApply?: () => void;
  onClear?: () => void;
  cityOptions?: string[];
};

export default function Filters({ value, onChange, onApply, onClear, cityOptions = [] }: Props) {
  const bg = useColorModeValue("white", "gray.800");
  const border = useColorModeValue("blackAlpha.200", "whiteAlpha.200");

  return (
    <Box
      position="sticky"
      top={{ base: 0, md: 2 }}
      zIndex={5}
      mb={6}
      bg={bg}
      borderWidth="1px"
      borderColor={border}
      rounded="xl"
      p={3}
      shadow="sm"
    >
      <HStack spacing={3} flexWrap="wrap">
        <Input
          placeholder="Ej: casa 3 recámaras en Querétaro"
          w={{ base: "100%", md: "240px" }}
          value={value.q}
          onChange={(e) => onChange({ ...value, q: e.target.value })}
        />

        <Select
          placeholder="Ciudad"
          w={{ base: "100%", md: "220px" }}
          value={value.city}
          onChange={(e) => onChange({ ...value, city: e.target.value })}
        >
          {cityOptions.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>

        <Select
          placeholder="Rango de precio"
          w={{ base: "100%", md: "220px" }}
          value={value.price}
          onChange={(e) => onChange({ ...value, price: e.target.value as FiltersState["price"] })}
        >
          <option value="0-1000000">0 - 1,000,000</option>
          <option value="1000000-3000000">1,000,000 - 3,000,000</option>
          <option value="3000000+">3,000,000+</option>
        </Select>

        <Select
          placeholder="Superficie (m²)"
          w={{ base: "100%", md: "220px" }}
          value={value.size}
          onChange={(e) => onChange({ ...value, size: e.target.value as FiltersState["size"] })}
        >
          <option value="0-200">0 - 200</option>
          <option value="200-500">200 - 500</option>
          <option value="500-1000">500 - 1,000</option>
          <option value="1000+">1,000+</option>
        </Select>

        <HStack spacing={2} ml="auto">
          {onClear && (
            <Button variant="ghost" onClick={onClear} size="sm">
              Limpiar
            </Button>
          )}
          <Button colorScheme="green" onClick={onApply} size="sm">
            Aplicar filtros
          </Button>
        </HStack>
      </HStack>
    </Box>
  );
}
  
