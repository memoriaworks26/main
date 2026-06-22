-- ─────────────────────────────────────────────────────────────
-- 0025_user_photos.sql — 사업부별 예시사진(좋은 예/피해주세요) 저장
--   기존 setUserPhoto는 메모리 전용이라 새로고침 시 소실(QA). 사업부별로 보관.
--   data_url(소형 가이드 썸네일)로 저장 — 보호자(anon)는 get_user_link_config로만 읽음.
--   staff는 자기 사업부 것만 읽기/쓰기(master=전체). anon 직접접근 차단.
-- ─────────────────────────────────────────────────────────────
create table if not exists memoria.user_photos (
  biz_unit_id uuid not null references memoria.biz_units(id) on delete cascade,
  key         text not null check (key in ('good','bad')),
  data_url    text not null,
  updated_at  timestamptz not null default now(),
  primary key (biz_unit_id, key)
);

alter table memoria.user_photos enable row level security;

-- PostgREST는 RLS 이전에 테이블 권한을 확인 — staff(authenticated)에 부여(RLS가 사업부로 스코핑).
--   anon은 직접접근 불가(get_user_link_config SECURITY DEFINER로만 읽음).
grant select, insert, update, delete on memoria.user_photos to authenticated;

drop policy if exists up_staff_read on memoria.user_photos;
create policy up_staff_read on memoria.user_photos for select to authenticated
  using (memoria.staff_can_biz(biz_unit_id));

drop policy if exists up_staff_write on memoria.user_photos;
create policy up_staff_write on memoria.user_photos for all to authenticated
  using (memoria.staff_can_biz(biz_unit_id))
  with check (memoria.staff_can_biz(biz_unit_id));

-- get_user_link_config 확장 — 보호자 화면에 사업부 예시사진도 토큰 검증 후 반환.
create or replace function public.get_user_link_config(p_token text)
returns json language plpgsql security definer set search_path = memoria, public, pg_temp as $$
declare
  v_biz      uuid;
  v_company  memoria.company%rowtype;
  v_terms    json;
  v_usertext json;
  v_photos   json;
begin
  select pt.biz_unit_id into v_biz
    from memoria.submissions s
    left join memoria.reservations r on r.id = s.reservation_id
    left join memoria.partners pt on pt.id = r.partner_id
   where s.token = p_token;
  if not found then
    return null;
  end if;

  select * into v_company from memoria.company where id = 1;

  select coalesce(json_object_agg(term_key, json_build_object('partner', partner_text, 'user', user_text)), '{}'::json)
    into v_terms
    from memoria.term_configs where biz_unit_id = v_biz;

  select coalesce(json_object_agg(key, value), '{}'::json)
    into v_usertext
    from memoria.user_text_overrides where biz_unit_id = v_biz;

  select coalesce(json_object_agg(key, data_url), '{}'::json)
    into v_photos
    from memoria.user_photos where biz_unit_id = v_biz;

  return json_build_object(
    'cs_phone',          v_company.cs_phone,
    'cs_hours',          v_company.cs_hours,
    'consent_privacy',   v_company.consent_privacy,
    'consent_marketing', v_company.consent_marketing,
    'privacy_policy',    v_company.privacy_policy,
    'privacy_officer',   v_company.privacy_officer,
    'terms',             v_terms,
    'user_text',         v_usertext,
    'user_photos',       v_photos
  );
end;
$$;

grant execute on function public.get_user_link_config(text) to anon, authenticated;
