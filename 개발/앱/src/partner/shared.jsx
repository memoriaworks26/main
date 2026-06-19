// 파트너 콘솔 공용 — 파트너 컨텍스트 + 호실/시간 슬롯 계산 헬퍼.
// 예약은 호실을 시간대(10분 단위)로 잡으므로 슬롯 파싱/겹침/충돌 검사 로직을 공유.
import React from "react";
import * as D from "../data.js";
import { pad2 } from "../lib/util.js";

export const PartnerCtx = React.createContext(D.PARTNERS[0]);
export const usePartner = () => React.useContext(PartnerCtx);
export const ICON = "h-4 w-4";

export const HOURS = Array.from({ length: 24 }, (_, i) => i); // 00 ~ 23시
export const MINS = [0, 10, 20, 30, 40, 50];
export { pad2 };
export const minToStr = (m) => pad2(Math.floor(m / 60)) + ":" + pad2(m % 60); // 분 → "HH:MM" (intake·dashboard 공용)

export const CASE_ROOMS = D.ROOMS.filter((r) => r.type === "case").map((r) => r.name);

export function parseSlot(slot) {
  if (!slot) return { start: 0, end: 0, startStr: "", endStr: "" };
  const [s, e] = slot.split("~");
  const toMin = (t) => { const [h, m] = (t || "").trim().split(":").map(Number); return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m); };
  return { start: toMin(s), end: toMin(e), startStr: (s || "").trim(), endStr: (e || "").trim() };
}
export const TIMELINE_START = 0;        // 00:00 — 새벽 예약/표출까지 커버(반려동물 장례 24시간)
export const TIMELINE_END   = 24 * 60;  // 24:00
export const BLOCK_COLOR = "#a8782e"; // 타임라인 블록 통일 색

export function overlaps(a, b) {
  if (a.id === b.id) return false;
  const pa = parseSlot(a.slot), pb = parseSlot(b.slot);
  return pa.start < pb.end && pb.start < pa.end;
}

export function hasRoomConflict(rows, targetRoom, newSlot, excludeId) {
  return rows.some((x) => x.room === targetRoom && x.id !== excludeId && overlaps({ id: excludeId, slot: newSlot }, x));
}

