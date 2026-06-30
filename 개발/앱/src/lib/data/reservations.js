// ─────────────────────────────────────────────────────────────
// 예약 데이터 계층 (PII) — store 라이브일 때 호출. memoria 스키마(RLS 적용).
//   partner_id ↔ partner 이름(embed), room_label↔room, assignee_name↔assignee,
//   render_at(timestamptz)↔renderAt(epoch ms, 진행바 계산용) 매핑.
// ─────────────────────────────────────────────────────────────
import { db } from "../supabase.js";

const need = () => { const d = db(); if (!d) throw new Error("백엔드 미연결"); return d; };

// 요청시각 표시 포맷 — DB는 ISO(timestamptz). 화면은 짧게 "MM.DD HH:mm"(KST). 목업 짧은형식은 그대로.
const fmtReqAt = (v) => {
  if (!v) return "";
  if (!String(v).includes("T")) return v;            // 이미 짧은 형식
  const d = new Date(v); if (isNaN(d)) return String(v);
  const k = new Date(d.getTime() + 9 * 3600 * 1000); // UTC→KST
  const p = (n) => String(n).padStart(2, "0");
  return `${p(k.getUTCMonth() + 1)}.${p(k.getUTCDate())} ${p(k.getUTCHours())}:${p(k.getUTCMinutes())}`;
};

const mapReserv = (r) => ({
  id: r.id,
  partnerId: r.partner_id,
  partner: r.partner?.name ?? r.partner_id,   // 화면·사업부 스코핑은 이름 사용
  deceased: r.deceased, chief: r.chief, phone: r.phone,
  breed: r.breed, age: r.age,
  // 호실은 room_id의 '현재 이름'(rooms 조인) 우선 → 호실명 변경이 즉시 반영(staleness 없음). 폴백 room_label(레거시·미해석).
  room: r.room?.name ?? r.room_label,
  roomId: r.room_id ?? null,
  date: r.reserve_date, endDate: r.end_date, slot: r.slot,
  requestedAt: fmtReqAt(r.requested_at),
  status: r.status,
  assignee: r.assignee_name,          // HQ 작업자(편집·컨펌 받기)
  intakeManager: r.intake_manager,    // 파트너 예약담당(접수자)
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
    room_id: p.roomId,                  // 호실명 변경 staleness 방지(조회 시 room_id의 현재 이름으로 도출). 호실 변경 시에만 store가 채움.
    reserve_date: p.date, end_date: p.endDate, slot: p.slot,
    requested_at: p.requestedAt,
    status: p.status,
    assignee_name: p.assignee,
    intake_manager: p.intakeManager,
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
    .from("reservations").select("*, partner:partners(name), room:rooms(name)").order("requested_at", { ascending: true });
  if (error) throw new Error("예약 조회 실패: " + error.message);
  return (data || []).map(mapReserv);
}

export async function createReservation(r) {
  const d = need();
  const { data, error } = await d.from("reservations").insert(toRow(r)).select("*, partner:partners(name), room:rooms(name)").single();
  if (error) throw new Error(error.message);
  return mapReserv(data);
}

export async function updateReservation(id, patch) {
  const d = need();
  const { data, error } = await d.from("reservations").update(toRow(patch)).eq("id", id).select("*, partner:partners(name), room:rooms(name)").single();
  if (error) throw new Error(error.message);
  return mapReserv(data);
}

export async function deleteReservations(ids) {
  const d = need();
  const { error } = await d.from("reservations").delete().in("id", ids);
  if (error) throw new Error(error.message);
}
