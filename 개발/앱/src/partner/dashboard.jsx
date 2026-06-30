// [파트너] 오늘 현황 대시보드 — 타임라인(호실×시간) + 빠른 슬롯 편집.
import React, { useState, useRef, useEffect } from "react";
import {
  Check, ChevronRight, Pencil, Plus,
} from "lucide-react";
import { SERIF, SURFACE, LINE, LINE2, GOLD, GOLD_D, INK, MUTE, FAINT, RADIUS } from "../theme.js";
import { Btn, MetricRow, Table, PageHeader, useTableSort } from "../ui.jsx";
import { RoomCard } from "../roomcard.jsx";
import { useStore, actions } from "../store.js";
import { signageState, resolveSignageRef } from "../lib/signageContent.js";
import { confirm } from "../confirm.jsx";
import { CUSTOMER_COLS, customerSortValue, toCustomerRow, renderCustomerCell } from "../admin/customers.jsx";
import { usePartner, usePartnerTerm, pad2, minToStr, useCaseRooms, parseSlot, TIMELINE_START, TIMELINE_END, BLOCK_COLOR, hasRoomConflict, endDateFor, isOvernight, slotLabel, SlotText, todayKST, prevDay } from "./shared.jsx";
import { TimeStepper } from "./intake.jsx";

function SlotEditCell({ r, rows }) {
  const [editing, setEditing] = useState(false);
  const [te, setTe] = useState({ startStr: "", endStr: "" });

  const startEdit = () => {
    const { startStr, endStr } = parseSlot(r.slot);
    setTe({ startStr, endStr });
    setEditing(true);
  };

  const newSlot = te.startStr + "~" + te.endStr;
  const { start: ns, end: ne } = parseSlot(newSlot);
  const timeInvalid = ns === ne; // 길이 0만 무효(자정 넘김 허용)
  const timeConflict = !timeInvalid && hasRoomConflict(rows, r.room, newSlot, r.id, r.date);
  const canSave = !timeInvalid && !timeConflict;

  const save = () => {
    if (!canSave) return;
    actions.updateReservation(r.id, { slot: newSlot, endDate: endDateFor(r.date, newSlot) });
    setEditing(false);
  };

  if (!editing) {
    return (
      <div className="flex items-center gap-1.5">
        <SlotText slot={r.slot} className="tabular-nums" style={{ color: MUTE }} />
        <button onClick={startEdit} className="transition hover:opacity-60" style={{ color: FAINT }}>
          <Pencil className="h-3 w-3" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 py-0.5">
      <div className="flex items-center gap-1">
        <TimeInput value={te.startStr} onChange={(v) => setTe((s) => ({ ...s, startStr: v }))} />
        <span style={{ color: FAINT }}>~</span>
        <TimeInput value={te.endStr} onChange={(v) => setTe((s) => ({ ...s, endStr: v }))} />
      </div>
      {timeInvalid && <span className="text-[10.5px]" style={{ color: MUTE }}>시작 = 종료</span>}
      {!timeInvalid && isOvernight(newSlot) && <span className="text-[10.5px]" style={{ color: MUTE }}>익일 {te.endStr} 종료</span>}
      {timeConflict && <span className="text-[10.5px]" style={{ color: MUTE }}>다른 예약과 겹침</span>}
      <div className="flex items-center gap-2">
        <button onClick={() => setEditing(false)} className="text-[11.5px] font-semibold transition hover:opacity-70" style={{ color: MUTE }}>취소</button>
        <button onClick={save} disabled={!canSave}
          className="text-[11.5px] font-bold transition hover:opacity-80 disabled:opacity-40"
          style={{ color: canSave ? GOLD_D : FAINT }}>
          <span className="flex items-center gap-0.5"><Check className="h-3 w-3" /> 저장</span>
        </button>
      </div>
    </div>
  );
}
function RoomSelect({ value, rows, slot, id, date, onChange }) {
  const CASE_ROOMS = useCaseRooms();
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="cursor-pointer px-2 py-1 text-[12px] font-semibold tabular-nums outline-none transition hover:bg-black/[.03]"
      style={{ background: "#fff", border: "1px solid " + LINE2, borderRadius: RADIUS, color: INK, width: 100 }}>
      {CASE_ROOMS.map((n) => {
        const blocked = rows && slot && n !== value && hasRoomConflict(rows, n, slot, id, date);
        return (
          <option key={n} value={n} disabled={blocked}>
            {n}{blocked ? " (사용중)" : ""}
          </option>
        );
      })}
    </select>
  );
}

const SNAP = 10; // 예약 단위 = 10분 스냅

// 시간 선택 — 예약 추가와 동일한 시·분 스테퍼로 통일. value/onChange는 "HH:MM" 문자열.
function TimeInput({ value, onChange }) {
  const [vh, vm] = (value || "").split(":");
  const h = vh === "" || vh == null ? TIMELINE_START / 60 : parseInt(vh, 10);
  const m = vm === "" || vm == null ? 0 : parseInt(vm, 10);
  const set = (hh, mm) => onChange(pad2(hh) + ":" + pad2(mm));
  return <TimeStepper h={h} m={m} onH={(v) => set(v, m)} onM={(v) => set(h, v)} />;
}

// rows=오늘 예약(렌더·드래그 편집 대상), conflictRows=충돌검사용 전체 자사 예약(자정넘김 크로스데이까지 대조). cont=전일 이어짐(읽기전용 표시).
function TodayTimeline({ rows, cont = [], conflictRows = rows, onDetail }) {
  const tp = usePartnerTerm(); // 사업부별 파트너 용어
  const CASE_ROOMS = useCaseRooms();
  const [openId, setOpenId] = useState(null);
  const [timeEdit, setTimeEdit] = useState({ startStr: "", endStr: "" });
  const [drag, setDrag] = useState(null); // { id, mode:"move"|"start"|"end", room, origStart, origEnd, startX, trackW, moved, preview:{start,end} }
  const dragRef = useRef(null);
  useEffect(() => { dragRef.current = drag; }, [drag]);

  const caseRooms = CASE_ROOMS; // 빈 호실도 표시 — 드래그로 호실 이동(드롭) 가능하게
  const ticks = [];
  for (let h = TIMELINE_START / 60; h <= TIMELINE_END / 60; h += 3) ticks.push(h);
  const pct = (min) => Math.max(0, Math.min(100, ((min - TIMELINE_START) / (TIMELINE_END - TIMELINE_START)) * 100));
  const sorted = [...rows].sort((a, b) => parseSlot(a.slot).start - parseSlot(b.slot).start);

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const snap = (m) => Math.round(m / SNAP) * SNAP; // 10분 단위로 반올림
  const slotOf = (s, e) => minToStr(s) + "~" + minToStr(e);

  const openAccordion = (id) => {
    if (openId === id) { setOpenId(null); return; }
    const r = rows.find((x) => x.id === id);
    const { startStr, endStr } = parseSlot(r?.slot);
    setTimeEdit({ startStr, endStr });
    setOpenId(id);
  };

  const saveTime = (r) => {
    const slot = timeEdit.startStr + "~" + timeEdit.endStr;
    actions.updateReservation(r.id, { slot, endDate: endDateFor(r.date, slot) });
    setOpenId(null);
  };

  // 타임라인 바 드래그 — 본체:이동 / 양끝:리사이즈. 10분 스냅, 겹침·역전 시 커밋 취소
  const startDrag = (e, r, mode) => {
    if (e.button != null && e.button !== 0) return;
    e.preventDefault();
    const track = e.currentTarget.closest("[data-track]");
    if (!track) return;
    const { start, end } = parseSlot(r.slot);
    setDrag({ id: r.id, mode, room: r.room, date: r.date, origStart: start, origEnd: end,
      startX: e.clientX, trackW: track.getBoundingClientRect().width, moved: false, preview: { start, end, room: r.room } });
  };

  useEffect(() => {
    if (!drag) return;
    const span = TIMELINE_END - TIMELINE_START;
    const onMove = (e) => {
      const d = dragRef.current; if (!d) return;
      const dxMin = ((e.clientX - d.startX) / d.trackW) * span;
      const moved = d.moved || Math.abs(e.clientX - d.startX) > 3;
      let s = d.origStart, en = d.origEnd, room = d.mode === "move" ? d.preview.room : d.room;
      if (d.mode === "move") {
        const delta = snap(dxMin);
        s = d.origStart + delta; en = d.origEnd + delta;
        if (s < TIMELINE_START) { en += TIMELINE_START - s; s = TIMELINE_START; }
        if (en > TIMELINE_END) { s -= en - TIMELINE_END; en = TIMELINE_END; }
        // 세로 위치로 드롭할 호실 판정 — 커서 아래 호실 트랙
        const el = document.elementFromPoint(e.clientX, e.clientY);
        const t = el && el.closest("[data-room]");
        if (t && t.getAttribute("data-room")) room = t.getAttribute("data-room");
      } else if (d.mode === "start") {
        s = clamp(snap(d.origStart + dxMin), TIMELINE_START, d.origEnd - SNAP);
      } else {
        en = clamp(snap(d.origEnd + dxMin), d.origStart + SNAP, TIMELINE_END);
      }
      setDrag((p) => p && { ...p, moved, preview: { start: s, end: en, room } });
    };
    const onUp = async () => {
      const d = dragRef.current;
      setDrag(null); // 드래그 종료(리스너 해제) 후 확인 — 컨펌 취소 시 원위치
      if (!d) return;
      if (!d.moved && d.mode === "move") { openAccordion(d.id); return; } // 이동 없이 클릭 → 상세
      if (!d.preview) return;
      const newSlot = slotOf(d.preview.start, d.preview.end);
      const room = d.preview.room;
      const ok = d.preview.start < d.preview.end && !hasRoomConflict(conflictRows, room, newSlot, d.id, d.date);
      const changed = newSlot !== slotOf(d.origStart, d.origEnd) || room !== d.room;
      if (!ok || !changed) return; // 충돌·역전이거나 변화 없음 → 취소
      const r = rows.find((x) => x.id === d.id);
      const who = r ? r.deceased : "예약";
      const msg = room !== d.room
        ? `${who} · 호실 ${d.room} → ${room}\n예약시간을 ${newSlot}으로 변경합니다.`
        : `${who} · 예약시간을 ${newSlot}으로 변경합니다.`;
      if (await confirm({ title: "예약 변경", message: msg, confirmLabel: "변경" })) {
        actions.updateReservation(d.id, { slot: newSlot, room, endDate: endDateFor(d.date, newSlot) });
      }
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => { window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); };
  }, [drag?.id, drag?.mode]);

  return (
    <div className="mt-3 overflow-hidden" style={{ border: "1px solid " + LINE, borderRadius: 8, background: "#faf9f6" }}>
      {/* 눈금 헤더 */}
      <div className="px-3 py-2" style={{ borderBottom: "1px solid " + LINE }}>
        <div className="ml-20 flex text-[10.5px] tabular-nums" style={{ color: FAINT }}>
          {ticks.map((h) => <span key={h} className="flex-1 text-center">{pad2(h)}:00</span>)}
        </div>
      </div>

      {/* 호실별 행 — 드래그 중인 예약은 드롭 대상 호실 행에 표시(effRoom) */}
      {(rows.length > 0 || cont.length > 0) && caseRooms.map((roomName, ri) => {
        const effRoom = (r) => (drag && drag.id === r.id && drag.mode === "move") ? drag.preview.room : r.room;
        const roomRows = sorted.filter((r) => effRoom(r) === roomName);
        const contRoomRows = cont.filter((r) => r.room === roomName); // 전일 자정넘김 이어짐(읽기전용)
        const dropTarget = drag && drag.mode === "move" && drag.preview.room === roomName && drag.room !== roomName;
        return (
          <div key={roomName} style={{ borderBottom: ri < caseRooms.length - 1 ? "1px solid " + LINE : undefined }}>
            <div className="relative flex items-center px-3 py-2.5">
              <span className="w-20 shrink-0 text-[12px] font-bold" style={{ color: INK }}>{roomName}</span>
              <div data-track data-room={roomName} className="relative h-7 flex-1 rounded" style={{ background: dropTarget ? "#e3dbc8" : "#eeece6", outline: dropTarget ? "2px dashed " + BLOCK_COLOR : "none", outlineOffset: -2 }}>
                {ticks.slice(1, -1).map((h) => (
                  <div key={h} className="absolute top-0 h-full" style={{ left: pct(h * 60) + "%", width: 1, background: "#ddd8ce" }} />
                ))}
                {roomRows.map((r) => {
                  const dragging = drag && drag.id === r.id;
                  const seg = dragging ? drag.preview : parseSlot(r.slot);
                  // 자정 넘김(종료<시작)은 하루 뷰에서 시작~24:00까지 클립해 표시(드래그 중엔 같은날만)
                  const segOvernight = !dragging && seg.end < seg.start;
                  const left = pct(seg.start);
                  const width = Math.max(1.5, (segOvernight ? 100 : pct(seg.end)) - left);
                  const open = openId === r.id;
                  const bad = dragging && (seg.start >= seg.end || hasRoomConflict(conflictRows, drag.preview.room, slotOf(seg.start, seg.end), r.id, r.date));
                  return (
                    <div key={r.id} title={r.deceased + " · " + slotLabel(r.slot)}
                      className="absolute top-1 h-5 select-none text-[11px] font-bold text-white transition-[background] hover:brightness-95"
                      style={{ left: left + "%", width: width + "%",
                        // 자정 넘김: 오른쪽 끝을 흐리게 페이드 → '다음날로 이어짐'을 시각화
                        background: bad ? "#b04a3a" : segOvernight ? `linear-gradient(90deg, ${BLOCK_COLOR} 55%, ${BLOCK_COLOR}66 100%)` : BLOCK_COLOR,
                        borderRadius: 3, borderTopRightRadius: segOvernight ? 0 : 3, borderBottomRightRadius: segOvernight ? 0 : 3,
                        border: open ? "2px solid " + INK : "none", touchAction: "none", zIndex: dragging ? 5 : 1,
                        boxShadow: dragging ? "0 2px 8px rgba(0,0,0,.25)" : "none" }}>
                      {/* 좌측 리사이즈 핸들 */}
                      <div onPointerDown={(e) => startDrag(e, r, "start")} className="absolute left-0 top-0 z-10 h-full" style={{ width: 7, cursor: "ew-resize" }} />
                      {/* 본체 — 드래그 이동 / 이동 없이 누르면 상세 */}
                      <div onPointerDown={(e) => startDrag(e, r, "move")} className="flex h-full items-center gap-1 overflow-hidden px-2"
                        style={{ cursor: dragging && drag.mode === "move" ? "grabbing" : "grab" }}>
                        <span className="truncate">{r.deceased}</span>
                        {segOvernight && <span className="shrink-0 rounded px-1 text-[8.5px] font-bold" style={{ background: "rgba(255,255,255,.85)", color: GOLD_D }}>익일</span>}
                      </div>
                      {/* 자정 넘김 '이어짐' 화살표 — 24:00 경계 밖으로 다음날을 가리킴 */}
                      {segOvernight && (
                        <span className="absolute top-1/2 z-20 -translate-y-1/2 text-[13px] font-bold" style={{ right: -11, color: BLOCK_COLOR }}>›</span>
                      )}
                      {/* 우측 리사이즈 핸들 — 자정 넘김 건은 끝이 경계라 비활성 */}
                      {!segOvernight && <div onPointerDown={(e) => startDrag(e, r, "end")} className="absolute right-0 top-0 z-10 h-full" style={{ width: 7, cursor: "ew-resize" }} />}
                      {/* 드래그 중 시간 라벨 */}
                      {dragging && (
                        <span className="absolute -top-5 left-0 z-20 whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-bold tabular-nums"
                          style={{ background: bad ? "#b04a3a" : INK, color: "#fff" }}>{slotOf(seg.start, seg.end)}{drag.preview.room !== drag.room ? " · " + drag.preview.room : ""}</span>
                      )}
                    </div>
                  );
                })}
                {/* 전일 자정넘김 이어짐 — 00:00~종료, 왼쪽 페이드(전일에서 들어옴)·읽기전용(클릭=상세). 편집은 어제 날짜 화면에서. */}
                {contRoomRows.map((r) => {
                  const { end } = parseSlot(r.slot);
                  const width = Math.max(1.5, pct(end));
                  return (
                    <div key={"cont-" + r.id} title={r.deceased + " · 전일 " + slotLabel(r.slot) + " (이어짐)"}
                      onClick={() => onDetail(r)}
                      className="absolute top-1 h-5 cursor-pointer select-none overflow-hidden text-[11px] font-bold text-white hover:brightness-95"
                      style={{ left: 0, width: width + "%",
                        background: `linear-gradient(90deg, ${BLOCK_COLOR}55 0%, ${BLOCK_COLOR} 45%)`,
                        borderRadius: 3, borderTopLeftRadius: 0, borderBottomLeftRadius: 0, zIndex: 1 }}>
                      <div className="flex h-full items-center gap-1 px-2">
                        <span className="shrink-0 rounded px-1 text-[8.5px] font-bold" style={{ background: "rgba(255,255,255,.85)", color: GOLD_D }}>전일</span>
                        <span className="truncate">{r.deceased}</span>
                      </div>
                      {/* 전일에서 이어짐 화살표 — 00:00 경계 밖(왼쪽)에서 들어옴 */}
                      <span className="absolute top-1/2 z-20 -translate-y-1/2 text-[13px] font-bold" style={{ left: -11, color: BLOCK_COLOR }}>›</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 아코디언 */}
            {roomRows.some((r) => r.id === openId) && (() => {
              const r = roomRows.find((x) => x.id === openId);
              const { startStr: origStart, endStr: origEnd } = parseSlot(r.slot);
              const te = timeEdit;
              const newSlot = te.startStr + "~" + te.endStr;
              const { start: ns, end: ne } = parseSlot(newSlot);
              const timeInvalid = ns === ne; // 길이 0만 무효(자정 넘김 허용)
              const timeConflict = !timeInvalid && hasRoomConflict(conflictRows, r.room, newSlot, r.id, r.date);
              const canSaveTime = !timeInvalid && !timeConflict;

              return (
                <div className="mx-3 mb-3 overflow-hidden" style={{ border: "1px solid " + LINE, borderRadius: 6, background: "#fff" }}>
                  <div className="flex items-center gap-2 px-4 py-2.5" style={{ borderBottom: "1px solid " + LINE, background: "#f5f2ec" }}>
                    <span className="text-[13px] font-bold" style={{ fontFamily: SERIF, color: INK }}>{r.deceased}</span>
                    <div className="flex items-center gap-2">
                      {r.status === "published"
                        ? <span className="px-2 py-[2px] text-[11px] font-bold" style={{ background: "#e9f1ee", color: "#3a7468", borderRadius: 4 }}>발행 완료</span>
                        : r.status === "review"
                        ? <span className="px-2 py-[2px] text-[11px] font-bold" style={{ background: "#f4ead7", color: "#9a6a1c", borderRadius: 4 }}>접수 대기</span>
                        : r.status === "confirm"
                        ? <span className="px-2 py-[2px] text-[11px] font-bold" style={{ background: "#ece8f4", color: "#6d5aa6", borderRadius: 4 }}>컨펌 대기</span>
                        : <span className="px-2 py-[2px] text-[11px] font-bold" style={{ background: "#e9eef5", color: "#3f5e87", borderRadius: 4 }}>작업중</span>}
                    </div>
                  </div>

                  <div className="space-y-2.5 px-4 py-3 text-[12.5px]">
                    <div className="flex gap-2"><span style={{ color: MUTE }}>{tp("guardian")}</span><span style={{ color: INK }}>{r.chief}</span></div>
                    <div className="flex gap-2"><span style={{ color: MUTE }}>연락처</span><span className="tabular-nums" style={{ color: INK }}>{r.phone}</span></div>

                    {/* 호실 변경 — 현재 슬롯과 겹치는 호실은 disabled */}
                    <div className="flex items-center gap-2">
                      <span style={{ color: MUTE }}>{tp("room")} 변경</span>
                      <select value={r.room}
                        onChange={(e) => actions.setReservationRoom(r.id, e.target.value)}
                        className="cursor-pointer px-2 py-1 text-[12px] font-semibold outline-none"
                        style={{ background: "#fff", border: "1px solid " + LINE2, borderRadius: RADIUS, color: INK, width: 100 }}>
                        {CASE_ROOMS.map((n) => {
                          const blocked = n !== r.room && hasRoomConflict(conflictRows, n, r.slot, r.id, r.date);
                          return (
                            <option key={n} value={n} disabled={blocked}>
                              {n}{blocked ? " (사용중)" : ""}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    {/* 시간 수정 — 겹치거나 역전되면 저장 버튼 비활성 */}
                    <div>
                      <div className="mb-1.5 text-[11.5px] font-semibold" style={{ color: MUTE }}>예약시간 수정</div>
                      <div className="flex items-center gap-2">
                        <TimeInput value={te.startStr || origStart} onChange={(v) => setTimeEdit((s) => ({ ...s, startStr: v }))} />
                        <span style={{ color: FAINT }}>~</span>
                        <TimeInput value={te.endStr || origEnd} onChange={(v) => setTimeEdit((s) => ({ ...s, endStr: v }))} />
                        {timeInvalid && <span className="text-[11px]" style={{ color: MUTE }}>시작 = 종료</span>}
                        {!timeInvalid && isOvernight(newSlot) && <span className="text-[11px]" style={{ color: MUTE }}>익일 {te.endStr} 종료</span>}
                        {timeConflict && <span className="text-[11px]" style={{ color: MUTE }}>다른 예약과 겹침</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between px-4 pb-3">
                    <Btn size="sm" variant="neutral" onClick={() => { onDetail(r); setOpenId(null); }}>상세 보기</Btn>
                    <div className="flex items-center gap-2">
                      <Btn size="sm" variant="neutral" onClick={() => setOpenId(null)}>닫기</Btn>
                      <Btn size="sm" onClick={() => saveTime(r)} disabled={!canSaveTime}>
                        <Check className="h-3.5 w-3.5" /> 시간 저장
                      </Btn>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        );
      })}

      {rows.length === 0 && cont.length === 0 && (
        <div className="px-4 py-6 text-center text-[12.5px]" style={{ color: FAINT }}>오늘 예약이 없습니다.</div>
      )}
    </div>
  );
}

// 자사 현황판 (조회 — 편집·컨펌은 관리자 HQ가 수행)
export function PDashboard({ onNew, onDetail }) {
  const PARTNER = usePartner();
  const tp = usePartnerTerm(); // 사업부별 파트너 용어(빈소/호실 등)
  const { rooms, reservations, devices, videos, signageSources } = useStore(); // 목 DB — 호실 명칭·위치 편집 + 예약 + 사이니지(디바이스·발행본·소스) 전파
  // 호실 ↔ 사이니지 디바이스 매핑(자사) — 실시간 표출 상태 표시용
  const myDevices = devices.filter((d) => d.partnerId === PARTNER.id);
  // 디바이스↔호실 매칭 — roomId(uuid) 우선, 레거시(roomId 없음)만 호실명 폴백. live.jsx와 동일 패턴.
  const deviceOf = (r) => myDevices.find((d) => (d.roomId && d.roomId === r.id) || (!d.roomId && d.room && d.room === r.name));

  // 오늘 예약 — 자사 예약 중 '실제 오늘(KST)'자만. 퇴실 처리는 이 화면에서만 가능(예약 목록에서는 불가).
  const mine = reservations.filter((r) => r.partnerId === PARTNER.id);
  const today = todayKST();
  const todayRows = mine.filter((r) => r.date === today);
  const inProgressCount = todayRows.filter((r) => r.status === "rendering" || r.status === "confirm").length;
  // 현재 시각(분) — 호실 카드 점유 판정용. 30초마다 갱신해 시간 경과·퇴실이 실시간 반영되도록.
  const [nowMin, setNowMin] = useState(() => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); });
  useEffect(() => {
    const t = setInterval(() => { const d = new Date(); setNowMin(d.getHours() * 60 + d.getMinutes()); }, 30000);
    return () => clearInterval(t);
  }, []);
  // 사이니지 표출 미리보기를 실시간으로 — 디바이스 하트비트/모드는 5초, 발행본은 20초마다 조용히 재조회.
  //   (라이브 컨트롤과 동일한 5초 폴. 발행 시 자동 표출 전환도 재로드 없이 카드에 반영)
  useEffect(() => {
    actions.refreshDevices(true); actions.refreshVideos();
    const td = setInterval(() => actions.refreshDevices(true), 5000);
    const tv = setInterval(() => actions.refreshVideos(), 20000);
    return () => { clearInterval(td); clearInterval(tv); };
  }, []);
  // 호실 점유 = 현재 시각이 예약 시간대 안. 오늘 예약 + '어제 시작해 자정 넘겨 오늘 새벽까지 이어지는' 예약을 함께 본다.
  //   · 어제 자정넘김 → 오늘 00:00~종료(end)까지 점유
  //   · 오늘 자정넘김 → 시작~24:00 점유(00:00~end 구간은 '내일' 몫이라 제외)
  //   · 같은날 → 시작~종료
  // (오늘 예약 리스트/건수는 today만 보지만, 점유 표시는 새벽 시간대 이어짐을 반영해야 빈 호실로 잘못 뜨지 않음)
  const yesterday = prevDay(today);
  const occupants = mine.filter((r) => r.date === today || (r.date === yesterday && isOvernight(r.slot)));
  // 어제 시작해 자정 넘겨 오늘 새벽까지 이어지는 예약 — 타임라인에 '전일 이어짐'(00:00~종료) 읽기전용 막대로 표시.
  const contRows = mine.filter((r) => r.date === yesterday && isOvernight(r.slot));
  const activeReservOf = (roomName) => occupants.find((r) => {
    if (r.room !== roomName) return false;
    const { start, end } = parseSlot(r.slot);
    if (r.date === yesterday) return nowMin < end;
    return end < start ? nowMin >= start : (start <= nowMin && nowMin < end);
  });
  // 호실 카드 '신규 예약' → 해당 호실 + 현재 시각을 시작으로 프리필(분은 10분 스냅, 종료는 +3시간·24:00 캡).
  const newReservForRoom = (roomName) => {
    const d = new Date();
    const sH = d.getHours(), sM = Math.floor(d.getMinutes() / 10) * 10;
    const endTotal = Math.min(sH * 60 + sM + 180, 24 * 60);
    const dateStr = d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
    return { room: roomName, date: dateStr, sH, sM, eH: Math.floor(endTotal / 60), eM: endTotal % 60 };
  };
  // 퇴실 처리 — 호실별 현황 카드에서 해당 예약의 종료 시간을 '현재 시각'으로 변경(실제 퇴실 시점 기록).
  const [timelineOpen, setTimelineOpen] = useState(false);
  const checkoutRoom = async (room, reserv) => {
    if (!reserv) return;
    const now = new Date();
    // 퇴실 시각은 분단위 버림으로 10분 단위 스냅(실제 퇴실 시점을 10분 아래로 맞춤)
    const nowStr = pad2(now.getHours()) + ":" + pad2(Math.floor(now.getMinutes() / 10) * 10);
    const { startStr } = parseSlot(reserv.slot);
    if (!(await confirm({ title: "퇴실 처리", message: `${room.name}${room.deceased ? " (" + room.deceased + ")" : ""} 호실을 퇴실 처리합니다.\n예약 종료 시간이 현재 시각(${nowStr})으로 변경됩니다.`, confirmLabel: "퇴실", danger: true }))) return;
    const slot = startStr + "~" + nowStr;
    actions.updateReservation(reserv.id, { slot, endDate: endDateFor(reserv.date, slot) });
  };
  // 표 표시용 정렬본(타임라인·호실/시간 셀의 충돌검사는 원본 todayRows 유지)
  // 컬럼·렌더는 관리자 고객관리와 동일하게 통일 — 자사 화면이라 '파트너사' 컬럼만 제외
  const { rows: todaySorted, sort, onSortChange } = useTableSort(todayRows.map(toCustomerRow), { value: customerSortValue });
  const todayCols = CUSTOMER_COLS.filter((c) => c.key !== "partner" && c.key !== "date").map((c) => c.key === "room" ? { ...c, label: tp("room") } : c);

  return (
    <div>
      <PageHeader title="통합 대시보드" sub={PARTNER.name + " · 실시간 사이니지 · 예약 현황"} />
      <div className="mb-4 w-fit">
        <MetricRow fit items={[
          { label: "오늘 예약", value: todayRows.length + "건" },
          { label: "진행중", value: inProgressCount + "건" },
          { label: "이번달 완료", value: "12건" },
        ]} />
      </div>

      {/* 호실 카드 + 타임라인 + 오늘 예약 리스트 — 4호실 우측 기준(w-60 × 4 + gap-3.5 × 3 = 1002px)으로 폭 제한 */}
      <div style={{ maxWidth: 1002 }}>
        {/* 호실별 현황 헤더 + 버튼 — 4호실 우측 끝에 맞춰 정렬 */}
        <div className="mb-4 flex items-center justify-between">
          <div className="text-[13px] font-bold" style={{ color: INK }}>
            {tp("room")}별 현황 <span className="font-normal" style={{ color: FAINT }}>· 실시간 사이니지</span>
          </div>
          <div className="flex items-center gap-2">
            <Btn size="sm" onClick={() => onNew()}><Plus className="h-4 w-4" /> 신규 예약</Btn>
            <button
              onClick={() => setTimelineOpen((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold outline-none transition hover:opacity-80"
              style={{ borderRadius: RADIUS, background: timelineOpen ? INK : SURFACE, color: timelineOpen ? "#fff" : MUTE, border: "1px solid " + (timelineOpen ? INK : LINE) }}>
              <ChevronRight className="h-3.5 w-3.5" style={{ transform: timelineOpen ? "rotate(90deg)" : "none", transition: "transform .15s" }} />
              오늘 타임라인
            </button>
          </div>
        </div>

        {/* 타임라인 아코디언 — 호실 카드 위에 표시 */}
        {timelineOpen && <TodayTimeline rows={todayRows} cont={contRows} conflictRows={mine} onDetail={onDetail} />}

        <div className="flex flex-wrap gap-3.5" style={{ marginTop: timelineOpen ? 16 : 0 }}>
          {rooms.map((r) => {
            // 사이니지 카드 점유자 = 현재 시각이 예약 시간대 안인 오늘 예약(진행중). 시간 경과·퇴실 시 빈 호실로 전환.
            const rv = activeReservOf(r.name);
            const roomView = rv
              ? { ...r, deceased: rv.deceased, chief: rv.chief, status: rv.status,
                  age: rv.deceased === r.deceased ? r.age : undefined, species: rv.deceased === r.deceased ? r.species : undefined }
              : { ...r, deceased: null };
            // 실시간 표출 미리보기 — /s/ 호실 화면과 동일 규칙(device-sync 미러링)으로 지금 나오는 콘텐츠를 카드에 재생.
            const device = deviceOf(r);
            const st = signageState(device);
            const ref = st.onlineNow ? resolveSignageRef({ device, room: r, reservations: mine, videos, sources: signageSources, today }) : null;
            return <RoomCard key={r.id} room={roomView} device={device} signage={{ ...st, ref }} reserv={rv} onOpenReserv={onDetail} readOnly onSave={(id, patch) => actions.setRoom(id, patch)} onCheckout={checkoutRoom} onNew={() => onNew(newReservForRoom(r.name))} />;
          })}
        </div>

        {/* 오늘 예약 리스트 — 상세 진입 · 호실 변경 · 퇴실 처리 */}
        <div className="mb-2 mt-6 text-[13px] font-bold" style={{ color: INK }}>오늘 예약 리스트 <span className="font-normal" style={{ color: FAINT }}>· {tp("room")}·시간 변경 · 퇴실 처리</span></div>
        <Table cols={todayCols} rows={todaySorted} sort={sort} onSortChange={onSortChange} empty="오늘 예약이 없습니다." onRowClick={(r) => onDetail(r)} renderCell={(r, k) =>
          k === "deceased" ? <span style={{ fontFamily: SERIF, fontWeight: 700, color: INK }} className="hover:underline">{r.deceased}</span> :
          // 호실·시간 셀은 인라인 편집 컨트롤 — 셀 클릭이 상세 이동으로 번지지 않도록 차단
          k === "room" ? <span onClick={(e) => e.stopPropagation()}><RoomSelect value={r.room} rows={mine} slot={r.slot} id={r.id} date={r.date} onChange={(v) => actions.setReservationRoom(r.id, v)} /></span> :
          k === "slot" ? <span onClick={(e) => e.stopPropagation()}><SlotEditCell r={r} rows={mine} /></span> :
          renderCustomerCell(r, k)
        } />
      </div>
    </div>
  );
}

