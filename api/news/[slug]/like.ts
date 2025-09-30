import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../../lib/prisma';

function getAnonId(req: NextApiRequest) {
  const h = (req.headers['x-anon-id'] as string) || '';
  if (h && typeof h === 'string') return h.slice(0, 80);
  const cookie = req.headers.cookie || '';
  const m = /(?:^|; )anon_id=([^;]+)/.exec(cookie);
  return m ? decodeURIComponent(m[1]).slice(0, 80) : '';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { slug } = req.query as { slug: string };
  if (!slug) return res.status(400).json({ error: 'Missing slug' });
  const news = await prisma.news.findFirst({ where: { slug, publishedAt: { not: null } }, select: { id: true } });
  if (!news) return res.status(404).json({ error: 'not_found' });

  if (req.method === 'GET') {
    try {
      const anonId = getAnonId(req);
      const count = await prisma.newsLike.count({ where: { newsId: news.id } });
      let liked = false;
      if (anonId) {
        const found = await prisma.newsLike.findFirst({ where: { newsId: news.id, anonId } });
        liked = !!found;
      }
      return res.status(200).json({ count, liked });
    } catch (e: any) {
      // If schema not deployed yet, avoid 500 and return neutral state
      const msg = String(e?.message || '');
      if (msg.includes('no such table') || msg.includes('does not exist')) {
        return res.status(200).json({ count: 0, liked: false });
      }
      throw e;
    }
  }

  if (req.method === 'POST') {
    const anonId = getAnonId(req);
    if (!anonId) return res.status(400).json({ error: 'missing_anon_id' });
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || '';
    const ua = (req.headers['user-agent'] as string) || '';
    try {
      try {
        await prisma.newsLike.create({ data: { newsId: news.id, anonId, ip, userAgent: ua } });
      } catch (e: any) {
        // unique constraint -> already liked; ignore
      }
      const count = await prisma.newsLike.count({ where: { newsId: news.id } });
      return res.status(200).json({ liked: true, count });
    } catch (e: any) {
      const msg = String(e?.message || '');
      if (msg.includes('no such table') || msg.includes('does not exist')) {
        return res.status(503).json({ error: 'schema_missing' });
      }
      throw e;
    }
  }

  if (req.method === 'DELETE') {
    const anonId = getAnonId(req);
    if (!anonId) return res.status(400).json({ error: 'missing_anon_id' });
    try {
      await prisma.newsLike.deleteMany({ where: { newsId: news.id, anonId } });
      const count = await prisma.newsLike.count({ where: { newsId: news.id } });
      return res.status(200).json({ liked: false, count });
    } catch (e: any) {
      const msg = String(e?.message || '');
      if (msg.includes('no such table') || msg.includes('does not exist')) {
        return res.status(503).json({ error: 'schema_missing' });
      }
      throw e;
    }
  }

  res.setHeader('Allow', 'GET, POST, DELETE');
  return res.status(405).json({ error: 'Method Not Allowed' });
}
