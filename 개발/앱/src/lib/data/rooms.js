// ─────────────────────────────────────────────────────────────
// 호실(rooms) 데이터 계층 — 파트너별. memoria(RLS: 파트너 자기것·staff partners perm).
//   store room: { id, name, floor, type, sortOrder, partnerId } ↔ DB rooms.
//   파트너 콘솔(파트너 세션)에서만 hydrate. 신규 파트너 생성 시 호실 수만큼 자동 생성.
// ─────────────────────────────────────────────────────────────
import { db } from "../supabase.js";

const need = () => { const d = db(); if (!d) throw new Error("백엔드 미연결"); return d; };
const mapRoom = (r) => ({ id: r.id, partnerId: r.partner_id, name: r.name, floor: r.floor, type: r.type || "case", sortOrder: r.sort_order });

export async function fetchRooms(partnerId) {
  const d = need();
  let q = d.from("rooms").select("*").order("sort_order");
  if (partnerId) q = q.eq("partner_id", partnerId);  // 마스터 '파트너로 보기' 스코핑
  const { data, error } = await q;
  if (error) throw new Error("호실 조회 실패: " + error.message);
  return (data || []).map(mapRoom);
}

export async function updateRoom(id, patch) {
  const d = need();
  const row = {};
  for (const k of ["name", "floor", "type"]) if (patch[k] !== undefined) row[k] = patch[k];
  if (patch.sortOrder !== undefined) row.sort_order = patch.sortOrder;
  const { data, error } = await d.from("rooms").update(row).eq("id", id).select().single();
  if (error) throw new Error(error.message);
  return mapRoom(data);
}

// 신규 파트너 호실 자동 생성(1호실..N호실). 이름은 이후 대시보드에서 수정.
export async function createRoomsForPartner(partnerId, count) {
  const d = need();
  const n = Math.max(0, Math.min(50, Number(count) || 0));
  if (!n) return [];
  const rows = Array.from({ length: n }, (_, i) => ({
    partner_id: partnerId, name: `${i + 1}호실`, floor: "1층", type: "case", sort_order: i,
  }));
  const { data, error } = await d.from("rooms").insert(rows).select();
  if (error) throw new Error(error.message);
  return (data || []).map(mapRoom);
}
