import { kvGet, kvSet } from './metaKV';

const GRAPH_VERSION = process.env.META_GRAPH_VERSION || 'v19.0';
const GRAPH = `https://graph.facebook.com/${GRAPH_VERSION}`;

type Stored = { token: string; expiresAt?: string | null };

async function getAppCreds(): Promise<{ id: string; secret: string } | null> {
  const envId = process.env.META_APP_ID?.trim();
  const envSec = process.env.META_APP_SECRET?.trim();
  if (envId && envSec) return { id: envId, secret: envSec };
  try {
    const id = await kvGet('meta_app_id');
    const sec = await kvGet('meta_app_secret');
    if (id && sec) return { id, secret: sec };
  } catch {}
  return null;
}

export async function getAppAccessToken(): Promise<string | null> {
  const creds = await getAppCreds();
  if (!creds) return null;
  return `${creds.id}|${creds.secret}`;
}

async function httpJson(url: string) {
  const r = await fetch(url);
  const txt = await r.text();
  try { return JSON.parse(txt); } catch { throw new Error(txt); }
}

export async function getStoredUserToken(): Promise<{ token: string; expiresAt: Date | null } | null> {
  try {
    const raw = await kvGet('meta_access_token');
    if (!raw) return null;
    const j: Stored = JSON.parse(raw);
    const exp = j?.expiresAt ? new Date(j.expiresAt) : null;
    if (!j?.token) return null;
    return { token: j.token, expiresAt: exp };
  } catch { return null; }
}

export async function saveUserToken(token: string, expiresAt?: Date | null) {
  const data: Stored = { token, expiresAt: expiresAt ? expiresAt.toISOString() : null };
  await kvSet('meta_access_token', JSON.stringify(data));
}

export async function exchangeForLongLivedUserToken(shortToken: string) {
  const creds = await getAppCreds();
  if (!creds) throw new Error('Faltan META_APP_ID/META_APP_SECRET');
  const url = `${GRAPH}/oauth/access_token?grant_type=fb_exchange_token&client_id=${encodeURIComponent(creds.id)}&client_secret=${encodeURIComponent(creds.secret)}&fb_exchange_token=${encodeURIComponent(shortToken)}`;
  const j = await httpJson(url);
  const token = j?.access_token as string | undefined;
  const expiresIn = Number(j?.expires_in || 0);
  if (!token) throw new Error('No se obtuvo access_token');
  const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000) : null;
  await saveUserToken(token, expiresAt);
  return { token, expiresAt };
}

export async function tryRefreshStoredUserToken(): Promise<{ updated: boolean; token?: string; expiresAt?: Date | null }>{
  try {
    const current = await getStoredUserToken();
    const token = current?.token || (process.env.META_ACCESS_TOKEN || '').trim();
    const creds = await getAppCreds();
    if (!token || !creds) return { updated: false };
    const url = `${GRAPH}/oauth/access_token?grant_type=fb_exchange_token&client_id=${encodeURIComponent(creds.id)}&client_secret=${encodeURIComponent(creds.secret)}&fb_exchange_token=${encodeURIComponent(token)}`;
    const j = await httpJson(url);
    const newToken = j?.access_token as string | undefined;
    const expiresIn = Number(j?.expires_in || 0);
    if (!newToken) return { updated: false };
    const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000) : null;
    await saveUserToken(newToken, expiresAt);
    return { updated: true, token: newToken, expiresAt };
  } catch { return { updated: false }; }
}

export async function setAppCreds(id: string, secret: string) {
  await kvSet('meta_app_id', id);
  await kvSet('meta_app_secret', secret);
}

export async function hasAppCreds(): Promise<boolean> {
  return (await getAppCreds()) !== null;
}

export async function getPreferredMetaAccessToken(): Promise<string | null> {
  const db = await getStoredUserToken();
  if (db?.token) {
    try {
      if (db.expiresAt) {
        const daysLeft = (db.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
        if (daysLeft < 10) setTimeout(() => { void tryRefreshStoredUserToken(); }, 0);
      }
    } catch {}
    return db.token;
  }
  return (process.env.META_ACCESS_TOKEN || '').trim() || null;
}

export async function getPageAccessToken(pageId: string, userAccessToken: string): Promise<string | null> {
  // First attempt: direct field fetch (requires proper page permissions)
  try {
    const j = await httpJson(`${GRAPH}/${encodeURIComponent(pageId)}?fields=access_token&access_token=${encodeURIComponent(userAccessToken)}`);
    const tok = j?.access_token || null;
    if (tok) return String(tok);
  } catch {}
  // Fallback: list pages the user can manage and pick the matching page
  try {
    const j2 = await httpJson(`${GRAPH}/me/accounts?access_token=${encodeURIComponent(userAccessToken)}`);
    const data: any[] = Array.isArray(j2?.data) ? j2.data : [];
    const match = data.find((p: any) => String(p?.id) === String(pageId));
    if (match?.access_token) return String(match.access_token);
  } catch {}
  return null;
}
