import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';
import { env } from './env';

export type Db = SupabaseClient<Database>;

const options = { auth: { persistSession: false, autoRefreshToken: false } } as const;

/**
 * A client that acts as the signed-in person. Every query through it is
 * filtered by row-level security, so a missing check in app code fails closed.
 * There is deliberately no service-role client in this app.
 */
export function dbAs(token: string): Db {
  return createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
    ...options,
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

/** Anonymous client. Can only call demo_personas(). */
export function dbAnon(): Db {
  return createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, options);
}
