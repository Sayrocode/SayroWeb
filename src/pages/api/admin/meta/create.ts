import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../../lib/prisma';
import { requireAdmin, methodNotAllowed } from '../_utils';
import { createCampaign, getBaseUrlFromReq, limitText, readMetaEnv, requireMetaEnv, uploadImages } from '../../../../lib/meta';

type Body = {
  propertyIds: number[];
  adType: 'single' | 'carousel';
  dailyBudget: number; // in MXN
  durationDays?: number;
  dryRun?: boolean;
  // overrides when using custom copy
  copy?: { headline?: string; description?: string; primaryText?: string };
  copies?: { propertyId: number; headline?: string; description?: string }[];
  message?: string; // carousel main message
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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);

  const body = (req.body || {}) as Body;
  const { propertyIds, adType, dailyBudget, durationDays = 7, dryRun } = body;
  if (!Array.isArray(propertyIds) || propertyIds.length === 0) {
    return res.status(400).json({ error: 'Selecciona al menos una propiedad' });
  }
  if (!['single', 'carousel'].includes(String(adType))) {
    return res.status(400).json({ error: 'Tipo de anuncio inválido' });
  }

  // Normalizamos y validamos la base pública del sitio (requerida para que Meta pueda resolver los enlaces)
  const rawBase = (process.env.SITE_BASE_URL || getBaseUrlFromReq(req) || '').trim().replace(/\/$/, '');
  let baseUrl = rawBase;
  try {
    const u = new URL(baseUrl);
    // Evita localhost/127.0.0.1 u hosts privados que Meta no puede alcanzar
    const host = u.hostname.toLowerCase();
    const isLocal = host === 'localhost' || host.endsWith('.local') || /^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host);
    if (!/^https?:$/.test(u.protocol) || isLocal) {
      throw new Error('SITE_BASE_URL must be a public http(s) URL');
    }
    baseUrl = u.toString().replace(/\/$/, '');
  } catch (e) {
    return res.status(400).json({ error: 'Config SITE_BASE_URL inválida. Define una URL pública (https://tu-dominio.com) en .env.local' });
  }

  // Fetch properties
  const props = await prisma.property.findMany({
    where: { id: { in: propertyIds } },
    include: { media: { orderBy: { createdAt: 'asc' } } },
  });
  if (!props.length) return res.status(404).json({ error: 'Propiedades no encontradas' });

  // Pick best image URL for each property (public URL preferred for Meta to fetch)
  const toImageUrls = (p: any): string[] => {
    const urls: string[] = [];
    // EB images first (public CDN)
    try {
      const arr = p.propertyImagesJson ? JSON.parse(p.propertyImagesJson) : [];
      if (Array.isArray(arr)) {
        for (const it of arr) if (it?.url) urls.push(it.url);
      }
    } catch {}
    // Local images (ensure absolute URL)
    for (const m of p.media || []) urls.push(`${baseUrl}/api/admin/images/${encodeURIComponent(m.key)}`);
    // Fallback to title images
    if (p.titleImageFull) urls.push(p.titleImageFull);
    if (p.titleImageThumb) urls.push(p.titleImageThumb);
    return Array.from(new Set(urls));
  };

  // Build destination links
  const toLink = (p: any, extra?: Record<string, string | number>) => {
    const sp = new URLSearchParams({
      utm_source: 'meta',
      utm_medium: 'cpc',
      utm_campaign: 'real_estate',
      utm_content: String(p.publicId || p.id || ''),
      ...(extra || {}),
    } as any);
    // Usa URL() para construir un enlace absoluto válido
    const u = new URL(`/fb/p/${encodeURIComponent(p.publicId)}`, baseUrl);
    u.search = sp.toString();
    return u.toString();
  };

  // Generate copy per property
  const toCopy = (p: any) => {
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
    const desc = limitText(
      [p.propertyType, p.locationText, price ? `Desde ${price}` : null]
        .filter(Boolean)
        .join(' · '),
      60,
    );
    const primary = limitText(
      `${p.title || 'Propiedad destacada'} en ${p.locationText || 'México'}${price ? ` — ${price}` : ''}. Conoce más y agenda tu visita.`,
      125,
    );
    return { headline, description: desc, primaryText: primary };
  };

  const env = readMetaEnv();
  // Allow SITE_BASE_URL to be optional in creds (we can compute from req)
  const missingCreds = !env.accessToken || !env.adAccountId || !env.pageId;

  // Prepare creative spec
  const now = new Date();
  const end = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
  const dailyBudgetMinor = Math.max(50, Math.round((dailyBudget || 100) * 100)); // default 100 MXN

  if (adType === 'single') {
    const p = props[0];
    const link = toLink(p);
    const images = toImageUrls(p).slice(0, 1);
    const copy = body.copy && (body.copy.headline || body.copy.description || body.copy.primaryText)
      ? {
          headline: body.copy.headline ?? toCopy(p).headline,
          description: body.copy.description ?? toCopy(p).description,
          primaryText: body.copy.primaryText ?? toCopy(p).primaryText,
        }
      : toCopy(p);
    const imagesWithHash: { url: string; hash?: string }[] = env.accessToken && env.adAccountId && !dryRun
      ? await uploadImages(env.adAccountId, env.accessToken, images.map((u) => ({ url: u })))
      : images.map((u) => ({ url: u }));
    // v19: no se admite image_url en link_data; si no hay hash, omitimos la imagen para que Meta tome OG del link
    const imageArg = imagesWithHash[0]?.hash ? { image_hash: imagesWithHash[0].hash } : {};

    const storySpec = {
      page_id: env.pageId || '0',
      link_data: {
        link,
        message: copy.primaryText,
        name: copy.headline,
        description: copy.description,
        ...imageArg,
        call_to_action: { type: 'LEARN_MORE', value: { link } },
      },
    };

    if (dryRun || missingCreds) {
      return res.status(200).json({ ok: false, dryRun: true, reason: missingCreds ? 'Faltan credenciales META_*' : 'dryRun', storySpec, budgetMinor: dailyBudgetMinor });
    }

    const creds = requireMetaEnv();
    const created = await createCampaign({
      name: `Sayro - ${copy.headline}`,
      objective: 'OUTCOME_TRAFFIC',
      status: 'PAUSED',
      dailyBudgetMinor,
      startTime: now.toISOString(),
      endTime: end.toISOString(),
      adAccountId: creds.adAccountId,
      pageId: creds.pageId,
      token: creds.accessToken,
      storySpec,
    });
    return res.status(200).json({ ok: true, created });
  }

  // carousel
  const chosen = props.slice(0, 10);
  const child_attachments: any[] = [];
  const imgUploads: { url: string; hash?: string }[] = [];
  for (const p of chosen) {
    const imageUrl = toImageUrls(p)[0];
    if (!imageUrl) continue;
    imgUploads.push({ url: imageUrl });
  }
  const uploaded = env.accessToken && env.adAccountId && !dryRun ? await uploadImages(env.adAccountId, env.accessToken, imgUploads) : imgUploads;

  let idx = 0;
  for (const p of chosen) {
    const link = toLink(p, { card: String(idx) });
    const override = body.copies?.find((c) => c.propertyId === p.id);
    const copy = override && (override.headline || override.description)
      ? { ...toCopy(p), headline: override.headline ?? toCopy(p).headline, description: override.description ?? toCopy(p).description }
      : toCopy(p);
    const up = uploaded[idx++];
    // v19: no usar image_url en child_attachments; si no hay hash, omitimos
    const imageArg = up?.hash ? { image_hash: up.hash } : {};
    child_attachments.push({
      link,
      name: copy.headline,
      description: copy.description,
      ...imageArg,
      call_to_action: { type: 'LEARN_MORE', value: { link } },
    });
  }

  const storySpec = {
    page_id: env.pageId || '0',
    carousel_data: {
      link: toLink(chosen[0], { card: '0' }),
      message: body.message || `Explora ${chosen.length} propiedades destacadas de Sayro`,
      child_attachments,
    },
  };

  if (dryRun || missingCreds) {
    return res.status(200).json({ ok: false, dryRun: true, reason: missingCreds ? 'Faltan credenciales META_*' : 'dryRun', storySpec, budgetMinor: dailyBudgetMinor });
  }

  const creds = requireMetaEnv();
  const created = await createCampaign({
    name: `Sayro - Carrusel ${chosen.length}`,
    objective: 'OUTCOME_TRAFFIC',
    status: 'PAUSED',
    dailyBudgetMinor,
    startTime: now.toISOString(),
    endTime: end.toISOString(),
    adAccountId: creds.adAccountId,
    pageId: creds.pageId,
    token: creds.accessToken,
    storySpec,
  });
  return res.status(200).json({ ok: true, created });
}
