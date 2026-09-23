-- Core schema for reviewing support replies after they were sent.
--
-- Tenancy: a brand is the isolation boundary. Every row that belongs to a brand
-- carries brand_id, and child rows pin it to their parent with a composite FK so
-- a reply can never point at another brand's ticket, nor a review at another
-- brand's reply.

create extension if not exists pgcrypto;

-- Everyone who can sign in. There is deliberately no global role column: what a
-- person may do depends on the brand (see brand_members).
create table public.people (
  id          uuid primary key default gen_random_uuid(),
  full_name   text not null,
  email       text not null unique,
  created_at  timestamptz not null default now()
);

create table public.brands (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  -- What "good" means for this brand, in a few lines. Shown next to every reply
  -- under review so two leads grade against the same standard.
  standard    text not null,
  created_at  timestamptz not null default now()
);

-- Role is per brand: someone can lead one brand and write replies for another.
create table public.brand_members (
  brand_id    uuid not null references public.brands (id) on delete cascade,
  person_id   uuid not null references public.people (id) on delete cascade,
  role        text not null check (role in ('lead', 'specialist')),
  created_at  timestamptz not null default now(),
  primary key (brand_id, person_id)
);
create index brand_members_person_idx on public.brand_members (person_id);

-- The customer's side of the conversation, as context for the reply.
-- source/external_id exist so a future helpdesk import can upsert idempotently
-- instead of duplicating rows ('seed' for invented data, later 'gorgias', ...).
create table public.tickets (
  id                uuid primary key default gen_random_uuid(),
  brand_id          uuid not null references public.brands (id) on delete restrict,
  source            text not null,
  external_id       text not null,
  subject           text not null,
  customer_name     text not null,
  customer_message  text not null,
  opened_at         timestamptz not null,
  created_at        timestamptz not null default now(),
  unique (brand_id, source, external_id),
  unique (id, brand_id)
);

-- A reply that already went out. Nobody writes these here; they are imported.
create table public.replies (
  id           uuid primary key default gen_random_uuid(),
  ticket_id    uuid not null,
  brand_id     uuid not null,
  author_id    uuid not null references public.people (id) on delete restrict,
  source       text not null,
  external_id  text not null,
  body         text not null,
  sent_at      timestamptz not null,
  created_at   timestamptz not null default now(),
  foreign key (ticket_id, brand_id) references public.tickets (id, brand_id) on delete restrict,
  unique (brand_id, source, external_id),
  unique (id, brand_id)
);
create index replies_brand_sent_idx on public.replies (brand_id, sent_at desc);
create index replies_author_sent_idx on public.replies (author_id, sent_at desc);

-- What can be wrong with a reply. A table, not an enum, so adding or retiring a
-- type is an insert/update rather than a type migration. Global on purpose: the
-- same vocabulary across brands is what makes brands comparable.
create table public.issue_types (
  key          text primary key,
  label        text not null,
  description  text not null,
  -- critical: puts the account at risk (wrong facts, skipped procedure)
  -- major:    the customer will have to write in again
  -- minor:    annoying, not harmful
  severity     text not null check (severity in ('critical', 'major', 'minor')),
  position     smallint not null,
  retired_at   timestamptz
);

-- One lead's judgement of one reply.
create table public.reviews (
  id           uuid primary key default gen_random_uuid(),
  reply_id     uuid not null,
  brand_id     uuid not null,
  reviewer_id  uuid not null default auth.uid() references public.people (id) on delete restrict,
  -- 1 poor, 2 needs work, 3 good, 4 excellent. Even scale: no "fine" middle.
  score        smallint not null check (score between 1 and 4),
  note         text not null default '',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  foreign key (reply_id, brand_id) references public.replies (id, brand_id) on delete cascade,
  -- One review per reviewer per reply. Not one per reply: two leads grading
  -- the same reply is how you would later check they grade alike.
  unique (reply_id, reviewer_id)
);
create index reviews_brand_idx on public.reviews (brand_id);

create table public.review_issues (
  review_id  uuid not null references public.reviews (id) on delete cascade,
  issue_key  text not null references public.issue_types (key) on delete restrict,
  primary key (review_id, issue_key)
);
create index review_issues_issue_idx on public.review_issues (issue_key);

-- "Here is what we changed about it": dated changes a lead made for a brand
-- (a macro rewritten, a coaching session), plotted against the score trend.
create table public.brand_changes (
  id            uuid primary key default gen_random_uuid(),
  brand_id      uuid not null references public.brands (id) on delete cascade,
  author_id     uuid not null references public.people (id) on delete restrict,
  effective_on  date not null,
  summary       text not null check (length(summary) between 1 and 500),
  created_at    timestamptz not null default now()
);
create index brand_changes_brand_idx on public.brand_changes (brand_id, effective_on);

create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger reviews_touch_updated_at
  before update on public.reviews
  for each row execute function public.touch_updated_at();
