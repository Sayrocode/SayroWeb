import type { NextApiRequest, NextApiResponse } from 'next';
import { getIronSession } from 'iron-session';
import bcrypt from 'bcryptjs';
import { prisma } from '../../../lib/prisma';
import { sessionOptions, AppSession } from '../../../lib/session';

async function ensureAdminFromEnv() {
  const count = await prisma.user.count();
  if (count > 0) return; // already initialized

  const username = process.env.ADMIN_USERNAME?.trim();
  const password = process.env.ADMIN_PASSWORD?.trim();
  if (!username || !password) {
    throw new Error('Primera inicialización: define ADMIN_USERNAME y ADMIN_PASSWORD en .env.local para crear el admin.');
  }
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.create({ data: { username, passwordHash, role: 'ADMIN' } });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    await ensureAdminFromEnv();
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'No se pudo inicializar el admin' });
  }

  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Faltan credenciales' });
  }

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) return res.status(401).json({ error: 'Usuario o contraseña inválidos' });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Usuario o contraseña inválidos' });

  const session = await getIronSession<AppSession>(req, res, sessionOptions);
  session.user = { id: user.id, username: user.username, role: 'ADMIN' };
  await session.save();

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  return res.status(200).json({ ok: true });
}

