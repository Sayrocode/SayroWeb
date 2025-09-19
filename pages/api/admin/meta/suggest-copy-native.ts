import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../../lib/prisma';
import { requireAdmin, methodNotAllowed } from '../_utils';
import { generateNativeCopy, generateNativeCarousel } from '../../../../lib/nativeCopy';

type Body = {
  propertyIds: number[];
  adType: 'single' | 'carousel';
  baseDescription?: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);

  const { propertyIds, adType, baseDescription } = (req.body || {}) as Body;
  if (!Array.isArray(propertyIds) || propertyIds.length === 0) return res.status(400).json({ error: 'Selecciona propiedades' });
  if (adType !== 'single' && adType !== 'carousel') return res.status(400).json({ error: 'Tipo inválido' });

  const props = await prisma.property.findMany({ where: { id: { in: propertyIds } } });
  if (!props.length) return res.status(404).json({ error: 'Propiedades no encontradas' });

  if (adType === 'single') {
    const p = props[0];
    const copy = generateNativeCopy(baseDescription || '', p);
    return res.status(200).json({ ok: true, type: 'single', copy });
  }

  const { message, copies } = generateNativeCarousel(baseDescription || '', props);
  return res.status(200).json({ ok: true, type: 'carousel', message, copies });
}

