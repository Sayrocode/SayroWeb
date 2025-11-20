import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAdmin, methodNotAllowed } from '../../_utils';
import { exchangeForLongLivedUserToken } from '../../../../../lib/metaStore';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);

  const { userToken } = req.body || {};
  if (!userToken || typeof userToken !== 'string') return res.status(400).json({ ok: false, error: 'userToken requerido' });
  try {
    const out = await exchangeForLongLivedUserToken(userToken.trim());
    return res.status(200).json({ ok: true, expiresAt: out.expiresAt ? out.expiresAt.toISOString() : null });
  } catch (e: any) {
    return res.status(400).json({ ok: false, error: e?.message || 'No se pudo intercambiar' });
  }
}

