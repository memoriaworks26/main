-- 0045_bgm_anon_preview.sql — 보호자(anon) 위저드에서 BGM 미리듣기 재생.
--   memoria-content는 전면 비공개(0018: authenticated만)라 보호자가 음원을 못 받음.
--   bgm 라이브러리 음원은 비민감 공용 자산 → 'bgm/' 폴더에 한해 anon SELECT 허용(서명URL 발급 가능).
--   다른 폴더(파트너/shared 자산)는 그대로 비공개 유지.
drop policy if exists "content bgm public read" on storage.objects;
create policy "content bgm public read" on storage.objects for select to anon, authenticated
  using (bucket_id = 'memoria-content' and (storage.foldername(name))[1] = 'bgm');

-- get_user_link_config(0044) 확장 — bgm 목록에 storage_path 추가(보호자가 anon 서명URL로 미리듣기).
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

  -- 공용 BGM 라이브러리(전역) — 음원 파일이 있는 곡만. storage_path는 anon 서명URL 미리듣기용.
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
    'bgm',               v_bgm
  );
end;
$$;

grant execute on function public.get_user_link_config(text) to anon, authenticated;
