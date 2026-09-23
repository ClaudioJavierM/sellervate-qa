import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Card, EmptyState, IssueChip, PageHeader, ScoreBadge } from '@/components/ui';
import { MIN_SAMPLE, type WeekPoint } from '@/lib/report';
import { bandFor, SCORE_TONE } from '@/lib/scores';
import { formatDate, formatSentAt, TEAM_TIME_ZONE } from '@/lib/time';
import { getBrandReport, REPORT_WEEKS, type BrandReport } from '@/server/brand-report';
import { requireLead } from '@/server/viewer';
import { ChangeForm } from './change-form';
import { PrintButton } from './print-button';
import { TrendChart } from './trend-chart';

export async function generateMetadata({ params }: PageProps<'/brands/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  return { title: `Brand report · ${slug}` };
}

const pct = (x: number | null) => (x === null ? '—' : `${Math.round(x * 100)}%`);
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: TEAM_TIME_ZONE }).format(new Date());

export default async function BrandPage({ params, searchParams }: PageProps<'/brands/[slug]'>) {
  const viewer = await requireLead();
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const issueFilter = typeof query.issue === 'string' ? query.issue : undefined;

  const report = await getBrandReport(viewer, slug, issueFilter);
  if (!report) notFound();

  const filteredIssue = report.issues.find((i) => i.key === issueFilter);
  const hasData = report.coverage.reviewed > 0;

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <PageHeader eyebrow="Brand report" title={report.brand.name}>
          The last {REPORT_WEEKS} weeks, grouped by the week each reply was sent. Scores are from team-lead
          reviews of a sample of replies, not every reply.
        </PageHeader>
        <PrintButton />
      </div>

      {!hasData ? (
        <EmptyState title="No reviews for this brand yet" action={{ href: `/queue?brand=${slug}&window=week`, label: 'Review this week’s replies' }}>
          The trend and the recurring issues appear once a few replies have been scored.
        </EmptyState>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatTile
              label="Average score, last 4 weeks"
              value={report.average.current?.toFixed(2) ?? '—'}
              valueClass={report.average.current ? SCORE_TONE[bandFor(report.average.current)].text : ''}
              delta={delta(report.average.current, report.average.previous, (d) => `${d > 0 ? '+' : ''}${d.toFixed(2)}`, 'up')}
              foot={`${report.average.currentN} reviews`}
              thin={report.average.currentN < MIN_SAMPLE}
            />
            <StatTile
              label="Replies that risked the account"
              value={pct(report.criticalRate.current)}
              delta={delta(report.criticalRate.current, report.criticalRate.previous, (d) => `${d > 0 ? '+' : ''}${Math.round(d * 100)} pts`, 'down')}
              foot="Wrong information or a skipped procedure, last 4 weeks"
              thin={report.criticalRate.currentN < MIN_SAMPLE}
            />
            <StatTile
              label="Replies reviewed"
              value={pct(report.coverage.replies ? report.coverage.reviewed / report.coverage.replies : null)}
              foot={`${report.coverage.reviewed} of ${report.coverage.replies} over ${REPORT_WEEKS} weeks`}
            />
          </div>

          <Card className="p-5 sm:p-6">
            <h2 className="font-semibold">Score over time</h2>
            <p className="mb-4 mt-0.5 text-sm text-muted">
              Single weeks are noisy with a handful of reviews each; read the 4-week line.
            </p>
            <TrendChart points={report.trend} changes={report.changes} />
            {report.changes.length > 0 && (
              <ol className="mt-4 space-y-1.5 text-sm">
                {report.changes.map((c, i) => (
                  <li key={c.id} className="flex gap-3">
                    <span className="grid size-5 shrink-0 place-items-center rounded-full bg-ink text-[10px] font-semibold text-paper">{i + 1}</span>
                    <span>
                      <span className="font-medium">{formatDate(c.effectiveOn)}</span>
                      <span className="text-ink-soft"> · {c.summary}</span>
                    </span>
                  </li>
                ))}
              </ol>
            )}
            <details className="mt-4 text-sm">
              <summary className="cursor-pointer text-muted hover:text-ink">Show as a table</summary>
              <TrendTable points={report.trend} />
            </details>
          </Card>

          <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
            <IssuesCard report={report} slug={slug} />
            <SpecialistsCard report={report} />
          </div>

          <Card className="p-5 sm:p-6">
            <h2 className="font-semibold">What we changed</h2>
            <p className="mb-4 mt-0.5 text-sm text-muted">
              Dated changes to how this brand is handled. They appear as numbered markers on the chart.
            </p>
            {report.changes.length === 0 && (
              <p className="mb-4 text-sm text-muted">Nothing logged yet.</p>
            )}
            <div className="print:hidden">
              <ChangeForm brand={slug} today={today()} />
            </div>
          </Card>

          <section id="evidence" aria-labelledby="evidence-title" className="scroll-mt-6">
            <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 id="evidence-title" className="font-semibold">
                {filteredIssue ? `Reviews marked “${filteredIssue.label}”` : 'Recent reviews'}
              </h2>
              {filteredIssue && (
                <Link href={`/brands/${slug}#evidence`} className="text-sm text-accent hover:text-accent-hover">Show all</Link>
              )}
            </div>
            {report.evidence.length === 0 ? (
              <EmptyState title="No reviews match">Try another issue, or show all reviews.</EmptyState>
            ) : (
              <Card className="divide-y divide-line">
                {report.evidence.map((e) => (
                  <article key={e.reviewId} className="px-5 py-4">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs text-muted">
                      <ScoreBadge score={e.score} size="sm" />
                      {e.issues.map((key) => {
                        const issue = report.issues.find((i) => i.key === key);
                        return issue ? <IssueChip key={key} label={issue.label} severity={issue.severity} /> : null;
                      })}
                      <span className="ml-auto">{e.author} · {formatSentAt(e.sentAt)}</span>
                    </div>
                    <Link href={`/review/${e.replyId}?window=week`} className="mt-2 block font-medium hover:text-accent">
                      {e.subject}
                    </Link>
                    <p className="mt-1 line-clamp-2 font-serif text-sm text-ink-soft">{e.body}</p>
                    {e.note && (
                      <p className="mt-2 border-l-2 border-line-strong pl-3 text-sm">
                        {e.note} <span className="text-muted">— {e.reviewer}</span>
                      </p>
                    )}
                  </article>
                ))}
              </Card>
            )}
          </section>
        </div>
      )}
    </>
  );
}

type Delta = { text: string; good: boolean } | null;

function delta(current: number | null, previous: number | null, format: (d: number) => string, better: 'up' | 'down'): Delta {
  if (current === null || previous === null) return null;
  const d = current - previous;
  if (Math.abs(d) < 0.005) return { text: 'no change', good: true };
  return { text: format(d), good: better === 'up' ? d > 0 : d < 0 };
}

function StatTile({ label, value, valueClass = '', delta: d, foot, thin }: {
  label: string; value: string; valueClass?: string; delta?: Delta; foot: string; thin?: boolean;
}) {
  return (
    <Card className="p-5">
      <p className="text-sm text-muted">{label}</p>
      <div className="mt-2 flex items-baseline gap-2">
        <span className={`text-2xl font-semibold tracking-tight ${valueClass}`}>{value}</span>
        {d && (
          <span className={`text-sm font-medium ${d.good ? 'text-score-4' : 'text-score-1'}`}>
            {d.text} <span className="font-normal text-muted">vs previous 4 weeks</span>
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-muted">{foot}</p>
      {thin && <p className="mt-2 text-xs font-medium text-score-2">Few reviews: treat as a signal, not a result.</p>}
    </Card>
  );
}

function TrendTable({ points }: { points: WeekPoint[] }) {
  return (
    <table className="mt-3 w-full text-left text-sm">
      <thead className="text-xs text-muted">
        <tr>
          <th className="py-1 font-medium">Week of</th>
          <th className="py-1 text-right font-medium">Reviewed</th>
          <th className="py-1 text-right font-medium">Week avg</th>
          <th className="py-1 text-right font-medium">4-week avg</th>
        </tr>
      </thead>
      <tbody className="font-mono tabular">
        {points.map((p) => (
          <tr key={p.start} className="border-t border-line">
            <td className="py-1 font-sans">{formatDate(p.start)}</td>
            <td className="py-1 text-right">{p.reviews}/{p.replies}</td>
            <td className="py-1 text-right">{p.average?.toFixed(2) ?? '—'}</td>
            <td className="py-1 text-right">{p.rolling?.toFixed(2) ?? '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function IssuesCard({ report, slug }: { report: BrandReport; slug: string }) {
  return (
    <Card className="p-5 sm:p-6">
      <h2 className="font-semibold">What we keep getting wrong</h2>
      <p className="mb-4 mt-0.5 text-sm text-muted">
        Reviews flagging each issue, last {report.compareWeeks} weeks against the {report.compareWeeks} before.
      </p>
      {report.issueRows.length === 0 ? (
        <p className="text-sm text-muted">No issues flagged in this period.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-muted">
            <tr>
              <th className="pb-2 font-medium">Issue</th>
              <th className="pb-2 text-right font-medium">Before</th>
              <th className="pb-2 text-right font-medium">Now</th>
              <th className="pb-2 text-right font-medium">Of reviews</th>
            </tr>
          </thead>
          <tbody>
            {report.issueRows.map((row) => (
              <tr key={row.key} className="border-t border-line">
                <td className="py-2">
                  <Link href={`/brands/${slug}?issue=${row.key}#evidence`} className="group inline-flex items-center gap-2">
                    <IssueChip label={row.label} severity={row.severity} />
                    <span className="text-xs text-muted opacity-0 transition-opacity group-hover:opacity-100 print:hidden">see replies</span>
                  </Link>
                </td>
                <td className="py-2 text-right font-mono tabular text-muted">{row.previous}</td>
                <td className={`py-2 text-right font-mono font-semibold tabular ${
                  row.current < row.previous ? 'text-score-4' : row.current > row.previous ? 'text-score-1' : ''
                }`}>
                  {row.current}
                </td>
                <td className="py-2 text-right font-mono tabular text-ink-soft">{pct(row.share)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}

function SpecialistsCard({ report }: { report: BrandReport }) {
  return (
    // Internal: who needs coaching is not something to print for the client.
    <Card className="p-5 sm:p-6 print:hidden">
      <h2 className="font-semibold">By specialist</h2>
      <p className="mb-4 mt-0.5 text-sm text-muted">Last {REPORT_WEEKS} weeks on this brand. Internal, not printed.</p>
      <ul className="space-y-3">
        {report.specialists.map((s) => (
          <li key={s.authorId} className="flex items-center gap-3 text-sm">
            <span className="min-w-0 flex-1 truncate">{s.name}</span>
            {s.critical > 0 && (
              <span className="text-xs text-score-1" title="Reviews with an account-risk issue">{s.critical} critical</span>
            )}
            <span className="w-16 text-right text-xs text-muted">{s.reviews} reviews</span>
            <span className={`w-10 text-right font-mono font-semibold tabular ${SCORE_TONE[bandFor(s.average)].text}`}>
              {s.average.toFixed(2)}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
