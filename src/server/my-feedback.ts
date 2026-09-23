import 'server-only';
import { compareAverage, issueFrequency, splitPeriods, type IssueInfo, type ReviewFact } from '@/lib/report';
import type { Score } from '@/lib/scores';
import { listIssueTypes } from './review-queue';
import type { Viewer } from './viewer';

const LIMIT = 20;

/**
 * Reviews of the viewer's own replies. RLS already limits a pure specialist to
 * these, but a person who leads one brand and writes for another could read
 * every review on the brand they lead, so "mine" is filtered explicitly here.
 */
export async function getMyFeedback(viewer: Viewer, brandSlug?: string) {
  const brand = brandSlug ? viewer.writesFor.find((b) => b.slug === brandSlug) : undefined;
  if (brandSlug && !brand) return null;

  let query = viewer.db
    .from('reviews')
    .select(`id, score, note, updated_at, brand_id,
      reviewer:people!reviews_reviewer_id_fkey(full_name),
      reply:replies!reviews_reply_id_brand_id_fkey!inner(id, sent_at, body, author_id,
        ticket:tickets!replies_ticket_id_brand_id_fkey(subject, customer_message)),
      review_issues(issue_key)`)
    .eq('reply.author_id', viewer.id)
    .order('updated_at', { ascending: false });
  if (brand) query = query.eq('brand_id', brand.id);

  const [{ data, error }, issueTypes] = await Promise.all([query, listIssueTypes(viewer)]);
  if (error) throw error;

  const issues: IssueInfo[] = issueTypes.map(({ key, label, severity }) => ({ key, label, severity }));
  const brandName = new Map(viewer.writesFor.map((b) => [b.id, b.name]));

  const facts: ReviewFact[] = data.map((r) => ({
    score: r.score,
    sentAt: r.reply.sent_at,
    authorId: viewer.id,
    authorName: viewer.fullName,
    issues: r.review_issues.map((i) => i.issue_key),
  }));

  const perBrand = (brand ? [brand] : viewer.writesFor).map((b) => {
    const mine = facts.filter((_, i) => data[i].brand_id === b.id);
    const { current, previous } = splitPeriods(mine, 4);
    return { brand: b, ...compareAverage(current, previous), total: mine.length };
  });
  const { current, previous } = splitPeriods(facts, 6);

  return {
    brand,
    perBrand,
    topIssues: issueFrequency(current, previous, issues).filter((r) => r.current > 0).slice(0, 3),
    issues,
    reviews: data.slice(0, LIMIT).map((r) => ({
      id: r.id,
      brandName: brandName.get(r.brand_id) ?? '',
      score: r.score as Score,
      note: r.note,
      reviewer: r.reviewer?.full_name ?? '',
      reviewedAt: r.updated_at,
      subject: r.reply.ticket?.subject ?? '',
      customerMessage: r.reply.ticket?.customer_message ?? '',
      body: r.reply.body,
      sentAt: r.reply.sent_at,
      issues: r.review_issues.map((i) => i.issue_key),
    })),
    total: data.length,
  };
}
