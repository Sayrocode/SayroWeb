import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../../components/Layout";
import {
  SimpleGrid,
  Container,
  Center,
  Heading,
  Text,
  Box,
  Skeleton,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  Wrap,
  WrapItem,
  InputGroup,
  InputLeftElement,
  Input,
  Select,
  Button,
} from "@chakra-ui/react";
import { SearchIcon } from "@chakra-ui/icons";
import Link from "next/link";
import PropertyCard from "../../components/PropertyCard";

type FiltersState = {
  q: string;
  city: string;
  price: string;
  size: string;
  type?: string;
  operation?: '' | 'sale' | 'rental';
  bedroomsMin?: number | '';
  bathroomsMin?: number | '';
  colony?: string;
  areaMin?: number | '';
  areaMax?: number | '';
};

export default function Propiedades() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [allProperties, setAllProperties] = useState<any[]>([]);
  const [filters, setFilters] = useState<FiltersState>({ q: "", city: "", price: "", size: "", type: "", operation: '', bedroomsMin: '', bathroomsMin: '', colony: '', areaMin: '', areaMax: '' });
  const [qRaw, setQRaw] = useState("");
  const [qDebounced, setQDebounced] = useState("");
  // Debounce más largo para filtros (suaviza la experiencia al teclear rápido)
  useEffect(() => { const h = setTimeout(() => setQDebounced(qRaw), 950); return () => clearTimeout(h); }, [qRaw]);
  // Debounce mayor para sugerencias (evita consultas mientras se escribe)
  const [qSuggest, setQSuggest] = useState("");
  useEffect(() => { const h = setTimeout(() => setQSuggest(qRaw), 750); return () => clearTimeout(h); }, [qRaw]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pendingMore, setPendingMore] = useState(false);
  const loaderRef = useRef<HTMLDivElement | null>(null);
  // Refs para evitar cierres obsoletos dentro del IntersectionObserver
  const pageRef = useRef(page);
  const hasMoreRef = useRef(hasMore);
  const loadingMoreRef = useRef(loadingMore);
  useEffect(() => { pageRef.current = page; }, [page]);
  useEffect(() => { hasMoreRef.current = hasMore; }, [hasMore]);
  useEffect(() => { loadingMoreRef.current = loadingMore; }, [loadingMore]);

  // Session cache: restore list + scroll instantly on back navigation
  // Utilidad: prioriza EB-* al tope; el resto conserva su orden
  const reorderByPriority = (arr: any[]) => {
    const items = Array.isArray(arr) ? arr : [];
    const id = (p: any) => String(p?.public_id || '').toUpperCase();
    const eb = items.filter((p) => id(p).startsWith('EB-'));
    const others = items.filter((p) => !id(p).startsWith('EB-'));
    return [...eb, ...others];
  };

  useEffect(() => {
    // Evitar restaurar estados antiguos que mezclen DB antes de EB;
    // siempre iniciamos con carga fresca de EB primero.
    return () => {
      try {
        sessionStorage.setItem('public.props.list.v1', JSON.stringify({ all: allProperties, page, hasMore }));
        sessionStorage.setItem('public.props.scroll', String(window.scrollY || 0));
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Lookahead prefetch (dos fases): primero EB, luego DB
  const lookaheadRef = useRef<number>(0);
  const isLookaheadRef = useRef(false);
  const ebPageRef = useRef(0);
  const ebTotalPagesRef = useRef<number | null>(null);
  const ebDoneRef = useRef(false);
  const dbPageRef = useRef(0);
  const dbTotalPagesRef = useRef<number | null>(null);

  function computeHasMore(): boolean {
    if (!ebDoneRef.current) {
      const total = ebTotalPagesRef.current;
      return total == null || ebPageRef.current < total;
    }
    const totalDb = dbTotalPagesRef.current;
    return totalDb == null || dbPageRef.current < totalDb;
  }

  async function fetchPageSilent(nextBatch: number, limit = 18) {
    try {
      isLookaheadRef.current = true;
      const map = new Map<string, any>();
      for (const p of allProperties) map.set(String(p?.public_id || ''), p);
      const isPublicable = (s: any) => {
        if (!s) return false;
        const t = String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
        return [ 'available', 'disponible', 'active', 'activa', 'published', 'publicada', 'en venta', 'en renta' ].includes(t);
      };

      if (!ebDoneRef.current) {
        const target = ebPageRef.current + 1;
        const ebRes = await fetch(`/api/easybroker/properties?limit=${limit}&page=${target}`);
        const ebJson = ebRes.ok ? await ebRes.json() : { content: [], pagination: { total_pages: ebPageRef.current } };
        const ebList = Array.isArray(ebJson.content) ? ebJson.content : [];
        for (const p of ebList) {
          const id = String(p?.public_id || ''); if (!id) continue;
          const isEbId = id.toUpperCase().startsWith('EB-');
          if (!isEbId && !isPublicable(p?.status)) continue;
          if (!map.has(id)) map.set(id, p);
        }
        const total = parseInt(String(ebJson?.pagination?.total_pages ?? '')) || (ebList.length < limit ? target : target + 1);
        ebTotalPagesRef.current = total;
        ebPageRef.current = target;
        if (!ebList.length || ebPageRef.current >= total) ebDoneRef.current = true;
      } else {
        const target = dbPageRef.current + 1;
        const dbRes = await fetch(`/api/properties?limit=${limit}&page=${target}`);
        const dbJson = dbRes.ok ? await dbRes.json() : { content: [], pagination: { total_pages: dbPageRef.current } };
        const dbList = Array.isArray(dbJson.content) ? dbJson.content : [];
        for (const p of dbList) {
          const id = String(p?.public_id || ''); if (!id) continue; if (!isPublicable(p?.status)) continue; if (!map.has(id)) map.set(id, p);
        }
        const totalDb = parseInt(String(dbJson?.pagination?.total_pages ?? '')) || (dbList.length < limit ? target : target + 1);
        dbTotalPagesRef.current = totalDb;
        dbPageRef.current = target;
      }

      const merged = Array.from(map.values());
      setAllProperties(reorderByPriority(merged));
      setPage(nextBatch);
      setHasMore(computeHasMore());
    } finally {
      isLookaheadRef.current = false;
    }
  }

  useEffect(() => {
    if (!hasMore) return;
    if (loading || loadingMore) return;
    // No lookahead durante búsqueda/filtros activos
    if ((qDebounced || '').trim() || filters.city || filters.price || filters.size || filters.type || filters.operation || filters.colony || filters.bedroomsMin || filters.bathroomsMin || filters.areaMin || filters.areaMax) return;
    if (lookaheadRef.current === page) return; // ya precargado para este page base
    lookaheadRef.current = page; // marca el base actual
    // precargar la siguiente página en background sin mostrar skeleton
    fetchPageSilent(page + 1).catch(() => {});
  }, [page, hasMore, loading, loadingMore, qDebounced, filters.city, filters.price, filters.size, filters.type, filters.operation, filters.colony, filters.bedroomsMin, filters.bathroomsMin, filters.areaMin, filters.areaMax]);

  async function fetchPage(nextBatch: number, limit = 18) {
    const map = new Map<string, any>();
    // Index existing
    for (const p of allProperties) map.set(String(p?.public_id || ""), p);
    // Aceptar solo propiedades con estatus publicable (available y variantes)
    const isPublicable = (s: any) => {
      if (!s) return false;
      const t = String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
      return [
        'available', 'disponible', 'active', 'activa', 'published', 'publicada', 'en venta', 'en renta',
      ].includes(t);
    };

    if (!ebDoneRef.current) {
      const target = ebPageRef.current + 1;
      const ebRes = await fetch(`/api/easybroker/properties?limit=${limit}&page=${target}`);
      const ebJson = ebRes.ok ? await ebRes.json() : { content: [], pagination: { total_pages: ebPageRef.current } };
      const ebList = Array.isArray(ebJson.content) ? ebJson.content : [];
      for (const p of ebList) {
        const id = String(p?.public_id || ""); if (!id) continue;
        const isEbId = id.toUpperCase().startsWith('EB-');
        if (!isEbId && !isPublicable(p?.status)) continue;
        if (!map.has(id)) map.set(id, p);
      }
      const total = parseInt(String(ebJson?.pagination?.total_pages ?? '')) || (ebList.length < limit ? target : target + 1);
      ebTotalPagesRef.current = total;
      ebPageRef.current = target;
      if (!ebList.length || ebPageRef.current >= total) ebDoneRef.current = true;
    } else {
      const target = dbPageRef.current + 1;
      const dbRes = await fetch(`/api/properties?limit=${limit}&page=${target}`);
      const dbJson = dbRes.ok ? await dbRes.json() : { content: [], pagination: { total_pages: dbPageRef.current } };
      const dbList = Array.isArray(dbJson.content) ? dbJson.content : [];
      for (const p of dbList) {
        const id = String(p?.public_id || ""); if (!id) continue; if (!isPublicable(p?.status)) continue; if (!map.has(id)) map.set(id, p);
      }
      const totalDb = parseInt(String(dbJson?.pagination?.total_pages ?? '')) || (dbList.length < limit ? target : target + 1);
      dbTotalPagesRef.current = totalDb;
      dbPageRef.current = target;
    }
    const merged = Array.from(map.values());
    setAllProperties(reorderByPriority(merged));
    setPage(nextBatch);
    const more = computeHasMore();
    setHasMore(more);
    try { sessionStorage.setItem('public.props.list.v1', JSON.stringify({ all: merged, page: nextBatch, hasMore: more })); } catch {}
  }

  useEffect(() => {
    (async () => { try { await fetchPage(1); } finally { setLoading(false); } })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Track scroll direction; don't trigger heavy work while scrolling up
  const lastYRef = useRef(0);
  const scrollingDownRef = useRef(true);
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY || 0;
      scrollingDownRef.current = y >= lastYRef.current;
      lastYRef.current = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const el = loaderRef.current; if (!el) return;
    const io = new IntersectionObserver(async (entries) => {
      const e = entries[0];
      if (!e?.isIntersecting) return;
      if (!hasMoreRef.current) return;
      if (loadingMoreRef.current) return;
      if (!scrollingDownRef.current) return;
      loadingMoreRef.current = true;
      setPendingMore(true);
      setLoadingMore(true);
      try {
        await Promise.resolve().then(() => fetchPage(pageRef.current + 1));
      } finally {
        loadingMoreRef.current = false;
        setLoadingMore(false);
        setPendingMore(false);
      }
    }, { root: null, rootMargin: '0px 0px 800px 0px', threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
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

  // Colonias/barrios a partir de la data disponible (EB: neighborhood/name; DB: primer segmento de locationText)
  const colonyOptions = useMemo(() => {
    const set = new Set<string>();
    const add = (s?: string | null) => { if (s && s.trim()) set.add(s.trim()); };
    for (const p of allProperties) {
      const loc = p?.location;
      if (loc && typeof loc === 'object') {
        const o: any = loc;
        add(o.neighborhood);
        add(o.name);
      } else if (typeof loc === 'string') {
        const first = loc.split(',')[0]?.trim();
        if (first && !/\d/.test(first) && first.length <= 48) add(first);
      }
    }
    return Array.from(set).sort();
  }, [allProperties]);

  // Partes de ubicación (colonia, municipio, ciudad, estado, país) para detección de "place"
  const placeParts = useMemo(() => {
    const set = new Set<string>();
    const add = (s?: string | null) => { if (s && s.trim()) set.add(s.trim()); };
    for (const p of allProperties) {
      const loc = p?.location;
      if (typeof loc === 'string') {
        loc.split(',').forEach((part) => add(part));
      } else if (loc && typeof loc === 'object') {
        const o: any = loc;
        add(o.name); add(o.neighborhood); add(o.municipality); add(o.delegation);
        add(o.city); add(o.state); add(o.country);
      }
    }
    return Array.from(set);
  }, [allProperties]);

  const typeOptions = useMemo(() => {
    const set = new Set<string>();
    for (const p of allProperties) {
      const t = String(p?.property_type || "").trim();
      if (t) set.add(t);
    }
    return Array.from(set).sort();
  }, [allProperties]);

  // -------- SUGERENCIAS RÁPIDAS --------
  type SuggestItem = { label: string; value?: string; type: 'title' | 'type' | 'location' | 'operation' | 'property' };
  const [sugOpen, setSugOpen] = useState(false);
  const [sugLoading, setSugLoading] = useState(false);
  const [sug, setSug] = useState<SuggestItem[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const sugCacheRef = useRef<Map<string, SuggestItem[]>>(new Map());

  useEffect(() => {
    const q = qSuggest.trim();
    if (q.length < 3) { setSug([]); setSugOpen(false); return; }
    const cached = sugCacheRef.current.get(q.toLowerCase());
    if (cached) { setSug(cached); setSugOpen(true); return; }
    if (abortRef.current) abortRef.current.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setSugLoading(true);
    setSugOpen(true);
    fetch(`/api/properties/suggest?q=${encodeURIComponent(q)}`, { signal: ac.signal })
      .then((r) => r.ok ? r.json() : Promise.reject(new Error(String(r.status))))
      .then((j) => {
        const items = Array.isArray(j?.items) ? (j.items as SuggestItem[]) : [];
        setSug(items); setSugOpen(true);
        try { sugCacheRef.current.set(q.toLowerCase(), items); } catch {}
      })
      .catch(() => {})
      .finally(() => setSugLoading(false));
    return () => { ac.abort(); };
  }, [qSuggest]);

  function applySuggestion(it: SuggestItem) {
    if (it.type === 'property' || it.type === 'title') {
      router.push(`/propiedades/${encodeURIComponent(it.value || '')}`);
      return;
    }
    if (it.type === 'type') {
      setFilters((f) => ({ ...f, type: it.value || it.label }));
      setSugOpen(false);
      return;
    }
    if (it.type === 'location') {
      setFilters((f) => ({ ...f, city: it.value || it.label }));
      setSugOpen(false);
      return;
    }
    if (it.type === 'operation') {
      const v = (it.value === 'sale' || it.value === 'rental') ? it.value : (String(it.label || '').toLowerCase().includes('venta') ? 'sale' : 'rental');
      setFilters((f) => ({ ...f, operation: v as any }));
      setSugOpen(false);
      return;
    }
  }

  // Propaga el texto debounced al filtro de búsqueda avanzado (evita recalcular en cada tecla)
  useEffect(() => {
    setFilters((f) => (f.q === qDebounced ? f : { ...f, q: qDebounced }));
  }, [qDebounced]);

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
    operation?: '' | 'sale' | 'rental';
    bedrooms?: number;
    bathrooms?: number;
    parking?: number;
    place?: string | null; // texto de ubicación detectado
    sizeMin?: number; // m² mínimo detectado explícito (con m2). Se usa si no hay bucket.
    sizeRangeMin?: number; // m² rango inferido
    sizeRangeMax?: number; // m² rango inferido
    sizeBucketMin?: number; // m² bucketizado (20-200, 200-500, 500-1000, 1000+)
    sizeBucketMax?: number; // m² bucketizado (Infinity para 1000+)
    impliedLandBySize?: boolean; // si solo hay número, asumimos terrenos
    sizeGuess?: number; // valor base para ordenar por cercanía
    amenityGuess?: number; // número suelto pequeño (1..20) => rec/baños/estac >= n
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

    // Operación: venta/compra/sale vs renta/alquiler/rent/lease
    let op: '' | 'sale' | 'rental' = '';
    const allText = ` ${q} `;
    if (/\b(venta|vender|compra|comprar|sale|sell|purchase)\b/.test(allText)) op = 'sale';
    if (/\b(renta|rent|rental|alquiler|arrendamiento|lease|leased?)\b/.test(allText)) op = op || 'rental';

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
    if (recM) bedrooms = Math.min(20, parseInt(recM[1], 10));
    if (banM) bathrooms = Math.min(20, parseInt(banM[1], 10));
    if (estM) parking = Math.min(20, parseInt(estM[1], 10));

    // Heurística de tamaño (m²)
    // Declaramos rangos y guess antes porque se usan en más de una rama
    let sizeRangeMin: number | undefined;
    let sizeRangeMax: number | undefined;
    let sizeGuess: number | undefined;
    let amenityGuess: number | undefined;
    let sizeMin: number | undefined;
    let sizeBucketMin: number | undefined;
    let sizeBucketMax: number | undefined;
    const sizeRegex = /(\d{2,6})\s*(m2|m²|mts2|mts|metros\s*cuadrados?|metros2|metros)/i;
    const sizeMatch = qRaw.match(sizeRegex);
    if (sizeMatch) {
      const n = parseInt(sizeMatch[1], 10);
      sizeMin = n;
      // También lo mapeamos a buckets para comportamiento esperado
      if (n < 20) {
        // menor a 20: no bucket; se tratará como amenidad en la lógica general
      } else if (n < 200) {
        sizeBucketMin = 20; sizeBucketMax = 200; sizeGuess = n;
      } else if (n < 500) {
        sizeBucketMin = 200; sizeBucketMax = 500; sizeGuess = n;
      } else if (n < 1000) {
        sizeBucketMin = 500; sizeBucketMax = 1000; sizeGuess = n;
      } else {
        sizeBucketMin = 1000; sizeBucketMax = Infinity; sizeGuess = n;
      }
    }

    // Heurística de rango para números sueltos (p.ej. "terreno 500" o solo "500")
    const numericTokens = tokens
      .map((t) => (/^(\d{1,6})$/.test(t) ? parseInt(t, 10) : NaN))
      .filter((n) => !Number.isNaN(n)) as number[];

    // ¿número(s) sin unidades? Interpretación:
    // - 1..20  => amenityGuess (recámaras/baños/estacionamientos >= n)
    // - >20    => rango de m² alrededor del número (±20%)
    const impliedLandBySize = numericTokens.length > 0 && !recM && !banM && !estM && !sizeMatch;

    if (impliedLandBySize && numericTokens.length) {
      const first = numericTokens[0];
      if (first <= 20) {
        amenityGuess = first;
      } else if (first < 200) {
        sizeBucketMin = 20; sizeBucketMax = 200; sizeGuess = first;
      } else if (first < 500) {
        sizeBucketMin = 200; sizeBucketMax = 500; sizeGuess = first;
      } else if (first < 1000) {
        sizeBucketMin = 500; sizeBucketMax = 1000; sizeGuess = first;
      } else {
        sizeBucketMin = 1000; sizeBucketMax = Infinity; sizeGuess = first;
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
      // Busca token que exista dentro de alguna parte de ubicación conocida
      const placeOptsNorm = placeParts.map((c) => ({ raw: c, norm: norm(c) }));
      for (let i = 0; i < tokens.length; i++) {
        const t = tokens[i];
        if (t.length < 3) continue;
        const match = placeOptsNorm.find((co) => co.norm.includes(t));
        if (match) { place = match.raw; break; }
        // normalizar abreviatura qro -> queretaro
        if (["qro", "qro."].includes(t)) {
          const m2 = placeOptsNorm.find((co) => co.norm.includes("queretaro"));
          if (m2) { place = m2.raw; break; }
        }
      }
    }

    return { terms: tokens, typeHints, operation: op, bedrooms, bathrooms, parking, place, sizeMin, sizeRangeMin, sizeRangeMax, sizeBucketMin, sizeBucketMax, impliedLandBySize, sizeGuess, amenityGuess };
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

  const typeParam = String((router.query.type as string) || "").toLowerCase();

  const TYPE_HINTS: Record<string, string[]> = {
    departamentos: ["departamento", "depa", "dept"],
    departamento: ["departamento"],
    casas: ["casa"],
    casa: ["casa"],
    oficinas: ["oficina", "despacho"],
    bodegas: ["bodega"],
    granjas: ["granja", "rancho"],
    locales: ["local", "comercial"],
    terrenos: ["terreno", "lote", "predio", "parcela"],
    naves: ["nave", "industrial"],
  };

  const filtered = useMemo(() => {
    const q = (qDebounced || "").trim();
    const parsed = parseQuery(q);
    const city = norm(filters.city || "");
    const opFilterRaw = (filters.operation || '') as '' | 'sale' | 'rental';
    const colony = norm(filters.colony || "");
    const bedroomsMin = typeof filters.bedroomsMin === 'number' ? filters.bedroomsMin : (parseInt(String(filters.bedroomsMin || ''), 10) || 0);
    const bathroomsMin = typeof filters.bathroomsMin === 'number' ? filters.bathroomsMin : (parseInt(String(filters.bathroomsMin || ''), 10) || 0);
    const areaMin = typeof filters.areaMin === 'number' ? filters.areaMin : (parseFloat(String(filters.areaMin || '')) || undefined);
    const areaMax = typeof filters.areaMax === 'number' ? filters.areaMax : (parseFloat(String(filters.areaMax || '')) || undefined);
    const [min, max] = (() => {
      switch (filters.price) {
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
      switch (filters.size) {
        case "20-200":
          return [20, 200];
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
      // operación (venta/renta): usar filtro explícito o lo detectado en el texto
      const opFilter = (opFilterRaw || parsed.operation) as (''|'sale'|'rental');
      if (opFilter) {
        const kind = (p as any).opKind as ('' | 'sale' | 'rental') || (String(p?.operations?.[0]?.type || '').toLowerCase().includes('rental') ? 'rental' : (String(p?.operations?.[0]?.type || '').toLowerCase().includes('sale') ? 'sale' : ''));
        if (kind !== opFilter) return false;
      }
      // El API ya filtra por estatus publicable; no duplicar el filtro aquí.
      // texto y campos relevantes normalizados
      const title = norm(String(p?.title || ""));
      const id = norm(String(p?.public_id || ""));
      const loc = norm(getLocationString(p));
      const typeText = norm(String(p?.property_type || ""));

      // filtro por tipo proveniente de la home (?type=...) o del select visual
      const typeSelect = norm(String(filters.type || ""));
      if (typeParam || typeSelect) {
        const tokens = TYPE_HINTS[typeParam] || [typeParam];
        const okParam = tokens.filter(Boolean).some((t) => typeText.includes(t));
        const okSelect = typeSelect ? typeText.includes(typeSelect) : true;
        const ok = (tokens.length ? okParam : true) && okSelect;
        if (!ok) return false;
      }

      // consulta libre: si hay q sin señales estructuradas, exige coincidencia textual
      if (q) {
        const hasSignals = Boolean(
          parsed.typeHints.length ||
          parsed.bedrooms || parsed.bathrooms || parsed.parking || parsed.place ||
          typeof parsed.sizeMin === 'number' ||
          typeof parsed.sizeRangeMin === 'number' ||
          typeof parsed.sizeBucketMin === 'number' ||
          typeof parsed.amenityGuess === 'number'
        );
        const qn = norm(q);
        const textMatch = title.includes(qn) || id.includes(qn) || loc.includes(qn) || typeText.includes(qn);
        if (!hasSignals && !textMatch) return false;
      }

      // type hints
      if (parsed.typeHints.length) {
        const okType = parsed.typeHints.some((hint) => typeText.includes(hint));
        if (!okType) return false;
      }

      // Ya no restringimos a terrenos cuando el usuario escribe solo un número; se filtra por m² en cualquier tipo.

      // recámaras/baños/estacionamiento explícitos
      if (typeof parsed.bedrooms === "number") {
        if (!(typeof p?.bedrooms === "number" && p.bedrooms >= parsed.bedrooms)) return false;
      }
      if (typeof parsed.bathrooms === "number") {
        if (!(typeof p?.bathrooms === "number" && p.bathrooms >= parsed.bathrooms)) return false;
      }
      if (typeof parsed.parking === "number") {
        if (!(typeof p?.parking_spaces === "number" && p.parking_spaces >= parsed.parking)) return false;
      }

      // mínimos explícitos desde filtros avanzados
      if (bedroomsMin > 0) {
        if (!(typeof p?.bedrooms === 'number' && p.bedrooms >= bedroomsMin)) return false;
      }
      if (bathroomsMin > 0) {
        if (!(typeof p?.bathrooms === 'number' && (p.bathrooms as number) >= bathroomsMin)) return false;
      }

      // número suelto pequeño => al menos una amenidad >= n
      if (typeof parsed.amenityGuess === 'number') {
        const n = parsed.amenityGuess;
        const okAmenity = [p?.bedrooms, p?.bathrooms, p?.parking_spaces].some(
          (v) => typeof v === 'number' && (v as number) >= n
        );
        if (!okAmenity) return false;
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

      // colonia/barrio explícito
      if (colony) {
        if (!loc.includes(colony)) return false;
      }

      // rango de precio
      const amount = getPriceAmount(p);
      if (amount != null && (amount < min || amount > max)) return false;

      // filtro de superficie desde el select
      const sqm = getSizeSqm(p);
      if (filters.size && sqm != null && (sqm < sMin || sqm > sMax)) return false;

      // área mínima/máxima explícita (si el usuario la define, exigimos dato de m²)
      if (typeof areaMin === 'number' && !Number.isNaN(areaMin)) {
        if (!(typeof sqm === 'number' && sqm >= areaMin)) return false;
      }
      if (typeof areaMax === 'number' && !Number.isNaN(areaMax)) {
        if (!(typeof sqm === 'number' && sqm <= areaMax)) return false;
      }

      // tamaño por bucket (número en la búsqueda o "500 m2")
      if (typeof parsed.sizeBucketMin === 'number' && typeof parsed.sizeBucketMax === 'number') {
        if (typeof sqm === 'number') {
          if (sqm < parsed.sizeBucketMin || sqm > parsed.sizeBucketMax) return false;
        } else {
          // si no hay dato de m², permitimos pasar
        }
      } else if (typeof parsed.sizeMin === "number") {
        // tamaño mínimo explícito
        if (!(typeof sqm === "number" && sqm >= parsed.sizeMin)) return false;
      }

      // tamaño desde número suelto (rango amplio) (fallback)
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
  }, [allProperties, filters.type, filters.city, filters.price, filters.size, filters.operation, filters.colony, filters.bedroomsMin, filters.bathroomsMin, filters.areaMin, filters.areaMax, qDebounced]);

  // Modo búsqueda completa: cuando el usuario aplica cualquier filtro/consulta,
  // pre-cargamos páginas sucesivas hasta cubrir todo el catálogo available,
  // para que la búsqueda se ejecute sobre el conjunto completo aun sin scroll.
  const [isPrefetching, setIsPrefetching] = useState(false);
  const [prefetchAll, setPrefetchAll] = useState(false);

  // Deshabilitar prefetch masivo durante búsqueda/filtros para evitar bloqueos
  useEffect(() => {
    setPrefetchAll(false);
  }, [qDebounced, filters.city, filters.price, filters.size, filters.type, filters.operation, filters.colony, filters.bedroomsMin, filters.bathroomsMin, filters.areaMin, filters.areaMax]);

  useEffect(() => {}, [prefetchAll, page, hasMore, loading, loadingMore, isPrefetching]);

  const clearFilters = () => {
    setFilters({ q: "", city: "", price: "", size: "", type: "", operation: '', bedroomsMin: '', bathroomsMin: '', colony: '', areaMin: '', areaMax: '' });
    setQRaw(""); setQDebounced("");
  };

  return (
    <Layout title="Propiedades">
      <Box bg="#F7F4EC">
        <Container maxW="7xl" py={{ base: 8, md: 12 }}>
          <Breadcrumb fontSize="sm" color="gray.600" mb={2}>
            <BreadcrumbItem><BreadcrumbLink as={Link} href="/">Inicio</BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbItem isCurrentPage><BreadcrumbLink href="#">Propiedades</BreadcrumbLink></BreadcrumbItem>
          </Breadcrumb>
          <Heading mb={4} color="#0E3B30" textAlign="center">Catálogo de Propiedades</Heading>

          <Wrap spacing={3} align="center" mb={2}>
            <WrapItem flex="1 1 260px" position='relative'>
              <InputGroup>
                <InputLeftElement pointerEvents="none">
                  <SearchIcon color="gray.400" />
                </InputLeftElement>
                <Input
                  bg="white"
                  placeholder="Buscar por título, ciudad o tipo"
                  value={qRaw}
                  onChange={(e) => { const v = e.target.value; setQRaw(v); }}
                  onFocus={() => { if (sug.length) setSugOpen(true); }}
                  onBlur={() => setTimeout(() => setSugOpen(false), 120)}
                />
              </InputGroup>
              {sugOpen && (
                <Box position='absolute' top='42px' left={0} right={0} zIndex={20} bg='white' borderWidth='1px' rounded='md' shadow='lg' maxH='60vh' overflowY='auto'>
                  <Box px={3} py={2} borderBottomWidth='1px' color='gray.600' fontSize='sm'>
                    {sugLoading ? 'Buscando…' : 'Sugerencias'}
                  </Box>
                  {sug.length === 0 && !sugLoading ? (
                    <Box px={3} py={3} color='gray.500' fontSize='sm'>Sin coincidencias</Box>
                  ) : (
                    sug.slice(0, 24).map((it, i) => (
                      <Box key={i} px={3} py={2} _hover={{ bg: 'gray.50' }} cursor='pointer' onMouseDown={(e) => e.preventDefault()} onClick={() => applySuggestion(it)}>
                        <Text fontWeight='medium'>{it.label}</Text>
                        <Text fontSize='xs' color='gray.500'>{it.type}</Text>
                      </Box>
                    ))
                  )}
                </Box>
              )}
            </WrapItem>
            <WrapItem>
              <Select bg="white" placeholder="Tipo" value={filters.type} onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))} minW="140px">
                {typeOptions.map((t) => (<option key={t} value={t}>{t}</option>))}
              </Select>
            </WrapItem>
            <WrapItem>
              <Select bg="white" placeholder="Ciudad" value={filters.city} onChange={(e) => setFilters((f) => ({ ...f, city: e.target.value }))} minW="140px">
                {cityOptions.map((c) => (<option key={c} value={c}>{c}</option>))}
              </Select>
            </WrapItem>
            <WrapItem>
              <Select bg="white" placeholder="Operación" value={filters.operation || ''} onChange={(e) => setFilters((f) => ({ ...f, operation: (e.target.value as any) }))} minW="140px">
                <option value='sale'>Venta</option>
                <option value='rental'>Renta</option>
              </Select>
            </WrapItem>
            <WrapItem>
              <Select bg="white" placeholder="Rango precio" value={filters.price} onChange={(e) => setFilters((f) => ({ ...f, price: e.target.value }))} minW="160px">
                <option value="0-1000000">&lt; $1M</option>
                <option value="1000000-3000000">$1M - $3M</option>
                <option value="3000000+">$3M+</option>
              </Select>
            </WrapItem>
            <WrapItem>
              <Select bg="white" placeholder="Tamaño" value={filters.size} onChange={(e) => setFilters((f) => ({ ...f, size: e.target.value }))} minW="140px">
                <option value="20-200">20 - 200 m²</option>
                <option value="200-500">200 - 500 m²</option>
                <option value="500-1000">500 - 1000 m²</option>
                <option value="1000+">1000+ m²</option>
              </Select>
            </WrapItem>
            {/* Toggle Avanzadas */}
            <AdvancedFiltersToggle
              filters={filters}
              setFilters={setFilters}
              colonyOptions={colonyOptions}
            />
            {/* Búsqueda automática: solo mantener Limpiar fuera */}
            <WrapItem>
              <Button variant="ghost" onClick={clearFilters}>Limpiar</Button>
            </WrapItem>
          </Wrap>

          {/* Separador visual sutil */}
          <Box h="1" />

        {loading ? (
          <Box>
            <SimpleGrid columns={[1, 2, 3]} spacing={6}>
              {Array.from({ length: 6 }).map((_, i) => (
                <Box key={i} borderWidth="1px" rounded="none" overflow="hidden">
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
        ) : (() => {
          const showEmpty = !loading && !loadingMore && !pendingMore && !isPrefetching && allProperties.length > 0 && filtered.length === 0;
          return showEmpty ? (
            <Center py={20}>
              <Text color="gray.500">No encontramos propiedades con esos filtros.</Text>
            </Center>
          ) : null;
        })() || (
          <>
            <Text mb={3} color="gray.600">
              {filtered.length} resultado{filtered.length === 1 ? "" : "s"}
            </Text>
            <SimpleGrid columns={[1, 2, 3]} spacing={6}>
              {filtered.map((p, i) => (
                <PropertyCard
                  key={p.public_id}
                  property={p}
                  priority={i < 3}
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
              ))}
            </SimpleGrid>
            {/* Sentinel para infinito: altura mayor para intersección más confiable */}
            <Box ref={loaderRef} h="32px" />
            {/* Fallback manual si el observer falla por cualquier razón */}
            {hasMore && !loadingMore && (
              <Center mt={4}>
                <Button onClick={() => fetchPage(page + 1)} variant="outline" colorScheme="green">
                  Cargar más
                </Button>
              </Center>
            )}
            {(pendingMore || loadingMore) && (
              <Box mt={6}>
                <SimpleGrid columns={[1, 2, 3]} spacing={6}>
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Box key={i} borderWidth="1px" rounded="none" overflow="hidden">
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
            )}
          </>
        )}
      </Container>
      </Box>
    </Layout>
  );
}

// Subcomponente: botón "Avanzadas" + panel desplegable
import { ChevronDownIcon, ChevronUpIcon } from "@chakra-ui/icons";
import { Collapse } from "@chakra-ui/react";

type AdvancedProps = {
  filters: FiltersState;
  setFilters: React.Dispatch<React.SetStateAction<FiltersState>>;
  colonyOptions: string[];
};

function AdvancedFiltersToggle({ filters, setFilters, colonyOptions }: AdvancedProps) {
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState({
    bedroomsMin: filters.bedroomsMin || '',
    bathroomsMin: filters.bathroomsMin || '',
    colony: filters.colony || '',
    areaMin: filters.areaMin || '',
    areaMax: filters.areaMax || '',
  });

  React.useEffect(() => {
    setDraft({
      bedroomsMin: filters.bedroomsMin || '',
      bathroomsMin: filters.bathroomsMin || '',
      colony: filters.colony || '',
      areaMin: filters.areaMin || '',
      areaMax: filters.areaMax || '',
    });
  }, [filters.bedroomsMin, filters.bathroomsMin, filters.colony, filters.areaMin, filters.areaMax]);

  const apply = () => {
    setFilters((f) => ({
      ...f,
      bedroomsMin: draft.bedroomsMin === '' ? '' : Number(draft.bedroomsMin),
      bathroomsMin: draft.bathroomsMin === '' ? '' : Number(draft.bathroomsMin),
      colony: draft.colony || '',
      areaMin: draft.areaMin === '' ? '' : Number(draft.areaMin),
      areaMax: draft.areaMax === '' ? '' : Number(draft.areaMax),
    }));
    setOpen(false);
  };

  return (
    <>
      <WrapItem>
        <Button variant="link" colorScheme="green" onClick={() => setOpen((v) => !v)} rightIcon={open ? <ChevronUpIcon /> : <ChevronDownIcon />}>Avanzadas</Button>
      </WrapItem>
      <Collapse in={open} style={{ width: '100%' }}>
        <Wrap spacing={3} align="center" mt={2}>
          <WrapItem>
            <Select bg="white" placeholder="Habitaciones" value={draft.bedroomsMin as any}
              onChange={(e) => setDraft((d) => ({ ...d, bedroomsMin: (e.target.value ? Number(e.target.value) : '') as any }))}
              minW="140px">
              {[1,2,3,4,5].map((n) => (<option key={n} value={n}>{n}+</option>))}
            </Select>
          </WrapItem>
          <WrapItem>
            <Select bg="white" placeholder="Baños" value={draft.bathroomsMin as any}
              onChange={(e) => setDraft((d) => ({ ...d, bathroomsMin: (e.target.value ? Number(e.target.value) : '') as any }))}
              minW="140px">
              {[1,2,3,4,5].map((n) => (<option key={n} value={n}>{n}+</option>))}
            </Select>
          </WrapItem>
          <WrapItem>
            <Select bg="white" placeholder="Colonia" value={draft.colony || ''} onChange={(e) => setDraft((d) => ({ ...d, colony: e.target.value }))} minW="160px">
              {colonyOptions.map((c) => (<option key={c} value={c}>{c}</option>))}
            </Select>
          </WrapItem>
          <WrapItem>
            <Input type="number" bg="white" placeholder="Min. área" value={String(draft.areaMin ?? '')}
              onChange={(e) => setDraft((d) => ({ ...d, areaMin: e.target.value === '' ? '' : Number(e.target.value) }))}
              minW="140px" />
          </WrapItem>
          <WrapItem>
            <Input type="number" bg="white" placeholder="Máx. área" value={String(draft.areaMax ?? '')}
              onChange={(e) => setDraft((d) => ({ ...d, areaMax: e.target.value === '' ? '' : Number(e.target.value) }))}
              minW="140px" />
          </WrapItem>
          <WrapItem>
            <Button colorScheme="green" onClick={apply}>Buscar</Button>
          </WrapItem>
        </Wrap>
      </Collapse>
    </>
  );
}
