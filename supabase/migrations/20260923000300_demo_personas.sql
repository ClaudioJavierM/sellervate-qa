-- AUTH STUB. The one thing anon may call: the list of people to sign in as.
-- It exists because login is stubbed with a user switcher. Delete this function
-- when real authentication lands; nothing else depends on it.
--
-- Returns names and roles only, no brand data beyond brand names, and no
-- replies or reviews. Choosing a persona gets you a token for that person, and
-- from then on RLS decides what you see.
create function public.demo_personas()
returns table (id uuid, full_name text, summary text)
language sql stable security definer set search_path = '' as $$
  select p.id,
         p.full_name,
         string_agg(
           case m.role when 'lead' then 'Leads ' else 'Writes for ' end || b.name,
           ' · ' order by m.role, b.name
         )
  from public.people p
  join public.brand_members m on m.person_id = p.id
  join public.brands b on b.id = m.brand_id
  group by p.id, p.full_name
  order by bool_or(m.role = 'lead') desc, p.full_name;
$$;

revoke all on function public.demo_personas() from public;
grant execute on function public.demo_personas() to anon, authenticated;
