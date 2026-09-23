-- Authorisation lives here, in the database, so it holds no matter which client
-- asks: the Next.js server, a script, or someone calling the REST API directly
-- with a specialist's token. The app layer checks too, but only for friendlier
-- errors; this file is the boundary.
--
-- Identity comes from the JWT the server signs for the signed-in person
-- (auth.uid() = its "sub" claim). Rules:
--   lead of brand B        -> everything under B
--   specialist             -> their own replies, the tickets those answer, and
--                             the reviews of their own replies. Nothing else,
--                             not even brand-wide averages.
--   anon                   -> nothing

-- Helpers live in a schema PostgREST does not expose. SECURITY DEFINER so the
-- membership lookup does not recurse through brand_members' own policy.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create function private.leads_brand(target_brand uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.brand_members m
    where m.brand_id = target_brand
      and m.person_id = auth.uid()
      and m.role = 'lead'
  );
$$;

create function private.is_member(target_brand uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.brand_members m
    where m.brand_id = target_brand and m.person_id = auth.uid()
  );
$$;

create function private.authored_reply(target_reply uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.replies r
    where r.id = target_reply and r.author_id = auth.uid()
  );
$$;

create function private.authored_reply_on_ticket(target_ticket uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.replies r
    where r.ticket_id = target_ticket and r.author_id = auth.uid()
  );
$$;

create function private.shares_brand_with(other_person uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.brand_members mine
    join public.brand_members theirs on theirs.brand_id = mine.brand_id
    where mine.person_id = auth.uid() and theirs.person_id = other_person
  );
$$;

revoke all on all functions in schema private from public;
grant execute on all functions in schema private to authenticated;

-- Start from nothing: Supabase grants anon/authenticated broad table
-- privileges by default. Take them all back, then grant only what is used.
revoke all on all tables in schema public from anon, authenticated;

alter table public.people         enable row level security;
alter table public.brands         enable row level security;
alter table public.brand_members  enable row level security;
alter table public.tickets        enable row level security;
alter table public.replies        enable row level security;
alter table public.issue_types    enable row level security;
alter table public.reviews        enable row level security;
alter table public.review_issues  enable row level security;
alter table public.brand_changes  enable row level security;

-- people: yourself, and whoever you share a brand with (a specialist needs the
-- reviewer's name; a lead needs their team's).
grant select on public.people to authenticated;
create policy people_select on public.people for select to authenticated
  using (id = auth.uid() or private.shares_brand_with(id));

-- brands: the ones you belong to, in any role.
grant select on public.brands to authenticated;
create policy brands_select on public.brands for select to authenticated
  using (private.is_member(id));

-- brand_members: your own memberships, and the full roster of brands you lead.
grant select on public.brand_members to authenticated;
create policy brand_members_select on public.brand_members for select to authenticated
  using (person_id = auth.uid() or private.leads_brand(brand_id));

-- tickets: leads see their brands'; a specialist sees only tickets they answered.
grant select on public.tickets to authenticated;
create policy tickets_select on public.tickets for select to authenticated
  using (private.leads_brand(brand_id) or private.authored_reply_on_ticket(id));

-- replies: leads see their brands'; a specialist sees only their own.
grant select on public.replies to authenticated;
create policy replies_select on public.replies for select to authenticated
  using (private.leads_brand(brand_id) or author_id = auth.uid());

-- issue_types: shared vocabulary, readable by anyone signed in.
grant select on public.issue_types to authenticated;
create policy issue_types_select on public.issue_types for select to authenticated
  using (true);

-- reviews: leads read and write their brands'; a specialist reads the reviews
-- of their own replies and cannot write any. Updates are limited to the
-- judgement itself (score, note) so a review cannot be re-pointed at another
-- reply or brand after the fact.
grant select, insert on public.reviews to authenticated;
grant update (score, note) on public.reviews to authenticated;
create policy reviews_select on public.reviews for select to authenticated
  using (private.leads_brand(brand_id) or private.authored_reply(reply_id));
create policy reviews_insert on public.reviews for insert to authenticated
  with check (reviewer_id = auth.uid() and private.leads_brand(brand_id));
create policy reviews_update on public.reviews for update to authenticated
  using (reviewer_id = auth.uid() and private.leads_brand(brand_id))
  with check (reviewer_id = auth.uid() and private.leads_brand(brand_id));

-- review_issues follow their review. Subqueries here run under the caller's
-- reviews policy, so visibility cannot be wider than the parent's.
grant select, insert, delete on public.review_issues to authenticated;
create policy review_issues_select on public.review_issues for select to authenticated
  using (exists (select 1 from public.reviews r where r.id = review_id));
create policy review_issues_insert on public.review_issues for insert to authenticated
  with check (exists (
    select 1 from public.reviews r
    where r.id = review_id and r.reviewer_id = auth.uid()
  ));
create policy review_issues_delete on public.review_issues for delete to authenticated
  using (exists (
    select 1 from public.reviews r
    where r.id = review_id and r.reviewer_id = auth.uid()
  ));

-- brand_changes: a lead's log for their own brands.
grant select, insert on public.brand_changes to authenticated;
create policy brand_changes_select on public.brand_changes for select to authenticated
  using (private.leads_brand(brand_id));
create policy brand_changes_insert on public.brand_changes for insert to authenticated
  with check (author_id = auth.uid() and private.leads_brand(brand_id));
