import type { NextApiRequest, NextApiResponse } from 'next';

// Stub generator to keep the UI end-to-end working on Vercel without external APIs.
// Replace with a server-side wasm runtime if you want to generate on the server.

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  try {
    const { propertyIds, adType, baseDescription } = req.body || {};
    const base = typeof baseDescription === 'string' ? baseDescription : '';
    if (adType === 'carousel') {
      const ids: number[] = Array.isArray(propertyIds) ? propertyIds.map((x: any) => Number(x)).filter((n: any) => Number.isFinite(n)) : [];
      const options = ids.map((id) => ({ id, options: Array.from({ length: 5 }).map((_, i) => ({ headline: `Opción ${i + 1} para #${id}`, description: `${base || 'Texto'} con gancho y emojis ✨🏡` })) }));
      res.json({ type: 'carousel', options });
      return;
    }
    const options = Array.from({ length: 5 }).map((_, i) => ({ headline: `Título atractivo ${i + 1} 🏡`, description: `${base || 'Ubicación excelente'} y gran plusvalía ✨`, primaryText: `${base || 'Descubre'} tu próximo hogar. Agenda tu visita.` }));
    res.json({ type: 'single', options });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'unknown_error' });
  }
}

