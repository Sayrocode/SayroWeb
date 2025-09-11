import { SessionOptions } from 'iron-session';

export type SessionUser = {
  id: number;
  username: string;
  role: 'ADMIN';
};

export interface AppSession {
  user?: SessionUser;
  csrfToken?: string;
}

const password = process.env.SESSION_PASSWORD;
if (!password || password.length < 32) {
  // Intentionally not throwing at import time to keep build working.
  // API routes should validate and throw helpful errors.
  // Generate one with: openssl rand -base64 48
}

export const sessionOptions: SessionOptions = {
  cookieName: 'sayro.admin',
  password: password || 'development-only-unsafe-password-change-me-12345678901234567890',
  ttl: 60 * 60 * 24 * 7, // 7 days
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    httpOnly: true,
  },
};
