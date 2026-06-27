-- ─────────────────────────────────────────────────────────────
-- 0040_signage_paused.sql — 사이니지 라이브컨트롤 '정지/재생' 실반영.
--   기존: 콘솔의 재생/정지 토글이 store 전용(파이에 안 닿음). mode·volume·muted·명령은
--         이미 DB→device-sync로 전달되나 play/stop만 빠져 있었다.
--   추가: paused(bool) — true면 파이가 현재 프레임에서 일시정지(검은화면 금지 원칙 유지).
--         device-sync가 내려주고 에이전트가 mpv pause로 적용.
-- ─────────────────────────────────────────────────────────────
alter table memoria.signage_devices add column if not exists paused boolean not null default false;
