// ─────────────────────────────────────────────────────────────
// 영상 템플릿 데이터 계층 — 파트너별 1행 + __default__. memoria.templates(RLS).
//   store.templates = { [partnerId]: { bgm, blocks:[{id,type,assetId?}] } } ↔ DB(bgm_id, blocks jsonb)
// ─────────────────────────────────────────────────────────────
import { db } from "../supabase.js";

const need = () => { const d = db(); if (!d) throw new Error("백엔드 미연결"); return d; };
const mapTpl = (r) => ({ bgm: r.bgm_id ?? null, blocks: r.blocks || [] });
const toRow = (partnerId, t) => ({
  partner_id: partnerId, bgm_id: t.bgm ?? null, blocks: t.blocks || [],
  updated_at: new Date().toISOString(),
});

export async function fetchTemplates() {
  const d = need();
  const { data, error } = await d.from("templates").select("*");
  if (error) throw new Error("템플릿 조회 실패: " + error.message);
  const out = {};
  (data || []).forEach((r) => { out[r.partner_id] = mapTpl(r); });
  return out;
}

export async function upsertTemplate(partnerId, tpl) {
  const d = need();
  const { error } = await d.from("templates").upsert(toRow(partnerId, tpl));
  if (error) throw new Error(error.message);
}

export async function upsertMany(templatesObj) {
  const d = need();
  const rows = Object.entries(templatesObj).map(([pid, t]) => toRow(pid, t));
  if (!rows.length) return;
  const { error } = await d.from("templates").upsert(rows);
  if (error) throw new Error(error.message);
}
