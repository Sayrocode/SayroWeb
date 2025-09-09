#!/usr/bin/env node
// Create or update the admin user using env ADMIN_USERNAME/ADMIN_PASSWORD
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { createClient as createLibSQL } from '@libsql/client';
import { PrismaLibSQL } from '@prisma/adapter-libsql';

// Load .env.local as well if present
const envLocal = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocal)) {
  const dotenv = await import('dotenv');
  dotenv.config({ path: envLocal });
}

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

const prisma = createPrisma();

async function main() {
  const username = process.env.ADMIN_USERNAME?.trim();
  const password = process.env.ADMIN_PASSWORD?.trim();
  if (!username || !password) {
    throw new Error('Define ADMIN_USERNAME y ADMIN_PASSWORD en tu entorno para crear el admin.');
  }
  const hash = await bcrypt.hash(password, 12);

  // Ensure table exists (simple probe)
  try {
    await prisma.$queryRaw`SELECT 1 FROM User LIMIT 1`;
  } catch (e) {
    throw new Error('La tabla User no existe. Aplica primero el esquema: yarn db:sql && yarn db:deploy:turso');
  }

  const existing = await prisma.user.findUnique({ where: { username } }).catch(() => null);
  if (existing) {
    await prisma.user.update({ where: { id: existing.id }, data: { passwordHash: hash, role: 'ADMIN' } });
    console.log(`✓ Admin actualizado: ${username}`);
  } else {
    await prisma.user.create({ data: { username, passwordHash: hash, role: 'ADMIN' } });
    console.log(`✓ Admin creado: ${username}`);
  }
}

main()
  .catch((e) => {
    console.error(e?.message || e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

