import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAdmin } from '../_utils';

const EB_BASE = 'https://api.easybroker.com/v1';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const apiKey = process.env.EASYBROKER_API_KEY;
  if (!apiKey) return res.status(200).json({ items: [], note: 'Falta EASYBROKER_API_KEY' });

  // Cache response briefly on the client to avoid repeated calls when switching
  // sections. Mark private to avoid CDN caching.
  res.setHeader('Cache-Control', 'private, max-age=20, stale-while-revalidate=120');

  // Fetch all pages from an endpoint, following pagination until completion.
  async function fetchAll(path: string, perPage = 20): Promise<any[] | null> {
    let page = 1;
    let nextUrl: string | null = `${EB_BASE}/${path}?limit=${perPage}&page=${page}`;
    const items: any[] = [];
    let safety = 0;

    while (nextUrl && safety < 500) {
      const r = await fetch(nextUrl, { headers: { accept: 'application/json', 'X-Authorization': apiKey! } as any });
      if (!r.ok) {
        // If the very first request fails, consider the endpoint unavailable.
        if (items.length === 0) return null;
        break;
      }
      const j: any = await r.json().catch(() => ({}));
      const pageItems: any[] = Array.isArray(j?.content) ? j.content : (j?.contacts || j?.requests || []);
      if (Array.isArray(pageItems) && pageItems.length) items.push(...pageItems);

      const pag = j?.pagination || {};
      // EasyBroker can return next_page as a full URL or a page number.
      if (typeof pag?.next_page === 'string' && pag.next_page) {
        nextUrl = pag.next_page;
      } else if (typeof pag?.next_page === 'number' && pag.next_page) {
        page = pag.next_page;
        nextUrl = `${EB_BASE}/${path}?limit=${perPage}&page=${page}`;
      } else if (
        // Fallback if next_page is missing: stop when we've clearly hit the end.
        (typeof pag?.limit === 'number' && typeof pag?.page === 'number' && typeof pag?.total === 'number')
      ) {
        const totalPages = Math.max(1, Math.ceil((pag.total || 0) / (pag.limit || perPage)));
        if ((pag.page || page) < totalPages) {
          page = (pag.page || page) + 1;
          nextUrl = `${EB_BASE}/${path}?limit=${perPage}&page=${page}`;
        } else {
          nextUrl = null;
        }
      } else {
        // If the page returned less than requested, assume it's the last one.
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

  // Best effort: try /contacts, then fallback to /requests.
  const allContacts = (await fetchAll('contacts', 20))
    || (await fetchAll('requests', 20))
    || [];

  return res.status(200).json({ items: allContacts });
}
