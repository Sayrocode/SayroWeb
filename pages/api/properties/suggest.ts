import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';

type SuggestItem = { label: string; value?: string; type: 'title' | 'type' | 'location' | 'operation' | 'property' };
type Payload = { items: SuggestItem[] };

type CacheEntry<T> = { v: T; exp: number };
const TTL = 60_000; // 60s
const cache = new Map<string, CacheEntry<Payload>>();
function getCache(key: string): Payload | null {
  const e = cache.get(key);
  if (!e) return null;
  if (Date.now() > e.exp) { cache.delete(key); return null; }
  return e.v;
}
function setCache(key: string, v: Payload) {
  if (cache.size > 500) cache.clear();
  cache.set(key, { v, exp: Date.now() + TTL });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  const q = String(req.query.q || '').trim();
  if (!q || q.length < 2) return res.status(200).json({ items: [] } satisfies Payload);

  const key = q.toLowerCase();
  const cached = getCache(key);
  if (cached) {
    res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=120');
    return res.status(200).json(cached);
  }

  const whereContains = (field: any) => ({ contains: q });
  const take = 8;

  const [titles, types, locs, props] = await Promise.all([
    prisma.property.findMany({ where: { title: whereContains('title') as any }, select: { title: true, publicId: true }, take }),
    prisma.property.findMany({ where: { propertyType: whereContains('propertyType') as any }, select: { propertyType: true }, distinct: ['propertyType'], take }),
    prisma.property.findMany({ where: { locationText: whereContains('locationText') as any }, select: { locationText: true }, take }),
    prisma.property.findMany({ where: { OR: [ { publicId: { contains: q } }, { title: whereContains('title') as any } ] }, select: { publicId: true, title: true }, take: 5 }),
  ]);

  const items: SuggestItem[] = [];
  // direct properties
  for (const p of props) items.push({ type: 'property', label: p.title || `Propiedad ${p.publicId}`, value: p.publicId });
  // titles
  for (const t of titles) if (t.title) items.push({ type: 'title', label: t.title, value: t.publicId });
  // types
  const seenType = new Set<string>();
  for (const t of types) {
    const v = (t.propertyType || '').trim();
    if (!v || seenType.has(v.toLowerCase())) continue; seenType.add(v.toLowerCase());
    items.push({ type: 'type', label: v, value: v });
  }
  // locations (unique)
  const seenLoc = new Set<string>();
  for (const l of locs) {
    const v = (l.locationText || '').trim();
    if (!v) continue;
    const keyL = v.toLowerCase();
    if (seenLoc.has(keyL)) continue; seenLoc.add(keyL);
    items.push({ type: 'location', label: v, value: v });
  }
  // operations (sinónimos ES/EN)
  const qn = q.toLowerCase();
  const isSale = /\b(venta|vender|compra|comprar|sale|sell|purchase)\b/.test(qn);
  const isRent = /\b(renta|rent|rental|alquiler|arrendamiento|lease|leased?)\b/.test(qn);
  if (isSale) items.push({ type: 'operation', label: 'Venta', value: 'sale' });
  if (isRent) items.push({ type: 'operation', label: 'Renta', value: 'rental' });

  // tipos en inglés comunes como sugerencia adicional
  const typeSyn: Record<string,string> = {
    house: 'Casa', apartment: 'Departamento', flat: 'Departamento', condo: 'Departamento',
    land: 'Terreno', lot: 'Terreno', plot: 'Terreno', office: 'Oficina', shop: 'Local', store: 'Local',
    warehouse: 'Bodega', villa: 'Villa', industrial: 'Nave industrial', commercial: 'Local comercial',
  };
  const words = qn.split(/[^a-z0-9ñ]+/).filter(Boolean);
  const added = new Set<string>();
  for (const w of words) {
    const label = typeSyn[w];
    if (label && !added.has(label)) { items.push({ type: 'type', label, value: label }); added.add(label); }
  }

  // ubicaciones abreviadas comunes
  if (/\bqro\b/.test(qn)) items.push({ type: 'location', label: 'Querétaro', value: 'Querétaro' });
  if (/\bcdmx\b|\bdf\b/.test(qn)) items.push({ type: 'location', label: 'Ciudad de México', value: 'Ciudad de México' });

  const payload = { items } satisfies Payload;
  setCache(key, payload);
  res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=120');
  return res.status(200).json(payload);
}
