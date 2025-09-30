import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../../lib/prisma';
import { requireAdmin, methodNotAllowed } from '../_utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const id = parseInt(String(req.query.id));
  if (!id) return res.status(400).json({ error: 'ID inválido' });

  const ego = (prisma as any).egoContact;
  if (!ego || typeof ego.findUnique !== 'function') {
    return res.status(500).json({ error: 'EgoContact no disponible en Prisma Client; corre prisma:generate y migra la BD.' });
  }

  if (req.method === 'GET') {
    const item = await ego.findUnique({ where: { id } });
    if (!item) return res.status(404).json({ error: 'No encontrado' });
    return res.status(200).json(item);
  }

  if (req.method === 'PUT') {
    const body = req.body || {};
    const fields = ['name','role','phone','email','createdText','responsible','personId'];
    const data: any = {};
    for (const f of fields) if (f in body) data[f] = body[f];
    const updated = await ego.update({ where: { id }, data });
    return res.status(200).json({ ok: true, id: updated.id });
  }

  if (req.method === 'DELETE') {
    await ego.delete({ where: { id } });
    return res.status(200).json({ ok: true });
  }

  return methodNotAllowed(res, ['GET','PUT','DELETE']);
}
