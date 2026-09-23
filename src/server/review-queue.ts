import 'server-only';
import type { Score, Severity } from '@/lib/scores';
import { windowRange, type Window } from '@/lib/time';
import type { BrandRef, Viewer } from './viewer';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EXCERPT_LENGTH = 180;

export type QueueFilter = { window: Window; brandSlug?: string };

export type QueueItem = {
  id: string;
  brand: BrandRef;
  author: { id: string; name: string };
  subject: string;
  excerpt: string;
  sentAt: string;
  responseMs: number;
  score: Score | null;
};

export type Coverage = { authorId: string; name: string; reviewedLast7Days: number };

/** Brands in scope for a lead, or null if they asked for one they don't lead. */
function brandsInScope(viewer: Viewer, brandSlug?: string): BrandRef[] | null {
  if (!brandSlug) return viewer.leads;
  const brand = viewer.leads.find((b) => b.slug === brandSlug);
  return brand ? [brand] : null;
}

/**
 * Replies sent in the window for the brands this lead runs. Unreviewed first,
 * and among those the specialists reviewed least in the last 7 days come
 * first, so reading "the top five" spreads attention across the team instead
 * of landing on whoever was busiest.
 */
export async function getQueue(viewer: Viewer, filter: QueueFilter) {
  const brands = brandsInScope(viewer, filter.brandSlug);
  if (!brands) return null;
  const brandIds = brands.map((b) => b.id);
  const brandById = new Map(brands.map((b) => [b.id, b]));
  const { from, to } = windowRange(filter.window);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60_000).toISOString();

  const [replies, recentReviews] = await Promise.all([
    viewer.db
      .from('replies')
      .select(`id, body, sent_at, brand_id,
        author:people!replies_author_id_fkey(id, full_name),
        ticket:tickets!replies_ticket_id_brand_id_fkey(subject, opened_at),
        reviews(score)`)
      .in('brand_id', brandIds)
      .gte('sent_at', from.toISOString())
      .lt('sent_at', to.toISOString())
      .order('sent_at', { ascending: false })
      .limit(500),
    viewer.db
      .from('reviews')
      .select('reply:replies!reviews_reply_id_brand_id_fkey(author:people!replies_author_id_fkey(id, full_name))')
      .in('brand_id', brandIds)
      .gte('created_at', weekAgo),
  ]);
  if (replies.error) throw replies.error;
  if (recentReviews.error) throw recentReviews.error;

  const coverage = new Map<string, Coverage>();
  const count = (id: string, name: string, add: number) => {
    const entry = coverage.get(id) ?? { authorId: id, name, reviewedLast7Days: 0 };
    entry.reviewedLast7Days += add;
    coverage.set(id, entry);
  };
  for (const row of recentReviews.data) {
    if (row.reply?.author) count(row.reply.author.id, row.reply.author.full_name, 1);
  }

  const items: QueueItem[] = replies.data.flatMap((r) => {
    const brand = brandById.get(r.brand_id);
    if (!brand || !r.author || !r.ticket) return [];
    count(r.author.id, r.author.full_name, 0);
    return [{
      id: r.id,
      brand,
      author: { id: r.author.id, name: r.author.full_name },
      subject: r.ticket.subject,
      excerpt: r.body.length > EXCERPT_LENGTH ? `${r.body.slice(0, EXCERPT_LENGTH).trimEnd()}…` : r.body,
      sentAt: r.sent_at,
      responseMs: new Date(r.sent_at).getTime() - new Date(r.ticket.opened_at).getTime(),
      score: (r.reviews[0]?.score ?? null) as Score | null,
    }];
  });

  const toReview = roundRobin(items.filter((i) => i.score === null), coverage);
  const reviewed = items.filter((i) => i.score !== null);

  return {
    brands,
    toReview,
    reviewed,
    coverage: [...coverage.values()].sort((a, b) => a.reviewedLast7Days - b.reviewedLast7Days),
  };
}

/**
 * One reply per specialist per round, least-reviewed specialist first, newest
 * reply first within a specialist. Sorting by coverage alone would hand the
 * whole top five to a single person.
 */
function roundRobin(items: QueueItem[], coverage: Map<string, Coverage>): QueueItem[] {
  const byAuthor = new Map<string, QueueItem[]>();
  for (const item of items) {
    byAuthor.set(item.author.id, [...(byAuthor.get(item.author.id) ?? []), item]);
  }
  const seen = (authorId: string) => coverage.get(authorId)?.reviewedLast7Days ?? 0;
  const lanes = [...byAuthor.entries()]
    .sort(([a], [b]) => seen(a) - seen(b))
    .map(([, list]) => list.sort((x, y) => y.sentAt.localeCompare(x.sentAt)));

  const ordered: QueueItem[] = [];
  for (let round = 0; ordered.length < items.length; round += 1) {
    for (const lane of lanes) if (lane[round]) ordered.push(lane[round]);
  }
  return ordered;
}

export async function nextReplyToReview(viewer: Viewer, filter: QueueFilter, excludeId: string) {
  const queue = await getQueue(viewer, filter);
  return queue?.toReview.find((i) => i.id !== excludeId)?.id ?? null;
}

export type IssueType = { key: string; label: string; description: string; severity: Severity };

export async function listIssueTypes(viewer: Viewer): Promise<IssueType[]> {
  const { data, error } = await viewer.db
    .from('issue_types')
    .select('key, label, description, severity')
    .is('retired_at', null)
    .order('position');
  if (error) throw error;
  return data as IssueType[];
}

/** One reply with everything a lead needs to judge it, or null if not theirs. */
export async function getReviewTarget(viewer: Viewer, replyId: string) {
  if (!UUID.test(replyId)) return null;

  const { data: reply, error } = await viewer.db
    .from('replies')
    .select(`id, body, sent_at, brand_id,
      author:people!replies_author_id_fkey(id, full_name),
      ticket:tickets!replies_ticket_id_brand_id_fkey(subject, customer_name, customer_message, opened_at),
      reviews(id, score, note, reviewer_id, updated_at, review_issues(issue_key))`)
    .eq('id', replyId)
    .maybeSingle();
  if (error) throw error;

  // RLS already hides other brands. This also keeps a lead who happens to
  // write replies on another brand from reviewing their own work there.
  const brand = reply && viewer.leads.find((b) => b.id === reply.brand_id);
  if (!reply || !brand || !reply.author || !reply.ticket) return null;

  const { data: standard } = await viewer.db.from('brands').select('standard').eq('id', brand.id).single();
  const mine = reply.reviews.find((r) => r.reviewer_id === viewer.id) ?? null;

  return {
    id: reply.id,
    brand: { ...brand, standard: standard?.standard ?? '' },
    author: { id: reply.author.id, name: reply.author.full_name },
    ticket: {
      subject: reply.ticket.subject,
      customerName: reply.ticket.customer_name,
      message: reply.ticket.customer_message,
      openedAt: reply.ticket.opened_at,
    },
    body: reply.body,
    sentAt: reply.sent_at,
    responseMs: new Date(reply.sent_at).getTime() - new Date(reply.ticket.opened_at).getTime(),
    myReview: mine && {
      score: mine.score as Score,
      note: mine.note,
      issues: mine.review_issues.map((i) => i.issue_key),
      updatedAt: mine.updated_at,
    },
  };
}

export type ReviewTarget = NonNullable<Awaited<ReturnType<typeof getReviewTarget>>>;
