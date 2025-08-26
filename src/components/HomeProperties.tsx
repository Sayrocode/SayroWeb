import {
  Box,
  Container,
  Heading,
  SimpleGrid,
  Text,
  Button,
  Center,
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
import { useEffect, useMemo, useRef, useState, ReactNode } from "react";
import NextLink from "next/link";
import { FiChevronLeft, FiChevronRight, FiMapPin, FiHome, FiDroplet } from "react-icons/fi";

/* ----------------- Utils EB ----------------- */
type EBImage = { url?: string | null };
type EBOperation = { type?: "sale" | "rental" | string; amount?: number; currency?: string; formatted_amount?: string };
type EBListItem = {
  public_id: string;
  title?: string | null;
  title_image_full?: string | null;
  title_image_thumb?: string | null;
  property_images?: EBImage[];
  location?: unknown;
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
  return [o.name, o.neighborhood, o.municipality || o.delegation, o.city, o.state, o.country]
    .filter(Boolean)
    .join(", ");
}
function pickPrice(ops?: EBOperation[]) {
  if (!ops?.length) return "Precio a consultar";
  const sale = ops.find((o) => o.type === "sale");
  const rental = ops.find((o) => o.type === "rental");
  const chosen = sale || rental || ops[0];
  if (chosen.formatted_amount) return chosen.formatted_amount;
  if (typeof chosen.amount === "number") {
    const currency = chosen.currency || "MXN";
    return new Intl.NumberFormat("es-MX", { style: "currency", currency, maximumFractionDigits: 0 }).format(
      chosen.amount,
    );
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

/* ---------- FIX: AspectRatio seguro (un solo hijo) ---------- */
function SafeAspect({
  ratio,
  children,
}: {
  ratio: number;
  children: ReactNode;
}) {
  return (
    <AspectRatio ratio={ratio}>
      <Box w="100%" h="100%">{children}</Box>
    </AspectRatio>
  );
}

function priceLabel(ops?: EBOperation[]) {
  if (!ops?.length) return "PRECIO A CONSULTAR";
  const sale = ops.find((o) => o.type === "sale");
  const rental = ops.find((o) => o.type === "rental");
  const chosen = sale || rental || ops[0];

  const base =
    chosen.formatted_amount ||
    (typeof chosen.amount === "number"
      ? new Intl.NumberFormat("es-MX", {
          style: "currency",
          currency: chosen.currency || "MXN",
          maximumFractionDigits: 0,
        }).format(chosen.amount)
      : "Precio a consultar");

  const isRent = (chosen.type || "").toLowerCase() === "rental";
  return (base + (isRent ? "/MES" : "")).toUpperCase(); // como en el diseño
}

/* ----------------- Card (estilo “dibujo”) ----------------- */
function FeaturedCard({ p }: { p: EBListItem }) {
  const price = priceLabel(p.operations);
  const loc = (getLocationText(p.location) || "MéXICO").toUpperCase();
  const img = firstImage(p);

  // Colores: texto claro, sin borde ni fondo; que se funda con el verde del section
  return (
    <Box
      as={NextLink}
      href={`/propiedades/${encodeURIComponent(p.public_id)}`}
      role="article"
      aria-label={p.title || `Propiedad ${p.public_id}`}
      flex="0 0 400px"
      scrollSnapAlign="start"
      rounded="xl"
      overflow="hidden"
      bg="transparent"
      _hover={{ transform: "translateY(-3px)" }}
      transition="transform 180ms ease"
    >
      {/* Imagen + ribbon de precio */}
      <Box position="relative" rounded="xl" overflow="hidden">
        <SafeAspect ratio={16 / 9}>
          <ChakraImage
            src={img}
            alt={p.title || `Propiedad ${p.public_id}`}
            objectFit="cover"
            fallbackSrc="/house.jpg"
            referrerPolicy="no-referrer"
          />
        </SafeAspect>

        {/* Bandita de precio (alineada a la derecha como en tu mock) */}
        <Box
          position="absolute"
          bottom={2}
          right={2}
          px={3}
          py={1}
          rounded="md"
          bg="blackAlpha.800"
          color="white"
          fontWeight="extrabold"
          fontSize="sm"
          lineHeight="1"
          letterSpacing="wide"
          textTransform="uppercase"
          backdropFilter="blur(2px)"
        >
          {price}
        </Box>
      </Box>

      {/* Texto bajo la imagen, en mayúsculas y blanco */}
      <Box pt={3} px={1} color="white">
        {/* Título en dos líneas, mayúsculas, tracking leve */}
        <Heading
          as="h3"
          fontSize="sm"
          noOfLines={2}
          textTransform="uppercase"
          letterSpacing="wide"
          fontWeight="semibold"
        >
          {p.title?.toUpperCase() || `PROPIEDAD ${p.public_id}`}
        </Heading>

        {/* Ubicación en una línea */}
        <Text mt={1} fontSize="xs" color="whiteAlpha.900" noOfLines={1} textTransform="uppercase" letterSpacing="wider">
          {loc}
        </Text>

        {/* Fila de iconos: recámaras / baños / estac */}
        <HStack mt={2} spacing={6} color="whiteAlpha.900" fontSize="sm">
          {typeof p.bedrooms === "number" && (
            <HStack spacing={2} minW="12">
              <Box as={FiHome} aria-hidden />
              <Text>{p.bedrooms}</Text>
            </HStack>
          )}
          {typeof p.bathrooms === "number" && (
            <HStack spacing={2} minW="12">
              <Box as={FiDroplet} aria-hidden />
              <Text>{p.bathrooms}</Text>
            </HStack>
          )}
          {typeof p.parking_spaces === "number" && (
            <HStack spacing={2} minW="12">
              <Text as="span">🚗</Text>
              <Text>{p.parking_spaces}</Text>
            </HStack>
          )}
        </HStack>
      </Box>
    </Box>
  );
}
/* ----------------- Carrusel ----------------- */
export default function HomeFeatured() {
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState<EBListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const fetchProps = async () => {
      try {
        let res = await fetch("/api/easybroker/properties?limit=12", { cache: "no-store" });
        if (!res.ok) res = await fetch("/api/easybroker?endpoint=properties&limit=12", { cache: "no-store" });
        if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
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

  // JSON-LD para SEO
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
    return { "@context": "https://schema.org", "@type": "ItemList", itemListElement: items };
  }, [properties]);

  const scrollBy = (dir: "left" | "right") => {
    const node = trackRef.current;
    if (!node) return;
    const cardWidth = 400; // <-- coincide con la card grande
    node.scrollBy({ left: (dir === "left" ? -1 : 1) * (cardWidth + 24), behavior: "smooth" });
  };

  const sectionBg = useColorModeValue("green.900", "green.900");
  const sectionFg = useColorModeValue("white", "white");
  const subtitle = useColorModeValue("whiteAlpha.800", "whiteAlpha.800");

  return (
    <Box as="section" py={{ base: 14, md: 20 }} bg={sectionBg} color={sectionFg} position="relative">
      <Box position="absolute" inset={0} bgGradient="radial(orange.100 0%, transparent 60%)" opacity={0.06} pointerEvents="none" />
      <Container maxW="7xl" position="relative">
        <Heading as="h2" size="xl" textAlign="center" mb={2} letterSpacing="-0.02em">
          Propiedades destacadas
        </Heading>
        <Text textAlign="center" color={subtitle} mb={8}>
          Selección curada y actualizada. Encuentra tu próximo hogar o inversión.
        </Text>

        {loading ? (
          <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} spacing={6}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Box key={i} rounded="2xl" overflow="hidden" bg="whiteAlpha.200" p={0}>
                <SafeAspect ratio={16 / 9}>
                  <Skeleton />
                </SafeAspect>
                <Box p={4}>
                  <Skeleton height="20px" mb={2} />
                  <SkeletonText noOfLines={2} spacing="2" />
                </Box>
              </Box>
            ))}
          </SimpleGrid>
        ) : error ? (
          <Alert status="error" mb={6} rounded="md" bg="white" color="red.700">
            <AlertIcon />
            {error}
          </Alert>
        ) : properties.length === 0 ? (
          <Center py={12}>
            <Text color="whiteAlpha.900">No encontramos propiedades disponibles por ahora.</Text>
          </Center>
        ) : (
          <Box position="relative">
            <IconButton
              aria-label="Desplazar a la izquierda"
              icon={<FiChevronLeft />}
              onClick={() => scrollBy("left")}
              position="absolute"
              left={-10}
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
              right={-10}
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

        <Center mt={5}>
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
