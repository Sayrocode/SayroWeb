import React from 'react';
import { Box, Stack, Text, Badge, HStack, Icon, LinkBox, AspectRatio, useColorModeValue } from "@chakra-ui/react";
import NextLink from "next/link";
import { useRouter } from "next/router";
import { FiMapPin, FiHome, FiDroplet, FiMaximize } from "react-icons/fi";
import Image from 'next/image';
import { useQueryClient } from '@tanstack/react-query';
import { prefetchProperty } from '../lib/queries/properties';

type EBOperation = {
  type?: string; // 'sale' | 'rental' | ...
  amount?: number;
  currency?: string;
  prices?: { amount?: number; currency?: string; formatted_amount?: string; price_per_m2?: boolean }[];
  price_per_m2?: boolean;
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

function formatPriceFromOps(ops?: EBOperation[]): { main: string; note?: string; type?: string; perM2?: boolean } {
  if (!Array.isArray(ops) || ops.length === 0) return { main: "Precio a consultar" };
  const pick = () => {
    const normType = (t?: string) => String(t || '').toLowerCase();
    const sale = ops.find((o) => normType(o?.type) === 'sale');
    if (sale) return sale;
    const rental = ops.find((o) => normType(o?.type) === 'rental');
    return rental || ops[0];
  };
  const op = pick();
  const opType = String(op?.type || '').toLowerCase();
  const label = opType === 'sale' ? 'EN VENTA' : opType === 'rental' ? 'EN RENTA' : '';

  // Prefer formatted_amount if present
  const formatted = op?.prices?.[0]?.formatted_amount;
  const rawFmt = typeof formatted === 'string' ? formatted : '';
  const perM2 =
    rawFmt.toLowerCase().includes('m2') ||
    rawFmt.toLowerCase().includes('m²') ||
    Boolean(op?.price_per_m2) ||
    Boolean(op?.prices?.[0]?.price_per_m2);
  // Then explicit amount on op / prices
  const amount = typeof op?.amount === 'number' ? op!.amount : op?.prices?.[0]?.amount;
  const currency = op?.currency || op?.prices?.[0]?.currency || 'MXN';

  if (formatted) {
    const main = perM2 ? rawFmt.replace(/m2/gi, "m²") : formatted;
    const note = label || undefined;
    return { main, note, type: opType, perM2 };
  }
  if (typeof amount === 'number') {
    const inferredPerM2 = !perM2 && amount > 0 && amount <= 2000; // heurística: precios muy bajos suelen ser por m²
    const fmt = new Intl.NumberFormat('es-MX', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
    const main = (perM2 || inferredPerM2) ? `${fmt} por m²` : fmt;
    const note = label || undefined;
    return { main, note, type: opType, perM2: perM2 || inferredPerM2 };
  }
  return { main: 'Precio a consultar', type: opType, perM2 };
}

//

function getLocationText(loc: unknown): string {
  if (typeof loc === "string") return loc;
  if (!loc || typeof loc !== "object") return "";
  const o = loc as any;
  return [o.name, o.neighborhood, o.municipality || o.delegation, o.city, o.state, o.country].filter(Boolean).join(", ");
}

function PropertyCard({ property, priority = false, sizes = "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const rawImg = property.title_image_full || property.title_image_thumb || "";
  const isAbs = typeof rawImg === 'string' && /^https?:\/\//i.test(rawImg);
  const img = (typeof rawImg === 'string' && (rawImg.startsWith("/") || isAbs)) ? rawImg : "/image3.jpg";
  const priceInfo = formatPriceFromOps(property?.operations);
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
  const prefetch = () => {
    if (!property.public_id) return;
    prefetchProperty(queryClient, property.public_id).catch(() => {});
  };

  return (
    <NextLink href={href} passHref>
      <LinkBox
        role="group"
        position="relative"
        borderWidth="1px"
        borderColor={border}
        rounded="none"
        overflow="hidden"
        bg={cardBg}
        transition="all .25s ease"
        _hover={{ shadow: "lg", transform: "translateY(-2px)" }}
        // Equal-height cards: make the card fill the grid track
        h="100%"
        display="flex"
        flexDirection="column"
        onMouseEnter={prefetch}
        onFocus={prefetch}
      >

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

      <Stack p={4} spacing={3} flex="1 1 auto" display="flex">
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
        {/* Spacer to push price to bottom so all cards align */}
        <Box flex="1 1 auto" />
        <Stack spacing={0}>
          <Text fontWeight="semibold" color="green.700" fontSize="lg" mt={1}>
            {priceInfo.main}
          </Text>
          {priceInfo.note && (
            <Text fontSize="sm" color="gray.600" textTransform="uppercase" letterSpacing="wide">
              {priceInfo.note}
            </Text>
          )}
        </Stack>
      </Stack>
      </LinkBox>
    </NextLink>
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
