import React from 'react';
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
  useColorModeValue,
} from "@chakra-ui/react";
import NextLink from "next/link";
import { navStart } from "../lib/nav";
import { FiMapPin, FiHome, FiDroplet, FiMaximize } from "react-icons/fi";
import Image from 'next/image';

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
  cover_zoom?: number;
};

type Props = { property: EBProperty; priority?: boolean; sizes?: string };

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

function PropertyCard({ property, priority = false, sizes = "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" }: Props) {
  const rawImg = property.title_image_full || property.title_image_thumb || "";
  const isAbs = typeof rawImg === 'string' && /^https?:\/\//i.test(rawImg);
  const img = (typeof rawImg === 'string' && (rawImg.startsWith("/") || isAbs)) ? rawImg : "/image3.jpg";
  const price = formatPrice(property?.operations?.[0]);
  const zoom = (typeof (property as any)?.cover_zoom === 'number' && isFinite((property as any).cover_zoom!)
    && (property as any).cover_zoom! >= 1.0 && (property as any).cover_zoom! <= 2.0)
    ? (property as any).cover_zoom!
    : 1;
  const cardBg = '#fffcf1';
  const border = useColorModeValue("blackAlpha.200", "whiteAlpha.200");
  const titleColorHover = useColorModeValue("green.700", "green.300");
  const locationText = getLocationText(property.location);
  const isLand = (property.property_type || "").toLowerCase().includes("terreno");
  const lotSize = typeof property.lot_size === "number" ? property.lot_size : undefined;
  //

  const href = `/propiedades/${encodeURIComponent(property.public_id)}`;

  return (
    <LinkBox
      as="article"
      role="group"
      position="relative"
      borderWidth="1px"
      borderColor={border}
      rounded="none"
      overflow="hidden"
      bg={cardBg}
      transition="all .25s ease"
      _hover={{ shadow: "lg", transform: "translateY(-2px)" }}
    >
      {/* Full-card clickable overlay */}
      <LinkOverlay as={NextLink} href={href} onClick={() => navStart()} position="absolute" inset={0} zIndex={1} aria-label={property.title || `Propiedad ${property.public_id}`} />

      <AspectRatio ratio={16 / 9}>
        <Box position="relative" w="100%" h="100%">
          <Image
            src={img}
            alt={property.title || `Propiedad ${property.public_id}`}
            fill
            sizes={sizes}
            priority={priority}
            style={{ objectFit: 'cover', transform: `scale(${zoom})`, transformOrigin: 'center', transition: 'transform 0.2s ease' }}
          />
        </Box>
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

        <Text
          as={NextLink}
          href={href}
          onClick={() => navStart()}
          fontWeight="bold"
          fontSize="lg"
          noOfLines={2}
          _hover={{ color: titleColorHover, textDecoration: 'none' }}
          position='relative'
          zIndex={2}
        >
          {property.title || "Propiedad"}
        </Text>

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
// Evitar renders innecesarios cuando la propiedad no cambia
export default React.memo(PropertyCard, (prev, next) => {
  const a = prev.property as any;
  const b = next.property as any;
  if (prev.priority !== next.priority) return false;
  if (prev.sizes !== next.sizes) return false;
  const keys = [
    'public_id','title','title_image_full','title_image_thumb','property_type','bedrooms','bathrooms','parking_spaces','lot_size','construction_size','cover_zoom'
  ];
  for (const k of keys) { if (a?.[k] !== b?.[k]) return false; }
  // location string compare (cheap form)
  if (typeof a?.location === 'string' || typeof b?.location === 'string') {
    if (String(a?.location || '') !== String(b?.location || '')) return false;
  }
  return true;
});
