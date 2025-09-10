import {
  Box,
  Stack,
  Text,
  Badge,
  HStack,
  Icon,
  LinkBox,
  LinkOverlay,
  AspectRatio,
  Image as ChakraImage,
  useColorModeValue,
} from "@chakra-ui/react";
import NextLink from "next/link";
import { FiMapPin, FiHome, FiDroplet, FiMaximize } from "react-icons/fi";

type EBOperation = {
  prices?: { amount?: number; currency?: string; formatted_amount?: string }[];
};

type EBProperty = {
  public_id: string;
  title?: string;
  title_image_full?: string;
  title_image_thumb?: string;
  location?: unknown;
  property_type?: string;
  bedrooms?: number;
  bathrooms?: number;
  parking_spaces?: number;
  operations?: EBOperation[];
  lot_size?: number | null;
  construction_size?: number | null;
};

type Props = { property: EBProperty };

function formatPrice(p?: EBOperation) {
  const formatted = p?.prices?.[0]?.formatted_amount;
  if (formatted) return formatted;

  const amount = p?.prices?.[0]?.amount;
  const currency = p?.prices?.[0]?.currency || "MXN";
  if (typeof amount === "number") {
    const f = new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
    return f;
  }
  return "Precio a consultar";
}

//

function getLocationText(loc: unknown): string {
  if (typeof loc === "string") return loc;
  if (!loc || typeof loc !== "object") return "";
  const o = loc as any;
  return [o.name, o.neighborhood, o.municipality || o.delegation, o.city, o.state, o.country].filter(Boolean).join(", ");
}

export default function PropertyCard({ property }: Props) {
  const rawImg = property.title_image_full || property.title_image_thumb || "";
  const img = rawImg.startsWith("/") ? rawImg : "/image3.jpg";
  const price = formatPrice(property?.operations?.[0]);
  const cardBg = useColorModeValue("white", "gray.800");
  const border = useColorModeValue("blackAlpha.200", "whiteAlpha.200");
  const titleColorHover = useColorModeValue("green.700", "green.300");
  const locationText = getLocationText(property.location);
  const isLand = (property.property_type || "").toLowerCase().includes("terreno");
  const lotSize = typeof property.lot_size === "number" ? property.lot_size : undefined;
  //

  return (
    <LinkBox
      as="article"
      role="group"
      borderWidth="1px"
      borderColor={border}
      rounded="xl"
      overflow="hidden"
      bg={cardBg}
      transition="all .25s ease"
      _hover={{ shadow: "lg", transform: "translateY(-2px)" }}
    >
      <AspectRatio ratio={16 / 9}>
        <ChakraImage
          src={img}
          alt={property.title || `Propiedad ${property.public_id}`}
          objectFit="cover"
          fallbackSrc="/image3.jpg"
        />
      </AspectRatio>

      <Stack p={4} spacing={3}>
        <HStack spacing={2}>
          {property.property_type && (
            <Badge colorScheme="green" rounded="full" px={2}>
              {property.property_type}
            </Badge>
          )}
          <Badge variant="subtle" rounded="full" px={2}>
            ID {property.public_id}
          </Badge>
        </HStack>

        <LinkOverlay as={NextLink} href={`/propiedades/${property.public_id}`}>
          <Text
            as="h3"
            fontWeight="bold"
            fontSize="lg"
            noOfLines={2}
            _groupHover={{ color: titleColorHover }}
          >
            {property.title || "Propiedad"}
          </Text>
        </LinkOverlay>

        {locationText && (
          <HStack spacing={2} color="gray.600" fontSize="sm">
            <Icon as={FiMapPin} />
            <Text noOfLines={1}>{locationText}</Text>
          </HStack>
        )}

        <HStack spacing={4} color="gray.600" fontSize="sm">
          {isLand && typeof lotSize === "number" && lotSize > 0 && (
            <HStack spacing={1}>
              <Icon as={FiMaximize} />
              <Text>{new Intl.NumberFormat("es-MX").format(lotSize)} m²</Text>
            </HStack>
          )}
          
          {typeof property.bedrooms === "number" && (
            <HStack spacing={1}>
              <Icon as={FiHome} />
              <Text>{property.bedrooms} rec</Text>
            </HStack>
          )}
          {typeof property.bathrooms === "number" && (
            <HStack spacing={1}>
              <Icon as={FiDroplet} />
              <Text>{property.bathrooms} baños</Text>
            </HStack>
          )}
          {typeof property.parking_spaces === "number" && (
            <HStack spacing={1}>
              <Box as="span">🚗</Box>
              <Text>{property.parking_spaces} estac.</Text>
            </HStack>
          )}
        </HStack>
        <Text fontWeight="semibold" color="green.700" fontSize="lg">
          {price}
        </Text>
      </Stack>
    </LinkBox>
  );
}
