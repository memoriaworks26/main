-- 0044_link_config_bgm.sql — 보호자 위저드 BGM을 목업→실 라이브러리로 통일.
--   get_user_link_config(0025)에 공용 BGM 목록(id/name/meta)을 추가 반환.
--   anon은 bgm 테이블 직접접근 불가 → 이 SECURITY DEFINER 함수로만 토큰 검증 후 노출.
--   0025 본문 그대로 두고 v_bgm 집계 + 반환 키 'bgm'만 추가.
create or replace function public.get_user_link_config(p_token text)
returns json language plpgsql security definer set search_path = memoria, public, pg_temp as $$
declare
  v_biz      uuid;
  v_company  memoria.company%rowtype;
  v_terms    json;
  v_usertext json;
  v_photos   json;
  v_bgm      json;
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

  -- 공용 BGM 라이브러리(전역) — 보호자 선택지. 음원 파일이 있는 곡만 노출.
  select coalesce(json_agg(json_build_object('id', id, 'name', name, 'meta', meta) order by created_at), '[]'::json)
    into v_bgm
    from memoria.bgm where storage_path is not null;

  return json_build_object(
    'cs_phone',          v_company.cs_phone,
    'cs_hours',          v_company.cs_hours,
    'consent_privacy',   v_company.consent_privacy,
    'consent_marketing', v_company.consent_marketing,
    'privacy_policy',    v_company.privacy_policy,
    'privacy_officer',   v_company.privacy_officer,
    'terms',             v_terms,
    'user_text',         v_usertext,
    'user_photos',       v_photos,
    'bgm',               v_bgm
  );
end;
$$;

grant execute on function public.get_user_link_config(text) to anon, authenticated;
