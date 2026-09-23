'use server';

import { redirect } from 'next/navigation';
import { dbAnon } from '@/server/db';
import { signInAs } from '@/server/session';

// AUTH STUB: see src/server/session.ts.
export async function signInAsAction(formData: FormData) {
  const personId = String(formData.get('personId') ?? '');
  // Only people who exist can be picked; a made-up id gets no token.
  const { data: personas } = await dbAnon().rpc('demo_personas');
  if (!personas?.some((p) => p.id === personId)) redirect('/sign-in?error=unknown');

  await signInAs(personId);
  redirect('/');
}
