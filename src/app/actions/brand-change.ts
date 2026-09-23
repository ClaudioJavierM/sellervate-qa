'use server';

import { refresh } from 'next/cache';
import { requireLead } from '@/server/viewer';

export type BrandChangeState = { error: string | null; saved: number };

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function addBrandChangeAction(prev: BrandChangeState, formData: FormData): Promise<BrandChangeState> {
  const viewer = await requireLead();
  const brand = viewer.leads.find((b) => b.slug === String(formData.get('brand') ?? ''));
  if (!brand) return { ...prev, error: 'You don’t lead this brand.' };

  const effectiveOn = String(formData.get('effectiveOn') ?? '');
  const summary = String(formData.get('summary') ?? '').trim();
  if (!DATE.test(effectiveOn) || Number.isNaN(Date.parse(effectiveOn))) return { ...prev, error: 'Pick the date it took effect.' };
  if (!summary) return { ...prev, error: 'Say what changed.' };
  if (summary.length > 500) return { ...prev, error: 'Keep it under 500 characters.' };

  const { error } = await viewer.db.from('brand_changes').insert({
    brand_id: brand.id,
    author_id: viewer.id,
    effective_on: effectiveOn,
    summary,
  });
  if (error) return { ...prev, error: 'Could not save the change. Try again.' };

  refresh();
  return { error: null, saved: prev.saved + 1 };
}
