import { PrismaClient } from '@prisma/client';
import path from 'node:path';

// Normalize SQLite relative path to absolute to avoid "Unable to open the database file" issues
// when the runtime cwd is not the project root (e.g., Next.js server builds) and we're using
// the local file driver (not Turso).
(() => {
  if (process.env.TURSO_DATABASE_URL) return; // not applicable when using Turso
  const url = process.env.DATABASE_URL;
  if (url && url.startsWith('file:')) {
    const p = url.slice('file:'.length);
    if (p.startsWith('./') || p.startsWith('../')) {
      const abs = path.resolve(process.cwd(), p);
      process.env.DATABASE_URL = `file:${abs}`;
    }
  }
})();

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

function createPrisma() {
  if (process.env.TURSO_DATABASE_URL) {
    // Lazy-load libsql client and adapter to avoid bundling issues in Next.js
    // when deploying to serverless environments.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { createClient: createLibSQL } = require('@libsql/client');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { PrismaLibSQL } = require('@prisma/adapter-libsql');
    const turso = createLibSQL({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
    const adapter = new PrismaLibSQL(turso);
    return new PrismaClient({ adapter } as any);
  }
  return new PrismaClient();
}

export const prisma: PrismaClient = global.prisma || createPrisma();
if (process.env.NODE_ENV !== 'production') global.prisma = prisma;
