import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAdmin } from '../_utils';

const EB_BASE = 'https://api.easybroker.com/v1/properties';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const apiKey = process.env.EASYBROKER_API_KEY;
  if (!apiKey) return res.status(400).json({ error: 'Falta EASYBROKER_API_KEY' });

  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

      // Helpers: robust numeric parsing and coordinate normalization
      const toNum = (x: any): number | undefined => {
        if (x == null) return undefined;
        if (typeof x === 'number' && Number.isFinite(x)) return x;
        const s = String(x).replace(/,/g, '.').replace(/[^0-9.\-]/g, '');
        const n = parseFloat(s);
        return Number.isFinite(n) ? n : undefined;
      };

      const isMexicoLike = (loc: any): boolean => {
        const mxStates = new Set([
          'aguascalientes','baja california','baja california sur','campeche','chiapas','chihuahua','ciudad de mexico','cdmx',
          'coahuila','colima','durango','guanajuato','guerrero','hidalgo','jalisco','mexico','edo. mex','estado de mexico',
          'michoacan','morelos','nayarit','nuevo leon','oaxaca','puebla','queretaro','querétaro','quintana roo','san luis potosi',
          'sinaloa','sonora','tabasco','tamaulipas','tlaxcala','veracruz','yucatan','zacatecas','méxico','mexico, mx','méxico, mx'
        ]);
        const hay = (...vals: any[]) => vals.filter(Boolean).map((v) => String(v).toLowerCase());
        const parts = hay(loc?.country, loc?.state, loc?.city, loc?.name);
        if (parts.some((p) => /\bm(e|é)xic|\bmx\b/.test(p))) return true;
        return parts.some((p) => [...mxStates].some((st) => p.includes(st)));
      };

      const normalizeCoords = (locIn: any): { latitude?: number; longitude?: number } => {
        // Accept common aliases
        const latRaw = locIn?.latitude ?? locIn?.lat ?? locIn?.latitud;
        const lngRaw = locIn?.longitude ?? locIn?.lng ?? locIn?.lon ?? locIn?.long ?? locIn?.longitud;
        let lat = toNum(latRaw);
        let lng = toNum(lngRaw);

        // If clearly swapped (lat outside [-90,90] but lng looks like a latitude), swap
        if (lat != null && lng != null && (Math.abs(lat) > 90) && (Math.abs(lng) <= 90)) {
          const t = lat; lat = lng; lng = t;
        }

        // If both look like latitudes (<= 90), keep as-is but fix MX longitude sign
        const mx = isMexicoLike(locIn);
        if (lng != null && mx && lng > 0) lng = -Math.abs(lng);

        // Basic sanity clamps: drop invalid values
        if (lat != null && (Math.abs(lat) > 90)) lat = undefined;
        if (lng != null && (Math.abs(lng) > 180)) lng = undefined;

        return { latitude: lat, longitude: lng };
      };

      // Normalize allowed location for Mexico to reduce rejections
      const stateMap: Record<string, string> = {
        'queretaro': 'Querétaro',
        'querétaro': 'Querétaro',
        'guanajuato': 'Guanajuato',
        'ciudad de mexico': 'Ciudad de México',
        'cdmx': 'Ciudad de México',
      };
      if (body && typeof body.location === 'object' && body.location) {
        const sraw = String(body.location.state || '').toLowerCase();
        if (sraw && stateMap[sraw]) body.location.state = stateMap[sraw];
        // Always set country MX
        body.location.country = body.location.country || 'México';
        // If only text name provided, mirror into name
        if (!body.location.name) {
          const parts = [body.location.neighborhood, body.location.city, body.location.state, 'México'].filter(Boolean);
          body.location.name = parts.join(', ');
        }
        // Robust coordinate cleanup
        const norm = normalizeCoords(body.location);
        if (norm.latitude !== undefined) body.location.latitude = norm.latitude;
        if (norm.longitude !== undefined) body.location.longitude = norm.longitude;
      }

      // Whitelist fields accepted by EB to avoid "unpermitted parameters"
      const locIn = typeof body.location === 'object' && body.location ? body.location : {};
      // Strictly allow only EB-documented keys to avoid unpermitted params
      const location: any = {
        name: locIn.name,
        street: locIn.street,
        postal_code: locIn.postal_code,
        latitude: locIn.latitude,
        longitude: locIn.longitude,
        exterior_number: locIn.exterior_number,
        cross_street: locIn.cross_street,
      };
      // Remove undefined keys
      Object.keys(location).forEach((k) => location[k] === undefined && delete location[k]);
      // Normalize images/property_images to URLs (use public base for relative paths)
      const PUBLIC_BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://sayro-web.vercel.app';
      const inputImgsRaw = Array.isArray((body as any).images)
        ? (body as any).images
        : (Array.isArray((body as any).property_images) ? (body as any).property_images : []);
      const images = inputImgsRaw
        .map((it: any) => ({ url: (it && typeof it.url === 'string') ? it.url.trim() : '' }))
        .filter((it: any) => !!it.url)
        .map((it: any) => ({ url: it.url.startsWith('http') ? it.url : `${PUBLIC_BASE}${it.url}` }));
      // Normalize operations strictly to EasyBroker-accepted values
      const ALLOWED_TYPES = new Set(['sale', 'rental']);
      const ALLOWED_UNITS = new Set(['total', 'square_meter', 'hectare']);
      const operations = Array.isArray(body.operations)
        ? body.operations
            .map((o: any) => {
              const rawType = String(o?.type || '').toLowerCase();
              const type = ALLOWED_TYPES.has(rawType) ? (rawType as 'sale' | 'rental') : undefined;
              const unitRaw = String(o?.unit || 'total').toLowerCase();
              const unit = (ALLOWED_UNITS.has(unitRaw) ? unitRaw : 'total') as 'total'|'square_meter'|'hectare';
              if (!type) return undefined;
              return {
                type,
                active: typeof o?.active === 'boolean' ? o.active : true,
                amount: typeof o?.amount === 'number' ? o.amount : undefined,
                currency: 'mxn',
                unit,
              };
            })
            .filter(Boolean)
        : undefined;
      const payload: any = {
        title: body.title,
        description: body.description,
        property_type: body.property_type,
        status: body.status || 'not_published',
        location,
        operations,
      };
      if (images.length) (payload as any).images = images;

      const upstream = await fetch(EB_BASE, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'X-Authorization': apiKey,
        },
        body: JSON.stringify(payload),
      });
      const text = await upstream.text();
      let data: any = null;
      try { data = JSON.parse(text); } catch { data = { raw: text }; }
      if (!upstream.ok) return res.status(upstream.status).json({ ok: false, error: 'eb_error', data });
      return res.status(201).json({ ok: true, data });
    } catch (e: any) {
      return res.status(500).json({ ok: false, error: 'eb_exception', message: e?.message || String(e) });
    }
  }

  res.setHeader('Allow', 'POST');
  return res.status(405).json({ error: 'Method Not Allowed' });
}
