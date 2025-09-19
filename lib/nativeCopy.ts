import { limitText } from './meta';

// Very lightweight Spanish copy generator for real estate ads.
// It does not use external LLMs. It applies heuristics to craft
// emoji-rich, persuasive headlines and descriptions based on a
// base description and optional property metadata.

export type NativeCopyOptions = {
  maxHeadline?: number;
  maxDescription?: number;
  maxPrimary?: number;
};

export type PropertyLike = {
  id?: number;
  title?: string | null;
  propertyType?: string | null;
  status?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  parkingSpaces?: number | null;
  lotSize?: number | null;
  constructionSize?: number | null;
  locationText?: string | null;
  operationsJson?: string | null;
  ebDetailJson?: string | null;
};

const DEFAULTS: Required<NativeCopyOptions> = {
  maxHeadline: 40,
  maxDescription: 60,
  maxPrimary: 125,
};

const STOPWORDS = new Set([
  'de','la','el','en','y','a','con','para','por','del','las','los','un','una','unos','unas','es','que','se','su','sus','tu','tus','mi','mis','al','o','u','lo','si','sí','más','mas','menos','muy','ya','no','sí','le','les','te','me','como','sobre','sin','entre','hasta','desde','donde','cuando','qué','cuál','cual','cuáles','cuales','esto','esta','estos','estas','eso','esa','esos','esas','aquí','alli','allí','allá','además','también','pero','porque','pues','solo','sólo','sólo','todo','toda','todos','todas','otro','otra','otros','otras'
]);

function norm(s: string): string {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function shortPlace(place?: string | null): string | null {
  if (!place) return null;
  const parts = String(place).split(',').map((s) => s.trim()).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : String(place);
}

function parseOps(p?: PropertyLike): { op: 'Venta'|'Renta'|null, price: string | null } {
  try {
    let arr: any[] | undefined;
    if (p?.ebDetailJson) {
      const j = JSON.parse(p.ebDetailJson || 'null');
      if (Array.isArray(j?.operations)) arr = j.operations;
    }
    if (!arr && p?.operationsJson) {
      const j = JSON.parse(p.operationsJson || 'null');
      if (Array.isArray(j)) arr = j;
    }
    if (arr && arr.length) {
      const sale = arr.find((o: any) => o?.type === 'sale');
      const rental = arr.find((o: any) => o?.type === 'rental');
      const ch = sale || rental || arr[0];
      const op: 'Venta'|'Renta'|null = sale ? 'Venta' : (rental ? 'Renta' : null);
      if (ch?.formatted_amount) return { op, price: ch.formatted_amount };
      if (typeof ch?.amount === 'number') {
        const currency = ch.currency || 'MXN';
        try {
          const fmt = new Intl.NumberFormat('es-MX', { style: 'currency', currency, maximumFractionDigits: 0 }).format(ch.amount);
          return { op, price: fmt };
        } catch {
          return { op, price: String(ch.amount) };
        }
      }
      return { op, price: null };
    }
  } catch {}
  return { op: null, price: null };
}

function extractKeywords(text: string, limit = 8): string[] {
  const tokens = norm(text).split(/[^a-z0-9ñ]+/).filter((t) => t && !STOPWORDS.has(t) && t.length > 2);
  const freq = new Map<string, number>();
  for (const t of tokens) freq.set(t, (freq.get(t) || 0) + 1);
  return Array.from(freq.entries()).sort((a,b) => b[1]-a[1]).slice(0, limit).map(([w]) => w);
}

function pickEmojis(baseText: string, p?: PropertyLike): string[] {
  const k = extractKeywords(baseText + ' ' + (p?.title || '') + ' ' + (p?.propertyType || ''));
  const has = (re: RegExp) => k.some((w) => re.test(w)) || re.test(norm(baseText));
  const out: string[] = [];
  // Property type
  if (has(/casa|residen|hogar|vivienda/)) out.push('🏡');
  else if (has(/departa|depa|loft|ph|penthouse/)) out.push('🏢');
  else if (has(/terreno|lote|parcel/)) out.push('🏞️');
  else out.push('✨');
  // Quality/amenities
  if (has(/lujo|premium|exclusiv|moderno|nuevo|estrenar/)) out.push('✨');
  if (has(/familia|amplio|espacioso|jardin|jardín|patio/)) out.push('👨‍👩‍👧‍👦');
  if (has(/amenidad|alberca|gimnasio|seguridad/)) out.push('⭐');
  // Location/price hooks
  out.push('📍');
  if (has(/inversion|inversión|plusvalia|plusvalía/)) out.push('💼');
  if (has(/precio|oferta|oportunidad/)) out.push('💰');
  // Deduplicate while preserving order
  return Array.from(new Set(out)).slice(0, 3);
}

function titleCaseEs(s: string): string {
  return s.split(/\s+/).map((w, i) => {
    if (i === 0) return w.charAt(0).toUpperCase() + w.slice(1);
    if (STOPWORDS.has(norm(w))) return w;
    return w.charAt(0).toUpperCase() + w.slice(1);
  }).join(' ');
}

export function generateNativeCopy(baseDescription: string, p?: PropertyLike, options?: NativeCopyOptions) {
  const opt = { ...DEFAULTS, ...(options || {}) };
  const base = String(baseDescription || '').trim();

  const place = shortPlace(p?.locationText) || 'Querétaro';
  const { op, price } = parseOps(p);
  const emojis = pickEmojis(base, p);

  // Build headline
  const pt = norm(p?.propertyType || '');
  let typeText = 'Propiedad';
  if (/casa/.test(pt)) typeText = 'Casa';
  else if (/depart/.test(pt)) typeText = 'Departamento';
  else if (/terreno|lote|parcel/.test(pt)) typeText = 'Terreno';

  const headlineRaw = `${emojis[0] || '✨'} ${typeText} en ${place}`;
  const headline = limitText(headlineRaw, opt.maxHeadline);

  // Description: benefits + hooks
  const kws = extractKeywords(base, 6);
  const keyBits: string[] = [];
  if (place) keyBits.push(`📍 ${place}`);
  if (p?.bedrooms) keyBits.push(`🛏️ ${p.bedrooms} rec.`);
  if (p?.bathrooms) keyBits.push(`🛁 ${Math.round(Number(p.bathrooms))} baños`);
  if (p?.parkingSpaces) keyBits.push(`🚗 ${p.parkingSpaces} est.`);
  if (!p?.bedrooms && !p?.bathrooms && !p?.parkingSpaces && kws.length) keyBits.push(`⭐ ${titleCaseEs(kws[0])}`);
  if (op) keyBits.push(op);
  if (price) keyBits.push(String(price));
  const description = limitText(keyBits.join(' · '), opt.maxDescription);

  // Primary text: persuasive, emoji-rich + CTA
  const baseHook = base || p?.title || `${typeText} en ${place}`;
  const persuasive = `${emojis.join(' ')} ${baseHook}. ${op ? op + ' · ' : ''}${price ? price + ' · ' : ''}Agenda tu visita hoy.`;
  const primaryText = limitText(persuasive, opt.maxPrimary);

  return { headline, description, primaryText };
}

export function generateNativeCarousel(baseDescription: string | undefined, props: PropertyLike[], options?: NativeCopyOptions) {
  const opt = { ...DEFAULTS, ...(options || {}) };
  const messageBase = baseDescription && baseDescription.trim().length > 0 ? baseDescription.trim() : `Descubre ${props.length} opciones en Querétaro`;
  const message = limitText(`✨ ${messageBase}`, opt.maxPrimary);
  const copies = props.map((p) => ({ id: p.id!, ...generateNativeCopy(baseDescription || (p.title || ''), p, opt) }));
  return { message, copies };
}

