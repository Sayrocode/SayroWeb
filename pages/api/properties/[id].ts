import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';

function formatPrice(amount?: number | null, currency?: string | null) {
  if (typeof amount !== 'number') return undefined;
  const cur = (currency || 'MXN').toUpperCase();
  try {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(amount);
  } catch { return String(amount); }
}

function mapOperations(p: any) {
  let ops: any[] = [];
  try {
    const detail = p.ebDetailJson ? JSON.parse(p.ebDetailJson) : null;
    if (Array.isArray(detail?.operations)) ops = detail.operations;
  } catch {}
  if (!ops.length && p.operationsJson) {
    try { const arr = JSON.parse(p.operationsJson); if (Array.isArray(arr)) ops = arr; } catch {}
  }
  return ops.map((o) => ({
    type: o?.type,
    amount: typeof o?.amount === 'number' ? o.amount : (Array.isArray(o?.prices) ? o.prices?.[0]?.amount : undefined),
    currency: o?.currency || (Array.isArray(o?.prices) ? o.prices?.[0]?.currency : undefined) || 'MXN',
    formatted_amount: undefined as string | undefined,
  })).map((op) => ({ ...op, formatted_amount: formatPrice(op.amount, op.currency) }));
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const id = String(req.query.id);
  const p = await prisma.property.findUnique({ where: { publicId: id } });
  if (!p) return res.status(404).json({ error: 'Not Found' });
  if (p.status === 'retired' || p.status === 'unknown') return res.status(404).json({ error: 'Not Found' });

  // Map to EB detail-ish shape used by the page
  let description: string | null = null;
  let broker: any = null;
  try {
    const detail = p.ebDetailJson ? JSON.parse(p.ebDetailJson) : null;
    if (detail?.description) description = detail.description;
    if (detail?.broker) broker = detail.broker;
  } catch {}

  let property_images: any[] = [];
  try { const arr = p.propertyImagesJson ? JSON.parse(p.propertyImagesJson) : []; if (Array.isArray(arr)) property_images = arr; } catch {}

  const out = {
    public_id: p.publicId,
    title: p.title,
    title_image_full: p.titleImageFull,
    title_image_thumb: p.titleImageThumb,
    property_images,
    description,
    location: p.locationText,
    property_type: p.propertyType,
    status: p.status,
    bedrooms: p.bedrooms,
    bathrooms: p.bathrooms,
    parking_spaces: p.parkingSpaces,
    operations: mapOperations(p),
    lot_size: p.lotSize,
    construction_size: p.constructionSize,
    broker: broker ? { name: broker?.name || p.brokerName || null } : (p.brokerName ? { name: p.brokerName } : null),
  };

  return res.status(200).json(out);
}

