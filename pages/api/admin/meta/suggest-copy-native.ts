import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../../lib/prisma';
import { requireAdmin, methodNotAllowed } from '../_utils';
import { limitText } from '../../../../lib/meta';

type Body = {
  propertyIds: number[];
  adType: 'single' | 'carousel';
  baseDescription?: string;
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

function buildCopyFrom(p: any, baseDescription?: string) {
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
  const headlineBase = ensureQueretaro(title);
  const headline = limitText(headlineBase, 40);
  const descFromDetail = baseDescription || firstSentence(p.description) || '';
  const description = limitText(ensureQueretaro(descFromDetail || [p.propertyType, op, price].filter(Boolean).join(' · ') || 'Propiedad en Querétaro'), 60);
  const primaryPieces = [op || undefined, price || undefined, p.locationText || undefined, descFromDetail || undefined].filter(Boolean) as string[];
  const primaryText = limitText(ensureQueretaro(primaryPieces.join(' · ')), 125);
  return { headline, description, primaryText };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);

  const { propertyIds, adType, baseDescription } = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}) as Body;
  const count = Math.min(parseInt(String((req.query?.count as string) || '5'), 10) || 5, 8);
  if (!Array.isArray(propertyIds) || propertyIds.length === 0) return res.status(400).json({ error: 'Selecciona propiedades' });
  if (adType !== 'single' && adType !== 'carousel') return res.status(400).json({ error: 'Tipo inválido' });

  const props = await prisma.property.findMany({ where: { id: { in: propertyIds } } });
  if (!props.length) return res.status(404).json({ error: 'Propiedades no encontradas' });

  if (adType === 'single') {
    const p = props[0];
    const options = Array.from({ length: count }).map((_, i) => buildCopyFrom({ ...p, title: i === 0 ? p.title : `${p.title || 'Propiedad'} • opción ${i+1}` }, baseDescription));
    return res.status(200).json({ ok: true, type: 'single', options });
  }
  const options = props.map((p) => {
    const arr = Array.from({ length: count }).map((_, i) => {
      const base = i === 0 ? p : { ...p, title: `${p.title || 'Propiedad'} • ${i+1}` };
      const c = buildCopyFrom(base, baseDescription);
      return { headline: c.headline, description: c.description };
    });
    return { id: p.id, options: arr };
  });
  return res.status(200).json({ ok: true, type: 'carousel', options });
}
