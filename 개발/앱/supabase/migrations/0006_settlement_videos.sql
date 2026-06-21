-- ─────────────────────────────────────────────────────────────
-- 0006_settlement_videos.sql — 정산(PII·금액) + 발행 영상 아카이브
--   · settlement_items/deposits: staff(settlement)만 + 사업부 격리. 파트너 직접 접근 없음(타사 단가·수금 보호).
--   · statements: staff + 파트너 자기열람.
--   · videos: 최종본 final + 원본 source 둘 다 저장(원본 다운로드 허용). storage_provider 무관 설계.
--     collab=발행본 SELECT만(쓰기 0), 파트너=자기 발행본, staff=production|storage + 사업부 격리.
-- ─────────────────────────────────────────────────────────────

create table if not exists memoria.settlement_items (
  id             uuid primary key default gen_random_uuid(),
  partner_id     text not null references memoria.partners(id) on delete restrict,
  reservation_id text references memoria.reservations(id) on delete set null,
  deceased       text,                       -- 스냅샷(PII)
  chief          text,                       -- 스냅샷(PII)
  ymd            date not null,
  amount         integer not null,           -- 단가 스냅샷
  status         text not null default 'waiting' check (status in ('waiting','billed','done')),
  created_at     timestamptz not null default now()
);
create index if not exists idx_si_partner on memoria.settlement_items(partner_id);

create table if not exists memoria.settlement_deposits (
  id           text primary key,
  partner_id   text not null references memoria.partners(id) on delete restrict,
  deposit_date date not null,
  amount       integer not null,
  method       text,
  memo         text,
  created_at   timestamptz not null default now()
);
create index if not exists idx_dep_partner on memoria.settlement_deposits(partner_id);

create table if not exists memoria.statements (
  id          text primary key,
  partner_id  text not null references memoria.partners(id) on delete restrict,
  period      text,
  issued_at   date,
  item_count  int,
  amount      integer,
  status      text,
  snapshot    jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists idx_stmt_partner on memoria.statements(partner_id);

-- 발행 최종본 + 원본 소스 + HLS 링크 통합. storage_provider로 저장소 중립.
create table if not exists memoria.videos (
  id              text primary key,
  partner_id      text not null references memoria.partners(id) on delete restrict,
  reservation_id  text references memoria.reservations(id) on delete set null,
  deceased        text,
  room_no         int,
  funeral_at      text,                       -- YYMMDDHHmm (파일명 규칙)
  funeral_date    date,
  storage_provider text not null default 'supabase',  -- 'supabase' | 'r2' | ...
  final_path      text, final_mb  numeric,    -- 발행 최종본(mp4)
  source_path     text, source_mb numeric,    -- 원본 소스 묶음(zip)
  hls_url         text,
  share_token     text unique,
  issued_at       timestamptz,
  expires_at      timestamptz,                -- 퇴실 시 만료
  views           int not null default 0,
  status          text not null default 'published' check (status in ('rendering','published','expired')),
  created_at      timestamptz not null default now()
);
create index if not exists idx_videos_partner on memoria.videos(partner_id);

alter table memoria.settlement_items    enable row level security;
alter table memoria.settlement_deposits enable row level security;
alter table memoria.statements          enable row level security;
alter table memoria.videos              enable row level security;

-- settlement: staff(settlement)만 + 사업부 격리. 파트너·anon·collab 차단.
create policy si_staff_rw on memoria.settlement_items for all to authenticated
  using (memoria.staff_has_perm('settlement') and memoria.staff_can_partner(partner_id))
  with check (memoria.staff_has_perm('settlement') and memoria.staff_can_partner(partner_id));
create policy dep_staff_rw on memoria.settlement_deposits for all to authenticated
  using (memoria.staff_has_perm('settlement') and memoria.staff_can_partner(partner_id))
  with check (memoria.staff_has_perm('settlement') and memoria.staff_can_partner(partner_id));

-- statements: staff(settlement) R/W + 파트너 자기 명세서 읽기
create policy stmt_staff_rw on memoria.statements for all to authenticated
  using (memoria.staff_has_perm('settlement') and memoria.staff_can_partner(partner_id))
  with check (memoria.staff_has_perm('settlement') and memoria.staff_can_partner(partner_id));
create policy stmt_partner_read on memoria.statements for select to authenticated
  using (partner_id = memoria.current_partner_id());

-- videos: collab=발행본 SELECT(최종본·원본 모두, 운영사 전체) / staff=production|storage + 사업부 격리 / 파트너=자기 발행본
create policy videos_collab_read on memoria.videos for select to authenticated
  using (memoria.is_collab() and status = 'published');
create policy videos_staff_rw on memoria.videos for all to authenticated
  using ((memoria.staff_has_perm('production') or memoria.staff_has_perm('storage'))
         and memoria.staff_can_partner(partner_id))
  with check ((memoria.staff_has_perm('production') or memoria.staff_has_perm('storage'))
         and memoria.staff_can_partner(partner_id));
create policy videos_partner_read on memoria.videos for select to authenticated
  using (partner_id = memoria.current_partner_id() and status = 'published');

grant select, insert, update, delete on
  memoria.settlement_items, memoria.settlement_deposits, memoria.statements, memoria.videos
  to authenticated;
