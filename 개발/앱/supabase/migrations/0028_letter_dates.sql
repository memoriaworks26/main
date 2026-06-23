-- 편지 날짜(우리 처음 만난 날 / 무지개다리 건넌 날) 영속화 — 편지 장면 마지막에 크게 표시.
alter table memoria.submissions
  add column if not exists met_date  date,
  add column if not exists part_date date;

-- submit_link: 보호자 위저드의 metDate/partDate를 저장하도록 갱신(기존 본문 + 2줄).
create or replace function public.submit_link(p_token text, p_payload jsonb)
returns json language plpgsql security definer set search_path = memoria, public as $$
declare
  sid uuid;
  cur text;
  a   jsonb;
begin
  select id, status into sid, cur from memoria.submissions where token = p_token for update;
  if sid is null then raise exception 'invalid token'; end if;
  if cur <> 'draft' then
    return json_build_object('status', cur, 'note', 'already submitted');
  end if;

  update memoria.submissions set
    agreed_at          = now(),
    title_index        = (p_payload->>'titleIndex')::int,
    transition_default = coalesce((p_payload->>'transDefault')::int, 0),
    transition_map     = coalesce(p_payload->'transMap', '{}'::jsonb),
    bgm_id             = p_payload->>'bgmId',
    letter             = p_payload->>'letter',
    met_date           = nullif(p_payload->>'metDate','')::date,
    part_date          = nullif(p_payload->>'partDate','')::date,
    status             = 'queued',
    submitted_at       = now()
  where id = sid;

  delete from memoria.submission_assets where submission_id = sid;
  for a in select * from jsonb_array_elements(coalesce(p_payload->'assets', '[]'::jsonb))
  loop
    insert into memoria.submission_assets(submission_id, kind, role, name, size_mb, storage_path, sort_order)
    values (sid, a->>'kind', coalesce(a->>'role','source'), a->>'name',
            (a->>'sizeMB')::numeric, a->>'storagePath', coalesce((a->>'sortOrder')::int, 0));
  end loop;

  return json_build_object('status', 'queued');
end;
$$;
grant execute on function public.submit_link(text, jsonb) to anon;
