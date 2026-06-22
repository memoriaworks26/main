-- ─────────────────────────────────────────────────────────────
-- 0020_revoke_anon_internal_fns.sql — 출시 전 하드닝(Phase 6/11)
--   문제: 함수 생성 시 PUBLIC 기본 grant 때문에 anon이 memoria 내부 헬퍼/RPC를
--         (is_master·purge_reservation·acquire_edit_lock 등) 직접 호출 가능(advisor 경고).
--         전부 내부 가드가 있어 데이터 유출 구멍은 아니지만, 공격면 축소를 위해 회수.
--   원칙: 보호자(anon) 공개 API 4종만 anon 유지 →
--         resolve_link · submit_link · is_upload_token · get_user_link_config.
--         나머지 memoria/public 함수는 anon·PUBLIC 회수.
--   안전: authenticated·service_role 실행권한은 그대로 유지하므로
--         (1) RLS 정책이 호출하는 헬퍼(is_staff·current_partner_id…) 평가 무손상
--         (2) staff RPC(잠금·purge·log_access)·워커(service_role) 무손상.
--         anon은 memoria 테이블 grant가 없어 내부 헬퍼를 정책 경유로도 부르지 않음
--         (SECURITY DEFINER 함수의 내부 호출은 소유자 권한으로 실행).
--   예외: rls_auto_enable = 마이그레이션 전용 DDL 헬퍼 → 런타임 롤 전부 회수(소유자만).
-- ─────────────────────────────────────────────────────────────

do $$
declare r record;
begin
  for r in
    select n.nspname as s,
           p.proname as fn,
           pg_get_function_identity_arguments(p.oid) as args
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname in ('memoria', 'public')
       and p.proname not in ('resolve_link', 'submit_link', 'is_upload_token', 'get_user_link_config')
  loop
    execute format('revoke all on function %I.%I(%s) from public', r.s, r.fn, r.args);
    execute format('revoke all on function %I.%I(%s) from anon',   r.s, r.fn, r.args);
    if r.fn <> 'rls_auto_enable' then
      execute format('grant execute on function %I.%I(%s) to authenticated',  r.s, r.fn, r.args);
      execute format('grant execute on function %I.%I(%s) to service_role',   r.s, r.fn, r.args);
    end if;
  end loop;
end $$;
