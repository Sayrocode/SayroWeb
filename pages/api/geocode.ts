import type { NextApiRequest, NextApiResponse } from 'next';

type GeocodeResult = {
  lat: number;
  lon: number;
  source: 'google' | 'nominatim';
  raw?: any;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const q = String(req.query.q || '').trim();
  if (!q) return res.status(400).json({ error: 'Missing query parameter q' });

  // Prefer Google if key is provided; otherwise fallback to Nominatim
  const googleKey = process.env.GOOGLE_MAPS_API_KEY;

  try {
    let result: GeocodeResult | null = null;

    if (googleKey) {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(q)}&key=${googleKey}`;
      const r = await fetch(url);
      if (!r.ok) throw new Error(`Google geocode failed: ${r.status}`);
      const data = await r.json();
      const first = data?.results?.[0];
      if (first?.geometry?.location) {
        result = {
          lat: first.geometry.location.lat,
          lon: first.geometry.location.lng,
          source: 'google',
          raw: first,
        };
      }
    }

    if (!result) {
      const params = new URLSearchParams({
        q,
        format: 'json',
        addressdetails: '1',
        limit: '1',
        countrycodes: 'mx',
      });
      const url = `https://nominatim.openstreetmap.org/search?${params.toString()}`;
      const r = await fetch(url, {
        headers: {
          // Nominatim usage policy requires a valid UA and referer/contact
          'User-Agent': 'sayroweb/1.0 (+https://sayro.mx)'
        },
      });
      if (!r.ok) throw new Error(`Nominatim geocode failed: ${r.status}`);
      const data = await r.json();
      const first = Array.isArray(data) ? data[0] : undefined;
      if (first?.lat && first?.lon) {
        result = {
          lat: parseFloat(first.lat),
          lon: parseFloat(first.lon),
          source: 'nominatim',
          raw: first,
        };
      }
    }

    if (!result) return res.status(404).json({ error: 'No results' });
    return res.status(200).json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Internal error' });
  }
}

