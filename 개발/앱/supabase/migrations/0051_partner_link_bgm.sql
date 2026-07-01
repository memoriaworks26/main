-- 0051_partner_link_bgm.sql — 파트너사별 제작 링크 배경음악 선택(최대 3곡).
--   문제: get_user_link_config가 공용 BGM(memoria.bgm) 전체를 반환 → 보호자 제작 링크에
--         콘텐츠 허브에 올린 음악이 전부 노출된다.
--   수정: templates.link_bgm_ids(jsonb 배열, 최대 3)에 파트너가 고른 곡만 저장하고,
--         RPC는 그 목록을 '선택 순서'대로만 반환한다.
--         미선택(빈 배열) 파트너는 기존처럼 공용 전체를 노출(무중단 폴백).
--   0050 본문 그대로 + bgm 선택 로직만 교체.

alter table memoria.templates
  add column if not exists link_bgm_ids jsonb not null default '[]'::jsonb;

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
  v_bgm_ids  jsonb;
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

  -- 이 파트너 템플릿이 고른 링크 노출 BGM(최대 3곡).
  select link_bgm_ids into v_bgm_ids
    from memoria.templates where partner_id = v_partner.id;

  if v_bgm_ids is not null and jsonb_array_length(v_bgm_ids) > 0 then
    -- 선택된 곡만, 선택 순서대로. anon 미리듣기용 storage_path 포함(음원 없는 id는 자동 제외).
    select coalesce(json_agg(json_build_object('id', b.id, 'name', b.name, 'meta', b.meta, 'storage_path', b.storage_path) order by sel.ord), '[]'::json)
      into v_bgm
      from jsonb_array_elements_text(v_bgm_ids) with ordinality as sel(bgm_id, ord)
      join memoria.bgm b on b.id = sel.bgm_id
     where b.storage_path is not null;
  else
    -- 미선택 파트너 — 기존처럼 공용 라이브러리 전체(무중단 폴백).
    select coalesce(json_agg(json_build_object('id', id, 'name', name, 'meta', meta, 'storage_path', storage_path) order by created_at), '[]'::json)
      into v_bgm
      from memoria.bgm where storage_path is not null;
  end if;

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
