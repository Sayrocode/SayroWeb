#!/usr/bin/env node
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { createClient as createLibSQL } from '@libsql/client';

// Also load .env.local if present
const envLocal = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocal)) {
  const dotenv = await import('dotenv');
  dotenv.config({ path: envLocal });
}

const url = process.env.TURSO_DATABASE_URL;
const token = process.env.TURSO_AUTH_TOKEN;
if (!url) {
  console.error('TURSO_DATABASE_URL is not set');
  process.exit(1);
}

// Ensure we have schema SQL (generate if missing)
const schemaPath = path.resolve(process.cwd(), 'prisma', 'schema.sql');
let sqlScript = '';
if (fs.existsSync(schemaPath)) {
  sqlScript = fs.readFileSync(schemaPath, 'utf8');
} else {
  console.log('→ Generating SQL from Prisma schema…');
  const out = execSync(
    'npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script',
    { encoding: 'utf8' },
  );
  sqlScript = out;
}

// Split SQL into individual statements
function splitStatements(sql) {
  // naive split on semicolons at line ends
  const parts = sql
    .split(/;\s*\n/g)
    .map((s) => s.trim())
    .filter((s) => s && !s.startsWith('--'));
  return parts;
}

const client = createLibSQL({ url, authToken: token });

console.log('→ Applying schema to Turso…');
const stmts = splitStatements(sqlScript);
for (const stmt of stmts) {
  await client.execute(stmt);
}

console.log('✓ Schema applied to Turso');
process.exit(0);

