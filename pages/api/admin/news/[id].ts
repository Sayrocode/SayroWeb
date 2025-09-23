import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../../../lib/prisma';
import { requireAdmin, methodNotAllowed } from '../../_utils';

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
  const id = Number((req.query as any).id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'invalid_id' });

  if (req.method === 'GET') {
    const item = await prisma.news.findUnique({ where: { id } });
    if (!item) return res.status(404).json({ error: 'not_found' });
    return res.status(200).json({ item });
  }

  if (req.method === 'PUT') {
    const { title, content, excerpt, coverUrl, tags, published } = req.body || {};
    const data: any = {};
    if (typeof title === 'string' && title.trim()) { data.title = title.trim(); data.slug = toSlug(title); }
    if (typeof content === 'string') data.content = content;
    if (typeof excerpt === 'string') data.excerpt = excerpt;
    if (typeof coverUrl === 'string') data.coverUrl = coverUrl;
    if (Array.isArray(tags)) data.tagsJson = JSON.stringify(tags);
    if (typeof published === 'boolean') {
      data.publishedAt = published ? new Date() : null;
    }
    const updated = await prisma.news.update({ where: { id }, data });
    return res.status(200).json({ ok: true, item: updated });
  }

  if (req.method === 'DELETE') {
    await prisma.news.delete({ where: { id } });
    return res.status(200).json({ ok: true });
  }

  return methodNotAllowed(res, ['GET', 'PUT', 'DELETE']);
}

