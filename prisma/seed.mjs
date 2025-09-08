// Seeds the SQLite DB with all properties from EasyBroker.
// Requires: EASYBROKER_API_KEY in .env.local or .env
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { createClient as createLibSQL } from '@libsql/client';
import { PrismaLibSQL } from '@prisma/adapter-libsql';

// Load .env.local as well if present (Next.js convention)
const envLocal = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocal)) {
  const dotenv = await import('dotenv');
  dotenv.config({ path: envLocal });
}

// Normalize SQLite path for local dev (skip when Turso is used)
if (!process.env.TURSO_DATABASE_URL && process.env.DATABASE_URL?.startsWith('file:')) {
  const p = process.env.DATABASE_URL.slice('file:'.length);
  if (p.startsWith('./') || p.startsWith('../')) {
    process.env.DATABASE_URL = `file:${path.resolve(process.cwd(), p)}`;
  }
}

function createPrisma() {
  if (process.env.TURSO_DATABASE_URL) {
    const turso = createLibSQL({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
    const adapter = new PrismaLibSQL(turso);
    return new PrismaClient({ adapter });
  }
  return new PrismaClient();
}

const prisma = createPrisma();
const EB_BASE = 'https://api.easybroker.com/v1';

function requireKey() {
  const key = process.env.EASYBROKER_API_KEY;
  if (!key) throw new Error('EASYBROKER_API_KEY is not set');
  return key;
}

async function fetchJSON(url) {
  const r = await fetch(url, {
    headers: { accept: 'application/json', 'X-Authorization': requireKey() },
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`HTTP ${r.status} at ${url}: ${text}`);
  }
  return await r.json();
}

function getLocationText(loc) {
  if (typeof loc === 'string') return loc;
  if (!loc || typeof loc !== 'object') return '';
  const o = loc;
  return [o.name, o.neighborhood, o.municipality || o.delegation, o.city, o.state, o.country]
    .filter(Boolean)
    .join(', ');
}

async function fetchAllList(limit = 100) {
  const all = [];
  let page = 1;
  let next = 1;
  let safety = 0;
  while (next && safety < 500) {
    const url = `${EB_BASE}/properties?page=${page}&limit=${limit}`;
    const data = await fetchJSON(url);
    const items = Array.isArray(data.content) ? data.content : [];
    all.push(...items);
    if (data.pagination && typeof data.pagination.next_page !== 'undefined') {
      next = data.pagination.next_page ?? null;
      page = next || 0;
    } else {
      next = items.length === limit ? page + 1 : null;
      if (next) page = next;
    }
    safety++;
  }
  const seen = new Set();
  return all.filter((p) => {
    if (!p?.public_id) return false;
    if (seen.has(p.public_id)) return false;
    seen.add(p.public_id);
    return true;
  });
}

async function fetchDetail(publicId) {
  const url = `${EB_BASE}/properties/${encodeURIComponent(publicId)}`;
  return fetchJSON(url);
}

async function main() {
  console.log('→ Seeding DB from EasyBroker…');
  const list = await fetchAllList(100);
  console.log(`→ Listado total: ${list.length} propiedades`);

  const CONCURRENCY = 5;
  let idx = 0;
  const errors = [];

  async function worker() {
    while (true) {
      const i = idx++;
      if (i >= list.length) break;
      const it = list[i];
      const id = it.public_id;
      try {
        const detail = await fetchDetail(id);
        const payload = {
          publicId: id,
          title: detail.title ?? it.title ?? null,
          titleImageFull: detail.title_image_full ?? it.title_image_full ?? null,
          titleImageThumb: detail.title_image_thumb ?? it.title_image_thumb ?? null,
          propertyType: detail.property_type ?? it.property_type ?? null,
          status: detail.status ?? it.status ?? null,
          bedrooms: detail.bedrooms ?? it.bedrooms ?? null,
          bathrooms: detail.bathrooms ?? it.bathrooms ?? null,
          parkingSpaces: detail.parking_spaces ?? it.parking_spaces ?? null,
          lotSize: detail.lot_size ?? null,
          constructionSize: detail.construction_size ?? null,
          brokerName: detail?.broker?.name ?? null,
          locationText: getLocationText(detail.location ?? it.location),
          operationsJson: (() => {
            const val = (detail.operations ?? it.operations) || null;
            return val ? JSON.stringify(val) : null;
          })(),
          propertyImagesJson: (() => {
            const val = (detail.property_images && Array.isArray(detail.property_images)) ? detail.property_images : null;
            return val ? JSON.stringify(val) : null;
          })(),
          ebDetailJson: detail ? JSON.stringify(detail) : null,
        };

        await prisma.property.upsert({
          where: { publicId: id },
          update: { ...payload },
          create: { ...payload },
        });
        if ((i + 1) % 25 === 0) console.log(`  · Progreso: ${i + 1}/${list.length}`);
      } catch (e) {
        const msg = e?.message || String(e);
        errors.push({ id, error: msg });
        console.warn(`  ! Error con ${id}: ${msg}`);
      }
    }
  }

  const workers = Array.from({ length: CONCURRENCY }, () => worker());
  await Promise.all(workers);

  console.log(`→ Seed listo. Errores: ${errors.length}`);
  if (errors.length) {
    const logPath = path.resolve(process.cwd(), 'prisma', 'seed-errors.log');
    fs.writeFileSync(logPath, errors.map((e) => `${e.id}\t${e.error}`).join('\n'));
    console.log(`→ Errores guardados en ${logPath}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
