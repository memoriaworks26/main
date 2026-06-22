// 파트너 콘솔 공용 — 파트너 컨텍스트 + 호실/시간 슬롯 계산 헬퍼.
// 예약은 호실을 시간대(10분 단위)로 잡으므로 슬롯 파싱/겹침/충돌 검사 로직을 공유.
import React from "react";
import * as D from "../data.js";
import { pad2 } from "../lib/util.js";
import { GOLD_D, GOLD_SOFT, GOLD } from "../theme.js";
import { useStore, term } from "../store.js";

export const PartnerCtx = React.createContext(D.PARTNERS[0]);
export const usePartner = () => React.useContext(PartnerCtx);
// 파트너 콘솔 용어 — 그 파트너의 사업부 기준으로 사업부별 표기를 읽는다. tp("subject") 등.
export function usePartnerTerm() {
  const p = usePartner();
  const s = useStore();
  return (key) => term(s, key, "partner", p?.bizUnit || D.BIZ_UNITS[0].id);
}
export const ICON = "h-4 w-4";

export const HOURS = Array.from({ length: 24 }, (_, i) => i); // 00 ~ 23시
export const MINS = [0, 10, 20, 30, 40, 50];
export { pad2 };
export const minToStr = (m) => pad2(Math.floor(m / 60)) + ":" + pad2(m % 60); // 분 → "HH:MM" (intake·dashboard 공용)

// 현재(파트너 세션) 호실 이름 목록 — store.rooms 기반(라이브=그 파트너 호실, 목업=D.ROOMS).
export function useCaseRooms() {
  const s = useStore();
  return s.rooms.filter((r) => r.type === "case").map((r) => r.name);
}

export function parseSlot(slot) {
  if (!slot) return { start: 0, end: 0, startStr: "", endStr: "" };
  const [s, e] = slot.split("~");
  const toMin = (t) => { const [h, m] = (t || "").trim().split(":").map(Number); return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m); };
  return { start: toMin(s), end: toMin(e), startStr: (s || "").trim(), endStr: (e || "").trim() };
}
export const TIMELINE_START = 0;        // 00:00 — 새벽 예약/표출까지 커버(반려동물 장례 24시간)
export const TIMELINE_END   = 24 * 60;  // 24:00
export const BLOCK_COLOR = "#a8782e"; // 타임라인 블록 통일 색

// "2026-06-15" → 일련 정수(자정 넘김 비교용). 잘못된 값은 0.
export function dayNum(dateStr) {
  const [y, m, d] = (dateStr || "").split("-").map(Number);
  if (!y || !m || !d) return 0;
  return Math.round(Date.UTC(y, m - 1, d) / 86400000);
}
// "2026-06-15" → 다음날 "2026-06-16"
export function nextDay(dateStr) {
  const [y, m, d] = (dateStr || "").split("-").map(Number);
  if (!y) return dateStr || "";
  const dt = new Date(Date.UTC(y, m - 1, d + 1));
  return dt.getUTCFullYear() + "-" + pad2(dt.getUTCMonth() + 1) + "-" + pad2(dt.getUTCDate());
}
// 슬롯이 자정을 넘기는가 = 종료 < 시작 (예: 22:30~01:30). 같은 값(0길이)은 자정 넘김 아님.
export function isOvernight(slot) {
  const { start, end } = parseSlot(slot);
  return end < start;
}
// 시작·종료로부터 종료일 계산 — 자정 넘김이면 예약일 +1, 아니면 예약일 그대로.
export function endDateFor(date, slot) {
  return isOvernight(slot) ? nextDay(date) : date;
}
// 예약을 절대 분(分) 구간으로 환산 — 날짜를 분으로 펴서 자정 넘김까지 일관 비교.
// endDate가 있으면 그것을, 없으면 종료<시작일 때 다음날로 간주.
export function reservInterval(r) {
  const { start, end } = parseSlot(r.slot);
  const d0 = dayNum(r.date);
  const d1 = r.endDate ? dayNum(r.endDate) : (end < start ? d0 + 1 : d0);
  return { startAbs: d0 * 1440 + start, endAbs: d1 * 1440 + end };
}
// 슬롯 표시 문자열 — 자정 넘김이면 종료에 '익일' 표기. ex) "22:30~익일 01:30"
export function slotLabel(slot) {
  const { startStr, endStr } = parseSlot(slot);
  if (!startStr) return slot || "";
  return isOvernight(slot) ? `${startStr}~익일 ${endStr}` : `${startStr}~${endStr}`;
}

// '익일' 배지 — 자정 넘김 예약을 한눈에 구분(골드 톤 pill).
export function OvernightBadge({ style }) {
  return (
    <span className="shrink-0 font-bold tabular-nums" style={{ marginLeft: 5, padding: "1px 5px", fontSize: 10, lineHeight: 1.4, borderRadius: 4, background: GOLD_SOFT, color: GOLD_D, border: "1px solid " + GOLD, ...style }}>익일</span>
  );
}
// 슬롯 표시 컴포넌트 — 시간 텍스트 + 자정 넘김이면 '익일' 배지. 목록·상세 공용.
export function SlotText({ slot, className, style }) {
  const { startStr, endStr } = parseSlot(slot);
  if (!startStr) return <span className={className} style={style}>{slot || ""}</span>;
  return (
    <span className={className} style={{ display: "inline-flex", alignItems: "center", whiteSpace: "nowrap", ...style }}>
      {startStr}~{endStr}{isOvernight(slot) && <OvernightBadge />}
    </span>
  );
}

export function overlaps(a, b) {
  if (a.id === b.id) return false;
  const ia = reservInterval(a), ib = reservInterval(b);
  return ia.startAbs < ib.endAbs && ib.startAbs < ia.endAbs;
}

// rows 중 targetRoom·date의 newSlot과 겹치는 예약이 있는가. date는 자정 넘김 비교에 필수.
export function hasRoomConflict(rows, targetRoom, newSlot, excludeId, date) {
  const a = { id: excludeId, slot: newSlot, date, endDate: endDateFor(date, newSlot) };
  return rows.some((x) => x.room === targetRoom && x.id !== excludeId && overlaps(a, x));
}

