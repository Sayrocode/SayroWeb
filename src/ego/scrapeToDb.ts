import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { chromium, Page, Locator } from 'playwright';
import { prisma } from '../lib/prisma';
import { toNumber, normalizeType } from './normalize';
import {
  POPUP_SEL,
  PHOTO_ANCHOR_SEL,
  LIST_CONTAINER_SEL,
} from './config';

// Also load .env.local like our Prisma seed does (handy in Next.js projects)
(() => {
  try {
    const envLocal = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(envLocal)) {
      const dotenv = require('dotenv');
      dotenv.config({ path: envLocal });
    }
  } catch {}
})();

type ScrapedProperty = {
  sourceId?: string;
  code?: string;
  title: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  propertyType?: string;
  status?: 'available' | 'retired' | 'sold' | 'unknown';
  bedrooms?: number;
  bathrooms?: number;
  parking_spaces?: number;
  construction_size?: number;
  lot_size?: number;
  priceSale?: number;
  currencySale?: string;
  priceRent?: number;
  currencyRent?: string;
  images: string[];
  detailHref?: string;
  page: number;
  indexOnPage: number;
};

function parseM2(x?: string | number | null): number | undefined {
  if (!x) return undefined;
  return toNumber(String(x).replace(/m²|m2/gi, ''));
}

function activePopup(page: Page) {
  return page.locator(`${POPUP_SEL}:visible`).last();
}

async function ensurePopupVisible(page: Page): Promise<boolean> {
  try {
    await page.locator(POPUP_SEL).waitFor({ state: 'visible', timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

async function tryClosePopup(page: Page): Promise<void> {
  const popup = page.locator(POPUP_SEL);
  try {
    const btn = popup.locator('.popupCloseBtn').first();
    if (await btn.count()) await btn.click({ force: true });
  } catch {}
  try { await popup.waitFor({ state: 'detached', timeout: 12000 }); } catch {}
  for (let k = 0; k < 2; k++) {
    try {
      await page.keyboard.press('Escape');
      await popup.waitFor({ state: 'detached', timeout: 3000 });
      return;
    } catch {}
  }
  try {
    await page.evaluate((sel: string) => {
      const m = document.querySelector(sel);
      if (m && m.parentElement) m.parentElement.removeChild(m);
    }, POPUP_SEL);
  } catch {}
}

async function callInlineOnclick(a: Locator) {
  await a.evaluate((el: HTMLElement) => {
    const ev = new MouseEvent('click', { bubbles: true, cancelable: true, view: window });
    const handler = (el as any).onclick;
    if (typeof handler === 'function') handler.call(el, ev);
  });
}

async function invokeSlideshowProgrammatically(a: Locator): Promise<boolean> {
  const onclick = (await a.getAttribute('onclick')) || '';
  const url = onclick.match(/,\s*'([^']*openpopupslideshow[^']*)'/)?.[1] || '/egocore/realestate/openpopupslideshow';
  const qsMatch = onclick.match(/,\s*'objIDs=([^']+)'/);
  const qs = qsMatch ? `objIDs=${qsMatch[1]}` : '';
  if (!qs) return false;
  await a.evaluate((el: HTMLElement, args: { url: string; qs: string }) => {
    try {
      (window as any).Slideshow?.popupSlideshow?.(
        el,
        args.url,
        args.qs,
        (window as any).Associated?.Lead?.Presentation?.saveOnSlideshowClose
      );
    } catch {}
  }, { url, qs });
  return true;
}

async function openPopupFromPhotoAnchor(page: Page, a: Locator): Promise<boolean> {
  if (await page.locator(POPUP_SEL).count()) await tryClosePopup(page);
  try { await callInlineOnclick(a); if (await ensurePopupVisible(page)) return true; } catch {}
  try { if (await invokeSlideshowProgrammatically(a)) { if (await ensurePopupVisible(page)) return true; } } catch {}
  try { await a.dispatchEvent('click', { bubbles: true, cancelable: true }); if (await ensurePopupVisible(page)) return true; } catch {}
  try { await a.click({ force: true }); if (await ensurePopupVisible(page)) return true; } catch {}
  return false;
}

function parseAddressFromTitle(titleFull: string): {
  titleBase: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  propertyType?: string;
} {
  // Format often: "Tipo - Loc, Ciudad, Estado CODE"
  const codeMatch = titleFull.match(/\s([A-Z]{3,}_\d+)\s*$/);
  const withoutCode = codeMatch ? titleFull.replace(codeMatch[0], '').trim() : titleFull.trim();

  const [maybeType, rest] = (() => {
    const idx = withoutCode.indexOf(' - ');
    if (idx >= 0) return [withoutCode.slice(0, idx).trim(), withoutCode.slice(idx + 3).trim()];
    return [withoutCode, ''];
  })();

  let neighborhood: string | undefined;
  let city: string | undefined;
  let state: string | undefined;
  if (rest) {
    const parts = rest.split(',').map((p) => p.trim()).filter(Boolean);
    neighborhood = parts[0];
    city = parts[1];
    state = parts[2];
  }
  return { titleBase: withoutCode, neighborhood, city, state, propertyType: maybeType };
}

function pickCurrency(text: string): 'USD' | 'MXN' | string | undefined {
  if (/USD/i.test(text)) return 'USD';
  if (/US\$/i.test(text)) return 'USD';
  if (/MXN/i.test(text)) return 'MXN';
  if (/\b\$/i.test(text)) return 'MXN';
  return undefined;
}

function splitOnce(s: string, sep: string) {
  const idx = s.indexOf(sep);
  if (idx < 0) return [s.trim()];
  return [s.slice(0, idx).trim(), s.slice(idx + sep.length).trim()];
}

function parseLocParts(s: string) {
  const parts = s.split(',').map((p) => p.trim()).filter(Boolean);
  return { neighborhood: parts[0], city: parts[1], state: parts[2] };
}

function pickCurrencyAround(text: string): 'USD' | 'MXN' | string | undefined {
  if (/USD/i.test(text)) return 'USD';
  if (/US\$/i.test(text)) return 'USD';
  if (/MXN/i.test(text)) return 'MXN';
  if (/\b\$/i.test(text)) return 'MXN';
  return undefined;
}

function detectCurrency(...parts: (string | undefined)[]): 'USD' | 'MXN' | undefined {
  const s = parts.filter(Boolean).join(' ').toUpperCase();
  if (/US\$|USD/.test(s)) return 'USD';
  if (/MX\$|MXN|\bMX\b/.test(s)) return 'MXN';
  if (/\$/.test(s)) return 'MXN';
  return undefined;
}

async function scrapeDetailForAddress(page: Page, detailUrl?: string) {
  if (!detailUrl) return {} as any;
  const ctx = page.context();
  const p = await ctx.newPage();
  try {
    const url = detailUrl.startsWith('http') ? detailUrl : new URL(detailUrl, page.url()).toString();
    await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
    const ld = (await p.evaluate(() => {
      const blocks = Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
        .map((s) => s.textContent || '')
        .filter(Boolean);
      const out: any[] = [];
      for (const txt of blocks) {
        try {
          const parsed = JSON.parse(txt);
          if (Array.isArray(parsed)) out.push(...parsed);
          else out.push(parsed);
        } catch {}
      }
      return out;
    }).catch(() => []) ) as any[];

    let addr: any | undefined;
    let geo: any | undefined;
    for (const node of ld) {
      const cand = (node as any)?.address || (node as any)?.location?.address || (node as any)?.offers?.seller?.address;
      const g = (node as any)?.geo || (node as any)?.location?.geo;
      if (!addr && cand && typeof cand === 'object') addr = cand;
      if (!geo && g && typeof g === 'object') geo = g;
      if (addr && geo) break;
    }

    const metas = await p.evaluate(() => {
      const get = (n: string) =>
        document.querySelector(`meta[name="${n}"]`)?.getAttribute('content') ||
        document.querySelector(`meta[property="${n}"]`)?.getAttribute('content') || '';
      return {
        lat: get('og:latitude') || get('place:location:latitude'),
        lon: get('og:longitude') || get('place:location:longitude'),
        locality: get('addressLocality'),
        region: get('addressRegion'),
        country: get('addressCountry'),
        postalCode: get('postalCode'),
      };
    });

    const fullText = (await p.evaluate(() => (document.body?.innerText || '').trim()).catch(() => '')) || '';

    const detailDescription = await p.evaluate(() => {
      const pick = (sel: string) => document.querySelector(sel)?.textContent?.trim() || '';
      const sels = [
        '.realestateDescription', '.RealestateDescription', '.description', '.property-description',
        '#description', '.tab-description', '.ItemDescription', '.content-description',
      ];
      for (const s of sels) { const t = pick(s); if (t) return t; }
      const box = document.querySelector('.rightColumn') || document.querySelector('.contentRight') || document.querySelector('main');
      if (box) {
        const paras = Array.from(box.querySelectorAll('p')).map((pp) => pp.textContent?.trim() || '').filter(Boolean);
        if (paras.length) return paras.join('\n');
      }
      return '';
    }).catch(() => '');

    let lat: number | undefined;
    let lon: number | undefined;
    const latStr = (geo?.latitude ?? (metas as any).lat ?? '').toString();
    const lonStr = (geo?.longitude ?? (metas as any).lon ?? '').toString();
    const latN = parseFloat(latStr);
    const lonN = parseFloat(lonStr);
    if (Number.isFinite(latN) && Number.isFinite(lonN)) { lat = latN; lon = lonN; }
    if (lat == null || lon == null) {
      const m = fullText.match(/@(-?\d+\.\d+),\s*(-?\d+\.\d+)/) || fullText.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
      if (m) { lat = parseFloat(m[1]); lon = parseFloat(m[2]); }
    }

    const country = (addr?.addressCountry || (metas as any).country || '').toString().trim() || undefined;
    const state = (addr?.addressRegion || (metas as any).region || '').toString().trim() || undefined;
    const city = (addr?.addressLocality || (metas as any).locality || '').toString().trim() || undefined;
    const postal_code = (addr?.postalCode || (metas as any).postalCode || '').toString().trim() || (fullText.match(/\b(?:C\.P\.|CP|C\s*P)\s*[:\-]?\s*(\d{5})\b/i)?.[1]);
    let street = (addr?.streetAddress || '').toString().trim() || undefined;
    if (!street) {
      const line = (fullText.split('\n').find((l) => /\b(calle|av(?:enida)?|blvd\.?|boulevard|prol\.?|andador|privada|priv\.|camino|carretera)\b/i.test(l)) || '').trim();
      if (line) street = line;
    }
    let neighborhood: string | undefined;
    if (!neighborhood && city && state) {
      const idxCity = fullText.toLowerCase().indexOf(city.toLowerCase());
      const idxState = fullText.toLowerCase().indexOf(state.toLowerCase());
      if (idxCity > 0) {
        const before = fullText.slice(Math.max(0, idxCity - 120), idxCity).split('\n').pop() || '';
        const prev = before.split(',').map((s) => s.trim()).filter(Boolean).pop();
        if (prev && prev.length < 60) neighborhood = prev;
      }
      if (!neighborhood && idxState > 0) {
        const before = fullText.slice(Math.max(0, idxState - 120), idxState).split('\n').pop() || '';
        const prev = before.split(',').map((s) => s.trim()).filter(Boolean).pop();
        if (prev && prev.length < 60) neighborhood = prev;
      }
    }

    const address: any = { street, neighborhood, city, state, country, postal_code: postal_code || undefined, latitude: lat, longitude: lon };
    for (const k of Object.keys(address)) if (address[k] == null || address[k] === '') delete address[k];
    return { address, description: detailDescription } as any;
  } catch {
    return {} as any;
  } finally {
    try { await p.close(); } catch {}
  }
}

async function scrapeFromPopup(page: Page, pageNum: number, idx: number): Promise<ScrapedProperty | null> {
  const popup = activePopup(page);
  try { await popup.waitFor({ state: 'visible', timeout: 8000 }); } catch { return null; }

  const aDetail = popup.locator('.popupHeaderTitle .ListItemTitle a[href*="/egocore/realestate/"]').first();
  const titleFull = await aDetail.innerText().catch(() => '');
  const detailHref = await aDetail.getAttribute('href').catch(() => '');
  const id = detailHref?.match(/\/egocore\/realestate\/(\d+)/)?.[1];

  const imagesObjs = await popup.evaluate(() => {
    const imgs = Array.from(document.querySelectorAll<HTMLImageElement>('.swiper-wrapper img'));
    return imgs.map((img) => ({
      regular: img.getAttribute('data-regular-src') || img.getAttribute('data-src') || img.getAttribute('src'),
      fullscreen: img.getAttribute('data-fullscreen-src'),
      alt: img.getAttribute('alt') || undefined,
    }));
  });
  const chosenUrls = imagesObjs.map((im: any) => im.fullscreen || im.regular).filter((u: any): u is string => !!u);
  const label = id || (titleFull || 'propiedad').trim();
  console.log(`\n📸 Imágenes encontradas para ${label}: ${chosenUrls.length}`);
  chosenUrls.forEach((u, i) => console.log(`   [${i + 1}] ${u}`));

  let title = titleFull;
  let code: string | undefined;
  const codeMatch = titleFull?.match(/\s([A-Z]{3,}_\d+)\s*$/);
  if (codeMatch) { code = codeMatch[1]; title = titleFull.replace(codeMatch[0], '').trim(); }

  let propertyType: string | undefined;
  let neighborhood: string | undefined;
  let city: string | undefined;
  let state: string | undefined;
  if (title) {
    const parts = splitOnce(title, ' - ');
    const maybeType = parts[0];
    const rest = parts[1];
    if (rest) { propertyType = maybeType; const loc = parseLocParts(rest); neighborhood = loc.neighborhood; city = loc.city; state = loc.state; }
    else { propertyType = maybeType; }
  }

  if (!neighborhood || !city || !state) {
    try {
      const headerBlock = await popup.evaluate((root: HTMLElement) => {
        const header = root.querySelector('.popupHeaderTitle') as HTMLElement | null;
        const txt = header?.innerText || '';
        return txt.split('\n').map((l) => l.trim()).filter(Boolean);
      });
      const locLine = (headerBlock as any)?.find((l: string) => /,/.test(l)) || '';
      if (locLine) { const loc = parseLocParts(locLine); neighborhood = neighborhood || loc.neighborhood; city = city || loc.city; state = state || loc.state; }
    } catch {}
  }

  const popupText = (await popup.innerText().catch(() => '')) || '';

  // Try structured pricing first: <span class="listItemPricingSection">Venta <strong><span>MX$6,000,000</span></strong></span>
  const pricing = await popup.evaluate((root: HTMLElement) => {
    const items: { label: string; value: string }[] = [];
    root.querySelectorAll<HTMLElement>('.listItemPricingSection').forEach((el) => {
      const label = (el.childNodes[0]?.textContent || el.textContent || '').trim();
      const valEl = el.querySelector('strong span, strong, span');
      const value = (valEl?.textContent || '').trim();
      if (label || value) items.push({ label, value });
    });
    return items;
  }).catch(() => [] as { label: string; value: string }[]);

  function parseFullAddress(text: string) {
    const out: any = {};
    const dirLine = text.match(/(?:^|\n)\s*(?:direcci[óo]n|dir\.)\s*[:\-]?\s*(.+)$/im);
    const base = (dirLine?.[1] || text).split('\n').map((l) => l.trim()).find((l) => /\b(calle|av(?:enida)?|blvd\.?|boulevard|prol\.?|andador|privada|priv\.|camino|carretera)\b/i.test(l)) || '';
    const line = base || dirLine?.[1] || '';
    if (line) {
      const mStreet = line.match(/\b(calle|av(?:enida)?|blvd\.?|boulevard|prol\.?|andador|privada|priv\.|camino|carretera)\b\s*([^#,\n]+)/i);
      if (mStreet) out.street = `${mStreet[1]} ${mStreet[2]}`.replace(/\s+/g, ' ').trim();
      const mExt = line.match(/(?:#|\bN[oº°]?\.?|\bNum\.?\b|\bNo\.?\b)\s*(\w[\w\-\/\.]*)/i);
      if (mExt) out.exterior = mExt[1]?.trim();
      const mInt = line.match(/(?:\bint\.?|\binterior\b|\bdepto\.?\b)\s*(\w[\w\-\/\.]*)/i);
      if (mInt) out.interior = mInt[1]?.trim();
    }
    const mCross = text.match(/(?:entre\s+calles?|esquina\s+con)\s*[:\-]?\s*([^\n,]+)/i);
    if (mCross) out.cross_street = mCross[1]?.trim();
    return out;
  }

  let description = await popup.evaluate((root: HTMLElement) => {
    const getText = (el: HTMLElement | null): string => {
      if (!el) return '';
      const html = el.innerHTML.replace(/<\s*br\s*\/\?\s*>/gi, '\n').replace(/<\/(p|div|li|h[1-6])\s*>/gi, '\n');
      const tmp = document.createElement('div');
      tmp.innerHTML = html;
      const txt = (tmp.textContent || '').replace(/\u00A0/g, ' ').replace(/\s+\n/g, '\n').replace(/\n\s+/g, '\n');
      return txt.trim();
    };
    const elOr = (sel: string) => root.querySelector(sel) as HTMLElement | null;
    const selectors = [
      '.listItemDescription', '.ListItemDescription', '.popupDescription', '.realestateDescription', '.RealestateDescription',
      '.ListItemShortDescription', '.popupRight .description', '.popupRight .text', '.description', '.ItemDescription',
    ];
    for (const sel of selectors) { const el = elOr(sel); const t = getText(el); if (t) return t; }
    const right = (root.querySelector('.popupRight') || root.querySelector('.PopupMediaSlideshow')) as HTMLElement | null;
    if (right) {
      const txt = Array.from(right.querySelectorAll('p')).map((p) => (p.textContent || '').trim()).filter(Boolean).join('\n');
      if (txt) return txt;
    }
    return '';
  }).catch(() => '') || '';

  let listStreet: string | undefined;
  let listYearBuilt: string | undefined;
  let listState: string | undefined;

  const rawFeatures: string[] = (await popup.evaluate((root: HTMLElement) => {
    const texts = new Set<string>();
    const lists = root.querySelectorAll('ul, .features, .propertyFeatures, .listFeatures');
    lists.forEach((ul) => { ul.querySelectorAll('li').forEach((li) => { const t = (li.textContent || '').trim(); if (t && t.length <= 80) texts.add(t); }); });
    return Array.from(texts);
  }).catch(() => []) ) || [];

  const popupListData: Record<string, string> = (await popup.evaluate((root: HTMLElement) => {
    const data: Record<string, string> = {};
    const sections = root.querySelectorAll('.listItemData .listItemDataSection');
    sections.forEach((el) => {
      const strong = el.querySelector('strong');
      const val = (strong?.textContent || strong?.innerHTML || '').replace(/<[^>]*>/g, '').trim();
      let label = '';
      el.childNodes.forEach((n) => { if (n === strong) return; const t = (n.textContent || '').trim(); if (t) label += (label ? ' ' : '') + t; });
      label = label.replace(/[:\-]+\s*$/, '').trim();
      if (label && val) data[label] = val;
    });
    return data;
  }).catch(() => ({}))) as Record<string, string>;

  const norm = (s?: string) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const findVal = (...alts: string[]) => {
    const keys = Object.keys(popupListData);
    for (const k of keys) { const nk = norm(k); for (const a of alts) { if (nk.includes(norm(a))) return popupListData[k]; } }
    return undefined;
  };

  listStreet = findVal('Dirección', 'Direccion');
  listYearBuilt = findVal('Año de construcción', 'Ano de construccion', 'Año construccion');
  listState = findVal('Estado');
  const listPostal = findVal('Código postal', 'Codigo postal', 'C.P', 'CP');
  const listCity = findVal('Ciudad', 'Localidad');
  const listNeighborhood = findVal('Colonia', 'Barrio', 'Zona');
  const listExterior = findVal('Número exterior', 'Numero exterior', 'No. exterior');
  const listInterior = findVal('Número interior', 'Numero interior', 'No. interior');
  const listCross = findVal('Entre calles');
  const listLat = toNumber(findVal('Latitud'));
  const listLon = toNumber(findVal('Longitud'));

  function pickIntFromFeatures(re: RegExp): number | undefined {
    for (const f of rawFeatures) { const m = f.match(re); if (m) return toNumber(m[2] || (m as any)[1] || (m as any)[0]); }
    return undefined;
  }
  function pickInt(re: RegExp): number | undefined { const m = popupText.match(re); if (!m) return undefined; return toNumber((m as any)[1] || (m as any)[2] || (m as any)[0]); }

  let bedrooms = pickInt(/(?:rec[aá]mara|habitaci[óo]n|alcoba|dormitorio|cuartos?)s?\s*[:\-]?\s*(\d+)/i) ?? pickIntFromFeatures(/(?:rec[aá]mara|habitaci[óo]n|alcoba|dormitorio|cuartos?)\D*(\d+)/i) ?? toNumber(findVal('Habitaciones'));
  let bathrooms = pickInt(/bañ[oa]s?\s*[:\-]?\s*(\d+)/i) ?? pickIntFromFeatures(/bañ[oa]s?\D*(\d+)/i) ?? toNumber(findVal('Baños') || findVal('Banos'));
  let half_bathrooms = pickInt(/(?:(?:1\/2|medio)s?\s*bañ[oa]s?|medios?\s*bañ[oa]s?)\s*[:\-]?\s*(\d+)/i) ?? pickIntFromFeatures(/(?:(?:1\/2|medio)s?\s*bañ[oa]s?|medios?\s*bañ[oa]s?)\D*(\d+)/i) ?? toNumber(findVal('Medios Baños', 'Medio Baño', '1/2 Baños'));
  let floors = pickInt(/(?:niveles|plantas|pisos)\s*[:\-]?\s*(\d+)/i) ?? pickIntFromFeatures(/(?:niveles|plantas|pisos)\D*(\d+)/i) ?? toNumber(findVal('Niveles', 'Plantas', 'Pisos'));
  let parking_spaces = pickInt(/(?:estacionamientos?|cocheras?|cajones?|autos?|veh[íi]culos?|aparcamiento|parqueaderos?)\s*[:\-]?\s*(\d+)/i) ?? pickIntFromFeatures(/(?:estacionamientos?|cocheras?|cajones?|autos?|veh[íi]culos?|aparcamiento|parqueaderos?)\D*(\d+)/i);
  if (parking_spaces == null) { const estVal = findVal('Estacionamiento', 'cochera', 'aparcamiento'); if (estVal) { const nv = toNumber(estVal); if (nv != null) parking_spaces = nv; else if (/si|sí|yes/i.test(estVal)) parking_spaces = 1; else if (/no/i.test(estVal)) parking_spaces = 0; } }

  const construction_size = (() => {
    const fromList = findVal('Superficie construida', 'Superficie útil', 'Sup. construida', 'Construcción');
    if (fromList) return parseM2(fromList) ?? toNumber(fromList);
    const m = popupText.match(/(?:m\s*[²2]|m2)\s*(?:construcci[óo]n|construida|const\.|sup\.?\s*construcci[óo]n|superficie\s*(?:de\s*)?construcci[óo]n)[^\d]*([\d.,]+)/i) ||
              popupText.match(/(?:construcci[óo]n|superficie\s*(?:de\s*)?construcci[óo]n)[^\d]*([\d.,]+)\s*(?:m\s*[²2]|m2)/i) ||
              popupText.match(/superficie\s*[úu]til[^\d]*([\d.,]+)\s*(?:m\s*[²2]|m2)/i);
    return m ? parseM2((m as any)[1]) ?? toNumber((m as any)[1]) : undefined;
  })();
  const lot_size = (() => {
    const fromList = findVal('Superfície de Terreno', 'Superficie de Terreno', 'Terreno');
    if (fromList) return parseM2(fromList) ?? toNumber(fromList);
    const m = popupText.match(/(?:m\s*[²2]|m2)\s*(?:terreno|lote|parcel[a]?|superficie\s*(?:de\s*)?terreno)[^\d]*([\d.,]+)/i) ||
              popupText.match(/(?:terreno|lote|parcel[a]?|superficie\s*(?:de\s*)?terreno)[^\d]*([\d.,]+)\s*(?:m\s*[²2]|m2)/i);
    return m ? parseM2((m as any)[1]) ?? toNumber((m as any)[1]) : undefined;
  })();

  let priceSale: number | undefined;
  let currencySale: string | undefined;
  let priceRent: number | undefined;
  let currencyRent: string | undefined;

  // Structured DOM first
  for (const it of pricing) {
    const label = it.label.toLowerCase();
    const num = toNumber(it.value);
    if (num != null) {
      if (/venta/.test(label)) {
        priceSale = priceSale ?? num;
        currencySale = currencySale ?? detectCurrency(it.value, it.label) ?? pickCurrencyAround(popupText);
      } else if (/renta/.test(label)) {
        priceRent = priceRent ?? num;
        currencyRent = currencyRent ?? detectCurrency(it.value, it.label) ?? pickCurrencyAround(popupText);
      }
    }
  }

  // Fallback to text regex
  if (priceSale == null) {
    const mSale = popupText.match(/venta[^\d]*\$?\s*([\d.,]+)\s*(USD|MXN)?/i);
    if (mSale) { priceSale = toNumber((mSale as any)[1]); currencySale = ((mSale as any)[2] || pickCurrencyAround(popupText)) as any; }
  }
  if (priceRent == null) {
    const mRent = popupText.match(/renta[^\d]*\$?\s*([\d.,]+)\s*(USD|MXN)?/i);
    if (mRent) { priceRent = toNumber((mRent as any)[1]); currencyRent = ((mRent as any)[2] || pickCurrencyAround(popupText)) as any; }
  }

  if (priceSale != null) console.log(`   · Venta: ${currencySale || 'MXN'} ${priceSale.toLocaleString('en-US')}`);
  if (priceRent != null) console.log(`   · Renta: ${currencyRent || 'MXN'} ${priceRent.toLocaleString('en-US')}`);

  const features = rawFeatures.length ? rawFeatures : undefined;

  if (!propertyType) {
    const types = ['Casa', 'Departamento', 'Oficina', 'Bodega', 'Terreno', 'Local', 'Edificio', 'Villa', 'Penthouse'];
    const match = types.find((t) => new RegExp(`\\b${t}\\b`, 'i').test(popupText) || rawFeatures.some((f) => new RegExp(`\\b${t}\\b`, 'i').test(f)));
    if (match) propertyType = match;
  }

  const extra = (await popup.evaluate((root: HTMLElement) => {
    const text = (root.innerText || '').trim();
    const videos = Array.from(root.querySelectorAll<HTMLAnchorElement>('a[href]')).map((a) => a.getAttribute('href') || '').filter((h) => /youtu\.be|youtube\.com|vimeo\.com/i.test(h)).filter(Boolean);
    const emailsSet = new Set<string>();
    root.querySelectorAll<HTMLAnchorElement>('a[href^="mailto:"]').forEach((a) => { const e = (a.getAttribute('href') || '').replace(/^mailto:/i, '').trim(); if (e) emailsSet.add(e); });
    const rxEmail = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi; (text.match(rxEmail) || []).forEach((e) => emailsSet.add(e));
    const tagsSet = new Set<string>();
    root.querySelectorAll<HTMLElement>('.tags li, .tags .tag, .labels .label, .tag, .chip').forEach((el) => { const t = (el.innerText || '').trim(); if (t && t.length <= 40) tagsSet.add(t); });
    let latitude: number | undefined; let longitude: number | undefined;
    const withData = root.querySelector('[data-latitude][data-longitude]') as HTMLElement | null;
    if (withData) { const la = parseFloat(withData.getAttribute('data-latitude') || ''); const lo = parseFloat(withData.getAttribute('data-longitude') || ''); if (Number.isFinite(la) && Number.isFinite(lo)) { latitude = la; longitude = lo; } }
    if (latitude == null || longitude == null) { const iframe = root.querySelector<HTMLIFrameElement>('iframe[src*="maps"]'); const src = iframe?.getAttribute('src') || ''; const m = src.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) || src.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/); if (m) { latitude = parseFloat(m[1]); longitude = parseFloat(m[2]); } }
    let postal = ''; const mcp = text.match(/(?:c(?:[óo])digo\s*postal|\bcp\b|c\.p\.)\s*[:\-]?\s*(\d{5})/i); if (mcp) postal = mcp[1];
    let maintenanceStr = ''; const mm = text.match(/mantenim(?:iento)?[^\d]*\$?\s*([\d.,]+)/i); if (mm) maintenanceStr = mm[1];
    let ageStr = ''; const mage = text.match(/antig[üu]edad\s*[:\-]?\s*(\d{1,3})/i); if (mage) ageStr = mage[1];
    let yearBuiltStr = ''; const myb = text.match(/a[ñn]o\s+de\s+construcci[óo]n\s*[:\-]?\s*(\d{4})/i); if (myb) yearBuiltStr = myb[1];
    let shareCommissionFlag: boolean | undefined; let shareNotes = '';
    const mshare = text.match(/compartir\s+comisi[óo]n\s*[:\-]?\s*(s[ií]|no)/i); if (mshare) shareCommissionFlag = /s[ií]/i.test(mshare[1]);
    const mnotes = text.match(/condiciones\s+para\s+compartir\s*[:\-]?\s*(.+)$/im); if (mnotes) shareNotes = (mnotes[1] || '').trim();
    return { text, videos, emails: Array.from(emailsSet), tags: Array.from(tagsSet), latitude, longitude, postal, maintenanceStr, ageStr, yearBuiltStr, shareCommissionFlag, shareNotes };
  }).catch(() => ({ videos: [], emails: [], tags: [], postal: '', latitude: undefined as number | undefined, longitude: undefined as number | undefined }))) as any;

  const detailedAddr = parseFullAddress(popupText);

  const result: any = {
    id,
    title,
    code,
    images: imagesObjs,
    propertyType,
    description: description || undefined,
    construction_size,
    lot_size,
    bedrooms,
    bathrooms,
    half_bathrooms,
    floors,
    parking_spaces,
    priceSale,
    currencySale,
    priceRent,
    currencyRent,
    features,
    address: {
      neighborhood: listNeighborhood || neighborhood,
      city: listCity || city,
      state: listState || state,
      postal_code: listPostal || extra?.postal || undefined,
      country: /mex/i.test(popupText) ? 'MX' : undefined,
      latitude: (typeof listLat === 'number' ? listLat : undefined) ?? (typeof extra?.latitude === 'number' ? extra.latitude : undefined),
      longitude: (typeof listLon === 'number' ? listLon : undefined) ?? (typeof extra?.longitude === 'number' ? extra.longitude : undefined),
      street: listStreet || detailedAddr.street || undefined,
      exterior: listExterior || detailedAddr.exterior || undefined,
      interior: listInterior || detailedAddr.interior || undefined,
      cross_street: listCross || detailedAddr.cross_street || undefined,
    },
    tags: (extra?.tags && extra.tags.length ? extra.tags : undefined),
    videos: (extra?.videos && extra.videos.length ? extra.videos : undefined),
    maintenance: extra?.maintenanceStr || undefined,
    owner_email: (extra?.emails && extra.emails[0]) || undefined,
    share_commission: typeof extra?.shareCommissionFlag === 'boolean' ? extra.shareCommissionFlag : undefined,
    shared_commission_conditions: extra?.shareNotes || undefined,
    year_built: (listYearBuilt ? parseInt(listYearBuilt, 10) : undefined) ?? (extra?.yearBuiltStr ? parseInt(extra.yearBuiltStr, 10) : undefined),
    age: extra?.ageStr ? parseInt(extra.ageStr, 10) : undefined,
    detailHref,
    page: pageNum,
    indexOnPage: idx,
  };

  const needDetail = !result?.address?.city || !result?.address?.state || !result?.address?.postal_code || result?.address?.latitude == null || result?.address?.longitude == null;
  if ((needDetail || !result.description) && detailHref) {
    try {
      const enriched = await scrapeDetailForAddress(page, detailHref);
      if (enriched?.address) { result.address = { ...(result.address || {}), ...enriched.address }; }
      if (!result.description && enriched?.description) result.description = enriched.description;
    } catch {}
  }
  if (result.address && !result.address.country && (result.address.state || result.address.city)) result.address.country = 'MX';
  if (result.year_built && (result.age == null || !Number.isFinite(result.age))) {
    const y = Number(result.year_built); const now = new Date().getFullYear(); if (y > 1900 && y <= now) result.age = now - y;
  }

  // Map to our minimal shape for DB mapping & keep full detail for ebDetailJson
  const imagesUrls: string[] = chosenUrls;
  return {
    sourceId: id,
    code,
    title: result.title,
    neighborhood: result.address?.neighborhood,
    city: result.address?.city,
    state: result.address?.state,
    propertyType: result.propertyType,
    bedrooms: result.bedrooms,
    bathrooms: result.bathrooms,
    parking_spaces: result.parking_spaces,
    construction_size: result.construction_size,
    lot_size: result.lot_size,
    priceSale: result.priceSale,
    currencySale: result.currencySale,
    priceRent: result.priceRent,
    currencyRent: result.currencyRent,
    images: imagesUrls,
    detailHref: result.detailHref,
    page: pageNum,
    indexOnPage: idx,
    __full: result,
  } as ScrapedProperty & { __full: any };
}

async function processListPage(page: Page, pageNum: number): Promise<ScrapedProperty[]> {
  const out: ScrapedProperty[] = [];
  await page.waitForSelector(PHOTO_ANCHOR_SEL, { state: 'visible', timeout: 30000 }).catch(() => {});
  const anchors = page.locator(PHOTO_ANCHOR_SEL);
  const total = await anchors.count();
  if (!total) {
    console.log('   ⚠️ No encontré anchors de slideshow en esta página.');
    return out;
  }
  console.log(`   🔎 Anchors con slideshow encontrados: ${total}`);

  for (let i = 0; i < total; i++) {
    const a = anchors.nth(i);
    // Read status from the card before opening the popup
    const statusInfo = await a.evaluate((el) => {
      const card = el.closest('.listItem.propertyItem');
      const st = card?.querySelector('.listItemStatus');
      const cls = (st?.getAttribute('class') || '').toLowerCase();
      const text = (st?.textContent || '').trim().toLowerCase();
      return { cls, text };
    }).catch(() => ({ cls: '', text: '' }));
    let status: ScrapedProperty['status'] = 'unknown';
    if (statusInfo) {
      if (statusInfo.cls.includes('available') || /dispon/i.test(statusInfo.text)) status = 'available';
      else if (statusInfo.cls.includes('sold') || /retirad/i.test(statusInfo.text)) status = 'retired';
    }
    if (status && status !== 'unknown') console.log(`   · Estado card #${i + 1}: ${status}`);
    await a.scrollIntoViewIfNeeded().catch(() => {});
    await page.waitForTimeout(120);

    const opened = await openPopupFromPhotoAnchor(page, a);
    if (!opened) {
      const href = await a.getAttribute('href');
      const onclick = await a.getAttribute('onclick');
      const haveSlide = await page.evaluate(() =>
        !!(window as any).Slideshow && typeof (window as any).Slideshow.popupSlideshow === 'function'
      );
      console.log(`   ⚠️ No se abrió popup #${i + 1} | href=${href || '-'} | onclick=${onclick ? 'sí' : 'no'} | Slideshow=${haveSlide ? 'ok' : 'NO'}`);
      continue;
    }

    const data = await scrapeFromPopup(page, pageNum, i);
    await tryClosePopup(page);
    if (data) out.push({ ...data, status });
    await page.waitForTimeout(160);
  }
  return out;
}

async function goToNextPage(page: Page): Promise<boolean> {
  const container = page.locator(LIST_CONTAINER_SEL).first();
  await container.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});

  const pag = page.locator('.listPagination.RealestateListPagination').first();
  await pag.waitFor({ state: 'attached', timeout: 10000 }).catch(() => {});

  const current = Number((await pag.getAttribute('data-current-page')) ?? '1');
  const nextBtn = pag.locator('a.paginationNext').first();
  if (!(await nextBtn.count())) return false;

  const hasOnclick = await nextBtn.evaluate((el) => !!el.getAttribute('onclick'));
  if (!hasOnclick) return false;

  const { nextUrl, nextNumber } = await nextBtn.evaluate((el) => {
    const onclick = el.getAttribute('onclick') || '';
    const m = onclick.match(/Search\.loadPage\([^,]+,\s*'([^']+)',\s*'(\d+)'/);
    return {
      nextUrl: m?.[1] || null,
      nextNumber: m?.[2] ? Number(m[2]) : NaN,
    } as any;
  });

  const expectedNext = Number.isFinite(nextNumber) ? (nextNumber as number) : current + 1;
  await nextBtn.click({ force: true });

  const changed = await page
    .waitForFunction(
      (exp) => {
        const el = document.querySelector('.listPagination.RealestateListPagination');
        const val = el?.getAttribute('data-current-page') || '';
        return Number(val) === Number(exp);
      },
      expectedNext,
      { timeout: 30000 }
    )
    .then(() => true)
    .catch(() => false);

  if (!changed && nextUrl && Number.isFinite(expectedNext)) {
    await page.evaluate(
      ({ url, num }) => {
        // @ts-ignore
        if (window.Search && typeof window.Search.loadPage === 'function') {
          // @ts-ignore
          window.Search.loadPage(null, url, String(num));
        }
      },
      { url: nextUrl, num: expectedNext }
    );
    const changed2 = await page
      .waitForFunction(
        (exp) => {
          const el = document.querySelector('.listPagination.RealestateListPagination');
          const val = el?.getAttribute('data-current-page') || '';
          return Number(val) === Number(exp);
        },
        expectedNext,
        { timeout: 30000 }
      )
      .then(() => true)
      .catch(() => false);
    if (!changed2) return false;
  } else if (!changed) {
    return false;
  }

  const after = Number((await pag.getAttribute('data-current-page')) ?? `${current}`);
  return after > current;
}

function buildLocationText(p: ScrapedProperty) {
  return [p.neighborhood, p.city, p.state].filter(Boolean).join(', ');
}

function buildOperations(p: ScrapedProperty) {
  const ops: any[] = [];
  if (p.priceSale) ops.push({ type: 'sale', amount: p.priceSale, currency: p.currencySale || 'MXN' });
  if (p.priceRent) ops.push({ type: 'rent', amount: p.priceRent, currency: p.currencyRent || 'MXN' });
  return ops;
}

// ─────────────────────────────────────────────────────────────
// EB duplicate detection (skip EGO import when already in EB)
// ─────────────────────────────────────────────────────────────
type EbIndexItem = {
  id: number;
  publicId: string;
  titleNorm: string;
  locNorm: string;
  bedrooms?: number | null;
  propertyTypeNorm?: string | null;
};

function normText(s: string | null | undefined) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9ñáéíóúü\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripCodeSuffix(title: string) {
  return title.replace(/\s+[A-Z]{3,}_\d+\s*$/, '').trim();
}

async function buildEbIndex(): Promise<EbIndexItem[]> {
  const ebList = await prisma.property.findMany({
    where: { NOT: { publicId: { startsWith: 'EGO-' } } },
    select: { id: true, publicId: true, title: true, locationText: true, bedrooms: true, propertyType: true },
  });
  return ebList.map((p) => ({
    id: p.id,
    publicId: p.publicId,
    titleNorm: normText(stripCodeSuffix(p.title || '')),
    locNorm: normText(p.locationText || ''),
    bedrooms: p.bedrooms,
    propertyTypeNorm: p.propertyType ? normText(p.propertyType) : undefined,
  }));
}

function isLikelyInEB(ego: ScrapedProperty, index: EbIndexItem[]): EbIndexItem | undefined {
  const titleNorm = normText(stripCodeSuffix(ego.title || ''));
  const locParts = [ego.neighborhood, ego.city, ego.state].filter(Boolean).join(', ');
  const locNorm = normText(locParts);
  const typeNorm = ego.propertyType ? normText(ego.propertyType) : undefined;

  // Fast exact title match
  let hit: EbIndexItem | undefined = index.find((it) => it.titleNorm === titleNorm);
  if (hit) return hit;

  // Soft match: title containment + location overlap + optional type/bedrooms consistency
  hit = index.find((it) => {
    const titleOk = it.titleNorm.includes(titleNorm) || titleNorm.includes(it.titleNorm);
    if (!titleOk) return false;
    const locOk = !locNorm || !it.locNorm ? true : (it.locNorm.includes(locNorm) || locNorm.includes(it.locNorm));
    if (!locOk) return false;
    if (typeNorm && it.propertyTypeNorm && typeNorm !== it.propertyTypeNorm) return false;
    if (ego.bedrooms != null && it.bedrooms != null && ego.bedrooms !== it.bedrooms) return false;
    return true;
  });

  return hit;
}

export async function scrapeEgoToDb() {
  const EGO_USER = process.env.EGO_USER || '';
  const EGO_PASS = process.env.EGO_PASS || '';

  if (!EGO_USER || !EGO_PASS) {
    console.error('❌ Faltan credenciales EGO_USER / EGO_PASS en el entorno.');
    process.exit(1);
  }

  console.log('→ Lanzando Chromium (headless)…');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  try {
    console.log('→ Abriendo login de EgoRealEstate…');
    await page.goto('https://admin.egorealestate.com/', { waitUntil: 'domcontentloaded' });
    await page.fill('input[name="username"]', EGO_USER);
    await page.fill('input[name="password"]', EGO_PASS);
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle', timeout: 60000 }).catch(() => {}),
      page.keyboard.press('Enter'),
    ]);

    console.log('→ Abriendo listado de propiedades…');
    await page.goto('https://admin.egorealestate.com/egocore/realestates', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.listDisplay .listPagination.RealestateListPagination', { state: 'visible', timeout: 60000 });

    let pageNum = await page
      .locator('.listDisplay .listPagination.RealestateListPagination')
      .first()
      .getAttribute('data-current-page')
      .then((v) => Number(v || '1'))
      .catch(() => 1);

    let totalCreated = 0;
    let totalItems = 0;

    console.log('→ Cargando índice de propiedades existentes en EasyBroker (DB)…');
    const ebIndex = await buildEbIndex();
    console.log(`→ Índice EB cargado: ${ebIndex.length} registros`);

    while (true) {
      console.log(`\n📚 Página ${pageNum}`);
      const props = await processListPage(page, pageNum);
      console.log(`→ Propiedades encontradas en página: ${props.length}`);
      totalItems += props.length;

      for (const p of props as (ScrapedProperty & { __full?: any })[]) {
        // Skip if this EGO property seems already synced from EasyBroker
        const ebHit = isLikelyInEB(p, ebIndex);
        if (ebHit) {
          console.log(`   ⏩ Omitida (ya en EB): "${p.title}" ≈ ${ebHit.publicId}`);
          continue;
        }

        // Decide our canonical publicId for this run
        const idBase = p.code || p.sourceId || `P${pageNum}_${p.indexOnPage}`;
        const publicId = `EGO-${idBase}`;

        // Check if the property already exists in our DB (Turso)
        // We try by publicId candidates and by JSON detail hints to be safe.
        const publicIdCandidates: string[] = [publicId];
        if (p.sourceId) publicIdCandidates.push(`EGO-${p.sourceId}`);
        if (p.code) publicIdCandidates.push(`EGO-${p.code}`);

        const existing = await prisma.property.findFirst({
          where: {
            OR: [
              { publicId: { in: publicIdCandidates } },
              ...(p.sourceId
                ? [
                    // ebDetailJson is a string, we can use substring contains
                    { ebDetailJson: { contains: `"id":"${p.sourceId}"` } },
                    { ebDetailJson: { contains: `"id":${p.sourceId}` } },
                  ]
                : []),
              ...(p.code ? [{ ebDetailJson: { contains: `"code":"${p.code}"` } }] : []),
            ],
          },
          select: { id: true, publicId: true },
        });
        if (existing) {
          console.log(`   ⏭️  Skip (ya existe en BD): ${existing.publicId}`);
          continue;
        }

        const title = p.title || idBase;
        const titleImageFull = p.images[0] || null;
        const titleImageThumb = p.images[0] || null;
        const locationText = buildLocationText(p) || null;
        const operations = buildOperations(p);
        const images = p.images.map((url, i) => ({ url, title: `${title} ${i + 1}` }));
        if (!title || images.length === 0) {
          console.warn(`   ! Omitiendo ${publicId} por datos insuficientes (title/images)`);
          continue;
        }

        const payload = {
          publicId,
          title,
          titleImageFull,
          titleImageThumb,
          propertyType: normalizeType(p.propertyType) || undefined,
          status: p.status || 'available',
          bedrooms: p.bedrooms ?? null,
          bathrooms: (p.bathrooms ?? null) as number | null,
          parkingSpaces: p.parking_spaces ?? null,
          lotSize: p.lot_size ?? null,
          constructionSize: p.construction_size ?? null,
          brokerName: 'EgoRealEstate',
          locationText,
          operationsJson: operations.length ? JSON.stringify(operations) : null,
          propertyImagesJson: images.length ? JSON.stringify(images) : null,
          ebDetailJson: JSON.stringify({
            source: 'EGO',
            scrapedAt: new Date().toISOString(),
            egoStatus: p.status,
            operations,
            ...((p.__full as any) || {}),
          }),
        } as const;

        console.log(`   ➕ Crear ${publicId} (${title})`);
        await prisma.property.create({ data: { ...payload } });
        totalCreated += 1;
      }

      const moved = await goToNextPage(page);
      if (!moved) break;
      pageNum = await page
        .locator('.listDisplay .listPagination.RealestateListPagination')
        .first()
        .getAttribute('data-current-page')
        .then((v) => Number(v || pageNum + 1))
        .catch(() => pageNum + 1);
    }

    console.log('\n===== RESUMEN =====');
    console.log(`Propiedades detectadas: ${totalItems}`);
    console.log(`Nuevas propiedades creadas en BD: ${totalCreated}`);
  } catch (err: any) {
    console.error('❌ Error durante el scraping:', err?.message || err);
    process.exitCode = 1;
  } finally {
    try { await page.close(); } catch {}
    try { await context.close(); } catch {}
    try { await browser.close(); } catch {}
    try { await prisma.$disconnect(); } catch {}
  }
}

// Allow running directly (CLI) and as imported function (API route)
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
  scrapeEgoToDb().catch((err) => { console.error(err); process.exit(1); });
}
