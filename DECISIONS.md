# Decisions

## Product

**The real problem.** Not that reviewing is slow: Marta's judgement leaves no trace. It lives in
Slack pings, so she can't coach from it, can't see a pattern (the order-history miss ran a month)
and can't answer a client with a number. And "good" differs per brand, so the record has to be
per brand, graded against that brand's standard.

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

**What I left out.** The coaching library (scored replies already carry the reasoning; it's an
"example" flag and a view). Calibration between leads (the schema allows it). Helpdesk import,
real auth, read/unread, editing brand changes, dark mode, a client share link (print stands in).

**Where a model would earn its place.** *Not* in scoring: Marta's judgement is the product. The
one place is **choosing which five to read**: flag replies likely to carry a *critical* issue
(a return with no diagnostic question, a policy figure that contradicts the brand's) and push
them into the suggested five. It sits before the human and its misses cost nothing worse than
today. Before trusting it: a few hundred reviews per brand, and flagged replies being judged
critical far more often than random ones, measured on the data this tool now collects.

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

**Authentication** is a person picker: the server signs a JWT (`sub` = person) with the Supabase
secret into an httpOnly cookie, and every query carries it, which is what RLS reads. Real auth
replaces that one function with Supabase Auth (staff SSO), maps `auth.users` to `people`,
deletes `demo_personas()` and adds offboarding. Policies don't change.

**What breaks first as this grows.** The brand report pulls 24 weeks of reviews and aggregates
in Node; past a few thousand reviews per brand that becomes a SQL view with a weekly rollup. RLS
helpers run per row; at volume the lead's brand list belongs in a JWT claim. The queue caps at
500 rows, which the "last 7 days" view will hit first.

## AI

Claude Code wrote all of the code and opened every pull request. My part was the decisions: the
reading of the brief (reviewing that produces proof), local Supabase, and how review would work.
It read the Next 16 docs bundled in `node_modules` before writing anything, because the
installed version is newer than its training.

**How review worked, and why.** Instead of me writing every PR review from scratch, the agent
does a first pass on each PR as a reviewer, posted and labelled as its own ("Agent review"):
what's good, what it's letting go and why, what must change. I read the PR and that review and
add my own sign-off or objection before merging. I'm saying so plainly because it isn't the
shape the brief asked for. It's the shape I'd actually use: the agent is a fast, tireless first
reviewer, and the merge decision stays mine.

**Where it was right, and where it was corrected.** It was right to insist on RLS as the only
boundary with no service-role client, and to prove it with pgTAP tests instead of asserting it.
It was wrong twice, and both times checking the running app caught it rather than reading the
diff: the first queue ordering handed all five suggestions to a single specialist, and the
first "print for the client" view still printed specialist names and internal coaching notes
(requested on #6, fixed in a follow-up commit on that branch).

> _Prompt that started it:_ "Vamos a trabajar en un nuevo proyecto, esta es la ruta del PDF que
> contiene todas las instrucciones, por favor analizar y completar." _Then: choosing the reading
> and the review workflow when it asked._ **(Author: adjust this section so it's accurate.)**

## Status

**Done:** the lead's loop end to end, the brand report with change log and print view, the
specialist view, isolation tests, seed.
**Half done:** the print view is a stand-in for a client-facing report; the queue's "reviewed"
state ignores a second reviewer.
**Not touched:** everything under "What I left out".
**Order:** real auth → import from one helpdesk → specialist read/unread → coaching library →
calibration.

**What I'd test first:** `src/lib/report.ts` week bucketing across DST changes: pure, and it's
what the client sees. The isolation tests were worth more in hour five.

**The one thing I'd flag hardest in someone else's PR:** the Next server holds the JWT secret
and will sign a token for anyone you pick. Any bug in the sign-in action is a full
impersonation bug, and the same secret can mint a `service_role` token. I left it because the
brief asked for stubbed auth and real enforcement, and this is the smallest thing that gets
RLS a real identity. It's the first thing to delete.
