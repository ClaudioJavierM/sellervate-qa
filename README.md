# Sellervate QA

An internal tool for judging support replies after they went out. A team lead scores a
sample of yesterday's replies against the brand's own standard; the specialist reads the
score and the note; the brand page turns those scores into a trend, the recurring issues
behind it, and the changes made in response, which is what you show a client who asks
whether things are getting better.

It is not a helpdesk. Nobody writes to a customer here.

**Time spent:** ~5.5 hours, in one session on 23 Sep 2026, from reading the brief to the last merge. Claude Code wrote the code; my time went into choosing the reading and the review workflow, reviewing each PR and testing the app. · **Starter:** `create-next-app` (Next.js 16, App Router, TypeScript, Tailwind 4). No other boilerplate.
Reasoning, trade-offs and what was cut: [DECISIONS.md](DECISIONS.md).

## Run it

Needs Node 20+ and Docker running.

```bash
git clone <this repo> sellervate-qa && cd sellervate-qa
npm install
cp .env.example .env.local   # local Supabase defaults, nothing to fill in
npx supabase start           # first run pulls images (~3-5 min); applies migrations + seed
npm run dev                  # http://localhost:3000
```

Open the app and pick who you are. If port 3000 is taken, Next prints the port it used.

## Being each role

Sign-in is a stubbed person picker (**Switch person**, top right). What each person can see is
enforced by Postgres row-level security, not by the UI.

| Person | Role | Start here |
|---|---|---|
| Marta Iglesias | Leads Voltra and Packwell | Review queue → review a reply → Voltra / Packwell report |
| Nuria Campos | Leads Lumen Skin | Same, one brand |
| Dani Ortega | Writes for Voltra, Packwell | My feedback |
| Aisha Bello | Writes for Voltra, Lumen Skin | My feedback |
| Tomás Reyes | Writes for Packwell, Lumen Skin | My feedback |

Worth trying: as Marta, open `/brands/lumen` or a Lumen reply URL (not found); as Dani, open
`/queue` or `/brands/voltra` (sent back to his own feedback).

### Asking the API directly

The browser never talks to Supabase; the Next server does, with a JWT for the signed-in
person. The same rules hold if you skip the app and call PostgREST yourself:

```bash
set -a; source .env.local; set +a

# Anonymous: denied
curl -s "http://127.0.0.1:54321/rest/v1/replies?limit=1" -H "apikey: $SUPABASE_ANON_KEY"

# As Dani (copy the sv_session cookie from the browser after switching to him):
# returns only his own replies, nothing from Aisha or Tomás
curl -s "http://127.0.0.1:54321/rest/v1/replies?select=author_id" \
  -H "apikey: $SUPABASE_ANON_KEY" -H "Authorization: Bearer <sv_session value>"
```

`npm run db:test` runs `supabase/tests/isolation.test.sql`: 19 pgTAP checks of cross-brand and
cross-specialist access, including through the `save_review` function.

## Seed data

Everything is invented. Three brands that deliberately do not sound alike (Voltra, electric
scooters: diagnose at length; Packwell, B2B packaging: three lines, exact; Lumen Skin: warm,
ingredient-exact, never medical advice), two leads, three specialists, about 470 replies over
12 weeks and 260 reviews. Every reply is hand-written in a good, a weak and a bad version per
scenario; `scripts/seed/generate.mjs` spreads them over the quarter with a slow improvement and
a few stories that line up with dated brand changes. Timestamps are relative to `now()`, so
"yesterday" always has replies waiting.

```bash
npm run seed:generate   # rewrite supabase/seed.sql from scripts/seed/content.mjs
npm run db:reset        # re-apply migrations + seed
```

## Layout

```text
supabase/migrations/   schema, RLS, save_review(), demo_personas() (the auth stub)
supabase/tests/        pgTAP isolation tests
scripts/seed/          invented content + deterministic generator
src/server/            server-only: session, per-request DB client, data access per screen
src/lib/               pure code: time windows (team timezone), scores, report aggregation
src/app/               routes: sign-in, queue, review/[replyId], brands/[slug], feedback
```

## Scripts

`npm run dev` · `npm run build` · `npm run lint` · `npm run db:reset` · `npm run db:test` ·
`npm run db:types` (regenerate `src/server/database.types.ts`) · `npm run seed:generate`
