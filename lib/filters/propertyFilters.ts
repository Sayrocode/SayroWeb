export type OperationType = '' | 'sale' | 'rental';

export type EBFilterParams = {
  // Base
  operation_type?: OperationType;
  min_price?: number;
  max_price?: number;
  min_bedrooms?: number;
  min_bathrooms?: number;
  min_parking_spaces?: number;
  min_construction_size?: number;
  max_construction_size?: number;
  min_lot_size?: number;
  max_lot_size?: number;
  updated_after?: string; // ISO date
  updated_before?: string; // ISO date
  statuses?: string[]; // search[statuses][]
  property_types?: string[]; // search[property_types][]
  features?: string[]; // optional
  locations?: string[]; // optional (colonias/zonas)
  q?: string; // free text
};

export function parseFiltersFromQuery(query: Record<string, any>): EBFilterParams {
  const arr = (v: any): string[] => Array.isArray(v) ? v.map(String) : (typeof v === 'string' ? v.split(',').map((s) => s.trim()).filter(Boolean) : []);
  const num = (v: any): number | undefined => {
    const n = Number(v); return Number.isFinite(n) ? n : undefined;
  };
  const iso = (v: any): string | undefined => {
    const s = String(v || '').trim();
    if (!s) return undefined; const d = new Date(s); return isNaN(d.getTime()) ? undefined : d.toISOString().slice(0, 10);
  };
  return {
    operation_type: ((): OperationType => {
      const s = String(query.operation_type || '').toLowerCase();
      return s === 'sale' || s === 'rental' ? s : '';
    })(),
    min_price: num(query.min_price),
    max_price: num(query.max_price),
    min_bedrooms: num(query.min_bedrooms),
    min_bathrooms: num(query.min_bathrooms),
    min_parking_spaces: num(query.min_parking_spaces),
    min_construction_size: num(query.min_construction_size),
    max_construction_size: num(query.max_construction_size),
    min_lot_size: num(query.min_lot_size),
    max_lot_size: num(query.max_lot_size),
    updated_after: iso(query.updated_after),
    updated_before: iso(query.updated_before),
    statuses: arr(query['search[statuses]'] ?? query.statuses),
    property_types: arr(query['search[property_types]'] ?? query.property_types),
    features: arr(query.features),
    locations: arr(query.locations),
    q: typeof query.q === 'string' ? query.q : undefined,
  };
}

export function buildEBQueryParams(f: EBFilterParams): URLSearchParams {
  const sp = new URLSearchParams();
  if (f.operation_type) sp.set('operation_type', f.operation_type);
  if (typeof f.min_price === 'number') sp.set('min_price', String(f.min_price));
  if (typeof f.max_price === 'number') sp.set('max_price', String(f.max_price));
  if (typeof f.min_bedrooms === 'number') sp.set('min_bedrooms', String(f.min_bedrooms));
  if (typeof f.min_bathrooms === 'number') sp.set('min_bathrooms', String(f.min_bathrooms));
  if (typeof f.min_parking_spaces === 'number') sp.set('min_parking_spaces', String(f.min_parking_spaces));
  if (typeof f.min_construction_size === 'number') sp.set('min_construction_size', String(f.min_construction_size));
  if (typeof f.max_construction_size === 'number') sp.set('max_construction_size', String(f.max_construction_size));
  if (typeof f.min_lot_size === 'number') sp.set('min_lot_size', String(f.min_lot_size));
  if (typeof f.max_lot_size === 'number') sp.set('max_lot_size', String(f.max_lot_size));
  if (f.updated_after) sp.set('updated_after', f.updated_after);
  if (f.updated_before) sp.set('updated_before', f.updated_before);
  (f.statuses || []).forEach((s) => sp.append('search[statuses][]', s));
  (f.property_types || []).forEach((t) => sp.append('search[property_types][]', t));
  (f.features || []).forEach((t) => sp.append('features[]', t));
  (f.locations || []).forEach((t) => sp.append('locations[]', t));
  if (f.q) sp.set('q', f.q);
  return sp;
}

export function hasPriceInRange(ops: any[], min?: number, max?: number): boolean {
  if (!min && !max) return true;
  const any = (ops || []).some((o) => {
    const amount = typeof o?.amount === 'number' ? o.amount : (Array.isArray(o?.prices) ? o.prices?.[0]?.amount : undefined);
    if (typeof amount !== 'number') return false;
    if (typeof min === 'number' && amount < min) return false;
    if (typeof max === 'number' && amount > max) return false;
    return true;
  });
  return any;
}

export function hasFeatures(blob: string | null | undefined, features?: string[]): boolean {
  if (!features || features.length === 0) return true;
  const s = String(blob || '').toLowerCase();
  return features.every((f) => s.includes(String(f).toLowerCase()))
}

