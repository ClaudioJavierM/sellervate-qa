'use client';

import { useActionState, useEffect, useState } from 'react';
import { saveReviewAction, type SaveReviewState } from '@/app/actions/review';
import { SCORES, SCORE_TONE, SEVERITY_LABEL, type Score, type Severity } from '@/lib/scores';
import type { IssueType } from '@/server/review-queue';

type Props = {
  replyId: string;
  issueTypes: IssueType[];
  initial: { score: Score; note: string; issues: string[] } | null;
  window: string;
  brand?: string;
};

const SEVERITIES: Severity[] = ['critical', 'major', 'minor'];
const initialState: SaveReviewState = { error: null };

export function ReviewForm({ replyId, issueTypes, initial, window, brand }: Props) {
  const [state, formAction, pending] = useActionState(saveReviewAction, initialState);
  const [score, setScore] = useState<Score | null>(initial?.score ?? null);
  const [issues, setIssues] = useState<Set<string>>(new Set(initial?.issues ?? []));

  // 1-4 picks a score, unless the lead is typing a note.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.closest('textarea, input[type="text"]') || e.metaKey || e.ctrlKey || e.altKey) return;
      if (['1', '2', '3', '4'].includes(e.key)) setScore(Number(e.key) as Score);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const criticalPicked = issueTypes.some((t) => t.severity === 'critical' && issues.has(t.key));
  const inconsistent = criticalPicked && score !== null && score >= 3;

  function toggle(key: string) {
    setIssues((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="replyId" value={replyId} />
      <input type="hidden" name="window" value={window} />
      {brand && <input type="hidden" name="brand" value={brand} />}

      <fieldset>
        <legend className="flex w-full items-baseline justify-between text-sm font-semibold">
          How good was it?
          <span className="text-xs font-normal text-muted">Keys 1–4</span>
        </legend>
        <div className="mt-2 grid grid-cols-4 gap-1.5" role="radiogroup">
          {([1, 2, 3, 4] as Score[]).map((s) => (
            <label
              key={s}
              className={`flex cursor-pointer flex-col items-center rounded-lg border px-1 py-2 text-center transition-colors ${
                score === s ? `${SCORE_TONE[s].solid} border-transparent` : 'border-line bg-surface hover:border-line-strong'
              }`}
            >
              <input
                type="radio"
                name="score"
                value={s}
                checked={score === s}
                onChange={() => setScore(s)}
                className="sr-only"
                required
              />
              <span className="font-mono text-lg font-semibold tabular leading-none">{s}</span>
              <span className="mt-1 text-[11px] font-medium leading-tight">{SCORES[s].label}</span>
            </label>
          ))}
        </div>
        <p className="mt-2 min-h-5 text-xs text-muted">{score ? SCORES[score].meaning : 'Pick the closest.'}</p>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-semibold">What was off?</legend>
        <div className="mt-2 space-y-3">
          {SEVERITIES.map((severity) => (
            <div key={severity}>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">{SEVERITY_LABEL[severity]}</p>
              <div className="flex flex-wrap gap-1.5">
                {issueTypes.filter((t) => t.severity === severity).map((t) => {
                  const on = issues.has(t.key);
                  return (
                    <label
                      key={t.key}
                      title={t.description}
                      className={`cursor-pointer rounded-md border px-2 py-1 text-xs font-medium transition-colors ${
                        on
                          ? severity === 'critical'
                            ? 'border-score-1 bg-score-1-soft text-score-1'
                            : severity === 'major'
                              ? 'border-score-2 bg-score-2-soft text-score-2'
                              : 'border-ink-soft bg-sunken text-ink'
                          : 'border-line bg-surface text-ink-soft hover:border-line-strong'
                      }`}
                    >
                      <input
                        type="checkbox"
                        name="issues"
                        value={t.key}
                        checked={on}
                        onChange={() => toggle(t.key)}
                        className="sr-only"
                      />
                      {t.label}
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        {inconsistent && (
          <p className="mt-3 rounded-md bg-score-2-soft px-3 py-2 text-xs text-score-2">
            You marked something that risks the account but scored it {score}. That can be right, but
            say why in the note so the specialist isn&apos;t confused.
          </p>
        )}
      </fieldset>

      <div>
        <label htmlFor="note" className="text-sm font-semibold">
          Note for the specialist
        </label>
        <textarea
          id="note"
          name="note"
          rows={4}
          maxLength={2000}
          defaultValue={initial?.note ?? ''}
          placeholder="What should they do differently next time?"
          className="mt-2 block w-full resize-y rounded-lg border border-line bg-surface px-3 py-2 text-sm placeholder:text-muted focus:border-accent focus:outline-none"
        />
        <p className="mt-1 text-xs text-muted">They will read this exactly as written.</p>
      </div>

      {state.error && (
        <p role="alert" className="rounded-md bg-score-1-soft px-3 py-2 text-sm text-score-1">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending || score === null}
        className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? 'Saving…' : initial ? 'Update and go to next' : 'Save and go to next'}
      </button>
    </form>
  );
}
