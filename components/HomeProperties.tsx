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
import Image from 'next/image';
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
  const candidate =
    p.title_image_full ||
    p.title_image_thumb ||
    (Array.isArray(p.property_images) && p.property_images[0]?.url) ||
    "";
  if (typeof candidate !== 'string' || !candidate) return "/image3.jpg";
  if (candidate.startsWith('/')) return candidate;
  if (/^https?:\/\//i.test(candidate)) return candidate;
  return "/image3.jpg";
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

  const cardBg = "transparent";
  const priceBg = "blackAlpha.700";

  return (
    <Box
      as={NextLink}
      href={`/propiedades/${encodeURIComponent(p.public_id)}`}
      aria-label={p.title || `Propiedad ${p.public_id}`}
      role="article"
      rounded="none"
      overflow="hidden"
      bg={cardBg}
      _hover={{ textDecoration: "none", transform: "translateY(-3px)" }}
      transition="transform .25s ease"
      display="flex"
      flexDirection="column"
    >
      {/* Imagen prominente 4:3 + gradiente */}
      <Box position="relative">
        <Box position="relative" lineHeight={0}>
          <AspectRatio ratio={4 / 3} overflow="hidden">
            <Box position='relative' w='100%' h='100%'>
              <Image
                src={img}
                alt={p.title || `Propiedad ${p.public_id}`}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                placeholder='blur'
                blurDataURL='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0nMTAwJScgaGVpZ2h0PSc3NSUnIHhtbG5zPSdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Zyc+PHJlY3Qgd2lkdGg9JzEwMCUnIGhlaWdodD0nMTAwJScgZmlsbD0nI0VBRUVFMCcvPjwvc3ZnPg=='
                style={{ objectFit: 'cover', objectPosition: 'center' }}
                priority={false}
              />
            </Box>
          </AspectRatio>

  {/* overlay para dar contraste al precio */}
  <Box pointerEvents="none" position="absolute" inset={0}
       bgGradient="linear(to-b, rgba(0,0,0,0) 55%, rgba(0,0,0,.35))" />
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
          rounded="sm"
          fontWeight="bold"
          fontSize="sm"
          letterSpacing="wide"
          textTransform="uppercase"
          textShadow="0 1px 4px rgba(0,0,0,.4)"
        >
          {price}
        </Box>
      </Box>

      {/* Texto */}
      <Box px={{ base: 3, md: 4 }} pt={{ base: 3, md: 4 }} pb={{ base: 5, md: 6 }} color="whiteAlpha.900" textAlign="center">
        <Heading
          as="h3"
          fontFamily="heading"
          fontWeight="700"
          fontSize={{ base: "xl", md: "2xl" }}
          lineHeight="1.1"
          noOfLines={2}
          letterSpacing="wide"
          textShadow="0 2px 10px rgba(0,0,0,.35)"
        >
          {(p.title || `Propiedad ${p.public_id}`).toUpperCase()}
        </Heading>
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
    const cached = (() => {
      try { const raw = sessionStorage.getItem('home.props.v1'); return raw ? JSON.parse(raw) : null; } catch { return null; }
    })();
    if (cached && Array.isArray(cached.items)) {
      setProperties(cached.items);
      setLoading(false);
      // refresh in background
      void fetchProps(true);
      return;
    }
    void fetchProps(false);
    async function fetchProps(background: boolean) {
      try {
        // Prioriza EasyBroker y complementa con DB local
        const [ebRes, dbRes] = await Promise.all([
          fetch("/api/easybroker/properties?limit=12"),
          fetch("/api/properties?limit=12&fast=1"),
        ]);
        let ebJson: EBListResp = ebRes.ok ? await ebRes.json() : { content: [] };
        let dbJson: EBListResp = dbRes.ok ? await dbRes.json() : { content: [] };
        // Si el proxy principal a EB falla, intenta ruta alternativa
        if (!ebRes.ok) {
          const alt = await fetch("/api/easybroker?endpoint=properties&limit=12");
          if (alt.ok) {
            ebJson = await alt.json();
          }
        }
        const ebItems = Array.isArray(ebJson?.content) ? ebJson.content : [];
        const dbItems = Array.isArray(dbJson?.content) ? dbJson.content : [];
        const map = new Map<string, any>();
        // EB primero
        for (const p of ebItems) {
          const id = String((p as any)?.public_id || ''); if (!id) continue;
          if (!map.has(id)) map.set(id, p);
        }
        // Luego DB local
        for (const p of dbItems) {
          const id = String((p as any)?.public_id || ''); if (!id) continue;
          if (!map.has(id)) map.set(id, p);
        }
        const items = Array.from(map.values());
        // Prioriza EB-* al tope
        const ordered = (() => {
          const id = (p: any) => String(p?.public_id || '').toUpperCase();
          const eb = items.filter((p) => id(p).startsWith('EB-'));
          const mid = items.filter((p) => !id(p).startsWith('EB-') && !id(p).startsWith('LOC-'));
          const loc = items.filter((p) => id(p).startsWith('LOC-'));
          return [...eb, ...mid, ...loc];
        })();
        setProperties(ordered);
        try { sessionStorage.setItem('home.props.v1', JSON.stringify({ items: ordered })); } catch {}
      } catch (e: any) {
        setError(e?.message ?? 'Error al cargar');
      } finally {
        if (!background) setLoading(false);
      }
    }
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
     fontFamily="'Binggo Wood', heading"
    fontWeight="700"
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
              <ArrowButton
                aria-label="Anterior"
                side="left"
                disabled={!canPrev}
                onClick={() => canPrev && setPage((p) => p - 1)}
              >
                <FiChevronLeft />
              </ArrowButton>
              <ArrowButton
                aria-label="Siguiente"
                side="right"
                disabled={!canNext}
                onClick={() => canNext && setPage((p) => p + 1)}
              >
                <FiChevronRight />
              </ArrowButton>
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
  // Viewport interno con overflow hidden (sin borde redondeado)
  return (
    <Box overflow="hidden" rounded="none" position="relative">
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

// Botón de flecha sin círculo, con ícono grueso y mejor contraste
function ArrowButton({ side, disabled, onClick, children, ...rest }: any) {
  const pos = side === 'left' ? { left: 8 } : { right: 8 };
  const color = 'white';
  return (
    <Box
      as="button"
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-disabled={disabled}
      aria-label={rest['aria-label']}
      position="absolute"
      top={{ base: '42%', md: '40%' }}
      style={{ transform: 'translateY(-50%)' }}
      zIndex={3}
      {...pos}
      display="grid"
      placeItems="center"
      w={{ base: 10, md: 12 }}
      h={{ base: 10, md: 12 }}
      bg="transparent"
      color={color}
      _disabled={{ opacity: 0.4, cursor: 'not-allowed' }}
      _hover={{ color: 'white', opacity: 0.95 }}
      _focusVisible={{ outline: '3px solid rgba(255,255,255,.6)', outlineOffset: '2px' }}
    >
      <Box
        as={children.type}
        boxSize={{ base: 8, md: 9 }}
        // Feather icons aceptan strokeWidth
        // @ts-ignore
        strokeWidth={3.25}
        // Mejorar visibilidad con sombra sutil
        style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,.6))' }}
      />
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
