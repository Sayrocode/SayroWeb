import {
  Box,
  Container,
  Heading,
  SimpleGrid,
  Text,
  Button,
  Center,
  Spinner,
  Alert,
  AlertIcon,
  IconButton,
  AspectRatio,
  Image as ChakraImage,
  HStack,
  Badge,
  useColorModeValue,
  VisuallyHidden,
  Skeleton,
  SkeletonText,
} from "@chakra-ui/react";
import { useEffect, useMemo, useRef, useState } from "react";
import NextLink from "next/link";
import { FiChevronLeft, FiChevronRight, FiMapPin, FiHome, FiDroplet } from "react-icons/fi";

/** ====== Tipos mínimos EasyBroker ====== */
type EBImage = { url?: string | null };
type EBOperation = { type?: "sale" | "rental" | string; amount?: number; currency?: string; formatted_amount?: string };
type EBListItem = {
  public_id: string;
  title?: string | null;
  title_image_full?: string | null;
  title_image_thumb?: string | null;
  property_images?: EBImage[];
  location?: unknown; // EB puede devolver string u objeto
  property_type?: string | null;
  status?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  parking_spaces?: number | null;
  operations?: EBOperation[];
};

type EBListResp = { content?: EBListItem[] };

function getLocationText(loc: unknown): string {
  if (typeof loc === "string") return loc;
  if (!loc || typeof loc !== "object") return "";
  const o = loc as any;
  const parts = [o.name, o.neighborhood, o.municipality || o.delegation, o.city, o.state, o.country].filter(Boolean);
  return parts.join(", ");
}
function pickPrice(ops?: EBOperation[]) {
  if (!ops?.length) return "Precio a consultar";
  const sale = ops.find((o) => o.type === "sale");
  const rental = ops.find((o) => o.type === "rental");
  const chosen = sale || rental || ops[0];
  if (chosen.formatted_amount) return chosen.formatted_amount;
  if (typeof chosen.amount === "number") {
    const currency = chosen.currency || "MXN";
    return new Intl.NumberFormat("es-MX", { style: "currency", currency, maximumFractionDigits: 0 }).format(chosen.amount);
  }
  return "Precio a consultar";
}
function firstImage(p: EBListItem) {
  return (
    p.title_image_full ||
    p.title_image_thumb ||
    (Array.isArray(p.property_images) && p.property_images[0]?.url) ||
    "/house.jpg"
  );
}

/** ====== Card pequeña optimizada para carrusel ====== */
function FeaturedCard({ p }: { p: EBListItem }) {
  const price = pickPrice(p.operations);
  const loc = getLocationText(p.location);
  const img = firstImage(p);
  const bg = useColorModeValue("white", "gray.800");
  const border = useColorModeValue("rgba(0,0,0,0.06)", "rgba(255,255,255,0.08)");

  return (
    <Box
      as={NextLink}
      href={`/propiedades/${encodeURIComponent(p.public_id)}`}
      role="article"
      aria-label={p.title || `Propiedad ${p.public_id}`}
      flex="0 0 320px"
      scrollSnapAlign="start"
      rounded="2xl"
      overflow="hidden"
      bg={bg}
      border="1px solid"
      borderColor={border}
      _hover={{ transform: "translateY(-2px)", boxShadow: "xl" }}
      transition="all 180ms ease"
    >
      <Box position="relative">
        <AspectRatio ratio={16 / 10}>
          <ChakraImage
            src={img}
            alt={p.title || `Propiedad ${p.public_id}`}
            objectFit="cover"
            fallbackSrc="/house.jpg"
            referrerPolicy="no-referrer"
          />
        </AspectRatio>

        {/* Price ribbon */}
        <Box
          position="absolute"
          bottom={2}
          left={2}
          px={3}
          py={1}
          rounded="md"
          fontWeight="bold"
          fontSize="sm"
          bg="blackAlpha.800"
          color="white"
          backdropFilter="blur(2px)"
        >
          {price}
        </Box>
      </Box>

      <Box p={4}>
        <HStack spacing={2} mb={2}>
          {p.property_type && (
            <Badge colorScheme="green" fontWeight="semibold">
              {p.property_type.toUpperCase()}
            </Badge>
          )}
          {p.status && <Badge>{p.status}</Badge>}
        </HStack>

        <Heading as="h3" size="sm" noOfLines={2}>
          {p.title || `Propiedad ${p.public_id}`}
        </Heading>

        <HStack mt={2} spacing={2} color="gray.600" fontSize="sm">
          <FiMapPin />
          <Text noOfLines={1}>{loc || "México"}</Text>
        </HStack>

        <HStack mt={3} spacing={5} color="gray.700" fontSize="sm">
          {typeof p.bedrooms === "number" && (
            <HStack spacing={1}>
              <FiHome />
              <Text>{p.bedrooms}</Text>
            </HStack>
          )}
          {typeof p.bathrooms === "number" && (
            <HStack spacing={1}>
              <FiDroplet />
              <Text>{p.bathrooms}</Text>
            </HStack>
          )}
          {typeof p.parking_spaces === "number" && (
            <HStack spacing={1}>
              <Box as="span">🚗</Box>
              <Text>{p.parking_spaces}</Text>
            </HStack>
          )}
        </HStack>
      </Box>
    </Box>
  );
}

/** ====== Carrusel destacado ====== */
export default function HomeFeatured() {
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState<EBListItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const trackRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const fetchProps = async () => {
      try {
        // Preferimos el proxy nuevo; limit alto para tener margen en carrusel
        let res = await fetch("/api/easybroker/properties?limit=12", { cache: "no-store" });
        if (!res.ok) {
          // Fallback al legacy
          res = await fetch("/api/easybroker?endpoint=properties&limit=12", { cache: "no-store" });
        }
        if (!res.ok) {
          const msg = await res.text();
          throw new Error(`API ${res.status}: ${msg}`);
        }
        const data: EBListResp = await res.json();
        const items = Array.isArray(data?.content) ? data.content : [];
        setProperties(items.filter((p) => p?.public_id));
      } catch (e: any) {
        setError(e?.message ?? "Error al cargar");
      } finally {
        setLoading(false);
      }
    };
    fetchProps();
  }, []);

  // JSON-LD ItemList para SEO
  const itemListJson = useMemo(() => {
    if (!properties.length) return null;
    const items = properties.slice(0, 12).map((p, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      url: `/propiedades/${encodeURIComponent(p.public_id)}`,
      item: {
        "@type": "RealEstateListing",
        name: p.title || `Propiedad ${p.public_id}`,
        image: firstImage(p),
        offers: [
          {
            "@type": "Offer",
            price: (p.operations && p.operations[0]?.amount) || undefined,
            priceCurrency: (p.operations && p.operations[0]?.currency) || "MXN",
          },
        ],
      },
    }));
    return {
      "@context": "https://schema.org",
      "@type": "ItemList",
      itemListElement: items,
    };
  }, [properties]);

  const scrollBy = (dir: "left" | "right") => {
    const node = trackRef.current;
    if (!node) return;
    const cardWidth = 320; // coincide con flex-basis del card
    node.scrollBy({ left: (dir === "left" ? -1 : 1) * (cardWidth + 24), behavior: "smooth" });
  };

  // Paleta
  const sectionBg = useColorModeValue("green.900", "green.900");
  const sectionFg = useColorModeValue("white", "white");
  const subtitle = useColorModeValue("whiteAlpha.800", "whiteAlpha.800");

  return (
    <Box as="section" py={{ base: 14, md: 20 }} bg={sectionBg} color={sectionFg} position="relative">
      {/* Decoración sutil */}
      <Box
        position="absolute"
        inset={0}
        bgGradient="radial(orange.100 0%, transparent 60%)"
        opacity={0.06}
        pointerEvents="none"
      />

      <Container maxW="7xl" position="relative">
        <Heading as="h2" size="xl" textAlign="center" mb={2} letterSpacing="-0.02em">
          Propiedades destacadas
        </Heading>
        <Text textAlign="center" color={subtitle} mb={8}>
          Selección curada y actualizada. Encuentra tu próximo hogar o inversión.
        </Text>

        {/* Loading / Error / Empty */}
        {loading ? (
          <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} spacing={6}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Box key={i} rounded="2xl" overflow="hidden" bg="whiteAlpha.200" p={0}>
                <AspectRatio ratio={16 / 10}>
                  <Skeleton />
                </AspectRatio>
                <Box p={4}>
                  <Skeleton height="20px" mb={2} />
                  <SkeletonText noOfLines={2} spacing="2" />
                </Box>
              </Box>
            ))}
          </SimpleGrid>
        ) : error ? (
          <Alert status="error" mb={6} rounded="md" bg="white">
            <AlertIcon />
            {error}
          </Alert>
        ) : properties.length === 0 ? (
          <Center py={12}>
            <Text color="whiteAlpha.900">No encontramos propiedades disponibles por ahora.</Text>
          </Center>
        ) : (
          <Box position="relative">
            {/* Controles */}
            <IconButton
              aria-label="Desplazar a la izquierda"
              icon={<FiChevronLeft />}
              onClick={() => scrollBy("left")}
              position="absolute"
              left={-2}
              top="50%"
              transform="translateY(-50%)"
              zIndex={2}
              rounded="full"
              size="lg"
              bg="white"
              color="green.700"
              _hover={{ bg: "white" }}
              display={{ base: "none", md: "inline-flex" }}
            />
            <IconButton
              aria-label="Desplazar a la derecha"
              icon={<FiChevronRight />}
              onClick={() => scrollBy("right")}
              position="absolute"
              right={-2}
              top="50%"
              transform="translateY(-50%)"
              zIndex={2}
              rounded="full"
              size="lg"
              bg="white"
              color="green.700"
              _hover={{ bg: "white" }}
              display={{ base: "none", md: "inline-flex" }}
            />

            {/* Pista scroll-snap */}
            <Box
              ref={trackRef}
              display="flex"
              gap={6}
              overflowX="auto"
              px={1}
              py={1}
              scrollSnapType="x mandatory"
              sx={{
                "&::-webkit-scrollbar": { height: "10px" },
                "&::-webkit-scrollbar-thumb": { background: "rgba(255,255,255,0.35)", borderRadius: "999px" },
                scrollBehavior: "smooth",
              }}
            >
              {properties.map((p) => (
                <FeaturedCard key={p.public_id} p={p} />
              ))}
            </Box>
          </Box>
        )}

        <Center mt={10}>
          <Button
            as={NextLink}
            href="/propiedades"
            size="lg"
            colorScheme="whiteAlpha"
            bg="white"
            color="green.800"
            _hover={{ bg: "white" }}
            rounded="full"
            px={8}
          >
            Ver todas las propiedades
          </Button>
        </Center>
      </Container>

      {/* SEO: ItemList JSON-LD */}
      {itemListJson && (
        <VisuallyHidden aria-hidden="true">
          <script
            type="application/ld+json"
            // @ts-ignore
            dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJson) }}
          />
        </VisuallyHidden>
      )}
    </Box>
  );
}
