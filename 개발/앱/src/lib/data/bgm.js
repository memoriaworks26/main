// 배경 음악(bgm) — 실제 음원 파일 업로드(memoria-content) + 파트너 템플릿에 적용.
import { db, getClient } from "../supabase.js";
import { uploadFileWithProgress } from "../storage.js";

const need = () => { const d = db(); if (!d) throw new Error("백엔드 미연결"); return d; };
const _ext = (n = "") => { const i = n.lastIndexOf("."); return i > 0 ? n.slice(i + 1) : "mp3"; };
const _uniq = () => globalThis.crypto?.randomUUID?.() || Date.now() + "-" + Math.random().toString(36).slice(2, 8);

// BGM 라이브러리 — 콘텐츠 허브 '음악' 탭과 템플릿·편집기 BGM 선택의 단일 소스.
//   대상(partner_id): NULL=공용(전체 노출), 값=그 파트너 전용. (0053)
export async function fetchBgm() {
  const d = need();
  // partner_id 컬럼이 아직 없을 수 있어(마이그레이션 0053 적용 전) 실패 시 구버전 폴백 → 전부 공용.
  let res = await d.from("bgm").select("id, name, meta, storage_path, partner_id, partner:partners(name)").order("created_at");
  if (res.error) res = await d.from("bgm").select("id, name, meta, storage_path").order("created_at");
  if (res.error) throw new Error("BGM 조회 실패: " + res.error.message);
  return (res.data || []).map((r) => ({
    id: r.id, kind: "audio", name: r.name, meta: r.meta, storagePath: r.storage_path,
    shared: !r.partner_id,
    ...(r.partner_id ? { partnerId: r.partner_id, partner: r.partner?.name } : {}),
  }));
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

// BGM 이름 변경 — bgm.name 갱신(음원 파일·storage_path는 그대로).
export async function renameBgm(id, name) {
  const d = need();
  const { error } = await d.from("bgm").update({ name }).eq("id", id);
  if (error) throw new Error("이름 변경 실패: " + error.message);
}

// BGM 대상(귀속) 변경 — partnerId=null이면 공용, 값이면 그 파트너 전용. (0053)
export async function setBgmPartner(id, partnerId) {
  const d = need();
  const { error } = await d.from("bgm").update({ partner_id: partnerId || null }).eq("id", id);
  if (error) throw new Error("음악 대상 변경 실패: " + error.message);
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
