import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAdmin, methodNotAllowed } from '../_utils';

export const config = { api: { bodyParser: false } };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  try {
    const { scrapeEgoContactsToDb } = await import('../../../../ego/scrapeContactsToDb');
    await scrapeEgoContactsToDb();
    return res.status(200).json({ ok: true });
  } catch (e: any) {
    console.error('Ego contacts scrape API error:', e?.message || e);
    return res.status(500).json({ ok: false, error: e?.message || 'Failed' });
  }
}
