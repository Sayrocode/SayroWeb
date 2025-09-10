import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../../lib/prisma';
import { requireAdmin, methodNotAllowed } from '../_utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  if (req.method === 'GET') {
    const take = Math.min(500, Math.max(1, parseInt(String(req.query.take || '100'), 10) || 100));
    const leads = await prisma.lead.findMany({
      orderBy: { createdAt: 'desc' },
      take,
      include: { property: { select: { id: true, publicId: true, title: true } } },
    });
    return res.status(200).json({ items: leads });
  }

  return methodNotAllowed(res, ['GET']);
}

