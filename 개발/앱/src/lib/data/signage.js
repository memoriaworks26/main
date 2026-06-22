// ─────────────────────────────────────────────────────────────
// 사이니지 데이터 계층 — devices(파트너별). memoria(RLS: 파트너 자기것·staff signage perm).
//   store device: { id, partner(이름), room, status, playing, mode, volume, muted, ip, lastComm }
//   ↔ DB signage_devices(partner_id, room_label, last_comm …). play(재생/정지)은 전송제어 — DB 미저장(Phase8).
//   sources/notice는 다음 슬라이스.
// ─────────────────────────────────────────────────────────────
import { db } from "../supabase.js";

const need = () => { const d = db(); if (!d) throw new Error("백엔드 미연결"); return d; };
const mapDevice = (r) => ({
  id: r.id, partner: r.partner?.name, room: r.room_label,
  status: r.status, playing: r.playing, mode: r.mode,
  volume: r.volume, muted: r.muted, ip: r.ip, lastComm: r.last_comm,
});

export async function fetchDevices() {
  const d = need();
  const { data, error } = await d.from("signage_devices").select("*, partner:partners(name)").order("id");
  if (error) throw new Error("디바이스 조회 실패: " + error.message);
  return (data || []).map(mapDevice);
}

// mode/volume/muted/playing/status만 DB 반영(play 등 전송제어 상태는 store 전용).
export async function updateDevice(id, patch) {
  const d = need();
  const row = {};
  for (const k of ["mode", "volume", "muted", "playing", "status"]) if (patch[k] !== undefined) row[k] = patch[k];
  if (!Object.keys(row).length) return;
  const { error } = await d.from("signage_devices").update(row).eq("id", id);
  if (error) throw new Error(error.message);
}

// ── 표출 소스(광고·대기·알림) — 파트너별 ──
const mapSource = (r) => ({ id: r.id, cat: r.cat, name: r.name, kind: r.kind, file: r.file, active: r.active });

export async function fetchSources(partnerId) {
  const d = need();
  let q = d.from("signage_sources").select("*").order("id");
  if (partnerId) q = q.eq("partner_id", partnerId);
  const { data, error } = await q;
  if (error) throw new Error("소스 조회 실패: " + error.message);
  return (data || []).map(mapSource);
}
export async function addSource(partnerId, src) {
  const d = need();
  const { data, error } = await d.from("signage_sources")
    .insert({ id: src.id, partner_id: partnerId, cat: src.cat, name: src.name, kind: src.kind, file: src.file, active: !!src.active })
    .select().single();
  if (error) throw new Error(error.message);
  return mapSource(data);
}
export async function removeSource(id) {
  const d = need();
  const { error } = await d.from("signage_sources").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
// 카테고리당 1개만 활성: cat 전체 끄고, on이면 대상만 켬.
export async function selectSource(partnerId, id, cat, on) {
  const d = need();
  let r = await d.from("signage_sources").update({ active: false }).eq("partner_id", partnerId).eq("cat", cat);
  if (r.error) throw new Error(r.error.message);
  if (on) { r = await d.from("signage_sources").update({ active: true }).eq("id", id); if (r.error) throw new Error(r.error.message); }
}

// ── 알림 문구(파트너별 1행) ──
export async function fetchNotice(partnerId) {
  const d = need();
  let q = d.from("signage_notice").select("*");
  if (partnerId) q = q.eq("partner_id", partnerId);
  const { data, error } = await q.maybeSingle();
  if (error) throw new Error("알림 조회 실패: " + error.message);
  return data ? { enabled: data.enabled, template: data.template } : null;
}
export async function upsertNotice(partnerId, notice) {
  const d = need();
  const { error } = await d.from("signage_notice").upsert({ partner_id: partnerId, enabled: notice.enabled, template: notice.template });
  if (error) throw new Error(error.message);
}
