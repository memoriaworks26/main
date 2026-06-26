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

// 이어올리기(tus resumable) 업로드용 — 엔드포인트/헤더 구성에 필요.
export const SUPABASE_URL = URL;
export const SUPABASE_ANON = ANON;

// 설정이 둘 다 있을 때만 라이브. 그 외엔 목업 모드.
export const BACKEND_LIVE = Boolean(URL && ANON);

let _client = null;
export function getClient() {
  if (!BACKEND_LIVE) return null;
  if (!_client) {
    // 단일 클라이언트:
    //  · 관리자·파트너 로그인은 세션 유지(persistSession·autoRefresh).
    //  · 보호자 링크는 로그인하지 않고 anon 키로 RPC만 호출 → 세션 영향 없음.
    //  · 운영 테이블은 memoria 스키마. 테이블 접근 시 .schema("memoria") 사용.
    _client = createClient(URL, ANON, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    });
  }
  return _client;
}

// 운영 테이블(memoria 스키마) 접근용 헬퍼. 없으면 null(목업).
export function db() {
  const sb = getClient();
  return sb ? sb.schema("memoria") : null;
}
