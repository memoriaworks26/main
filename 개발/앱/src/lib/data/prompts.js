// AI 프롬프트(ai_prompts) 데이터 계층 — 타깃별 프롬프트(텍스트 + 참고 이미지) 관리.
//   생성 시 드롭다운에서 고른 프롬프트의 텍스트 + 참고이미지를 함께 Higgsfield로 전송.
import { db, getClient } from "../supabase.js";

const need = () => { const d = db(); if (!d) throw new Error("백엔드 미연결"); return d; };
const map = (r) => ({ id: r.id, target: r.target, name: r.name, body: r.body, active: r.active, refImage: r.ref_image || null });
const _ext = (n = "") => { const i = n.lastIndexOf("."); return i > 0 ? n.slice(i + 1) : "png"; };
const _uniq = () => globalThis.crypto?.randomUUID?.() || Date.now() + "-" + Math.random().toString(36).slice(2, 8);

export async function fetchPrompts() {
  const d = need();
  const { data, error } = await d.from("ai_prompts").select("*").order("created_at");
  if (error) throw new Error("프롬프트 조회 실패: " + error.message);
  const list = (data || []).map(map);
  // 참고이미지 서명URL(미리보기용). memoria-content.
  const paths = list.map((p) => p.refImage).filter(Boolean);
  if (paths.length) {
    const { data: signed } = await getClient().storage.from("memoria-content").createSignedUrls(paths, 3600);
    const m = {}; (signed || []).forEach((s, i) => { if (s && s.signedUrl) m[paths[i]] = s.signedUrl; });
    list.forEach((p) => { if (p.refImage) p.refImageUrl = m[p.refImage] || null; });
  }
  return list;
}

export async function upsertPrompt(p) {
  const d = need();
  const row = { target: p.target, name: p.name, body: p.body };
  if (p.refImage !== undefined) row.ref_image = p.refImage;
  row.id = p.id || ("pr-" + _uniq());
  const { data, error } = await d.from("ai_prompts").upsert(row).select("*").single();
  if (error) throw new Error(error.message);
  return map(data);
}

export async function deletePrompt(id) {
  const d = need();
  const { error } = await d.from("ai_prompts").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// 타깃별 선택(활성) 1개 — 나머지 비활성 후 지정. (드롭다운 선택 = 생성에 사용)
export async function setActivePrompt(id, target) {
  const d = need();
  await d.from("ai_prompts").update({ active: false }).eq("target", target);
  const { error } = await d.from("ai_prompts").update({ active: true }).eq("id", id);
  if (error) throw new Error(error.message);
}

// 프롬프트 참고 이미지 업로드(memoria-content) → ref_image 갱신.
export async function uploadPromptRef(id, file) {
  const path = `prompt-ref/${_uniq()}.${_ext(file.name)}`;
  const { error: ue } = await getClient().storage.from("memoria-content").upload(path, file, { contentType: file.type || undefined });
  if (ue) throw new Error("업로드 실패: " + ue.message);
  const { error } = await need().from("ai_prompts").update({ ref_image: path }).eq("id", id);
  if (error) throw new Error(error.message);
  return path;
}

export async function clearPromptRef(id) {
  const { error } = await need().from("ai_prompts").update({ ref_image: null }).eq("id", id);
  if (error) throw new Error(error.message);
}
