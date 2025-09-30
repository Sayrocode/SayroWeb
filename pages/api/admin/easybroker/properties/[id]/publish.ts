import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../../../../lib/prisma';
import { requireAdmin } from '../../../_utils';
import { getBaseUrlFromReq } from '../../../../../../lib/meta';

const EB_BASE = 'https://api.easybroker.com/v1/properties';

function norm(s: string) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function normalizeType(raw?: string | null): string | undefined {
  const s = norm(String(raw || ''));
  const has = (w: string) => s.includes(w);
  if (has('casa')) return 'Casa';
  if (has('depart') || has('depa') || has('apto') || has('apart') || has('loft') || has('duplex') || has('triplex') || has('penthouse') || s === 'ph' || has('studio')) return 'Departamento';
  if (has('terreno') || has('lote') || has('predio') || has('parcela')) return 'Terreno';
  if (has('oficina') || has('despacho')) return 'Oficina';
  if (has('local')) return 'Local';
  if (has('bodega')) return 'Bodega';
  if (has('nave') || has('industrial')) return 'Nave';
  return (raw || undefined) as any;
}

function toAbs(u: string, baseUrl: string) {
  if (!u) return '';
  return /^https?:\/\//i.test(u) ? u : `${baseUrl}${u.startsWith('/') ? '' : '/'}${u}`;
}

function parseOperations(prop: any): any[] {
  // Try ebDetailJson.operations, then operationsJson
  try {
    if (prop.ebDetailJson) {
      const j = JSON.parse(prop.ebDetailJson);
      if (Array.isArray(j?.operations)) return j.operations;
    }
  } catch {}
  try {
    if (prop.operationsJson) {
      const ops = JSON.parse(prop.operationsJson);
      if (Array.isArray(ops)) return ops;
    }
  } catch {}
  return [];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const apiKey = process.env.EASYBROKER_API_KEY;
  if (!apiKey) return res.status(400).json({ error: 'Falta EASYBROKER_API_KEY' });

  const id = parseInt(String(req.query.id));
  if (!id) return res.status(400).json({ error: 'ID inválido' });

  // Build EB payload from our DB
  const prop = await prisma.property.findUnique({
    where: { id },
    include: { media: { orderBy: { createdAt: 'asc' } } },
  });
  if (!prop) return res.status(404).json({ error: 'No encontrado' });

  const baseUrl = getBaseUrlFromReq(req);

  // property_images: Turso media + saved JSON (propertyImagesJson / ebDetailJson.property_images)
  const fromMedia = Array.isArray(prop.media) ? prop.media.map((m) => ({ url: `${baseUrl}/api/admin/images/${encodeURIComponent(m.key)}` })) : [];
  const fromJson: Array<{ url: string }> = (() => {
    try {
      if (prop.propertyImagesJson) {
        const arr = JSON.parse(prop.propertyImagesJson);
        if (Array.isArray(arr)) return arr.map((it: any) => ({ url: toAbs(String(it?.url || ''), baseUrl) })).filter((it) => !!it.url);
      }
    } catch {}
    try {
      if (prop.ebDetailJson) {
        const j = JSON.parse(prop.ebDetailJson);
        const arr = Array.isArray(j?.property_images) ? j.property_images : [];
        return arr.map((it: any) => ({ url: toAbs(String(it?.url || ''), baseUrl) })).filter((it) => !!it.url);
      }
    } catch {}
    return [];
  })();
  const seen = new Set<string>();
  const images = [...fromMedia, ...fromJson].filter((it) => {
    const u = String(it?.url || ''); if (!u) return false; if (seen.has(u)) return false; seen.add(u); return true;
  });
  const operationsRaw = parseOperations(prop);
  const operations = Array.isArray(operationsRaw)
    ? operationsRaw
        .map((o: any) => {
          const type = String(o?.type || '').toLowerCase();
          const allowedType = type === 'sale' || type === 'rental' ? (type as 'sale' | 'rental') : undefined;
          const unitRaw = String(o?.unit || 'total').toLowerCase();
          const unit = (['total', 'square_meter', 'hectare'].includes(unitRaw) ? unitRaw : 'total') as 'total'|'square_meter'|'hectare';
          if (!allowedType) return undefined;
          return {
            type: allowedType,
            active: typeof o?.active === 'boolean' ? o.active : true,
            amount: typeof o?.amount === 'number' ? o.amount : undefined,
            currency: 'mxn',
            unit,
          };
        })
        .filter(Boolean)
    : [];

  // Location: prefer structured from ebDetailJson if exists; otherwise, minimal from locationText
  const locText = prop.locationText || '';
  let location: any = { name: locText || undefined, street: locText ? (locText.split(',')[0] || '').trim() : undefined };
  try {
    const j = prop.ebDetailJson ? JSON.parse(prop.ebDetailJson) : null;
    const loc = j?.location;
    if (loc && typeof loc === 'object') {
      const stateMap: Record<string,string> = { 'queretaro': 'Querétaro', 'cdmx': 'Ciudad de México', 'ciudad de mexico': 'Ciudad de México' };
      const sanitize = (x: any) => (typeof x === 'string' && x.trim()) ? x.trim() : undefined;
      let latitude = typeof loc.latitude === 'number' ? loc.latitude : undefined;
      let longitude = typeof loc.longitude === 'number' ? loc.longitude : undefined;
      // Mexico longitudes negativas (si vienen positivas por error)
      if (longitude != null && Math.abs(longitude) <= 180 && longitude > 0) longitude = -Math.abs(longitude);
      location = {
        name: sanitize(loc.name) || location.name,
        street: sanitize(loc.street) || location.street,
        postal_code: sanitize(loc.postal_code),
        exterior_number: sanitize(loc.exterior_number),
        cross_street: sanitize(loc.cross_street),
        latitude: latitude,
        longitude: longitude,
      };
    }
  } catch {}

  // Remove undefined keys (strict whitelist for EB)
  Object.keys(location).forEach((k) => (location as any)[k] === undefined && delete (location as any)[k]);
  const body: any = {
    title: prop.title || `Propiedad ${prop.publicId || id}`,
    // Usar el tipo tal como se guardó (catálogo EB de la cuenta). Fallback al normalizador solo si no hay valor.
    property_type: (prop.propertyType && String(prop.propertyType).trim()) || normalizeType(prop.propertyType) || undefined,
    description: (() => { try { const j = prop.ebDetailJson ? JSON.parse(prop.ebDetailJson) : null; return j?.description || undefined; } catch { return undefined; } })(),
    operations: operations.length ? operations : undefined,
    status: (String(prop.status || '').toLowerCase().includes('public')) ? 'published' : 'not_published',
    location,
    // Características y tamaños
    bedrooms: typeof (prop as any).bedrooms === 'number' ? (prop as any).bedrooms : undefined,
    bathrooms: typeof (prop as any).bathrooms === 'number' ? (prop as any).bathrooms : undefined,
    parking_spaces: typeof (prop as any).parkingSpaces === 'number' ? (prop as any).parkingSpaces : undefined,
    lot_size: typeof (prop as any).lotSize === 'number' ? (prop as any).lotSize : undefined,
    construction_size: typeof (prop as any).constructionSize === 'number' ? (prop as any).constructionSize : undefined,
  };
  if (images.length) body.images = images;

  if (req.method === 'GET') {
    return res.status(200).json({ preview: body });
  }

  if (req.method === 'POST') {
    try {
      // Remove legacy key if present
      const outbound: any = { ...body };
      if (Array.isArray(outbound.property_images)) delete outbound.property_images;
      const upstream = await fetch(EB_BASE, {
        method: 'POST',
        headers: { accept: 'application/json', 'content-type': 'application/json', 'X-Authorization': apiKey },
        body: JSON.stringify(outbound),
      });
      const text = await upstream.text();
      let data: any = null;
      try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
      if (!upstream.ok) return res.status(upstream.status).json({ ok: false, error: 'eb_error', data });

      // Persist EB detail/public id when possible
      try {
        const ebPublicId = data?.public_id || data?.publicId || null;
        const patch: any = { ebDetailJson: JSON.stringify(data) };
        if (ebPublicId && !prop.publicId) patch.publicId = String(ebPublicId);
        await prisma.property.update({ where: { id }, data: patch });
      } catch {}

      return res.status(201).json({ ok: true, data });
    } catch (e: any) {
      return res.status(500).json({ ok: false, error: 'eb_exception', message: e?.message || String(e) });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method Not Allowed' });
}
