import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../../../lib/prisma';
import { requireAdmin, methodNotAllowed } from '../../_utils';
import crypto from 'node:crypto';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '25mb',
    },
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const id = parseInt(String(req.query.id));
  if (!id) return res.status(400).json({ error: 'ID inválido' });

  if (req.method === 'POST') {
    // Expect JSON: { filename, mimeType, base64 }
    const { filename, mimeType, base64 } = req.body || {};
    if (!mimeType || !base64) return res.status(400).json({ error: 'Datos inválidos' });
    const b64 = String(base64).replace(/^data:[^;]+;base64,/, '');
    const buf = Buffer.from(b64, 'base64');
    const key = `property/${id}/${crypto.randomUUID()}`;
    const created = await prisma.mediaObject.create({
      data: {
        key,
        mimeType,
        size: buf.length,
        data: buf,
        filename: filename || null,
        property: { connect: { id } },
      },
      select: { key: true, mimeType: true, size: true, filename: true },
    });
    return res.status(201).json(created);
  }

  return methodNotAllowed(res, ['POST']);
}

