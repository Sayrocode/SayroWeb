import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../../lib/prisma';

function getAnonId(req: NextApiRequest) {
  const h = (req.headers['x-anon-id'] as string) || '';
  if (h && typeof h === 'string ') return h.slice(0, 80);
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
    try {
      const items = await prisma.newsComment.findMany({ where: { newsId: news.id }, orderBy: { createdAt: 'desc' }, take: 100 });
      return res.status(200).json({ items });
    } catch (e: any) {
      const msg = String(e?.message || '');
      if (msg.includes('no such table') || msg.includes('does not exist')) {
        return res.status(200).json({ items: [] });
      }
      throw e;
    }
  }

  if (req.method === 'POST') {
    // Safe/sanitized environment logging
    const usingTurso = !!process.env.TURSO_DATABASE_URL;
    const dbUrl = process.env.DATABASE_URL || '';
    const safeDb = (() => {
      try {
        if (usingTurso) {
          try {
            const u = new URL(process.env.TURSO_DATABASE_URL as string);
            return `turso://${u.host}`;
          } catch {
            return 'turso://<invalid-url>';
          }
        }
        if (dbUrl.startsWith('file:')) {
          const p = dbUrl.replace(/^file:/, '');
          const parts = p.split(/[\\/]/).filter(Boolean);
          const tail = parts.slice(-2).join('/');
          return `file:.../${tail || ''}`;
        }
        return dbUrl ? '<custom-db-url>' : '<undefined>';
      } catch {
        return '<unknown>';
      }
    })();
    try {
      const { content, displayName } = (req.body || {}) as { content?: string; displayName?: string };
      const anonId = getAnonId(req);
      const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || '';
      const ua = (req.headers['user-agent'] as string) || '';
      const body = String(content || '').trim();
      console.log('[news/comments][POST] start', {
        slug,
        usingTurso,
        db: safeDb,
        hasAnonId: !!anonId,
        anonIdLen: anonId?.length || 0,
        bodyLen: body.length,
        hasDisplayName: !!displayName,
        ip,
        ua: ua.slice(0, 100),
      });
      if (!anonId) return res.status(400).json({ error: 'missing_anon_id' });
      if (!body) return res.status(400).json({ error: 'empty_content' });
      if (body.length > 800) return res.status(400).json({ error: 'too_long' });

      // Limits:
      // - Max 3 comments per anonId per news
      // - Max 15 unique anon users per news; if already at 15, only allow if anonId is already part of the set
      const [byUserCount, distinctUsers] = await Promise.all([
        prisma.newsComment.count({ where: { newsId: news.id, anonId } }),
        prisma.newsComment.findMany({ where: { newsId: news.id }, select: { anonId: true }, distinct: ['anonId'] }),
      ]);
      if (byUserCount >= 3) {
        return res.status(429).json({ error: 'limit_per_user' });
      }
      const uniqueSet = new Set(distinctUsers.map((r) => r.anonId));
      if (uniqueSet.size >= 15 && !uniqueSet.has(anonId)) {
        return res.status(429).json({ error: 'limit_total_unique' });
      }
      const name = String(displayName || '').trim().slice(0, 40) || null;
      const created = await prisma.newsComment.create({ data: { newsId: news.id, anonId, displayName: name, content: body, ip, userAgent: ua } });
      console.log('[news/comments][POST] created', { id: created.id, newsId: news.id });
      return res.status(201).json({ item: created });
    } catch (e: any) {
      const msg = String(e?.message || '');
      console.error('[news/comments][POST] error', { message: msg, name: e?.name, code: e?.code });
      if (msg.includes('no such table') || msg.includes('does not exist')) {
        console.warn('[news/comments][POST] schema missing for comments/likes tables');
        return res.status(503).json({ error: 'schema_missing' });
      }
      throw e;
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method Not Allowed' });
}
