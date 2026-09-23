// Generates supabase/seed.sql from content.mjs.
//
//   node scripts/seed/generate.mjs
//
// Deterministic (fixed PRNG seed) so every reviewer gets the same data. All
// timestamps are written relative to now() so "yesterday's replies" are always
// yesterday's, whenever the database is reset.

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  brands, brandChanges, customerNames, issueTypes, memberships, people,
} from './content.mjs';

const HISTORY_WEEKS = 12;
const TICKETS_PER_BRAND_WEEK = 12;
const REVIEWED_SHARE = 0.6;
const YESTERDAY_PER_BRAND = 10;
const TODAY_PER_BRAND = 3;

const MINUTE = 1;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

// mulberry32
let state = 20260923;
function rand() {
  state |= 0;
  state = (state + 0x6d2b79f5) | 0;
  let t = Math.imul(state ^ (state >>> 15), 1 | state);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const between = (min, max) => Math.floor(min + rand() * (max - min + 1));
const pick = (list) => list[Math.floor(rand() * list.length)];

const uuid = (prefix, n) => `${prefix}-0000-4000-8000-${n.toString(16).padStart(12, '0')}`;
const sql = (value) => `'${String(value).replaceAll("'", "''")}'`;
const ago = (minutes) => `now() - interval '${Math.round(minutes)} minutes'`;

const personId = Object.fromEntries(people.map((p, i) => [p.key, uuid('a0000000', i + 1)]));
const brandId = Object.fromEntries(brands.map((b, i) => [b.slug, uuid('b0000000', i + 1)]));
const firstName = Object.fromEntries(people.map((p) => [p.key, p.full_name.split(' ')[0]]));
const leadOf = Object.fromEntries(
  memberships.filter((m) => m.role === 'lead').map((m) => [m.brand, m.person]),
);
const specialistsOf = (slug) =>
  memberships.filter((m) => m.brand === slug && m.role === 'specialist').map((m) => m.person);

// Quality drifts up over the quarter; a few known problems are concentrated
// before the change that fixed them (see brandChanges), so the trend and the
// change log tell the same story.
function chooseVersion({ brand, scenarioIndex, specialist, weeksAgo }) {
  const progress = (HISTORY_WEEKS - weeksAgo) / HISTORY_WEEKS; // 0 oldest -> 1 now
  let pBad = 0.24 - 0.17 * progress;
  let pWeak = 0.34 - 0.14 * progress;

  if (brand === 'voltra' && scenarioIndex === 3 && specialist === 'dani') {
    if (weeksAgo > 8) { pBad = 0.75; pWeak = 0.15; } else { pBad = 0.03; }
  }
  if (brand === 'lumen' && scenarioIndex === 0 && weeksAgo > 5) { pBad = 0.35; pWeak = 0.35; }
  if (brand === 'packwell' && [0, 4].includes(scenarioIndex) && weeksAgo > 6) { pWeak = 0.55; }

  const roll = rand();
  if (roll < pBad) return 'bad';
  if (roll < pBad + pWeak) return 'weak';
  return 'good';
}

function scoreFor(version) {
  if (version === 'good') return rand() < 0.55 ? 4 : 3;
  if (version === 'weak') return rand() < 0.75 ? 2 : 3;
  return rand() < 0.7 ? 1 : 2;
}

const fill = (text, vars) =>
  text.replaceAll('{name}', vars.name).replaceAll('{order}', vars.order).replaceAll('{sig}', vars.sig);

const tickets = [];
const replies = [];
const reviews = [];
const reviewIssues = [];
let ticketN = 0;
let reviewN = 0;

function addReply({ brand, sentMinutesAgo, weeksAgo, reviewed, forceVersion }) {
  const specialist = pick(specialistsOf(brand.slug));
  // Before the order-history fix, Dani's Voltra queue was heavy on WISMO tickets.
  const scenarioIndex = brand.slug === 'voltra' && specialist === 'dani' && weeksAgo > 8 && rand() < 0.4
    ? 3
    : between(0, brand.scenarios.length - 1);
  const scenario = brand.scenarios[scenarioIndex];
  const version = forceVersion ?? chooseVersion({ brand: brand.slug, scenarioIndex, specialist, weeksAgo });
  const variant = scenario[version];

  ticketN += 1;
  const vars = {
    name: pick(customerNames),
    order: `${brand.orderPrefix}${between(10000, 99999)}`,
    sig: firstName[specialist],
  };
  const waited = variant.slow ? between(26 * HOUR, 34 * HOUR) : between(...brand.responseMinutes);
  const ticketId = uuid('c0000000', ticketN);
  const replyId = uuid('d0000000', ticketN);

  tickets.push(`(${sql(ticketId)}, ${sql(brandId[brand.slug])}, 'seed', ${sql(`${brand.slug}-t${ticketN}`)}, `
    + `${sql(scenario.subject)}, ${sql(vars.name)}, ${sql(fill(scenario.message, vars))}, ${ago(sentMinutesAgo + waited)})`);
  replies.push(`(${sql(replyId)}, ${sql(ticketId)}, ${sql(brandId[brand.slug])}, ${sql(personId[specialist])}, 'seed', `
    + `${sql(`${brand.slug}-r${ticketN}`)}, ${sql(fill(variant.body, vars))}, ${ago(sentMinutesAgo)})`);

  if (!reviewed) return;
  reviewN += 1;
  const reviewId = uuid('e0000000', reviewN);
  const score = scoreFor(version);
  const note = version === 'good' && rand() < 0.3 ? '' : variant.note;
  const reviewedMinutesAgo = Math.max(sentMinutesAgo - between(10 * HOUR, 40 * HOUR), 30);
  reviews.push(`(${sql(reviewId)}, ${sql(replyId)}, ${sql(brandId[brand.slug])}, ${sql(personId[leadOf[brand.slug]])}, `
    + `${score}, ${sql(note)}, ${ago(reviewedMinutesAgo)}, ${ago(reviewedMinutesAgo)})`);
  for (const issue of variant.issues ?? []) {
    reviewIssues.push(`(${sql(reviewId)}, ${sql(issue)})`);
  }
}

for (const brand of brands) {
  for (let weeksAgo = HISTORY_WEEKS; weeksAgo >= 1; weeksAgo -= 1) {
    for (let i = 0; i < TICKETS_PER_BRAND_WEEK; i += 1) {
      const sentMinutesAgo = 2 * DAY + (weeksAgo - 1) * WEEK + between(0, WEEK);
      addReply({ brand, sentMinutesAgo, weeksAgo, reviewed: rand() < REVIEWED_SHARE });
    }
  }
  // Yesterday's output: what a lead opens on Monday morning. Unreviewed, with
  // one reply that is plainly bad so the loop has something to catch.
  for (let i = 0; i < YESTERDAY_PER_BRAND; i += 1) {
    addReply({
      brand,
      sentMinutesAgo: between(20 * HOUR, 44 * HOUR),
      weeksAgo: 0,
      reviewed: false,
      forceVersion: i === 0 ? 'bad' : undefined,
    });
  }
  for (let i = 0; i < TODAY_PER_BRAND; i += 1) {
    addReply({ brand, sentMinutesAgo: between(30, 6 * HOUR), weeksAgo: 0, reviewed: false });
  }
}

const out = [];
out.push('-- Generated by scripts/seed/generate.mjs. Do not edit by hand.');
out.push('-- All names, brands, tickets and replies are invented.\n');

out.push('insert into public.issue_types (key, label, description, severity, position) values');
out.push(issueTypes.map((t, i) =>
  `  (${sql(t.key)}, ${sql(t.label)}, ${sql(t.description)}, ${sql(t.severity)}, ${i + 1})`).join(',\n') + ';\n');

out.push('insert into public.people (id, full_name, email) values');
out.push(people.map((p) => `  (${sql(personId[p.key])}, ${sql(p.full_name)}, ${sql(p.email)})`).join(',\n') + ';\n');

out.push('insert into public.brands (id, slug, name, standard) values');
out.push(brands.map((b) => `  (${sql(brandId[b.slug])}, ${sql(b.slug)}, ${sql(b.name)}, ${sql(b.standard)})`).join(',\n') + ';\n');

out.push('insert into public.brand_members (brand_id, person_id, role) values');
out.push(memberships.map((m) => `  (${sql(brandId[m.brand])}, ${sql(personId[m.person])}, ${sql(m.role)})`).join(',\n') + ';\n');

out.push('insert into public.tickets (id, brand_id, source, external_id, subject, customer_name, customer_message, opened_at) values');
out.push(tickets.map((row) => `  ${row}`).join(',\n') + ';\n');

out.push('insert into public.replies (id, ticket_id, brand_id, author_id, source, external_id, body, sent_at) values');
out.push(replies.map((row) => `  ${row}`).join(',\n') + ';\n');

out.push('insert into public.reviews (id, reply_id, brand_id, reviewer_id, score, note, created_at, updated_at) values');
out.push(reviews.map((row) => `  ${row}`).join(',\n') + ';\n');

out.push('insert into public.review_issues (review_id, issue_key) values');
out.push(reviewIssues.map((row) => `  ${row}`).join(',\n') + ';\n');

out.push('insert into public.brand_changes (brand_id, author_id, effective_on, summary) values');
out.push(brandChanges.map((c) =>
  `  (${sql(brandId[c.brand])}, ${sql(personId[c.author])}, (now() - interval '${c.weeksAgo} weeks')::date, ${sql(c.summary)})`).join(',\n') + ';\n');

const target = fileURLToPath(new URL('../../supabase/seed.sql', import.meta.url));
writeFileSync(target, out.join('\n'));
console.log(`seed.sql: ${tickets.length} replies, ${reviews.length} reviews, ${reviewIssues.length} issue tags`);
