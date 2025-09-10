import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../../../lib/prisma';
import { requireAdmin, methodNotAllowed } from '../../_utils';
import crypto from 'node:crypto';

async function toBuffer(r: Response) {
  const arr = new Uint8Array(await r.arrayBuffer());
  return Buffer.from(arr);
}

function guessFilename(url: string) {
  try {
    const u = new URL(url);
    const base = (u.pathname.split('/').pop() || '').split('?')[0] || 'image';
    return base;
  } catch {
    return 'image';
  }
}

function hash(input: string) {
  return crypto.createHash('sha1').update(input).digest('hex').slice(0, 16);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);

  const take = Math.min(parseInt(String(req.query.take ?? '200')) || 200, 500);
  const start = Math.max(parseInt(String(req.query.start ?? '0')) || 0, 0);
  const onlyMissing = String(req.query.onlyMissing ?? '1') !== '0';
  const stream = String(req.query.stream ?? '0') === '1';

  const log = (msg: string) => {
    if (stream) {
      try { res.write(msg.endsWith('\n') ? msg : msg + '\n'); } catch {}
    }
  };

  if (stream) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    // help proxies keep the connection open
    try { (res as any).flushHeaders?.(); } catch {}
    log(`# Descarga de imágenes a Turso`);
    log(`# Params: start=${start} take=${take} onlyMissing=${onlyMissing}`);
  }

  const props = await prisma.property.findMany({
    orderBy: { id: 'asc' },
    skip: start,
    take,
    select: { id: true, publicId: true, propertyImagesJson: true, ebDetailJson: true },
  });

  let downloaded = 0;
  const errors: any[] = [];

  for (let idx = 0; idx < props.length; idx++) {
    const p = props[idx];
    let images: string[] = [];
    try {
      if (p.ebDetailJson) {
        const j = JSON.parse(p.ebDetailJson);
        if (Array.isArray(j?.property_images)) {
          images = j.property_images.map((i: any) => i?.url).filter(Boolean);
        }
      }
    } catch {}
    if (!images.length && p.propertyImagesJson) {
      try {
        const j = JSON.parse(p.propertyImagesJson);
        if (Array.isArray(j)) images = j.map((i: any) => i?.url).filter(Boolean);
      } catch {}
    }
    if (!images.length) { log(`- [${idx + 1}/${props.length}] ${p.publicId}: sin imágenes EB`); continue; }

    // Optionally skip if already has media
    if (onlyMissing) {
      const count = await prisma.mediaObject.count({ where: { propertyId: p.id } });
      if (count > 0) { log(`- [${idx + 1}/${props.length}] ${p.publicId}: ya tiene ${count} imagen(es) — omitido`); continue; }
    }

    log(`- [${idx + 1}/${props.length}] ${p.publicId}: descargando ${images.length} imagen(es)`);
    for (const url of images) {
      try {
        const r = await fetch(url, { headers: { accept: '*/*' } as any });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const buf = await toBuffer(r);
        const mime = r.headers.get('content-type') || 'image/jpeg';
        const filename = guessFilename(url);
        const key = `property/${p.id}/${hash(url)}`;
        // Upsert by unique key to avoid duplicates
        await prisma.mediaObject.upsert({
          where: { key },
          create: {
            key,
            mimeType: mime,
            size: buf.length,
            data: buf,
            filename,
            property: { connect: { id: p.id } },
          },
          update: { mimeType: mime, size: buf.length, data: buf, filename },
        });
        downloaded++;
        log(`  • guardada: ${filename} (${mime}, ${buf.length} bytes)`);
      } catch (e: any) {
        errors.push({ id: p.publicId, url, error: e?.message || String(e) });
        log(`  ! error: ${e?.message || String(e)}`);
      }
    }
  }
  if (stream) {
    log(`\nListo. Propiedades: ${props.length}. Archivos guardados: ${downloaded}. Errores: ${errors.length}.`);
    return res.end();
  }
  return res.status(200).json({ ok: true, properties: props.length, downloaded, errors });
}
