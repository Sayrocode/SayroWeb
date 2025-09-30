import type { NextApiRequest, NextApiResponse } from 'next';

const EB_BASE = 'https://api.easybroker.com/v1/properties';

type EBPagination = {
  limit?: number;
  page?: number;
  total?: number;
  next_page?: number | null;
};

type EBListResponse<T = any> = {
  pagination?: EBPagination;
  content?: T[];
  [k: string]: any;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const apiKey = process.env.EASYBROKER_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Falta EASYBROKER_API_KEY' });

  try {
    const { page, limit, ...rest } = req.query;
    const pg = Math.max(1, parseInt(String(page || '1'), 10) || 1);
    const perPage = Math.max(1, Math.min(parseInt(String(limit || '24'), 10) || 24, 100));

    const params = new URLSearchParams();
    Object.entries(rest).forEach(([k, v]) => {
      if (Array.isArray(v)) v.forEach((vv) => params.append(k, String(vv)));
      else if (v != null) params.append(k, String(v));
    });

    const url = `${EB_BASE}?page=${pg}&limit=${perPage}${params.toString() ? `&${params}` : ''}`;
    const upstream = await fetch(url, {
      headers: { accept: 'application/json', 'X-Authorization': apiKey },
    });
    const text = await upstream.text();
    let data: EBListResponse | any = null;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }
    if (!upstream.ok) return res.status(upstream.status).json({ error: 'eb_error', data });
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return res.status(200).json(data);
  } catch (e: any) {
    return res.status(500).json({ error: 'Internal Server Error', message: e?.message || String(e) });
  }
}

