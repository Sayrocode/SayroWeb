import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../../../../lib/prisma';
import { requireAdmin } from '../../../_utils';
import { getBaseUrlFromReq } from '../../../../../../lib/meta';

const EB_BASE = 'https://api.easybroker.com/v1/properties';

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

  const images = (prop.media || []).map((m) => ({ url: `${baseUrl}/api/admin/images/${encodeURIComponent(m.key)}` }));
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

  // Location heuristic
  const locText = prop.locationText || '';
  const [maybeName] = locText ? [locText] : [''];
  const street = locText ? (locText.split(',')[0] || '').trim() : '';
  const body: any = {
    title: prop.title || `Propiedad ${prop.publicId || id}`,
    property_type: prop.propertyType || undefined,
    description: (() => { try { const j = prop.ebDetailJson ? JSON.parse(prop.ebDetailJson) : null; return j?.description || undefined; } catch { return undefined; } })(),
    operations: operations.length ? operations : undefined,
    status: (prop.status && typeof prop.status === 'string') ? prop.status : 'not_published',
    location: { name: maybeName, street },
  };

  if (req.method === 'GET') {
    return res.status(200).json({ preview: body });
  }

  if (req.method === 'POST') {
    try {
      const upstream = await fetch(EB_BASE, {
        method: 'POST',
        headers: { accept: 'application/json', 'content-type': 'application/json', 'X-Authorization': apiKey },
        body: JSON.stringify(body),
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
