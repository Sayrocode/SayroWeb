import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../../lib/prisma';

function getAnonId(req: NextApiRequest) {
  const h = (req.headers['x-anon-id'] as string) || '';
  if (h && typeof h === 'string') return h.slice(0, 80);
  // try cookie as fallback
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
    const items = await prisma.newsComment.findMany({ where: { newsId: news.id }, orderBy: { createdAt: 'desc' }, take: 100 });
    return res.status(200).json({ items });
  }

  if (req.method === 'POST') {
    const { content, displayName } = (req.body || {}) as { content?: string; displayName?: string };
    const anonId = getAnonId(req);
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || '';
    const ua = (req.headers['user-agent'] as string) || '';
    const body = String(content || '').trim();
    if (!anonId) return res.status(400).json({ error: 'missing_anon_id' });
    if (!body) return res.status(400).json({ error: 'empty_content' });
    if (body.length > 800) return res.status(400).json({ error: 'too_long' });
    const name = String(displayName || '').trim().slice(0, 40) || null;
    const created = await prisma.newsComment.create({ data: { newsId: news.id, anonId, displayName: name, content: body, ip, userAgent: ua } });
    return res.status(201).json({ item: created });
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method Not Allowed' });
}

