import type { NextApiRequest, NextApiResponse } from 'next';
import { getIronSession } from 'iron-session';
import { sessionOptions, AppSession } from '../../../lib/session';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getIronSession<AppSession>(req, res, sessionOptions);
  if (!session.user) return res.status(401).json({ authenticated: false });
  return res.status(200).json({ authenticated: true, user: session.user });
}

