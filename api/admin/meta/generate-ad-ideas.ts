import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../../lib/prisma';
import { requireAdmin, methodNotAllowed } from '../_utils';

type Mode = 'single' | 'carousel';
type Locale = 'es' | 'en';
type Model = 'gpt-4o-mini' | 'gpt-4.1-mini';

export type AdVariant = { title: string; description: string };
export type AdIdeasItem = { id: string; variants: AdVariant[] };

type Body = {
  mode: Mode;
  propertyIds: string[];
  locale?: Locale;
  model?: Model;
  temperature?: number;
  top_p?: number;
};

function stripHtml(input: string | null | undefined): string {
  if (!input) return '';
  return String(input).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function isEbId(id: string): boolean {
  return /^EB-/i.test(id) || /[A-Za-z]/.test(id);
}

function limit(input: string, max = 800): string {
  const s = String(input || '').trim();
  if (s.length <= max) return s;
  return s.slice(0, max);
}

async function getDbPropertyDescription(idNum: number): Promise<{ description: string; context: any } | null> {
  const p = await prisma.property.findUnique({ where: { id: idNum } });
  if (!p) return null;
  let desc: string | null = null;
  try {
    if (p.ebDetailJson) {
      const j = JSON.parse(p.ebDetailJson);
      if (typeof j?.description === 'string') desc = j.description;
    }
  } catch {}
  // No description on record; nothing else to base on
  if (!desc) return { description: '', context: { id: String(p.id), title: p.title || null } };
  return { description: stripHtml(desc), context: { id: String(p.id), title: p.title || null } };
}

async function getEbPropertyDescription(ebId: string): Promise<{ description: string; context: any } | null> {
  const apiKey = process.env.EASYBROKER_API_KEY;
  if (!apiKey) return null;
  const url = `https://api.easybroker.com/v1/properties/${encodeURIComponent(ebId)}`;
  const r = await fetch(url, { headers: { accept: 'application/json', 'X-Authorization': apiKey } });
  const text = await r.text();
  let data: any = null;
  try { data = JSON.parse(text); } catch { data = null; }
  if (!r.ok) return null;
  const desc = stripHtml(data?.description || '');
  return { description: desc, context: { id: ebId, title: data?.title || null } };
}

function buildSchema(propertyCount: number) {
  return {
    name: 'ad_ideas',
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        items: {
          type: 'array',
          minItems: propertyCount,
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              id: { type: 'string' },
              variants: {
                type: 'array',
                minItems: 5,
                maxItems: 5,
                items: {
                  type: 'object',
                  additionalProperties: false,
                  properties: {
                    title: { type: 'string', maxLength: 40 },
                    description: { type: 'string', maxLength: 60 },
                  },
                  required: ['title', 'description'],
                },
              },
            },
            required: ['id', 'variants'],
          },
        },
      },
      required: ['items'],
    },
    strict: true,
  } as const;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);

  const { mode, propertyIds, locale = 'es', model = 'gpt-4o-mini' } = (req.body || {}) as Body;
  let { temperature = 0.7, top_p = 1.0 } = (req.body || {}) as Body;

  if (mode !== 'single' && mode !== 'carousel') return res.status(400).json({ error: 'Invalid mode' });
  if (!Array.isArray(propertyIds) || propertyIds.length === 0) return res.status(400).json({ error: 'Missing propertyIds' });
  if (locale !== 'es' && locale !== 'en') return res.status(400).json({ error: 'Invalid locale' });
  if (model !== 'gpt-4o-mini' && model !== 'gpt-4.1-mini') return res.status(400).json({ error: 'Invalid model' });
  if (!Number.isFinite(temperature)) temperature = 0.7;
  if (!Number.isFinite(top_p)) top_p = 1.0;

  const key = process.env.OPENAI_API_KEY;
  if (!key) return res.status(200).json({ ok: false, error: 'error por falta de pago en el modelo' });

  // Resolve descriptions for each property
  const items: { id: string; description: string }[] = [];
  const missing: string[] = [];
  for (const rawId of propertyIds) {
    const id = String(rawId);
    try {
      if (isEbId(id)) {
        const eb = await getEbPropertyDescription(id);
        if (eb && eb.description) items.push({ id, description: limit(eb.description, 1200) });
        else missing.push(id);
      } else {
        const n = Number(id);
        if (!Number.isFinite(n)) { missing.push(id); continue; }
        const db = await getDbPropertyDescription(n);
        if (db && db.description) items.push({ id: String(n), description: limit(db.description, 1200) });
        else missing.push(id);
      }
    } catch {
      missing.push(id);
    }
  }

  if (!items.length) {
    return res.status(400).json({ error: 'No descriptions available', missing });
  }

  const start = Date.now();
  const system = locale === 'es'
    ? 'Eres un copywriter para anuncios de Meta (Facebook/Instagram). Escribe en español neutro. Cumple prácticas: lenguaje claro, CTA breve, sin claims engañosos, evita MAYÚSCULAS excesivas. No agregues datos que no estén en la descripción.'
    : 'You are a copywriter for Meta (Facebook/Instagram) ads. Write in neutral English. Follow best practices: clear language, short CTA, no misleading claims, avoid excessive ALL CAPS. Do not add facts not present in the description.';

  // Compact user instruction – base exclusively on given descriptions
  const userPayload = {
    mode,
    locale,
    rules: {
      titleMax: 40,
      descriptionMax: 60,
      variantsPerProperty: 5,
      ctaExamples: locale === 'es' ? ['Agenda tu visita', 'Conoce más'] : ['Book a visit', 'Learn more'],
      avoid: ['exageraciones', 'mayúsculas', 'emojis excesivos'],
    },
    items,
    instruction: locale === 'es'
      ? 'Genera exactamente 5 variantes (title, description) por propiedad, SOLO en base a su descripción. CTA breve.'
      : 'Generate exactly 5 variants (title, description) per property, ONLY based on its description. Short CTA.',
  };

  const schema = buildSchema(items.length);

  // Use Responses API with Structured Output
  const payload = {
    model,
    input: [
      { role: 'system', content: system },
      { role: 'user', content: JSON.stringify(userPayload) },
    ],
    temperature,
    top_p,
    response_format: { type: 'json_schema', json_schema: schema },
    max_output_tokens: 1200,
  } as any;

  try {
    const r = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify(payload),
    });
    const j = await r.json();

    // Extract tokens usage if available
    const latency_ms = Date.now() - start;
    const usage = j?.usage || null;

    // Try to parse the structured JSON
    let parsed: any = null;
    try {
      // Responses API returns output[0].content[0].text for JSON output in many SDKs
      const txt = j?.output?.[0]?.content?.[0]?.text
        || j?.output_text
        || j?.choices?.[0]?.message?.content
        || j?.content;
      parsed = typeof txt === 'string' ? JSON.parse(txt) : (typeof txt === 'object' ? txt : null);
    } catch {}

    const outItems: AdIdeasItem[] = [];
    const rawItems = Array.isArray(parsed?.items) ? parsed.items : [];
    for (const it of rawItems) {
      const id = String(it?.id ?? '');
      if (!id) continue;
      const variants = Array.isArray(it?.variants) ? it.variants : [];
      const normVariants: AdVariant[] = variants
        .map((v: any) => ({ title: String(v?.title || ''), description: String(v?.description || '') }))
        .filter((v: AdVariant) => v.title && v.description)
        .slice(0, 5);
      // Enforce exactly 5 items by padding last when necessary
      if (normVariants.length && normVariants.length < 5) {
        const last = normVariants[normVariants.length - 1];
        while (normVariants.length < 5) normVariants.push({ ...last });
      }
      if (normVariants.length === 5) outItems.push({ id, variants: normVariants });
    }

    // Keep ordering by requested propertyIds
    const order = new Map<string, number>(propertyIds.map((pid, idx) => [String(pid), idx]));
    outItems.sort((a, b) => (order.get(a.id)! - order.get(b.id)!));

    if (!outItems.length) {
      return res.status(200).json({ ok: false, error: 'error en sayro ai', missing, latency_ms, usage });
    }

    return res.status(200).json({ ok: true, items: outItems, missing, latency_ms, usage, model, locale, temperature, top_p });
  } catch (e: any) {
    return res.status(200).json({ ok: false, error: 'error en sayro ai' });
  }
}
