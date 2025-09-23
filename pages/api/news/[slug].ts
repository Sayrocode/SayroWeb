import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  const { slug } = req.query as { slug: string };
  if (!slug) return res.status(400).json({ error: 'Missing slug' });
  const item = await prisma.news.findFirst({ where: { slug, publishedAt: { not: null } } });
  if (!item) return res.status(404).json({ error: 'not_found' });
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=600');
  return res.status(200).json({ item });
}

