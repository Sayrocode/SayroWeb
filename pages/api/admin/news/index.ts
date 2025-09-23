import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../../lib/prisma';
import { requireAdmin, methodNotAllowed } from '../_utils';

function parseList<T>(v: any): T[] | null {
  if (!v) return null;
  if (Array.isArray(v)) return v as T[];
  if (typeof v === 'string') return v.split(',').map((s) => s.trim()).filter(Boolean) as any;
  return null;
}

function toSlug(s: string): string {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  if (req.method === 'GET') {
    const { q = '', tags, from, to, page = '1', limit = '20', includeDrafts = 'true' } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const take = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 20));
    const skip = (pageNum - 1) * take;
    const listTags = parseList<string>(tags);

    const where: any = {};
    if (includeDrafts !== 'true') where.publishedAt = { not: null };
    if (q && q.trim()) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' as any } },
        { content: { contains: q, mode: 'insensitive' as any } },
      ];
    }
    if (from) {
      const d = new Date(from);
      if (!isNaN(d.getTime())) where.OR = (where.OR || []).concat([{ publishedAt: { gte: d } }, { createdAt: { gte: d } }]);
    }
    if (to) {
      const d = new Date(to);
      if (!isNaN(d.getTime())) where.OR = (where.OR || []).concat([{ publishedAt: { lte: d } }, { createdAt: { lte: d } }]);
    }
    if (listTags && listTags.length) {
      where.AND = (where.AND || []).concat(listTags.map((t) => ({ tagsJson: { contains: `"${t}"` } })));
    }

    const items = await prisma.news.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } });
    items.sort((a: any, b: any) => {
      const da = (a.publishedAt || a.createdAt) as any as number;
      const db = (b.publishedAt || b.createdAt) as any as number;
      return db - da;
    });
    const total = await prisma.news.count({ where });
    return res.status(200).json({ items, total, page: pageNum, pageSize: take });
  }

  if (req.method === 'POST') {
    const { title, content, excerpt, coverUrl, tags } = req.body || {};
    if (!title || !content) return res.status(400).json({ error: 'title_and_content_required' });
    const slug = toSlug(title);
    const tagsJson = Array.isArray(tags) ? JSON.stringify(tags) : (typeof tags === 'string' && tags ? JSON.stringify(tags.split(',').map((s) => s.trim()).filter(Boolean)) : null);
    const created = await prisma.news.create({ data: { title, content, excerpt: excerpt || null, coverUrl: coverUrl || null, slug, tagsJson } });
    return res.status(200).json({ ok: true, item: created });
  }

  return methodNotAllowed(res, ['GET', 'POST']);
}

