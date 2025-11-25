import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../../lib/prisma';
import { requireAdmin, methodNotAllowed } from '../_utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  if (req.method === 'GET') {
    // Light private caching to reduce refetches from the client while navigating
    // and scrolling. Safe for admin-only data (no CDN cache).
    res.setHeader('Cache-Control', 'private, max-age=10, stale-while-revalidate=60');
    const take = Math.min(120, Math.max(1, parseInt(String(req.query.take || '60'), 10) || 60));
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
    const skip = (page - 1) * take;
    const q = String(req.query.q || '').trim();
    const source = String(req.query.source || '').trim(); // optional filter
    const fast = String(req.query.fast || '').trim(); // when truthy, skip heavy total count

    const where: any = {};
    if (q) {
      const digits = q.replace(/\D+/g, '');
      // Heuristic: if user types mostly digits (likely phone/id), narrow search to numeric fields
      if (digits.length >= 5 && digits.length >= Math.floor(q.length * 0.6)) {
        where.OR = [
          { phone: { contains: digits } },
          { propertyPublicId: { contains: digits, mode: 'insensitive' } },
        ];
      } else {
        where.OR = [
          { name: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
          { phone: { contains: q, mode: 'insensitive' } },
          { message: { contains: q, mode: 'insensitive' } },
          { propertyPublicId: { contains: q, mode: 'insensitive' } },
        ];
      }
    }
    if (source) where.source = source;

    if (fast || q) {
      // Fast path: skip total count to reduce DB work under search/typing
      const items = await prisma.lead.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
        skip,
        include: { property: { select: { id: true, publicId: true, title: true } } },
      });
      return res.status(200).json({ items, total: null, page, take });
    } else {
      const [total, items] = await Promise.all([
        prisma.lead.count({ where }),
        prisma.lead.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take,
          skip,
          include: { property: { select: { id: true, publicId: true, title: true } } },
        }),
      ]);
      return res.status(200).json({ items, total, page, take });
    }
  }

  if (req.method === 'DELETE') {
    const id = parseInt(String(req.query.id || req.body?.id || ''), 10);
    if (!id) return res.status(400).json({ error: 'invalid_id' });
    await prisma.lead.delete({ where: { id } });
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'PUT') {
    const id = parseInt(String(req.query.id || req.body?.id || ''), 10);
    if (!id) return res.status(400).json({ error: 'invalid_id' });
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const data: any = {};
    ['name', 'email', 'phone', 'message', 'propertyPublicId'].forEach((k) => {
      if (k in body) data[k] = body[k];
    });
    await prisma.lead.update({ where: { id }, data });
    return res.status(200).json({ ok: true });
  }

  return methodNotAllowed(res, ['GET', 'DELETE', 'PUT']);
}
