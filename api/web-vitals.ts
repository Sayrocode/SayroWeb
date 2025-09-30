import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false });
  }
  try {
    const metric = req.body && (typeof req.body === 'string' ? JSON.parse(req.body) : req.body);
    // Minimal processing; in real deployments, forward to analytics/logging here
    // eslint-disable-next-line no-console
    if (process.env.NODE_ENV !== 'production') console.log('WebVitals', metric?.name, metric?.value);
  } catch {}
  // Make it cache-safe
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({ ok: true });
}

