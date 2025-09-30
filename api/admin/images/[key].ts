import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../../lib/prisma';
import { requireAdmin, methodNotAllowed } from '../_utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const key = String(req.query.key);
    const obj = await prisma.mediaObject.findUnique({ where: { key } });
    if (!obj) return res.status(404).end('Not found');
    res.setHeader('Content-Type', obj.mimeType);
    res.setHeader('Content-Length', String(obj.size));
    // Make images cacheable; keys are content-addressed/unique in practice
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return res.status(200).send(Buffer.from(obj.data));
  }

  // For destructive operations, require admin
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  if (req.method === 'DELETE') {
    const key = String(req.query.key);
    await prisma.mediaObject.delete({ where: { key } });
    return res.status(200).json({ ok: true });
  }

  return methodNotAllowed(res, ['GET', 'DELETE']);
}
