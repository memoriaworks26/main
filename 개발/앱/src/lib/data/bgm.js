// 배경 음악(bgm) — 실제 음원 파일 업로드(memoria-content) + 파트너 템플릿에 적용.
import { db, getClient } from "../supabase.js";

const need = () => { const d = db(); if (!d) throw new Error("백엔드 미연결"); return d; };
const _ext = (n = "") => { const i = n.lastIndexOf("."); return i > 0 ? n.slice(i + 1) : "mp3"; };
const _uniq = () => globalThis.crypto?.randomUUID?.() || Date.now() + "-" + Math.random().toString(36).slice(2, 8);

export async function fetchBgm() {
  const d = need();
  const { data, error } = await d.from("bgm").select("id, name, storage_path").order("created_at");
  if (error) throw new Error("BGM 조회 실패: " + error.message);
  return (data || []).map((r) => ({ id: r.id, name: r.name, hasFile: !!r.storage_path }));
}

// 음원 파일 업로드 → bgm 행 생성 + 파트너 템플릿 bgm_id 지정.
export async function uploadBgm(partnerId, file) {
  const sbc = getClient();
  const path = `bgm/${_uniq()}.${_ext(file.name)}`;
  const { error: ue } = await sbc.storage.from("memoria-content").upload(path, file, { contentType: file.type || "audio/mpeg" });
  if (ue) throw new Error("업로드 실패: " + ue.message);
  const d = need();
  const id = "bgm-" + _uniq();
  const { error: be } = await d.from("bgm").upsert({ id, name: file.name, storage_path: path });
  if (be) throw new Error(be.message);
  if (partnerId) { const { error: te } = await d.from("templates").update({ bgm_id: id }).eq("partner_id", partnerId); if (te) throw new Error(te.message); }
  return { id, name: file.name };
}
