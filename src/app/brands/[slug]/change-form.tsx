'use client';

import { useActionState, useEffect, useRef } from 'react';
import { addBrandChangeAction, type BrandChangeState } from '@/app/actions/brand-change';

export function ChangeForm({ brand, today }: { brand: string; today: string }) {
  const [state, action, pending] = useActionState<BrandChangeState, FormData>(addBrandChangeAction, { error: null, saved: 0 });
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.saved > 0) formRef.current?.reset();
  }, [state.saved]);

  return (
    <form ref={formRef} action={action} className="space-y-2">
      <input type="hidden" name="brand" value={brand} />
      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="sr-only" htmlFor="effectiveOn">Took effect on</label>
        <input
          id="effectiveOn"
          type="date"
          name="effectiveOn"
          defaultValue={today}
          max={today}
          required
          className="rounded-lg border border-line bg-surface px-3 py-2 text-sm focus:border-accent focus:outline-none"
        />
        <label className="sr-only" htmlFor="summary">What changed</label>
        <input
          id="summary"
          type="text"
          name="summary"
          required
          maxLength={500}
          placeholder="e.g. Rewrote the returns macro to ask for the display reading first"
          className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm placeholder:text-muted focus:border-accent focus:outline-none"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-paper hover:bg-ink-soft disabled:opacity-50"
        >
          {pending ? 'Adding…' : 'Add'}
        </button>
      </div>
      {state.error && <p role="alert" className="text-sm text-score-1">{state.error}</p>}
    </form>
  );
}
