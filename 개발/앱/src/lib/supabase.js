// ─────────────────────────────────────────────────────────────
// Supabase 클라이언트 — env 주입식. DB 연결 전(env 미설정)에도 앱이 죽지 않도록
// 설정이 없으면 null을 반환하고, 상위 API(userLink.js)가 목업으로 폴백한다.
// 본운영: .env에 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 주입 → 자동 라이브 전환.
// ─────────────────────────────────────────────────────────────
import { createClient } from "@supabase/supabase-js";

const URL = import.meta.env.VITE_SUPABASE_URL;
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 업로드 버킷 이름(스토리지). 마이그레이션의 버킷명과 일치해야 함.
export const UPLOAD_BUCKET = "memoria-uploads";

// 설정이 둘 다 있을 때만 라이브. 그 외엔 목업 모드.
export const BACKEND_LIVE = Boolean(URL && ANON);

let _client = null;
export function getClient() {
  if (!BACKEND_LIVE) return null;
  if (!_client) {
    // 보호자 링크는 비로그인(익명 anon 키) — 토큰이 곧 접근 권한.
    _client = createClient(URL, ANON, { auth: { persistSession: false } });
  }
  return _client;
}
