// ─────────────────────────────────────────────────────────────
// 사이니지 웹 디스플레이 링크 — 호실별 고유 토큰으로 비로그인 접근.
//   라즈베리파이 대신(또는 함께) 브라우저를 호실 TV로 쓴다. 파이와 똑같이
//   device-sync(verify_jwt=false, 토큰만으로 인증) 엔드포인트를 폴링한다.
//     · getSignageToken : /s/<token> 경로 또는 ?sig=<token> 쿼리에서 토큰 추출
//     · syncDevice      : device-sync 한 번 호출(파이 api.sync 와 동일 계약)
//   FUNCTIONS_BASE 는 admin/system.jsx 의 provision.json 과 동일 규칙.
// ─────────────────────────────────────────────────────────────

// 파이가 붙는 엣지함수 베이스 — env 없으면 빈 문자열(목업: 데모 화면 폴백).
export const FUNCTIONS_BASE = import.meta.env.VITE_SUPABASE_URL
  ? import.meta.env.VITE_SUPABASE_URL + "/functions/v1"
  : "";

// URL에서 사이니지 토큰 추출: /s/<token> 경로 또는 ?sig=<token> 쿼리. 없으면 null.
export function getSignageToken() {
  if (typeof window === "undefined") return null;
  const m = window.location.pathname.match(/\/s\/([A-Za-z0-9_-]{6,})/);
  if (m) return m[1];
  const q = new URLSearchParams(window.location.search).get("sig");
  return q && q.length >= 6 ? q : null;
}

// 호실 디스플레이 공개 링크(콘솔에서 복사·열기용)
export function signageUrlFor(token) {
  const base = typeof window !== "undefined" ? window.location.origin : "";
  return `${base}/s/${token}`;
}

// device-sync 1회 호출 — 파이 api.sync 와 동일한 요청/응답 계약.
//   요청 { token, current_video_id? } → 응답 { ok, mode, volume, muted, paused,
//          orientation, cmd, content:{kind,id,url,expires_at}, notice? }
export async function syncDevice(token, currentVideoId) {
  if (!FUNCTIONS_BASE) throw new Error("백엔드 미연결(VITE_SUPABASE_URL)");
  const res = await fetch(FUNCTIONS_BASE + "/device-sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, current_video_id: currentVideoId ?? null }),
  });
  let body;
  try { body = await res.json(); } catch { throw new Error("응답 파싱 실패(" + res.status + ")"); }
  if (!res.ok || body?.error) throw new Error(body?.error || ("동기화 실패(" + res.status + ")"));
  return body;
}
