import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../../lib/prisma';
import { requireAdmin, methodNotAllowed } from '../_utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireAdmin(req, res);
  if (!user) return;

  if (req.method === 'GET') {
    // Light private caching for admin navigation
    res.setHeader('Cache-Control', 'private, max-age=10, stale-while-revalidate=60');
    const take = Math.min(parseInt(String(req.query.take ?? '24')) || 24, 100);
    const page = Math.max(parseInt(String(req.query.page ?? '1')) || 1, 1);
    const skip = (page - 1) * take;
    const q = String(req.query.q || '').trim();
    const fast = String(req.query.fast || '').trim();
    const type = String(req.query.type || '').trim();
    const city = String(req.query.city || '').trim();

    const where: any = {};
    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { publicId: { contains: q, mode: 'insensitive' } },
        { locationText: { contains: q, mode: 'insensitive' } },
        { propertyType: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (type) where.propertyType = type;
    if (city) where.locationText = { contains: city, mode: 'insensitive' };
    const listPromise = prisma.property.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip,
      take,
      include: { media: { select: { key: true, filename: true }, take: 1, orderBy: { createdAt: 'desc' } } },
    });
    const countPromise = (q || fast || type || city) ? Promise.resolve(null as any) : prisma.property.count({ where });
    const [items, total] = await Promise.all([listPromise, countPromise]);

    const data = items.map((p) => {
      // Solo usar imágenes locales (Turso) o placeholder público
      let coverUrl: string | null = null;
      let coverZoom: number | null = null;
      if (p.media && p.media.length && (p.media[0] as any).key) {
        const m = p.media[0] as any;
        coverUrl = `/api/admin/images/${encodeURIComponent(m.key)}`;
        // Optional: infer zoom from filename pattern like "zoom-1.15.jpg"
        if (typeof m.filename === 'string') {
          const match = m.filename.match(/zoom[-_]?([0-9]+(?:\.[0-9]+)?)?/i);
          if (match && match[1]) {
            const z = parseFloat(match[1]);
            if (Number.isFinite(z) && z >= 1.0 && z <= 2.0) coverZoom = z;
          }
        }
      } else {
        coverUrl = '/image3.jpg';
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

      let numericPrice: number | null = null;
      const formattedPrice = (() => {
        if (!operations.length) return null;
        const sale = operations.find((o) => o?.type === 'sale');
        const rental = operations.find((o) => o?.type === 'rental');
        const ch = sale || rental || operations[0];
        const amt = typeof ch?.amount === 'number' ? ch.amount : (
          Array.isArray(ch?.prices) ? ch.prices?.[0]?.amount : undefined
        );
        if (typeof amt === 'number') numericPrice = amt;
        if (ch?.formatted_amount) return ch.formatted_amount as string;
        if (typeof amt === 'number') {
          const currency = ch.currency || 'MXN';
          try {
            return new Intl.NumberFormat('es-MX', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amt);
          } catch { return String(amt); }
        }
        return null;
      })();

      return {
        id: p.id,
        publicId: p.publicId,
        title: p.title || `Propiedad ${p.publicId}`,
        coverUrl,
        coverZoom,
        propertyType: p.propertyType,
        status: p.status,
        locationText: p.locationText,
        bedrooms: p.bedrooms,
        bathrooms: p.bathrooms,
        parkingSpaces: p.parkingSpaces,
        lotSize: p.lotSize,
        constructionSize: p.constructionSize,
        price: formattedPrice,
        priceAmount: numericPrice,
        updatedAt: p.updatedAt,
      };
    });

    return res.status(200).json({ items: data, total, page, take });
  }

  return methodNotAllowed(res, ['GET']);
}
