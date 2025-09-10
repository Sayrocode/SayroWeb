import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../lib/prisma';

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

  const limit = Math.min(parseInt(String(req.query.limit ?? '100')) || 100, 200);

  const items = await prisma.property.findMany({
    where: {
      // Solo propiedades disponibles en el catálogo público
      status: 'available',
    },
    orderBy: { updatedAt: 'desc' },
    take: limit,
  });

  const content = items.map(toEBListItem);
  return res.status(200).json({ content, pagination: { limit, total: content.length, page: 1, next_page: null } });
}
