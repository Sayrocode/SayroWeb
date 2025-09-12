import type { NextApiRequest, NextApiResponse } from 'next';
import { getIronSession } from 'iron-session';
import { sessionOptions, AppSession } from '../../../lib/session';

function sameOrigin(req: NextApiRequest) {
  const host = req.headers.host || '';
  const proto = (req.headers['x-forwarded-proto'] as string) || (process.env.NODE_ENV === 'production' ? 'https' : 'http');
  const originExpected = `${proto}://${host}`;
  const origin = (req.headers.origin as string) || '';
  const referer = (req.headers.referer as string) || '';
  if (origin && origin.toLowerCase() === originExpected.toLowerCase()) return true;
  if (referer && referer.toLowerCase().startsWith(originExpected.toLowerCase())) return true;
  return false;
}

export async function requireAdmin(req: NextApiRequest, res: NextApiResponse) {
  const session = await getIronSession<AppSession>(req, res, sessionOptions);
  if (!session.user) {
    res.status(401).json({ error: 'No autorizado' });
    return null;
  }
  // For mutating requests, require same-origin to harden against CSRF/login CSRF
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method || 'GET')) {
    if (!sameOrigin(req)) {
      res.status(403).json({ error: 'CSRF: origen inválido' });
      return null;
    }
  }
  return session.user;
}

export function methodNotAllowed(res: NextApiResponse, methods: string[]) {
  res.setHeader('Allow', methods.join(', '));
  return res.status(405).json({ error: 'Method Not Allowed' });
}
