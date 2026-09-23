import type { Metadata } from 'next';
import { dbAnon } from '@/server/db';
import { getViewer } from '@/server/viewer';
import { signInAsAction } from '@/app/actions/session';

export const metadata: Metadata = { title: 'Choose who you are' };

export default async function SignInPage({ searchParams }: PageProps<'/sign-in'>) {
  const [{ data: personas, error }, viewer, params] = await Promise.all([
    dbAnon().rpc('demo_personas'),
    getViewer(),
    searchParams,
  ]);

  return (
    <div className="mx-auto max-w-xl">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Demo sign-in</p>
      <h1 className="mt-2 text-xl font-semibold tracking-tight">Who are you today?</h1>
      <p className="mt-2 text-ink-soft">
        Login is stubbed: pick a person to act as them. What each person can see is still enforced by
        the database, so switching to a specialist really does hide everyone else&apos;s work.
      </p>

      {params.error === 'unknown' && (
        <p role="alert" className="mt-6 rounded-md border border-score-1/30 bg-score-1-soft px-3 py-2 text-sm text-score-1">
          That person doesn&apos;t exist. Pick one from the list.
        </p>
      )}

      {error ? (
        <div role="alert" className="mt-8 rounded-card border border-line bg-surface p-5">
          <p className="font-medium">Can&apos;t reach the database.</p>
          <p className="mt-1 text-sm text-muted">
            Is Supabase running? Try <code className="font-mono">npx supabase start</code>, then reload.
          </p>
        </div>
      ) : (
        <ul className="mt-8 divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
          {personas?.map((p) => (
            <li key={p.id}>
              <form action={signInAsAction}>
                <input type="hidden" name="personId" value={p.id} />
                <button
                  type="submit"
                  className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-paper"
                >
                  <span
                    aria-hidden
                    className="grid size-9 shrink-0 place-items-center rounded-full bg-sunken text-sm font-semibold text-ink-soft"
                  >
                    {p.full_name.split(' ').map((w) => w[0]).join('')}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{p.full_name}</span>
                    <span className="block truncate text-sm text-muted">{p.summary}</span>
                  </span>
                  {viewer?.id === p.id && <span className="text-xs font-medium text-accent">Current</span>}
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
