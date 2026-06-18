// 파트너 콘솔 공용 — 파트너 컨텍스트 + 호실/시간 슬롯 계산 헬퍼.\n// 예약은 호실을 시간대(10분 단위)로 잡으므로 슬롯 파싱/겹침/충돌 검사 로직을 공유.
import React, { useContext, createContext } from "react";
import * as D from "../data.js";

export const PartnerCtx = React.createContext(D.PARTNERS[0]);
export const usePartner = () => React.useContext(PartnerCtx);
export const ICON = "h-4 w-4";

export const HOURS = Array.from({ length: 24 }, (_, i) => i); // 00 ~ 23시
export const MINS = [0, 10, 20, 30, 40, 50];
export const pad2 = (n) => String(n).padStart(2, "0");

export const CASE_ROOMS = D.ROOMS.filter((r) => r.type === "case").map((r) => r.name);

export function parseSlot(slot) {
  if (!slot) return { start: 0, end: 0, startStr: "", endStr: "" };
  const [s, e] = slot.split("~");
  const toMin = (t) => { const [h, m] = (t || "").trim().split(":").map(Number); return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m); };
  return { start: toMin(s), end: toMin(e), startStr: (s || "").trim(), endStr: (e || "").trim() };
}
export const TIMELINE_START = 8 * 60;
export const TIMELINE_END   = 24 * 60;
export const BLOCK_COLOR = "#a8782e"; // 타임라인 블록 통일 색

export function overlaps(a, b) {
  if (a.id === b.id) return false;
  const pa = parseSlot(a.slot), pb = parseSlot(b.slot);
  return pa.start < pb.end && pb.start < pa.end;
}

export function hasRoomConflict(rows, targetRoom, newSlot, excludeId) {
  return rows.some((x) => x.room === targetRoom && x.id !== excludeId && overlaps({ id: excludeId, slot: newSlot }, x));
}

