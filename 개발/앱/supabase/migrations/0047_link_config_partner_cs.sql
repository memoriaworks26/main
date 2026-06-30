-- 0047_link_config_partner_cs.sql — 보호자 링크 고객센터(장례식장)를 '파트너 이름매칭' → '토큰(partner_id) 해석'으로.
--   배경: anon 보호자는 partners 테이블 RLS로 직접 못 읽음 → 클라가 이름(partnerName)으로 store에서 찾던 폴백은
--         (a) 라이브에선 store.partners가 비어 장례식장 연락처가 아예 안 뜨고 (b) 데모에선 동명 파트너사 충돌 위험.
--   해결: 이 SECURITY DEFINER가 토큰 체인(submission→reservation→partner)으로 파트너 cs를 id 기준 반환.
--         동명 파트너사여도 정확. 0044 본문 그대로 + partner_name/partner_cs_phone/partner_cs_hours 반환만 추가.
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
  -- 토큰 → 파트너 행(사업부 격리·파트너 cs 표시에 사용). 토큰 무효면 submissions 행이 없어 not found.
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
    'bgm',               v_bgm,
    -- 장례식장(파트너) 연락처 — 토큰 해석(id 기준). 동명 파트너사 충돌 없음.
    'partner_name',      v_partner.name,
    'partner_cs_phone',  v_partner.cs_phone,
    'partner_cs_hours',  v_partner.cs_hours
  );
end;
$$;

grant execute on function public.get_user_link_config(text) to anon, authenticated;
