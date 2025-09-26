import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';
import { requireAdmin, methodNotAllowed } from './_utils';

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

  const { mode, propertyIds, locale = 'es' } = (req.body || {}) as Body;
  let { temperature = 0.7, top_p = 1.0 } = (req.body || {}) as Body;

  if (mode !== 'single' && mode !== 'carousel') return res.status(400).json({ error: 'Invalid mode' });
  if (!Array.isArray(propertyIds) || propertyIds.length === 0) return res.status(400).json({ error: 'Missing propertyIds' });
  if (locale !== 'es' && locale !== 'en') return res.status(400).json({ error: 'Invalid locale' });
  if (!Number.isFinite(temperature)) temperature = 0.7;
  if (!Number.isFinite(top_p)) top_p = 1.0;

  const key = process.env.OPENAI_API_KEY;
  if (!key) return res.status(200).json({ ok: false, error: 'error por falta de pago en el modelo' });

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
    ? [
        'Eres copywriter experto en Facebook (ads y publicaciones).',
        'Objetivo: generar títulos y descripciones atractivas para inmuebles.',
        'Escribe en español neutro, claro y directo.',
        'No inventes datos: usa solo lo presente en la descripción.',
        'Cumple políticas Meta: sin afirmaciones engañosas, evita mayúsculas excesivas y emojis en exceso.',
        'No menciones herramientas, modelos o IA. Tu salida debe ser únicamente el JSON solicitado.',
      ].join(' ')
    : [
        'You are an expert Facebook copywriter (ads and posts).',
        'Goal: craft compelling titles and descriptions for real estate.',
        'Write in neutral, concise English.',
        'Do not fabricate facts; rely only on the provided description.',
        'Comply with Meta policies: no misleading claims, avoid excessive ALL CAPS and emojis.',
        'Do not mention tools, models or AI. Output must be JSON only.',
      ].join(' ');

  const userPayload = {
    mode,
    locale,
    rules: {
      titleMax: 40,
      descriptionMax: 60,
      variantsPerProperty: 5,
      ctaExamples: locale === 'es' ? ['Agenda tu visita', 'Conoce más', 'Solicita información'] : ['Book a visit', 'Learn more', 'Request info'],
      avoid: ['exageraciones', 'mayúsculas', 'emojis excesivos', 'promesas no comprobables'],
      variationStyles: locale === 'es'
        ? ['beneficio/principal', 'ubicación/amenidades', 'precio/valor', 'urgencia/disponibilidad', 'estilo de vida']
        : ['benefit-led', 'location/amenities', 'price/value', 'urgency/availability', 'lifestyle'],
    },
    items,
    instruction: locale === 'es'
      ? 'Genera exactamente 5 variantes por propiedad. Cada variante incluye title (<=40) y description (<=60), optimizados para Facebook (ads y publicaciones). Varía el ángulo entre variantes usando estilos de variationStyles y termina la descripción con un CTA breve de ctaExamples. No repitas frases exactas entre variantes. Sin emojis.'
      : 'Generate exactly 5 variants per property. Each variant includes title (<=40) and description (<=60), optimized for Facebook (ads and posts). Vary the angle across variationStyles and end description with a brief CTA from ctaExamples. Avoid verbatim repetition. No emojis.',
  };

  const schema = buildSchema(items.length);

  const payload = {
    model: 'gpt-4o-mini',
    input: [
      { role: 'system', content: system },
      { role: 'user', content: JSON.stringify(userPayload) },
    ],
    temperature,
    top_p,
    text: {
      format: { type: 'json_schema', json_schema: schema },
    },
    max_output_tokens: 1200,
  } as any;

  try {
    const upstreamUrl = 'https://api.openai.com/v1/responses';
    const r = await fetch(upstreamUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify(payload),
    });
    const text = await r.text();
    let j: any = null;
    try { j = text ? JSON.parse(text) : null; } catch {}

    if (!r.ok) {
      const detail = j?.error?.message || j?.message || text || `HTTP ${r.status}`;
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.error('[gen-content] upstream error', { status: r.status, detail, payloadHint: { mode, locale, items: items.length } });
      }
      // Fallback to chat completions with JSON-only instruction
      const fb = await (async () => {
        try {
          const messages = [
            { role: 'system', content: system },
            { role: 'user', content: [
              'Sigue las instrucciones y responde ÚNICAMENTE con JSON válido sin texto adicional.',
              'Esquema: {"items":[{"id":"string","variants":[{"title":"string","description":"string"}]}]}',
              'items debe tener la misma longitud que las propiedades de entrada y mantener el mismo orden.',
              `Reglas: title<=${userPayload.rules.titleMax}, description<=${userPayload.rules.descriptionMax}, 5 variantes por propiedad.`,
              'No incluyas comentarios, ni campos extra.',
              `Entrada:\n${JSON.stringify(userPayload)}`,
              ].join('\n') },
          ];
          const cr = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
            body: JSON.stringify({ model: 'gpt-4o-mini', messages, temperature, top_p, response_format: { type: 'json_object' } }),
          });
          const ct = await cr.text();
          let cj: any = null; try { cj = ct ? JSON.parse(ct) : null; } catch {}
          if (!cr.ok) {
            // try again without response_format
            const cr2 = await fetch('https://api.openai.com/v1/chat/completions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
              body: JSON.stringify({ model: 'gpt-4o-mini', messages, temperature, top_p }),
            });
            const ct2 = await cr2.text();
            let cj2: any = null; try { cj2 = ct2 ? JSON.parse(ct2) : null; } catch {}
            return { ok: cr2.ok, raw: cj2, text: ct2 } as any;
          }
          return { ok: true, raw: cj } as any;
        } catch (e) { return { ok: false, raw: null, error: String((e as any)?.message || e) } as any; }
      })();

      if (!fb.ok) {
        return res.status(200).json({ ok: false, error: 'content_generation_failed', detail, http_status: r.status, missing, latency_ms: Date.now() - start });
      }

      // Parse fallback output
      const fallbackObj = fb.raw;
      let content: string | null = null;
      try { content = fallbackObj?.choices?.[0]?.message?.content || null; } catch {}
      let parsedFb: any = null;
      try { parsedFb = content ? JSON.parse(content) : null; } catch {}

      const outItemsFb: AdIdeasItem[] = [];
      const rawItemsFb = Array.isArray(parsedFb?.items) ? parsedFb.items : [];
      for (const it of rawItemsFb) {
        const id = String(it?.id ?? '');
        if (!id) continue;
        const variants = Array.isArray(it?.variants) ? it.variants : [];
        const normVariants: AdVariant[] = variants
          .map((v: any) => ({ title: String(v?.title || ''), description: String(v?.description || '') }))
          .filter((v: AdVariant) => v.title && v.description)
          .slice(0, 5);
        if (normVariants.length && normVariants.length < 5) {
          const last = normVariants[normVariants.length - 1];
          while (normVariants.length < 5) normVariants.push({ ...last });
        }
        if (normVariants.length === 5) outItemsFb.push({ id, variants: normVariants });
      }
      const orderFb = new Map<string, number>(propertyIds.map((pid, idx) => [String(pid), idx]));
      outItemsFb.sort((a, b) => (orderFb.get(a.id)! - orderFb.get(b.id)!));
      if (outItemsFb.length) {
        const latency_ms = Date.now() - start;
        return res.status(200).json({ ok: true, items: outItemsFb, missing, latency_ms, usage: null, model: 'gpt-4o-mini', locale, temperature, top_p });
      }

      return res.status(200).json({ ok: false, error: 'empty_result', detail, http_status: r.status, missing, latency_ms: Date.now() - start });
    }

    const latency_ms = Date.now() - start;
    const usage = j?.usage || null;

    let parsed: any = null;
    try {
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
      if (normVariants.length && normVariants.length < 5) {
        const last = normVariants[normVariants.length - 1];
        while (normVariants.length < 5) normVariants.push({ ...last });
      }
      if (normVariants.length === 5) outItems.push({ id, variants: normVariants });
    }

    const order = new Map<string, number>(propertyIds.map((pid, idx) => [String(pid), idx]));
    outItems.sort((a, b) => (order.get(a.id)! - order.get(b.id)!));

    if (!outItems.length) {
      const dbg = process.env.NODE_ENV !== 'production' ? { raw_keys: Object.keys(j || {}), parsed_type: typeof parsed } : undefined;
      return res.status(200).json({ ok: false, error: 'empty_result', detail: 'No se pudo estructurar la salida', debug: dbg, missing, latency_ms, usage });
    }

    return res.status(200).json({ ok: true, items: outItems, missing, latency_ms, usage, model: 'gpt-4o-mini', locale, temperature, top_p });
  } catch (e: any) {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.error('[gen-content] exception', e);
    }
    return res.status(200).json({ ok: false, error: 'content_generation_exception', detail: String(e?.message || e) });
  }
}
