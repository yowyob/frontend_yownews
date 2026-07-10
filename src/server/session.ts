import 'server-only';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { serverEnv } from '@/env';
import { redis } from '@/server/redis';
import { getMockSession } from '@/server/mock-session';
import type { AppSession } from '@/lib/types/auth';

type CookiePayload = { sid?: string; expiresAt?: number };

const SESSION_OPTIONS = {
  cookieName: serverEnv.SESSION_COOKIE_NAME,
  password: serverEnv.SESSION_SECRET,
  cookieOptions: {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: serverEnv.NODE_ENV === 'production',
    maxAge: serverEnv.SESSION_TTL_SECONDS,
    path: '/',
  },
};

const key = (sid: string) => `app:session:${sid}`;

export async function writeSession(data: AppSession): Promise<string> {
  if (serverEnv.MOCK_MODE) return data.sid;
  const cookie = await getCookieSession();
  const sid = cookie.sid ?? crypto.randomUUID();
  const ttl = serverEnv.SESSION_TTL_SECONDS;
  await redis().set(key(sid), JSON.stringify(data), 'EX', ttl);
  cookie.sid = sid;
  cookie.expiresAt = data.expiresAt;
  await cookie.save();
  return sid;
}

export async function readSession(): Promise<AppSession | null> {
  if (serverEnv.MOCK_MODE) return await getMockSession();
  const cookie = await getCookieSession();
  if (!cookie.sid) return null;
  if (cookie.expiresAt && cookie.expiresAt * 1000 < Date.now()) return null;
  try {
    const raw = await redis().get(key(cookie.sid));
    if (!raw) return null;
    const session = JSON.parse(raw) as AppSession;
    if (session.expiresAt * 1000 < Date.now()) {
      await redis().del(key(cookie.sid));
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export async function destroySession(): Promise<void> {
  if (serverEnv.MOCK_MODE) return;
  const cookie = await getCookieSession();
  if (cookie.sid) {
    try { await redis().del(key(cookie.sid)); } catch {}
  }
  cookie.destroy();
}

export async function patchSession(patch: Partial<AppSession>): Promise<void> {
  if (serverEnv.MOCK_MODE) return;
  const cookie = await getCookieSession();
  if (!cookie.sid) return;
  try {
    const raw = await redis().get(key(cookie.sid));
    if (!raw) return;
    const current = JSON.parse(raw) as AppSession;
    const next = { ...current, ...patch };
    const ttl = serverEnv.SESSION_TTL_SECONDS;
    await redis().set(key(cookie.sid), JSON.stringify(next), 'EX', ttl);
  } catch {}
}

async function getCookieSession() {
  const cookieStore = await cookies();
  return getIronSession<CookiePayload>(cookieStore, SESSION_OPTIONS);
}
