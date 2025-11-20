import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAdmin, methodNotAllowed } from '../../_utils';
import { saveUserToken, getStoredUserToken } from '../../../../../lib/metaStore';

const GRAPH_VERSION = process.env.META_GRAPH_VERSION || 'v19.0';

async function httpJson(url: string) {
  const r = await fetch(url);
  const txt = await r.text();
  try { return JSON.parse(txt); } catch { throw new Error(txt); }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);

  const appId = (process.env.META_APP_ID || '').trim();
  const appSecret = (process.env.META_APP_SECRET || '').trim();
  const dbTok = await getStoredUserToken();
  const currentToken = dbTok?.token || (process.env.META_ACCESS_TOKEN || '').trim();

  if (!appId || !appSecret) return res.status(400).json({ ok: false, error: 'Faltan META_APP_ID y/o META_APP_SECRET' });
  if (!currentToken) return res.status(400).json({ ok: false, error: 'Falta META_ACCESS_TOKEN actual' });

  try {
    const url = `https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token?grant_type=fb_exchange_token&client_id=${encodeURIComponent(appId)}&client_secret=${encodeURIComponent(appSecret)}&fb_exchange_token=${encodeURIComponent(currentToken)}`;
    const j = await httpJson(url);
    const newToken = j?.access_token as string | undefined;
    const expiresIn = typeof j?.expires_in === 'number' ? j.expires_in : null;
    const expiresAt = typeof expiresIn === 'number' ? new Date(Date.now() + expiresIn*1000) : null;
    if (!newToken) return res.status(400).json({ ok: false, error: 'No se obtuvo access_token' });
    await saveUserToken(newToken, expiresAt || null);
    return res.status(200).json({ ok: true, access_token: newToken, expiresAt: expiresAt ? expiresAt.toISOString() : null, stored: true });
  } catch (e: any) {
    return res.status(400).json({ ok: false, error: e?.message || 'No se pudo refrescar' });
  }
}
