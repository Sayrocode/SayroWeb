import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../../lib/prisma';
import { requireAdmin, methodNotAllowed } from '../_utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireAdmin(req, res);
  if (!user) return;

  if (req.method === 'GET') {
    const take = Math.min(parseInt(String(req.query.take ?? '24')) || 24, 100);
    const page = Math.max(parseInt(String(req.query.page ?? '1')) || 1, 1);
    const skip = (page - 1) * take;
    const [items, total] = await Promise.all([
      prisma.property.findMany({
        orderBy: { updatedAt: 'desc' },
        skip,
        take,
        include: { media: { take: 1, orderBy: { createdAt: 'asc' } } },
      }),
      prisma.property.count(),
    ]);

    const data = items.map((p) => {
      let coverUrl: string | null = null;
      if (p.media && p.media.length) {
        coverUrl = `/api/admin/images/${encodeURIComponent(p.media[0].key)}`;
      } else if (p.titleImageThumb) {
        coverUrl = p.titleImageThumb;
      } else if (p.titleImageFull) {
        coverUrl = p.titleImageFull;
      } else if (p.propertyImagesJson) {
        try {
          const arr = JSON.parse(p.propertyImagesJson);
          if (Array.isArray(arr) && arr.length && arr[0]?.url) coverUrl = arr[0].url;
        } catch {}
      }
      // derive price
      let operations: any[] = [];
      try {
        if (p.ebDetailJson) {
          const j = JSON.parse(p.ebDetailJson);
          if (Array.isArray(j?.operations)) operations = j.operations;
        }
        if ((!operations || operations.length === 0) && p.operationsJson) {
          const j = JSON.parse(p.operationsJson);
          if (Array.isArray(j)) operations = j;
        }
      } catch {}

      const formattedPrice = (() => {
        if (!operations.length) return null;
        const sale = operations.find((o) => o?.type === 'sale');
        const rental = operations.find((o) => o?.type === 'rental');
        const ch = sale || rental || operations[0];
        if (ch?.formatted_amount) return ch.formatted_amount as string;
        if (typeof ch?.amount === 'number') {
          const currency = ch.currency || 'MXN';
          try {
            return new Intl.NumberFormat('es-MX', { style: 'currency', currency, maximumFractionDigits: 0 }).format(ch.amount);
          } catch { return String(ch.amount); }
        }
        return null;
      })();

      return {
        id: p.id,
        publicId: p.publicId,
        title: p.title || `Propiedad ${p.publicId}`,
        coverUrl,
        propertyType: p.propertyType,
        status: p.status,
        price: formattedPrice,
        updatedAt: p.updatedAt,
      };
    });

    return res.status(200).json({ items: data, total, page, take });
  }

  return methodNotAllowed(res, ['GET']);
}
