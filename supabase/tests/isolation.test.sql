-- Tenant and role isolation, checked as the database sees each caller.
-- Run with: npx supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(19);

-- Fixtures: brand A (lead A, specialists S1 and S2) and brand B (lead B, S1).
-- S1 writes for both brands; S2 only for A.
insert into public.people (id, full_name, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'Lead A', 'lead-a@test'),
  ('00000000-0000-0000-0000-0000000000b1', 'Lead B', 'lead-b@test'),
  ('00000000-0000-0000-0000-000000000051', 'Spec One', 's1@test'),
  ('00000000-0000-0000-0000-000000000052', 'Spec Two', 's2@test');

insert into public.brands (id, slug, name, standard) values
  ('00000000-0000-0000-0000-00000000aaaa', 'brand-a', 'Brand A', 'A'),
  ('00000000-0000-0000-0000-00000000bbbb', 'brand-b', 'Brand B', 'B');

insert into public.brand_members (brand_id, person_id, role) values
  ('00000000-0000-0000-0000-00000000aaaa', '00000000-0000-0000-0000-0000000000a1', 'lead'),
  ('00000000-0000-0000-0000-00000000aaaa', '00000000-0000-0000-0000-000000000051', 'specialist'),
  ('00000000-0000-0000-0000-00000000aaaa', '00000000-0000-0000-0000-000000000052', 'specialist'),
  ('00000000-0000-0000-0000-00000000bbbb', '00000000-0000-0000-0000-0000000000b1', 'lead'),
  ('00000000-0000-0000-0000-00000000bbbb', '00000000-0000-0000-0000-000000000051', 'specialist');

insert into public.tickets (id, brand_id, source, external_id, subject, customer_name, customer_message, opened_at) values
  ('00000000-0000-0000-0000-0000000a0001', '00000000-0000-0000-0000-00000000aaaa', 'test', 'a1', 's', 'c', 'm', now()),
  ('00000000-0000-0000-0000-0000000a0002', '00000000-0000-0000-0000-00000000aaaa', 'test', 'a2', 's', 'c', 'm', now()),
  ('00000000-0000-0000-0000-0000000b0001', '00000000-0000-0000-0000-00000000bbbb', 'test', 'b1', 's', 'c', 'm', now());

insert into public.replies (id, ticket_id, brand_id, author_id, source, external_id, body, sent_at) values
  -- S1 on A, S2 on A, S1 on B
  ('00000000-0000-0000-0000-0000000ca001', '00000000-0000-0000-0000-0000000a0001', '00000000-0000-0000-0000-00000000aaaa', '00000000-0000-0000-0000-000000000051', 'test', 'r1', 'x', now()),
  ('00000000-0000-0000-0000-0000000ca002', '00000000-0000-0000-0000-0000000a0002', '00000000-0000-0000-0000-00000000aaaa', '00000000-0000-0000-0000-000000000052', 'test', 'r2', 'x', now()),
  ('00000000-0000-0000-0000-0000000cb001', '00000000-0000-0000-0000-0000000b0001', '00000000-0000-0000-0000-00000000bbbb', '00000000-0000-0000-0000-000000000051', 'test', 'r3', 'x', now());

insert into public.reviews (id, reply_id, brand_id, reviewer_id, score, note) values
  ('00000000-0000-0000-0000-00000000e001', '00000000-0000-0000-0000-0000000ca001', '00000000-0000-0000-0000-00000000aaaa', '00000000-0000-0000-0000-0000000000a1', 2, 'for S1 on A'),
  ('00000000-0000-0000-0000-00000000e002', '00000000-0000-0000-0000-0000000ca002', '00000000-0000-0000-0000-00000000aaaa', '00000000-0000-0000-0000-0000000000a1', 4, 'for S2 on A'),
  ('00000000-0000-0000-0000-00000000e003', '00000000-0000-0000-0000-0000000cb001', '00000000-0000-0000-0000-00000000bbbb', '00000000-0000-0000-0000-0000000000b1', 3, 'for S1 on B');

-- Act as a signed-in person, exactly as PostgREST does with a verified JWT.
create function pg_temp.act_as(person uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', person, 'role', 'authenticated')::text, true);
$$;

-- ---------------------------------------------------------------- anon
set local role anon;
select throws_ok('select count(*) from public.replies', '42501', null, 'anon has no table privileges');
reset role;

-- ---------------------------------------------------------------- lead A
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
set local role authenticated;
select is((select count(*)::int from public.replies), 2, 'lead A sees both brand A replies');
select is((select count(*)::int from public.replies where brand_id = '00000000-0000-0000-0000-00000000bbbb'), 0, 'lead A sees no brand B replies, even by asking for them');
select is((select count(*)::int from public.reviews), 2, 'lead A sees only brand A reviews');
select is((select count(*)::int from public.brands), 1, 'lead A sees only brand A');
select throws_ok(
  $$insert into public.reviews (reply_id, brand_id, score) values ('00000000-0000-0000-0000-0000000cb001', '00000000-0000-0000-0000-00000000bbbb', 1)$$,
  '42501', null, 'lead A cannot review a brand B reply');
select throws_ok(
  $$insert into public.reviews (reply_id, brand_id, score) values ('00000000-0000-0000-0000-0000000cb001', '00000000-0000-0000-0000-00000000aaaa', 1)$$,
  '23503', null, 'lead A cannot smuggle a brand B reply in under brand A');
select throws_ok(
  $$update public.reviews set reply_id = '00000000-0000-0000-0000-0000000ca002' where id = '00000000-0000-0000-0000-00000000e001'$$,
  '42501', null, 'a review cannot be re-pointed at another reply');
reset role;

-- ---------------------------------------------------------------- specialist S1 (A and B)
select pg_temp.act_as('00000000-0000-0000-0000-000000000051');
set local role authenticated;
select is((select count(*)::int from public.replies), 2, 'S1 sees own replies on both brands');
select is((select count(*)::int from public.replies where author_id = '00000000-0000-0000-0000-000000000052'), 0, 'S1 cannot see S2 replies');
select is((select count(*)::int from public.reviews), 2, 'S1 sees the reviews of own replies only');
select is((select count(*)::int from public.reviews where id = '00000000-0000-0000-0000-00000000e002'), 0, 'S1 cannot read the review written for S2');
select is((select count(*)::int from public.tickets), 2, 'S1 sees only tickets they answered');
select throws_ok(
  $$insert into public.reviews (reply_id, brand_id, score) values ('00000000-0000-0000-0000-0000000ca001', '00000000-0000-0000-0000-00000000aaaa', 4)$$,
  '42501', null, 'a specialist cannot review, not even their own reply');
reset role;

-- ---------------------------------------------------------------- specialist S2 (A only)
select pg_temp.act_as('00000000-0000-0000-0000-000000000052');
set local role authenticated;
select is((select count(*)::int from public.replies), 1, 'S2 sees one reply, their own');
select is((select count(*)::int from public.brands where slug = 'brand-b'), 0, 'S2 cannot see brand B exists');
reset role;

-- ---------------------------------------------------------------- save_review() is not a way around RLS
select pg_temp.act_as('00000000-0000-0000-0000-0000000000b1');
set local role authenticated;
select throws_ok(
  $$select public.save_review('00000000-0000-0000-0000-0000000ca001', 1::smallint, 'x', '{}')$$,
  'P0002', null, 'lead B cannot review a brand A reply through save_review');
reset role;

select pg_temp.act_as('00000000-0000-0000-0000-000000000051');
set local role authenticated;
select throws_ok(
  $$select public.save_review('00000000-0000-0000-0000-0000000ca001', 4::smallint, 'x', '{}')$$,
  '42501', null, 'a specialist cannot review their own reply through save_review');
reset role;

select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
set local role authenticated;
select lives_ok(
  $$select public.save_review('00000000-0000-0000-0000-0000000ca002', 3::smallint, 'updated', '{}')$$,
  'lead A can save a review for their brand');
reset role;

select * from finish();
rollback;
