import type { GetServerSideProps } from 'next';
import React from 'react';
import { getIronSession } from 'iron-session';
import Layout from '../../components/Layout';
import { sessionOptions, AppSession } from '../../lib/session';
import { Box, Button, Container, Heading, Text, SimpleGrid, Image, Flex, Spacer, HStack, Input, InputGroup, InputLeftElement, IconButton, Badge, AspectRatio, Menu, MenuButton, MenuItem, MenuList, Tooltip, Skeleton, Checkbox, Switch, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, RadioGroup, Stack, Radio, NumberInput, NumberInputField, useToast, Wrap, WrapItem, Breadcrumb, BreadcrumbItem, Select, BreadcrumbLink, Icon, Textarea, Collapse } from '@chakra-ui/react';
import { SearchIcon, CloseIcon, ChevronDownIcon, ChevronUpIcon } from '@chakra-ui/icons';
import { FiMoreVertical, FiExternalLink, FiCopy, FiRefreshCw, FiTrash2, FiEdit2, FiMaximize } from 'react-icons/fi';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import dynamic from 'next/dynamic';
import useSWRInfinite from 'swr/infinite';
import Link from 'next/link';
const AddPropertyModal = dynamic(() => import('../../components/admin/AddPropertyModal'), { ssr: false });
const CampaignModalContent = dynamic(() => import('../../components/admin/CampaignModalContent'), { ssr: false, loading: () => <Box p={4}>Cargando…</Box> });
import PropertyCard from '../../components/admin/PropertyCard';
import VirtualGrid from '../../components/admin/VirtualGrid';

type Props = {
  username: string;
};

type AdvancedFiltersState = {
  priceMin: string;
  priceMax: string;
  bedroomsMin: string;
  bathroomsMin: string;
  parkingMin: string;
  colony: string;
  constructionMin: string;
  constructionMax: string;
  lotMin: string;
  lotMax: string;
};

type AdvancedFiltersToggleProps = {
  filters: AdvancedFiltersState;
  onApply: (next: AdvancedFiltersState) => void;
  colonyOptions: string[];
};

const createEmptyAdvancedFilters = (): AdvancedFiltersState => ({
  priceMin: '',
  priceMax: '',
  bedroomsMin: '',
  bathroomsMin: '',
  parkingMin: '',
  colony: '',
  constructionMin: '',
  constructionMax: '',
  lotMin: '',
  lotMax: '',
});

export default function AdminHome({ username }: Props) {
  const router = useRouter();
  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/admin/login');
  };
  const fetcher = (url: string) => fetch(url).then((r) => r.json());
  // Search debounce
  const [qRaw, setQRaw] = React.useState('');
  const [qDebounced, setQDebounced] = React.useState('');
  // Filters
  const [type, setType] = React.useState('');
  const [city, setCity] = React.useState('');
  const [range, setRange] = React.useState('');
  React.useEffect(() => {
    const h = setTimeout(() => setQDebounced(qRaw), 350);
    return () => clearTimeout(h);
  }, [qRaw]);
  type SuggestItem = { type: 'property'|'title'|'type'|'location'|'operation'|'status'; label: string; value?: string };
  const [sugOpen, setSugOpen] = React.useState(false);
  const [sugLoading, setSugLoading] = React.useState(false);
  const [sug, setSug] = React.useState<SuggestItem[]>([]);
  const abortRef = React.useRef<AbortController | null>(null);
  const sugCacheRef = React.useRef<Map<string, SuggestItem[]>>(new Map());

  const [operation, setOperation] = React.useState<string>(''); // 'sale' | 'rental'
  const [status, setStatus] = React.useState<string>(''); // 'available' or free text
  // Origen de propiedades ('' = todos, EB Bolsa sigue deshabilitado)
  const [origin, setOrigin] = React.useState<string>(''); // '' | 'eb_own' | 'eb_bolsa' | 'ego'
  const [advancedFilters, setAdvancedFilters] = React.useState<AdvancedFiltersState>(() => createEmptyAdvancedFilters());

  const matchRangePreset = React.useCallback((f: AdvancedFiltersState): string => {
    const min = f.priceMin.trim();
    const max = f.priceMax.trim();
    if (!min && max === '1000000') return '0-1000';
    if (min === '1000000' && max === '2000000') return '1000-2000';
    if (min === '2000000' && max === '3000000') return '2000-3000';
    if (min === '3000000' && !max) return '3000+';
    return '';
  }, []);

  const handleRangeChange = React.useCallback((value: string) => {
    setRange(value);
    setAdvancedFilters((prev) => {
      const next = { ...prev };
      if (value === '0-1000') { next.priceMin = ''; next.priceMax = '1000000'; }
      else if (value === '1000-2000') { next.priceMin = '1000000'; next.priceMax = '2000000'; }
      else if (value === '2000-3000') { next.priceMin = '2000000'; next.priceMax = '3000000'; }
      else if (value === '3000+') { next.priceMin = '3000000'; next.priceMax = ''; }
      else { next.priceMin = ''; next.priceMax = ''; }
      return next;
    });
  }, []);

  const updateAdvanced = React.useCallback(<K extends keyof AdvancedFiltersState>(key: K, value: string) => {
    setAdvancedFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const {
    priceMin,
    priceMax,
    bedroomsMin,
    bathroomsMin,
    parkingMin,
    colony,
    constructionMin,
    constructionMax,
    lotMin,
    lotMax,
  } = advancedFilters;

  const PAGE_SIZE = 30;
  const getKey = (index: number) => {
    if (origin === 'eb_mls') return null as any;
    return `/api/admin/properties?take=${PAGE_SIZE}&page=${index + 1}`
    + `${qDebounced ? `&q=${encodeURIComponent(qDebounced)}&fast=1` : ''}`
    + `${type ? `&type=${encodeURIComponent(type)}` : ''}`
    + `${city ? `&city=${encodeURIComponent(city)}` : ''}`
    + `${operation ? `&operation=${encodeURIComponent(operation)}` : ''}`
    + `${status ? `&status=${encodeURIComponent(status)}` : ''}`
    + `${origin ? `&origin=${encodeURIComponent(origin)}` : ''}`
    + `${priceMin ? `&min_price=${encodeURIComponent(priceMin)}` : ''}`
    + `${priceMax ? `&max_price=${encodeURIComponent(priceMax)}` : ''}`
    + `${bedroomsMin ? `&min_bedrooms=${encodeURIComponent(bedroomsMin)}` : ''}`
    + `${bathroomsMin ? `&min_bathrooms=${encodeURIComponent(bathroomsMin)}` : ''}`
    + `${parkingMin ? `&min_parking_spaces=${encodeURIComponent(parkingMin)}` : ''}`
    + `${colony ? `&locations=${encodeURIComponent(colony)}` : ''}`
    + `${constructionMin ? `&min_construction_size=${encodeURIComponent(constructionMin)}` : ''}`
    + `${constructionMax ? `&max_construction_size=${encodeURIComponent(constructionMax)}` : ''}`
    + `${lotMin ? `&min_lot_size=${encodeURIComponent(lotMin)}` : ''}`
    + `${lotMax ? `&max_lot_size=${encodeURIComponent(lotMax)}` : ''}`;
  };
  const { data, mutate, size, setSize, isLoading } = useSWRInfinite(
    getKey,
    fetcher,
    { revalidateOnFocus: false, revalidateOnReconnect: false, dedupingInterval: 15000, persistSize: true, revalidateFirstPage: false }
  );
  const pages = data || [];
  const total: number = pages.length ? (pages[0]?.total ?? 0) : 0;
  const aggregated = pages.flatMap((p: any) => Array.isArray(p?.items) ? p.items : []);
  const isInitial = !data || data.length === 0;
  const isLoadingMore = isLoading || (size > 0 && !!data && typeof data[size - 1] === 'undefined');
  const isReachingEnd = (pages.length > 0 && (pages[pages.length - 1]?.items?.length || 0) < PAGE_SIZE) || (total > 0 && aggregated.length >= total);
  const loaderRef = React.useRef<HTMLDivElement | null>(null);
  const [pendingMore, setPendingMore] = React.useState(false);
  const [lookahead, setLookahead] = React.useState(false);
  const prefetchGuard = React.useRef<number>(0);
  // Reset pagination when search or filters change
  React.useEffect(() => { setSize(1); }, [
    qDebounced,
    type,
    city,
    origin,
    priceMin,
    priceMax,
    bedroomsMin,
    bathroomsMin,
    parkingMin,
    colony,
    constructionMin,
    constructionMax,
    lotMin,
    lotMax,
    setSize,
  ]);
  // Reset when op/status change
  React.useEffect(() => { setSize(1); }, [operation, status, setSize]);
  // Avoid re-creating observer and stale closures: use refs
  const loadingRef = React.useRef(isLoadingMore);
  const endRef = React.useRef(isReachingEnd);
  React.useEffect(() => { loadingRef.current = isLoadingMore; }, [isLoadingMore]);
  React.useEffect(() => { endRef.current = isReachingEnd; }, [isReachingEnd]);
  // Track scroll direction (avoid triggering loads while scrolling up)
  const lastYRef = React.useRef(0);
  const scrollingDownRef = React.useRef(true);
  React.useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY || 0;
      scrollingDownRef.current = y >= lastYRef.current;
      lastYRef.current = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  React.useEffect(() => {
    const el = loaderRef.current;
    if (!el) return;
    if (qDebounced || type || city || operation || status || origin === 'eb_mls') return; // disable infinite scroll during search/filter and MLS embed
    const ob = new IntersectionObserver((entries) => {
      const e = entries[0];
      if (e.isIntersecting && !loadingRef.current && !endRef.current && scrollingDownRef.current) {
        setPendingMore(true);
        React.startTransition(() => { void setSize((s) => s + 1); });
      }
    }, { rootMargin: '800px 0px' });
    ob.observe(el);
    return () => ob.disconnect();
  }, [setSize, qDebounced, origin]);
  React.useEffect(() => { if (!isLoadingMore) setPendingMore(false); }, [isLoadingMore]);
  React.useEffect(() => { if (origin === 'eb_mls') setPendingMore(false); }, [origin]);

  // Scroll position persistence for fast back/forward
  React.useEffect(() => {
    const y = Number(sessionStorage.getItem('admin.index.scroll') || '0');
    if (y > 0) {
      requestAnimationFrame(() => window.scrollTo(0, y));
    }
    return () => {
      try { sessionStorage.setItem('admin.index.scroll', String(window.scrollY || 0)); } catch {}
    };
  }, []);

  // Lookahead prefetch: tras cargar una página, pide una más en background
  React.useEffect(() => {
    if (qDebounced) return;            // no adelantar cuando hay búsqueda
    if (isLoadingMore) return;
    if (isReachingEnd) return;
    if (origin === 'eb_mls') return;   // no prefetch en modo MLS embed
    // Evitar pedir múltiples veces por el mismo tamaño
    if (prefetchGuard.current === size) return;
    prefetchGuard.current = size;
    const idle = (cb: () => void) => (typeof (window as any).requestIdleCallback === 'function')
      ? (window as any).requestIdleCallback(cb, { timeout: 800 })
      : setTimeout(cb, 150) as any;
    const id = idle(() => {
      setLookahead(true);
      React.startTransition(() => { void setSize(size + 1); });
    });
    return () => { if (typeof (window as any).cancelIdleCallback === 'function') (window as any).cancelIdleCallback(id); else clearTimeout(id as any); };
  }, [size, qDebounced, isLoadingMore, isReachingEnd, setSize, origin]);
  React.useEffect(() => { if (!isLoadingMore) setLookahead(false); }, [isLoadingMore]);
  // ===== MLS embed state (when origin === 'eb_mls') =====
  const [mlsMode, setMlsMode] = React.useState<'venta' | 'renta'>('venta');
  const mlsEmbedSrc = mlsMode === 'venta' ? '/api/embed/mls?path=/properties' : '/api/embed/mls?path=/rentals';
  const mlsIframeRef = React.useRef<HTMLIFrameElement | null>(null);
  React.useEffect(() => {
    if (origin !== 'eb_mls') return;
    const frame = mlsIframeRef.current;
    if (!frame) return;
    let ro: ResizeObserver | null = null;
    let mo: MutationObserver | null = null;
    function resizeOnce() {
      try {
        const f = mlsIframeRef.current;
        if (!f) return;
        const doc = f.contentDocument || f.contentWindow?.document;
        if (!doc) return;
        const h1 = doc.documentElement?.scrollHeight || 0;
        const h2 = doc.body?.scrollHeight || 0;
        const h = Math.max(h1, h2, 0);
        if (h) f.style.height = `${h}px`;
      } catch {}
    }
    function onLoad() { resizeOnce(); tryAttachObservers(); }
    function tryAttachObservers() {
      try {
        const f = mlsIframeRef.current;
        if (!f) return;
        const doc = f.contentDocument || f.contentWindow?.document;
        if (!doc) return;
        if ('ResizeObserver' in window) {
          ro = new (window as any).ResizeObserver(() => resizeOnce());
          if (doc.body) ro.observe(doc.body);
          ro.observe(doc.documentElement);
        }
        mo = new MutationObserver(() => resizeOnce());
        mo.observe(doc.documentElement, { childList: true, subtree: true, attributes: true, characterData: true });
        f.contentWindow?.addEventListener('hashchange', resizeOnce);
        setTimeout(resizeOnce, 50);
        setTimeout(resizeOnce, 300);
        setTimeout(resizeOnce, 1200);
      } catch {}
    }
    frame.addEventListener('load', onLoad);
    setTimeout(() => { try { resizeOnce(); } catch {} }, 50);
    return () => {
      try { frame.removeEventListener('load', onLoad); } catch {}
      try { if (ro) ro.disconnect(); } catch {}
      try { if (mo) mo.disconnect(); } catch {}
    };
  }, [origin, mlsEmbedSrc]);
  const [campaignMode, setCampaignMode] = React.useState(false);
  const [ebMode, setEbMode] = React.useState(false);
  React.useEffect(() => {
    try {
      document.body.classList.toggle('campaign-mode', campaignMode);
      document.body.classList.toggle('eb-mode', ebMode);
    } catch {}
    return () => {
      try { document.body.classList.remove('campaign-mode'); document.body.classList.remove('eb-mode'); } catch {}
    };
  }, [campaignMode, ebMode]);
  const [selected, setSelected] = React.useState<number[]>([]);
  const selectedSet = React.useMemo(() => new Set(selected), [selected]);
  const onToggleSelect = React.useCallback((id: number) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);
  const [isOpen, setIsOpen] = React.useState(false);
  const [adType, setAdType] = React.useState<'single'|'carousel'>('single');
  const [budget, setBudget] = React.useState(150);
  const [days, setDays] = React.useState(7);
  const toast = useToast();
  // Auto-sync from EasyBroker when selecting EB — Mías and no local data present yet
  const syncRequestedRef = React.useRef(false);
  React.useEffect(() => {
    (async () => {
      if (origin !== 'eb_own') return;
      if (isLoadingMore || isInitial) return; // wait first fetch
      if (aggregated.length > 0) return; // already have items
      if (syncRequestedRef.current) return; // avoid loops
      syncRequestedRef.current = true;
      try {
        toast({ title: 'Sincronizando EasyBroker…', status: 'info', duration: 1500 });
        await fetch('/api/admin/sync?limit=100', { method: 'POST' });
        await mutate();
      } catch {}
    })();
  }, [origin, aggregated.length, isLoadingMore, isInitial, mutate, toast]);
  // Copy fields (single)
  const [copyHeadline, setCopyHeadline] = React.useState('');
  const [copyDesc, setCopyDesc] = React.useState('');
  const [copyPrimary, setCopyPrimary] = React.useState('');
  const [genLoading, setGenLoading] = React.useState(false);
  const [nativeLoading, setNativeLoading] = React.useState(false);
  const [nativeBase, setNativeBase] = React.useState('');
  const [nativeOptions, setNativeOptions] = React.useState<Array<{headline: string, description: string, primaryText: string}>>([]);
  const [nativeChoice, setNativeChoice] = React.useState<number>(0);
  const [carouselOptions, setCarouselOptions] = React.useState<Record<number, Array<{headline: string, description: string}>>>({});
  const [carouselChoice, setCarouselChoice] = React.useState<Record<number, number>>({});
  const [egoLoading, setEgoLoading] = React.useState(false);
  const [imgLoading, setImgLoading] = React.useState(false);
  // Carousel
  const [carouselMsg, setCarouselMsg] = React.useState('');
  const [carouselCopies, setCarouselCopies] = React.useState<Record<number, {headline: string, description: string}>>({});
  // Preview
  const [preview, setPreview] = React.useState<any | null>(null);
  const [previewLoading, setPreviewLoading] = React.useState(false);
  const items = aggregated; // no filtro por texto aquí; lo maneja la búsqueda avanzada
  const [addOpen, setAddOpen] = React.useState(false);

  // Normalización de tipo (igual al catálogo público)
  function normalizeType(raw?: string | null): string {
    const s = String(raw || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const has = (w: string) => s.includes(w);
    // EB canon
    if (has('casa')) return 'Casa';
    if (has('depart') || has('depa') || has('apto') || has('apart') || has('loft') || has('duplex') || has('triplex') || has('bloque de departamento') || has('edificio') || has('studio') || has('penthouse') || s === 'ph' || has('pent house')) return 'Departamento';
    if (has('terreno') || has('lote') || has('predio') || has('parcela')) return 'Terreno';
    if (has('oficina') || has('despacho')) return 'Oficina';
    if (has('local')) return 'Local';
    if (has('bodega')) return 'Bodega';
    if (has('nave') || has('industrial')) return 'Nave';
    if (has('villa') || has('rancho') || has('quinta') || has('condominio')) return 'Casa';
    return 'Otro';
  }

  // Municipios de Qro. + canónicos (mismo criterio del público)
  const QRO_MUNICIPALITIES = React.useMemo(() => [
    'Amealco de Bonfil','Arroyo Seco','Cadereyta de Montes','Colón','Corregidora','Ezequiel Montes','Huimilpan',
    'Jalpan de Serra','Landa de Matamoros','El Marqués','Pedro Escobedo','Peñamiller','Pinal de Amoles','Querétaro',
    'San Joaquín','San Juan del Río','Tequisquiapan','Tolimán',
  ], []);
  const MUNICIPIO_SYNONYMS = React.useMemo(() => {
    const map: Record<string, string> = {};
    const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
    const add = (canon: string, ...syns: string[]) => { syns.forEach((s) => { map[norm(s)] = canon; }); map[norm(canon)] = canon; };
    add('Querétaro','Santiago de Querétaro','Queretaro');
    add('El Marqués','El Marques','Marques');
    add('San Juan del Río','San Juan del Rio');
    add('Tolimán','Toliman');
    add('Peñamiller','Penamiller');
    add('Colón','Colon');
    add('San Joaquín','San Joaquin');
    QRO_MUNICIPALITIES.forEach((m) => { map[norm(m)] = m; });
    return map;
  }, [QRO_MUNICIPALITIES]);
  const normSimple = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const canonicalMunicipio = (raw?: string | null): string | null => {
    if (!raw) return null;
    let s = String(raw).replace(/\bmunicipio de\b\s*/i,'');
    s = s.replace(/^\s*nuevo\s+/i,'');
    const n = normSimple(s);
    if (MUNICIPIO_SYNONYMS[n]) return MUNICIPIO_SYNONYMS[n];
    for (const k of Object.keys(MUNICIPIO_SYNONYMS)) { if (k && (n.includes(k) || n.includes(`nuevo ${k}`))) return MUNICIPIO_SYNONYMS[k]; }
    return null;
  };
  const extractMunicipioFromText = (txt?: string | null): string | null => {
    const s = String(txt || '');
    const parts = s.split(',').map((p) => p.trim()).filter(Boolean);
    for (const p of parts) {
      const canon = canonicalMunicipio(p);
      if (canon && QRO_MUNICIPALITIES.includes(canon)) return canon;
    }
    const canonAll = canonicalMunicipio(s);
    return (canonAll && QRO_MUNICIPALITIES.includes(canonAll)) ? canonAll : null;
  };

  const typeOptions = React.useMemo(() => {
    const whitelist = ['Casa','Departamento','Terreno','Oficina','Local','Bodega','Nave'];
    const order = new Map(whitelist.map((t, i) => [t, i]));
    const set = new Set<string>();
    (items || []).forEach((p: any) => { const t = normalizeType(p.propertyType); if (whitelist.includes(t)) set.add(t); });
    return Array.from(set).sort((a, b) => (order.get(a)! - order.get(b)!));
  }, [items]);

  const cityOptions = React.useMemo(() => {
    const set = new Set<string>();
    (items || []).forEach((p: any) => {
      const m = extractMunicipioFromText(p.locationText);
      if (m) set.add(m);
    });
    // Mantener el orden alfabético para mejor UX
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const colonyOptions = React.useMemo(() => {
    const set = new Set<string>();
    (aggregated || []).forEach((p: any) => {
      const raw = String((p as any)?.locationText || '');
      const first = raw.split(',')[0]?.trim();
      if (first && first.length <= 72 && !/\d/.test(first)) set.add(first);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [aggregated]);

  // cityCounts se define después de advancedFiltered para evitar referencias antes de inicializar

  // Suggestions (admin)
  React.useEffect(() => {
    const q = qRaw.trim();
    if (q.length < 3) { setSug([]); setSugOpen(false); return; }
    const cached = sugCacheRef.current.get(q.toLowerCase());
    if (cached) { setSug(cached); setSugOpen(true); return; }
    if (abortRef.current) abortRef.current.abort();
    const ac = new AbortController(); abortRef.current = ac;
    setSugLoading(true); setSugOpen(true);
    fetch(`/api/admin/properties/suggest?q=${encodeURIComponent(q)}`, { signal: ac.signal })
      .then((r) => r.ok ? r.json() : Promise.reject(new Error(String(r.status))))
      .then((j) => { const items = Array.isArray(j?.items) ? j.items as SuggestItem[] : []; setSug(items); try { sugCacheRef.current.set(q.toLowerCase(), items); } catch {} })
      .catch(() => {})
      .finally(() => setSugLoading(false));
    return () => ac.abort();
  }, [qRaw]);

  function applySuggestion(it: SuggestItem) {
    if (it.type === 'property' || it.type === 'title') {
      router.push(`/admin/properties/${encodeURIComponent(it.value || '')}`);
      return;
    }
    if (it.type === 'type') { setType(it.value || it.label); setSugOpen(false); return; }
    if (it.type === 'location') { setCity(it.value || it.label); setSugOpen(false); return; }
    if (it.type === 'operation') { setOperation((it.value as any) || (it.label?.toLowerCase().includes('venta') ? 'sale' : 'rental')); setSugOpen(false); return; }
    if (it.type === 'status') { setStatus('available'); setSugOpen(false); return; }
  }
  // Partes de ubicación para coincidencias tipo "500 m2 queretaro" o colonia/municipio/estado
  const placeParts = React.useMemo(() => {
    const set = new Set<string>();
    for (const p of items || []) {
      const txt = String(p?.locationText || '');
      txt.split(',').map((s) => s.trim()).filter(Boolean).forEach((s) => set.add(s));
    }
    return Array.from(set);
  }, [items]);
  const inRange = (amount?: number | null) => {
    if (!range || !amount || amount <= 0) return true;
    if (range === '0-1000') return amount < 1_000_000;
    if (range === '1000-2000') return amount >= 1_000_000 && amount < 2_000_000;
    if (range === '2000-3000') return amount >= 2_000_000 && amount < 3_000_000;
    if (range === '3000+') return amount >= 3_000_000;
    return true;
  };
  const matchesAdvancedFilters = React.useCallback((p: any) => {
    const amount = typeof (p as any)?.priceAmount === 'number' ? Number((p as any).priceAmount) : NaN;
    if (!inRange((p as any)?.priceAmount)) return false;

    const priceMinNum = Number(priceMin);
    if (priceMin && Number.isFinite(priceMinNum)) {
      if (!Number.isFinite(amount) || amount < priceMinNum) return false;
    }
    const priceMaxNum = Number(priceMax);
    if (priceMax && Number.isFinite(priceMaxNum)) {
      if (!Number.isFinite(amount) || amount > priceMaxNum) return false;
    }

    const bedroomsMinNum = Number(bedroomsMin);
    if (bedroomsMin && Number.isFinite(bedroomsMinNum)) {
      if (!(typeof p?.bedrooms === 'number' && p.bedrooms >= bedroomsMinNum)) return false;
    }
    const bathroomsMinNum = Number(bathroomsMin);
    if (bathroomsMin && Number.isFinite(bathroomsMinNum)) {
      if (!(typeof p?.bathrooms === 'number' && p.bathrooms >= bathroomsMinNum)) return false;
    }
    const parkingMinNum = Number(parkingMin);
    if (parkingMin && Number.isFinite(parkingMinNum)) {
      if (!(typeof p?.parkingSpaces === 'number' && p.parkingSpaces >= parkingMinNum)) return false;
    }
    if (colony) {
      const target = normSimple(colony);
      const location = normSimple(String(p?.locationText || ''));
      if (target && !location.includes(target)) return false;
    }

    const construction = typeof p?.constructionSize === 'number' ? p.constructionSize : null;
    const lot = typeof p?.lotSize === 'number' ? p.lotSize : null;
    const constructionMinNum = Number(constructionMin);
    if (constructionMin && Number.isFinite(constructionMinNum)) {
      if (!(typeof construction === 'number' && construction >= constructionMinNum)) return false;
    }
    const constructionMaxNum = Number(constructionMax);
    if (constructionMax && Number.isFinite(constructionMaxNum)) {
      if (!(typeof construction === 'number' && construction <= constructionMaxNum)) return false;
    }
    const lotMinNum = Number(lotMin);
    if (lotMin && Number.isFinite(lotMinNum)) {
      if (!(typeof lot === 'number' && lot >= lotMinNum)) return false;
    }
    const lotMaxNum = Number(lotMax);
    if (lotMax && Number.isFinite(lotMaxNum)) {
      if (!(typeof lot === 'number' && lot <= lotMaxNum)) return false;
    }

    return true;
  }, [bathroomsMin, bedroomsMin, colony, constructionMax, constructionMin, inRange, lotMax, lotMin, normSimple, parkingMin, priceMax, priceMin]);

  // Server already filtra por los parámetros principales; aquí reforzamos filtros adicionales
  const filtered = items.filter((p: any) => matchesAdvancedFilters(p));

  // ===== Super-búsqueda estilo catálogo público =====
  function norm(s: string): string {
    return String(s || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  type ParsedQuery = {
    terms: string[];
    typeHints: string[];
    operation?: '' | 'sale' | 'rental';
    bedrooms?: number;
    bathrooms?: number;
    parking?: number;
    sizeMin?: number;
    sizeRangeMin?: number;
    sizeRangeMax?: number;
    sizeBucketMin?: number;
    sizeBucketMax?: number;
    sizeGuess?: number;
    amenityGuess?: number;
    impliedLandBySize?: boolean;
    place?: string | null;
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

    // Detectar operación por texto libre
    let op: '' | 'sale' | 'rental' = '';
    const allText = ` ${q} `;
    if (/\b(venta|vender|compra|comprar|sale|sell|purchase)\b/.test(allText)) op = 'sale';
    if (/\b(renta|rent|rental|alquiler|arrendamiento|lease|leased?)\b/.test(allText)) op = op || 'rental';

    // Amenities
    let bedrooms: number | undefined;
    let bathrooms: number | undefined;
    let parking: number | undefined;
    const recM = qRaw.match(/(\d+)\s*(recamaras?|recámaras?|habitaciones?|rec\b)/i);
    const banM = qRaw.match(/(\d+)\s*(banos?|baños?)/i);
    const estM = qRaw.match(/(\d+)\s*(estacionamientos?|cocheras?|autos?)/i);
    if (recM) bedrooms = Math.min(20, parseInt(recM[1], 10));
    if (banM) bathrooms = Math.min(20, parseInt(banM[1], 10));
    if (estM) parking = Math.min(20, parseInt(estM[1], 10));

    // Tamaño y números sueltos
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
      if (n >= 20 && n < 200) { sizeBucketMin = 20; sizeBucketMax = 200; sizeGuess = n; }
      else if (n < 500) { sizeBucketMin = 200; sizeBucketMax = 500; sizeGuess = n; }
      else if (n < 1000) { sizeBucketMin = 500; sizeBucketMax = 1000; sizeGuess = n; }
      else if (n >= 1000) { sizeBucketMin = 1000; sizeBucketMax = Infinity; sizeGuess = n; }
    }

    const numericTokens = tokens.map((t) => (/^\d{1,6}$/.test(t) ? parseInt(t, 10) : NaN)).filter((n) => !Number.isNaN(n)) as number[];
    const impliedLandBySize = numericTokens.length > 0 && !recM && !banM && !estM && !sizeMatch;
    if (impliedLandBySize && numericTokens.length) {
      const first = numericTokens[0];
      if (first <= 20) amenityGuess = first;
      else if (first < 200) { sizeBucketMin = 20; sizeBucketMax = 200; sizeGuess = first; }
      else if (first < 500) { sizeBucketMin = 200; sizeBucketMax = 500; sizeGuess = first; }
      else if (first < 1000) { sizeBucketMin = 500; sizeBucketMax = 1000; sizeGuess = first; }
      else { sizeBucketMin = 1000; sizeBucketMax = Infinity; sizeGuess = first; }
    }

    // Lugar: intentamos extraer después de "en " o por coincidencias contra partes conocidas de ubicación
    let place: string | null = null;
    const enIdx = tokens.indexOf('en');
    if (enIdx >= 0 && enIdx < tokens.length - 1) {
      place = tokens.slice(enIdx + 1, enIdx + 4).join(' ');
    }
    if (!place) {
      const parts = placeParts.map((s) => ({ raw: s, norm: norm(s) }));
      for (const t of tokens) {
        if (t.length < 2) continue;
        const m = parts.find((p) => p.norm.includes(t));
        if (m) { place = m.raw; break; }
        if (['qro', 'qro.'].includes(t)) {
          const m2 = parts.find((p) => p.norm.includes('queretaro'));
          if (m2) { place = m2.raw; break; }
        }
      }
    }
    return { terms: tokens, typeHints, operation: op, bedrooms, bathrooms, parking, sizeMin, sizeRangeMin, sizeRangeMax, sizeBucketMin, sizeBucketMax, sizeGuess, amenityGuess, impliedLandBySize, place };
  }

  function getSizeSqmAdmin(p: any): number | null {
    const typeText = norm(p?.propertyType || '');
    if (typeText.includes('terreno')) {
      if (typeof p?.lotSize === 'number') return p.lotSize;
      if (typeof p?.constructionSize === 'number') return p.constructionSize;
      return null;
    }
    if (typeof p?.constructionSize === 'number') return p.constructionSize;
    if (typeof p?.lotSize === 'number') return p.lotSize;
    return null;
  }

  const advancedFiltered = React.useMemo(() => {
    const qx = (qDebounced || '').trim();
    const parsed = parseQuery(qx);
    const sMin = 0;
    const sMax = Infinity;

    return filtered.filter((p: any) => {
      // operación (venta/renta): usar filtro explícito o lo detectado en el texto
      const opFilter = (operation as ''|'sale'|'rental') || (parsed.operation as ''|'sale'|'rental');
      if (opFilter) {
        const kind = (p as any).opKind as ('' | 'sale' | 'rental') || '';
        if (kind !== opFilter) return false;
      }
      const title = norm(p.title || '');
      const id = norm(String(p.publicId || ''));
      const loc = norm(String(p.locationText || ''));
      const typeText = norm(p.propertyType || '');

      if (qx) {
        const hasSignals = Boolean(
          parsed.typeHints.length || parsed.bedrooms || parsed.bathrooms || parsed.parking || parsed.place ||
          typeof parsed.sizeMin === 'number' || typeof parsed.sizeRangeMin === 'number' || typeof parsed.sizeBucketMin === 'number' || typeof parsed.amenityGuess === 'number'
        );
        const qn = norm(qx);
        const textMatch = title.includes(qn) || id.includes(qn) || loc.includes(qn) || typeText.includes(qn);
        if (!hasSignals && !textMatch) return false;
      }

      if (parsed.typeHints.length) {
        const okType = parsed.typeHints.some((hint) => typeText.includes(hint));
        if (!okType) return false;
      }

      // Amenidades explícitas

      if (typeof parsed.bedrooms === 'number') {
        if (!(typeof p?.bedrooms === 'number' && p.bedrooms >= parsed.bedrooms)) return false;
      }
      if (typeof parsed.bathrooms === 'number') {
        if (!(typeof p?.bathrooms === 'number' && p.bathrooms >= parsed.bathrooms)) return false;
      }
      if (typeof parsed.parking === 'number') {
        if (!(typeof p?.parkingSpaces === 'number' && p.parkingSpaces >= parsed.parking)) return false;
      }
      if (typeof parsed.amenityGuess === 'number') {
        const n = parsed.amenityGuess;
        const okAmenity = [p?.bedrooms, p?.bathrooms, p?.parkingSpaces].some((v) => typeof v === 'number' && (v as number) >= n);
        if (!okAmenity) return false;
      }

      if (parsed.place) {
        const placeNorm = norm(parsed.place);
        if (placeNorm && !loc.includes(placeNorm)) return false;
      }

      const sqm = getSizeSqmAdmin(p);
      if (typeof parsed.sizeBucketMin === 'number' && typeof parsed.sizeBucketMax === 'number') {
        if (typeof sqm === 'number') {
          if (sqm < parsed.sizeBucketMin || sqm > parsed.sizeBucketMax) return false;
        }
      } else if (typeof parsed.sizeMin === 'number') {
        if (!(typeof sqm === 'number' && sqm >= parsed.sizeMin)) return false;
      }
      if (typeof parsed.sizeRangeMin === 'number' && typeof parsed.sizeRangeMax === 'number') {
        if (typeof sqm === 'number') {
          if (sqm < parsed.sizeRangeMin || sqm > parsed.sizeRangeMax) return false;
        }
      }

      return true;
    }).sort((a: any, b: any) => {
      // Ordenar por cercanía al tamaño buscado si aplica; los sin dato al final
      if (typeof parsed.sizeGuess === 'number') {
        const guess = parsed.sizeGuess;
        const sa = getSizeSqmAdmin(a);
        const sb = getSizeSqmAdmin(b);
        const da = typeof sa === 'number' ? Math.abs(sa - guess) : Number.POSITIVE_INFINITY;
        const db = typeof sb === 'number' ? Math.abs(sb - guess) : Number.POSITIVE_INFINITY;
        return da - db;
      }
      return 0;
    });
  }, [filtered, qDebounced, type, city, range]);

  // Conteo por municipio no-bloqueante (idle) a partir de la lista agregada
  const [cityCounts, setCityCounts] = React.useState<Map<string, number>>(new Map());
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const itemsLocal = aggregated || [];
    const idle = (cb: () => void) => (typeof (window as any).requestIdleCallback === 'function')
      ? (window as any).requestIdleCallback(cb, { timeout: 400 })
      : setTimeout(cb, 16) as any;
    const cancel = (id: any) => (typeof (window as any).cancelIdleCallback === 'function')
      ? (window as any).cancelIdleCallback(id)
      : clearTimeout(id);
    const id = idle(() => {
      const counts = new Map<string, number>();
      const add = (k?: string | null) => { if (!k) return; counts.set(k, (counts.get(k) || 0) + 1); };
      for (const p of itemsLocal) add(extractMunicipioFromText((p as any)?.locationText));
      setCityCounts(counts);
    });
    return () => cancel(id);
  }, [aggregated]);

  const onDelete = async (id: number) => {
    if (!confirm('¿Eliminar esta propiedad?')) return;
    const r = await fetch(`/api/admin/properties/${id}`, { method: 'DELETE' });
    if (r.ok) mutate();
  };

  const doSync = async () => {
    if (!confirm('Importar/actualizar propiedades desde EasyBroker?')) return;
    const r = await fetch('/api/admin/sync', { method: 'POST' });
    if (r.ok) { await mutate(); }
  };

  const downloadImages = async () => {
    if (!confirm('Descargar y guardar imágenes de todas las propiedades (Turso)?\nSe registrará el progreso en la consola del navegador.')) return;
    setImgLoading(true);
    try {
      const url = '/api/admin/properties/images/download?onlyMissing=1&take=200&start=0&stream=1';
      const r = await fetch(url, { method: 'POST' });
      // Si el endpoint soporta streaming, leer línea por línea y hacer console.log
      if ((r as any).body && typeof (r as any).body.getReader === 'function') {
        const reader = (r as any).body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffered = '';
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          buffered += chunk;
          let idx;
          while ((idx = buffered.indexOf('\n')) >= 0) {
            const line = buffered.slice(0, idx).trimEnd();
            buffered = buffered.slice(idx + 1);
            // eslint-disable-next-line no-console
            if (line) console.log(line);
          }
        }
        const tail = buffered.trim();
        if (tail) {
          // eslint-disable-next-line no-console
          console.log(tail);
        }
      } else {
        // Fallback: intentar parsear JSON si no hay streaming disponible
        const j = await r.json().catch(() => ({}));
        // eslint-disable-next-line no-console
        console.log('Resultado descarga imágenes:', j);
      }
      await mutate();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Error al descargar imágenes:', e);
    } finally {
      setImgLoading(false);
    }
  };

  const doEgoScrape = async () => {
    if (!confirm('Iniciar scraping (headless) desde EgoRealEstate?')) return;
    setEgoLoading(true);
    try {
      const r = await fetch('/api/admin/ego/scrape', { method: 'POST' });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        alert(`Error al ejecutar scraper: ${j?.error || r.statusText}`);
      }
      await mutate();
    } finally {
      setEgoLoading(false);
    }
  };

  const toggleSelect = (id: number) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const openCampaign = () => {
    if (!selected.length) {
      toast({ title: 'Selecciona al menos una propiedad', status: 'warning', duration: 2000 });
      return;
    }
    if (adType === 'single' && selected.length > 1) {
      setAdType('carousel');
    }
    setIsOpen(true);
  };

  // EB preview modal state
  const [ebPreviewOpen, setEbPreviewOpen] = React.useState(false);
  const [ebPreviewResults, setEbPreviewResults] = React.useState<any[]>([]);
  const openEbPreview = async () => {
    const dict = new Map<number, any>((items || []).map((p: any) => [p.id, p]));
    const nonEb = selected.filter((id) => { const p = dict.get(id); const pid = String(p?.publicId || ''); return !pid.toUpperCase().startsWith('EB-'); });
    if (!nonEb.length) { toast({ title: 'Nada para publicar', description: 'Todas las seleccionadas ya están en EasyBroker', status: 'info', duration: 2000 }); return; }
    try {
      const r = await fetch('/api/admin/easybroker/publish-batch?validate=1', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: nonEb }) });
      const j = await r.json();
      setEbPreviewResults(Array.isArray(j?.results) ? j.results : []);
      setEbPreviewOpen(true);
    } catch (e: any) {
      toast({ title: 'Error al validar', description: e?.message || 'Intenta de nuevo', status: 'error', duration: 2500 });
    }
  };
  const doPublishEb = async (overrides: Record<number, any>) => {
    try {
      const idsAll = (ebPreviewResults || []).map((r: any) => r.id);
      if (!idsAll.length) { toast({ title: 'Nada para publicar', status: 'info', duration: 1500 }); return; }
      // Validar nuevamente con overrides
      const rVal = await fetch('/api/admin/easybroker/publish-batch?validate=1', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: idsAll, overrides }) });
      const jVal = await rVal.json();
      const issues = (jVal?.results || []).filter((it: any) => !it.ok);
      setEbPreviewResults(Array.isArray(jVal?.results) ? jVal.results : []);
      if (issues.length) { toast({ title: 'Revisa los campos', description: `${issues.length} con problemas`, status: 'warning', duration: 3000 }); return; }
      // Publicar
      const r2 = await fetch('/api/admin/easybroker/publish-batch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: idsAll, overrides }) });
      const j2 = await r2.json();
      const results = Array.isArray(j2?.results) ? j2.results : [];
      const ok = results.filter((x: any) => x.ok).length;
      const fail = results.filter((x: any) => !x.ok);
      if (fail.length > 0) {
        const details = fail.slice(0, 3).map((r: any) => {
          const msg = r?.message || r?.data?.error || r?.reason || 'error';
          return `ID ${r?.id}: ${String(msg)}`;
        }).join('; ');
        toast({
          title: 'Publicación con errores',
          description: `${ok} publicadas, ${fail.length} con error. ${details}${fail.length > 3 ? '…' : ''}`,
          status: 'error',
          duration: 6000,
          isClosable: true,
        });
        // Para inspección completa en consola
        try { console.error('EB publish errors:', results); } catch {}
      } else {
        toast({ title: 'Publicación completada', description: `${ok} publicadas`, status: 'success', duration: 2500 });
      }
      setEbPreviewOpen(false); setSelected([]); mutate();
    } catch (e: any) {
      toast({ title: 'Error al publicar', description: e?.message || 'Intenta de nuevo', status: 'error', duration: 2500 });
    }
  };

  const createCampaign = async () => {
    const body: any = { propertyIds: selected, adType, dailyBudget: budget, durationDays: days };
    if (adType === 'single') {
      body.copy = { headline: copyHeadline, description: copyDesc, primaryText: copyPrimary };
    } else {
      body.message = carouselMsg;
      body.copies = Object.entries(carouselCopies).map(([propertyId, v]) => ({ propertyId: Number(propertyId), ...v }));
    }
    const r = await fetch('/api/admin/meta/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json();
    setIsOpen(false);
    if (r.ok && j.ok) {
      toast({ title: 'Campaña creada (PAUSED)', description: 'Revisa en Meta Ads Manager', status: 'success', duration: 3000 });
    } else {
      toast({ title: 'Previsualización', description: j?.reason || 'Faltan credenciales META_* o SITE_BASE_URL. Se devolvió el storySpec para revisión en la consola.', status: 'info', duration: 5000 });
      // eslint-disable-next-line no-console
      console.log('Meta storySpec preview:', j?.storySpec || j);
    }
  };

  const requestPreview = async () => {
    setPreviewLoading(true);
    try {
      const body: any = { propertyIds: selected, adType, dailyBudget: budget, durationDays: days, dryRun: true };
      if (adType === 'single') {
        body.copy = { headline: copyHeadline, description: copyDesc, primaryText: copyPrimary };
      } else {
        body.message = carouselMsg;
        body.copies = Object.entries(carouselCopies).map(([propertyId, v]) => ({ propertyId: Number(propertyId), ...v }));
      }
      const r = await fetch('/api/admin/meta/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const j = await r.json();
      if (j?.storySpec) setPreview(j.storySpec);
      else setPreview(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const selectedItems: any[] = React.useMemo(() => {
    const dict = new Map<number, any>((items || []).map((p: any) => [p.id, p]));
    return selected.map((id) => dict.get(id)).filter(Boolean);
  }, [selected, items]);
  // Previews are now loaded inside CampaignModalContent via dynamic import

  // No usar generateCopy()
  const generateCopyNative = async () => {
    setNativeLoading(true);
    const r = await fetch('/api/admin/meta/suggest-copy-native?count=5', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ propertyIds: selected, adType, baseDescription: nativeBase }) });
    const j = await r.json();
    setNativeLoading(false);
    if (j?.type === 'single' && Array.isArray(j.options)) {
      setNativeOptions(j.options);
      setNativeChoice(0);
      const c = j.options[0] || { headline: '', description: '', primaryText: '' };
      setCopyHeadline(c.headline || '');
      setCopyDesc(c.description || '');
      setCopyPrimary(c.primaryText || '');
      toast({ title: 'Se generaron 5 opciones (nativo)', status: 'success', duration: 1500 });
    } else if (j?.type === 'carousel' && Array.isArray(j.options)) {
      const dict: Record<number, Array<{headline: string, description: string}>> = {};
      const chosen: Record<number, {headline: string, description: string}> = {};
      const choiceIdx: Record<number, number> = {};
      (j.options || []).forEach((entry: any) => {
        dict[entry.id] = entry.options || [];
        choiceIdx[entry.id] = 0;
        const c = (entry.options || [])[0] || { headline: '', description: '' };
        chosen[entry.id] = c;
      });
      setCarouselOptions(dict);
      setCarouselChoice(choiceIdx);
      setCarouselCopies(chosen);
      toast({ title: '5 opciones por propiedad (nativo)', status: 'success', duration: 1500 });
    } else {
      toast({ title: 'No se pudo generar', status: 'warning', duration: 2000 });
    }
  };
  return (
    <Layout title="Admin">
      <Box bg="#F7F4EC">
      <Container maxW="7xl" py={8}>
        <Stack align="center" mb={4} spacing={3}>
          <Breadcrumb fontSize='sm' color='gray.600' mb={1}>
            <BreadcrumbItem><BreadcrumbLink as={Link} href='/admin'>Inicio</BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbItem isCurrentPage><BreadcrumbLink href='#'>Propiedades</BreadcrumbLink></BreadcrumbItem>
          </Breadcrumb>
          <HStack spacing={3} align="center" mt={-1}>
            <Heading size="lg" textAlign="center" color="#0E3B30">Catálogo de Propiedades</Heading>
            <Badge colorScheme="gray" variant="subtle">{total || 0} total</Badge>
          </HStack>
          <Wrap spacing={3} justify="center">
            <WrapItem>
              <Button colorScheme='green' onClick={() => setAddOpen(true)}>Agregar Propiedad</Button>
            </WrapItem>
            <WrapItem flex='1 1 260px' position='relative'>
              <InputGroup>
                <InputLeftElement pointerEvents="none"><SearchIcon color="gray.400" /></InputLeftElement>
                <Input placeholder="Buscar (título, id, tipo, ciudad, venta/renta, disponible)" value={qRaw} onChange={(e) => setQRaw(e.target.value)} bg="white" onFocus={() => { if (sug.length) setSugOpen(true); }} onBlur={() => setTimeout(() => setSugOpen(false), 120)} />
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
            {/* Búsqueda en vivo debounced; sin botón Buscar */}
            <WrapItem>
              <Select bg='white' placeholder='Tipo' value={type} onChange={(e) => setType(e.target.value)} minW='140px'>
                {typeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
              </Select>
            </WrapItem>
            <WrapItem>
              <Select bg='white' value={origin} onChange={(e) => setOrigin(e.target.value)} minW='180px'>
                <option value=''>Todos</option>
                <option value='eb_own'>EB — Mías</option>
                <option value='eb_mls'>EB — MLS</option>
                {/* EB — Bolsa deshabilitado temporalmente */}
                {/* <option value='eb_bolsa'>EB — Bolsa</option> */}
                <option value='ego'>EGO</option>
              </Select>
            </WrapItem>
            <WrapItem>
              <Select bg='white' placeholder='Habitaciones' value={bedroomsMin} onChange={(e) => updateAdvanced('bedroomsMin', e.target.value)} minW='140px'>
                {[1,2,3,4,5].map((n) => <option key={n} value={n}>{n}</option>)}
              </Select>
            </WrapItem>
            <WrapItem>
              <Select bg='white' placeholder='Baños' value={bathroomsMin} onChange={(e) => updateAdvanced('bathroomsMin', e.target.value)} minW='140px'>
                {[1,2,3,4,5].map((n) => <option key={n} value={n}>{n}</option>)}
              </Select>
            </WrapItem>
            <WrapItem>
              <Select bg='white' placeholder='Ciudad' value={city} onChange={(e) => setCity(e.target.value)} minW='180px'>
                {cityOptions.map((c) => (
                  <option key={c} value={c}>
                    {c} ({cityCounts.get(c) || 0})
                  </option>
                ))}
              </Select>
            </WrapItem>
            <WrapItem>
              <Select bg='white' placeholder='Rango precio' value={range} onChange={(e) => handleRangeChange(e.target.value)} minW='160px'>
                <option value='0-1000'>&lt; $1M</option>
                <option value='1000-2000'>$1M - $2M</option>
                <option value='2000-3000'>$2M - $3M</option>
                <option value='3000+'>$3M+</option>
              </Select>
            </WrapItem>
            <AdvancedFiltersToggle
              filters={advancedFilters}
              onApply={(next) => {
                setAdvancedFilters(next);
                setRange(matchRangePreset(next));
              }}
              colonyOptions={colonyOptions}
            />
            <WrapItem>
              <HStack px={3} py={2} borderWidth="1px" rounded="md" bg="white">
                <Text fontSize="sm">Campaign Mode</Text>
                <Switch isChecked={campaignMode} onChange={(e) => { setCampaignMode(e.target.checked); setSelected([]); }} />
              </HStack>
            </WrapItem>
            <WrapItem>
              <HStack px={3} py={2} borderWidth="1px" rounded="md" bg="white">
                <Text fontSize="sm">EB Upload</Text>
                <Switch isChecked={ebMode} onChange={(e) => { setEbMode(e.target.checked); setSelected([]); }} />
              </HStack>
            </WrapItem>
            <WrapItem>
              <Button onClick={logout} variant="outline" colorScheme="red" size="sm">Cerrar sesión</Button>
            </WrapItem>
          </Wrap>
        </Stack>

        {origin === 'eb_mls' ? (
          <Box>
            <HStack justify='center' mb={4} spacing={3}>
              <Button
                colorScheme='green'
                variant={mlsMode === 'venta' ? 'solid' : 'outline'}
                onClick={() => setMlsMode('venta')}
              >
                Venta
              </Button>
              <Button
                colorScheme='green'
                variant={mlsMode === 'renta' ? 'solid' : 'outline'}
                onClick={() => setMlsMode('renta')}
              >
                Renta
              </Button>
            </HStack>
            <Box
              as='iframe'
              title={mlsMode === 'venta' ? 'MLS — Venta (embed)' : 'MLS — Renta (embed)'}
              src={mlsEmbedSrc}
              width='100%'
              height='1400'
              loading='lazy'
              style={{ border: '0', display: 'block', margin: 0, padding: 0 }}
              sandbox='allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox'
              allow='geolocation *; fullscreen *'
              referrerPolicy='strict-origin-when-cross-origin'
              ref={mlsIframeRef as any}
            />
          </Box>
        ) : (
          (isInitial && aggregated.length === 0) ? (
            <Box>
              {Array.from({ length: 6 }).map((_, i) => (
                <Box key={i} borderWidth="1px" rounded="none" overflow="hidden" bg="white" p={0} mb={4}>
                  <Skeleton height="180px" />
                  <Box p={3}>
                    <Skeleton height="20px" mb={2} />
                    <Skeleton height="16px" width="60%" />
                  </Box>
                </Box>
              ))}
            </Box>
          ) : (
            <VirtualGrid
              items={advancedFiltered}
              itemKey={(p: any) => p.id}
              rowHeight={360}
              gap={24}
              overscanRows={2}
              renderItem={(p: any) => (
                <PropertyCard
                  property={p}
                  isSelected={selectedSet.has(p.id)}
                  onToggleSelect={onToggleSelect}
                  onDelete={onDelete}
                />
              )}
            />
          )
        )}

        {/* Sentinel para cargar más */}
        {origin !== 'eb_mls' && (<Box ref={loaderRef} h="1px" />)}

        {/* Indicador de carga incremental */}
        {(origin !== 'eb_mls') && (pendingMore || (isLoadingMore && !lookahead)) && (
          <Box mt={6}>
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
              {Array.from({ length: 3 }).map((_, i) => (
                <Box key={i} borderWidth="1px" rounded="lg" overflow="hidden" bg="white" p={0}>
                  <Skeleton height="180px" />
                  <Box p={3}>
                    <Skeleton height="20px" mb={2} />
                    <Skeleton height="16px" width="60%" />
                  </Box>
                </Box>
              ))}
            </SimpleGrid>
          </Box>
        )}

        {(campaignMode || ebMode) && (
          <Flex position="fixed" bottom={6} left={0} right={0} justify="center">
            <HStack spacing={3} bg="white" borderWidth="1px" rounded="full" px={4} py={2} boxShadow="md">
              <Text fontWeight="medium">{selected.length} seleccionadas</Text>
              {campaignMode ? (
                <>
                  <RadioGroup value={adType} onChange={(v: any) => setAdType(v)}>
                    <HStack spacing={4}>
                      <Radio value='single' isDisabled={selected.length !== 1}>Single</Radio>
                      <Radio value='carousel'>Carrusel</Radio>
                    </HStack>
                  </RadioGroup>
                  <Button colorScheme="purple" onClick={openCampaign}>Crear anuncio</Button>
                </>
              ) : (
                <>
                  <Button colorScheme='green' onClick={openEbPreview}>Validar y publicar en EasyBroker</Button>
                </>
              )}
            </HStack>
          </Flex>
        )}

        {isOpen && (
        <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} size='full' scrollBehavior='inside' autoFocus={false}>
          <ModalOverlay />
          <ModalContent rounded='0' h='100vh'>
            <ModalHeader textAlign='center' fontFamily="'Binggo Wood', heading" fontWeight='bold' textTransform='uppercase'>Crear campaña en Meta</ModalHeader>
            <ModalBody>
              <CampaignModalContent selected={selected} selectedItems={selectedItems} onClose={() => setIsOpen(false)} />
            </ModalBody>
            <ModalFooter>
              <Button mr={3} onClick={() => setIsOpen(false)} bg='transparent' border='1px solid black' rounded='0' _hover={{ bg: 'blackAlpha.50' }}>Cancelar</Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
        )}
      </Container>
      <AddPropertyModal isOpen={addOpen} onClose={() => setAddOpen(false)} onCreated={() => { setSize(1); mutate(); }} />
      <EbPreviewModal isOpen={ebPreviewOpen} onClose={() => setEbPreviewOpen(false)} results={ebPreviewResults} onPublish={doPublishEb} />
      </Box>
    </Layout>
  );
}

// ============ EB Upload Preview Helpers ============
function EbPreviewModal({ isOpen, onClose, results, onPublish }: { isOpen: boolean; onClose: () => void; results: any[]; onPublish: (overrides: Record<number, any>) => void }) {
  const [drafts, setDrafts] = React.useState<Record<number, any>>({});
  React.useEffect(() => {
    const next: Record<number, any> = {};
    (results || []).forEach((r: any) => { if (r && r.preview) next[r.id] = { ...r.preview }; });
    setDrafts(next);
  }, [results, isOpen]);
  const okList = (results || []).filter((r) => r.ok);
  const badList = (results || []).filter((r) => !r.ok);

  const ImagesPreview = ({ rid }: { rid: number }) => {
    const d = drafts[rid] || {};
    const imgs: Array<{ url: string }> = Array.isArray(d?.images)
      ? d.images
      : (Array.isArray(d?.property_images) ? d.property_images : []);
    if (!imgs.length) return null;
    return (
      <SimpleGrid columns={{ base: 3, md: 5 }} spacing={2} mt={2}>
        {imgs.map((it: any, idx: number) => {
          const url = String(it?.url || '');
          if (!url) return null;
          return (
            <Box key={idx} position='relative' borderWidth='1px' rounded='md' overflow='hidden'>
              <Image src={url} alt={`img-${idx}`} w='100%' h='70px' objectFit='cover' />
              <IconButton
                aria-label='Quitar imagen'
                icon={<CloseIcon boxSize={2.5} />}
                size='xs'
                variant='solid'
                colorScheme='red'
                position='absolute'
                top='1'
                right='1'
                onClick={() => setDrafts((m) => {
                  const cur = { ...(m[rid] || {}) } as any;
                  const baseArr: any[] = Array.isArray(cur.images)
                    ? cur.images
                    : (Array.isArray(cur.property_images) ? cur.property_images : []);
                  const arr = baseArr.filter((_: any, i: number) => i !== idx);
                  return { ...m, [rid]: { ...cur, images: arr } };
                })}
              />
            </Box>
          );
        })}
      </SimpleGrid>
    );
  };

  const AddImageInput = ({ rid }: { rid: number }) => {
    const [url, setUrl] = React.useState('');
    return (
      <HStack mt={2} spacing={2} align='center'>
        <Input placeholder='https://…' value={url} onChange={(e) => setUrl(e.target.value)} />
        <Button onClick={() => {
          const u = (url || '').trim(); if (!u) return;
          setDrafts((m) => {
            const cur: any = { ...(m[rid] || {}) };
            const arr: any[] = Array.isArray(cur.images)
              ? [...cur.images]
              : (Array.isArray(cur.property_images) ? [...cur.property_images] : []);
            arr.push({ url: u });
            return { ...m, [rid]: { ...cur, images: arr } };
          });
          setUrl('');
        }}>Agregar imagen</Button>
      </HStack>
    );
  };
  return (
    <Modal isOpen={isOpen} onClose={onClose} size='4xl' scrollBehavior='inside'>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Publicar en EasyBroker — Revisión</ModalHeader>
        <ModalBody>
          <Stack spacing={5}>
            {badList.length > 0 && (
              <Box borderWidth='1px' rounded='md' p={3} bg='yellow.50'>
                <Heading size='sm' mb={2}>Necesitan ajustes ({badList.length})</Heading>
                <Stack spacing={3}>
                  {badList.map((r: any, i: number) => {
                    const d = drafts[r.id] || {};
                    return (
                      <Box key={i} borderWidth='1px' rounded='md' p={3}>
                        <Text fontWeight='bold' mb={2}>ID local: {r.id}</Text>
                        <Stack spacing={2}>
                          <Input placeholder='Título' value={d.title || ''} onChange={(e) => setDrafts((m) => ({ ...m, [r.id]: { ...(m[r.id]||{}), title: e.target.value } }))} />
                          <Textarea placeholder='Descripción' value={d.description || ''} onChange={(e) => setDrafts((m) => ({ ...m, [r.id]: { ...(m[r.id]||{}), description: e.target.value } }))} rows={3} />
                          <HStack>
                            <Select value={d.property_type || ''} onChange={(e) => setDrafts((m) => ({ ...m, [r.id]: { ...(m[r.id]||{}), property_type: e.target.value } }))}>
                              {[
                                'Bodega comercial','Bodega industrial','Casa','Casa con uso de suelo','Casa en condominio','Departamento','Edificio','Huerta','Local comercial','Local en centro comercial','Nave industrial','Oficina','Quinta','Rancho','Terreno','Terreno comercial','Terreno industrial','Villa',
                              ].map((t) => <option key={t} value={t}>{t}</option>)}
                            </Select>
                            <Select value={d.status || 'available'} onChange={(e) => setDrafts((m) => ({ ...m, [r.id]: { ...(m[r.id]||{}), status: e.target.value } }))}>
                              <option value='available'>Disponible</option>
                              <option value='publicada'>Publicada</option>
                              <option value='en venta'>En venta</option>
                              <option value='en renta'>En renta</option>
                            </Select>
                          </HStack>
                          <HStack>
                            <NumberInput min={0} value={(d.operations||[]).find((o:any)=>o.type==='sale')?.amount || ''} onChange={(_,v)=>setDrafts((m)=>{ const cur={...(m[r.id]||{})}; const ops=Array.isArray(cur.operations)?[...cur.operations]:[]; let idx=ops.findIndex((o:any)=>o.type==='sale'); if(idx<0){idx=ops.length; ops.push({type:'sale',unit:'total',currency:'mxn'});} ops[idx]={...ops[idx], type:'sale', amount:(Number.isFinite(v)?v:undefined), currency:'mxn'}; return {...m,[r.id]:{...cur,operations:ops}}; })}>
                              <NumberInputField placeholder='Precio venta' />
                            </NumberInput>
                            <Select value={(d.operations||[]).find((o:any)=>o.type==='sale')?.unit || 'total'} onChange={(e)=>setDrafts((m)=>{ const cur={...(m[r.id]||{})}; const ops=Array.isArray(cur.operations)?[...cur.operations]:[]; let idx=ops.findIndex((o:any)=>o.type==='sale'); if(idx<0){idx=ops.length; ops.push({type:'sale',currency:'mxn'});} ops[idx]={...ops[idx], unit:e.target.value||'total', type:'sale', currency:'mxn'}; return {...m,[r.id]:{...cur,operations:ops}}; })}>
                              <option value='total'>Total</option>
                              <option value='square_meter'>m²</option>
                              <option value='hectare'>Hectárea</option>
                            </Select>
                          </HStack>
                          <HStack>
                            <NumberInput min={0} value={(d.operations||[]).find((o:any)=>o.type==='rental')?.amount || ''} onChange={(_,v)=>setDrafts((m)=>{ const cur={...(m[r.id]||{})}; const ops=Array.isArray(cur.operations)?[...cur.operations]:[]; let idx=ops.findIndex((o:any)=>o.type==='rental'); if(idx<0){idx=ops.length; ops.push({type:'rental',unit:'total',currency:'mxn'});} ops[idx]={...ops[idx], type:'rental', amount:(Number.isFinite(v)?v:undefined), currency:'mxn'}; return {...m,[r.id]:{...cur,operations:ops}}; })}>
                              <NumberInputField placeholder='Precio renta (mensual)' />
                            </NumberInput>
                            <Select value={(d.operations||[]).find((o:any)=>o.type==='rental')?.unit || 'total'} onChange={(e)=>setDrafts((m)=>{ const cur={...(m[r.id]||{})}; const ops=Array.isArray(cur.operations)?[...cur.operations]:[]; let idx=ops.findIndex((o:any)=>o.type==='rental'); if(idx<0){idx=ops.length; ops.push({type:'rental',currency:'mxn'});} ops[idx]={...ops[idx], unit:e.target.value||'total', type:'rental', currency:'mxn'}; return {...m,[r.id]:{...cur,operations:ops}}; })}>
                              <option value='total'>Total</option>
                              <option value='square_meter'>m²</option>
                              <option value='hectare'>Hectárea</option>
                            </Select>
                          </HStack>
                          <HStack>
                            <NumberInput value={d.bedrooms ?? ''} onChange={(_,v)=>setDrafts((m)=>({ ...m, [r.id]: { ...(m[r.id]||{}), bedrooms: Number.isFinite(v)?v:undefined } }))} min={0}>
                              <NumberInputField placeholder='Recámaras' />
                            </NumberInput>
                            <NumberInput value={d.bathrooms ?? ''} onChange={(_,v)=>setDrafts((m)=>({ ...m, [r.id]: { ...(m[r.id]||{}), bathrooms: Number.isFinite(v)?v:undefined } }))} min={0}>
                              <NumberInputField placeholder='Baños' />
                            </NumberInput>
                            <NumberInput value={d.parking_spaces ?? ''} onChange={(_,v)=>setDrafts((m)=>({ ...m, [r.id]: { ...(m[r.id]||{}), parking_spaces: Number.isFinite(v)?v:undefined } }))} min={0}>
                              <NumberInputField placeholder='Estacionamientos' />
                            </NumberInput>
                          </HStack>
                          <HStack>
                            <NumberInput value={d.construction_size ?? ''} onChange={(_,v)=>setDrafts((m)=>({ ...m, [r.id]: { ...(m[r.id]||{}), construction_size: Number.isFinite(v)?v:undefined } }))} min={0}>
                              <NumberInputField placeholder='Construcción (m²)' />
                            </NumberInput>
                            <NumberInput value={d.lot_size ?? ''} onChange={(_,v)=>setDrafts((m)=>({ ...m, [r.id]: { ...(m[r.id]||{}), lot_size: Number.isFinite(v)?v:undefined } }))} min={0}>
                              <NumberInputField placeholder='Terreno (m²)' />
                            </NumberInput>
                          </HStack>
                          <HStack>
                            <Input placeholder='Código Postal' value={d?.location?.postal_code || ''} onChange={(e)=>setDrafts((m)=>({ ...m, [r.id]: { ...(m[r.id]||{}), location: { ...(m[r.id]?.location||{}), postal_code: e.target.value } } }))} />
                            <Input placeholder='Número exterior' value={d?.location?.exterior_number || ''} onChange={(e)=>setDrafts((m)=>({ ...m, [r.id]: { ...(m[r.id]||{}), location: { ...(m[r.id]?.location||{}), exterior_number: e.target.value } } }))} />
                            <Input placeholder='Calle transversal' value={d?.location?.cross_street || ''} onChange={(e)=>setDrafts((m)=>({ ...m, [r.id]: { ...(m[r.id]||{}), location: { ...(m[r.id]?.location||{}), cross_street: e.target.value } } }))} />
                          </HStack>
                          <Input placeholder='Ubicación (name)' value={d?.location?.name || ''} onChange={(e)=>setDrafts((m)=>({ ...m, [r.id]: { ...(m[r.id]||{}), location: { ...(m[r.id]?.location||{}), name: e.target.value } } }))} />
                          <Input placeholder='Calle y número' value={d?.location?.street || ''} onChange={(e)=>setDrafts((m)=>({ ...m, [r.id]: { ...(m[r.id]||{}), location: { ...(m[r.id]?.location||{}), street: e.target.value } } }))} />
                          <HStack>
                            <NumberInput step={0.000001} value={d?.location?.latitude ?? ''} onChange={(_,v)=>setDrafts((m)=>({ ...m, [r.id]: { ...(m[r.id]||{}), location: { ...(m[r.id]?.location||{}), latitude: Number.isFinite(v)?v:undefined } } }))}>
                              <NumberInputField placeholder='Latitud' />
                            </NumberInput>
                            <NumberInput step={0.000001} value={d?.location?.longitude ?? ''} onChange={(_,v)=>setDrafts((m)=>({ ...m, [r.id]: { ...(m[r.id]||{}), location: { ...(m[r.id]?.location||{}), longitude: Number.isFinite(v)?v:undefined } } }))}>
                              <NumberInputField placeholder='Longitud' />
                            </NumberInput>
                          </HStack>
                        </Stack>
                        <ImagesPreview rid={r.id} />
                        <AddImageInput rid={r.id} />
                      </Box>
                    );
                  })}
                </Stack>
              </Box>
            )}
            <Heading size='sm'>Se publicarán ({okList.length})</Heading>
            <Stack spacing={3}>
              {okList.map((r, i) => {
                const b = drafts[r.id] || r.preview || {};
                return (
                  <Box key={i} borderWidth='1px' rounded='md' p={3}>
                    <Input mb={2} placeholder='Título' value={b.title || ''} onChange={(e)=>setDrafts((m)=>({ ...m, [r.id]: { ...(m[r.id]||{}), title: e.target.value } }))} />
                    <HStack spacing={4} fontSize='sm' color='gray.700' wrap='wrap'>
                      <HStack>
                        <Text>Tipo:</Text>
                        <Select value={b.property_type || ''} onChange={(e)=>setDrafts((m)=>({ ...m, [r.id]: { ...(m[r.id]||{}), property_type: e.target.value } }))}>
                          {['Casa','Departamento','Terreno','Oficina','Local','Bodega','Nave'].map((t)=> <option key={t} value={t}>{t}</option>)}
                        </Select>
                      </HStack>
                      <HStack>
                        <Text>Estatus:</Text>
                        <Select value={b.status || 'not_published'} onChange={(e)=>setDrafts((m)=>({ ...m, [r.id]: { ...(m[r.id]||{}), status: e.target.value } }))}>
                          <option value='not_published'>No publicada</option>
                          <option value='published'>Publicada</option>
                          <option value='available'>Disponible</option>
                        </Select>
                      </HStack>
                    </HStack>
                    <HStack spacing={6} fontSize='sm' color='gray.700' mt={1} wrap='wrap'>
                      <HStack>
                        <Text>Venta:</Text>
                        <NumberInput min={0} value={(b.operations||[]).find((o:any)=>o.type==='sale')?.amount || ''} onChange={(_,v)=>setDrafts((m)=>{ const cur={...(m[r.id]||{})}; const ops=Array.isArray(cur.operations)?[...cur.operations]:[]; let idx=ops.findIndex((o:any)=>o.type==='sale'); if(idx<0){idx=ops.length; ops.push({type:'sale',unit:'total',currency:'mxn'});} ops[idx]={...ops[idx], type:'sale', amount:(Number.isFinite(v)?v:undefined), currency:'mxn'}; return {...m,[r.id]:{...cur,operations:ops}}; })}>
                          <NumberInputField placeholder='Precio venta' />
                        </NumberInput>
                        <Select value={(b.operations||[]).find((o:any)=>o.type==='sale')?.unit || 'total'} onChange={(e)=>setDrafts((m)=>{ const cur={...(m[r.id]||{})}; const ops=Array.isArray(cur.operations)?[...cur.operations]:[]; let idx=ops.findIndex((o:any)=>o.type==='sale'); if(idx<0){idx=ops.length; ops.push({type:'sale',currency:'mxn'});} ops[idx]={...ops[idx], unit:e.target.value||'total', type:'sale', currency:'mxn'}; return {...m,[r.id]:{...cur,operations:ops}}; })}>
                          <option value='total'>Total</option>
                          <option value='square_meter'>m²</option>
                          <option value='hectare'>Hectárea</option>
                        </Select>
                      </HStack>
                      <HStack>
                        <Text>Renta:</Text>
                        <NumberInput min={0} value={(b.operations||[]).find((o:any)=>o.type==='rental')?.amount || ''} onChange={(_,v)=>setDrafts((m)=>{ const cur={...(m[r.id]||{})}; const ops=Array.isArray(cur.operations)?[...cur.operations]:[]; let idx=ops.findIndex((o:any)=>o.type==='rental'); if(idx<0){idx=ops.length; ops.push({type:'rental',unit:'total',currency:'mxn'});} ops[idx]={...ops[idx], type:'rental', amount:(Number.isFinite(v)?v:undefined), currency:'mxn'}; return {...m,[r.id]:{...cur,operations:ops}}; })}>
                          <NumberInputField placeholder='Precio renta (mensual)' />
                        </NumberInput>
                        <Select value={(b.operations||[]).find((o:any)=>o.type==='rental')?.unit || 'total'} onChange={(e)=>setDrafts((m)=>{ const cur={...(m[r.id]||{})}; const ops=Array.isArray(cur.operations)?[...cur.operations]:[]; let idx=ops.findIndex((o:any)=>o.type==='rental'); if(idx<0){idx=ops.length; ops.push({type:'rental',currency:'mxn'});} ops[idx]={...ops[idx], unit:e.target.value||'total', type:'rental', currency:'mxn'}; return {...m,[r.id]:{...cur,operations:ops}}; })}>
                          <option value='total'>Total</option>
                          <option value='square_meter'>m²</option>
                          <option value='hectare'>Hectárea</option>
                        </Select>
                      </HStack>
                    </HStack>
                    <HStack mt={2}>
                      <NumberInput value={b.bedrooms ?? ''} onChange={(_,v)=>setDrafts((m)=>({ ...m, [r.id]: { ...(m[r.id]||{}), bedrooms: Number.isFinite(v)?v:undefined } }))} min={0}>
                        <NumberInputField placeholder='Recámaras' />
                      </NumberInput>
                      <NumberInput value={b.bathrooms ?? ''} onChange={(_,v)=>setDrafts((m)=>({ ...m, [r.id]: { ...(m[r.id]||{}), bathrooms: Number.isFinite(v)?v:undefined } }))} min={0}>
                        <NumberInputField placeholder='Baños' />
                      </NumberInput>
                      <NumberInput value={b.parking_spaces ?? ''} onChange={(_,v)=>setDrafts((m)=>({ ...m, [r.id]: { ...(m[r.id]||{}), parking_spaces: Number.isFinite(v)?v:undefined } }))} min={0}>
                        <NumberInputField placeholder='Estacionamientos' />
                      </NumberInput>
                    </HStack>
                    <HStack mt={2}>
                      <NumberInput value={b.construction_size ?? ''} onChange={(_,v)=>setDrafts((m)=>({ ...m, [r.id]: { ...(m[r.id]||{}), construction_size: Number.isFinite(v)?v:undefined } }))} min={0}>
                        <NumberInputField placeholder='Construcción (m²)' />
                      </NumberInput>
                      <NumberInput value={b.lot_size ?? ''} onChange={(_,v)=>setDrafts((m)=>({ ...m, [r.id]: { ...(m[r.id]||{}), lot_size: Number.isFinite(v)?v:undefined } }))} min={0}>
                        <NumberInputField placeholder='Terreno (m²)' />
                      </NumberInput>
                    </HStack>
                    <HStack mt={2}>
                      <Input placeholder='Código Postal' value={b?.location?.postal_code || ''} onChange={(e)=>setDrafts((m)=>({ ...m, [r.id]: { ...(m[r.id]||{}), location: { ...(m[r.id]?.location||{}), postal_code: e.target.value } } }))} />
                      <Input placeholder='Número exterior' value={b?.location?.exterior_number || ''} onChange={(e)=>setDrafts((m)=>({ ...m, [r.id]: { ...(m[r.id]||{}), location: { ...(m[r.id]?.location||{}), exterior_number: e.target.value } } }))} />
                      <Input placeholder='Calle transversal' value={b?.location?.cross_street || ''} onChange={(e)=>setDrafts((m)=>({ ...m, [r.id]: { ...(m[r.id]||{}), location: { ...(m[r.id]?.location||{}), cross_street: e.target.value } } }))} />
                    </HStack>
                    <Input mt={2} placeholder='Ubicación (name)' value={b?.location?.name || ''} onChange={(e)=>setDrafts((m)=>({ ...m, [r.id]: { ...(m[r.id]||{}), location: { ...(m[r.id]?.location||{}), name: e.target.value } } }))} />
                    <Input mt={2} placeholder='Calle y número' value={b?.location?.street || ''} onChange={(e)=>setDrafts((m)=>({ ...m, [r.id]: { ...(m[r.id]||{}), location: { ...(m[r.id]?.location||{}), street: e.target.value } } }))} />
                    <HStack mt={2}>
                      <NumberInput step={0.000001} value={b?.location?.latitude ?? ''} onChange={(_,v)=>setDrafts((m)=>({ ...m, [r.id]: { ...(m[r.id]||{}), location: { ...(m[r.id]?.location||{}), latitude: Number.isFinite(v)?v:undefined } } }))}>
                        <NumberInputField placeholder='Latitud' />
                      </NumberInput>
                      <NumberInput step={0.000001} value={b?.location?.longitude ?? ''} onChange={(_,v)=>setDrafts((m)=>({ ...m, [r.id]: { ...(m[r.id]||{}), location: { ...(m[r.id]?.location||{}), longitude: Number.isFinite(v)?v:undefined } } }))}>
                        <NumberInputField placeholder='Longitud' />
                      </NumberInput>
                    </HStack>
                    <Textarea mt={2} placeholder='Descripción' value={b.description || ''} onChange={(e)=>setDrafts((m)=>({ ...m, [r.id]: { ...(m[r.id]||{}), description: e.target.value } }))} rows={2} />
                    <ImagesPreview rid={r.id} />
                    <AddImageInput rid={r.id} />
                  </Box>
                );
              })}
            </Stack>
          </Stack>
        </ModalBody>
        <ModalFooter>
          <Button onClick={onClose} mr={3}>Cancelar</Button>
          <Button colorScheme='green' onClick={() => onPublish(drafts)} isDisabled={(results || []).length === 0}>Publicar</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async ({ req, res }) => {
  const session = await getIronSession<AppSession>(req, res, sessionOptions);
  if (!session.user) {
    return { redirect: { destination: '/admin/login', permanent: false } };
  }
  return { props: { username: session.user.username } };
};

function AdvancedFiltersToggle({ filters, onApply, colonyOptions }: AdvancedFiltersToggleProps) {
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<AdvancedFiltersState>(filters);

  React.useEffect(() => {
    setDraft(filters);
  }, [filters]);

  const updateDraft = React.useCallback(<K extends keyof AdvancedFiltersState>(key: K, value: string) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }, []);

  const applyDraft = React.useCallback(() => {
    onApply({
      priceMin: draft.priceMin.trim(),
      priceMax: draft.priceMax.trim(),
      bedroomsMin: draft.bedroomsMin.trim(),
      bathroomsMin: draft.bathroomsMin.trim(),
      parkingMin: draft.parkingMin.trim(),
      colony: draft.colony.trim(),
      constructionMin: draft.constructionMin.trim(),
      constructionMax: draft.constructionMax.trim(),
      lotMin: draft.lotMin.trim(),
      lotMax: draft.lotMax.trim(),
    });
    setOpen(false);
  }, [draft, onApply]);

  const clearDraft = React.useCallback(() => {
    const empty = createEmptyAdvancedFilters();
    setDraft(empty);
    onApply(empty);
    setOpen(false);
  }, [onApply]);

  const icon = open ? <ChevronUpIcon /> : <ChevronDownIcon />;

  return (
    <>
      <WrapItem>
        <Button variant='link' colorScheme='green' onClick={() => setOpen((v) => !v)} rightIcon={icon}>Avanzadas</Button>
      </WrapItem>
      <Collapse in={open} style={{ width: '100%' }}>
        <Wrap spacing={3} align='center' mt={2}>
          <WrapItem>
            <Input type='number' bg='white' placeholder='Precio mínimo (MXN)' value={draft.priceMin}
              onChange={(e) => updateDraft('priceMin', e.target.value)} minW='200px' />
          </WrapItem>
          <WrapItem>
            <Input type='number' bg='white' placeholder='Precio máximo (MXN)' value={draft.priceMax}
              onChange={(e) => updateDraft('priceMax', e.target.value)} minW='200px' />
          </WrapItem>
          <WrapItem>
            <Select bg='white' placeholder='Habitaciones mín.' value={draft.bedroomsMin}
              onChange={(e) => updateDraft('bedroomsMin', e.target.value)} minW='160px'>
              {[1,2,3,4,5].map((n) => (<option key={n} value={n}>{n}+</option>))}
            </Select>
          </WrapItem>
          <WrapItem>
            <Select bg='white' placeholder='Baños mín.' value={draft.bathroomsMin}
              onChange={(e) => updateDraft('bathroomsMin', e.target.value)} minW='160px'>
              {[1,2,3,4,5].map((n) => (<option key={n} value={n}>{n}+</option>))}
            </Select>
          </WrapItem>
          <WrapItem>
            <Select bg='white' placeholder='Estacionamientos mín.' value={draft.parkingMin}
              onChange={(e) => updateDraft('parkingMin', e.target.value)} minW='200px'>
              {[1,2,3,4,5].map((n) => (<option key={n} value={n}>{n}+</option>))}
            </Select>
          </WrapItem>
          <WrapItem>
            <Select bg='white' placeholder='Colonia' value={draft.colony}
              onChange={(e) => updateDraft('colony', e.target.value)} minW='200px'>
              {colonyOptions.map((c) => (<option key={c} value={c}>{c}</option>))}
            </Select>
          </WrapItem>
          <WrapItem>
            <Input type='number' bg='white' placeholder='Construcción mínima (m²)' value={draft.constructionMin}
              onChange={(e) => updateDraft('constructionMin', e.target.value)} minW='220px' />
          </WrapItem>
          <WrapItem>
            <Input type='number' bg='white' placeholder='Construcción máxima (m²)' value={draft.constructionMax}
              onChange={(e) => updateDraft('constructionMax', e.target.value)} minW='220px' />
          </WrapItem>
          <WrapItem>
            <Input type='number' bg='white' placeholder='Terreno mínimo (m²)' value={draft.lotMin}
              onChange={(e) => updateDraft('lotMin', e.target.value)} minW='220px' />
          </WrapItem>
          <WrapItem>
            <Input type='number' bg='white' placeholder='Terreno máximo (m²)' value={draft.lotMax}
              onChange={(e) => updateDraft('lotMax', e.target.value)} minW='220px' />
          </WrapItem>
          <WrapItem>
            <Button colorScheme='green' onClick={applyDraft}>Aplicar</Button>
          </WrapItem>
          <WrapItem>
            <Button variant='ghost' onClick={clearDraft}>Limpiar</Button>
          </WrapItem>
        </Wrap>
      </Collapse>
    </>
  );
}
