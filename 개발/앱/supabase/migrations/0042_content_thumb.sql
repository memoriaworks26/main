-- 0042_content_thumb.sql — 콘텐츠 허브 클립 썸네일.
--   클립 업로드 시 첫 프레임을 캡처해 같은 버킷(memoria-content)에 저장하고 경로만 기록.
--   사진은 원본 자체가 썸네일(storage_path)이라 컬럼 불필요. 표시 전용 → RLS 영향 없음.
alter table memoria.content_assets add column if not exists thumb_path text;
