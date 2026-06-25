-- 생성 결과물 버전 히스토리 — 덮어쓰기 대신 누적. 슬롯(role+sort_order)당 하나만 selected=true(활성, compose·편집기 사용).
alter table memoria.submission_assets add column if not exists selected boolean not null default true;
