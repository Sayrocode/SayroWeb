// components/HomeFeaturedCarousel.tsx
import {
  Box,
  Container,
  Heading,
  Text,
  Button,
  Center,
  Alert,
  AlertIcon,
  IconButton,
  AspectRatio,
  Image as ChakraImage,
  HStack,
  VisuallyHidden,
  Skeleton,
  SkeletonText,
  useColorModeValue,
  Stack,
} from "@chakra-ui/react";
import NextLink from "next/link";
import { useEffect, useMemo, useRef, useState, ReactNode } from "react";
import { FiChevronLeft, FiChevronRight, FiMapPin, FiHome, FiDroplet } from "react-icons/fi";

/* ---------- Tipos mínimos EB ---------- */
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

/* ---------- Utils ---------- */
function getLocationText(loc: unknown): string {
  if (typeof loc === "string") return loc;
  if (!loc || typeof loc !== "object") return "";
  const o = loc as any;
  return [o.name, o.neighborhood, o.municipality || o.delegation, o.city, o.state, o.country].filter(Boolean).join(", ");
}
function firstImage(p: EBListItem) {
  return p.title_image_full || p.title_image_thumb || (Array.isArray(p.property_images) && p.property_images[0]?.url) || "/image3.jpg";
}
function priceLabel(ops?: EBOperation[]) {
  if (!ops?.length) return "PRECIO A CONSULTAR";
  const sale = ops.find((o) => o.type === "sale");
  const rental = ops.find((o) => o.type === "rental");
  const chosen = sale || rental || ops[0];
  const base =
    chosen.formatted_amount ||
    (typeof chosen.amount === "number"
      ? new Intl.NumberFormat("es-MX", { style: "currency", currency: chosen.currency || "MXN", maximumFractionDigits: 0 }).format(
          chosen.amount
        )
      : "Precio a consultar");
  const isRent = (chosen.type || "").toLowerCase() === "rental";
  return (base + (isRent ? "/MES" : "")).toUpperCase();
}

/* ---------- AspectRatio seguro (1 hijo) ---------- */
function SafeAspect({ ratio, children }: { ratio: number; children: ReactNode }) {
  return (
    <AspectRatio ratio={ratio}>
      <Box w="100%" h="100%">
        {children}
      </Box>
    </AspectRatio>
  );
}

/* ---------- Tarjeta cuidada ---------- */
function FeaturedCard({ p }: { p: EBListItem }) {
  const img = firstImage(p);
  const price = priceLabel(p.operations);
  const loc = (getLocationText(p.location) || "México").toUpperCase();

  const cardBg = useColorModeValue("white", "gray.800");
  const priceBg = useColorModeValue("green.700", "green.600");

  return (
    <Box
      as={NextLink}
      href={`/propiedades/${encodeURIComponent(p.public_id)}`}
      aria-label={p.title || `Propiedad ${p.public_id}`}
      role="article"
      rounded="2xl"
      overflow="hidden"
      bg={cardBg}
      _hover={{ textDecoration: "none", transform: "translateY(-4px)", boxShadow: "xl" }}
      transition="transform .25s ease, box-shadow .25s ease"
      display="flex"
      flexDirection="column"
    >
      {/* Imagen prominente 4:3 + gradiente */}
      <Box position="relative">
      <Box position="relative" lineHeight={0}>
      <AspectRatio ratio={6 / 5} overflow="hidden">
    <ChakraImage
      src={img}
      alt={p.title || `Propiedad ${p.public_id}`}
      w="100%"
      h="100%"
      objectFit="cover"
      objectPosition="center"
      display="block"          // sin huecos por baseline
      verticalAlign="top"      // por si algún user agent lo respeta
      draggable={false}
      // tapamos cualquier hairline de subpíxel (Safari/zoom)
      transform="translateZ(0) scale(1.01)"
    />
  </AspectRatio>

  {/* overlay y ribbon se quedan igual */}
  <Box pointerEvents="none" position="absolute" inset={0}
       bgGradient="linear(to-b, rgba(0,0,0,0) 55%, rgba(0,0,0,.35))" />
  <Box position="absolute" bottom={2} right={2} /* ... */>
    {price}
  </Box>
</Box>

        <Box pointerEvents="none" position="absolute" inset={0} bgGradient="linear(to-b, rgba(0,0,0,0) 55%, rgba(0,0,0,.35))" />
        {/* Ribbon de precio */}
        <Box
          position="absolute"
          bottom={2}
          right={2}
          px={3}
          py={1.5}
          bg={priceBg}
          color="white"
          rounded="md"
          fontWeight="black"
          fontSize="sm"
          letterSpacing="wide"
          textTransform="uppercase"
          textShadow="0 1px 4px rgba(0,0,0,.4)"
        >
          {price}
        </Box>
      </Box>

      {/* Texto */}
      <Box px={4} pt={3} pb={4} color={useColorModeValue("gray.800", "whiteAlpha.900")}>
        <Heading
          as="h3"
          fontFamily="'DM Serif Display', ui-serif, Georgia, serif"
          fontWeight="400"
          fontSize="lg"
          lineHeight="1.15"
          noOfLines={2}
        >
          {(p.title || `Propiedad ${p.public_id}`).toUpperCase()}
        </Heading>

        <HStack mt={2} spacing={2} color={useColorModeValue("gray.600", "gray.300")} fontSize="sm">
          <FiMapPin />
          <Text noOfLines={1} letterSpacing="wider">
            {loc}
          </Text>
        </HStack>

        <HStack mt={3} spacing={6} fontSize="sm" color={useColorModeValue("gray.700", "gray.300")}>
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
              <Text as="span">🚗</Text>
              <Text>{p.parking_spaces}</Text>
            </HStack>
          )}
        </HStack>
      </Box>
    </Box>
  );
}

/* ---------- Carousel de 3 tarjetas (paginado) ---------- */
export default function HomeFeaturedCarousel() {
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState<EBListItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  // página actual (3 tarjetas por página en desktop, 2 en md, 1 en mobile)
  const [page, setPage] = useState(0);
  const perPage = useResponsivePerPage(); // 1 / 2 / 3 según ancho

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

  // recalcular página si cambia perPage
  useEffect(() => setPage(0), [perPage]);

  const pageCount = Math.max(1, Math.ceil(properties.length / perPage));
  const canPrev = page > 0;
  const canNext = page < pageCount - 1;

  const bg = useColorModeValue("#013927", "#013927");
  const fg = useColorModeValue("white", "white");
  const subtitle = useColorModeValue("whiteAlpha.800", "whiteAlpha.800");

  // JSON-LD SEO (opcional)
  const itemListJson = useMemo(() => {
    if (!properties.length) return null;
    const items = properties.slice(0, 9).map((p, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      url: `/propiedades/${encodeURIComponent(p.public_id)}`,
      item: {
        "@type": "RealEstateListing",
        name: p.title || `Propiedad ${p.public_id}`,
        image: firstImage(p),
      },
    }));
    return { "@context": "https://schema.org", "@type": "ItemList", itemListElement: items };
  }, [properties]);

  return (
    <Box as="section" py={{ base: 12, md: 16 }} bg={bg} color={fg} position="relative">
      <Container maxW="7xl" px={{ base: 4, md: 6 }} position="relative">
      <Stack
  spacing={{ base: 4, md: 3 }}
  align="center"
  textAlign="center"
  maxW="72ch"
  mx="auto"
>
  <Heading
    as="h2"
    fontFamily="'DM Serif Display', ui-serif, Georgia, serif"
    fontWeight="500"
    letterSpacing="-0.015em"
    fontSize={{ base: "2.4rem", md: "3.2rem" }}
    lineHeight={1.08}
    color="white"
    textShadow="0 1px 10px rgba(0,0,0,.25)"
  >
    Propiedades destacadas
  </Heading>

  {/* Línea/acento debajo del título */}
  <Box
    aria-hidden
    w={{ base: "80px", md: "200px" }}
    h="3px"
    bg="green.300"
    rounded="full"
    mb={{ base: 0, md: 10 }}
  />

 
</Stack>


        {loading ? (
          <SkeletonRow />
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
          <CarouselFrame>
            {/* Viewport con overflow hidden */}
            <CarouselViewport>
              <CarouselTrack page={page}>
                {Array.from({ length: Math.max(1, Math.ceil(properties.length / perPage)) }).map((_, pi) => {
                  const slice = properties.slice(pi * perPage, pi * perPage + perPage);
                  return (
                    <PageGrid key={pi} perPage={perPage}>
                      {slice.map((p) => (
                        <FeaturedCard key={p.public_id} p={p} />
                      ))}
                    </PageGrid>
                  );
                })}
              </CarouselTrack>
            </CarouselViewport>

            {/* Overlay de flechas (por fuera del overflow hidden) */}
            <ArrowsOverlay>
              <IconButton
                aria-label="Anterior"
                icon={<FiChevronLeft />}
                onClick={() => canPrev && setPage((p) => p - 1)}
                isDisabled={!canPrev}
                position="absolute"
                left={2}
                top="50%"
                transform="translateY(-50%)"
                zIndex={3}
                rounded="full"
                size="lg"
                bg="white"
                color="#0E3B30"
                _hover={{ bg: "white" }}
              />
              <IconButton
                aria-label="Siguiente"
                icon={<FiChevronRight />}
                onClick={() => canNext && setPage((p) => p + 1)}
                isDisabled={!canNext}
                position="absolute"
                right={2}
                top="50%"
                transform="translateY(-50%)"
                zIndex={3}
                rounded="full"
                size="lg"
                bg="white"
                color="#0E3B30"
                _hover={{ bg: "white" }}
              />
            </ArrowsOverlay>

            {/* Bullets */}
            <HStack justify="center" spacing={2} mt={6}>
              {Array.from({ length: Math.max(1, Math.ceil(properties.length / perPage)) }).map((_, i) => (
                <Box
                  as="button"
                  key={i}
                  aria-label={`Ir a la página ${i + 1}`}
                  onClick={() => setPage(i)}
                  w={i === page ? 8 : 3}
                  h={3}
                  rounded="full"
                  transition="all .25s ease"
                  bg={i === page ? "white" : "whiteAlpha.600"}
                />
              ))}
            </HStack>
          </CarouselFrame>
        )}

      
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

/* ---------- Subcomponentes del carrusel ---------- */

function CarouselFrame({ children }: { children: ReactNode }) {
  // Marco externo sin overflow -> no recorta las flechas
  return <Box position="relative">{children}</Box>;
}

function CarouselViewport({ children }: { children: ReactNode }) {
  // Viewport interno con overflow hidden y borde redondeado
  return (
    <Box overflow="hidden" rounded="2xl" position="relative">
      {children}
    </Box>
  );
}

function ArrowsOverlay({ children }: { children: ReactNode }) {
  // Capa por encima del viewport (no se recorta)
  return (
    <Box position="absolute" inset={0} pointerEvents="none">
      {/* los botones sí deben responder al click */}
      <Box pointerEvents="auto">{children}</Box>
    </Box>
  );
}

function CarouselTrack({ children, page }: { children: ReactNode; page: number }) {
  return (
    <Box
      display="flex"
      w="100%"
      transform={`translateX(-${page * 100}%)`}
      transition="transform 450ms cubic-bezier(.2,.7,.2,1)"
    >
      {children}
    </Box>
  );
}

function PageGrid({ perPage, children }: { perPage: number; children: ReactNode }) {
  return (
    <Box minW="100%" px={{ base: 2, md: 3 }}>
      <Box
        display="grid"
        gridTemplateColumns={
          perPage === 1 ? "1fr" : perPage === 2 ? "repeat(2, minmax(0, 1fr))" : "repeat(3, minmax(0, 1fr))"
        }
        gap={{ base: 4, md: 6 }}
      >
        {children}
      </Box>
    </Box>
  );
}

function SkeletonRow() {
  return (
    <Box>
      <Box display="grid" gridTemplateColumns={{ base: "1fr", md: "repeat(2,1fr)", lg: "repeat(3,1fr)" }} gap={6}>
        {Array.from({ length: 3 }).map((_, i) => (
          <Box key={i} rounded="2xl" overflow="hidden" bg="whiteAlpha.200" p={0}>
            <SafeAspect ratio={4 / 3}>
              <Skeleton />
            </SafeAspect>
            <Box p={4}>
              <Skeleton height="20px" mb={2} />
              <SkeletonText noOfLines={2} spacing="2" />
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

/* ---------- Hook: cuántas tarjetas por página ---------- */
function useResponsivePerPage() {
  const [perPage, setPerPage] = useState(3);
  useEffect(() => {
    const mq1 = window.matchMedia("(max-width: 47.99rem)"); // <768 => 1
    const mq2 = window.matchMedia("(min-width: 48rem) and (max-width: 61.99rem)"); // 768-992 => 2

    const update = () => {
      if (mq1.matches) setPerPage(1);
      else if (mq2.matches) setPerPage(2);
      else setPerPage(3);
    };
    update();
    mq1.addEventListener("change", update);
    mq2.addEventListener("change", update);
    return () => {
      mq1.removeEventListener("change", update);
      mq2.removeEventListener("change", update);
    };
  }, []);
  return perPage;
}
