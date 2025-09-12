import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';

function isPublicable(status?: string | null): boolean {
  if (!status) return false;
  const t = String(status).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  return [
    'available','disponible','active','activa','published','publicada','en venta','en renta',
  ].includes(t);
}

function formatPrice(amount?: number | null, currency?: string | null) {
  if (typeof amount !== 'number') return undefined;
  const cur = (currency || 'MXN').toUpperCase();
  try { return new Intl.NumberFormat('es-MX', { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(amount); }
  catch { return String(amount); }
}

function mapOperations(p: any) {
  let ops: any[] = [];
  try { const detail = p.ebDetailJson ? JSON.parse(p.ebDetailJson) : null; if (Array.isArray(detail?.operations)) ops = detail.operations; } catch {}
  if (!ops.length && p.operationsJson) { try { const arr = JSON.parse(p.operationsJson); if (Array.isArray(arr)) ops = arr; } catch {} }
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

  const limit = Math.max(1, Math.min(parseInt(String(req.query.limit ?? '18')) || 18, 60));
  const page = Math.max(1, parseInt(String(req.query.page ?? '1')) || 1);
  const skip = (page - 1) * limit;

  const baseStatuses = [
    'available','disponible','active','activa','published','publicada','en venta','en renta',
  ];
  const allowedStatuses = Array.from(new Set<string>([
    ...baseStatuses,
    ...baseStatuses.map((s) => s.charAt(0).toUpperCase() + s.slice(1)),
    ...baseStatuses.map((s) => s.toUpperCase()),
  ]));
  const where: any = { status: { in: allowedStatuses } };

  // Count only publicable
  const [rows, totalCount] = await Promise.all([
    prisma.property.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip,
      take: limit,
      include: { media: { select: { key: true, filename: true }, take: 1, orderBy: { createdAt: 'desc' } } },
    }),
    prisma.property.count({ where }),
  ]);

  // Map to EB-like list response
  const items = rows
    .map((p) => {
      const firstMedia = Array.isArray((p as any).media) && (p as any).media.length ? (p as any).media[0] as any : null;
      const url = firstMedia?.key ? `/api/admin/images/${encodeURIComponent(firstMedia.key)}` : '/image3.jpg';
      let coverZoom: number | undefined;
      if (firstMedia?.filename && typeof firstMedia.filename === 'string') {
        const m = firstMedia.filename.match(/zoom[-_]?([0-9]+(?:\.[0-9]+)?)/i);
        if (m && m[1]) {
          const z = parseFloat(m[1]);
          if (Number.isFinite(z) && z >= 1.0 && z <= 2.0) coverZoom = z;
        }
      }
      const operations = mapOperations(p);
      return {
        public_id: p.publicId,
        title: p.title,
        title_image_full: url,
        title_image_thumb: url,
        property_images: firstMedia ? [{ url }] : [],
        location: p.locationText,
        property_type: p.propertyType,
        status: p.status,
        bedrooms: p.bedrooms,
        bathrooms: p.bathrooms,
        parking_spaces: p.parkingSpaces,
        operations,
        lot_size: p.lotSize,
        construction_size: p.constructionSize,
        cover_zoom: coverZoom,
      };
    });

  const totalPages = Math.max(1, Math.ceil(totalCount / limit));
  res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=300');
  return res.status(200).json({
    pagination: { limit, page, total_pages: totalPages },
    content: items,
  });
}
