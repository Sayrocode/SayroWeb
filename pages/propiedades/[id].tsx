// pages/propiedades/[id].tsx
import type { GetServerSideProps } from "next";
import Head from "next/head";
import Link from "next/link";
import Layout from "../../components/Layout";
import PropertyDetailsTable from "../../components/PropertyDetailsTable";
import dynamic from 'next/dynamic';
import Image from 'next/image';
const PropertyMapLazy = dynamic(() => import('../../components/PropertyMap'), { ssr: false, loading: () => <Box h={{ base: '280px', md: '360px' }} bg='gray.100' rounded='md' /> });
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
  VStack,
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
  useColorModeValue,
  IconButton,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
} from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";
import { FiMapPin, FiHome, FiDroplet, FiCopy, FiExternalLink, FiMail, FiClock, FiShield, FiCheckCircle, FiGrid, FiMaximize, FiKey, FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { FaWhatsapp, FaHeart, FaShare } from 'react-icons/fa';
import { CONTACT_EMAIL, waHref } from "../../lib/site";
import PropertyContactPanel from "../../components/PropertyContactPanel";
import { propertyQueryKey, usePropertyQuery } from "../../lib/queries/properties";
import { dehydrate, QueryClient, type DehydratedState } from "@tanstack/react-query";
// import MobileStickyActions from "../../components/MobileStickyActions";

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
  dehydratedState?: DehydratedState;
};

// Estados publicables (local DB y EB)
function isPublicable(status?: string | null): boolean {
  if (!status) return false;
  const t = String(status).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  return [
    'available', 'disponible', 'active', 'activa', 'published', 'publicada', 'en venta', 'en renta',
  ].includes(t);
}

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
  const candidate = p.title_image_full || p.title_image_thumb || "";
  if (typeof candidate !== 'string' || !candidate) return '/image3.jpg';
  if (candidate.startsWith('/')) return candidate;
  if (/^https?:\/\//i.test(candidate)) return candidate; // permitir EB absoluto
  return '/image3.jpg';
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
  property: initialProperty,
  related,
  uniqueCandidates,
  canonicalUrl,
}: PageProps) {
  const toast = useToast();
  const propertyId = initialProperty?.public_id;
  const { data: liveProperty } = usePropertyQuery(propertyId || '', initialProperty || undefined);
  const effectiveProperty = liveProperty || initialProperty;

  if (!effectiveProperty) {
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

  const property = effectiveProperty;

  // Normalizamos ubicación para TODO el render
  const locationText = getLocationText(property.location);
  // Galería: usar imágenes de EasyBroker si están disponibles (URLs absolutas) y/o locales
  const gallery = useMemo(() => {
    const urls: string[] = [];
    const add = (u?: string | null) => {
      if (!u) return;
      if (typeof u !== 'string') return;
      if (!urls.includes(u)) urls.push(u);
    };
    add(property.title_image_full as any);
    add(property.title_image_thumb as any);
    if (Array.isArray(property.property_images)) {
      for (const img of property.property_images) add(img?.url || undefined);
    }
    // Fallback si nada válido
    if (!urls.length) urls.push('/image3.jpg');
    const maxImages = 20;
    const items = urls.slice(0, maxImages);
    const cover = items[0] || '/image3.jpg';
    return { cover, thumbs: items, items };
  }, [property]);

  const [currentIndex, setCurrentIndex] = useState(0);
  useEffect(() => setCurrentIndex(0), [gallery.cover]);
  const { isOpen: lightboxOpen, onOpen: openLightbox, onClose: closeLightbox } = useDisclosure();

  const totalImages = gallery.items.length || 1;
  const coverSrc = gallery.items[currentIndex] || gallery.cover;

  const goPrev = () => {
    if (totalImages <= 1) return;
    setCurrentIndex((idx) => (idx - 1 + totalImages) % totalImages);
  };
  const goNext = () => {
    if (totalImages <= 1) return;
    setCurrentIndex((idx) => (idx + 1) % totalImages);
  };
  const handleThumbClick = (src: string) => {
    const idx = gallery.items.indexOf(src);
    if (idx >= 0) setCurrentIndex(idx);
  };

  const price = pickPrice(property.operations);
  const cleanDesc = stripHtml(property.description);

  const pageTitle = property.title ? `${property.title} — Sayro Bienes Raíces` : "Detalle de propiedad";
  const pageDesc = cleanDesc
    ? cleanDesc.slice(0, 160)
    : `${property.property_type || "Propiedad"} en ${locationText || "México"}`;
  const shareUrl = canonicalUrl;
  const coverAbsolute = typeof coverSrc === 'string' && coverSrc.startsWith('http')
    ? coverSrc
    : (() => { try { return new URL(coverSrc, canonicalUrl).toString(); } catch { return canonicalUrl; } })();

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

  const pageBg = useColorModeValue('#FBF6E9', 'gray.900');
  return (
    <Layout title={pageTitle}>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDesc} />
        <link rel="canonical" href={canonicalUrl} />
        <meta name="robots" content="index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1" />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDesc} />
        <meta property="og:image" content={coverAbsolute} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={canonicalUrl} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDesc} />
        <meta name="twitter:image" content={coverAbsolute} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      </Head>

      <Box bg={pageBg}>
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

        {/* Header con título, precio y botones (responsive) */}
        <Box mb={6}>
          <Box
            display="flex"
            flexDir={{ base: 'column', md: 'row' }}
            justifyContent="space-between"
            alignItems={{ base: 'flex-start', md: 'flex-end' }}
            gap={3}
            mb={2}
          >
            {/* Título de la propiedad */}
            <Heading as="h1" size={{ base: 'lg', md: 'xl' }} lineHeight="1.2" color="gray.800" textTransform="uppercase">
              {property.title || `Propiedad ${property.public_id}`}
            </Heading>

            {/* Precio, tipo de operación y botones de acción */}
            <HStack spacing={4} alignItems="center">
              <HStack spacing={3} alignItems="center">
                {/* Tipo de operación */}
                {property.operations && property.operations.length > 0 && (
                  <Badge
                    colorScheme={property.operations[0].type === 'sale' ? 'green' : 'blue'}
                    variant="solid"
                    fontSize="sm"
                    px={3}
                    py={1}
                    borderRadius="md"
                  >
                    {property.operations[0].type === 'sale' ? 'VENTA' : property.operations[0].type === 'rental' ? 'RENTA' : 'CONSULTAR'}
                  </Badge>
                )}
                {/* Precio */}
                <Text fontSize={{ base: 'xl', md: '2xl' }} fontWeight="bold" color="gray.800">
                  {price}
                </Text>
              </HStack>
              <HStack spacing={2} display={{ base: 'none', md: 'flex' }}>
                <Button
                  size="sm"
                  variant="ghost"
                  color="gray.600"
                  _hover={{ bg: 'gray.100' }}
                  onClick={() => {
                    // TODO: Implementar funcionalidad de favoritos
                    toast({ title: "Agregado a favoritos", status: "info", duration: 2000 });
                  }}
                  aria-label="Agregar a favoritos"
                >
                  <Icon as={FaHeart} />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  color="gray.600"
                  _hover={{ bg: 'gray.100' }}
                  onClick={copyLink}
                  aria-label="Compartir"
                >
                  <Icon as={FaShare} />
                </Button>
              </HStack>
            </HStack>
          </Box>
          {/* Chips de features + microcopy (mobile-first) */}
          <HStack spacing={3} color="gray.700" fontSize="sm" flexWrap="wrap">
            {typeof property.bedrooms === 'number' && (
              <HStack px={2} py={1} bg="gray.100" rounded="full"><Icon as={FiHome} /><Text>{property.bedrooms} recámaras</Text></HStack>
            )}
            {typeof property.bathrooms === 'number' && (
              <HStack px={2} py={1} bg="gray.100" rounded="full"><Icon as={FiDroplet} /><Text>{property.bathrooms} baños</Text></HStack>
            )}
            {typeof property.parking_spaces === 'number' && (
              <HStack px={2} py={1} bg="gray.100" rounded="full"><Icon as={FiKey} /><Text>{property.parking_spaces} estacionamientos</Text></HStack>
            )}
            {(typeof property.construction_size === 'number' || typeof property.lot_size === 'number') && (
              <HStack px={2} py={1} bg="gray.100" rounded="full"><Icon as={FiMaximize} /><Text>
                {property.construction_size ? `${Math.round(property.construction_size)} m²` : ''}
                {property.construction_size && property.lot_size ? ' · ' : ''}
                {property.lot_size ? `${Math.round(property.lot_size)} m² terreno` : ''}
              </Text></HStack>
            )}
            <HStack px={2} py={1} bg="gray.100" rounded="full">
              <Icon as={FiMapPin} />
              <Text noOfLines={1}>{locationText || 'Ubicación disponible'}</Text>
            </HStack>
          </HStack>
          <Text mt={2} color="gray.600" fontSize="sm" display={{ base: 'block', md: 'none' }}>
            ¿Te gustó esta propiedad? Escríbenos por WhatsApp o llámanos. Respondemos en minutos.
          </Text>
        </Box>

        {/* Layout principal: imagen y panel lado a lado */}
        <Box display={{ base: "block", lg: "flex" }} gap={6} mb={8}>
          {/* Galería de imágenes - lado izquierdo */}
          <Box flex={{ base: "none", lg: "3" }}>
            <AspectRatio ratio={16 / 9} mb={3}>
              <Box
                position="relative"
                w="100%"
                h="100%"
                overflow="hidden"
                rounded="lg"
                cursor="zoom-in"
                onClick={openLightbox}
              >
                <Image
                  src={coverSrc}
                  alt={property.title || `Propiedad ${property.public_id}`}
                  fill
                  sizes="(max-width: 768px) 100vw, 60vw"
                  priority
                  fetchPriority="high"
                  placeholder="blur"
                  blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0nMTAwJScgaGVpZ2h0PScxMDAlJyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnPjxyZWN0IHdpZHRoPScxMDAlJyBoZWlnaHQ9JzEwMCUnIGZpbGw9JyNFQUVFRTAnLz48L3N2Zz4="
                  style={{ objectFit: 'cover' }}
                />
                {totalImages > 1 && (
                  <>
                    <IconButton
                      aria-label="Imagen anterior"
                      icon={<FiChevronLeft />}
                      size="sm"
                      variant="solid"
                      colorScheme="blackAlpha"
                      position="absolute"
                      top="50%"
                      left={3}
                      transform="translateY(-50%)"
                      rounded="full"
                      onClick={goPrev}
                    />
                    <IconButton
                      aria-label="Imagen siguiente"
                      icon={<FiChevronRight />}
                      size="sm"
                      variant="solid"
                      colorScheme="blackAlpha"
                      position="absolute"
                      top="50%"
                      right={3}
                      transform="translateY(-50%)"
                      rounded="full"
                      onClick={goNext}
                    />
                  </>
                )}
              </Box>
            </AspectRatio>
            <Modal isOpen={lightboxOpen} onClose={closeLightbox} size="6xl" isCentered>
              <ModalOverlay />
              <ModalContent bg="black" maxW="90vw">
                <ModalCloseButton color="whiteAlpha.900" />
                <ModalBody p={0} position="relative">
                  <Box position="relative" w="100%" h={{ base: "70vh", md: "80vh" }}>
                    <Image
                      src={coverSrc}
                      alt={property.title || `Propiedad ${property.public_id}`}
                      fill
                      sizes="90vw"
                      style={{ objectFit: 'contain' }}
                      priority
                    />
                    {totalImages > 1 && (
                      <>
                        <IconButton
                          aria-label="Imagen anterior"
                          icon={<FiChevronLeft />}
                          size="md"
                          variant="ghost"
                          colorScheme="whiteAlpha"
                          position="absolute"
                          top="50%"
                          left={3}
                          transform="translateY(-50%)"
                          rounded="full"
                          onClick={goPrev}
                        />
                        <IconButton
                          aria-label="Imagen siguiente"
                          icon={<FiChevronRight />}
                          size="md"
                          variant="ghost"
                          colorScheme="whiteAlpha"
                          position="absolute"
                          top="50%"
                          right={3}
                          transform="translateY(-50%)"
                          rounded="full"
                          onClick={goNext}
                        />
                      </>
                    )}
                  </Box>
                </ModalBody>
              </ModalContent>
            </Modal>

            {gallery.thumbs.length > 0 && (
              <SimpleGrid columns={{ base: 3, sm: 4, md: 5 }} spacing={2}>
                {gallery.thumbs.map((u, i) => {
                  const isActive = coverSrc === u;
                  return (
                    <AspectRatio key={u || i} ratio={1}>
                      <Box
                        borderWidth={isActive ? '2px' : '1px'}
                        borderColor={isActive ? 'green.500' : 'transparent'}
                        rounded="md"
                        overflow="hidden"
                        position="relative"
                        cursor="pointer"
                        onClick={() => handleThumbClick(u)}
                        boxShadow={isActive ? '0 0 0 2px rgba(56, 161, 105, 0.35)' : 'none'}
                        aria-current={isActive ? 'true' : undefined}
                      >
                        <ChakraImage
                          src={u}
                          alt={`${property.title || "Propiedad"} - ${i + 1}`}
                          objectFit="cover"
                          fallbackSrc="/image3.jpg"
                          onError={(e: any) => (e.currentTarget.src = "/image3.jpg")}
                          referrerPolicy="no-referrer"
                          loading="lazy"
                          decoding="async"
                          w="100%"
                          h="100%"
                        />
                        {isActive && (
                          <Badge
                            position="absolute"
                            top={1.5}
                            left={1.5}
                            colorScheme="green"
                            fontSize="0.65rem"
                            rounded="sm"
                            px={1.5}
                          >
                            Principal
                          </Badge>
                        )}
                      </Box>
                    </AspectRatio>
                  );
                })}
              </SimpleGrid>
            )}
          </Box>

          {/* Panel de contacto - lado derecho */}
          <Box flex={{ base: "none", lg: "2" }} position={{ base: 'static', lg: 'sticky' }} top={{ base: 'auto', lg: 6 }}>
            <PropertyContactPanel
              propertyTitle={property.title || `Propiedad ${property.public_id}`}
              propertyId={property.public_id}
              onShare={copyLink}
              onFavorite={() => {
                // TODO: Implementar funcionalidad de favoritos
                toast({ title: "Agregado a favoritos", status: "info", duration: 2000 });
              }}
            />
          </Box>
        </Box>

        {/* Descripción */}
        {cleanDesc && (
          <Box mt={{ base: 8, md: 10 }} mb={8}>
            <Heading as="h2" size="md" mb={4} color="gray.800">
              Descripción del inmueble
            </Heading>
            <Text whiteSpace="pre-line" color="gray.700" lineHeight={"1.8"} fontSize={{ base: 'md', md: 'lg' }} textAlign="justify" sx={{ hyphens: 'auto' }}>
              {cleanDesc}
            </Text>
          </Box>
        )}

        {/* Tabla de detalles del inmueble */}
        <PropertyDetailsTable property={property} />

        {/* Mapa de ubicación (diferido) */}
        <Box id="map-anchor" mt={8}>
          <PropertyMapLazy property={property} />
        </Box>

        {/* CTA adicional (responsive) */}
        <Box mt={{ base: 10, md: 12 }} px={{ base: 0, sm: 6 }}>
          <Button
            as={Link}
            href="/contacto"
            size={{ base: 'md', md: 'lg' }}
            colorScheme="green"
            bg="green.600"
            _hover={{ bg: 'green.700' }}
            width={{ base: '100%', sm: 'auto' }}
            borderRadius={{ base: 'md', md: 'full' }}
            px={{ base: 6, md: 10 }}
            py={{ base: 3.5, md: 4 }}
            fontSize={{ base: 'md', md: 'md' }}
            fontWeight="bold"
            textTransform={{ base: 'none', md: 'uppercase' }}
            display="block"
            mx="auto"
            aria-label="Ir a contacto"
          >
            ¿No encontraste lo que buscabas?
          </Button>
        </Box>

        {/* Únicas */}
        {uniqueCandidates?.length > 0 && (
          <Box mt={12}>
            <HStack mb={3}>
              <Heading as="h2" size="md">Propiedades únicas</Heading>
              <Tag colorScheme="purple">Curado</Tag>
            </HStack>
            <SimpleGrid columns={{ base: 1, sm: 2, md: 3 }} spacing={{ base: 3, sm: 4, md: 6 }}>
              {uniqueCandidates.map((p) => (
                <Card key={p.public_id} overflow="hidden" role="article" bg="#fffcf1">
                  <AspectRatio ratio={16 / 9}>
                    <ChakraImage
                      src={firstImage(p)}
                      alt={p.title || `Propiedad ${p.public_id}`}
                      objectFit="cover"
                      loading="lazy"
                      decoding="async"
                    />
                  </AspectRatio>
                  <CardBody p={{ base: 3, md: 4 }}>
                    <Heading as="h3" fontSize={{ base: 'sm', md: 'sm' }} noOfLines={2}>
                      {p.title || `Propiedad ${p.public_id}`}
                    </Heading>
                    <HStack mt={2} spacing={2} color="gray.600" fontSize={{ base: 'xs', md: 'sm' }}>
                      <Icon as={FiMapPin} />
                      <Text noOfLines={1}>{getLocationText((p as any).location) || "México"}</Text>
                    </HStack>
                    <Text mt={2} fontWeight="bold" color="green.700" fontSize={{ base: 'sm', md: 'md' }}>
                      {pickPrice(p.operations)}
                    </Text>
                    <HStack mt={2} spacing={{ base: 3, md: 4 }} color="gray.700" fontSize={{ base: 'xs', md: 'sm' }}>
                      {typeof p.bedrooms === "number" && <Text>{p.bedrooms} rec</Text>}
                      {typeof p.bathrooms === "number" && <Text>{p.bathrooms} baños</Text>}
                      {typeof p.parking_spaces === "number" && <Text>{p.parking_spaces} estac.</Text>}
                    </HStack>
                  </CardBody>
                  <CardFooter pt={0} px={{ base: 3, md: 4 }} pb={{ base: 3, md: 4 }}>
                    <Button as={Link} href={`/propiedades/${p.public_id}`} colorScheme="green" size="sm" width="full">
                      Ver detalle
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </SimpleGrid>
          </Box>
        )}

        {/* Cinta de confianza / beneficios sutiles */}
        <Box mt={10} aria-label="Confianza y beneficios" role="note">
          <HStack spacing={6} color="gray.600" fontSize="sm" flexWrap="wrap">
            <HStack><Icon as={FiClock} color="green.600" /><Text>Respuesta en minutos</Text></HStack>
            <HStack><Icon as={FiShield} color="green.600" /><Text>Tus datos están protegidos</Text></HStack>
            <HStack><Icon as={FiCheckCircle} color="green.600" /><Text>Asesoría sin costo</Text></HStack>
          </HStack>
        </Box>

        {/* Relacionadas */}
        {related?.length > 0 && (
          <Box mt={12}>
            <Heading as="h2" size="md" mb={3}>
              También te puede interesar
            </Heading>
            <SimpleGrid columns={{ base: 1, sm: 2, md: 3 }} spacing={{ base: 3, sm: 4, md: 6 }}>
              {related.map((p) => (
                <Card key={p.public_id} overflow="hidden" role="article" bg="#fffcf1">
                  <AspectRatio ratio={16 / 9}>
                    <ChakraImage
                      src={firstImage(p)}
                      alt={p.title || `Propiedad ${p.public_id}`}
                      objectFit="cover"
                      loading="lazy"
                      decoding="async"
                    />
                  </AspectRatio>
                  <CardBody p={{ base: 3, md: 4 }}>
                    <Heading as="h3" fontSize={{ base: 'sm', md: 'sm' }} noOfLines={2}>
                      {p.title || `Propiedad ${p.public_id}`}
                    </Heading>
                    <HStack mt={2} spacing={2} color="gray.600" fontSize={{ base: 'xs', md: 'sm' }}>
                      <Icon as={FiMapPin} />
                      <Text noOfLines={1}>{getLocationText((p as any).location) || "México"}</Text>
                    </HStack>
                    <Text mt={2} fontWeight="bold" color="green.700" fontSize={{ base: 'sm', md: 'md' }}>
                      {pickPrice(p.operations)}
                    </Text>
                  </CardBody>
                  <CardFooter pt={0} px={{ base: 3, md: 4 }} pb={{ base: 3, md: 4 }}>
                    <Button as={Link} href={`/propiedades/${p.public_id}`} variant="link" colorScheme="green" fontSize={{ base: 'sm', md: 'sm' }}>
                      Ver detalle
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </SimpleGrid>
          </Box>
        )}

        {/* Espaciador eliminado: ya no usamos barra fija en móvil */}
        {/* <Box h="90px" display={{ base: 'block', lg: 'none' }} /> */}
      </Container>
      </Box>

      {/* Barra fija de acciones para mobile eliminada a solicitud */}

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
  const queryClient = new QueryClient();

  try {
    // Prioridad: EasyBroker primero
    let property: EBProperty | null = null;
    let detail = await fetchJSON(`${base}/api/easybroker/properties/${encodeURIComponent(id)}`);

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
    if (detail.ok && isDetailShape(detail.data)) {
      property = detail.data;
    } else if (process.env.EASYBROKER_API_KEY) {
      const ebDetail = await fetch(`${EB_API_BASE}/properties/${encodeURIComponent(id)}`, {
        headers: {
          accept: "application/json",
          "X-Authorization": process.env.EASYBROKER_API_KEY as string,
        },
        // allow upstream caching
      });
      if (ebDetail.ok) {
        const j = await ebDetail.json();
        if (isDetailShape(j)) property = j;
      }
    }

    // Fallback C: nuestra DB si no existe en EB
    if (!property) {
      const db = await fetchJSON(`${base}/api/properties/${encodeURIComponent(id)}`);
      if (db.ok && isDetailShape(db.data)) property = db.data as EBProperty;
    }
    if (!property) return { props: { property: null, related: [], uniqueCandidates: [], canonicalUrl } };

    // Relacionadas / Únicas
    const { related, uniqueCandidates } = await fetchRelated(base, property);

    // Public page: enable CDN caching with revalidation
    if (property) {
      queryClient.setQueryData(propertyQueryKey(id), property);
    }
    const dehydratedState = dehydrate(queryClient);

    (context.res as any).setHeader?.('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=600');
    return { props: { property, related, uniqueCandidates, canonicalUrl, dehydratedState } };
  } catch (e: any) {
    console.error("Error SSR detalle propiedad:", e?.message || e);
    return { props: { property: null, related: [], uniqueCandidates: [], canonicalUrl } };
  }
};

/* =============================
 * fetchRelated (usa keyword segura)
 * ============================= */
async function fetchRelated(base: string, property: EBProperty) {
  const type = (property.property_type || '').toLowerCase();
  const kw = getLocationKeyword(property.location).toLowerCase();

  // 1) Intentar desde nuestra DB (prioriza imágenes Turso)
  let related: EBListItem[] = [];
  let uniqueCandidates: EBListItem[] = [];
  try {
    const db = await fetchJSON(`${base}/api/properties?limit=60`, { cache: 'no-store' });
    if (db.ok && isListShape(db.data)) {
      const content = Array.isArray(db.data.content) ? db.data.content : [];
      const filtered = content.filter((p) => {
        const t = String(p?.property_type || '').toLowerCase();
        const loc = getLocationText((p as any).location).toLowerCase();
        const sameType = type ? t.includes(type) : true;
        const matchLoc = kw ? loc.includes(kw) : true;
        return sameType && matchLoc && p.public_id !== property.public_id && isPublicable((p as any)?.status);
      });
      const cleaned = dedupe(filtered);
      related = cleaned.slice(0, 6);
      uniqueCandidates = cleaned.filter(isUniqueCandidate).slice(0, 6);
    }
  } catch (e) {
    // continúa con EB si falla DB
  }

  // 2) Si DB no dio resultados razonables, intentar con EasyBroker
  if ((!related || related.length === 0) && (!uniqueCandidates || uniqueCandidates.length === 0)) {
    const sp = new URLSearchParams();
    if (property.property_type) sp.append('search[property_types][]', property.property_type);
    if (kw) sp.append('q', kw);
    sp.append('limit', '18');

    let list = await fetchJSON(`${base}/api/easybroker/properties?${sp.toString()}`, { cache: 'no-store' });
    if (!list.ok) list = await fetchJSON(`${base}/api/easybroker?${sp.toString()}`, { cache: 'no-store' });
    if (list.ok && isListShape(list.data)) {
      const content = Array.isArray(list.data.content) ? list.data.content : [];
      const cleaned = dedupe(content)
        // Solo EB activos/publicables
        .filter((p) => isPublicable((p as any)?.status))
        .filter((p) => p.public_id !== property.public_id);
      related = cleaned.slice(0, 6);
      uniqueCandidates = cleaned.filter(isUniqueCandidate).slice(0, 6);
    }
  }

  const sanitize = (arr: EBListItem[]) =>
    arr.map((p) => ({
      ...p,
      title_image_full: typeof p.title_image_full === 'string' && p.title_image_full.startsWith('/') ? p.title_image_full : '/image3.jpg',
      title_image_thumb: typeof p.title_image_thumb === 'string' && p.title_image_thumb.startsWith('/') ? p.title_image_thumb : '/image3.jpg',
    }));
  return { related: sanitize(related), uniqueCandidates: sanitize(uniqueCandidates) };
}
