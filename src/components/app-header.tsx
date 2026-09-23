import Link from 'next/link';
import { getViewer, isLead } from '@/server/viewer';
import { NavLink } from './nav-link';

export async function AppHeader() {
  const viewer = await getViewer();

  return (
    <header className="border-b border-line bg-surface print:hidden">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span aria-hidden className="grid size-6 place-items-center rounded-md bg-ink text-[11px] font-bold text-paper">
            SQ
          </span>
          <span className="hidden sm:inline">Sellervate QA</span>
        </Link>

        {viewer && (
          <nav className="flex items-center gap-1 overflow-x-auto" aria-label="Main">
            {isLead(viewer) && <NavLink href="/queue">Review queue</NavLink>}
            {viewer.leads.map((b) => (
              <NavLink key={b.id} href={`/brands/${b.slug}`}>{b.name}</NavLink>
            ))}
            {viewer.writesFor.length > 0 && <NavLink href="/feedback">My feedback</NavLink>}
          </nav>
        )}

        {viewer && (
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="hidden text-muted md:inline">
              Signed in as <span className="font-medium text-ink">{viewer.fullName}</span>
            </span>
            <Link
              href="/sign-in"
              className="rounded-md border border-line px-2.5 py-1 font-medium text-ink-soft hover:border-line-strong hover:text-ink"
            >
              Switch person
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
