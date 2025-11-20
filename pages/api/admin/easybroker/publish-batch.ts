import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../../lib/prisma';
import { requireAdmin } from '../_utils';

const EB_BASE = 'https://api.easybroker.com/v1/properties';

function parseOperations(prop: any) {
  // Try ebDetailJson.operations, then operationsJson
  try { if (prop.ebDetailJson) { const j = JSON.parse(prop.ebDetailJson); if (Array.isArray(j?.operations)) return j.operations; } } catch {}
  try { if (prop.operationsJson) { const ops = JSON.parse(prop.operationsJson); if (Array.isArray(ops)) return ops; } } catch {}
  return [];
}

function normalizeType(raw?: string | null): string | undefined {
  const s = String(raw || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const has = (w: string) => s.includes(w);
  if (has('casa')) return 'Casa';
  if (has('depart') || has('depa') || has('apto') || has('apart') || has('loft') || has('duplex') || has('triplex') || has('penthouse') || s === 'ph' || has('studio')) return 'Departamento';
  if (has('terreno') || has('lote') || has('predio') || has('parcela')) return 'Terreno';
  if (has('oficina') || has('despacho')) return 'Oficina';
  if (has('local')) return 'Local';
  if (has('bodega')) return 'Bodega';
  if (has('nave') || has('industrial')) return 'Nave';
  return raw || undefined;
}

function toAbs(u: string, baseUrl: string) {
  if (!u) return '';
  return /^https?:\/\//i.test(u) ? u : `${baseUrl}${u.startsWith('/') ? '' : '/'}${u}`;
}

function buildBody(prop: any, baseUrl: string) {
  // 1) Imágenes desde media (Turso)
  const fromMedia = Array.isArray(prop?.media)
    ? (prop.media as any[]).map((m: any) => ({ url: `${baseUrl}/api/admin/images/${encodeURIComponent(m.key)}` }))
    : [];
  // 2) Imágenes desde propertyImagesJson o ebDetailJson.property_images
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
        return arr.map((it: any) => ({ url: toAbs(String(it?.url || ''), baseUrl) })).filter((it: { url: string }) => !!it.url);
      }
    } catch {}
    return [];
  })();
  const seen = new Set<string>();
  const images = [...fromMedia, ...fromJson].filter((it) => {
    const u = String(it?.url || '').trim();
    if (!u) return false;
    if (seen.has(u)) return false;
    seen.add(u);
    return true;
  });
  const operationsRaw = parseOperations(prop);
  const operations = Array.isArray(operationsRaw)
    ? operationsRaw.map((o: any) => {
        const type = String(o?.type || '').toLowerCase();
        const allowedType = type === 'sale' || type === 'rental' ? (type as 'sale'|'rental') : undefined;
        const unitRaw = String(o?.unit || 'total').toLowerCase();
        const unit = (['total','square_meter','hectare'].includes(unitRaw) ? unitRaw : 'total') as 'total'|'square_meter'|'hectare';
        if (!allowedType) return undefined;
        return { type: allowedType, active: typeof o?.active === 'boolean' ? o.active : true, amount: typeof o?.amount === 'number' ? o.amount : undefined, currency: 'mxn', unit };
      }).filter(Boolean)
    : [];
  const locText = prop.locationText || '';
  const body: any = {
    title: prop.title || `Propiedad ${prop.publicId || prop.id}`,
    property_type: normalizeType(prop.propertyType),
    description: (() => { try { const j = prop.ebDetailJson ? JSON.parse(prop.ebDetailJson) : null; return j?.description || undefined; } catch { return undefined; } })(),
    operations: operations.length ? operations : undefined,
    status: (prop.status && typeof prop.status === 'string') ? prop.status : 'not_published',
    location: { name: locText || undefined, street: (locText.split(',')[0] || '').trim() || undefined },
  };
  // Características y tamaños (si existen en DB)
  body.bedrooms = typeof prop.bedrooms === 'number' ? prop.bedrooms : undefined;
  body.bathrooms = typeof prop.bathrooms === 'number' ? prop.bathrooms : undefined;
  body.parking_spaces = typeof prop.parkingSpaces === 'number' ? prop.parkingSpaces : undefined;
  body.lot_size = typeof prop.lotSize === 'number' ? prop.lotSize : undefined;
  body.construction_size = typeof prop.constructionSize === 'number' ? prop.constructionSize : undefined;
  if (images.length) body.images = images;
  return { body, images };
}

function validateBody(body: any) {
  const issues: string[] = [];
  if (!body.property_type) issues.push('property_type requerido');
  const ops = Array.isArray(body.operations) ? body.operations : [];
  if (!ops.length) issues.push('operations vacío (precio requerido)');
  else {
    const ok = ops.some((o) => typeof o.amount === 'number' && o.amount > 0 && (o.type === 'sale' || o.type === 'rental'));
    if (!ok) issues.push('operations inválido (type/amount)');
  }
  // location at least name or street
  if (!body.location || (!body.location.name && !body.location.street)) issues.push('location incompleto');
  return issues;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const apiKey = process.env.EASYBROKER_API_KEY;
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  try {
    const parsed = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const ids = parsed?.ids;
    const overridesMap: Record<number, any> | undefined = (parsed && typeof parsed.overrides === 'object') ? parsed.overrides : undefined;
    const validateOnly = String(req.query.validate || '').trim() === '1';
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'ids_required' });
    const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_BASE_URL || '').replace(/\/$/, '') || `https://${req.headers.host}`;
    const rows = await prisma.property.findMany({ where: { id: { in: ids as number[] } }, include: { media: { orderBy: { createdAt: 'asc' } } } });
    const results: any[] = [];
    for (const prop of rows) {
      const pid = String(prop.publicId || '').toUpperCase();
      if (pid.startsWith('EB-')) { results.push({ id: prop.id, ok: false, reason: 'already_in_eb' }); continue; }
      let { body } = buildBody(prop as any, baseUrl);
      // Merge overrides if provided
      const ov = overridesMap?.[prop.id];
      if (ov && typeof ov === 'object') {
        try {
          const merged: any = { ...body };
          if (typeof ov.title === 'string') merged.title = ov.title;
          if (typeof ov.description === 'string') merged.description = ov.description;
          if (typeof ov.property_type === 'string') merged.property_type = ov.property_type;
          if (typeof ov.status === 'string') merged.status = ov.status;
          // Operations: accept direct operations or sale/rent fields
          if (Array.isArray(ov.operations)) merged.operations = ov.operations;
          else {
            const ops: any[] = [];
            const currency = 'mxn';
            if (ov.sale_amount) ops.push({ type: 'sale', amount: Number(ov.sale_amount), currency, unit: (ov.sale_unit || 'total') });
            if (ov.rent_amount) ops.push({ type: 'rental', amount: Number(ov.rent_amount), currency, unit: (ov.rent_unit || 'total') });
            if (ops.length) merged.operations = ops;
          }
          if (ov.location && typeof ov.location === 'object') {
            merged.location = { ...(merged.location || {}), ...ov.location };
          } else {
            const loc: any = {};
            if (typeof ov.location_name === 'string') loc.name = ov.location_name;
            if (typeof ov.street === 'string') loc.street = ov.street;
            if (typeof ov.postal_code === 'string') loc.postal_code = ov.postal_code;
            if (typeof ov.exterior_number === 'string') loc.exterior_number = ov.exterior_number;
            if (typeof ov.cross_street === 'string') loc.cross_street = ov.cross_street;
            if (ov.latitude != null) loc.latitude = Number(ov.latitude);
            if (ov.longitude != null) loc.longitude = Number(ov.longitude);
            merged.location = { ...(merged.location || {}), ...loc };
          }
          // Map custom status to EB enum
          if (typeof merged.status === 'string') {
            const s = String(merged.status).toLowerCase();
            merged.status = s.includes('public') ? 'published' : (s === 'published' || s === 'not_published' ? s : 'not_published');
          }
          // Top-level numeric fields
          if (ov.bedrooms != null) merged.bedrooms = Number(ov.bedrooms);
          if (ov.bathrooms != null) merged.bathrooms = Number(ov.bathrooms);
          if (ov.parking_spaces != null) merged.parking_spaces = Number(ov.parking_spaces);
          if (ov.lot_size != null) merged.lot_size = Number(ov.lot_size);
          if (ov.construction_size != null) merged.construction_size = Number(ov.construction_size);
          // images/property_images: accept array of strings or objects {url}
          const ovImgs = Array.isArray((ov as any).images)
            ? (ov as any).images
            : (Array.isArray((ov as any).property_images) ? (ov as any).property_images : undefined);
          if (Array.isArray(ovImgs)) {
            const arr = ovImgs.map((it: any) => ({ url: toAbs(typeof it === 'string' ? it : String(it?.url || ''), baseUrl) })).filter((it: any) => !!it.url);
            if (arr.length) (merged as any).images = arr;
          }
          body = merged;
        } catch {}
      }
      const issues = validateBody(body);
      if (issues.length || validateOnly || !apiKey) {
        // Keep preview backward-compatible: expose both keys for UI until all components migrate to `images`.
        const preview = { ...body } as any;
        if (Array.isArray((preview as any).images) && !Array.isArray((preview as any).property_images)) {
          (preview as any).property_images = (preview as any).images;
        }
        results.push({ id: prop.id, ok: issues.length === 0, issues, preview, reason: !apiKey ? 'missing_api_key' : undefined });
        continue;
      }
      try {
        // Ensure no legacy key leaks to EB
        const outbound: any = { ...body };
        if (Array.isArray(outbound.property_images)) delete outbound.property_images;
        const upstream = await fetch(EB_BASE, { method: 'POST', headers: { accept: 'application/json', 'content-type': 'application/json', 'X-Authorization': apiKey as string }, body: JSON.stringify(outbound) });
        const text = await upstream.text();
        let data: any = null; try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
        if (!upstream.ok) { results.push({ id: prop.id, ok: false, reason: 'eb_error', data }); continue; }
        try {
          const patch: any = { ebDetailJson: JSON.stringify(data) };
          const ebPublicId = data?.public_id || data?.publicId || null;
          if (ebPublicId && !prop.publicId) patch.publicId = String(ebPublicId);
          await prisma.property.update({ where: { id: prop.id }, data: patch });
        } catch {}
        results.push({ id: prop.id, ok: true, data });
      } catch (e: any) {
        results.push({ id: prop.id, ok: false, reason: 'exception', message: e?.message || String(e) });
      }
    }
    return res.status(200).json({ ok: true, results });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: 'batch_error', message: e?.message || String(e) });
  }
}
