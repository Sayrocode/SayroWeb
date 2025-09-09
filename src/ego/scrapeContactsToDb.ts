import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { chromium, Page } from 'playwright';
import { prisma } from '../lib/prisma';

// Load .env.local as well (like property scraper)
(() => {
  try {
    const envLocal = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(envLocal)) {
      const dotenv = require('dotenv');
      dotenv.config({ path: envLocal });
    }
  } catch {}
})();

type EgoContact = {
  personId?: string;
  name?: string;
  role?: string;
  phone?: string;
  email?: string;
  createdText?: string;
  createdAtEgo?: Date | null;
  responsible?: string;
};

function parseSpanishDate(text?: string): Date | null {
  if (!text) return null;
  const t = text.trim().toLowerCase();
  // ej: "28 ago." o "28 ago"
  const months: Record<string, number> = {
    ene: 0, feb: 1, mar: 2, abr: 3, may: 4, jun: 5, jul: 6, ago: 7, sep: 8, oct: 9, nov: 10, dic: 11,
  };
  const m = t.match(/(\d{1,2})\s+([a-zñ\.]{3,})/i);
  if (m) {
    const d = parseInt(m[1], 10);
    const monKey = (m[2] || '').replace(/\./g, '').slice(0, 3);
    if (Number.isFinite(d) && months.hasOwnProperty(monKey)) {
      const now = new Date();
      const year = now.getFullYear();
      const date = new Date(year, months[monKey], d);
      return isNaN(date.getTime()) ? null : date;
    }
  }
  return null;
}

async function processContactsList(page: Page): Promise<EgoContact[]> {
  const items = await page.locator('.listItem.contactItem').all();
  const results: EgoContact[] = [];
  for (const it of items) {
    try {
      const name = (await it.locator('.ListItemTitle a').first().innerText().catch(() => ''))?.trim();
      const personHref = await it.locator('.ListItemTitle a').first().getAttribute('href').catch(() => null);
      const personId = personHref?.match(/\/egocore\/person\/(\d+)/)?.[1] || undefined;
      const role = (await it.locator('.contactCardRole').first().innerText().catch(() => ''))?.trim() || undefined;
      const phone = (await it.locator('.contactCardPhone a[href^="tel:"]').first().innerText().catch(() => ''))?.trim() || undefined;
      const email = (await it.locator('.contactCardMail a[href^="mailto:"]').first().innerText().catch(() => ''))?.trim() || undefined;
      // contactCardResponsible appears twice: created and responsible
      const respBlocks = await it.locator('.contactCardResponsible').allInnerTexts().catch(() => [] as string[]);
      let createdText: string | undefined;
      let responsible: string | undefined;
      if (respBlocks && respBlocks.length) {
        const a = respBlocks[0] || '';
        const b = respBlocks[1] || '';
        if (/cread[ao]/i.test(a)) {
          const span = await it.locator('.contactCardResponsible span').first().innerText().catch(() => '');
          createdText = span?.trim() || undefined;
          // second as responsible
          const resp = await it.locator('.contactCardResponsible span').nth(1).innerText().catch(() => '');
          responsible = resp?.trim() || undefined;
        } else {
          // sometimes order may vary
          if (/responsabil/i.test(a)) responsible = (await it.locator('.contactCardResponsible span').first().innerText().catch(() => ''))?.trim() || undefined;
          if (/cread[ao]/i.test(b)) createdText = (await it.locator('.contactCardResponsible span').nth(1).innerText().catch(() => ''))?.trim() || undefined;
        }
      }

      const createdAtEgo = createdText ? parseSpanishDate(createdText) : null;
      const record: EgoContact = { personId, name, role, phone, email, createdText, createdAtEgo, responsible };
      // Log inmediato de los datos extraídos
      console.log(
        `   • ${record.name || '(sin nombre)'} | tel: ${record.phone || '-'} | email: ${record.email || '-'} | creada: ${record.createdText || '-'} | responsable: ${record.responsible || '-'} | role: ${record.role || '-'} | personId: ${record.personId || '-'}`
      );
      results.push(record);
    } catch {}
  }
  return results;
}

async function goToContactsPage(page: Page, num: number): Promise<boolean> {
  // Uses the paginator anchors that call Search.loadPage. We click the anchor with the number.
  const sel = '.paginationPages a';
  await page.waitForSelector(sel, { timeout: 15000 }).catch(() => {});
  const count = await page.locator(sel).count();
  for (let i = 0; i < count; i++) {
    const a = page.locator(sel).nth(i);
    const txt = (await a.innerText().catch(() => '')).trim();
    if (txt === String(num)) {
      try { await a.click({ force: true }); } catch {}
      // Wait for active to move
      const changed = await page
        .waitForFunction((n) => {
          const act = document.querySelector('.paginationPages a.active');
          return act && act.textContent?.trim() === String(n);
        }, num, { timeout: 30000 })
        .then(() => true)
        .catch(() => false);
      if (!changed) {
        // Fallback: cambia el primer nombre de la lista
        const before = await page.locator('.listItem.contactItem .ListItemTitle a').first().innerText().catch(() => '');
        try {
          await page.waitForFunction((prev) => {
            const t = document.querySelector('.listItem.contactItem .ListItemTitle a');
            return (t?.textContent || '') !== (prev || '');
          }, before, { timeout: 8000 });
        } catch {}
        const actTxt = await page.locator('.paginationPages a.active').first().innerText().catch(() => '');
        if (String(actTxt).trim() === String(num)) return true;
      }
      return changed;
    }
  }
  // fallback: try calling Search.loadPage directly if available
  await page.evaluate((n) => {
    // @ts-ignore
    if (window.Search && typeof window.Search.loadPage === 'function') {
      // Best-effort: hardcoded endpoint observed in paginator
      // @ts-ignore
      window.Search.loadPage(null, '/egocore/search/entitysearch', String(n));
    }
  }, num).catch(() => {});
  const changed = await page
    .waitForFunction((n) => {
      const act = document.querySelector('.paginationPages a.active');
      return act && act.textContent?.trim() === String(n);
    }, num, { timeout: 30000 })
    .then(() => true)
    .catch(() => false);
  if (!changed) {
    try { await page.reload({ waitUntil: 'domcontentloaded' }); } catch {}
    try {
      const actTxt = await page.locator('.paginationPages a.active').first().innerText();
      return String(actTxt).trim() === String(num);
    } catch { return false; }
  }
  return changed;
}

export async function scrapeEgoContactsToDb() {
  const EGO_USER = process.env.EGO_USER || '';
  const EGO_PASS = process.env.EGO_PASS || '';
  if (!EGO_USER || !EGO_PASS) {
    console.error('❌ Faltan credenciales EGO_USER / EGO_PASS en el entorno.');
    process.exit(1);
  }

  console.log('→ Abriendo Chromium…');
  // Headless por defecto; usa EGO_HEADLESS=false para visualizar
  const envHeadless = String(process.env.EGO_HEADLESS ?? 'true').toLowerCase() === 'true';
  const browser = await chromium.launch({ headless: envHeadless, slowMo: envHeadless ? 0 : 50 });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  try {
    console.log('→ Login en EgoRealEstate…');
    await page.goto('https://admin.egorealestate.com/', { waitUntil: 'domcontentloaded' });
    await page.fill('input[name="username"]', EGO_USER);
    await page.fill('input[name="password"]', EGO_PASS);
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle', timeout: 60000 }).catch(() => {}),
      page.keyboard.press('Enter'),
    ]);

    console.log('→ Navegando a contactos…');
    await page.goto('https://admin.egorealestate.com/egocore/contacts', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.listItem.contactItem', { timeout: 60000 });

    // Detect total pages
    let totalPages = 1;
    try {
      const texts = await page.locator('.paginationPages a').allInnerTexts();
      const nums = texts.map((t) => parseInt(t.trim(), 10)).filter((n) => Number.isFinite(n));
      if (nums.length) totalPages = Math.max(...nums);
    } catch {}

    console.log(`→ Páginas detectadas: ${totalPages}`);

    // Validar que el modelo EgoContact exista en Prisma Client
    const ego = (prisma as any).egoContact;
    if (!ego || typeof ego.upsert !== 'function') {
      throw new Error('Prisma Client no tiene el modelo EgoContact. Ejecuta: yarn prisma:generate && yarn db:push (y en Turso: yarn db:sql && yarn db:deploy:turso).');
    }

    let totalCreated = 0;
    for (let current = 1; current <= totalPages; current++) {
      if (current > 1) {
        const moved = await goToContactsPage(page, current);
        if (!moved) { console.warn(`   ! No pude avanzar a la página ${current}`); }
      }
      console.log(`\n📇 Página ${current}/${totalPages}`);
      const contacts = await processContactsList(page);
      console.log(`→ Contactos en página: ${contacts.length}`);

      for (const c of contacts) {
        const where = c.personId
          ? { personId: c.personId }
          : (c.email ? { email: c.email } : undefined);
        // If we have neither personId nor email, skip to avoid duplicates
        if (!where) continue;
        const data: any = {
          personId: c.personId || null,
          name: c.name || null,
          role: c.role || null,
          phone: c.phone || null,
          email: c.email || null,
          createdText: c.createdText || null,
          createdAtEgo: c.createdAtEgo || null,
          responsible: c.responsible || null,
        };
        const payload = { ...data, rawJson: JSON.stringify(c) };
        if (where.personId) {
          const existingByPerson = await ego.findFirst({ where: { personId: where.personId as string } });
          if (existingByPerson) { console.log(`   ⏭️  Skip (ya existe): personId=${where.personId}`); continue; }
          await ego.create({ data: payload });
        } else {
          const existing = await ego.findFirst({ where: { email: where.email as string } });
          if (existing) { console.log(`   ⏭️  Skip (ya existe email): ${where.email}`); continue; }
          await ego.create({ data: payload });
        }
        totalCreated += 1;
      }
    }

    console.log(`\n===== EGO CONTACTS RESUMEN =====`);
    console.log(`Nuevos creados: ${totalCreated}`);
  } catch (err: any) {
    console.error('❌ Error scraping contactos:', err?.message || err);
    process.exitCode = 1;
  } finally {
    try { await page.close(); } catch {}
    try { await context.close(); } catch {}
    try { await browser.close(); } catch {}
    try { await prisma.$disconnect(); } catch {}
  }
}

// CLI
const __isDirect = (() => {
  try {
    // @ts-ignore
    const url = (import.meta && (import.meta as any).url) as string | undefined;
    if (!url) return false;
    const argv1 = process.argv[1] || '';
    return url.endsWith(argv1) || url.endsWith(path.resolve(argv1));
  } catch { return false; }
})();

if (__isDirect) {
  scrapeEgoContactsToDb().catch((e) => { console.error(e); process.exit(1); });
}
