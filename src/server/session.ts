import 'server-only';
import { cookies } from 'next/headers';
import { jwtVerify, SignJWT } from 'jose';
import { env } from './env';

// AUTH STUB. Signing in is "pick a person"; there is no password. What is real
// is everything after: the cookie holds a JWT signed with the Supabase secret,
// and that JWT is what Postgres row-level security reads as auth.uid().
// Replacing the stub means replacing signInAs() with Supabase Auth; the token
// shape (sub = people.id, role = authenticated) stays the same.

const COOKIE = 'sv_session';
const TTL_SECONDS = 60 * 60 * 8;

export async function signInAs(personId: string): Promise<void> {
  const token = await new SignJWT({ role: 'authenticated' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(personId)
    .setAudience('authenticated')
    .setIssuedAt()
    .setExpirationTime(`${TTL_SECONDS}s`)
    .sign(env.jwtSecret);

  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: TTL_SECONDS,
  });
}

/** The verified token and its subject, or null if absent, expired or forged. */
export async function readSession(): Promise<{ token: string; personId: string } | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, env.jwtSecret, { audience: 'authenticated' });
    return payload.sub ? { token, personId: payload.sub } : null;
  } catch {
    return null;
  }
}
