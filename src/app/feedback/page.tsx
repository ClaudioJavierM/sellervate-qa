import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Card, EmptyState, IssueChip, PageHeader, ReplyText, ScoreBadge } from '@/components/ui';
import { MIN_SAMPLE } from '@/lib/report';
import { bandFor, SCORE_TONE } from '@/lib/scores';
import { formatDate, formatSentAt } from '@/lib/time';
import { getMyFeedback } from '@/server/my-feedback';
import { requireViewer } from '@/server/viewer';

export const metadata: Metadata = { title: 'My feedback' };

export default async function FeedbackPage({ searchParams }: PageProps<'/feedback'>) {
  const viewer = await requireViewer();
  const query = await searchParams;
  const brandSlug = typeof query.brand === 'string' ? query.brand : undefined;

  if (viewer.writesFor.length === 0) {
    return (
      <EmptyState title="You don’t write replies for any brand" action={{ href: '/', label: 'Go to your start page' }}>
        This page shows feedback on your own replies.
      </EmptyState>
    );
  }

  const feedback = await getMyFeedback(viewer, brandSlug);
  if (!feedback) notFound();

  return (
    <>
      <PageHeader eyebrow="My feedback" title={`${viewer.fullName.split(' ')[0]}, here’s how your replies were read`}>
        Only you and the team leads of each brand can see this. Scores come from a sample of your replies,
        so one review is a conversation, not a verdict.
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {feedback.perBrand.map((b) => {
          const change = b.current !== null && b.previous !== null ? b.current - b.previous : null;
          return (
            <Card key={b.brand.id} className="p-5">
              <p className="text-sm text-muted">{b.brand.name}, last 4 weeks</p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className={`text-2xl font-semibold tracking-tight ${b.current ? SCORE_TONE[bandFor(b.current)].text : 'text-muted'}`}>
                  {b.current?.toFixed(2) ?? '—'}
                </span>
                {change !== null && Math.abs(change) >= 0.005 && (
                  <span className={`text-sm font-medium ${change > 0 ? 'text-score-4' : 'text-score-1'}`}>
                    {change > 0 ? '+' : ''}{change.toFixed(2)} <span className="font-normal text-muted">vs before</span>
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-muted">
                {b.current === null ? 'No reviews in the last 4 weeks' : `${b.currentN} reviews`}
                {b.currentN > 0 && b.currentN < MIN_SAMPLE && ' · small sample'}
              </p>
            </Card>
          );
        })}

        {feedback.topIssues.length > 0 && (
          <Card className="p-5">
            <p className="text-sm text-muted">Came up most, last 6 weeks</p>
            <ul className="mt-3 space-y-2">
              {feedback.topIssues.map((row) => (
                <li key={row.key} className="flex items-center justify-between gap-2">
                  <IssueChip label={row.label} severity={row.severity} />
                  <span className="text-xs text-muted">{row.current}×</span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>

      {viewer.writesFor.length > 1 && (
        <nav aria-label="Filter by brand" className="mt-8 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-xs font-medium text-muted">Brand</span>
          <BrandLink href="/feedback" active={!brandSlug}>All</BrandLink>
          {viewer.writesFor.map((b) => (
            <BrandLink key={b.id} href={`/feedback?brand=${b.slug}`} active={b.slug === brandSlug}>{b.name}</BrandLink>
          ))}
        </nav>
      )}

      <section aria-labelledby="reviews-title" className="mt-6">
        <h2 id="reviews-title" className="mb-3 flex items-baseline gap-2 text-sm font-semibold">
          Reviews of your replies <span className="font-mono tabular font-normal text-muted">{feedback.total}</span>
        </h2>
        {feedback.reviews.length === 0 ? (
          <EmptyState title="Nothing reviewed yet">
            When a team lead scores one of your replies, it shows up here with their note.
          </EmptyState>
        ) : (
          <div className="space-y-3">
            {feedback.reviews.map((r) => (
              <Card key={r.id} className="p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <ScoreBadge score={r.score} size="sm" />
                  {r.issues.map((key) => {
                    const issue = feedback.issues.find((i) => i.key === key);
                    return issue ? <IssueChip key={key} label={issue.label} severity={issue.severity} /> : null;
                  })}
                  <span className="ml-auto text-xs text-muted">{r.brandName} · sent {formatSentAt(r.sentAt)}</span>
                </div>
                <p className="mt-2 font-medium">{r.subject}</p>
                {r.note ? (
                  <blockquote className="mt-3 rounded-lg bg-paper px-4 py-3">
                    <p>{r.note}</p>
                    <footer className="mt-1 text-xs text-muted">{r.reviewer}, {formatDate(r.reviewedAt)}</footer>
                  </blockquote>
                ) : (
                  <p className="mt-2 text-sm text-muted">No note. Reviewed by {r.reviewer}, {formatDate(r.reviewedAt)}.</p>
                )}
                <details className="group mt-3">
                  <summary className="cursor-pointer text-sm text-muted hover:text-ink">
                    <span className="group-open:hidden">Show what you wrote</span>
                    <span className="hidden group-open:inline">Hide</span>
                  </summary>
                  <div className="mt-3 space-y-3">
                    <p className="whitespace-pre-line rounded-lg bg-sunken/60 px-4 py-3 text-sm text-ink-soft">{r.customerMessage}</p>
                    <div className="px-1"><ReplyText>{r.body}</ReplyText></div>
                  </div>
                </details>
              </Card>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function BrandLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? 'true' : undefined}
      className={`rounded-md px-2.5 py-1 transition-colors ${active ? 'bg-ink font-medium text-paper' : 'text-ink-soft hover:text-ink'}`}
    >
      {children}
    </Link>
  );
}
