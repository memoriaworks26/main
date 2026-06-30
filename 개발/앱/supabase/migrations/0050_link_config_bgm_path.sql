-- 0050_link_config_bgm_path.sql — 보호자 링크 BGM 미리듣기 복구.
--   문제: get_user_link_config의 bgm 목록이 {id,name,meta}만 반환 → 위저드 미리듣기가 storage_path로
--         anon 서명URL을 못 만들어 재생 무반응(라이브만; 데모는 정적 src라 됐음).
--   수정: bgm 항목에 storage_path 추가. anon은 0045 'content bgm public read'로 memoria-content의
--         bgm/ 폴더만 서명 가능 → 경로 노출 안전(접근 범위는 기존과 동일).
--   0047 본문 그대로 + bgm json에 'storage_path'만 추가.
create or replace function public.get_user_link_config(p_token text)
returns json language plpgsql security definer set search_path = memoria, public, pg_temp as $$
declare
  v_biz      uuid;
  v_partner  memoria.partners%rowtype;
  v_company  memoria.company%rowtype;
  v_terms    json;
  v_usertext json;
  v_photos   json;
  v_bgm      json;
begin
  select pt.* into v_partner
    from memoria.submissions s
    left join memoria.reservations r on r.id = s.reservation_id
    left join memoria.partners pt on pt.id = r.partner_id
   where s.token = p_token;
  if not found then
    return null;
  end if;
  v_biz := v_partner.biz_unit_id;

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

  -- 공용 BGM 라이브러리(전역) — 보호자 선택지 + 미리듣기용 storage_path(anon은 bgm/만 서명 가능).
  select coalesce(json_agg(json_build_object('id', id, 'name', name, 'meta', meta, 'storage_path', storage_path) order by created_at), '[]'::json)
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
    'bgm',               v_bgm,
    'partner_name',      v_partner.name,
    'partner_cs_phone',  v_partner.cs_phone,
    'partner_cs_hours',  v_partner.cs_hours
  );
end;
$$;

grant execute on function public.get_user_link_config(text) to anon, authenticated;
