import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';

function parseList<T>(v: any): T[] | null {
  if (!v) return null;
  if (Array.isArray(v)) return v as T[];
  if (typeof v === 'string') return v.split(',').map((s) => s.trim()).filter(Boolean) as any;
  return null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  const { q = '', tags, from, to, page = '1', limit = '12' } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
  const take = Math.min(50, Math.max(1, parseInt(String(limit), 10) || 12));
  const skip = (pageNum - 1) * take;

  const listTags = parseList<string>(tags);

  // Basic where for published items
  const where: any = { publishedAt: { not: null } };
  if (q && q.trim()) {
    // naive OR search across title and content
    where.OR = [
      { title: { contains: q } },
      { content: { contains: q } },
    ];
  }
  if (from) {
    const d = new Date(from);
    if (!isNaN(d.getTime())) where.publishedAt = { ...(where.publishedAt || {}), gte: d };
  }
  if (to) {
    const d = new Date(to);
    if (!isNaN(d.getTime())) where.publishedAt = { ...(where.publishedAt || {}), lte: d };
  }
  if (listTags && listTags.length) {
    // SQLite: approximate match by JSON string containment for each tag
    where.AND = (where.AND || []).concat(listTags.map((t) => ({ tagsJson: { contains: `"${t}"` } })));
  }

  const items = await prisma.news.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } });
  // Final ordering by recency (publishedAt first, fallback createdAt)
  items.sort((a: any, b: any) => {
    const da = (a.publishedAt || a.createdAt) as any as number;
    const db = (b.publishedAt || b.createdAt) as any as number;
    return db - da;
  });
  const total = await prisma.news.count({ where });
  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=300');
  return res.status(200).json({ items, page: pageNum, total, pageSize: take });
}
