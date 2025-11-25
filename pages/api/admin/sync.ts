import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';
import { requireAdmin, methodNotAllowed } from './_utils';

const EB_API_BASE = 'https://api.easybroker.com/v1';

function requireKey() {
  const key = process.env.EASYBROKER_API_KEY;
  if (!key) throw new Error('EASYBROKER_API_KEY no está configurada');
  return key;
}

async function fetchJSON(url: string) {
  const r = await fetch(url, { headers: { accept: 'application/json', 'X-Authorization': requireKey() } });
  const text = await r.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch {}
  if (!r.ok) throw new Error(`HTTP ${r.status} ${url}: ${text}`);
  return json;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);

  const limit = Math.min(parseInt(String(req.query.limit ?? '100')) || 100, 200);
  let page = 1;
  const all: any[] = [];
  let safety = 0;
  while (safety < 100 && page) {
    const url = `${EB_API_BASE}/properties?page=${page}&limit=${limit}`;
    const data = await fetchJSON(url);
    const items = Array.isArray(data.content) ? data.content : [];
    all.push(...items);
    page = data?.pagination?.next_page ?? 0;
    safety++;
  }

  // Dedup by public_id
  const seen = new Set<string>();
  const list = all.filter((p) => p?.public_id && (seen.has(p.public_id) ? false : (seen.add(p.public_id), true)));

  async function fetchDetail(publicId: string) {
    const url = `${EB_API_BASE}/properties/${encodeURIComponent(publicId)}`;
    return fetchJSON(url);
  }

  const CONCURRENCY = 5;
  let idx = 0;
  let okCount = 0;
  const errors: any[] = [];
  async function worker() {
    while (true) {
      const i = idx++;
      if (i >= list.length) break;
      const it = list[i];
      const id = it.public_id as string;
      try {
        const detail = await fetchDetail(id);
        const payload: any = {
          publicId: id,
          title: detail.title ?? it.title ?? null,
          titleImageFull: detail.title_image_full ?? it.title_image_full ?? null,
          titleImageThumb: detail.title_image_thumb ?? it.title_image_thumb ?? null,
          propertyType: detail.property_type ?? it.property_type ?? null,
          status: detail.status ?? it.status ?? null,
          bedrooms: detail.bedrooms ?? it.bedrooms ?? null,
          bathrooms: detail.bathrooms ?? it.bathrooms ?? null,
          parkingSpaces: detail.parking_spaces ?? it.parking_spaces ?? null,
          lotSize: detail.lot_size ?? null,
          constructionSize: detail.construction_size ?? null,
          brokerName: detail?.broker?.name ?? null,
          locationText: (() => {
            const loc = detail.location ?? it.location;
            if (typeof loc === 'string') return loc;
            if (!loc || typeof loc !== 'object') return '';
            const o = loc as any;
            return [o.name, o.neighborhood, o.municipality || o.delegation, o.city, o.state, o.country].filter(Boolean).join(', ');
          })(),
          operationsJson: (() => {
            const val = (detail.operations ?? it.operations) || null;
            return val ? JSON.stringify(val) : null;
          })(),
          propertyImagesJson: (() => {
            const arr = Array.isArray(detail.property_images)
              ? detail.property_images
              : (Array.isArray((detail as any).images) ? (detail as any).images : null);
            return arr && arr.length ? JSON.stringify(arr) : null;
          })(),
          ebDetailJson: detail ? JSON.stringify(detail) : null,
        };
        await prisma.property.upsert({ where: { publicId: id }, update: { ...payload }, create: { ...payload } });
        okCount++;
      } catch (e: any) {
        errors.push({ id, error: e?.message || String(e) });
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  return res.status(200).json({ ok: true, imported: okCount, errors });
}
