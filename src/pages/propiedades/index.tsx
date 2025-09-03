import { useEffect, useMemo, useState } from "react";
import Layout from "../../components/Layout";
import { SimpleGrid, Container, Spinner, Center, Heading, Text, Box, Skeleton } from "@chakra-ui/react";
import PropertyCard from "../../components/PropertyCard";
import Filters, { FiltersState } from "../../components/Filters";

export default function Propiedades() {
  const [loading, setLoading] = useState(true);
  const [allProperties, setAllProperties] = useState<any[]>([]);
  const [filters, setFilters] = useState<FiltersState>({ q: "", city: "", price: "", size: "" });
  const [appliedFilters, setAppliedFilters] = useState<FiltersState>({ q: "", city: "", price: "", size: "" });

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        // Cargamos más elementos para permitir filtrado en cliente
        let res = await fetch("/api/easybroker?endpoint=properties&all=1&limit=60", { cache: "no-store" });
        if (!res.ok) res = await fetch("/api/easybroker?all=1&limit=60", { cache: "no-store" });
        const data = await res.json();
        setAllProperties(Array.isArray(data.content) ? data.content : []);
      } catch (err) {
        console.error("Error al cargar propiedades", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProperties();
  }, []);

  const cityOptions = useMemo(() => {
    const set = new Set<string>();
    for (const p of allProperties) {
      const loc = p?.location;
      const str = typeof loc === "string" ? loc : [loc?.city, loc?.state, loc?.country, loc?.name].filter(Boolean).join(", ");
      if (str) set.add(str);
    }
    return Array.from(set).sort();
  }, [allProperties]);

  // Utilidades de normalización y extracción
  function norm(s: string): string {
    return s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function getLocationString(p: any): string {
    const loc = p?.location;
    if (typeof loc === "string") return loc;
    return [loc?.name, loc?.neighborhood, loc?.municipality || loc?.delegation, loc?.city, loc?.state, loc?.country]
      .filter(Boolean)
      .join(", ");
  }

  type ParsedQuery = {
    terms: string[];
    typeHints: string[]; // casa, departamento, terreno, etc
    bedrooms?: number;
    bathrooms?: number;
    parking?: number;
    place?: string | null; // texto de ubicación detectado
    sizeMin?: number; // m² mínimo detectado explícito (con m2)
    sizeRangeMin?: number; // m² mínimo inferido por número suelto (ej: "terreno 500")
    sizeRangeMax?: number; // m² máximo inferido
    impliedLandBySize?: boolean; // si solo hay número, asumimos terrenos
    sizeGuess?: number; // valor base para ordenar por cercanía
  };

  function parseQuery(qRaw: string): ParsedQuery {
    const q = norm(qRaw);
    const tokens = q.split(/[^a-z0-9ñ]+/).filter(Boolean);

    const typeHints: string[] = [];
    const maybeType = (w: string) => {
      const w2 = norm(w);
      if (["casa", "casas"].includes(w2)) typeHints.push("casa");
      if (["departamento", "departamentos", "depa", "deptos", "depas"].includes(w2)) typeHints.push("departamento");
      if (["terreno", "terrenos", "lote", "lotes", "predio", "predios", "parcela", "parcelas"].includes(w2)) typeHints.push("terreno");
      if (["oficina", "oficinas"].includes(w2)) typeHints.push("oficina");
      if (["local", "locales"].includes(w2)) typeHints.push("local");
      if (["bodega", "bodegas"].includes(w2)) typeHints.push("bodega");
      if (["loft", "lofts"].includes(w2)) typeHints.push("loft");
      if (["penthouse", "ph"].includes(w2)) typeHints.push("penthouse");
    };

    tokens.forEach(maybeType);

    // números con unidades: 3 recamaras, 2 baños, 1 estacionamiento
    let bedrooms: number | undefined;
    let bathrooms: number | undefined;
    let parking: number | undefined;

    const recRegex = /(\d+)\s*(recamaras?|recámaras?|habitaciones?|cuartos?|rec\b)/i;
    const banRegex = /(\d+)\s*(banos?|baños?)/i;
    const estRegex = /(\d+)\s*(estacionamientos?|cocheras?|autos?)/i;

    // Busca en texto completo para capturar compuestos
    const recM = qRaw.match(recRegex);
    const banM = qRaw.match(banRegex);
    const estM = qRaw.match(estRegex);
    if (recM) bedrooms = parseInt(recM[1], 10);
    if (banM) bathrooms = parseInt(banM[1], 10);
    if (estM) parking = parseInt(estM[1], 10);

    // Heurística de tamaño (m²) con unidad explícita
    let sizeMin: number | undefined;
    const sizeRegex = /(\d{2,6})\s*(m2|m²|mts2|mts|metros\s*cuadrados?|metros2|metros)/i;
    const sizeMatch = qRaw.match(sizeRegex);
    if (sizeMatch) sizeMin = parseInt(sizeMatch[1], 10);

    // Heurística de rango para números sueltos (p.ej. "terreno 500" o solo "500")
    let sizeRangeMin: number | undefined;
    let sizeRangeMax: number | undefined;
    let sizeGuess: number | undefined;
    const numericTokens = tokens.map((t) => (/(^\d{2,6}$)/.test(t) ? parseInt(t, 10) : NaN)).filter((n) => !Number.isNaN(n)) as number[];

    // ¿solo número(s) sin unidades y sin señales de rec/baños/estac? -> inferimos búsqueda de terreno por tamaño
    const impliedLandBySize = numericTokens.length > 0 && !recM && !banM && !estM && !sizeMatch;

    if (numericTokens.length) {
      // Si se habla de terreno/lote, hay palabras de superficie o lo inferimos por números sueltos
      const talksLand =
        typeHints.includes("terreno") ||
        tokens.some((t) => ["superficie", "metros", "mtrs", "area", "área"].includes(norm(t))) ||
        impliedLandBySize;
      if (talksLand) {
        // Elegimos el primer número razonable
        const guess = numericTokens.find((n) => n >= 50 && n <= 200000);
        if (typeof guess === "number") {
          // Rango amplio: -25% / +35%
          sizeRangeMin = Math.max(0, Math.floor(guess * 0.75));
          sizeRangeMax = Math.ceil(guess * 1.35);
          sizeGuess = guess;
        }
      }
    }

    // Heurística de ubicación: frases con "en <lugar>" o token que coincide con alguna ciudad
    let place: string | null = null;
    const enIdx = tokens.indexOf("en");
    if (enIdx >= 0 && enIdx < tokens.length - 1) {
      const after = tokens.slice(enIdx + 1, enIdx + 4).join(" "); // hasta 3 palabras
      if (after) place = after;
    }
    if (!place) {
      // Busca token que exista dentro de alguna opción de ciudad
      const cityOptsNorm = cityOptions.map((c) => ({ raw: c, norm: norm(c) }));
      for (let i = 0; i < tokens.length; i++) {
        const t = tokens[i];
        if (t.length < 3) continue;
        const match = cityOptsNorm.find((co) => co.norm.includes(t));
        if (match) {
          place = match.raw;
          break;
        }
        // normalizar abreviatura qro -> queretaro
        if (["qro", "qro."].includes(t)) {
          const m2 = cityOptsNorm.find((co) => co.norm.includes("queretaro"));
          if (m2) {
            place = m2.raw;
            break;
          }
        }
      }
    }

    return { terms: tokens, typeHints, bedrooms, bathrooms, parking, place, sizeMin, sizeRangeMin, sizeRangeMax, impliedLandBySize, sizeGuess };
  }

  function getPriceAmount(p: any): number | null {
    const op = Array.isArray(p?.operations) && p.operations[0];
    if (!op) return null;
    if (Array.isArray(op.prices) && typeof op.prices[0]?.amount === "number") return op.prices[0].amount as number;
    if (typeof op.amount === "number") return op.amount as number;
    return null;
  }

  function getSizeSqm(p: any): number | null {
    const typeText = String(p?.property_type || "").toLowerCase();
    // Para terrenos priorizamos lot_size
    if (typeText.includes("terreno")) {
      if (typeof p?.lot_size === "number") return p.lot_size as number;
      if (typeof p?.construction_size === "number") return p.construction_size as number;
      return null;
    }
    // Para otros, construcción si existe, si no el lote
    if (typeof p?.construction_size === "number") return p.construction_size as number;
    if (typeof p?.lot_size === "number") return p.lot_size as number;
    return null;
  }

  const filtered = useMemo(() => {
    const q = (appliedFilters.q || "").trim();
    const parsed = parseQuery(q);
    const city = norm(appliedFilters.city || "");
    const [min, max] = (() => {
      switch (appliedFilters.price) {
        case "0-1000000":
          return [0, 1_000_000];
        case "1000000-3000000":
          return [1_000_000, 3_000_000];
        case "3000000+":
          return [3_000_000, Infinity];
        default:
          return [0, Infinity];
      }
    })();

    const [sMin, sMax] = (() => {
      switch (appliedFilters.size) {
        case "0-200":
          return [0, 200];
        case "200-500":
          return [200, 500];
        case "500-1000":
          return [500, 1000];
        case "1000+":
          return [1000, Infinity];
        default:
          return [0, Infinity];
      }
    })();

    const results = allProperties.filter((p) => {
      // texto y campos relevantes normalizados
      const title = norm(String(p?.title || ""));
      const id = norm(String(p?.public_id || ""));
      const loc = norm(getLocationString(p));
      const typeText = norm(String(p?.property_type || ""));

      // consulta libre: si hay q sin señales estructuradas, exige coincidencia textual
      if (q) {
        const hasSignals = Boolean(parsed.typeHints.length || parsed.bedrooms || parsed.bathrooms || parsed.parking || parsed.place);
        const qn = norm(q);
        const textMatch = title.includes(qn) || id.includes(qn) || loc.includes(qn) || typeText.includes(qn);
        if (!hasSignals && !textMatch) return false;
      }

      // type hints
      if (parsed.typeHints.length) {
        const okType = parsed.typeHints.some((hint) => typeText.includes(hint));
        if (!okType) return false;
      }

      // Si solo escribieron números (p.ej. "500"), filtrar a terrenos
      if (parsed.impliedLandBySize) {
        if (!typeText.includes("terreno")) return false;
      }

      // recámaras/baños/estacionamiento
      if (typeof parsed.bedrooms === "number") {
        if (!(typeof p?.bedrooms === "number" && p.bedrooms >= parsed.bedrooms)) return false;
      }
      if (typeof parsed.bathrooms === "number") {
        if (!(typeof p?.bathrooms === "number" && p.bathrooms >= parsed.bathrooms)) return false;
      }
      if (typeof parsed.parking === "number") {
        if (!(typeof p?.parking_spaces === "number" && p.parking_spaces >= parsed.parking)) return false;
      }

      // ubicación desde barra de búsqueda
      if (parsed.place) {
        const placeNorm = norm(parsed.place);
        if (placeNorm && !loc.includes(placeNorm)) return false;
      }

      // ciudad exacta si se eligió del select
      if (city) {
        if (!loc.includes(city)) return false;
      }

      // rango de precio
      const amount = getPriceAmount(p);
      if (amount != null && (amount < min || amount > max)) return false;

      // filtro de superficie desde el select
      const sqm = getSizeSqm(p);
      if (appliedFilters.size && sqm != null && (sqm < sMin || sqm > sMax)) return false;

      // tamaño desde la búsqueda libre (m² mínimo)
      if (typeof parsed.sizeMin === "number") {
        if (!(typeof sqm === "number" && sqm >= parsed.sizeMin)) return false;
      }

      // tamaño desde número suelto (rango amplio) para terrenos
      if (typeof parsed.sizeRangeMin === "number" && typeof parsed.sizeRangeMax === "number") {
        if (typeof sqm === "number") {
          if (sqm < parsed.sizeRangeMin || sqm > parsed.sizeRangeMax) return false;
        } else {
          // Si no conocemos el tamaño, permitimos pasar para no ocultar terrenos sin dato
          // (ya filtramos por tipo/ubicación arriba). Esto mantiene resultados útiles.
        }
      }

      return true;
    });

    // Ordenar por cercanía al tamaño buscado (si aplica). Los sin tamaño quedan al final.
    if (typeof parsed.sizeGuess === "number") {
      const guess = parsed.sizeGuess;
      results.sort((a, b) => {
        const sa = getSizeSqm(a);
        const sb = getSizeSqm(b);
        const da = typeof sa === "number" ? Math.abs(sa - guess) : Number.POSITIVE_INFINITY;
        const db = typeof sb === "number" ? Math.abs(sb - guess) : Number.POSITIVE_INFINITY;
        return da - db;
      });
    }

    return results;
  }, [allProperties, appliedFilters]);

  const applyFilters = () => setAppliedFilters(filters);
  const clearFilters = () => {
    setFilters({ q: "", city: "", price: "", size: "" });
    setAppliedFilters({ q: "", city: "", price: "", size: "" });
  };

  return (
    <Layout title="Propiedades">
      <Container maxW="7xl" py={8}>
        <Heading as="h1" fontSize={{ base: "2xl", md: "3xl" }} mb={4}>
          Propiedades
        </Heading>

        <Filters value={filters} onChange={setFilters} onApply={applyFilters} onClear={clearFilters} cityOptions={cityOptions} />

        {loading ? (
          <Box>
            <SimpleGrid columns={[1, 2, 3]} spacing={6}>
              {Array.from({ length: 6 }).map((_, i) => (
                <Box key={i} borderWidth="1px" rounded="xl" overflow="hidden">
                  <Skeleton h="200px" w="100%" />
                  <Box p={4}>
                    <Skeleton height="20px" mb={2} />
                    <Skeleton height="16px" mb={2} />
                    <Skeleton height="16px" w="60%" />
                  </Box>
                </Box>
              ))}
            </SimpleGrid>
          </Box>
        ) : filtered.length === 0 ? (
          <Center py={20}>
            <Text color="gray.500">No encontramos propiedades con esos filtros.</Text>
          </Center>
        ) : (
          <>
            <Text mb={3} color="gray.600">
              {filtered.length} resultado{filtered.length === 1 ? "" : "s"}
            </Text>
            <SimpleGrid columns={[1, 2, 3]} spacing={6}>
              {filtered.map((p) => (
                <PropertyCard key={p.public_id} property={p} />
              ))}
            </SimpleGrid>
          </>
        )}
      </Container>
    </Layout>
  );
}
