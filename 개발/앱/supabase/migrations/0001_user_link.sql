-- ─────────────────────────────────────────────────────────────
-- 보호자 유저링크 — 제출 슬라이스 (DB 연결 시 적용)
--   · 토큰 = 비로그인 접근 권한(capability). 직접 테이블 접근은 RLS로 잠그고,
--     anon은 SECURITY DEFINER RPC(resolve_link/submit_link)로만 토큰을 통해 접근.
--   · 스토리지 업로드는 "유효한 draft 토큰 폴더"에만 허용.
--   · 실제 영상 렌더는 범위 밖 — 제출 시 status='queued'로 큐잉만(워커 후속).
-- 적용: supabase db push  또는  MCP apply_migration
-- ─────────────────────────────────────────────────────────────

create schema if not exists memoria;

-- 제출(보호자 1건 = 예약 1건)
create table if not exists memoria.submissions (
  id               uuid primary key default gen_random_uuid(),
  token            text unique not null default encode(gen_random_bytes(16), 'hex'),
  reservation_id   text,                                   -- 운영 예약 식별자(예: R-240617-02)
  pet_name         text,
  partner_name     text,
  status           text not null default 'draft'
                   check (status in ('draft','queued','rendering','done','expired')),
  agreed_at        timestamptz,                            -- 개인정보 동의 시각
  title_index      int,                                    -- 타이틀로 고른 사진 인덱스
  transition_default int default 0,
  transition_map   jsonb not null default '{}'::jsonb,     -- { assetId: transitionIndex }
  bgm_id           text,
  letter           text,
  video_url        text,                                   -- 완료 시 워커가 채움
  created_at       timestamptz not null default now(),
  submitted_at     timestamptz,
  expires_at       timestamptz                             -- 퇴실 시 만료
);

-- 업로드 자산(사진·영상). role: source=슬라이드, title=타이틀 원본
create table if not exists memoria.submission_assets (
  id             uuid primary key default gen_random_uuid(),
  submission_id  uuid not null references memoria.submissions(id) on delete cascade,
  kind           text not null check (kind in ('photo','video')),
  role           text not null default 'source' check (role in ('source','title')),
  name           text,
  size_mb        numeric,
  storage_path   text,
  sort_order     int not null default 0,
  created_at     timestamptz not null default now()
);

create index if not exists idx_assets_submission on memoria.submission_assets(submission_id);

-- ── RLS: 테이블 직접 접근 전면 차단(정책 없음 = anon/authenticated 모두 거부) ──
alter table memoria.submissions       enable row level security;
alter table memoria.submission_assets enable row level security;

-- ── 토큰 유효성(업로드 정책용) — SECURITY DEFINER로 RLS 우회 조회 ──
create or replace function memoria.is_upload_token(p_token text)
returns boolean language sql security definer set search_path = memoria, public as $$
  select exists (
    select 1 from memoria.submissions
    where token = p_token and status = 'draft'
  );
$$;

-- ── resolve_link: 토큰 → 컨텍스트(민감정보 제외) ──
create or replace function public.resolve_link(p_token text)
returns json language plpgsql security definer set search_path = memoria, public as $$
declare r memoria.submissions;
begin
  select * into r from memoria.submissions where token = p_token;
  if not found then return null; end if;
  return json_build_object(
    'pet_name', r.pet_name,
    'partner_name', r.partner_name,
    'status', case when r.expires_at is not null and r.expires_at < now() then 'expired' else r.status end,
    'video_url', r.video_url,
    'expires_at', r.expires_at
  );
end;
$$;

-- ── submit_link: 위저드 입력 일괄 반영 + 자산 적재 + 렌더 큐잉 ──
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
    status             = 'queued',
    submitted_at       = now()
  where id = sid;

  -- 자산 재적재(재제출 대비 초기화 후 삽입)
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

-- anon이 토큰으로만 호출. 직접 테이블 접근 권한은 부여하지 않음.
grant execute on function public.resolve_link(text) to anon;
grant execute on function public.submit_link(text, jsonb) to anon;
grant execute on function memoria.is_upload_token(text) to anon;

-- ── 스토리지 버킷 + 업로드 정책 ──
insert into storage.buckets (id, name, public)
values ('memoria-uploads', 'memoria-uploads', false)
on conflict (id) do nothing;

-- 유효한 draft 토큰 폴더(<token>/...)에만 anon 업로드 허용. 조회/수정/삭제는 불가.
drop policy if exists "anon upload to valid token folder" on storage.objects;
create policy "anon upload to valid token folder" on storage.objects
  for insert to anon
  with check (
    bucket_id = 'memoria-uploads'
    and memoria.is_upload_token((storage.foldername(name))[1])
  );
