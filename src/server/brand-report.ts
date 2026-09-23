import 'server-only';
import {
  bySpecialist, compareAverage, compareSeverityRate, issueFrequency, reportStart, splitPeriods, weeklyTrend,
  type IssueInfo, type ReviewFact,
} from '@/lib/report';
import type { Score } from '@/lib/scores';
import { listIssueTypes } from './review-queue';
import type { Viewer } from './viewer';

export const REPORT_WEEKS = 12;
const COMPARE_WEEKS = 6;
const EVIDENCE_LIMIT = 12;

export async function getBrandReport(viewer: Viewer, slug: string, issueFilter?: string) {
  // Leads only, and only their own brands. RLS would return empty sets for
  // anyone else; this turns that into a clean 404 instead of an empty report.
  const brand = viewer.leads.find((b) => b.slug === slug);
  if (!brand) return null;

  const from = reportStart(REPORT_WEEKS * 2).toISOString(); // two periods, for comparisons

  const [reviews, replies, changes, issueTypes] = await Promise.all([
    viewer.db
      .from('reviews')
      .select(`id, score, note, created_at,
        reviewer:people!reviews_reviewer_id_fkey(full_name),
        reply:replies!reviews_reply_id_brand_id_fkey!inner(id, sent_at, body,
          author:people!replies_author_id_fkey(id, full_name),
          ticket:tickets!replies_ticket_id_brand_id_fkey(subject)),
        review_issues(issue_key)`)
      .eq('brand_id', brand.id)
      .gte('reply.sent_at', from),
    viewer.db
      .from('replies')
      .select('sent_at')
      .eq('brand_id', brand.id)
      .gte('sent_at', reportStart(REPORT_WEEKS).toISOString()),
    viewer.db
      .from('brand_changes')
      .select('id, effective_on, summary, author:people!brand_changes_author_id_fkey(full_name)')
      .eq('brand_id', brand.id)
      .order('effective_on', { ascending: true }),
    listIssueTypes(viewer),
  ]);
  if (reviews.error) throw reviews.error;
  if (replies.error) throw replies.error;
  if (changes.error) throw changes.error;

  const issues: IssueInfo[] = issueTypes.map(({ key, label, severity }) => ({ key, label, severity }));
  const facts: (ReviewFact & { id: string })[] = reviews.data.flatMap((r) =>
    r.reply?.author
      ? [{
          id: r.id,
          score: r.score,
          sentAt: r.reply.sent_at,
          authorId: r.reply.author.id,
          authorName: r.reply.author.full_name,
          issues: r.review_issues.map((i) => i.issue_key),
        }]
      : []);

  const recent = splitPeriods(facts, 4);
  const halves = splitPeriods(facts, COMPARE_WEEKS);
  const inReport = splitPeriods(facts, REPORT_WEEKS).current;

  const evidence = reviews.data
    .filter((r) => r.reply && (!issueFilter || r.review_issues.some((i) => i.issue_key === issueFilter)))
    .sort((a, b) => b.reply!.sent_at.localeCompare(a.reply!.sent_at))
    .slice(0, EVIDENCE_LIMIT)
    .map((r) => ({
      reviewId: r.id,
      replyId: r.reply!.id,
      subject: r.reply!.ticket?.subject ?? '',
      body: r.reply!.body,
      sentAt: r.reply!.sent_at,
      author: r.reply!.author?.full_name ?? '',
      reviewer: r.reviewer?.full_name ?? '',
      score: r.score as Score,
      note: r.note,
      issues: r.review_issues.map((i) => i.issue_key),
    }));

  return {
    brand,
    issues,
    trend: weeklyTrend(inReport, replies.data.map((r) => r.sent_at), REPORT_WEEKS),
    average: compareAverage(recent.current, recent.previous),
    criticalRate: compareSeverityRate(recent.current, recent.previous, issues, 'critical'),
    coverage: { reviewed: inReport.length, replies: replies.data.length },
    issueRows: issueFrequency(halves.current, halves.previous, issues),
    specialists: bySpecialist(inReport, issues),
    changes: changes.data.map((c) => ({
      id: c.id, effectiveOn: c.effective_on, summary: c.summary, author: c.author?.full_name ?? '',
    })),
    evidence,
    compareWeeks: COMPARE_WEEKS,
  };
}

export type BrandReport = NonNullable<Awaited<ReturnType<typeof getBrandReport>>>;
