-- Save a lead's review of a reply in one transaction: the score, the note and
-- the full set of issues, replacing whatever that lead said before.
--
-- SECURITY INVOKER (the default): every statement below runs under the
-- caller's RLS policies, so this function grants nothing the tables don't.
-- It exists for atomicity, not for privilege.
create function public.save_review(
  p_reply_id uuid,
  p_score smallint,
  p_note text,
  p_issue_keys text[]
) returns uuid
language plpgsql set search_path = '' as $$
declare
  v_brand_id uuid;
  v_review_id uuid;
begin
  -- Visible only if the caller may see the reply at all.
  select r.brand_id into v_brand_id from public.replies r where r.id = p_reply_id;
  if v_brand_id is null then
    raise exception 'reply not found' using errcode = 'P0002';
  end if;

  insert into public.reviews (reply_id, brand_id, reviewer_id, score, note)
  values (p_reply_id, v_brand_id, auth.uid(), p_score, coalesce(p_note, ''))
  on conflict (reply_id, reviewer_id)
  do update set score = excluded.score, note = excluded.note
  returning id into v_review_id;

  delete from public.review_issues where review_id = v_review_id;
  insert into public.review_issues (review_id, issue_key)
  select v_review_id, k from unnest(coalesce(p_issue_keys, '{}')) as k;

  return v_review_id;
end;
$$;

revoke all on function public.save_review(uuid, smallint, text, text[]) from public;
grant execute on function public.save_review(uuid, smallint, text, text[]) to authenticated;
