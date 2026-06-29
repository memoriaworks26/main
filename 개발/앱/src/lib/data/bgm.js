// 배경 음악(bgm) — 실제 음원 파일 업로드(memoria-content) + 파트너 템플릿에 적용.
import { db, getClient } from "../supabase.js";
import { uploadFileWithProgress } from "../storage.js";

const need = () => { const d = db(); if (!d) throw new Error("백엔드 미연결"); return d; };
const _ext = (n = "") => { const i = n.lastIndexOf("."); return i > 0 ? n.slice(i + 1) : "mp3"; };
const _uniq = () => globalThis.crypto?.randomUUID?.() || Date.now() + "-" + Math.random().toString(36).slice(2, 8);

// 공용 BGM 라이브러리 — 콘텐츠 허브 '음악' 탭과 템플릿 BGM 선택의 단일 소스.
export async function fetchBgm() {
  const d = need();
  const { data, error } = await d.from("bgm").select("id, name, meta, storage_path").order("created_at");
  if (error) throw new Error("BGM 조회 실패: " + error.message);
  return (data || []).map((r) => ({ id: r.id, kind: "audio", name: r.name, meta: r.meta, storagePath: r.storage_path, shared: true }));
}

// 음원 파일 업로드 → bgm 행 생성 + (partnerId 있을 때만) 그 파트너 템플릿 bgm_id 지정.
//   콘텐츠 허브 업로드는 partnerId=null → 라이브러리에만 추가(템플릿 미지정).
export async function uploadBgm(partnerId, file, meta, onProgress) {
  const path = `bgm/${_uniq()}.${_ext(file.name)}`;
  await uploadFileWithProgress("memoria-content", path, file, { onProgress }); // 진행률 표시 업로드
  const d = need();
  const id = "bgm-" + _uniq();
  const { error: be } = await d.from("bgm").upsert({ id, name: file.name, storage_path: path, meta: meta ?? null });
  if (be) throw new Error(be.message);
  if (partnerId) { const { error: te } = await d.from("templates").update({ bgm_id: id }).eq("partner_id", partnerId); if (te) throw new Error(te.message); }
  return { id, kind: "audio", name: file.name, meta: meta ?? null, storagePath: path, shared: true };
}

// BGM 삭제 — 이 곡을 쓰던 파트너 템플릿 참조부터 비우고, 행·스토리지 파일 제거.
export async function deleteBgm(id) {
  const d = need();
  const { data } = await d.from("bgm").select("storage_path").eq("id", id).maybeSingle();
  await d.from("templates").update({ bgm_id: null }).eq("bgm_id", id); // 끊긴 참조 방지(템플릿엔 'BGM 미지정' 표시)
  const { error } = await d.from("bgm").delete().eq("id", id);
  if (error) throw new Error("BGM 삭제 실패: " + error.message);
  if (data?.storage_path) {
    const sbc = getClient();
    try { await sbc.storage.from("memoria-content").remove([data.storage_path]); } catch { /* 파일 삭제 실패는 무시 — 행은 이미 제거됨 */ }
  }
}
