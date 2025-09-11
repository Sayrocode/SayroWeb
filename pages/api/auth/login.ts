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

  // Simple IP-based rate limiting to protect against brute force
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
  // in-memory store (process-level). For serverless, it resets on cold start (acceptable baseline)
  const g: any = global as any;
  g.__loginAttempts = g.__loginAttempts || new Map<string, number[]>();
  const now = Date.now();
  const windowMs = 10 * 60 * 1000; // 10 minutes
  const attempts = (g.__loginAttempts.get(ip) || []).filter((t: number) => now - t < windowMs);
  if (attempts.length >= 20) { // allow ~20 attempts / 10 min per IP
    return res.status(429).json({ error: 'Demasiados intentos. Intenta más tarde.' });
  }
  attempts.push(now); g.__loginAttempts.set(ip, attempts);

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
  // Generate CSRF token (expose via /api/auth/me for clients to send back in X-CSRF-Token)
  try { session.csrfToken = require('crypto').randomBytes(24).toString('hex'); } catch {}
  await session.save();

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  return res.status(200).json({ ok: true });
}
