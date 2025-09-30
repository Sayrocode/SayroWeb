import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../../lib/prisma';
import { requireAdmin, methodNotAllowed } from '../_utils';

// Helpers for type/city normalization (server-side)
function norm(s: string): string {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

const TYPE_SYNONYMS: Record<string, string[]> = {
  Casa: ['casa', 'casas'],
  Departamento: ['departamento', 'departamentos', 'depa', 'dept', 'apto', 'apartamento'],
  Loft: ['loft', 'studio'],
  Terreno: ['terreno', 'terrenos', 'lote', 'lotes', 'predio', 'predios', 'parcela', 'parcelas'],
  Oficina: ['oficina', 'oficinas', 'despacho', 'despachos'],
  Local: ['local', 'locales', 'comercial', 'comerciales'],
  Bodega: ['bodega', 'bodegas'],
  Nave: ['nave', 'naves', 'industrial', 'industriales'],
  Penthouse: ['penthouse', 'ph'],
};

function canonTypeToSynonyms(t: string): string[] {
  const keys = Object.keys(TYPE_SYNONYMS);
  const found = keys.find((k) => norm(k) === norm(t));
  if (found) return TYPE_SYNONYMS[found];
  // fallback: try to detect canonical from raw
  const s = norm(t);
  if (s.includes('casa')) return TYPE_SYNONYMS['Casa'];
  if (s.includes('loft')) return TYPE_SYNONYMS['Loft'];
  if (/(depart|depa|apart|apto)/.test(s)) return TYPE_SYNONYMS['Departamento'];
  if (/(terreno|lote|predio|parcela)/.test(s)) return TYPE_SYNONYMS['Terreno'];
  if (/(oficina|despacho)/.test(s)) return TYPE_SYNONYMS['Oficina'];
  if (/(local|comercial)/.test(s)) return TYPE_SYNONYMS['Local'];
  if (/(bodega)/.test(s)) return TYPE_SYNONYMS['Bodega'];
  if (/(nave|industrial)/.test(s)) return TYPE_SYNONYMS['Nave'];
  if (/(penthouse|\bph\b)/.test(s)) return TYPE_SYNONYMS['Penthouse'];
  return [t];
}

const QRO_MUNICIPALITIES = [
  'Amealco de Bonfil', 'Arroyo Seco', 'Cadereyta de Montes', 'Colón', 'Corregidora', 'Ezequiel Montes', 'Huimilpan',
  'Jalpan de Serra', 'Landa de Matamoros', 'El Marqués', 'Pedro Escobedo', 'Peñamiller', 'Pinal de Amoles', 'Querétaro',
  'San Joaquín', 'San Juan del Río', 'Tequisquiapan', 'Tolimán',
];
const MUNICIPIO_SYNONYMS = (() => {
  const map: Record<string, string> = {};
  const add = (canon: string, ...syns: string[]) => { syns.forEach((s) => { map[norm(s)] = canon; }); map[norm(canon)] = canon; };
  add('Querétaro', 'Santiago de Querétaro', 'Queretaro');
  add('El Marqués', 'El Marques', 'Marques');
  add('San Juan del Río', 'San Juan del Rio');
  add('Tolimán', 'Toliman');
  add('Peñamiller', 'Penamiller');
  add('Colón', 'Colon');
  add('San Joaquín', 'San Joaquin');
  QRO_MUNICIPALITIES.forEach((m) => { map[norm(m)] = m; });
  return map;
})();

function canonicalMunicipio(raw?: string | null): string | null {
  if (!raw) return null;
  let s = String(raw);
  s = s.replace(/\bmunicipio de\b\s*/i, '');
  s = s.replace(/^\s*nuevo\s+/i, '');
  const n = norm(s);
  if (MUNICIPIO_SYNONYMS[n]) return MUNICIPIO_SYNONYMS[n];
  for (const k of Object.keys(MUNICIPIO_SYNONYMS)) {
    if (k && (n.includes(k) || n.includes(`nuevo ${k}`))) return MUNICIPIO_SYNONYMS[k];
  }
  return null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireAdmin(req, res);
  if (!user) return;

  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      const nowId = `LOC-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`.toUpperCase();
      const publicId: string = String(body.publicId || '').trim() || nowId;

      const operations = Array.isArray(body.operations) ? body.operations : [];
      const propertyImages = Array.isArray(body.property_images) ? body.property_images : [];
      let operationsJson: string | undefined;
      let propertyImagesJson: string | undefined;
      try { operationsJson = operations.length ? JSON.stringify(operations) : undefined; } catch {}
      try { propertyImagesJson = propertyImages.length ? JSON.stringify(propertyImages) : undefined; } catch {}

      const created = await prisma.property.create({
        data: {
          publicId,
          title: body.title || null,
          titleImageFull: body.titleImageFull || null,
          titleImageThumb: body.titleImageThumb || null,
          propertyType: body.property_type || body.propertyType || null,
          status: body.status || 'available',
          bedrooms: typeof body.bedrooms === 'number' ? body.bedrooms : null,
          bathrooms: typeof body.bathrooms === 'number' ? body.bathrooms : (typeof body.bathrooms === 'string' ? parseFloat(body.bathrooms) : null),
          parkingSpaces: typeof body.parking_spaces === 'number' ? body.parking_spaces : (typeof body.parkingSpaces === 'number' ? body.parkingSpaces : null),
          lotSize: typeof body.lot_size === 'number' ? body.lot_size : (typeof body.lotSize === 'number' ? body.lotSize : null),
          constructionSize: typeof body.construction_size === 'number' ? body.construction_size : (typeof body.constructionSize === 'number' ? body.constructionSize : null),
          brokerName: body.brokerName || null,
          locationText: body.locationText || (typeof body.location === 'string' ? body.location : (body.location?.name || null)),
          operationsJson,
          propertyImagesJson,
          ebDetailJson: typeof body.eb_detail === 'object' ? JSON.stringify(body.eb_detail) : (typeof body.eb_detail === 'string' ? body.eb_detail : null),
        },
      });
      return res.status(201).json({ ok: true, id: created.id, publicId: created.publicId });
    } catch (e: any) {
      return res.status(500).json({ ok: false, error: 'cannot_create', message: e?.message || String(e) });
    }
  }

  if (req.method === 'GET') {
    // Light private caching for admin navigation
    res.setHeader('Cache-Control', 'private, max-age=10, stale-while-revalidate=60');
    const take = Math.min(parseInt(String(req.query.take ?? '24')) || 24, 100);
    const page = Math.max(parseInt(String(req.query.page ?? '1')) || 1, 1);
    const skip = (page - 1) * take;
    const q = String(req.query.q || '').trim();
    const fast = String(req.query.fast || '').trim();
    const type = String(req.query.type || '').trim();
    const cityRaw = String(req.query.city || '').trim();
    const operation = String(req.query.operation || '').trim().toLowerCase(); // 'sale' | 'rental'
    const status = String(req.query.status || '').trim();
    const bedroomsParam = parseInt(String(req.query.bedrooms ?? ''), 10);
    const bathroomsParam = parseInt(String(req.query.bathrooms ?? ''), 10);

    const where: any = {};
    // Fallback case-insensitive search for SQLite/Turso using raw lower(...) LIKE
    let idFilter: number[] | null = null;
    if (q) {
      try {
        const like = `%${q.toLowerCase()}%`;
        const rows = await prisma.$queryRaw<{ id: number }[]>`
          SELECT id
          FROM Property
          WHERE lower(title) LIKE ${like}
             OR lower(publicId) LIKE ${like}
             OR lower(locationText) LIKE ${like}
             OR lower(propertyType) LIKE ${like}
          ORDER BY updatedAt DESC
          LIMIT ${take} OFFSET ${skip}
        `;
        idFilter = Array.isArray(rows) ? rows.map((r) => Number(r.id)).filter((n) => Number.isFinite(n)) : [];
        if (idFilter.length === 0) {
          return res.status(200).json({ items: [], total: null, page, take });
        }
        where.id = { in: idFilter };
      } catch {
        // Si el raw falla por cualquier razón, usar contains (case-sensitive) como respaldo mínimo
        where.OR = [
          { title: { contains: q } },
          { publicId: { contains: q } },
          { locationText: { contains: q } },
          { propertyType: { contains: q } },
        ];
      }
    }
    if (type) {
      const syns = canonTypeToSynonyms(type);
      (where.AND = where.AND || []).push({ OR: syns.map((s) => ({ propertyType: { contains: s } })) });
    }
    if (cityRaw) {
      const canon = canonicalMunicipio(cityRaw) || cityRaw;
      const needle = canon;
      (where.AND = where.AND || []).push({ OR: [
        { locationText: { contains: needle } },
        { ebDetailJson: { contains: `"municipality":"${needle}"` } },
        { ebDetailJson: { contains: `"city":"${needle}"` } },
      ] });
    }
    // Bedrooms exact (igual a n)
    if (Number.isFinite(bedroomsParam) && bedroomsParam > 0) {
      where.bedrooms = bedroomsParam;
    }
    // Bathrooms exact como entero: n <= bathrooms < n+1
    if (Number.isFinite(bathroomsParam) && bathroomsParam > 0) {
      where.AND = (where.AND || []).concat([{ bathrooms: { gte: bathroomsParam, lt: bathroomsParam + 1 } }]);
    }
    // status filter (supports synonyms for "available")
    if (status) {
      const allowedBase = [
        'available','disponible','active','activa','published','publicada','en venta','en renta',
      ];
      const isAvail = allowedBase.some((s) => s.toLowerCase() === status.toLowerCase());
      if (isAvail) where.status = { in: Array.from(new Set<string>([
        ...allowedBase,
        ...allowedBase.map((s) => s.charAt(0).toUpperCase() + s.slice(1)),
        ...allowedBase.map((s) => s.toUpperCase()),
      ])) };
      else where.status = { contains: status };
    }
    // operation filter using JSON string search as approximation
    if (operation === 'sale' || operation === 'rental') {
      where.OR = (where.OR || []).concat([
        { ebDetailJson: { contains: `"type":"${operation === 'sale' ? 'sale' : 'rental'}"` } },
        { operationsJson: { contains: `"type":"${operation === 'sale' ? 'sale' : 'rental'}"` } },
      ]);
    }
    const listPromise = prisma.property.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      // Cuando usamos búsqueda por ids, ya paginamos en SQL; no volver a aplicar skip/take para mantener el orden
      ...(idFilter ? {} : { skip, take }),
      include: { media: { select: { key: true, filename: true }, take: 1, orderBy: { createdAt: 'desc' } } },
    });
    const countPromise = (q || fast || type || cityRaw || operation || status) ? Promise.resolve(null as any) : prisma.property.count({ where });
    const [items, total] = await Promise.all([listPromise, countPromise]);

    const data = items.map((p) => {
      // Solo usar imágenes locales (Turso) o placeholder público
      let coverUrl: string | null = null;
      let coverZoom: number | null = null;
      if (p.media && p.media.length && (p.media[0] as any).key) {
        const m = p.media[0] as any;
        coverUrl = `/api/admin/images/${encodeURIComponent(m.key)}`;
        // Optional: infer zoom from filename pattern like "zoom-1.15.jpg"
        if (typeof m.filename === 'string') {
          const match = m.filename.match(/zoom[-_]?([0-9]+(?:\.[0-9]+)?)?/i);
          if (match && match[1]) {
            const z = parseFloat(match[1]);
            if (Number.isFinite(z) && z >= 1.0 && z <= 2.0) coverZoom = z;
          }
        }
      } else {
        coverUrl = '/image3.jpg';
      }
      // derive price
      let operations: any[] = [];
      try {
        if (p.ebDetailJson) {
          const j = JSON.parse(p.ebDetailJson);
          if (Array.isArray(j?.operations)) operations = j.operations;
        }
        if ((!operations || operations.length === 0) && p.operationsJson) {
          const j = JSON.parse(p.operationsJson);
          if (Array.isArray(j)) operations = j;
        }
      } catch {}

      let numericPrice: number | null = null;
      let opKind: '' | 'sale' | 'rental' = '';
      const formattedPrice = (() => {
        if (!operations.length) return null;
        const sale = operations.find((o) => o?.type === 'sale');
        const rental = operations.find((o) => o?.type === 'rental');
        if (sale) opKind = 'sale';
        else if (rental) opKind = 'rental';
        const ch = sale || rental || operations[0];
        const amt = typeof ch?.amount === 'number' ? ch.amount : (
          Array.isArray(ch?.prices) ? ch.prices?.[0]?.amount : undefined
        );
        if (typeof amt === 'number') numericPrice = amt;
        if (ch?.formatted_amount) return ch.formatted_amount as string;
        if (typeof amt === 'number') {
          const currency = ch.currency || 'MXN';
          try {
            return new Intl.NumberFormat('es-MX', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amt);
          } catch { return String(amt); }
        }
        return null;
      })();

      return {
        id: p.id,
        publicId: p.publicId,
        title: p.title || `Propiedad ${p.publicId}`,
        coverUrl,
        coverZoom,
        propertyType: p.propertyType,
        status: p.status,
        locationText: p.locationText,
        bedrooms: p.bedrooms,
        bathrooms: p.bathrooms,
        parkingSpaces: p.parkingSpaces,
        lotSize: p.lotSize,
        constructionSize: p.constructionSize,
        price: formattedPrice,
        priceAmount: numericPrice,
        opKind,
        updatedAt: p.updatedAt,
      };
    });

    return res.status(200).json({ items: data, total, page, take });
  }

  return methodNotAllowed(res, ['GET']);
}
