import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../lib/prisma';

function pick<T extends string>(obj: Record<string, any>, keys: T[]): Partial<Record<T, any>> {
  const o: any = {};
  keys.forEach((k) => {
    if (obj[k] !== undefined) o[k] = obj[k];
  });
  return o;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const body = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) || {};

    // Derive attribution
    const q = req.query || {};
    const utm = pick(q as any, ['utm_source','utm_medium','utm_campaign','utm_content','utm_term']);
    const fbclid = (q as any).fbclid || body.fbclid || '';
    const source = body.source || (fbclid || String(utm.utm_source || '').toLowerCase().includes('meta') || String(utm.utm_source || '').toLowerCase().includes('facebook') ? 'meta' : 'website');

    const lead = await prisma.lead.create({
      data: {
        source,
        name: body.name?.slice(0, 120) || null,
        email: body.email?.slice(0, 160) || null,
        phone: body.phone?.slice(0, 40) || null,
        message: body.message?.slice(0, 2000) || null,
        propertyPublicId: body.propertyPublicId || null,
        propertyId: typeof body.propertyId === 'number' ? body.propertyId : null,
        campaignId: body.campaignId || null,
        adsetId: body.adsetId || null,
        adId: body.adId || null,
        fbclid: fbclid || null,
        utm_source: (utm.utm_source as string) || null,
        utm_medium: (utm.utm_medium as string) || null,
        utm_campaign: (utm.utm_campaign as string) || null,
        utm_content: (utm.utm_content as string) || null,
        utm_term: (utm.utm_term as string) || null,
        pagePath: body.pagePath || req.headers['x-pathname'] || (req.url ? req.url.split('?')[0] : undefined) || null,
        referrer: (req.headers.referer as string) || null,
      },
    });
    return res.status(201).json({ ok: true, id: lead.id });
  } catch (e: any) {
    console.error('Lead create error', e);
    return res.status(500).json({ ok: false, error: 'cannot_create', message: e?.message || String(e) });
  }
}

