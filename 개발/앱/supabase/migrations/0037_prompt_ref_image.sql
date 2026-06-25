-- 프롬프트 참고 이미지 — 텍스트 프롬프트와 함께 생성(Seedream 멀티이미지)에 전송. memoria-content 경로.
alter table memoria.ai_prompts add column if not exists ref_image text;
