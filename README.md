# Sellervate QA

Internal tool for reviewing support replies after they went out: a team lead scores a
reply against the brand's standard, the specialist reads the feedback, and the brand
page turns those scores into a trend you can show a client.

## Run it

Requirements: Node 20+, Docker running.

```bash
git clone <repo> && cd sellervate-qa
npm install
cp .env.example .env.local     # local Supabase defaults, nothing to fill in
npx supabase start             # first run pulls Docker images (a few minutes)
npm run dev                    # http://localhost:3000
```
