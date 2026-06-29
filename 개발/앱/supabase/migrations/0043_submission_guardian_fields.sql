-- 보호자 위저드 입력 중 그동안 버려지던 값 영속화:
--   · pet_name        : 보호자가 위저드에서 수정한 반려동물 이름(타이틀 "사랑하는 {name}"에 사용)
--   · marketing_agreed: 마케팅 수신 동의(개인정보 동의 agreed_at과 별개로 보관 — 컴플라이언스)
-- submit_link를 0028 본문 그대로 두고 위 2개 매핑만 추가.
alter table memoria.submissions
  add column if not exists marketing_agreed boolean not null default false;

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
    pet_name           = coalesce(nullif(p_payload->>'petName',''), pet_name),  -- 보호자 수정 이름(빈값이면 유지)
    agreed_at          = now(),
    marketing_agreed   = coalesce((p_payload->>'marketingAgreed')::boolean, false),
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
