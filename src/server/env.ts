import 'server-only';

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}. Copy .env.example to .env.local (see README).`);
  }
  return value;
}

// Only the server layer reads process.env. None of these are NEXT_PUBLIC_:
// the browser never talks to Supabase directly.
export const env = {
  supabaseUrl: required('SUPABASE_URL'),
  supabaseAnonKey: required('SUPABASE_ANON_KEY'),
  jwtSecret: new TextEncoder().encode(required('SUPABASE_JWT_SECRET')),
};
