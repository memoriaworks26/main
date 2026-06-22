// ─────────────────────────────────────────────────────────────
// 보호자 유저링크 API — 토큰 기반 비로그인 접근.
//   resolveLink : 토큰 → 빈소/반려동물 컨텍스트 + 진행 상태
//   uploadAsset : 사진·영상 1건을 스토리지로 업로드
//   submitLink  : 위저드 입력 일괄 제출 → status='queued'(렌더 큐잉, 워커는 후속)
// 라이브(env 설정)면 Supabase, 아니면 목업으로 동일 인터페이스 폴백.
// ─────────────────────────────────────────────────────────────
import { getClient, BACKEND_LIVE, UPLOAD_BUCKET } from "./supabase.js";

// URL에서 토큰 추출: /u/<token> 경로 또는 ?t=<token> 쿼리. 없으면 null(데모).
export function getToken() {
  if (typeof window === "undefined") return null;
  const m = window.location.pathname.match(/\/u\/([A-Za-z0-9_-]{6,})/);
  if (m) return m[1];
  const q = new URLSearchParams(window.location.search).get("t");
  return q && q.length >= 6 ? q : null;
}

// 완성 영상 재생/공유 링크 — 같은 토큰을 재사용(상태에 따라 제작중/완료 표시).
export function shareUrlFor(token) {
  const base = typeof window !== "undefined" ? window.location.origin : "";
  return token ? `${base}/u/${token}` : `${base}/u/demo`;
}

const ext = (name = "") => {
  const i = name.lastIndexOf(".");
  return i > 0 ? name.slice(i + 1).toLowerCase() : "bin";
};

// 데모(토큰 없거나 백엔드 미설정) 컨텍스트 — 기존 목업과 동일한 노출.
const DEMO = { mode: "demo", ok: true, token: null, petName: "콩이", partnerName: "무지개동산 반려동물장례식장", status: "draft", videoUrl: null, expiresAt: null };

// 토큰 해석. 실패 시 ok:false + error.
export async function resolveLink(token) {
  if (!token) return { ...DEMO };
  if (!BACKEND_LIVE) return { ...DEMO, token }; // env 전: 데모지만 공유링크는 토큰으로
  try {
    const sb = getClient();
    const { data, error } = await sb.rpc("resolve_link", { p_token: token });
    if (error || !data) return { mode: "live", ok: false, token, error: error?.message || "링크를 찾을 수 없습니다." };
    return {
      mode: "live", ok: true, token,
      petName: data.pet_name, partnerName: data.partner_name,
      status: data.status, videoUrl: data.video_url, expiresAt: data.expires_at,
    };
  } catch (e) {
    return { mode: "live", ok: false, token, error: e.message };
  }
}

// 토큰의 사업부 공개설정(예시사진·유저문구·동의문구·고객센터 등) — 토큰 검증 후 화이트리스트.
//   없거나 실패하면 null(호출측이 기본값으로 폴백). 계좌·사업자번호 등 민감정보는 미포함.
export async function fetchLinkConfig(token) {
  if (!BACKEND_LIVE || !token) return null;
  try {
    const sb = getClient();
    const { data, error } = await sb.rpc("get_user_link_config", { p_token: token });
    if (error || !data) return null;
    return data; // { cs_phone, cs_hours, consent_privacy, consent_marketing, privacy_policy, privacy_officer, terms, user_text, user_photos }
  } catch { return null; }
}

// 파일 1건 업로드. 반환: { storagePath, name, sizeMB, kind }.
// 라이브가 아니면 업로드를 건너뛰고 합성 경로만 돌려준다(목업 동작 유지).
export async function uploadAsset(token, file, { kind }) {
  const sizeMB = +(file.size / 1048576).toFixed(1);
  if (!BACKEND_LIVE || !token) {
    return { storagePath: `demo/${file.name}`, name: file.name, sizeMB, kind };
  }
  const sb = getClient();
  const path = `${token}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext(file.name)}`;
  const { error } = await sb.storage.from(UPLOAD_BUCKET).upload(path, file, {
    contentType: file.type || undefined, upsert: false,
  });
  if (error) throw new Error("업로드 실패: " + error.message);
  return { storagePath: path, name: file.name, sizeMB, kind };
}

// 위저드 입력 일괄 제출.
// payload: { titleIndex, transDefault, transMap, bgmId, letter, privacyAgreed, marketingAgreed, assets:[{kind,role,name,sizeMB,storagePath,sortOrder}] }
// 반환: { ok, status, shareUrl, error? }
export async function submitLink(token, payload) {
  const shareUrl = shareUrlFor(token);
  if (!BACKEND_LIVE || !token) {
    // env 전: 실제 큐잉 없이 완료 화면만 — 인터페이스는 라이브와 동일.
    return { ok: true, status: "queued", shareUrl, mode: "demo" };
  }
  try {
    const sb = getClient();
    const { data, error } = await sb.rpc("submit_link", { p_token: token, p_payload: payload });
    if (error) return { ok: false, error: error.message };
    return { ok: true, status: data?.status || "queued", shareUrl, mode: "live" };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}
