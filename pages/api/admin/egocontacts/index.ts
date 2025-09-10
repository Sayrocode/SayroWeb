import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../../lib/prisma';
import { requireAdmin, methodNotAllowed } from '../_utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireAdmin(req, res);
  if (!user) return;

  if (req.method === 'GET') {
    const take = Math.min(parseInt(String(req.query.take ?? '50')) || 50, 200);
    const page = Math.max(parseInt(String(req.query.page ?? '1')) || 1, 1);
    const skip = (page - 1) * take;
    const q = (String(req.query.q ?? '')).trim().toLowerCase();
    const where = q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
            { phone: { contains: q, mode: 'insensitive' } },
            { responsible: { contains: q, mode: 'insensitive' } },
          ],
        }
      : {};
    // If the Prisma Client hasn't been regenerated yet, egoContact may be undefined.
    const ego = (prisma as any).egoContact;
    if (!ego || typeof ego.findMany !== 'function') {
      return res.status(200).json({ items: [], total: 0, page, take, note: 'EgoContact model no disponible en Prisma Client. Ejecuta: yarn prisma:generate && yarn db:push (o yarn db:sql && yarn db:deploy:turso) para aplicar el esquema.' });
    }
    const [items, total] = await Promise.all([
      ego.findMany({ where, orderBy: { updatedAt: 'desc' }, skip, take }),
      ego.count({ where }),
    ]);
    return res.status(200).json({ items, total, page, take });
  }

  return methodNotAllowed(res, ['GET']);
}
