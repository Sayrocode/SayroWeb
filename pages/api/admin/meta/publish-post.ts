import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../../lib/prisma';
import { requireAdmin, methodNotAllowed } from '../_utils';
import { readMetaEnv, getBaseUrlFromReq } from '../../../../lib/meta';
import { getPreferredMetaAccessToken, getPageAccessToken } from '../../../../lib/metaStore';

type Body = {
  message: string;
  propertyId?: number;
  link?: string; // optional explicit link
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);

  const { message, propertyId, link } = (req.body || {}) as Body;
  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ ok: false, error: 'Mensaje requerido' });
  }

  const env = readMetaEnv();
  const userToken = await getPreferredMetaAccessToken();
  if (!userToken || !env.pageId) {
    return res.status(400).json({ ok: false, error: 'Faltan credenciales Meta (token o PAGE_ID)' });
  }

  let finalLink = (link || '').trim();
  if (!finalLink && propertyId && Number.isFinite(propertyId)) {
    const base = (process.env.SITE_BASE_URL || getBaseUrlFromReq(req) || '').trim().replace(/\/$/, '');
    const p = await prisma.property.findUnique({ where: { id: Number(propertyId) } });
    if (p) {
      const path = p.publicId ? `/fb/p/${encodeURIComponent(p.publicId)}` : `/fb/p/${p.id}`;
      const u = new URL(path, base);
      u.search = new URLSearchParams({ utm_source: 'facebook', utm_medium: 'social', utm_campaign: 'organic_post', utm_content: String(p.publicId || p.id || '') }).toString();
      finalLink = u.toString();
    }
  }

  try {
    const params = new URLSearchParams();
    let tokenToUse = userToken;
    try {
      const pTok = await getPageAccessToken(env.pageId!, userToken);
      if (pTok) tokenToUse = pTok;
    } catch {}
    params.append('access_token', tokenToUse);
    params.append('message', message);
    if (finalLink) params.append('link', finalLink);
    const r = await fetch(`https://graph.facebook.com/${process.env.META_GRAPH_VERSION || 'v19.0'}/${env.pageId}/feed`, {
      method: 'POST',
      body: params,
    });
    const text = await r.text();
    let data: any = null;
    try { data = text ? JSON.parse(text) : null; } catch {}
    if (!r.ok) {
      return res.status(400).json({ ok: false, error: data?.error?.message || text || `HTTP ${r.status}` });
    }
    return res.status(200).json({ ok: true, result: data });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: 'No se pudo publicar' });
  }
}
