// ─────────────────────────────────────────────────────────────
// 스토리지 헬퍼 — Supabase Storage(비공개 버킷). 다운로드는 서명URL로만.
//   provider 무관 설계 유지: 버킷명만 여기서 관리(추후 R2 전환 시 이 레이어만 교체).
//   storage RLS(0018)가 접근을 통제 — 서명URL 발급도 권한 있는 세션에서만 성공.
// ─────────────────────────────────────────────────────────────
import { getClient } from "./supabase.js";

export const BUCKETS = {
  uploads: "memoria-uploads",  // 보호자 원본(사진·영상)
  final: "memoria-final",      // 발행 최종본 + 원본 아카이브(zip)
  content: "memoria-content",  // 콘텐츠 허브 자산(클립·사진)
};

const need = () => { const sb = getClient(); if (!sb) throw new Error("백엔드 미연결"); return sb; };

// 비공개 객체 다운로드/재생용 서명 URL(기본 1시간).
export async function signedUrl(bucket, path, expiresSec = 3600) {
  const sb = need();
  const { data, error } = await sb.storage.from(bucket).createSignedUrl(path, expiresSec);
  if (error) throw new Error("서명URL 발급 실패: " + error.message);
  return data.signedUrl;
}

// 파일 업로드. path는 버킷 내 경로(예: `${partnerId}/${assetId}.mp4`). 반환: 저장 경로.
export async function uploadFile(bucket, path, file, { upsert = false } = {}) {
  const sb = need();
  const { error } = await sb.storage.from(bucket).upload(path, file, { upsert, contentType: file.type || undefined });
  if (error) throw new Error("업로드 실패: " + error.message);
  return path;
}

export async function removeFiles(bucket, paths) {
  const sb = need();
  const { error } = await sb.storage.from(bucket).remove(Array.isArray(paths) ? paths : [paths]);
  if (error) throw new Error("삭제 실패: " + error.message);
}

// 서명URL을 만들어 브라우저 다운로드 트리거 + (가능하면) 감사로그 적재.
//   audit = { action, targetType, targetId, partnerId } — log_access RPC(추기전용)로 누가 받았는지 기록.
export async function downloadAsset(bucket, path, filename, audit) {
  const sb = need();
  const url = await signedUrl(bucket, path, 300);
  if (audit) {
    try {
      await sb.schema("memoria").rpc("log_access", {
        p_action: audit.action || "download", p_target_type: audit.targetType || "video",
        p_target_id: audit.targetId || path, p_partner_id: audit.partnerId || null,
        p_detail: { bucket, path, filename },
      });
    } catch { /* 감사로그 실패는 다운로드를 막지 않음 */ }
  }
  const a = document.createElement("a");
  a.href = url; a.download = filename || path.split("/").pop(); a.rel = "noopener";
  document.body.appendChild(a); a.click(); a.remove();
}

// 확장자 추출(경로 생성용).
export const extOf = (name = "") => { const i = name.lastIndexOf("."); return i > 0 ? name.slice(i + 1).toLowerCase() : "bin"; };
