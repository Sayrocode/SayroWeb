import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../lib/prisma';

const NAME_REGEX = /^[a-zA-ZÀ-ÿ\u00f1\u00d1'`´.-]{2,80}(?: [a-zA-ZÀ-ÿ\u00f1\u00d1'`´.-]{2,80}){0,4}$/;
const PHONE_REGEX = /^[+]?[\d\s().-]{7,20}$/;
const EMAIL_REGEX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const SUSPICIOUS_PAYLOAD = /(<\s*script|javascript:|data:text\/html|onerror\s*=|onload\s*=)/i;
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const rateLimits = new Map<string, { count: number; expiresAt: number }>();

function pick<T extends string>(obj: Record<string, any>, keys: T[]): Partial<Record<T, any>> {
  const o: any = {};
  keys.forEach((k) => {
    if (obj[k] !== undefined) o[k] = obj[k];
  });
  return o;
}

function clientIp(req: NextApiRequest): string {
  const xf = req.headers['x-forwarded-for'];
  const raw = Array.isArray(xf) ? xf[0] : xf?.split(',')[0];
  return (raw || req.headers['x-real-ip'] || req.socket.remoteAddress || 'unknown').toString();
}

function checkRateLimit(ip: string) {
  const now = Date.now();
  if (rateLimits.size > 5000) {
    for (const [key, value] of rateLimits.entries()) {
      if (value.expiresAt < now) rateLimits.delete(key);
    }
  }
  const entry = rateLimits.get(ip);
  if (!entry || entry.expiresAt < now) {
    rateLimits.set(ip, { count: 1, expiresAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  if (entry.count >= RATE_LIMIT_MAX) return true;
  entry.count += 1;
  rateLimits.set(ip, entry);
  return false;
}

function cleanText(value: unknown, max = 160) {
  if (typeof value !== 'string') return '';
  return value.replace(/[<>]/g, ' ').replace(/[\u0000-\u001F]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

function sanitizeMessage(value: unknown, max = 2000) {
  if (typeof value !== 'string') return '';
  return value.replace(/<[^>]*>/g, ' ').replace(/[\u0000-\u001F]+/g, ' ').trim().slice(0, max);
}

function validateLead(body: any) {
  const name = cleanText(body.name, 120);
  const phone = cleanText(body.phone, 40);
  const email = cleanText(body.email, 160);
  const message = sanitizeMessage(body.message, 2000);

  if (!name || !NAME_REGEX.test(name)) return { error: 'invalid_name' };
  if (!phone && !email) return { error: 'contact_required' };
  if (phone && !PHONE_REGEX.test(phone)) return { error: 'invalid_phone' };
  if (email && !EMAIL_REGEX.test(email)) return { error: 'invalid_email' };
  if (SUSPICIOUS_PAYLOAD.test(String(body.message || '')) || SUSPICIOUS_PAYLOAD.test(name) || SUSPICIOUS_PAYLOAD.test(email)) {
    return { error: 'suspicious_payload' };
  }

  return { data: { name, phone, email, message } };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const ip = clientIp(req);
  if (checkRateLimit(ip)) {
    return res.status(429).json({ ok: false, error: 'rate_limited', message: 'Too many submissions. Please try again later.' });
  }

  try {
    const body = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) || {};

    if (typeof body.botField === 'string' && body.botField.trim().length > 0) {
      return res.status(400).json({ ok: false, error: 'bot_detected' });
    }

    const { data: safe, error: validationError } = validateLead(body);
    if (validationError) {
      return res.status(400).json({ ok: false, error: validationError });
    }

    // Derive attribution
    const q = req.query || {};
    const utm = pick(q as any, ['utm_source','utm_medium','utm_campaign','utm_content','utm_term']);
    const fbclid = (q as any).fbclid || body.fbclid || '';
    const source = body.source || (fbclid || String(utm.utm_source || '').toLowerCase().includes('meta') || String(utm.utm_source || '').toLowerCase().includes('facebook') ? 'meta' : 'website');

    const lead = await prisma.lead.create({
      data: {
        source,
        name: safe?.name || null,
        email: safe?.email || null,
        phone: safe?.phone || null,
        message: safe?.message || null,
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
          name: safe?.name || undefined,
          phone: safe?.phone || undefined,
          email: safe?.email || undefined,
          property_id: ebId,
          message: safe?.message || undefined,
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
