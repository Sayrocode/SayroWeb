import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../../lib/prisma';

type Item = { type: 'property'|'title'|'type'|'location'|'operation'|'status'; label: string; value?: string };
type Payload = { items: Item[] };

const cache = new Map<string, { v: Payload; exp: number }>();
const TTL = 60_000;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') { res.setHeader('Allow','GET'); return res.status(405).json({}); }
  const q = String(req.query.q || '').trim();
  if (!q || q.length < 2) return res.status(200).json({ items: [] } as Payload);
  const key = q.toLowerCase();
  const c = cache.get(key);
  if (c && c.exp > Date.now()) { res.setHeader('Cache-Control','private, max-age=15, stale-while-revalidate=60'); return res.status(200).json(c.v); }

  const whereContains = (field: any) => ({ contains: q, mode: 'insensitive' as const });
  const [titles, types, locs, props] = await Promise.all([
    prisma.property.findMany({ where: { title: whereContains('title') as any }, select: { title: true, publicId: true }, take: 8 }),
    prisma.property.findMany({ where: { propertyType: whereContains('propertyType') as any }, select: { propertyType: true }, distinct: ['propertyType'], take: 8 }),
    prisma.property.findMany({ where: { locationText: whereContains('locationText') as any }, select: { locationText: true }, take: 8 }),
    prisma.property.findMany({ where: { OR: [ { publicId: { contains: q } }, { title: whereContains('title') as any } ] }, select: { publicId: true, title: true }, take: 5 }),
  ]);

  const items: Item[] = [];
  for (const p of props) items.push({ type: 'property', label: p.title || `Propiedad ${p.publicId}`, value: p.publicId });
  for (const t of titles) if (t.title) items.push({ type: 'title', label: t.title, value: t.publicId });

  const seenType = new Set<string>();
  for (const t of types) { const v = (t.propertyType || '').trim(); if (v && !seenType.has(v.toLowerCase())) { seenType.add(v.toLowerCase()); items.push({ type: 'type', label: v, value: v }); } }
  const seenLoc = new Set<string>();
  for (const l of locs) { const v = (l.locationText || '').trim(); if (v && !seenLoc.has(v.toLowerCase())) { seenLoc.add(v.toLowerCase()); items.push({ type: 'location', label: v, value: v }); } }

  const qn = key;
  if (qn.includes('venta') || qn.includes('sale')) items.push({ type: 'operation', label: 'Venta', value: 'sale' });
  if (qn.includes('renta') || qn.includes('rent')) items.push({ type: 'operation', label: 'Renta', value: 'rental' });
  const availWords = ['available','disponible','active','activa','published','publicada'];
  if (availWords.some((w) => qn.includes(w))) items.push({ type: 'status', label: 'Disponibles', value: 'available' });

  const payload: Payload = { items };
  cache.set(key, { v: payload, exp: Date.now() + TTL });
  res.setHeader('Cache-Control','private, max-age=15, stale-while-revalidate=60');
  return res.status(200).json(payload);
}
