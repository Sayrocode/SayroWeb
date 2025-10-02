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
  Collapse,
  SlideFade,
  IconButton,
  Divider,
  Stack,
  Drawer,
  DrawerOverlay,
  DrawerContent,
  DrawerBody,
  DrawerHeader,
  DrawerCloseButton,
  RangeSlider,
  RangeSliderTrack,
  RangeSliderFilledTrack,
  RangeSliderThumb,
  HStack,
} from "@chakra-ui/react";
import { SearchIcon, ChevronDownIcon, ChevronUpIcon } from "@chakra-ui/icons";
import { FiSliders } from "react-icons/fi";
import Link from "next/link";
import PropertyCard from "../../components/PropertyCard";

type FiltersState = {
  q: string;
  city: string;
  type?: string;
  operation?: '' | 'sale' | 'rental';
  bedroomsMin?: number | '';
  bathroomsMin?: number | '';
  parkingMin?: number | '';
  colony?: string;
  constructionMin?: number | '';
  constructionMax?: number | '';
  lotMin?: number | '';
  lotMax?: number | '';
  priceMin?: number | '';
  priceMax?: number | '';
};

const PRICE_FORMATTER = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 0,
});

const PRICE_COMPACT_FORMATTER = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  notation: 'compact',
  maximumFractionDigits: 1,
});

const PRICE_SLIDER_MIN = 500_000;
const PRICE_SLIDER_MAX = 100_000_000;

const AREA_FORMATTER = new Intl.NumberFormat('es-MX', {
  maximumFractionDigits: 0,
});

const AREA_COMPACT_FORMATTER = new Intl.NumberFormat('es-MX', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

const CONSTRUCTION_SLIDER_MIN = 0;
const CONSTRUCTION_SLIDER_MAX = 5_000;
const LOT_SLIDER_MIN = 0;
const LOT_SLIDER_MAX = 20_000;

export default function Propiedades() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [allProperties, setAllProperties] = useState<any[]>([]);
  const [filters, setFilters] = useState<FiltersState>({ q: "", city: "", type: "", operation: '', bedroomsMin: '', bathroomsMin: '', parkingMin: '', colony: '', constructionMin: '', constructionMax: '', lotMin: '', lotMax: '', priceMin: '', priceMax: '' });
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
    const ebTotal = ebTotalPagesRef.current;
    const ebMore = !ebDoneRef.current && (ebTotal == null || ebPageRef.current < ebTotal);
    const dbTotal = dbTotalPagesRef.current;
    const dbMore = dbTotal == null || dbPageRef.current < dbTotal;
    return ebMore || dbMore;
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

      const ebTarget = !ebDoneRef.current ? ebPageRef.current + 1 : null;
      const dbTarget = dbPageRef.current + 1;

    const sp = new URLSearchParams();
    if (filters.operation) sp.set('operation_type', filters.operation);
    if (typeof filters.priceMin === 'number') sp.set('min_price', String(filters.priceMin));
    if (typeof filters.priceMax === 'number') sp.set('max_price', String(filters.priceMax));
    if (typeof filters.bedroomsMin === 'number') sp.set('min_bedrooms', String(filters.bedroomsMin));
    if (typeof filters.bathroomsMin === 'number') sp.set('min_bathrooms', String(filters.bathroomsMin));
    if (typeof filters.parkingMin === 'number') sp.set('min_parking_spaces', String(filters.parkingMin));
    if (typeof filters.constructionMin === 'number') sp.set('min_construction_size', String(filters.constructionMin));
    if (typeof filters.constructionMax === 'number') sp.set('max_construction_size', String(filters.constructionMax));
    if (typeof filters.lotMin === 'number') sp.set('min_lot_size', String(filters.lotMin));
    if (typeof filters.lotMax === 'number') sp.set('max_lot_size', String(filters.lotMax));
    if (qDebounced.trim()) sp.set('q', qDebounced.trim());
    const [ebJson, dbJson] = await Promise.all([
      ebTarget
        ? (async () => {
            const primary = await fetch(`/api/easybroker/properties?limit=${limit}&page=${ebTarget}&${sp.toString()}`);
            if (primary.ok) return primary.json();
            const alt = await fetch(`/api/easybroker?endpoint=properties&limit=${limit}&page=${ebTarget}&${sp.toString()}`);
            if (alt.ok) return alt.json();
            return { content: [], pagination: { total_pages: ebPageRef.current } };
          })()
        : Promise.resolve(null),
      fetch(`/api/properties?limit=${limit}&page=${dbTarget}&${sp.toString()}`).then((r) => r.ok ? r.json() : ({ content: [], pagination: { total_pages: dbPageRef.current } })),
    ]);

      if (ebJson) {
        const ebList = Array.isArray(ebJson.content) ? ebJson.content : [];
        for (const p of ebList) {
          const id = String(p?.public_id || ''); if (!id) continue;
          const isEbId = id.toUpperCase().startsWith('EB-');
          if (!isEbId && !isPublicable(p?.status)) continue;
          if (!map.has(id)) map.set(id, p);
        }
        const total = parseInt(String(ebJson?.pagination?.total_pages ?? '')) || (ebList.length < limit ? (ebTarget as number) : (ebTarget as number) + 1);
        ebTotalPagesRef.current = total;
        ebPageRef.current = ebTarget as number;
        if (!ebList.length || ebPageRef.current >= total) ebDoneRef.current = true;
      }

      if (dbJson) {
        const dbList = Array.isArray(dbJson.content) ? dbJson.content : [];
        for (const p of dbList) {
          const id = String(p?.public_id || ''); if (!id) continue; if (!isPublicable(p?.status)) continue; if (!map.has(id)) map.set(id, p);
        }
        const totalDb = parseInt(String(dbJson?.pagination?.total_pages ?? '')) || (dbList.length < limit ? dbTarget : dbTarget + 1);
        dbTotalPagesRef.current = totalDb;
        dbPageRef.current = dbTarget;
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
    const hasActive = Boolean((qDebounced || '').trim() || filters.city || filters.type || filters.operation || filters.colony || filters.bedroomsMin || filters.bathroomsMin || filters.parkingMin || filters.constructionMin || filters.constructionMax || filters.lotMin || filters.lotMax || filters.priceMin || filters.priceMax);
    if (hasActive) return;
    if (lookaheadRef.current === page) return; // ya precargado para este page base
    lookaheadRef.current = page; // marca el base actual
    // precargar la siguiente página en background sin mostrar skeleton
    fetchPageSilent(page + 1).catch(() => {});
  }, [page, hasMore, loading, loadingMore, qDebounced, filters.city, filters.type, filters.operation, filters.colony, filters.bedroomsMin, filters.bathroomsMin, filters.parkingMin, filters.constructionMin, filters.constructionMax, filters.lotMin, filters.lotMax, filters.priceMin, filters.priceMax]);

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

    const ebTarget = !ebDoneRef.current ? ebPageRef.current + 1 : null;
    const dbTarget = dbPageRef.current + 1;

    const sp = new URLSearchParams();
    if (filters.operation) sp.set('operation_type', filters.operation);
    if (typeof filters.priceMin === 'number') sp.set('min_price', String(filters.priceMin));
    if (typeof filters.priceMax === 'number') sp.set('max_price', String(filters.priceMax));
    if (typeof filters.bedroomsMin === 'number') sp.set('min_bedrooms', String(filters.bedroomsMin));
    if (typeof filters.bathroomsMin === 'number') sp.set('min_bathrooms', String(filters.bathroomsMin));
    if (typeof filters.parkingMin === 'number') sp.set('min_parking_spaces', String(filters.parkingMin));
    if (typeof filters.constructionMin === 'number') sp.set('min_construction_size', String(filters.constructionMin));
    if (typeof filters.constructionMax === 'number') sp.set('max_construction_size', String(filters.constructionMax));
    if (typeof filters.lotMin === 'number') sp.set('min_lot_size', String(filters.lotMin));
    if (typeof filters.lotMax === 'number') sp.set('max_lot_size', String(filters.lotMax));
    if (qDebounced.trim()) sp.set('q', qDebounced.trim());
    const [ebJson, dbJson] = await Promise.all([
      ebTarget
        ? (async () => {
            const primary = await fetch(`/api/easybroker/properties?limit=${limit}&page=${ebTarget}&${sp.toString()}`);
            if (primary.ok) return primary.json();
            const alt = await fetch(`/api/easybroker?endpoint=properties&limit=${limit}&page=${ebTarget}&${sp.toString()}`);
            if (alt.ok) return alt.json();
            return { content: [], pagination: { total_pages: ebPageRef.current } };
          })()
        : Promise.resolve(null),
      fetch(`/api/properties?limit=${limit}&page=${dbTarget}&${sp.toString()}`).then((r) => r.ok ? r.json() : ({ content: [], pagination: { total_pages: dbPageRef.current } })),
    ]);

    if (ebJson) {
      const ebList = Array.isArray(ebJson.content) ? ebJson.content : [];
      for (const p of ebList) {
        const id = String(p?.public_id || ""); if (!id) continue;
        const isEbId = id.toUpperCase().startsWith('EB-');
        if (!isEbId && !isPublicable(p?.status)) continue;
        if (!map.has(id)) map.set(id, p);
      }
      const total = parseInt(String(ebJson?.pagination?.total_pages ?? '')) || (ebList.length < limit ? (ebTarget as number) : (ebTarget as number) + 1);
      ebTotalPagesRef.current = total;
      ebPageRef.current = ebTarget as number;
      if (!ebList.length || ebPageRef.current >= total) ebDoneRef.current = true;
    }

    if (dbJson) {
      const dbList = Array.isArray(dbJson.content) ? dbJson.content : [];
      for (const p of dbList) {
        const id = String(p?.public_id || ""); if (!id) continue; if (!isPublicable(p?.status)) continue; if (!map.has(id)) map.set(id, p);
      }
      const totalDb = parseInt(String(dbJson?.pagination?.total_pages ?? '')) || (dbList.length < limit ? dbTarget : dbTarget + 1);
      dbTotalPagesRef.current = totalDb;
      dbPageRef.current = dbTarget;
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
  const [showScrollCTA, setShowScrollCTA] = useState(false);
  const ctaTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY || 0;
      scrollingDownRef.current = y >= lastYRef.current;
      lastYRef.current = y;
      // Mostrar CTA mientras hay scroll y el usuario ya bajó suficiente
      if (y > 300) {
        setShowScrollCTA(true);
        if (ctaTimerRef.current) clearTimeout(ctaTimerRef.current);
        ctaTimerRef.current = setTimeout(() => setShowScrollCTA(false), 1400);
      } else {
        setShowScrollCTA(false);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (ctaTimerRef.current) clearTimeout(ctaTimerRef.current);
    };
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
  }, [loading, hasMore, allProperties.length]);

  // Opciones de municipio (lista completa de Querétaro)
  // Nota: se define después de las utilidades de municipios para evitar el TDZ.

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

  // Normalización de tipos (unifica variantes en etiquetas canónicas)
  function normalizeType(raw?: string | null): string {
    const s = String(raw || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const has = (w: string) => s.includes(w);
    // EB canon: Casa / Departamento / Terreno / Oficina / Local / Bodega / Nave
    if (has('casa')) return 'Casa';
    // Departamentos y sinónimos (EGO): departamento, depa, apto, apart, loft, duplex, triplex, ph, penthouse, bloque de departamentos, edificio, studio
    if (has('depart') || has('depa') || has('apto') || has('apart') || has('loft') || has('duplex') || has('triplex') || has('bloque de departamento') || has('edificio') || has('studio') || has('penthouse') || s === 'ph' || has('pent house')) return 'Departamento';
    if (has('terreno') || has('lote') || has('predio') || has('parcela')) return 'Terreno';
    if (has('oficina') || has('despacho')) return 'Oficina';
    if (has('local')) return 'Local';
    if (has('bodega')) return 'Bodega';
    if (has('nave') || has('industrial')) return 'Nave';
    // Otras residenciales: villa, rancho, quinta, casa en condominio → Casa
    if (has('villa') || has('rancho') || has('quinta') || has('condominio')) return 'Casa';
    // Fallback: regresar "Otro" para no contaminar opciones
    return 'Otro';
  }

  const typeOptions = useMemo(() => {
    const whitelist = ['Casa','Departamento','Terreno','Oficina','Local','Bodega','Nave'];
    const order = new Map(whitelist.map((t, i) => [t, i]));
    const set = new Set<string>();
    for (const p of allProperties) {
      const t = normalizeType((p as any)?.property_type);
      if (whitelist.includes(t)) set.add(t);
    }
    return Array.from(set).sort((a, b) => (order.get(a)! - order.get(b)!));
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

  // Municipios del estado de Querétaro (canónicos)
  const QRO_MUNICIPALITIES = React.useMemo(() => [
    'Amealco de Bonfil',
    'Arroyo Seco',
    'Cadereyta de Montes',
    'Colón',
    'Corregidora',
    'Ezequiel Montes',
    'Huimilpan',
    'Jalpan de Serra',
    'Landa de Matamoros',
    'El Marqués',
    'Pedro Escobedo',
    'Peñamiller',
    'Pinal de Amoles',
    'Querétaro',
    'San Joaquín',
    'San Juan del Río',
    'Tequisquiapan',
    'Tolimán',
  ], []);

  // Mapa de sinónimos normalizados -> nombre canónico
  const MUNICIPIO_SYNONYMS = React.useMemo(() => {
    const map: Record<string, string> = {};
    const add = (canon: string, ...syns: string[]) => { syns.forEach((s) => { map[norm(s)] = canon; }); map[norm(canon)] = canon; };
    add('Querétaro', 'Santiago de Querétaro', 'Queretaro');
    add('El Marqués', 'El Marques', 'Marques');
    add('San Juan del Río', 'San Juan del Rio');
    add('Tolimán', 'Toliman');
    add('Peñamiller', 'Penamiller');
    add('Colón', 'Colon');
    add('San Joaquín', 'San Joaquin');
    // Resto coinciden con su canónico
    QRO_MUNICIPALITIES.forEach((m) => { map[norm(m)] = m; });
    return map;
  }, [QRO_MUNICIPALITIES]);

  function canonicalMunicipio(raw?: string | null): string | null {
    if (!raw) return null;
    let s = String(raw);
    // Remover prefijos comunes y ruido
    s = s.replace(/\bmunicipio de\b\s*/i, '');
    s = s.replace(/^\s*nuevo\s+/i, '');
    const n = norm(s);

    // 1) Coincidencia directa exacta
    if (MUNICIPIO_SYNONYMS[n]) return MUNICIPIO_SYNONYMS[n];

    // 2) Coincidencia por tokens separados (coma, guión, slash, paréntesis)
    const tokens = n
      .split(/[\s,;\-\/|()]+/)
      .map((t) => t.trim())
      .filter(Boolean);
    for (const t of tokens) {
      if (MUNICIPIO_SYNONYMS[t]) return MUNICIPIO_SYNONYMS[t];
    }

    // 3) Coincidencia por palabra con límites (prefiere nombres largos)
    const keys = Object.keys(MUNICIPIO_SYNONYMS).sort((a, b) => b.length - a.length);
    const matches: string[] = [];
    for (const k of keys) {
      if (!k) continue;
      const re = new RegExp(`(^|[^a-zñ])${k}([^a-zñ]|$)`, 'i');
      if (re.test(n)) {
        const canon = MUNICIPIO_SYNONYMS[k];
        if (canon && !matches.includes(canon)) matches.push(canon);
      }
    }
    if (matches.length) {
      // Si hay múltiples coincidencias y una es Querétaro (estado) junto con otra,
      // priorizar la que no sea 'Querétaro'.
      const nonQro = matches.find((m) => m !== 'Querétaro');
      return (nonQro || matches[0]) || null;
    }

    return null;
  }

  function extractMunicipioFromProperty(p: any): string | null {
    const loc = p?.location;
    if (loc && typeof loc === 'object') {
      const o: any = loc;
      const candidates = [o.municipality, o.delegation, o.city, o.name, o.neighborhood];
      for (const c of candidates) {
        const canon = canonicalMunicipio(c);
        if (canon && QRO_MUNICIPALITIES.includes(canon)) return canon;
      }
    }
    const str = getLocationString(p);
    const canon = canonicalMunicipio(str);
    if (canon && QRO_MUNICIPALITIES.includes(canon)) return canon;
    return null;
  }

  // Opciones de municipio (lista completa de Querétaro)
  const municipalityOptions = useMemo(() => QRO_MUNICIPALITIES.slice(), [QRO_MUNICIPALITIES]);

  // Conteo por municipio no-bloqueante (idle) basado en la lista visible
  // Se declara después de 'filtered' para evitar TDZ

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
    const selectedMunicipio = canonicalMunicipio(filters.city || '') || '';
    const opFilterRaw = (filters.operation || '') as '' | 'sale' | 'rental';
    const colony = norm(filters.colony || "");
    const bedroomsMin = typeof filters.bedroomsMin === 'number' ? filters.bedroomsMin : (parseInt(String(filters.bedroomsMin || ''), 10) || 0);
    const bathroomsMin = typeof filters.bathroomsMin === 'number' ? filters.bathroomsMin : (parseInt(String(filters.bathroomsMin || ''), 10) || 0);
    const min = typeof filters.priceMin === 'number' ? filters.priceMin : 0;
    const max = typeof filters.priceMax === 'number' ? filters.priceMax : Infinity;
    const consMin = typeof filters.constructionMin === 'number' ? filters.constructionMin : undefined;
    const consMax = typeof filters.constructionMax === 'number' ? filters.constructionMax : undefined;
    const lotMin = typeof filters.lotMin === 'number' ? filters.lotMin : undefined;
    const lotMax = typeof filters.lotMax === 'number' ? filters.lotMax : undefined;

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

      // filtro por tipo: usar etiqueta canónica tanto para param (?type=...) como para select
      const selectCanon = String(filters.type || '').trim();
      const urlCanon = (() => {
        if (!typeParam) return '';
        const tokens = TYPE_HINTS[typeParam] || [];
        // Mapear tokens a una etiqueta canónica aproximada
        if (tokens.some((t) => ['casa'].includes(t))) return 'Casa';
        if (tokens.some((t) => ['departamento','depa','dept'].includes(t))) return 'Departamento';
        if (tokens.some((t) => ['terreno','lote','predio','parcela'].includes(t))) return 'Terreno';
        if (tokens.some((t) => ['oficina','despacho'].includes(t))) return 'Oficina';
        if (tokens.some((t) => ['local','comercial'].includes(t))) return 'Local';
        if (tokens.some((t) => ['bodega'].includes(t))) return 'Bodega';
        if (tokens.some((t) => ['nave','industrial'].includes(t))) return 'Nave';
        if (tokens.some((t) => ['loft','penthouse','ph'].includes(t))) return 'Departamento';
        return '';
      })();
      if (selectCanon || urlCanon) {
        const canon = normalizeType((p as any)?.property_type);
        const okSelect = selectCanon ? canon === selectCanon : true;
        const okParam = urlCanon ? canon === urlCanon : true;
        if (!(okSelect && okParam)) return false;
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
      // Filtros exactos: habitaciones y baños
      if (bedroomsMin > 0) {
        if (!(typeof p?.bedrooms === 'number' && p.bedrooms >= bedroomsMin)) return false;
      }
      if (bathroomsMin > 0) {
        const bVal = typeof p?.bathrooms === 'number' ? Math.floor(p.bathrooms as number) : null;
        if (!(typeof bVal === 'number' && bVal >= bathroomsMin)) return false;
      }
      if (typeof filters.parkingMin === 'number' && filters.parkingMin > 0) {
        if (!(typeof p?.parking_spaces === 'number' && p.parking_spaces >= (filters.parkingMin as number))) return false;
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

      // municipio exacto si se eligió del select
      if (selectedMunicipio) {
        const propMun = extractMunicipioFromProperty(p);
        if (!propMun) return false;
        if (norm(propMun) !== norm(selectedMunicipio)) return false;
      }

      // colonia/barrio explícito
      if (colony) {
        if (!loc.includes(colony)) return false;
      }

      // rango de precio
      const amount = getPriceAmount(p);
      if (amount != null && (amount < min || amount > max)) return false;

      // tamaños: aplicar por construcción y/o terreno si se especifica
      const cons = typeof p?.construction_size === 'number' ? (p.construction_size as number) : undefined;
      const lot = typeof p?.lot_size === 'number' ? (p.lot_size as number) : undefined;
      if (typeof consMin === 'number' && typeof cons === 'number' && cons < consMin) return false;
      if (typeof consMax === 'number' && typeof cons === 'number' && cons > consMax) return false;
      if (typeof lotMin === 'number' && typeof lot === 'number' && lot < lotMin) return false;
      if (typeof lotMax === 'number' && typeof lot === 'number' && lot > lotMax) return false;

      // tamaño por bucket (número en la búsqueda o "500 m2")
      const sqm = getSizeSqm(p);
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
  }, [allProperties, filters.type, filters.city, filters.operation, filters.colony, filters.bedroomsMin, filters.bathroomsMin, filters.parkingMin, filters.constructionMin, filters.constructionMax, filters.lotMin, filters.lotMax, filters.priceMin, filters.priceMax, qDebounced]);

  const priceBounds = useMemo(() => ({
    min: PRICE_SLIDER_MIN,
    max: PRICE_SLIDER_MAX,
  }), []);

  // Conteo por municipio no-bloqueante (idle) basado en la lista visible
  const [municipalityCounts, setMunicipalityCounts] = useState<Map<string, number>>(new Map());
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const list = filtered || [];
    const idle = (cb: () => void) => (typeof (window as any).requestIdleCallback === 'function')
      ? (window as any).requestIdleCallback(cb, { timeout: 400 })
      : setTimeout(cb, 16) as any;
    const cancel = (id: any) => (typeof (window as any).cancelIdleCallback === 'function')
      ? (window as any).cancelIdleCallback(id)
      : clearTimeout(id);
    const id = idle(() => {
      const map = new Map<string, number>();
      const add = (k?: string | null) => { if (!k) return; map.set(k, (map.get(k) || 0) + 1); };
      for (const p of list) add(extractMunicipioFromProperty(p));
      setMunicipalityCounts(map);
    });
    return () => cancel(id);
  }, [filtered]);

  // Sincronizar filtros ↔ URL (consulta compartible) solo cuando estamos en el listado
  useEffect(() => {
    const path = String((router.asPath || '').split('?')[0] || '');
    if (path !== '/propiedades') return; // Evitar sobre-escribir URL cuando navegamos al detalle

    const q: Record<string, any> = {};
    if (filters.operation) q.operation_type = filters.operation;
    if (typeof filters.priceMin === 'number') q.min_price = filters.priceMin;
    if (typeof filters.priceMax === 'number') q.max_price = filters.priceMax;
    if (typeof filters.bedroomsMin === 'number') q.min_bedrooms = filters.bedroomsMin;
    if (typeof filters.bathroomsMin === 'number') q.min_bathrooms = filters.bathroomsMin;
    if (typeof filters.parkingMin === 'number') q.min_parking_spaces = filters.parkingMin;
    if (typeof filters.constructionMin === 'number') q.min_construction_size = filters.constructionMin;
    if (typeof filters.constructionMax === 'number') q.max_construction_size = filters.constructionMax;
    if (typeof filters.lotMin === 'number') q.min_lot_size = filters.lotMin;
    if (typeof filters.lotMax === 'number') q.max_lot_size = filters.lotMax;
    if ((qDebounced || '').trim()) q.q = qDebounced.trim();

    // Evitar replace innecesario si no cambia el querystring
    const next = new URLSearchParams(Object.entries(q).map(([k, v]) => [k, String(v)])).toString();
    const current = String((router.asPath.split('?')[1] || ''));
    if (next === current) return;

    try { router.replace({ pathname: '/propiedades', query: q }, undefined, { shallow: true }); } catch {}
  }, [router.asPath, qDebounced, filters.operation, filters.priceMin, filters.priceMax, filters.bedroomsMin, filters.bathroomsMin, filters.parkingMin, filters.constructionMin, filters.constructionMax, filters.lotMin, filters.lotMax]);

  // Modo búsqueda completa: cuando el usuario aplica cualquier filtro/consulta,
  // pre-cargamos páginas sucesivas hasta cubrir todo el catálogo available,
  // para que la búsqueda se ejecute sobre el conjunto completo aun sin scroll.
  const [isPrefetching, setIsPrefetching] = useState(false);
  const [prefetchAll, setPrefetchAll] = useState(false);

  // Deshabilitar prefetch masivo durante búsqueda/filtros para evitar bloqueos
  useEffect(() => {
    setPrefetchAll(false);
  }, [qDebounced, filters.city, filters.type, filters.operation, filters.colony, filters.bedroomsMin, filters.bathroomsMin, filters.parkingMin, filters.constructionMin, filters.constructionMax, filters.lotMin, filters.lotMax, filters.priceMin, filters.priceMax]);

  useEffect(() => {}, [prefetchAll, page, hasMore, loading, loadingMore, isPrefetching]);

  // Reinicia paginación/estado y recarga desde la primera página (modo normal)
  const resetListing = React.useCallback(async () => {
    try {
      // Reset paginación/flags
      ebPageRef.current = 0; ebTotalPagesRef.current = null; ebDoneRef.current = false;
      dbPageRef.current = 0; dbTotalPagesRef.current = null;
      lookaheadRef.current = 0; isLookaheadRef.current = false;
      // Reset items y página
      setAllProperties([]);
      setPage(1);
      setHasMore(true);
      setLoading(true);
      await fetchPage(1);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearFilters = async () => {
    setFilters({ q: "", city: "", type: "", operation: '', bedroomsMin: '', bathroomsMin: '', parkingMin: '', colony: '', constructionMin: '', constructionMax: '', lotMin: '', lotMax: '', priceMin: '', priceMax: '' });
    setQRaw(""); setQDebounced("");
    // Limpiar query de tipo en la URL para evitar filtro residual
    try { await router.replace({ pathname: '/propiedades', query: {} }, undefined, { shallow: true }); } catch {}
    await resetListing();
  };

  // Al limpiar el searchbox (qDebounced vacío) y no hay filtros activos, restablecer listado normal
  React.useEffect(() => {
    const noFilters = !(filters.city || filters.type || filters.operation || filters.colony || filters.bedroomsMin || filters.bathroomsMin || filters.parkingMin || filters.constructionMin || filters.constructionMax || filters.lotMin || filters.lotMax || filters.priceMin || filters.priceMax);
    if ((qDebounced || '').trim() === '' && noFilters) {
      // Evita rehacer si ya hay items cargados
      if (allProperties.length === 0) {
        resetListing().catch(() => {});
      }
    }
  }, [qDebounced, filters.city, filters.type, filters.operation, filters.colony, filters.bedroomsMin, filters.bathroomsMin, filters.parkingMin, filters.constructionMin, filters.constructionMax, filters.lotMin, filters.lotMax, filters.priceMin, filters.priceMax, allProperties.length, resetListing]);

  return (
    <Layout title="Propiedades">
      <Box bg="#F7F4EC">
        <Container maxW="7xl" py={{ base: 8, md: 12 }}>
          <Breadcrumb fontSize="sm" color="gray.600" mb={2}>
            <BreadcrumbItem><BreadcrumbLink as={Link} href="/">Inicio</BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbItem isCurrentPage><BreadcrumbLink href="#">Propiedades</BreadcrumbLink></BreadcrumbItem>
          </Breadcrumb>
          <Heading  fontFamily="'Binggo Wood', heading" mb={4} color="#0E3B30" textAlign="center">Catálogo de Propiedades</Heading>

          <Wrap spacing={3} align="center" mb={4}>
            <WrapItem display={{ base: 'block', md: 'none' }}>
              <IconButton
                display={{ base: 'inline-flex', md: 'none' }}
                aria-label="Abrir filtros"
                icon={<FiSliders />}
                variant="outline"
                onClick={() => setSidebarOpen(true)}
              />
            </WrapItem>
            <WrapItem display={{ base: 'none', md: 'inline-flex' }}>
              <Button
                leftIcon={<FiSliders />}
                variant="outline"
                onClick={() => setSidebarOpen(true)}
              >
                Filtros
              </Button>
            </WrapItem>
            <WrapItem flex="1 1 280px" position='relative'>
              <InputGroup>
                <InputLeftElement pointerEvents="none">
                  <SearchIcon color="gray.400" />
                </InputLeftElement>
                <Input
                  bg="white"
                  placeholder="Buscar por título, municipio o tipo"
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
              <Select bg="white" placeholder="Tipo" value={filters.type} onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))} minW="160px">
                {typeOptions.map((t) => (<option key={t} value={t}>{t}</option>))}
              </Select>
            </WrapItem>
            <WrapItem>
              <Select bg="white" placeholder="Municipio" value={filters.city} onChange={(e) => setFilters((f) => ({ ...f, city: e.target.value }))} minW="220px">
                {municipalityOptions
                  .filter((m) => {
                    if (!municipalityCounts || municipalityCounts.size === 0) return true;
                    return (municipalityCounts.get(m) || 0) > 0;
                  })
                  .map((m) => (
                    <option key={m} value={m}>
                      {m} ({municipalityCounts.get(m) || 0})
                    </option>
                  ))}
              </Select>
            </WrapItem>
          </Wrap>

          <Drawer placement="left" isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} size="sm">
            <DrawerOverlay />
            <DrawerContent>
              <DrawerCloseButton mt={2} />
              <DrawerHeader borderBottomWidth="1px">Filtros</DrawerHeader>
              <DrawerBody>
                <FiltersSidebarContent
                  filters={filters}
                  setFilters={setFilters}
                  colonyOptions={colonyOptions}
                  clearFilters={clearFilters}
                  priceBounds={priceBounds}
                  onClose={() => setSidebarOpen(false)}
                />
              </DrawerBody>
            </DrawerContent>
          </Drawer>

          <Box w="full">
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
                {/* Virtualización simple por ventanas para catálogos grandes */}
                <VirtualizedGrid items={filtered} estimateRowHeight={360} gap={24} />
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
          </Box>
        </Container>
      </Box>

      {/* CTA flotante mientras se hace scroll */}
      <SlideFade in={showScrollCTA} offsetY="24px" style={{ pointerEvents: 'none' }}>
        <Box position="fixed" left="50%" transform="translateX(-50%)" bottom={{ base: 24, md: 10 }} zIndex={40}>
          <Button as={Link} href="/contacto" bg="#0E3B30" _hover={{ bg: "#0B2B23" }} color="white" size="lg" px={8} py={6} rounded="full" shadow="xl" fontWeight="semibold" letterSpacing="wide" style={{ pointerEvents: 'auto' }}>
            ¿No encontraste lo que buscabas?
          </Button>
        </Box>
      </SlideFade>
    </Layout>
  );
}

// Componente: grid virtualizado simple con padding arriba/abajo
function VirtualizedGrid({ items, estimateRowHeight = 360, gap = 24 }: { items: any[]; estimateRowHeight?: number; gap?: number }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [cols, setCols] = useState(3);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(0);
  const [topPad, setTopPad] = useState(0);
  const [bottomPad, setBottomPad] = useState(0);

  // Resolver columnas según width (acorde a SimpleGrid columns={[1,2,3]})
  const resolveCols = () => {
    const w = typeof window !== 'undefined' ? window.innerWidth : 1200;
    if (w < 640) return 1;
    if (w < 1024) return 2;
    return 3;
  };

  useEffect(() => {
    const onResize = () => setCols(resolveCols());
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const viewportH = window.innerHeight || 0;
      const rowH = estimateRowHeight + gap;
      const firstRowTop = rect.top + window.scrollY; // posición del inicio del grid
      const scrollY = window.scrollY;
      const offset = Math.max(0, scrollY - firstRowTop);
      const startRow = Math.floor(offset / rowH);
      const visibleRows = Math.ceil(viewportH / rowH) + 2; // overscan 2 filas
      const totalRows = Math.ceil(items.length / Math.max(cols, 1));
      const s = Math.max(0, Math.min(items.length, startRow * cols));
      const e = Math.max(s, Math.min(items.length, (startRow + visibleRows) * cols));
      setStart(s);
      setEnd(e);
      setTopPad(Math.max(0, startRow * rowH));
      const rowsAfter = Math.max(0, totalRows - Math.ceil(e / Math.max(cols, 1)));
      setBottomPad(rowsAfter * rowH);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); };
  }, [items.length, cols, estimateRowHeight, gap]);

  // Si pocos elementos, no virtualizar
  const useVirtual = items.length >= 60;
  const slice = useVirtual ? items.slice(start, end) : items;

  return (
    <Box ref={containerRef}>
      {useVirtual && <Box style={{ height: `${topPad}px` }} />}
      <SimpleGrid columns={[1, 2, 3]} spacing={6}>
        {slice.map((p: any, i: number) => (
          <PropertyCard
            key={p.public_id}
            property={p}
            priority={i < 3}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ))}
      </SimpleGrid>
      {useVirtual && <Box style={{ height: `${bottomPad}px` }} />}
    </Box>
  );
}

type FiltersSidebarContentProps = {
  filters: FiltersState;
  setFilters: React.Dispatch<React.SetStateAction<FiltersState>>;
  colonyOptions: string[];
  clearFilters: () => void | Promise<void>;
  priceBounds: { min: number; max: number } | null;
  onClose?: () => void;
};

function FiltersSidebarContent({ filters, setFilters, colonyOptions, clearFilters, priceBounds, onClose }: FiltersSidebarContentProps) {
  const [advancedOpen, setAdvancedOpen] = React.useState(false);
  const [draft, setDraft] = React.useState({
    bedroomsMin: filters.bedroomsMin || '',
    bathroomsMin: filters.bathroomsMin || '',
    parkingMin: filters.parkingMin || '',
    colony: filters.colony || '',
    constructionMin: filters.constructionMin || '',
    constructionMax: filters.constructionMax || '',
    lotMin: filters.lotMin || '',
    lotMax: filters.lotMax || '',
  });
  const [constructionRange, setConstructionRange] = React.useState<[number, number]>([CONSTRUCTION_SLIDER_MIN, CONSTRUCTION_SLIDER_MAX]);
  const [lotRange, setLotRange] = React.useState<[number, number]>([LOT_SLIDER_MIN, LOT_SLIDER_MAX]);

  const clampConstructionValue = React.useCallback((value: number) => {
    if (!Number.isFinite(value)) return CONSTRUCTION_SLIDER_MIN;
    return Math.min(Math.max(value, CONSTRUCTION_SLIDER_MIN), CONSTRUCTION_SLIDER_MAX);
  }, []);

  const clampLotValue = React.useCallback((value: number) => {
    if (!Number.isFinite(value)) return LOT_SLIDER_MIN;
    return Math.min(Math.max(value, LOT_SLIDER_MIN), LOT_SLIDER_MAX);
  }, []);

  React.useEffect(() => {
    setDraft({
      bedroomsMin: filters.bedroomsMin || '',
      bathroomsMin: filters.bathroomsMin || '',
      parkingMin: filters.parkingMin || '',
      colony: filters.colony || '',
      constructionMin: filters.constructionMin || '',
      constructionMax: filters.constructionMax || '',
      lotMin: filters.lotMin || '',
      lotMax: filters.lotMax || '',
    });
    const nextConstructionMin = typeof filters.constructionMin === 'number' ? filters.constructionMin : CONSTRUCTION_SLIDER_MIN;
    const nextConstructionMax = typeof filters.constructionMax === 'number' ? filters.constructionMax : CONSTRUCTION_SLIDER_MAX;
    setConstructionRange([
      clampConstructionValue(nextConstructionMin),
      clampConstructionValue(nextConstructionMax),
    ]);
    const nextLotMin = typeof filters.lotMin === 'number' ? filters.lotMin : LOT_SLIDER_MIN;
    const nextLotMax = typeof filters.lotMax === 'number' ? filters.lotMax : LOT_SLIDER_MAX;
    setLotRange([
      clampLotValue(nextLotMin),
      clampLotValue(nextLotMax),
    ]);
  }, [filters.bedroomsMin, filters.bathroomsMin, filters.parkingMin, filters.colony, filters.constructionMin, filters.constructionMax, filters.lotMin, filters.lotMax, clampConstructionValue, clampLotValue]);

  const effectiveBounds = React.useMemo(() => {
    if (priceBounds && Number.isFinite(priceBounds.min) && Number.isFinite(priceBounds.max) && priceBounds.max > priceBounds.min) {
      return priceBounds;
    }
    if (priceBounds && priceBounds.max === priceBounds.min) {
      const base = priceBounds.min;
      return { min: Math.max(PRICE_SLIDER_MIN, base - 50000), max: PRICE_SLIDER_MAX };
    }
    return { min: PRICE_SLIDER_MIN, max: PRICE_SLIDER_MAX };
  }, [priceBounds]);

  const sliderMin = effectiveBounds.min;
  const sliderMax = effectiveBounds.max;

  const clampValue = React.useCallback((value: number) => {
    if (!Number.isFinite(value)) return sliderMin;
    return Math.min(Math.max(value, sliderMin), sliderMax);
  }, [sliderMin, sliderMax]);

  const [priceRange, setPriceRange] = React.useState<[number, number]>([sliderMin, sliderMax]);

  React.useEffect(() => {
    const nextMin = typeof filters.priceMin === 'number' ? filters.priceMin : sliderMin;
    const nextMax = typeof filters.priceMax === 'number' ? filters.priceMax : sliderMax;
    setPriceRange([clampValue(nextMin), clampValue(nextMax)]);
  }, [filters.priceMin, filters.priceMax, sliderMin, sliderMax, clampValue]);

  const formatCurrency = React.useCallback((value: number, opts?: { compact?: boolean }) => {
    const rounded = Math.max(0, Math.round(value));
    if (opts?.compact) {
      return PRICE_COMPACT_FORMATTER.format(rounded);
    }
    return PRICE_FORMATTER.format(rounded);
  }, []);

  const priceStep = React.useMemo(() => {
    const span = sliderMax - sliderMin;
    if (span <= 500000) return 10000;
    if (span <= 2000000) return 50000;
    if (span <= 5000000) return 100000;
    if (span <= 20000000) return 250000;
    return 500000;
  }, [sliderMin, sliderMax]);

  const commitPriceRange = React.useCallback((minValue: number, maxValue: number, opts?: { noMin?: boolean; noMax?: boolean }) => {
    const low = Math.min(minValue, maxValue);
    const high = Math.max(minValue, maxValue);
    const normalizedLow = Math.round(Math.max(sliderMin, low));
    const normalizedHigh = Math.round(Math.min(sliderMax, high));
    setFilters((prev) => ({
      ...prev,
      priceMin: opts?.noMin ? '' : normalizedLow,
      priceMax: opts?.noMax ? '' : normalizedHigh,
    }));
  }, [setFilters, sliderMin, sliderMax]);

  const formatArea = React.useCallback((value: number, opts?: { compact?: boolean }) => {
    const rounded = Math.max(0, Math.round(value));
    const formatted = opts?.compact
      ? AREA_COMPACT_FORMATTER.format(rounded)
      : AREA_FORMATTER.format(rounded);
    return `${formatted} m²`;
  }, []);

  const constructionStep = React.useMemo(() => {
    const span = CONSTRUCTION_SLIDER_MAX - CONSTRUCTION_SLIDER_MIN;
    if (span <= 1000) return 10;
    if (span <= 5000) return 25;
    if (span <= 10000) return 50;
    return 100;
  }, []);

  const lotStep = React.useMemo(() => {
    const span = LOT_SLIDER_MAX - LOT_SLIDER_MIN;
    if (span <= 1000) return 20;
    if (span <= 5000) return 50;
    if (span <= 10000) return 100;
    if (span <= 40000) return 250;
    return 500;
  }, []);

  const commitConstructionRange = React.useCallback((minValue: number, maxValue: number, opts?: { noMin?: boolean; noMax?: boolean }) => {
    const low = Math.min(minValue, maxValue);
    const high = Math.max(minValue, maxValue);
    const normalizedLow = clampConstructionValue(low);
    const normalizedHigh = clampConstructionValue(high);
    setDraft((prev) => ({
      ...prev,
      constructionMin: opts?.noMin ? '' : normalizedLow,
      constructionMax: opts?.noMax ? '' : normalizedHigh,
    }));
  }, [clampConstructionValue]);

  const commitLotRange = React.useCallback((minValue: number, maxValue: number, opts?: { noMin?: boolean; noMax?: boolean }) => {
    const low = Math.min(minValue, maxValue);
    const high = Math.max(minValue, maxValue);
    const normalizedLow = clampLotValue(low);
    const normalizedHigh = clampLotValue(high);
    setDraft((prev) => ({
      ...prev,
      lotMin: opts?.noMin ? '' : normalizedLow,
      lotMax: opts?.noMax ? '' : normalizedHigh,
    }));
  }, [clampLotValue]);

  const applyAdvanced = () => {
    setFilters((f) => ({
      ...f,
      bedroomsMin: draft.bedroomsMin === '' ? '' : Number(draft.bedroomsMin),
      bathroomsMin: draft.bathroomsMin === '' ? '' : Number(draft.bathroomsMin),
      parkingMin: draft.parkingMin === '' ? '' : Number(draft.parkingMin),
      colony: draft.colony || '',
      constructionMin: draft.constructionMin === '' ? '' : Number(draft.constructionMin),
      constructionMax: draft.constructionMax === '' ? '' : Number(draft.constructionMax),
      lotMin: draft.lotMin === '' ? '' : Number(draft.lotMin),
      lotMax: draft.lotMax === '' ? '' : Number(draft.lotMax),
    }));
    setAdvancedOpen(false);
    onClose?.();
  };

  const handleClear = async () => {
    await Promise.resolve(clearFilters());
    onClose?.();
  };

  return (
    <Stack spacing={6} fontSize="sm">
      <Stack spacing={2}>
        <Text fontWeight="medium" color="gray.700">Operación</Text>
        <Select
          bg="gray.50"
          value={filters.operation || ''}
          onChange={(e) => setFilters((f) => ({ ...f, operation: e.target.value as FiltersState['operation'] }))}
        >
          <option value=''>Todas</option>
          <option value='sale'>Venta</option>
          <option value='rental'>Renta</option>
        </Select>
      </Stack>

      <Stack spacing={2}>
        <Text fontWeight="medium" color="gray.700">Precio</Text>
        <Stack spacing={3}>
          <HStack justify="space-between" fontSize="xs" fontWeight="medium" color="gray.600" px={1}>
            <Text>{filters.priceMin === '' && priceRange[0] <= sliderMin ? 'Sin mínimo' : formatCurrency(priceRange[0], { compact: true })}</Text>
            <Text>{filters.priceMax === '' && priceRange[1] >= sliderMax ? 'Sin máximo' : formatCurrency(priceRange[1], { compact: true })}</Text>
          </HStack>
          <Box px={1} pt={2} pb={2} bg="gray.50" rounded="md">
            <RangeSlider
              aria-label={['Precio mínimo', 'Precio máximo']}
              colorScheme="green"
              min={sliderMin}
              max={sliderMax}
              step={priceStep}
              value={priceRange}
              onChange={(val) => setPriceRange(val as [number, number])}
              onChangeEnd={(val) => {
                const [minVal, maxVal] = val as [number, number];
                commitPriceRange(minVal, maxVal, {
                  noMin: minVal <= sliderMin && filters.priceMin === '',
                  noMax: maxVal >= sliderMax && filters.priceMax === '',
                });
              }}
            >
              <RangeSliderTrack bg="gray.200">
                <RangeSliderFilledTrack bg="#0E3B30" />
              </RangeSliderTrack>
              <RangeSliderThumb index={0} boxSize={4} bg="white" borderWidth="1px" borderColor="gray.200" shadow="sm" />
              <RangeSliderThumb index={1} boxSize={4} bg="white" borderWidth="1px" borderColor="gray.200" shadow="sm" />
            </RangeSlider>
          </Box>
          <HStack justify="space-between" fontSize="xs" color="gray.500" px={1}>
            <Text>{formatCurrency(sliderMin, { compact: true })}</Text>
            <Text>{formatCurrency(sliderMax, { compact: true })}</Text>
          </HStack>
          <HStack spacing={3}>
            <Input
              bg="gray.50"
              type="number"
              inputMode="numeric"
              placeholder="Mínimo"
              value={typeof filters.priceMin === 'number' ? String(filters.priceMin) : ''}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === '') {
                  setPriceRange(([_, maxVal]) => [sliderMin, maxVal]);
                  setFilters((prev) => ({ ...prev, priceMin: '' }));
                  return;
                }
                const parsed = Number(raw);
                if (Number.isNaN(parsed)) return;
                const clamped = clampValue(parsed);
                setPriceRange(([_, maxVal]) => [clamped, maxVal]);
                const currentMax = typeof filters.priceMax === 'number' ? filters.priceMax : sliderMax;
                commitPriceRange(clamped, currentMax, {
                  noMax: filters.priceMax === '' && currentMax >= sliderMax,
                });
              }}
            />
            <Input
              bg="gray.50"
              type="number"
              inputMode="numeric"
              placeholder="Máximo"
              value={typeof filters.priceMax === 'number' ? String(filters.priceMax) : ''}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === '') {
                  setPriceRange(([minVal]) => [minVal, sliderMax]);
                  setFilters((prev) => ({ ...prev, priceMax: '' }));
                  return;
                }
                const parsed = Number(raw);
                if (Number.isNaN(parsed)) return;
                const clamped = clampValue(parsed);
                setPriceRange(([minVal]) => [minVal, clamped]);
                const currentMin = typeof filters.priceMin === 'number' ? filters.priceMin : sliderMin;
                commitPriceRange(currentMin, clamped, {
                  noMin: filters.priceMin === '' && currentMin <= sliderMin,
                });
              }}
            />
          </HStack>
        </Stack>
      </Stack>

      <Divider />

      <Stack spacing={3}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAdvancedOpen((v) => !v)}
          rightIcon={advancedOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
          justifyContent="space-between"
        >
          Filtros avanzados
        </Button>
        <Collapse in={advancedOpen} animateOpacity>
          <Stack spacing={3} mt={2}>
            <Select
              bg="gray.50"
              placeholder="Habitaciones mínimas"
              value={draft.bedroomsMin as any}
              onChange={(e) => setDraft((d) => ({ ...d, bedroomsMin: e.target.value === '' ? '' : Number(e.target.value) }))}
            >
              {[1,2,3,4,5].map((n) => (<option key={n} value={n}>{n}</option>))}
            </Select>
            <Select
              bg="gray.50"
              placeholder="Baños mínimos"
              value={draft.bathroomsMin as any}
              onChange={(e) => setDraft((d) => ({ ...d, bathroomsMin: e.target.value === '' ? '' : Number(e.target.value) }))}
            >
              {[1,2,3,4,5].map((n) => (<option key={n} value={n}>{n}</option>))}
            </Select>
            <Select
              bg="gray.50"
              placeholder="Estacionamientos mínimos"
              value={draft.parkingMin as any}
              onChange={(e) => setDraft((d) => ({ ...d, parkingMin: e.target.value === '' ? '' : Number(e.target.value) }))}
            >
              {[1,2,3,4,5].map((n) => (<option key={n} value={n}>{n}+</option>))}
            </Select>
            <Select
              bg="gray.50"
              placeholder="Colonia"
              value={draft.colony || ''}
              onChange={(e) => setDraft((d) => ({ ...d, colony: e.target.value }))}
            >
              <option value=''>Todas</option>
              {colonyOptions.map((c) => (<option key={c} value={c}>{c}</option>))}
            </Select>

            <Stack spacing={2} bg="gray.50" p={3} rounded="md">
              <Text fontWeight="medium" color="gray.700" fontSize="sm">Construcción (m²)</Text>
              <HStack justify="space-between" fontSize="xs" fontWeight="medium" color="gray.600">
                <Text>{draft.constructionMin === '' && constructionRange[0] <= CONSTRUCTION_SLIDER_MIN ? 'Sin mínimo' : formatArea(constructionRange[0], { compact: true })}</Text>
                <Text>{draft.constructionMax === '' && constructionRange[1] >= CONSTRUCTION_SLIDER_MAX ? 'Sin máximo' : formatArea(constructionRange[1], { compact: true })}</Text>
              </HStack>
              <RangeSlider
                colorScheme="green"
                min={CONSTRUCTION_SLIDER_MIN}
                max={CONSTRUCTION_SLIDER_MAX}
                step={constructionStep}
                value={constructionRange}
                onChange={(val) => setConstructionRange(val as [number, number])}
                onChangeEnd={(val) => {
                  const [minVal, maxVal] = val as [number, number];
                  commitConstructionRange(minVal, maxVal, {
                    noMin: minVal <= CONSTRUCTION_SLIDER_MIN,
                    noMax: maxVal >= CONSTRUCTION_SLIDER_MAX,
                  });
                }}
              >
                <RangeSliderTrack bg="gray.200">
                  <RangeSliderFilledTrack bg="#0E3B30" />
                </RangeSliderTrack>
                <RangeSliderThumb index={0} boxSize={3.5} bg="white" borderWidth="1px" borderColor="gray.200" shadow="sm" />
                <RangeSliderThumb index={1} boxSize={3.5} bg="white" borderWidth="1px" borderColor="gray.200" shadow="sm" />
              </RangeSlider>
              <HStack justify="space-between" fontSize="xs" color="gray.500">
                <Text>{formatArea(CONSTRUCTION_SLIDER_MIN, { compact: true })}</Text>
                <Text>{formatArea(CONSTRUCTION_SLIDER_MAX, { compact: true })}</Text>
              </HStack>
              <HStack spacing={3}>
                <Input
                  bg="white"
                  type="number"
                  inputMode="numeric"
                  placeholder="Min. construcción"
                  value={typeof draft.constructionMin === 'number' ? String(draft.constructionMin) : ''}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === '') {
                      setConstructionRange(([_, maxVal]) => [CONSTRUCTION_SLIDER_MIN, maxVal]);
                      setDraft((prev) => ({ ...prev, constructionMin: '' }));
                      return;
                    }
                    const parsed = Number(raw);
                    if (Number.isNaN(parsed)) return;
                    const clamped = clampConstructionValue(parsed);
                    setConstructionRange(([_, maxVal]) => [clamped, maxVal]);
                    const currentMax = typeof draft.constructionMax === 'number' ? draft.constructionMax : CONSTRUCTION_SLIDER_MAX;
                    commitConstructionRange(clamped, currentMax, {
                      noMax: draft.constructionMax === '' && currentMax >= CONSTRUCTION_SLIDER_MAX,
                    });
                  }}
                />
                <Input
                  bg="white"
                  type="number"
                  inputMode="numeric"
                  placeholder="Máx. construcción"
                  value={typeof draft.constructionMax === 'number' ? String(draft.constructionMax) : ''}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === '') {
                      setConstructionRange(([minVal]) => [minVal, CONSTRUCTION_SLIDER_MAX]);
                      setDraft((prev) => ({ ...prev, constructionMax: '' }));
                      return;
                    }
                    const parsed = Number(raw);
                    if (Number.isNaN(parsed)) return;
                    const clamped = clampConstructionValue(parsed);
                    setConstructionRange(([minVal]) => [minVal, clamped]);
                    const currentMin = typeof draft.constructionMin === 'number' ? draft.constructionMin : CONSTRUCTION_SLIDER_MIN;
                    commitConstructionRange(currentMin, clamped, {
                      noMin: draft.constructionMin === '' && currentMin <= CONSTRUCTION_SLIDER_MIN,
                    });
                  }}
                />
              </HStack>
            </Stack>

            <Stack spacing={2} bg="gray.50" p={3} rounded="md">
              <Text fontWeight="medium" color="gray.700" fontSize="sm">Terreno (m²)</Text>
              <HStack justify="space-between" fontSize="xs" fontWeight="medium" color="gray.600">
                <Text>{draft.lotMin === '' && lotRange[0] <= LOT_SLIDER_MIN ? 'Sin mínimo' : formatArea(lotRange[0], { compact: true })}</Text>
                <Text>{draft.lotMax === '' && lotRange[1] >= LOT_SLIDER_MAX ? 'Sin máximo' : formatArea(lotRange[1], { compact: true })}</Text>
              </HStack>
              <RangeSlider
                colorScheme="green"
                min={LOT_SLIDER_MIN}
                max={LOT_SLIDER_MAX}
                step={lotStep}
                value={lotRange}
                onChange={(val) => setLotRange(val as [number, number])}
                onChangeEnd={(val) => {
                  const [minVal, maxVal] = val as [number, number];
                  commitLotRange(minVal, maxVal, {
                    noMin: minVal <= LOT_SLIDER_MIN,
                    noMax: maxVal >= LOT_SLIDER_MAX,
                  });
                }}
              >
                <RangeSliderTrack bg="gray.200">
                  <RangeSliderFilledTrack bg="#0E3B30" />
                </RangeSliderTrack>
                <RangeSliderThumb index={0} boxSize={3.5} bg="white" borderWidth="1px" borderColor="gray.200" shadow="sm" />
                <RangeSliderThumb index={1} boxSize={3.5} bg="white" borderWidth="1px" borderColor="gray.200" shadow="sm" />
              </RangeSlider>
              <HStack justify="space-between" fontSize="xs" color="gray.500">
                <Text>{formatArea(LOT_SLIDER_MIN, { compact: true })}</Text>
                <Text>{formatArea(LOT_SLIDER_MAX, { compact: true })}</Text>
              </HStack>
              <HStack spacing={3}>
                <Input
                  bg="white"
                  type="number"
                  inputMode="numeric"
                  placeholder="Min. terreno"
                  value={typeof draft.lotMin === 'number' ? String(draft.lotMin) : ''}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === '') {
                      setLotRange(([_, maxVal]) => [LOT_SLIDER_MIN, maxVal]);
                      setDraft((prev) => ({ ...prev, lotMin: '' }));
                      return;
                    }
                    const parsed = Number(raw);
                    if (Number.isNaN(parsed)) return;
                    const clamped = clampLotValue(parsed);
                    setLotRange(([_, maxVal]) => [clamped, maxVal]);
                    const currentMax = typeof draft.lotMax === 'number' ? draft.lotMax : LOT_SLIDER_MAX;
                    commitLotRange(clamped, currentMax, {
                      noMax: draft.lotMax === '' && currentMax >= LOT_SLIDER_MAX,
                    });
                  }}
                />
                <Input
                  bg="white"
                  type="number"
                  inputMode="numeric"
                  placeholder="Máx. terreno"
                  value={typeof draft.lotMax === 'number' ? String(draft.lotMax) : ''}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === '') {
                      setLotRange(([minVal]) => [minVal, LOT_SLIDER_MAX]);
                      setDraft((prev) => ({ ...prev, lotMax: '' }));
                      return;
                    }
                    const parsed = Number(raw);
                    if (Number.isNaN(parsed)) return;
                    const clamped = clampLotValue(parsed);
                    setLotRange(([minVal]) => [minVal, clamped]);
                    const currentMin = typeof draft.lotMin === 'number' ? draft.lotMin : LOT_SLIDER_MIN;
                    commitLotRange(currentMin, clamped, {
                      noMin: draft.lotMin === '' && currentMin <= LOT_SLIDER_MIN,
                    });
                  }}
                />
              </HStack>
            </Stack>
            <Button size="sm" colorScheme="green" onClick={applyAdvanced}>Aplicar filtros</Button>
          </Stack>
        </Collapse>
      </Stack>

      <Divider />

      <Button variant="ghost" size="sm" onClick={handleClear}>Limpiar filtros</Button>
    </Stack>
  );
}
