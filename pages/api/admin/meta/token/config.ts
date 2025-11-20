import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAdmin, methodNotAllowed } from '../../_utils';
import { setAppCreds } from '../../../../../lib/metaStore';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  const { appId, appSecret } = req.body || {};
  if (!appId || !appSecret) return res.status(400).json({ ok: false, error: 'appId y appSecret requeridos' });
  await setAppCreds(String(appId).trim(), String(appSecret).trim());
  return res.status(200).json({ ok: true });
}

