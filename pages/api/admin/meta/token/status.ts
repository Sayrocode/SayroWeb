import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAdmin, methodNotAllowed } from '../../_utils';
import { getStoredUserToken, hasAppCreds, getAppAccessToken } from '../../../../../lib/metaStore';

const GRAPH_VERSION = process.env.META_GRAPH_VERSION || 'v19.0';

async function httpJson(url: string) {
  const r = await fetch(url);
  const txt = await r.text();
  try { return JSON.parse(txt); } catch { throw new Error(txt); }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);

  const db = await getStoredUserToken();
  const token = db?.token || (process.env.META_ACCESS_TOKEN || '').trim();
  if (!token) return res.status(200).json({ ok: true, hasToken: false, source: 'none' });

  const can = await hasAppCreds();
  if (!can) return res.status(200).json({ ok: true, hasToken: true, canDebug: false });
  try {
    // Build app token from env or DB
    const appAccess = await getAppAccessToken();
    if (!appAccess) throw new Error('Faltan credenciales App');
    const url = `https://graph.facebook.com/${GRAPH_VERSION}/debug_token?input_token=${encodeURIComponent(token)}&access_token=${encodeURIComponent(appAccess)}`;
    const j = await httpJson(url);
    const data = j?.data || {};
    const expiresAtSec = typeof data?.expires_at === 'number' ? data.expires_at : null;
    const expiresAt = expiresAtSec ? new Date(expiresAtSec * 1000) : null;
    const daysLeft = expiresAt ? Math.floor((expiresAt.getTime() - Date.now()) / (1000*60*60*24)) : null;
    return res.status(200).json({ ok: true, hasToken: true, canDebug: true, isValid: !!data?.is_valid, expiresAt: expiresAt ? expiresAt.toISOString() : null, daysLeft, scopes: data?.scopes || [], source: db?.token ? 'db' : 'env' });
  } catch (e: any) {
    return res.status(200).json({ ok: true, hasToken: true, canDebug: true, error: e?.message || 'debug failed', source: db?.token ? 'db' : 'env' });
  }
}
