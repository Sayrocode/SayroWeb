import type { NextApiRequest, NextApiResponse } from 'next';

const EB_BASE = 'https://api.easybroker.com/v1/properties';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const apiKey = process.env.EASYBROKER_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Falta EASYBROKER_API_KEY' });
  const { id } = req.query as { id: string };
  if (!id) return res.status(400).json({ error: 'Missing id' });

  try {
    const upstream = await fetch(`${EB_BASE}/${encodeURIComponent(id)}`, {
      headers: { accept: 'application/json', 'X-Authorization': apiKey },
    });
    const text = await upstream.text();
    let data: any = null;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }
    if (!upstream.ok) return res.status(upstream.status).json({ error: 'eb_error', data });
    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=600');
    return res.status(200).json(data);
  } catch (e: any) {
    return res.status(500).json({ error: 'Internal Server Error', message: e?.message || String(e) });
  }
}

