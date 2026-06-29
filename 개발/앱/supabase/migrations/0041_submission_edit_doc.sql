-- ─────────────────────────────────────────────────────────────
-- 0041_submission_edit_doc.sql — 편집기 편집본 영속화.
--   편집기(VideoEditor)의 편집 문서(블록 순서/숨김·전환·편지수정·자막·소리)를 submissions.edit_doc(jsonb)에 저장.
--   { v, doc:{edits,subs,layout}, render:{plan,letter,subs,slideDur,memVol} }
--     · doc   = 편집기 재오픈 복원용(블록 id 기준).
--     · render = 워커 compose가 읽는 정규화 렌더 플랜(타입 기준, 숨김 제거·순서 반영). 없으면 워커는 기존 고정순서 폴백.
--   claim_render_job()/claim_compose_job()은 returns memoria.submissions(전체 행)이라 이 컬럼이 워커 job에 자동 포함됨.
-- ─────────────────────────────────────────────────────────────
alter table memoria.submissions add column if not exists edit_doc jsonb;
