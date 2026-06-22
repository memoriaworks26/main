// ─────────────────────────────────────────────────────────────
// 2차 가공(재가공 큐) 데이터 계층 — 내부 staff 전용. memoria 스키마(RLS).
//   reservId↔reservation_id, assignee↔assignee_name, renderAt↔epoch 매핑.
// ─────────────────────────────────────────────────────────────
import { db } from "../supabase.js";

const need = () => { const d = db(); if (!d) throw new Error("백엔드 미연결"); return d; };

const mapJob = (j) => ({
  id: j.id, reservId: j.reservation_id, status: j.status, reason: j.reason,
  assignee: j.assignee_name,
  renderAt: j.render_at ? Date.parse(j.render_at) : undefined,
  renderDur: j.render_dur ?? undefined,
});

const toRow = (p) => {
  const m = {
    reservation_id: p.reservId, status: p.status, reason: p.reason,
    assignee_name: p.assignee, render_dur: p.renderDur,
    render_at: typeof p.renderAt === "number" ? new Date(p.renderAt).toISOString() : p.renderAt,
  };
  if ("id" in p) m.id = p.id;
  Object.keys(m).forEach((k) => m[k] === undefined && delete m[k]);
  return m;
};

export async function fetchSecondJobs() {
  const d = need();
  const { data, error } = await d.from("second_edit_jobs").select("*").order("created_at");
  if (error) throw new Error("2차 가공 조회 실패: " + error.message);
  return (data || []).map(mapJob);
}

export async function createSecondJob(job) {
  const d = need();
  const { data, error } = await d.from("second_edit_jobs").insert(toRow(job)).select().single();
  if (error) throw new Error(error.message);
  return mapJob(data);
}

export async function updateSecondJob(id, patch) {
  const d = need();
  const { data, error } = await d.from("second_edit_jobs").update(toRow(patch)).eq("id", id).select().single();
  if (error) throw new Error(error.message);
  return mapJob(data);
}

export async function deleteSecondJob(id) {
  const d = need();
  const { error } = await d.from("second_edit_jobs").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
