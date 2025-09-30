import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../../../../lib/prisma';
import { requireAdmin, methodNotAllowed } from '../../../_utils';
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

  const id = parseInt(String(req.query.id));
  if (!id) return res.status(400).json({ error: 'ID inválido' });

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
    try { (res as any).flushHeaders?.(); } catch {}
    log(`# Descarga de imágenes de propiedad ${id}`);
  }

  const prop = await prisma.property.findUnique({
    where: { id },
    select: { id: true, publicId: true, propertyImagesJson: true, ebDetailJson: true },
  });
  if (!prop) return res.status(404).json({ error: 'No encontrado' });

  let urls: string[] = [];
  try {
    if (prop.ebDetailJson) {
      const j = JSON.parse(prop.ebDetailJson);
      if (Array.isArray(j?.property_images)) urls = j.property_images.map((i: any) => i?.url).filter(Boolean);
    }
  } catch {}
  if (!urls.length && prop.propertyImagesJson) {
    try {
      const j = JSON.parse(prop.propertyImagesJson);
      if (Array.isArray(j)) urls = j.map((i: any) => i?.url).filter(Boolean);
    } catch {}
  }

  if (!urls.length) {
    if (stream) { log(`- ${prop.publicId}: sin URLs de imágenes`); return res.end(); }
    return res.status(200).json({ ok: true, downloaded: 0, errors: [{ reason: 'no_image_urls' }] });
  }

  // Build set of existing keys to skip duplicates when onlyMissing
  let existingKeys = new Set<string>();
  if (onlyMissing) {
    const existing = await prisma.mediaObject.findMany({ where: { propertyId: id }, select: { key: true } });
    existingKeys = new Set(existing.map((e) => e.key));
  }

  log(`- ${prop.publicId}: procesando ${urls.length} imagen(es)`);
  let downloaded = 0;
  const errors: any[] = [];
  for (const url of urls) {
    try {
      const key = `property/${id}/${hash(url)}`;
      if (onlyMissing && existingKeys.has(key)) {
        log(`  • omitida (ya existe): ${key}`);
        continue;
      }
      const r = await fetch(url, { headers: { accept: '*/*' } as any });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const buf = await toBuffer(r);
      const mime = r.headers.get('content-type') || 'image/jpeg';
      const filename = guessFilename(url);
      await prisma.mediaObject.upsert({
        where: { key },
        create: { key, mimeType: mime, size: buf.length, data: buf, filename, property: { connect: { id } } },
        update: { mimeType: mime, size: buf.length, data: buf, filename },
      });
      downloaded++;
      log(`  • guardada: ${filename} (${mime}, ${buf.length} bytes)`);
    } catch (e: any) {
      errors.push({ url, error: e?.message || String(e) });
      log(`  ! error: ${e?.message || String(e)}`);
    }
  }

  if (stream) { log(`\nListo. Archivos guardados: ${downloaded}. Errores: ${errors.length}.`); return res.end(); }
  return res.status(200).json({ ok: true, downloaded, errors });
}
