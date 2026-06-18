// [파트너] 오늘 현황 대시보드 — 타임라인(호실×시간) + 빠른 슬롯 편집.
import React, { useState } from "react";
import {
  Check, ChevronRight, Pencil, Plus,
} from "lucide-react";
import { SERIF, SURFACE, LINE, LINE2, GOLD_D, INK, MUTE, FAINT, RADIUS } from "../theme.js";
import { Btn, MetricRow, Table, PageHeader } from "../ui.jsx";
import { RoomCard } from "../roomcard.jsx";
import { useStore, actions } from "../store.js";
import { usePartner, pad2, CASE_ROOMS, parseSlot, TIMELINE_START, TIMELINE_END, BLOCK_COLOR, hasRoomConflict } from "./shared.jsx";

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
  const timeInvalid = ns >= ne;
  const timeConflict = !timeInvalid && hasRoomConflict(rows, r.room, newSlot, r.id);
  const canSave = !timeInvalid && !timeConflict;

  const save = () => {
    if (!canSave) return;
    actions.updateReservation(r.id, { slot: newSlot });
    setEditing(false);
  };

  if (!editing) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="tabular-nums" style={{ color: MUTE }}>{r.slot}</span>
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
      {timeInvalid && <span className="text-[10.5px]" style={{ color: MUTE }}>시작 ≥ 종료</span>}
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
function RoomSelect({ value, rows, slot, id, onChange }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="cursor-pointer px-2 py-1 text-[12px] font-semibold tabular-nums outline-none transition hover:bg-black/[.03]"
      style={{ background: "#fff", border: "1px solid " + LINE2, borderRadius: RADIUS, color: INK, width: 100 }}>
      {CASE_ROOMS.map((n) => {
        const blocked = rows && slot && n !== value && hasRoomConflict(rows, n, slot, id);
        return (
          <option key={n} value={n} disabled={blocked}>
            {n}{blocked ? " (사용중)" : ""}
          </option>
        );
      })}
    </select>
  );
}

function TimeInput({ value, onChange }) {
  return (
    <input type="time" value={value} onChange={(e) => onChange(e.target.value)}
      className="px-2 tabular-nums text-[12.5px] outline-none focus-visible:ring-1"
      style={{ height: 30, background: SURFACE, border: "1px solid " + LINE, borderRadius: RADIUS, color: INK, width: 92 }} />
  );
}

function TodayTimeline({ rows, onDetail }) {
  const [openId, setOpenId] = useState(null);
  const [timeEdit, setTimeEdit] = useState({ startStr: "", endStr: "" });

  const caseRooms = [...new Set(rows.map((r) => r.room))].sort();
  const ticks = [];
  for (let h = 8; h <= 24; h += 2) ticks.push(h);
  const pct = (min) => Math.max(0, Math.min(100, ((min - TIMELINE_START) / (TIMELINE_END - TIMELINE_START)) * 100));
  const sorted = [...rows].sort((a, b) => parseSlot(a.slot).start - parseSlot(b.slot).start);
  const isDone = (r) => r.status === "published";

  const openAccordion = (id) => {
    if (openId === id) { setOpenId(null); return; }
    const r = rows.find((x) => x.id === id);
    const { startStr, endStr } = parseSlot(r?.slot);
    setTimeEdit({ startStr, endStr });
    setOpenId(id);
  };

  const saveTime = (r) => {
    actions.updateReservation(r.id, { slot: timeEdit.startStr + "~" + timeEdit.endStr });
    setOpenId(null);
  };

  return (
    <div className="mt-3 overflow-hidden" style={{ border: "1px solid " + LINE, borderRadius: 8, background: "#faf9f6" }}>
      {/* 눈금 헤더 */}
      <div className="px-3 py-2" style={{ borderBottom: "1px solid " + LINE }}>
        <div className="ml-20 flex text-[10.5px] tabular-nums" style={{ color: FAINT }}>
          {ticks.map((h) => <span key={h} className="flex-1 text-center">{pad2(h)}:00</span>)}
        </div>
      </div>

      {/* 호실별 행 */}
      {caseRooms.map((roomName, ri) => {
        const roomRows = sorted.filter((r) => r.room === roomName);
        return (
          <div key={roomName} style={{ borderBottom: ri < caseRooms.length - 1 ? "1px solid " + LINE : undefined }}>
            <div className="relative flex items-center px-3 py-2.5">
              <span className="w-20 shrink-0 text-[12px] font-bold" style={{ color: INK }}>{roomName}</span>
              <div className="relative h-7 flex-1 rounded" style={{ background: "#eeece6" }}>
                {ticks.slice(1, -1).map((h) => (
                  <div key={h} className="absolute top-0 h-full" style={{ left: pct(h * 60) + "%", width: 1, background: "#ddd8ce" }} />
                ))}
                {roomRows.map((r) => {
                  const { start, end } = parseSlot(r.slot);
                  const left = pct(start);
                  const width = Math.max(1, pct(end) - left);
                  const open = openId === r.id;
                  return (
                    <button key={r.id} onClick={() => openAccordion(r.id)}
                      title={r.deceased + " · " + r.slot}
                      className="absolute top-1 flex h-5 items-center overflow-hidden px-1.5 text-[11px] font-bold text-white outline-none transition hover:brightness-95"
                      style={{ left: left + "%", width: width + "%", background: BLOCK_COLOR, borderRadius: 3, border: open ? "2px solid " + INK : "none" }}>
                      <span className="truncate">{r.deceased}</span>
                    </button>
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
              const timeInvalid = ns >= ne; // 시작 ≥ 종료
              const timeConflict = !timeInvalid && hasRoomConflict(rows, r.room, newSlot, r.id);
              const canSaveTime = !timeInvalid && !timeConflict;

              return (
                <div className="mx-3 mb-3 overflow-hidden" style={{ border: "1px solid " + LINE, borderRadius: 6, background: "#fff" }}>
                  <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: "1px solid " + LINE, background: "#f5f2ec" }}>
                    <span className="text-[13px] font-bold" style={{ fontFamily: SERIF, color: INK }}>{r.deceased}</span>
                    <div className="flex items-center gap-2">
                      {r.status === "published"
                        ? <span className="px-2 py-[2px] text-[11px] font-bold" style={{ background: "#e9f1ee", color: "#3a7468", borderRadius: 4 }}>발행 완료</span>
                        : r.status === "review"
                        ? <span className="px-2 py-[2px] text-[11px] font-bold" style={{ background: "#f4ead7", color: "#9a6a1c", borderRadius: 4 }}>컨펌 대기</span>
                        : <span className="px-2 py-[2px] text-[11px] font-bold" style={{ background: "#e9eef5", color: "#3f5e87", borderRadius: 4 }}>작업중</span>}
                    </div>
                  </div>

                  <div className="space-y-2.5 px-4 py-3 text-[12.5px]">
                    <div className="flex justify-between"><span style={{ color: MUTE }}>보호자</span><span style={{ color: INK }}>{r.chief}</span></div>
                    <div className="flex justify-between"><span style={{ color: MUTE }}>연락처</span><span className="tabular-nums" style={{ color: INK }}>{r.phone}</span></div>

                    {/* 호실 변경 — 현재 슬롯과 겹치는 호실은 disabled */}
                    <div className="flex items-center justify-between">
                      <span style={{ color: MUTE }}>호실 변경</span>
                      <select value={r.room}
                        onChange={(e) => actions.setReservationRoom(r.id, e.target.value)}
                        className="cursor-pointer px-2 py-1 text-[12px] font-semibold outline-none"
                        style={{ background: "#fff", border: "1px solid " + LINE2, borderRadius: RADIUS, color: INK, width: 100 }}>
                        {CASE_ROOMS.map((n) => {
                          const blocked = n !== r.room && hasRoomConflict(rows, n, r.slot, r.id);
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
                        {timeInvalid && <span className="text-[11px]" style={{ color: MUTE }}>시작 ≥ 종료</span>}
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

      {rows.length === 0 && (
        <div className="px-4 py-6 text-center text-[12.5px]" style={{ color: FAINT }}>오늘 예약이 없습니다.</div>
      )}
    </div>
  );
}

// 자사 현황판 (조회 — 편집·컨펌은 관리자 HQ가 수행)
export function PDashboard({ onNew, onDetail }) {
  const PARTNER = usePartner();
  const { rooms, reservations, devices } = useStore(); // 목 DB — 호실 명칭·위치 편집 + 예약 + 사이니지 전파
  // 호실 ↔ 사이니지 디바이스 매핑(자사) — 실시간 표출 상태 표시용
  const myDevices = devices.filter((d) => d.partner === PARTNER.name);
  const deviceOf = (r) => myDevices.find((d) => d.room === r.name);
  const liveCount = myDevices.filter((d) => d.status === "live").length;

  // 오늘 예약 — 자사 예약 건. 퇴실 처리는 이 화면에서만 가능(예약 목록에서는 불가).
  const todayRows = reservations.filter((r) => r.partner === PARTNER.name);
  const inProgressCount = todayRows.filter((r) => r.status === "rendering").length;
  // 퇴실 처리 — 호실별 현황 카드에서, 사이니지가 표출 중(live)일 때만 가능(목업 — 호실 id 기준).
  const [out, setOut] = useState(() => new Set());
  const [timelineOpen, setTimelineOpen] = useState(false);
  const checkoutRoom = (room) => { if (window.confirm(`${room.name}${room.deceased ? " (" + room.deceased + ")" : ""} 퇴실 처리할까요?\n퇴실 시 보호자 영상제작 URL이 자동 무효화됩니다.`)) setOut((s) => new Set(s).add(room.id)); };
  const isDone = (r) => r.status === "published"; // 영상 완성 여부
  const todayCols = [
    { key: "deceased", label: "반려동물" }, { key: "guardian", label: "보호자" }, { key: "room", label: "호실" },
    { key: "slot", label: "예약시간" }, { key: "video", label: "영상" }, { key: "state", label: "상태", align: "right" },
  ];

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
            호실별 현황 <span className="font-normal" style={{ color: FAINT }}>· 실시간 사이니지</span>
          </div>
          <div className="flex items-center gap-2">
            <Btn size="sm" onClick={onNew}><Plus className="h-4 w-4" /> 신규 예약</Btn>
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
        {timelineOpen && <TodayTimeline rows={todayRows} onDetail={onDetail} />}

        <div className="flex flex-wrap gap-3.5" style={{ marginTop: timelineOpen ? 16 : 0 }}>
          {rooms.map((r) => <RoomCard key={r.id} room={r} device={deviceOf(r)} reserv={reservations.find((x) => x.partner === PARTNER.name && x.room === r.name)} onOpenReserv={onDetail} readOnly onSave={(id, patch) => actions.setRoom(id, patch)} onCheckout={checkoutRoom} checkedOut={out.has(r.id)} onNew={onNew} />)}
        </div>

        {/* 오늘 예약 리스트 — 상세 진입 · 호실 변경 · 퇴실 처리 */}
        <div className="mb-2 mt-6 text-[13px] font-bold" style={{ color: INK }}>오늘 예약 리스트 <span className="font-normal" style={{ color: FAINT }}>· 호실·시간 변경 · 퇴실 처리</span></div>
        <Table cols={todayCols} rows={todayRows} empty="오늘 예약이 없습니다." renderCell={(r, k) =>
          k === "deceased" ? <button onClick={() => onDetail(r)} style={{ fontFamily: SERIF, fontWeight: 700, color: INK }} className="hover:underline">{r.deceased}</button> :
          k === "guardian" ? <span className="whitespace-nowrap">{r.chief} <span className="tabular-nums" style={{ color: FAINT }}>{r.phone}</span></span> :
          k === "room" ? <RoomSelect value={r.room} rows={todayRows} slot={r.slot} id={r.id} onChange={(v) => actions.setReservationRoom(r.id, v)} /> :
          k === "slot" ? <SlotEditCell r={r} rows={todayRows} /> :
          k === "video" ? (
            r.status === "published" ? <span className="px-2 py-[2px] text-[11.5px] font-bold" style={{ background: "#e9f1ee", color: "#3a7468", borderRadius: 4 }}>발행 완료</span> :
            r.status === "review" ? <span className="px-2 py-[2px] text-[11.5px] font-bold" style={{ background: "#f4ead7", color: "#9a6a1c", borderRadius: 4 }}>컨펌 대기</span> :
            <span className="px-2 py-[2px] text-[11.5px] font-bold" style={{ background: "#e9eef5", color: "#3f5e87", borderRadius: 4 }}>작업중</span>) :
          k === "state" ? (
            r.status === "published" ? <span className="px-2 py-[2px] text-[11.5px] font-bold" style={{ background: "#eceef0", color: "#5a6470", borderRadius: 4 }}>종료</span> :
            r.status === "review" ? <span className="px-2 py-[2px] text-[11.5px] font-bold" style={{ background: "#eeece6", color: "#8a857b", borderRadius: 4 }}>접수</span> :
            <span className="px-2 py-[2px] text-[11.5px] font-bold" style={{ background: "#e9eef5", color: "#3f5e87", borderRadius: 4 }}>진행중</span>) : r[k]
        } />
      </div>
    </div>
  );
}

