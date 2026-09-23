'use server';

import { redirect } from 'next/navigation';
import { isScore } from '@/lib/scores';
import { parseWindow } from '@/lib/time';
import { listIssueTypes, nextReplyToReview } from '@/server/review-queue';
import { requireLead } from '@/server/viewer';

const NOTE_MAX = 2000;

export type SaveReviewState = { error: string | null };

export async function saveReviewAction(_prev: SaveReviewState, formData: FormData): Promise<SaveReviewState> {
  // Server Actions are public POST endpoints: check who is calling here, not in
  // the form. RLS checks again underneath.
  const viewer = await requireLead();

  const replyId = String(formData.get('replyId') ?? '');
  const score = Number(formData.get('score'));
  const note = String(formData.get('note') ?? '').trim();
  const window = parseWindow(formData.get('window'));
  const brandSlug = String(formData.get('brand') ?? '') || undefined;

  if (!isScore(score)) return { error: 'Pick a score from 1 to 4.' };
  if (note.length > NOTE_MAX) return { error: `Keep the note under ${NOTE_MAX} characters.` };

  const known = new Set((await listIssueTypes(viewer)).map((t) => t.key));
  const issues = formData.getAll('issues').map(String).filter((k) => known.has(k));

  const { error } = await viewer.db.rpc('save_review', {
    p_reply_id: replyId,
    p_score: score,
    p_note: note,
    p_issue_keys: issues,
  });
  if (error) {
    return {
      error: error.code === 'P0002'
        ? 'This reply is not in any brand you lead.'
        : 'Could not save the review. Nothing was changed; try again.',
    };
  }

  const params = new URLSearchParams({ window, ...(brandSlug ? { brand: brandSlug } : {}) });
  const next = await nextReplyToReview(viewer, { window, brandSlug }, replyId);
  redirect(next ? `/review/${next}?${params}` : `/queue?${params}&done=1`);
}
