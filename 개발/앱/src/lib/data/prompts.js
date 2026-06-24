// AI 프롬프트(ai_prompts) 데이터 계층 — 타깃별(타이틀·AI영상) 프롬프트 관리 + 활성(생성에 사용) 선택.
import { db } from "../supabase.js";

const need = () => { const d = db(); if (!d) throw new Error("백엔드 미연결"); return d; };
const map = (r) => ({ id: r.id, target: r.target, name: r.name, body: r.body, active: r.active });

export async function fetchPrompts() {
  const d = need();
  const { data, error } = await d.from("ai_prompts").select("*").order("created_at");
  if (error) throw new Error("프롬프트 조회 실패: " + error.message);
  return (data || []).map(map);
}

export async function upsertPrompt(p) {
  const d = need();
  const row = { target: p.target, name: p.name, body: p.body };
  row.id = p.id || ("pr-" + (globalThis.crypto?.randomUUID?.() || Date.now()));
  const { data, error } = await d.from("ai_prompts").upsert(row).select("*").single();
  if (error) throw new Error(error.message);
  return map(data);
}

export async function deletePrompt(id) {
  const d = need();
  const { error } = await d.from("ai_prompts").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// 타깃별 활성 1개 — 나머지 비활성 후 지정.
export async function setActivePrompt(id, target) {
  const d = need();
  await d.from("ai_prompts").update({ active: false }).eq("target", target);
  const { error } = await d.from("ai_prompts").update({ active: true }).eq("id", id);
  if (error) throw new Error(error.message);
}
