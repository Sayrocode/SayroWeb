export function normalizeType(t?: string | null): string | undefined {
  if (!t) return undefined;
  const s = t.toString().trim().toLowerCase();
  if (/departa/.test(s) || /depa\b|dept(o|a)s?/.test(s)) return "Departamento";
  if (/casa/.test(s)) return "Casa";
  if (/terreno|lote|predio|parcela/.test(s)) return "Terreno";
  if (/oficina/.test(s)) return "Oficina";
  if (/local/.test(s)) return "Local";
  if (/bodega/.test(s)) return "Bodega";
  if (/loft/.test(s)) return "Loft";
  if (/penthouse|ph\b/.test(s)) return "Penthouse";
  return t.toString();
}

export function normalizeCurrency(c?: string | null): string | undefined {
  if (!c) return undefined;
  const s = c.toString().trim().toUpperCase();
  if (["MXN", "MX$", "$"].includes(s)) return "MXN";
  if (["USD", "US$", "US"] .includes(s)) return "USD";
  return s;
}

export function pickFirst<T>(...vals: (T | undefined | null)[]): T | undefined {
  for (const v of vals) if (v !== undefined && v !== null) return v as T;
  return undefined;
}

export function toNumber(x: any): number | undefined {
  if (x == null) return undefined;
  const n = typeof x === "number" ? x : parseFloat(String(x).replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : undefined;
}

export function cleanText(s?: string | null): string | undefined {
  if (!s) return undefined;
  return s.toString().replace(/\s+/g, " ").trim();
}

export function buildLocationText(parts: {
  address?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
}): string | undefined {
  const arr = [parts.address, parts.neighborhood, parts.city, parts.state, parts.country].filter(Boolean) as string[];
  return arr.length ? arr.join(", ") : undefined;
}

