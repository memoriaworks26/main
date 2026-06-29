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

// 파트너 호실 수를 target에 맞춰 동기화(파트너사 수정에서 호실 수 변경 시).
//   늘면 뒤에 추가 / 줄면 정렬 큰(뒤쪽) 호실부터 삭제.
//   삭제해도 reservations·signage_devices.room_id 는 on delete set null → 예약·디바이스는 보존(연결만 해제).
export async function syncRoomsForPartner(partnerId, targetCount) {
  const d = need();
  const target = Math.max(0, Math.min(50, Number(targetCount) || 0));
  const { data: cur, error: e0 } = await d.from("rooms")
    .select("id, name, sort_order").eq("partner_id", partnerId).order("sort_order");
  if (e0) throw new Error("호실 조회 실패: " + e0.message);
  const rooms = cur || [];
  if (target === rooms.length) return await fetchRooms(partnerId);
  if (target > rooms.length) {
    // 추가 — 이름 중복(unique partner_id,name) 회피하며 다음 번호부터 채움.
    const taken = new Set(rooms.map((r) => r.name));
    const baseSort = rooms.length ? Math.max(...rooms.map((r) => r.sort_order)) + 1 : 0;
    const add = [];
    let n = rooms.length;
    while (add.length < target - rooms.length) {
      n += 1;
      const name = `${n}호실`;
      if (taken.has(name)) continue; // 이미 쓰는 이름이면 다음 번호로
      taken.add(name);
      add.push({ partner_id: partnerId, name, floor: "1층", type: "case", sort_order: baseSort + add.length });
    }
    const { error } = await d.from("rooms").insert(add);
    if (error) throw new Error("호실 추가 실패: " + error.message);
  } else {
    // 줄이기 — 정렬 큰(뒤쪽) 초과분 삭제.
    const remove = rooms.slice(target).map((r) => r.id);
    const { error } = await d.from("rooms").delete().in("id", remove);
    if (error) throw new Error("호실 삭제 실패: " + error.message);
  }
  return await fetchRooms(partnerId);
}
