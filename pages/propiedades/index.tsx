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

type FiltersState = { q: string; city: string; price: string; size: string; type?: string; operation?: '' | 'sale' | 'rental' };

export default function Propiedades() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [allProperties, setAllProperties] = useState<any[]>([]);
  const [filters, setFilters] = useState<FiltersState>({ q: "", city: "", price: "", size: "", type: "", operation: '' });
  const [qRaw, setQRaw] = useState("");
  const [qDebounced, setQDebounced] = useState("");
  // Debounce largo para filtrar resultados (evita trabajo pesado mientras tipeas)
  useEffect(() => { const h = setTimeout(() => setQDebounced(qRaw), 700); return () => clearTimeout(h); }, [qRaw]);
  // Debounce medio para sugerencias
  const [qSuggest, setQSuggest] = useState("");
  useEffect(() => { const h = setTimeout(() => setQSuggest(qRaw), 350); return () => clearTimeout(h); }, [qRaw]);
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
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('public.props.list.v1');
      if (raw) {
        const j = JSON.parse(raw);
        if (Array.isArray(j?.all) && typeof j?.page === 'number') {
          setAllProperties(j.all);
          setPage(j.page);
          setHasMore(Boolean(j.hasMore));
          setLoading(false);
          const y = Number(sessionStorage.getItem('public.props.scroll') || '0');
          if (y > 0) requestAnimationFrame(() => window.scrollTo(0, y));
        }
      }
    } catch {}
    return () => {
      try {
        sessionStorage.setItem('public.props.list.v1', JSON.stringify({ all: allProperties, page, hasMore }));
        sessionStorage.setItem('public.props.scroll', String(window.scrollY || 0));
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Lookahead prefetch: tras agregar una página, descargar la siguiente en background
  const lookaheadRef = useRef<number>(0);
  const isLookaheadRef = useRef(false);
  async function fetchPageSilent(nextPage: number, limit = 18) {
    try {
      isLookaheadRef.current = true;
      const res = await fetch(`/api/properties?limit=${limit}&page=${nextPage}`);
      const data = await res.json();
      const list = Array.isArray(data.content) ? data.content : [];
      const map = new Map<string, any>();
      for (const p of allProperties) map.set(String(p?.public_id || ''), p);
      const isPublicable = (s: any) => {
        if (!s) return false;
        const t = String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
        return [ 'available', 'disponible', 'active', 'activa', 'published', 'publicada', 'en venta', 'en renta' ].includes(t);
      };
      for (const p of list) {
        const id = String(p?.public_id || '');
        if (!id) continue;
        if (!isPublicable(p?.status)) continue;
        if (!map.has(id)) map.set(id, p);
      }
      setAllProperties(Array.from(map.values()));
      const totalPages = Math.max(parseInt(String(data?.pagination?.total_pages ?? '1')) || 1, 1);
      setPage(nextPage);
      setHasMore(nextPage < totalPages);
    } finally {
      isLookaheadRef.current = false;
    }
  }

  useEffect(() => {
    if (!hasMore) return;
    if (loading || loadingMore) return;
    // No lookahead durante búsqueda/filtros activos
    if ((qDebounced || '').trim() || filters.city || filters.price || filters.size || filters.type || filters.operation) return;
    if (lookaheadRef.current === page) return; // ya precargado para este page base
    lookaheadRef.current = page; // marca el base actual
    // precargar la siguiente página en background sin mostrar skeleton
    fetchPageSilent(page + 1).catch(() => {});
  }, [page, hasMore, loading, loadingMore, qDebounced, filters.city, filters.price, filters.size, filters.type, filters.operation]);

  async function fetchPage(nextPage: number, limit = 18) {
    const res = await fetch(`/api/properties?limit=${limit}&page=${nextPage}`);
    const data = await res.json();
    const list = Array.isArray(data.content) ? data.content : [];
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

    for (const p of list) {
      const id = String(p?.public_id || "");
      if (!id) continue;
      if (!isPublicable(p?.status)) continue;
      if (!map.has(id)) {
        let opKind: '' | 'sale' | 'rental' = '';
        try {
          const t = String(p?.operations?.[0]?.type || '').toLowerCase();
          if (t.includes('sale')) opKind = 'sale';
          else if (t.includes('rental')) opKind = 'rental';
        } catch {}
        map.set(id, { ...p, opKind });
      }
    }
    setAllProperties(Array.from(map.values()));
    const totalPages = Math.max(parseInt(String(data?.pagination?.total_pages ?? '1')) || 1, 1);
    setPage(nextPage);
    setHasMore(nextPage < totalPages);
    try { sessionStorage.setItem('public.props.list.v1', JSON.stringify({ all: Array.from(map.values()), page: nextPage, hasMore: nextPage < totalPages })); } catch {}
  }

  useEffect(() => {
    (async () => {
      try { await fetchPage(1); } finally { setLoading(false); }
    })();
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

    return { terms: tokens, typeHints, bedrooms, bathrooms, parking, place, sizeMin, sizeRangeMin, sizeRangeMax, sizeBucketMin, sizeBucketMax, impliedLandBySize, sizeGuess, amenityGuess }; 
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
    const opFilter = (filters.operation || '') as '' | 'sale' | 'rental';
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
      // operación (venta/renta) si está filtrada
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

      // rango de precio
      const amount = getPriceAmount(p);
      if (amount != null && (amount < min || amount > max)) return false;

      // filtro de superficie desde el select
      const sqm = getSizeSqm(p);
      if (filters.size && sqm != null && (sqm < sMin || sqm > sMax)) return false;

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
  }, [allProperties, filters.type, filters.city, filters.price, filters.size, filters.operation, qDebounced]);

  // Modo búsqueda completa: cuando el usuario aplica cualquier filtro/consulta,
  // pre-cargamos páginas sucesivas hasta cubrir todo el catálogo available,
  // para que la búsqueda se ejecute sobre el conjunto completo aun sin scroll.
  const [isPrefetching, setIsPrefetching] = useState(false);
  const [prefetchAll, setPrefetchAll] = useState(false);

  // Deshabilitar prefetch masivo durante búsqueda/filtros para evitar bloqueos
  useEffect(() => {
    setPrefetchAll(false);
  }, [qDebounced, filters.city, filters.price, filters.size, filters.type]);

  useEffect(() => {}, [prefetchAll, page, hasMore, loading, loadingMore, isPrefetching]);

  const clearFilters = () => {
    setFilters({ q: "", city: "", price: "", size: "", type: "", operation: '' });
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

          <Wrap spacing={3} align="center" mb={4}>
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
            {/* Búsqueda en vivo (debounced). Sin botón Buscar */}
            <WrapItem>
              <Button variant="ghost" onClick={clearFilters}>Limpiar</Button>
            </WrapItem>
          </Wrap>

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
              {filtered.map((p) => (
                <PropertyCard key={p.public_id} property={p} />
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
            )}
          </>
        )}
      </Container>
      </Box>
    </Layout>
  );
}
