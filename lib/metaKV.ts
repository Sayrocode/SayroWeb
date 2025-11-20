import { prisma } from './prisma';

const TABLE = 'MetaKV';

async function ensureTable() {
  try {
    // libsql/sqlite compatible
    await prisma.$executeRawUnsafe(
      `CREATE TABLE IF NOT EXISTS ${TABLE} (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updatedAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
      )`
    );
  } catch (e) {
    // ignore if cannot create (read-only env)
  }
}

export async function kvGet(key: string): Promise<string | null> {
  await ensureTable();
  try {
    const rows = await prisma.$queryRawUnsafe<any[]>(`SELECT value FROM ${TABLE} WHERE key = ? LIMIT 1`, key);
    if (Array.isArray(rows) && rows.length > 0) return String(rows[0].value);
  } catch (e) {
    // ignore
  }
  return null;
}

export async function kvSet(key: string, value: string): Promise<void> {
  await ensureTable();
  try {
    await prisma.$executeRawUnsafe(
      `INSERT INTO ${TABLE} (key, value, updatedAt)
       VALUES (?, ?, strftime('%Y-%m-%dT%H:%M:%fZ','now'))
       ON CONFLICT(key) DO UPDATE SET value=excluded.value, updatedAt=excluded.updatedAt`,
      key,
      value
    );
  } catch (e) {
    // ignore
  }
}

