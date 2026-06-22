-- ─────────────────────────────────────────────────────────────
-- 0017_edit_locks.sql — 편집기 동시편집 잠금(Phase 9, README §6).
--   완전차단: 한 건을 누가 편집기로 열면 다른 작업자는 못 들어감("OOO 편집 중").
--   해제: ①닫기(release) ②마스터 강제해제 ③N분 무활동 자동만료(하트비트).
--   대상: 1차(reservation)·2차(second). 잠금 단위 = 그 건 id.
-- ─────────────────────────────────────────────────────────────
create table if not exists memoria.edit_locks (
  target_kind    text not null check (target_kind in ('reservation','second')),
  target_id      text not null,
  locked_by      uuid not null references auth.users(id) on delete cascade,
  locked_by_name text,
  locked_at      timestamptz not null default now(),
  last_heartbeat timestamptz not null default now(),
  primary key (target_kind, target_id)
);
alter table memoria.edit_locks enable row level security;
grant select on memoria.edit_locks to authenticated;

-- staff(production|secondedit)만 락 현황 읽기(파트너·anon 차단).
create policy lock_staff_read on memoria.edit_locks for select to authenticated
  using (memoria.staff_has_perm('production') or memoria.staff_has_perm('secondedit'));

-- 원자적 획득. 다른 사람이 활성(하트비트 TTL내) 보유 시 실패+holder 반환. 만료/본인이면 탈취.
create or replace function memoria.acquire_edit_lock(p_kind text, p_id text, p_ttl_min int default 3)
returns json language plpgsql security definer set search_path = memoria, public, pg_temp as $$
declare cur memoria.edit_locks; me uuid; myname text;
begin
  me := auth.uid();
  if me is null then return json_build_object('ok', false, 'error', 'unauthorized'); end if;
  if not (memoria.staff_has_perm('production') or memoria.staff_has_perm('secondedit')) then
    return json_build_object('ok', false, 'error', 'forbidden'); end if;
  select name into myname from memoria.staff where auth_user_id = me;
  select * into cur from memoria.edit_locks where target_kind = p_kind and target_id = p_id for update;
  if found and cur.locked_by <> me and cur.last_heartbeat > now() - make_interval(mins => p_ttl_min) then
    return json_build_object('ok', false, 'holder', cur.locked_by_name, 'lockedAt', cur.locked_at);
  end if;
  insert into memoria.edit_locks(target_kind, target_id, locked_by, locked_by_name, locked_at, last_heartbeat)
    values (p_kind, p_id, me, myname, now(), now())
    on conflict (target_kind, target_id)
    do update set locked_by = me, locked_by_name = myname, locked_at = now(), last_heartbeat = now();
  return json_build_object('ok', true, 'holder', myname);
end; $$;

create or replace function memoria.heartbeat_edit_lock(p_kind text, p_id text)
returns void language sql security definer set search_path = memoria, public, pg_temp as $$
  update memoria.edit_locks set last_heartbeat = now()
   where target_kind = p_kind and target_id = p_id and locked_by = auth.uid();
$$;

-- 본인 해제 또는 master 강제해제.
create or replace function memoria.release_edit_lock(p_kind text, p_id text)
returns void language plpgsql security definer set search_path = memoria, public, pg_temp as $$
begin
  delete from memoria.edit_locks where target_kind = p_kind and target_id = p_id
    and (locked_by = auth.uid() or memoria.is_master());
end; $$;

grant execute on function memoria.acquire_edit_lock(text, text, int) to authenticated;
grant execute on function memoria.heartbeat_edit_lock(text, text) to authenticated;
grant execute on function memoria.release_edit_lock(text, text) to authenticated;
