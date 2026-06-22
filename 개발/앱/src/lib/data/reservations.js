// ─────────────────────────────────────────────────────────────
// 예약 데이터 계층 (PII) — store 라이브일 때 호출. memoria 스키마(RLS 적용).
//   partner_id ↔ partner 이름(embed), room_label↔room, assignee_name↔assignee,
//   render_at(timestamptz)↔renderAt(epoch ms, 진행바 계산용) 매핑.
// ─────────────────────────────────────────────────────────────
import { db } from "../supabase.js";

const need = () => { const d = db(); if (!d) throw new Error("백엔드 미연결"); return d; };

const mapReserv = (r) => ({
  id: r.id,
  partnerId: r.partner_id,
  partner: r.partner?.name ?? r.partner_id,   // 화면·사업부 스코핑은 이름 사용
  deceased: r.deceased, chief: r.chief, phone: r.phone,
  breed: r.breed, age: r.age,
  room: r.room_label,
  date: r.reserve_date, endDate: r.end_date, slot: r.slot,
  requestedAt: r.requested_at,
  status: r.status,
  assignee: r.assignee_name,
  renderAt: r.render_at ? Date.parse(r.render_at) : undefined,
  renderDur: r.render_dur ?? undefined,
});

// app→DB. 정의된 키만(부분 update).
const toRow = (p) => {
  const m = {
    partner_id: p.partnerId,
    deceased: p.deceased, chief: p.chief, phone: p.phone,
    breed: p.breed, age: p.age,
    room_label: p.room,
    reserve_date: p.date, end_date: p.endDate, slot: p.slot,
    requested_at: p.requestedAt,
    status: p.status,
    assignee_name: p.assignee,
    render_dur: p.renderDur,
    render_at: typeof p.renderAt === "number" ? new Date(p.renderAt).toISOString() : p.renderAt,
  };
  if ("id" in p) m.id = p.id;
  Object.keys(m).forEach((k) => m[k] === undefined && delete m[k]);
  return m;
};

export async function fetchReservations() {
  const d = need();
  const { data, error } = await d
    .from("reservations").select("*, partner:partners(name)").order("requested_at", { ascending: true });
  if (error) throw new Error("예약 조회 실패: " + error.message);
  return (data || []).map(mapReserv);
}

export async function createReservation(r) {
  const d = need();
  const { data, error } = await d.from("reservations").insert(toRow(r)).select("*, partner:partners(name)").single();
  if (error) throw new Error(error.message);
  return mapReserv(data);
}

export async function updateReservation(id, patch) {
  const d = need();
  const { data, error } = await d.from("reservations").update(toRow(patch)).eq("id", id).select("*, partner:partners(name)").single();
  if (error) throw new Error(error.message);
  return mapReserv(data);
}

export async function deleteReservations(ids) {
  const d = need();
  const { error } = await d.from("reservations").delete().in("id", ids);
  if (error) throw new Error(error.message);
}
