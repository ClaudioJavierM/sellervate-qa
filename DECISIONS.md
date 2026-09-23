# Decisions

## Product

**The real problem.** Not "reviewing is slow". Marta can already tell a good reply in three
reads. The problem is that her judgement leaves no trace: it lives in Slack pings, so she cannot
coach from it, cannot see a pattern (the order-history miss ran for a month) and cannot answer a
client with a number. The same paragraph is excellent for one brand and wrong for another, so
any record has to be per brand and graded against that brand's standard.

**What I built first, and why.** I read it as *reviewing that produces proof*: the loop and
the brand report, in that order, and nothing that doesn't feed one of them.

- **The loop** (`/queue` → `/review/:id`). Yesterday's replies; the top five suggested
  round-robin across specialists, least reviewed first, so "five a day" doesn't mean whoever was
  busiest. The brand's standard sits beside the form; issues are grouped by *consequence* (risks
  the account / customer writes back / polish, straight from the notes). Keys 1–4, save → next.
- **The proof** (`/brands/:slug`). A 4-week rolling average (at ~7 reviews a week, one week is
  noise), the account-risk rate, recurring issues linking to their evidence, and a dated
  **change log** drawn on the chart: without "what we changed", a trend explains nothing.
- **The specialist's view** (`/feedback`), because the notes say it must exist and it's cheap
  once the data is right.

**What I left out.** The coaching library (scored replies already carry the reasoning; a
"use as example" flag plus a filtered view is the V2, not a new model). Calibration between
two leads (the schema allows two reviews per reply for exactly this). Helpdesk import. Real
auth. Read/unread for specialists. Editing or deleting a brand change. Dark mode. A
client-facing share link: printing the report is the stand-in.

**Where a model would earn its place.** *Not* in scoring: the value is Marta's judgement and a
model grading replies would erode the thing the client pays for. The one place I'd put one is
**choosing which five to read**: a classifier that flags replies likely to carry a *critical*
issue (a return offered with no diagnostic question, a policy number that contradicts the
brand's policy) and pushes them into the suggested five. It sits before the human, never
replaces them, and its misses cost nothing worse than today. Before trusting it: a few hundred
reviewed replies per brand, and evidence that flagged replies are reviewed as critical far more
often than random ones. Measured against the review data this tool is now collecting.

**Before V2 I'd ask:** does the client see specialist names? Should specialists see a review at
once or when the lead publishes a batch? Do leads need to calibrate? Which helpdesks, and is the
unit a reply or the whole conversation?

## Architecture

**Shape.** Server components read through a server-only data layer (`src/server/*`, one module
per screen, plain DTOs); server actions re-check the caller; aggregation is pure functions in
`src/lib/report.ts`. The browser never holds a Supabase key.

**Data model.** `brands` are the tenant. `people` have no global role; `brand_members(role)` is
per brand, because Marta leads some brands and could write for another. `tickets` → `replies`
→ `reviews` → `review_issues`, every row carrying `brand_id`, with **composite foreign keys**
(`(reply_id, brand_id) → replies(id, brand_id)`) so a child can never point into another brand
even if a caller lies about `brand_id`. `issue_types` is a table, not an enum: adding a type is
an insert, not a migration you can't run in three months. `source + external_id` is unique per
brand on tickets and replies, so a future helpdesk import is an idempotent upsert. Reviews are
unique per `(reply, reviewer)`, leaving room for calibration. Trends bucket by when the reply
was **sent**, not reviewed: that is the question a client asks.

**Authorisation** is enforced in Postgres with RLS, in `supabase/migrations/…_row_level_security.sql`.
A lead sees everything under brands they lead; a specialist sees their own replies, the tickets
those answer, and reviews of their own replies, not even brand averages; anon sees nothing.
Grants are revoked and re-granted minimally (a review's `score`/`note` are the only updatable
columns). The app checks again for clean 404s, but there is no service-role client, so a missing
check in TypeScript fails closed. 19 pgTAP tests try to break it (`npm run db:test`).

**Authentication** is a person picker. Choosing a person makes the server sign a JWT
(`sub` = person, `role` = authenticated) with the Supabase JWT secret and set it as an httpOnly
cookie; each request builds a Supabase client carrying it, which is what RLS reads. Real auth
replaces that one function with Supabase Auth (staff SSO), maps `auth.users` to `people`,
deletes `demo_personas()` and adds offboarding. Policies don't change.

**What breaks first as this grows.** The brand report pulls 24 weeks of reviews and aggregates
in Node; past a few thousand reviews per brand that becomes a SQL view with a weekly rollup. RLS
helpers run per row; at volume the lead's brand list belongs in a JWT claim. The queue caps at
500 rows, which the "last 7 days" view will hit first.

## AI

_Edit this section so it describes how you actually worked. Draft of what happened:_

I used Claude Code for all of the code. My input was the reading of the brief, the priorities
and the review of every pull request. I had it read the Next 16 docs bundled in
`node_modules` before writing anything, since the installed version is newer than the model's
training. What worked: stating the security model before the schema (RLS as the boundary, no
service role), then asking for a pgTAP test that tries to break it, and checking every screen
against screenshots rather than trusting the diff. Where it was wrong and I overrode it: the
first queue ordering sent all five suggestions to one specialist (visible only on screen); the
first print view still exposed specialist names and internal notes; _add your own_.

> _Paste the prompt or session excerpt you're most pleased with._

## Status

**Done:** the lead's loop end to end, the brand report with change log and print view, the
specialist view, isolation tests, seed.
**Half done:** the print view is a stand-in for a client-facing report; the queue's "reviewed"
state ignores a second reviewer.
**Not touched:** helpdesk import, coaching library, calibration, real auth, specialist
read/unread, editing or deleting brand changes, dark mode.
**Order:** real auth → import from one helpdesk → specialist read/unread → coaching library →
calibration.

**What I'd test first:** `src/lib/report.ts` bucketing, particularly weeks that cross a DST
change. It's pure and it's what the client sees, but the isolation tests were worth more
in hour five.

**The one thing I'd flag hardest in someone else's PR:** the Next server holds the JWT secret
and will sign a token for anyone you pick. Any bug in the sign-in action is a full
impersonation bug, and the same secret can mint a `service_role` token. I left it because the
brief asked for stubbed auth and real enforcement, and this is the smallest thing that gets
RLS a real identity. It's the first thing to delete.
