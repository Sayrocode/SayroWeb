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

function buildFallbackCopy(p: any) {
  let ops: any[] = [];
  try {
    if (p.ebDetailJson) {
      const j = JSON.parse(p.ebDetailJson);
      if (Array.isArray(j?.operations)) ops = j.operations;
    } else if (p.operationsJson) {
      const j = JSON.parse(p.operationsJson);
      if (Array.isArray(j)) ops = j;
    }
  } catch {}
  const price = pickPrice(ops);
  const headline = limitText(p.title || `${p.propertyType || 'Propiedad'} en ${p.locationText || 'México'}`, 40);
  const description = limitText([p.propertyType, p.locationText, price ? `Desde ${price}` : null].filter(Boolean).join(' · '), 60);
  const primaryText = limitText(`${p.title || 'Propiedad destacada'} en ${p.locationText || 'México'}${price ? ` — ${price}` : ''}. Conoce más y agenda tu visita.`, 125);
  return { headline, description, primaryText };
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

  const key = process.env.OPENAI_API_KEY;
  // If no key, build fallback deterministic copy
  if (!key) {
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
    content: 'Eres un copywriter para anuncios de Facebook/Instagram en español neutral. Responde SOLO en JSON. Titular <= 40, Descripción <= 60, PrimaryText <= 125. Enfatiza valor y ubicación, tono cordial, sin claims exagerados. No uses emojis.',
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
        temperature: 0.7,
        response_format: { type: 'json_object' },
      }),
    });
    const j = await r.json();
    const content = j?.choices?.[0]?.message?.content;
    const parsed = content ? JSON.parse(content) : null;
    if (adType === 'single' && parsed?.headline) return res.status(200).json({ ok: true, type: 'single', copy: parsed });
    if (adType === 'carousel' && parsed?.copies) return res.status(200).json({ ok: true, type: 'carousel', message: parsed.message || `Explora ${props.length} propiedades destacadas`, copies: parsed.copies });
    // Fallback to deterministic
    if (adType === 'single') return res.status(200).json({ ok: true, type: 'single', copy: buildFallbackCopy(props[0]) });
    return res.status(200).json({ ok: true, type: 'carousel', message: `Explora ${props.length} propiedades destacadas`, copies: props.map((p) => ({ id: p.id, ...buildFallbackCopy(p) })) });
  } catch (e: any) {
    if (adType === 'single') return res.status(200).json({ ok: true, type: 'single', copy: buildFallbackCopy(props[0]) });
    return res.status(200).json({ ok: true, type: 'carousel', message: `Explora ${props.length} propiedades destacadas`, copies: props.map((p) => ({ id: p.id, ...buildFallbackCopy(p) })) });
  }
}

