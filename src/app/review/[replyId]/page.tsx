import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Card, ReplyText } from '@/components/ui';
import { formatDate, formatDuration, formatSentAt, parseWindow } from '@/lib/time';
import { getReviewTarget, listIssueTypes } from '@/server/review-queue';
import { requireLead } from '@/server/viewer';
import { ReviewForm } from './review-form';

export const metadata: Metadata = { title: 'Review a reply' };

export default async function ReviewPage({ params, searchParams }: PageProps<'/review/[replyId]'>) {
  const viewer = await requireLead();
  const [{ replyId }, query] = await Promise.all([params, searchParams]);
  const window = parseWindow(query.window);
  const brand = typeof query.brand === 'string' ? query.brand : undefined;

  const [target, issueTypes] = await Promise.all([getReviewTarget(viewer, replyId), listIssueTypes(viewer)]);
  if (!target) notFound();

  const backHref = `/queue?${new URLSearchParams({ window, ...(brand ? { brand } : {}) })}`;

  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-4">
        <Link href={backHref} className="text-sm font-medium text-muted hover:text-ink">← Back to queue</Link>
        {target.myReview && (
          <span className="text-xs text-muted">You reviewed this on {formatDate(target.myReview.updatedAt)}</span>
        )}
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{target.brand.name}</p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight">{target.ticket.subject}</h1>
          </div>

          <Card className="bg-sunken/60 p-5">
            <p className="text-xs font-medium text-muted">
              {target.ticket.customerName} wrote · {formatSentAt(target.ticket.openedAt)}
            </p>
            <p className="mt-2 whitespace-pre-line text-ink-soft">{target.ticket.message}</p>
          </Card>

          <Card className="p-5 sm:p-6">
            <div className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
              <span className="font-semibold text-ink">{target.author.name}</span>
              <span>replied</span>
              <span aria-hidden>·</span>
              <span>{formatSentAt(target.sentAt)}</span>
              <span aria-hidden>·</span>
              <span>after {formatDuration(target.responseMs)}</span>
            </div>
            <ReplyText>{target.body}</ReplyText>
          </Card>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6">
          <Card className="p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">The {target.brand.name} standard</p>
            <ul className="mt-2 space-y-1.5 text-sm text-ink-soft">
              {target.brand.standard.split('\n').map((line) => (
                <li key={line} className="flex gap-2">
                  <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-muted" />
                  {line}
                </li>
              ))}
            </ul>
          </Card>
          <Card className="p-4">
            <ReviewForm
              key={target.id}
              replyId={target.id}
              issueTypes={issueTypes}
              initial={target.myReview}
              window={window}
              brand={brand}
            />
          </Card>
        </aside>
      </div>
    </>
  );
}
