import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAdmin, methodNotAllowed } from '../_utils';

const EB_BASE = 'https://api.easybroker.com/v1';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const apiKey = process.env.EASYBROKER_API_KEY;
  if (!apiKey) {
    if (req.method === 'GET') return res.status(200).json({ items: [], note: 'Falta EASYBROKER_API_KEY' });
    return res.status(400).json({ ok: false, error: 'missing_api_key' });
  }

  if (req.method === 'POST') {
    try {
      const raw = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const allowedKeys = ['name', 'phone', 'email', 'message', 'property_id', 'source'] as const;
      const payload: Record<string, any> = {};
      allowedKeys.forEach((key) => {
        if (raw[key] !== undefined && raw[key] !== null && raw[key] !== '') {
          payload[key] = raw[key];
        }
      });
      if (!payload.source) payload.source = 'egoRealEstate';
      if (typeof payload.message === 'string') payload.message = payload.message.trim();
      if (!payload.message) payload.message = '[EGO] Contacto importado desde Ego Real Estate.';

      if (!payload.name && !payload.phone && !payload.email) {
        return res.status(400).json({ ok: false, error: 'missing_contact_fields' });
      }

      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 8000);
      try {
        const upstream = await fetch(`${EB_BASE}/contact_requests`, {
          method: 'POST',
          headers: {
            accept: 'application/json',
            'content-type': 'application/json',
            'X-Authorization': apiKey,
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
        clearTimeout(tid);
        const text = await upstream.text().catch(() => '');
        if (!upstream.ok) {
          console.warn('EB contact push failed', upstream.status, text);
          return res.status(upstream.status || 502).json({ ok: false, error: 'eb_error', status: upstream.status, body: text });
        }
        let data: any = null;
        try { data = text ? JSON.parse(text) : null; } catch {
          data = null;
        }
        return res.status(200).json({ ok: true, data });
      } catch (e: any) {
        clearTimeout(tid);
        const msg = e?.name === 'AbortError' ? 'timeout' : (e?.message || String(e));
        console.warn('EB contact push error', msg);
        return res.status(504).json({ ok: false, error: msg });
      }
    } catch (e: any) {
      return res.status(500).json({ ok: false, error: 'unexpected', message: e?.message || String(e) });
    }
  }

  if (req.method !== 'GET') {
    return methodNotAllowed(res, ['GET', 'POST']);
  }

  res.setHeader('Cache-Control', 'private, max-age=20, stale-while-revalidate=120');

  async function fetchAll(path: string, perPage = 20): Promise<any[]> {
    let page = 1;
    let nextUrl: string | null = `${EB_BASE}/${path}?limit=${perPage}&page=${page}`;
    const items: any[] = [];
    let safety = 0;

    while (nextUrl && safety < 500) {
      const r = await fetch(nextUrl, { headers: { accept: 'application/json', 'X-Authorization': apiKey! } as any });
      if (!r.ok) break;
      const j: any = await r.json().catch(() => ({}));
      const pageItems: any[] = Array.isArray(j?.content) ? j.content : (j?.requests || []);
      if (Array.isArray(pageItems) && pageItems.length) items.push(...pageItems);

      const pag = j?.pagination || {};
      if (typeof pag?.next_page === 'string' && pag.next_page) {
        nextUrl = pag.next_page;
      } else if (typeof pag?.next_page === 'number' && pag.next_page) {
        page = pag.next_page;
        nextUrl = `${EB_BASE}/${path}?limit=${perPage}&page=${page}`;
      } else if ((typeof pag?.limit === 'number' && typeof pag?.page === 'number' && typeof pag?.total === 'number')) {
        const totalPages = Math.max(1, Math.ceil((pag.total || 0) / (pag.limit || perPage)));
        if ((pag.page || page) < totalPages) {
          page = (pag.page || page) + 1;
          nextUrl = `${EB_BASE}/${path}?limit=${perPage}&page=${page}`;
        } else {
          nextUrl = null;
        }
      } else {
        if (!Array.isArray(pageItems) || pageItems.length < perPage) {
          nextUrl = null;
        } else {
          page += 1;
          nextUrl = `${EB_BASE}/${path}?limit=${perPage}&page=${page}`;
        }
      }

      safety += 1;
    }

    return items;
  }

  const allRequests = await fetchAll('contact_requests', 20);
  return res.status(200).json({ items: allRequests });
}
