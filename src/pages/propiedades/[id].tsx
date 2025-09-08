// pages/propiedades/[id].tsx
import type { GetServerSideProps } from "next";
import Head from "next/head";
import Link from "next/link";
import Layout from "../../components/Layout";
import {
  Box,
  Container,
  Heading,
  Text,
  SimpleGrid,
  Stack,
  Button,
  AspectRatio,
  Image as ChakraImage,
  HStack,
  Badge,
  Icon,
  Divider,
  Alert,
  AlertIcon,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  VisuallyHidden,
  useToast,
  Wrap,
  WrapItem,
  Tag,
  Card,
  CardBody,
  CardFooter,
} from "@chakra-ui/react";
import { useMemo, useState } from "react";
import { FiMapPin, FiHome, FiDroplet, FiCopy, FiExternalLink, FiMail } from "react-icons/fi";
import { FaWhatsapp } from 'react-icons/fa';
import { CONTACT_EMAIL, waHref } from "../../lib/site";

/* =============================
 * TIPOS (ajustados a EB)
 * ============================= */
type EBImage = { url?: string | null };
type EBOperation = {
  type?: "sale" | "rental" | string;
  amount?: number;
  currency?: string;
  formatted_amount?: string;
};

export type EBProperty = {
  public_id: string;
  title?: string;
  title_image_full?: string | null;
  title_image_thumb?: string | null;
  property_images?: EBImage[];
  description?: string | null;
  // << CLAVE: aceptar cualquier forma de ubicación
  location?: unknown;
  property_type?: string | null;
  status?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  parking_spaces?: number | null;
  operations?: EBOperation[];
  lot_size?: number | null;
  construction_size?: number | null;
  broker?: { name?: string | null } | null;
};

type EBListItem = Pick<
  EBProperty,
  | "public_id"
  | "title"
  | "title_image_full"
  | "title_image_thumb"
  | "location"
  | "property_type"
  | "status"
  | "bedrooms"
  | "bathrooms"
  | "parking_spaces"
  | "operations"
>;

type PageProps = {
  property: EBProperty | null;
  related: EBListItem[];
  uniqueCandidates: EBListItem[];
  canonicalUrl: string;
};

/* =============================
 * Utilidades de UI/formatos
 * ============================= */
function stripHtml(html?: string | null) {
  if (!html) return "";
  return html.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim();
}

function pickPrice(ops?: EBOperation[]) {
  if (!ops?.length) return "Precio a consultar";
  const sale = ops.find((o) => o.type === "sale");
  const rental = ops.find((o) => o.type === "rental");
  const chosen = sale || rental || ops[0];
  if (chosen.formatted_amount) return chosen.formatted_amount;
  if (typeof chosen.amount === "number") {
    const currency = chosen.currency || "MXN";
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(chosen.amount);
  }
  return "Precio a consultar";
}

function firstImage(p: EBListItem) {
  return p.title_image_full || p.title_image_thumb || "/image3.jpg";
}

/** Heurística simple para “propiedad única” */
function isUniqueCandidate(p: EBListItem): boolean {
  const hasCover = Boolean(p.title_image_full || p.title_image_thumb);
  const hasPrice = pickPrice(p.operations) !== "Precio a consultar";
  const score = [p.bedrooms, p.bathrooms, p.parking_spaces].filter(
    (n) => typeof n === "number" && (n as number) > 0
  ).length;
  return hasCover && hasPrice && score >= 2;
}

/** Normaliza location (string | objeto) a texto legible */
function getLocationText(loc: unknown): string {
  if (typeof loc === "string") return loc;
  if (!loc || typeof loc !== "object") return "";
  const o = loc as any;
  const parts = [
    o.name,
    o.neighborhood,
    o.municipality || o.delegation,
    o.city,
    o.state,
    o.country,
  ].filter(Boolean);
  return parts.join(", ");
}

/** Keyword breve para búsqueda (primera parte de la ubicación) */
function getLocationKeyword(loc: unknown): string {
  const text = getLocationText(loc);
  const token = text.split(",")[0]?.trim();
  return token || "";
}

/* =============================
 * Página
 * ============================= */
export default function PropertyDetail({
  property,
  related,
  uniqueCandidates,
  canonicalUrl,
}: PageProps) {
  const toast = useToast();

  if (!property) {
    return (
      <Layout title="Propiedad no encontrada">
        <Container py={16}>
          <Alert status="error" rounded="md" mb={6}>
            <AlertIcon />
            No pudimos cargar la propiedad solicitada.
          </Alert>
          <Heading size="lg">Propiedad no encontrada</Heading>
        </Container>
      </Layout>
    );
  }

  // Normalizamos ubicación para TODO el render
  const locationText = getLocationText(property.location);
// Galería robusta: prioriza portada, si no, la primera foto real del arreglo
const gallery = useMemo(() => {
  const cover =
    property.title_image_full ||
    property.title_image_thumb ||
    (Array.isArray(property.property_images) && property.property_images[0]?.url) ||
    "/image3.jpg";

  // construimos thumbs únicos y sin duplicar el cover
  const thumbs = Array.isArray(property.property_images)
    ? Array.from(
        new Set(
          property.property_images
            .map((i) => i?.url)
            .filter(Boolean) as string[]
        )
      ).filter((u) => u !== cover) // evita duplicar la portada
    : [];

  return { cover: cover as string, thumbs: thumbs.slice(0, 12) };
}, [property]);

// el estado arranca con la portada calculada
const [coverSrc, setCoverSrc] = useState<string>(gallery.cover);

  const price = pickPrice(property.operations);
  const cleanDesc = stripHtml(property.description);

  const pageTitle = property.title ? `${property.title} — Sayro Bienes Raíces` : "Detalle de propiedad";
  const pageDesc = cleanDesc
    ? cleanDesc.slice(0, 160)
    : `${property.property_type || "Propiedad"} en ${locationText || "México"}`;
  const shareUrl = canonicalUrl;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({ title: "Enlace copiado", status: "success", duration: 2000 });
    } catch {
      toast({ title: "No se pudo copiar", status: "error", duration: 2000 });
    }
  };

  const mapQuery = locationText ? encodeURIComponent(locationText) : "";
  const contactMsg = `Hola, me interesa ${property.title || 'esta propiedad'} (${canonicalUrl}).`;
  const waUrl = waHref(contactMsg);
  const mailtoUrl = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Interés en ' + (property.title || 'propiedad'))}&body=${encodeURIComponent(contactMsg)}`;

  // JSON-LD
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: property.title || `Propiedad ${property.public_id}`,
    url: shareUrl,
    image: gallery.cover,
    description: pageDesc,
    identifier: property.public_id,
    listingAgent: property.broker?.name
      ? { "@type": "RealEstateAgent", name: property.broker.name }
      : undefined,
    offers: property.operations?.map((op) => ({
      "@type": "Offer",
      price: typeof op.amount === "number" ? op.amount : undefined,
      priceCurrency: op.currency || "MXN",
      category: op.type,
      availability: property.status,
    })),
    additionalProperty: [
      property.property_type ? { "@type": "PropertyValue", name: "Tipo", value: property.property_type } : null,
      typeof property.bedrooms === "number" ? { "@type": "PropertyValue", name: "Recámaras", value: property.bedrooms } : null,
      typeof property.bathrooms === "number" ? { "@type": "PropertyValue", name: "Baños", value: property.bathrooms } : null,
      typeof property.parking_spaces === "number" ? { "@type": "PropertyValue", name: "Estacionamientos", value: property.parking_spaces } : null,
    ].filter(Boolean),
  } as const;

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: canonicalUrl.replace(/\/propiedades\/.*$/, "") },
      { "@type": "ListItem", position: 2, name: "Propiedades", item: canonicalUrl.replace(/\/[^/]*$/, "") },
      { "@type": "ListItem", position: 3, name: property.title || `Propiedad ${property.public_id}`, item: canonicalUrl },
    ],
  } as const;

  return (
    <Layout title={pageTitle}>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDesc} />
        <link rel="canonical" href={canonicalUrl} />
        <meta name="robots" content="index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1" />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDesc} />
        <meta property="og:image" content={coverSrc} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={canonicalUrl} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDesc} />
        <meta name="twitter:image" content={coverSrc} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      </Head>

      <Container maxW="7xl" py={{ base: 6, md: 10 }}>
        <Breadcrumb fontSize="sm" color="gray.600" mb={3}>
          <BreadcrumbItem>
            <BreadcrumbLink as={Link} href="/">Inicio</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem>
            <BreadcrumbLink as={Link} href="/propiedades">Propiedades</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem isCurrentPage>
            <BreadcrumbLink href="#">{property.title || `Propiedad ${property.public_id}`}</BreadcrumbLink>
          </BreadcrumbItem>
        </Breadcrumb>

        <SimpleGrid columns={{ base: 1, lg: 5 }} spacing={{ base: 6, md: 8 }}>
          {/* Galería */}
          <Box gridColumn={{ base: "1 / -1", lg: "1 / 4" }}>
            <AspectRatio ratio={16 / 9} mb={3}>
              <ChakraImage
                src={coverSrc}
                alt={property.title || `Propiedad ${property.public_id}`}
                objectFit="cover"
                fallbackSrc="/image3.jpg"
                onError={() => setCoverSrc("/house.jpg")}
                referrerPolicy="no-referrer"
                rounded="lg"
              />
            </AspectRatio>

            {gallery.thumbs.length > 0 && (
              <SimpleGrid columns={{ base: 3, sm: 4, md: 5 }} spacing={2}>
                {gallery.thumbs.map((u, i) => (
                  <AspectRatio key={i} ratio={1}>
                    <ChakraImage
                      src={u}
                      alt={`${property.title || "Propiedad"} - ${i + 1}`}
                      objectFit="cover"
                      fallbackSrc="/image3.jpg"
                      onError={(e: any) => (e.currentTarget.src = "/image3.jpg")}
                      referrerPolicy="no-referrer"
                      rounded="md"
                      cursor="pointer"
                      _hover={{ opacity: 0.9 }}
                      onClick={() => setCoverSrc(u)}
                    />
                  </AspectRatio>
                ))}
              </SimpleGrid>
            )}
          </Box>

          {/* Información sticky */}
          <Stack gridColumn={{ base: "1 / -1", lg: "4 / 6" }} spacing={4} position={{ lg: "sticky" }} top={{ lg: 6 }} alignSelf="start">
            <HStack spacing={2}>
              {property.property_type && (
                <Badge colorScheme="green" rounded="full" px={2}>
                  {property.property_type}
                </Badge>
              )}
              {property.status && (
                <Badge variant="subtle" rounded="full" px={2}>
                  {property.status}
                </Badge>
              )}
              <Badge variant="subtle" rounded="full" px={2}>
                ID {property.public_id}
              </Badge>
            </HStack>

            <Heading as="h1" size="lg" lineHeight="1.2">
              {property.title || `Propiedad ${property.public_id}`}
            </Heading>

            {locationText && (
              <HStack color="gray.600" spacing={2}>
                <Icon as={FiMapPin} />
                <Text>{locationText}</Text>
              </HStack>
            )}

            <HStack spacing={6} color="gray.700">
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

            <Text fontSize="3xl" fontWeight="extrabold" color="green.700">
              {price}
            </Text>

            <Wrap>
              <WrapItem>
                <Button as="a" href={waUrl} target="_blank" rel="noopener noreferrer" colorScheme="whatsapp" leftIcon={<FaWhatsapp />}>WhatsApp</Button>
              </WrapItem>

              <WrapItem>
                <Button as="a" href={mailtoUrl} variant="outline" colorScheme="green" leftIcon={<FiMail />}>Email</Button>
              </WrapItem>

              <WrapItem>
                <Button leftIcon={<FiCopy />} variant="ghost" onClick={copyLink} aria-label="Copiar enlace">
                  Copiar enlace
                </Button>
              </WrapItem>

              {mapQuery && (
                <WrapItem>
                  <Button
                    as="a"
                    href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    leftIcon={<FiExternalLink />}
                    variant="ghost"
                  >
                    Ver en mapa
                  </Button>
                </WrapItem>
              )}
            </Wrap>

            {cleanDesc && (
              <>
                <Divider />
                <Text whiteSpace="pre-line" color="gray.700">
                  {cleanDesc}
                </Text>
              </>
            )}
          </Stack>
        </SimpleGrid>

        {/* Únicas */}
        {uniqueCandidates?.length > 0 && (
          <Box mt={12}>
            <HStack mb={3}>
              <Heading as="h2" size="md">Propiedades únicas</Heading>
              <Tag colorScheme="purple">Curado</Tag>
            </HStack>
            <SimpleGrid columns={{ base: 1, sm: 2, md: 3 }} spacing={6}>
              {uniqueCandidates.map((p) => (
                <Card key={p.public_id} overflow="hidden" role="article">
                  <AspectRatio ratio={16 / 9}>
                    <ChakraImage
                      src={firstImage(p)}
                      alt={p.title || `Propiedad ${p.public_id}`}
                      objectFit="cover"
                    />
                  </AspectRatio>
                  <CardBody>
                    <Heading as="h3" size="sm" noOfLines={2}>
                      {p.title || `Propiedad ${p.public_id}`}
                    </Heading>
                    <HStack mt={2} spacing={2} color="gray.600" fontSize="sm">
                      <Icon as={FiMapPin} />
                      <Text noOfLines={1}>{getLocationText((p as any).location) || "México"}</Text>
                    </HStack>
                    <Text mt={2} fontWeight="bold" color="green.700">
                      {pickPrice(p.operations)}
                    </Text>
                    <HStack mt={2} spacing={4} color="gray.700" fontSize="sm">
                      {typeof p.bedrooms === "number" && <Text>{p.bedrooms} rec</Text>}
                      {typeof p.bathrooms === "number" && <Text>{p.bathrooms} baños</Text>}
                      {typeof p.parking_spaces === "number" && <Text>{p.parking_spaces} estac.</Text>}
                    </HStack>
                  </CardBody>
                  <CardFooter>
                    <Button as={Link} href={`/propiedades/${p.public_id}`} colorScheme="green" size="sm" width="full">
                      Ver detalle
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </SimpleGrid>
          </Box>
        )}

        {/* Relacionadas */}
        {related?.length > 0 && (
          <Box mt={12}>
            <Heading as="h2" size="md" mb={3}>
              También te puede interesar
            </Heading>
            <SimpleGrid columns={{ base: 1, sm: 2, md: 3 }} spacing={6}>
              {related.map((p) => (
                <Card key={p.public_id} overflow="hidden" role="article">
                  <AspectRatio ratio={16 / 9}>
                    <ChakraImage
                      src={firstImage(p)}
                      alt={p.title || `Propiedad ${p.public_id}`}
                      objectFit="cover"
                    />
                  </AspectRatio>
                  <CardBody>
                    <Heading as="h3" size="sm" noOfLines={2}>
                      {p.title || `Propiedad ${p.public_id}`}
                    </Heading>
                    <HStack mt={2} spacing={2} color="gray.600" fontSize="sm">
                      <Icon as={FiMapPin} />
                      <Text noOfLines={1}>{getLocationText((p as any).location) || "México"}</Text>
                    </HStack>
                    <Text mt={2} fontWeight="bold" color="green.700">
                      {pickPrice(p.operations)}
                    </Text>
                  </CardBody>
                  <CardFooter>
                    <Button as={Link} href={`/propiedades/${p.public_id}`} variant="link" colorScheme="green">
                      Ver detalle
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </SimpleGrid>
          </Box>
        )}
      </Container>

      <VisuallyHidden>
        <Text>{[property.property_type, locationText, price].filter(Boolean).join(" · ")}</Text>
      </VisuallyHidden>
    </Layout>
  );
}

/* =============================
 * SSR helpers
 * ============================= */
function getBaseUrl(ctx: Parameters<GetServerSideProps>[0]) {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  const proto =
    (ctx.req.headers["x-forwarded-proto"] as string) ||
    (process.env.NODE_ENV === "production" ? "https" : "http");
  const host = ctx.req.headers.host;
  return `${proto}://${host}`;
}

const EB_API_BASE = "https://api.easybroker.com/v1";

function isDetailShape(j: any): j is EBProperty {
  return j && typeof j === "object" && !!j.public_id && !Array.isArray((j as any).content);
}
function isListShape(j: any): j is { content: EBListItem[] } {
  return j && typeof j === "object" && Array.isArray((j as any).content);
}

async function fetchJSON(url: string, init?: RequestInit) {
  const r = await fetch(url, init);
  const ct = r.headers.get("content-type") || "";
  const data = ct.includes("application/json") ? await r.json() : await r.text();
  return { ok: r.ok, status: r.status, data } as const;
}

function dedupe<T extends { public_id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((it) => {
    if (seen.has(it.public_id)) return false;
    seen.add(it.public_id);
    return true;
  });
}

/* =============================
 * getServerSideProps (ROBUSTO)
 * ============================= */
export const getServerSideProps: GetServerSideProps<PageProps> = async (context) => {
  const { id } = context.query as { id: string };
  const base = getBaseUrl(context);
  const canonicalUrl = `${base}/propiedades/${encodeURIComponent(id)}`;

  try {
    // Intento A: proxy nuevo (detalle)
    let detail = await fetchJSON(`${base}/api/easybroker/properties/${encodeURIComponent(id)}`, {
      cache: "no-store",
    });

    // Si devolvió listado por error, intentamos rescatar
    if (detail.ok && isListShape(detail.data)) {
      const match = detail.data.content.find((p: any) => p?.public_id === id);
      if (match) {
        const property = match as EBProperty; // list item
        const { related, uniqueCandidates } = await fetchRelated(base, property);
        return { props: { property, related, uniqueCandidates, canonicalUrl } };
      }
      detail = { ok: false, status: 404, data: { error: "Listado recibido en lugar de detalle" } } as const;
    }

    // Fallback B: EasyBroker directo
    let property: EBProperty | null = null;
    if (detail.ok && isDetailShape(detail.data)) {
      property = detail.data;
    } else if (process.env.EASYBROKER_API_KEY) {
      const ebDetail = await fetch(`${EB_API_BASE}/properties/${encodeURIComponent(id)}`, {
        headers: {
          accept: "application/json",
          "X-Authorization": process.env.EASYBROKER_API_KEY as string,
        },
        cache: "no-store",
      });
      if (ebDetail.ok) {
        const j = await ebDetail.json();
        if (isDetailShape(j)) property = j;
      }
    }

    if (!property) {
      console.error("No se pudo obtener detalle de propiedad", {
        id,
        status: detail.status,
        detailResp: detail.data,
      });
      return { props: { property: null, related: [], uniqueCandidates: [], canonicalUrl } };
    }

    // Relacionadas / Únicas
    const { related, uniqueCandidates } = await fetchRelated(base, property);

    return { props: { property, related, uniqueCandidates, canonicalUrl } };
  } catch (e: any) {
    console.error("Error SSR detalle propiedad:", e?.message || e);
    return { props: { property: null, related: [], uniqueCandidates: [], canonicalUrl } };
  }
};

/* =============================
 * fetchRelated (usa keyword segura)
 * ============================= */
async function fetchRelated(base: string, property: EBProperty) {
  const sp = new URLSearchParams();
  if (property.property_type) sp.append("search[property_types][]", property.property_type);

  // ✅ keyword sin .split sobre objetos
  const kw = getLocationKeyword(property.location);
  if (kw) sp.append("q", kw);

  sp.append("limit", "18");

  // Listado vía proxy nuevo
  let list = await fetchJSON(`${base}/api/easybroker/properties?${sp.toString()}`, { cache: "no-store" });

  // Fallback: legacy (si lo tienes activo)
  if (!list.ok) {
    list = await fetchJSON(`${base}/api/easybroker?${sp.toString()}`, { cache: "no-store" });
  }

  let related: EBListItem[] = [];
  let uniqueCandidates: EBListItem[] = [];

  if (list.ok && isListShape(list.data)) {
    const content = Array.isArray(list.data.content) ? list.data.content : [];
    const cleaned = dedupe(content).filter((p) => p.public_id !== property.public_id);
    related = cleaned.slice(0, 6);
    uniqueCandidates = cleaned.filter(isUniqueCandidate).slice(0, 6);
  } else {
    console.warn("No se pudo obtener relacionadas", list.data);
  }

  return { related, uniqueCandidates };
}
