import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAdmin } from '../_utils';

const EB_BASE = 'https://api.easybroker.com/v1';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const apiKey = process.env.EASYBROKER_API_KEY;
  if (!apiKey) return res.status(200).json({ items: [], note: 'Falta EASYBROKER_API_KEY' });

  // Best effort: try /contacts, fallback /requests if exists.
  async function tryEndpoint(path: string) {
    const r = await fetch(`${EB_BASE}/${path}`, { headers: { accept: 'application/json', 'X-Authorization': apiKey! } as any });
    if (!r.ok) return null;
    const j = await r.json();
    return j && (Array.isArray(j.content) ? j.content : j.contacts || j.requests || []);
  }

  const first = (await tryEndpoint('contacts')) || (await tryEndpoint('requests')) || [];
  return res.status(200).json({ items: first });
}
