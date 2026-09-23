'use client';

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-lg pt-12">
      <div role="alert" className="rounded-card border border-line bg-surface px-6 py-10 text-center">
        <p className="font-medium">Something went wrong loading this page.</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
          Nothing you entered was lost unless you were mid-save. If the database was just reset, try again.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-4 rounded-lg bg-ink px-4 py-2 text-sm font-medium text-paper hover:bg-ink-soft"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
