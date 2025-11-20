// Seed two News stories so they appear on /noticias
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { createClient as createLibSQL } from '@libsql/client';
import { PrismaLibSQL } from '@prisma/adapter-libsql';

// Load .env.local also (Next.js convention)
const envLocal = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocal)) {
  const dotenv = await import('dotenv');
  dotenv.config({ path: envLocal });
}

// Normalize SQLite path for local dev when not using Turso
if (!process.env.TURSO_DATABASE_URL && process.env.DATABASE_URL?.startsWith('file:')) {
  const p = process.env.DATABASE_URL.slice('file:'.length);
  if (p.startsWith('./') || p.startsWith('../')) {
    process.env.DATABASE_URL = `file:${path.resolve(process.cwd(), p)}`;
  }
}

function createPrisma() {
  if (process.env.TURSO_DATABASE_URL) {
    const turso = createLibSQL({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });
    const adapter = new PrismaLibSQL(turso);
    return new PrismaClient({ adapter });
  }
  return new PrismaClient();
}

console.log('DB URL:', process.env.DATABASE_URL || '(unset)');
console.log('TURSO URL:', process.env.TURSO_DATABASE_URL ? '[set]' : '(unset)');
console.log('TURSO TOKEN:', process.env.TURSO_AUTH_TOKEN ? '[set]' : '(unset)');
const prisma = createPrisma();

function toSlug(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

async function main() {
  const now = new Date();
  const stories = [
    {
      title: 'Tendencias del mercado inmobiliario en Querétaro 2025',
      excerpt: 'Qué esperar del mercado de vivienda y terrenos en Querétaro durante 2025.',
      coverUrl: '/image3.jpg',
      content: [
        'Querétaro continúa consolidándose como uno de los mercados inmobiliarios más dinámicos de México. ',
        'Para 2025 se anticipa una mayor demanda de vivienda media y residencial, así como un repunte en lotes ',
        'para inversión en zonas con plusvalía estable. La conectividad y los desarrollos con amenidades completas ',
        'seguirán siendo factores decisivos al momento de elegir.\n\n',
        'Recomendaciones clave:\n',
        '• Evaluar cercanía a corredores industriales y vías principales.\n',
        '• Considerar amenidades y servicios en el entorno inmediato.\n',
        '• Priorizar desarrollos con gestión transparente y títulos en orden.',
      ].join(''),
      tags: ['Querétaro', 'Mercado', 'Tendencias'],
    },
    {
      title: 'Guía para comprar tu primera casa en México',
      excerpt: 'Pasos esenciales, tipos de crédito y tips para una compra segura.',
      coverUrl: '/image3.jpg',
      content: [
        'Comprar tu primera casa es una de las decisiones financieras más importantes. ',
        'Antes de iniciar, define tu presupuesto, compara hipotecas y verifica la documentación del inmueble.\n\n',
        'Pasos recomendados:\n',
        '1) Precalifica tu crédito hipotecario.\n',
        '2) Define zona y tipo de propiedad.\n',
        '3) Revisa escrituras y estatus legal.\n',
        '4) Agenda visitas y compara opciones.\n',
        '5) Negocia y firma con asesoría profesional.',
      ].join(''),
      tags: ['Compra', 'Hipoteca', 'Consejos'],
    },
  ];

  for (const s of stories) {
    const slug = toSlug(s.title);
    await prisma.news.upsert({
      where: { slug },
      update: {
        title: s.title,
        excerpt: s.excerpt,
        coverUrl: s.coverUrl,
        content: s.content,
        tagsJson: JSON.stringify(s.tags),
        publishedAt: now,
      },
      create: {
        slug,
        title: s.title,
        excerpt: s.excerpt,
        coverUrl: s.coverUrl,
        content: s.content,
        tagsJson: JSON.stringify(s.tags),
        publishedAt: now,
      },
    });
  }
  console.log('→ Seed de noticias listo.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
