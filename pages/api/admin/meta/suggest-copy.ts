import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../../lib/prisma';
import { requireAdmin, methodNotAllowed } from '../_utils';
import { limitText } from '../../../../lib/meta';

type Body = {
  propertyIds: number[];
  adType: 'single' | 'carousel';
};

function pickPrice(ops?: any[]): string | null {
  if (!ops?.length) return null;
  const sale = ops.find((o) => o?.type === 'sale');
  const rental = ops.find((o) => o?.type === 'rental');
  const ch = sale || rental || ops[0];
  if (ch?.formatted_amount) return ch.formatted_amount;
  if (typeof ch?.amount === 'number') {
    const currency = ch.currency || 'MXN';
    try { return new Intl.NumberFormat('es-MX', { style: 'currency', currency, maximumFractionDigits: 0 }).format(ch.amount); }
    catch { return String(ch.amount); }
  }
  return null;
}

function pickOperation(ops?: any[]): 'Venta' | 'Renta' | null {
  if (!ops?.length) return null;
  if (ops.find((o) => o?.type === 'sale')) return 'Venta';
  if (ops.find((o) => o?.type === 'rental')) return 'Renta';
  return null;
}

function ensureQueretaro(text: string): string {
  return /quer[ée]taro/i.test(text) ? text : `${text} · Querétaro`;
}

function firstSentence(text?: string | null): string | null {
  if (!text) return null;
  const clean = String(text).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  if (!clean) return null;
  const m = clean.match(/^[^.!?\n]{10,200}[.!?]/);
  return (m ? m[0] : clean.slice(0, 180)).trim();
}

function buildFallbackCopy(p: any) {
  let ops: any[] = [];
  try {
    if (p.ebDetailJson) {
      const j = JSON.parse(p.ebDetailJson);
      if (Array.isArray(j?.operations)) ops = j.operations;
      if (!p.description && j?.description) p.description = j.description;
    } else if (p.operationsJson) {
      const j = JSON.parse(p.operationsJson);
      if (Array.isArray(j)) ops = j;
    }
  } catch {}
  const price = pickPrice(ops);
  const op = pickOperation(ops);
  const title = p.title || `${p.propertyType || 'Propiedad'} en Querétaro`;
  const headline = limitText(ensureQueretaro(title), 40);
  const descFromDetail = firstSentence(p.description);
  // Si hay descripción larga del inmueble, úsala como base de la descripción del anuncio
  const description = limitText(ensureQueretaro(descFromDetail || [p.propertyType, op, price].filter(Boolean).join(' · ') || 'Propiedad en Querétaro'), 60);
  const primaryPieces = [op || undefined, price || undefined, p.locationText || undefined, descFromDetail || undefined].filter(Boolean) as string[];
  const primaryText = limitText(ensureQueretaro(primaryPieces.join(' · ')), 125);
  return { headline, description, primaryText };
}

// Simple in-memory cache with TTL to speed up repeated generations
type CacheEntry = { expires: number; data: any };
const CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function cacheGet(key: string) {
  const hit = CACHE.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expires) { CACHE.delete(key); return null; }
  return hit.data;
}
function cacheSet(key: string, data: any) {
  CACHE.set(key, { expires: Date.now() + CACHE_TTL_MS, data });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);

  const { propertyIds, adType } = (req.body || {}) as Body;
  if (!Array.isArray(propertyIds) || propertyIds.length === 0) return res.status(400).json({ error: 'Selecciona propiedades' });
  if (adType !== 'single' && adType !== 'carousel') return res.status(400).json({ error: 'Tipo inválido' });

  const props = await prisma.property.findMany({ where: { id: { in: propertyIds } } });
  if (!props.length) return res.status(404).json({ error: 'Propiedades no encontradas' });

  // Cache key based on selection and mode
  const cacheKey = `${adType}:${[...propertyIds].sort((a,b)=>a-b).join(',')}`;
  const cached = cacheGet(cacheKey);
  if (cached) return res.status(200).json(cached);

  const engine = String((req.query?.engine as string) || '').toLowerCase();
  const key = process.env.OPENAI_API_KEY;
  // If no key or engine=native, build fallback deterministic copy (modelo nativo en servidor)
  if (!key || engine === 'native') {
    if (adType === 'single') {
      const p = props[0];
      return res.status(200).json({ ok: true, type: 'single', copy: buildFallbackCopy(p) });
    }
    return res.status(200).json({
      ok: true,
      type: 'carousel',
      message: `Explora ${props.length} propiedades destacadas de Sayro`,
      copies: props.map((p) => ({ id: p.id, ...buildFallbackCopy(p) })),
    });
  }

  // Build prompt
  const items = props.map((p) => {
    const base: any = {
      id: p.id,
      title: p.title,
      type: p.propertyType,
      status: p.status,
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms,
      parkingSpaces: p.parkingSpaces,
      lotSize: p.lotSize,
      constructionSize: p.constructionSize,
      locationText: p.locationText,
    };
    try {
      const detail = p.ebDetailJson ? JSON.parse(p.ebDetailJson) : null;
      if (detail?.operations) base.operations = detail.operations;
      if (detail?.description) base.description = detail.description;
    } catch {}
    return base;
  });

  const sys = {
    role: 'system',
    content: 'Eres un copywriter para anuncios de Facebook/Instagram en español neutral. Responde SOLO en JSON. Titular <= 40, Descripción <= 60, PrimaryText <= 125. Incluye SIEMPRE: tipo de operación (Venta/Renta), el precio y la mención de que es en Querétaro (si ya aparece en la ubicación, manténlo). Enfatiza valor y ubicación, tono cordial, sin claims exagerados. Sin emojis.',
  };
  const user = {
    role: 'user',
    content: JSON.stringify({
      mode: adType,
      items,
      rules: {
        headlineMax: 40,
        descriptionMax: 60,
        primaryMax: 125,
        mustInclude: ['operacion', 'precio', 'Querétaro']
      },
      output: adType === 'single'
        ? { schema: { headline: 'string', description: 'string', primaryText: 'string' } }
        : { schema: { message: 'string', copies: [{ id: 'number', headline: 'string', description: 'string' }] } },
    }),
  };

  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [sys, user],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      }),
    });
    const j = await r.json();
    const content = j?.choices?.[0]?.message?.content;
    const parsed = content ? JSON.parse(content) : null;
    if (adType === 'single' && parsed?.headline) {
      const payload = { ok: true, type: 'single', copy: parsed } as const;
      cacheSet(cacheKey, payload);
      return res.status(200).json(payload);
    }
    if (adType === 'carousel' && parsed?.copies) {
      const payload = { ok: true, type: 'carousel', message: parsed.message || `Explora ${props.length} propiedades destacadas en Querétaro`, copies: parsed.copies } as const;
      cacheSet(cacheKey, payload);
      return res.status(200).json(payload);
    }
    // Fallback to deterministic
    if (adType === 'single') {
      const payload = { ok: true, type: 'single', copy: buildFallbackCopy(props[0]) } as const;
      cacheSet(cacheKey, payload);
      return res.status(200).json(payload);
    }
    const payload = { ok: true, type: 'carousel', message: `Explora ${props.length} propiedades destacadas en Querétaro`, copies: props.map((p) => ({ id: p.id, ...buildFallbackCopy(p) })) } as const;
    cacheSet(cacheKey, payload);
    return res.status(200).json(payload);
  } catch (e: any) {
    if (adType === 'single') {
      const payload = { ok: true, type: 'single', copy: buildFallbackCopy(props[0]) } as const;
      cacheSet(cacheKey, payload);
      return res.status(200).json(payload);
    }
    const payload = { ok: true, type: 'carousel', message: `Explora ${props.length} propiedades destacadas en Querétaro`, copies: props.map((p) => ({ id: p.id, ...buildFallbackCopy(p) })) } as const;
    cacheSet(cacheKey, payload);
    return res.status(200).json(payload);
  }
}
