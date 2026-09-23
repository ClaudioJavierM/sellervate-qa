import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Card, EmptyState, PageHeader, ScoreBadge } from '@/components/ui';
import { formatDuration, formatSentAt, parseWindow, WINDOWS, type Window } from '@/lib/time';
import { getQueue, type QueueItem } from '@/server/review-queue';
import { requireLead } from '@/server/viewer';

export const metadata: Metadata = { title: 'Review queue' };

const SUGGESTED = 5;

function href(window: Window, brand?: string) {
  const params = new URLSearchParams({ window, ...(brand ? { brand } : {}) });
  return `/queue?${params}`;
}

export default async function QueuePage({ searchParams }: PageProps<'/queue'>) {
  const viewer = await requireLead();
  const params = await searchParams;
  const window = parseWindow(params.window);
  const brandSlug = typeof params.brand === 'string' ? params.brand : undefined;

  const queue = await getQueue(viewer, { window, brandSlug });
  if (!queue) notFound();

  const reviewParams = `?${new URLSearchParams({ window, ...(brandSlug ? { brand: brandSlug } : {}) })}`;
  const windowLabel = WINDOWS.find((w) => w.key === window)!.label.toLowerCase();

  return (
    <>
      <PageHeader eyebrow="Review queue" title={`What went out ${window === 'week' ? 'in the last 7 days' : windowLabel}`}>
        You won&apos;t read all of it. The first {SUGGESTED} are picked from the specialists you&apos;ve
        reviewed least this week, so feedback is spread across the team.
      </PageHeader>

      {params.done === '1' && (
        <p role="status" className="mb-6 rounded-md bg-score-4-soft px-4 py-2.5 text-sm font-medium text-score-4">
          Nothing left to review in this view.
        </p>
      )}

      <div className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-3">
        <FilterGroup label="Sent">
          {WINDOWS.map((w) => (
            <FilterLink key={w.key} href={href(w.key, brandSlug)} active={w.key === window}>{w.label}</FilterLink>
          ))}
        </FilterGroup>
        {viewer.leads.length > 1 && (
          <FilterGroup label="Brand">
            <FilterLink href={href(window)} active={!brandSlug}>All</FilterLink>
            {viewer.leads.map((b) => (
              <FilterLink key={b.id} href={href(window, b.slug)} active={b.slug === brandSlug}>{b.name}</FilterLink>
            ))}
          </FilterGroup>
        )}
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_16rem]">
        <div className="min-w-0 space-y-8">
          {queue.toReview.length === 0 && queue.reviewed.length === 0 ? (
            <EmptyState
              title={`No replies ${window === 'today' ? 'yet today' : 'in this window'}`}
              action={window !== 'week' ? { href: href('week', brandSlug), label: 'Look at the last 7 days' } : undefined}
            >
              Replies appear here once they are imported from the brand&apos;s helpdesk.
            </EmptyState>
          ) : (
            <>
              <section aria-labelledby="to-review">
                <h2 id="to-review" className="mb-3 flex items-baseline gap-2 text-sm font-semibold">
                  To review <span className="font-mono tabular font-normal text-muted">{queue.toReview.length}</span>
                </h2>
                {queue.toReview.length === 0 ? (
                  <EmptyState title="All reviewed">Every reply in this view has a score.</EmptyState>
                ) : (
                  <Card className="divide-y divide-line overflow-hidden">
                    {queue.toReview.map((item, i) => (
                      <QueueRow
                        key={item.id}
                        item={item}
                        href={`/review/${item.id}${reviewParams}`}
                        suggested={i < SUGGESTED}
                        showBrand={queue.brands.length > 1}
                      />
                    ))}
                  </Card>
                )}
              </section>

              {queue.reviewed.length > 0 && (
                <section aria-labelledby="reviewed">
                  <h2 id="reviewed" className="mb-3 flex items-baseline gap-2 text-sm font-semibold">
                    Reviewed <span className="font-mono tabular font-normal text-muted">{queue.reviewed.length}</span>
                  </h2>
                  <Card className="divide-y divide-line overflow-hidden">
                    {queue.reviewed.map((item) => (
                      <QueueRow
                        key={item.id}
                        item={item}
                        href={`/review/${item.id}${reviewParams}`}
                        showBrand={queue.brands.length > 1}
                      />
                    ))}
                  </Card>
                </section>
              )}
            </>
          )}
        </div>

        <aside aria-labelledby="coverage" className="lg:pt-8">
          <h2 id="coverage" className="text-sm font-semibold">Reviewed in the last 7 days</h2>
          <p className="mt-1 text-xs text-muted">Per specialist, across {brandSlug ? 'this brand' : 'your brands'}.</p>
          <ul className="mt-3 space-y-2">
            {queue.coverage.map((c) => (
              <li key={c.authorId} className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate">{c.name}</span>
                <span className={`font-mono tabular ${c.reviewedLast7Days === 0 ? 'font-semibold text-score-1' : 'text-ink-soft'}`}>
                  {c.reviewedLast7Days}
                </span>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </>
  );
}

function QueueRow({ item, href, suggested, showBrand }: {
  item: QueueItem; href: string; suggested?: boolean; showBrand: boolean;
}) {
  return (
    <Link href={href} className="group flex gap-4 px-4 py-3.5 transition-colors hover:bg-paper sm:px-5">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
          {suggested && <span className="rounded bg-accent-soft px-1.5 py-0.5 font-semibold text-accent">Suggested</span>}
          {showBrand && <span className="font-semibold text-ink-soft">{item.brand.name}</span>}
          <span>{item.author.name}</span>
          <span aria-hidden>·</span>
          <span>{formatSentAt(item.sentAt)}</span>
          <span aria-hidden>·</span>
          <span title="Time from the customer's message to this reply">replied in {formatDuration(item.responseMs)}</span>
        </div>
        <p className="mt-1 truncate font-medium group-hover:text-accent">{item.subject}</p>
        <p className="mt-0.5 line-clamp-1 font-serif text-sm text-ink-soft">{item.excerpt}</p>
      </div>
      <div className="flex shrink-0 items-center">
        {item.score ? <ScoreBadge score={item.score} size="sm" /> : <span className="text-sm text-muted group-hover:text-accent">Review →</span>}
      </div>
    </Link>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-muted">{label}</span>
      <div className="flex rounded-lg border border-line bg-surface p-0.5">{children}</div>
    </div>
  );
}

function FilterLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? 'true' : undefined}
      className={`rounded-md px-2.5 py-1 text-sm transition-colors ${active ? 'bg-ink font-medium text-paper' : 'text-ink-soft hover:text-ink'}`}
    >
      {children}
    </Link>
  );
}
