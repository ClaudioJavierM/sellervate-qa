import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { dbAs, type Db } from './db';
import { readSession } from './session';

export type BrandRef = { id: string; slug: string; name: string };

export type Viewer = {
  id: string;
  fullName: string;
  leads: BrandRef[];
  writesFor: BrandRef[];
  db: Db;
};

/**
 * Who is asking, resolved once per request. Memberships are read through RLS
 * with the viewer's own token, so this can never report more than the database
 * would let them see anyway.
 */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const session = await readSession();
  if (!session) return null;
  const db = dbAs(session.token);

  const { data: person } = await db
    .from('people')
    .select('id, full_name, brand_members!brand_members_person_id_fkey(role, brands(id, slug, name))')
    .eq('id', session.personId)
    .maybeSingle();
  if (!person) return null;

  const leads: BrandRef[] = [];
  const writesFor: BrandRef[] = [];
  for (const m of person.brand_members) {
    if (!m.brands) continue;
    (m.role === 'lead' ? leads : writesFor).push(m.brands);
  }
  const byName = (a: BrandRef, b: BrandRef) => a.name.localeCompare(b.name);

  return { id: person.id, fullName: person.full_name, leads: leads.sort(byName), writesFor: writesFor.sort(byName), db };
});

export async function requireViewer(): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect('/sign-in');
  return viewer;
}

/** For pages that only make sense for a lead. RLS still applies underneath. */
export async function requireLead(): Promise<Viewer> {
  const viewer = await requireViewer();
  if (viewer.leads.length === 0) redirect('/');
  return viewer;
}

export const isLead = (viewer: Viewer) => viewer.leads.length > 0;
