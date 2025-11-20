#!/usr/bin/env node
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@libsql/client';

// Load .env.local if present
const envLocal = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocal)) {
  const dotenv = await import('dotenv');
  dotenv.config({ path: envLocal });
}

const url = process.env.TURSO_DATABASE_URL;
const token = process.env.TURSO_AUTH_TOKEN;
if (!url) {
  console.error('TURSO_DATABASE_URL not set');
  process.exit(1);
}

const client = createClient({ url, authToken: token });

const stmts = [
  `CREATE TABLE IF NOT EXISTS "NewsComment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "newsId" INTEGER NOT NULL,
    "anonId" TEXT NOT NULL,
    "displayName" TEXT,
    "content" TEXT NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NewsComment_newsId_fkey" FOREIGN KEY ("newsId") REFERENCES "News" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  );`,
  `CREATE INDEX IF NOT EXISTS "NewsComment_newsId_idx" ON "NewsComment"("newsId");`,
  `CREATE INDEX IF NOT EXISTS "NewsComment_createdAt_idx" ON "NewsComment"("createdAt");`,
  `CREATE TABLE IF NOT EXISTS "NewsLike" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "newsId" INTEGER NOT NULL,
    "anonId" TEXT NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NewsLike_newsId_fkey" FOREIGN KEY ("newsId") REFERENCES "News" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  );`,
  `CREATE INDEX IF NOT EXISTS "NewsLike_newsId_idx" ON "NewsLike"("newsId");`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "NewsLike_newsId_anonId_key" ON "NewsLike"("newsId", "anonId");`,
];

for (const s of stmts) {
  await client.execute(s);
}

console.log('✓ Patched NewsComment/NewsLike tables in Turso');
process.exit(0);

