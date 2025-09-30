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
    // Si el ID de propiedad es de EasyBroker (EB-...), también enviar a EasyBroker
    try {
      const ebId = String(body.propertyPublicId || '').toUpperCase().trim();
      const apiKey = process.env.EASYBROKER_API_KEY;
      if (ebId.startsWith('EB-') && apiKey) {
        const url = 'https://api.easybroker.com/v1/contact_requests';
        const origin = (req.headers.host || '').replace(/^https?:\/\//, '');
        const site = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_BASE_URL || origin || 'website';
        const payload = {
          name: body.name || undefined,
          phone: body.phone || undefined,
          email: body.email || undefined,
          property_id: ebId,
          message: body.message || undefined,
          source: String(site).replace(/^https?:\/\//, '').replace(/\/$/, ''),
        } as any;
        // No bloquear la respuesta del usuario si EB tarda: timeout suave
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), 5000);
        try {
          const r = await fetch(url, {
            method: 'POST',
            headers: {
              accept: 'application/json',
              'content-type': 'application/json',
              'X-Authorization': apiKey,
            },
            body: JSON.stringify(payload),
            signal: controller.signal,
          });
          clearTimeout(tid);
          // Loguear, pero no fallar el flujo si EB responde error
          if (!r.ok) {
            const text = await r.text().catch(() => '');
            console.warn('EasyBroker lead push failed', r.status, text);
          }
        } catch (e) {
          console.warn('EasyBroker lead push error', (e as any)?.message || e);
        }
      }
    } catch (e) {
      // No interrumpir la respuesta al cliente
      console.warn('EB side-push skipped', (e as any)?.message || e);
    }

    return res.status(201).json({ ok: true, id: lead.id });
  } catch (e: any) {
    console.error('Lead create error', e);
    return res.status(500).json({ ok: false, error: 'cannot_create', message: e?.message || String(e) });
  }
}
