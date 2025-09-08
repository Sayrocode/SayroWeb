import type { NextApiRequest, NextApiResponse } from 'next';
import { getIronSession } from 'iron-session';
import { sessionOptions, AppSession } from '../../../lib/session';

export async function requireAdmin(req: NextApiRequest, res: NextApiResponse) {
  const session = await getIronSession<AppSession>(req, res, sessionOptions);
  if (!session.user) {
    res.status(401).json({ error: 'No autorizado' });
    return null;
  }
  return session.user;
}

export function methodNotAllowed(res: NextApiResponse, methods: string[]) {
  res.setHeader('Allow', methods.join(', '));
  return res.status(405).json({ error: 'Method Not Allowed' });
}

