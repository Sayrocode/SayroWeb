import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../lib/prisma';

// Basic in-memory cache for listing pages
type CacheEntry<T> = { value: T; exp: number };
const LIST_TTL_MS = 30_000; // 30s
const listCache = new Map<string, CacheEntry<any>>();
function lget<T>(key: string): T | null {
  const e = listCache.get(key);
  if (!e) return null;
  if (Date.now() > e.exp) { listCache.delete(key); return null; }
  return e.value as T;
}
function lset<T>(key: string, value: T, ttl = LIST_TTL_MS) {
  if (listCache.size > 200) listCache.clear();
  listCache.set(key, { value, exp: Date.now() + ttl });
}

function formatPrice(amount?: number | null, currency?: string | null) {
  if (typeof amount !== 'number') return undefined;
  const cur = (currency || 'MXN').toUpperCase();
  try {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return String(amount);
  }
}

function mapOperations(p: any) {
  // Prefer operations embedded in ebDetailJson, then fallback to operationsJson
  let ops: any[] = [];
  try {
    const detail = p.ebDetailJson ? JSON.parse(p.ebDetailJson) : null;
    if (Array.isArray(detail?.operations)) ops = detail.operations;
  } catch {}
  if (!ops.length && p.operationsJson) {
    try { const arr = JSON.parse(p.operationsJson); if (Array.isArray(arr)) ops = arr; } catch {}
  }

  // Normalize to EB list-like shape: [{ prices: [{ amount, currency, formatted_amount }] }]
  return ops.map((o) => {
    const amount = typeof o?.amount === 'number' ? o.amount : (Array.isArray(o?.prices) ? o.prices?.[0]?.amount : undefined);
    const currency = o?.currency || (Array.isArray(o?.prices) ? o.prices?.[0]?.currency : undefined) || 'MXN';
    return {
      type: o?.type,
      prices: [{ amount, currency, formatted_amount: formatPrice(amount, currency) }],
    };
  });
}

function toEBListItem(p: any) {
  return {
    public_id: p.publicId,
    title: p.title,
    title_image_full: p.titleImageFull,
    title_image_thumb: p.titleImageThumb,
    location: p.locationText,
    property_type: p.propertyType,
    status: p.status,
    bedrooms: p.bedrooms,
    bathrooms: p.bathrooms,
    parking_spaces: p.parkingSpaces,
    operations: mapOperations(p),
    lot_size: p.lotSize,
    construction_size: p.constructionSize,
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const limit = Math.min(parseInt(String(req.query.limit ?? '24')) || 24, 200);
  const page = Math.max(parseInt(String(req.query.page ?? '1')) || 1, 1);
  const skip = (page - 1) * limit;
  const q = String(req.query.q || '').trim();
  const type = String(req.query.type || '').trim();
  const city = String(req.query.city || '').trim();
  const fast = String(req.query.fast || '').trim();
  const cacheKey = `list:${limit}:${page}`;
  const cached = lget<any>(cacheKey);
  if (cached) {
    res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=300');
    return res.status(200).json(cached);
  }

  // Aceptar múltiples variantes de "disponible" para asegurar que
  // se incluyan todas las propiedades publicables aunque el origen
  // use otros textos o capitalización distinta.
  const allowedBase = [
    'available',
    'disponible',
    'active',
    'activa',
    'published',
    'publicada',
    'en venta',
    'en renta',
  ];
  const allowedStatuses = Array.from(new Set<string>([
    ...allowedBase,
    ...allowedBase.map((s) => s.charAt(0).toUpperCase() + s.slice(1)),
    ...allowedBase.map((s) => s.toUpperCase()),
  ]));

  // Solo propiedades con estatus "publicables". Excluimos null/unknown.
  const whereClause: any = {
    status: { in: allowedStatuses },
  };
  if (q) {
    whereClause.OR = [
      { title: { contains: q } },
      { publicId: { contains: q } },
      { locationText: { contains: q } },
      { propertyType: { contains: q } },
    ];
  }
  if (type) whereClause.propertyType = type;
  if (city) whereClause.locationText = { contains: city };

  const listPromise = prisma.property.findMany({
    where: whereClause,
    orderBy: { updatedAt: 'desc' },
    include: { media: { select: { key: true }, orderBy: { createdAt: 'asc' }, take: 1 } },
    take: limit,
    skip,
  });
  const countPromise = (q || type || city || fast) ? Promise.resolve(null as any) : prisma.property.count({ where: whereClause });
  const [items, total] = await Promise.all([listPromise, countPromise]);

  const content = items.map((p: any) => {
    // Si hay imágenes en Turso, construir URL pública
    const firstMedia = Array.isArray(p.media) && p.media.length && p.media[0]?.key
      ? `/api/admin/images/${encodeURIComponent((p.media[0] as any).key)}`
      : null;
    const eb = toEBListItem(p);
    // Siempre usar Turso o placeholder local; nunca CDNs externos
    eb.title_image_full = firstMedia || '/image3.jpg';
    eb.title_image_thumb = firstMedia || '/image3.jpg';
    return eb;
  });
  const totalPages = total ? Math.max(Math.ceil(total / limit), 1) : null;
  const next_page = totalPages ? (page < totalPages ? page + 1 : null) : (items.length < limit ? null : page + 1);
  const prev_page = page > 1 ? page - 1 : null;
  const payload = {
    content,
    pagination: { limit, total, page, total_pages: totalPages, next_page, prev_page },
  };
  lset(cacheKey, payload);
  res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=300');
  return res.status(200).json(payload);
}
