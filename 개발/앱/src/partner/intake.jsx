// [파트너] 예약 접수(Intake) — 호실·시간대 선택과 보호자/반려동물 정보 입력.
import React, { useState } from "react";
import {
  Check, ChevronUp, ChevronDown,
} from "lucide-react";
import { SURFACE, LINE, LINE2, GOLD, GOLD_D, GOLD_SOFT, INK, MUTE, FAINT, RADIUS } from "../theme.js";
import { Btn, Card, PageHeader, DateField, CopyBtn } from "../ui.jsx";
import { useStore, actions } from "../store.js";
import { confirm } from "../confirm.jsx";
import { toast } from "../toast.jsx";
import * as D from "../data.js";
import { usePartner, usePartnerTerm, pad2, minToStr, useCaseRooms, parseSlot, overlaps, endDateFor, slotLabel, TIMELINE_START, TIMELINE_END } from "./shared.jsx";

// 예약접수 기본 날짜 — KST 기준 오늘(YYYY-MM-DD). DB reserve_date(date형)·필터(x.date===date)와 동일 포맷.
const todayKST = () => { const k = new Date(Date.now() + 9 * 3600 * 1000); return k.getUTCFullYear() + "-" + pad2(k.getUTCMonth() + 1) + "-" + pad2(k.getUTCDate()); };

// 드래그 타임라인 — 막대를 클릭·드래그해 시간대 선택. 기존 예약(blocked)은 넘어가지 못하도록 제한.
// 끝 손잡이를 24:00 너머로 끌면 종료가 00:00 쪽으로 감겨 자정 넘김(익일) 선택이 된다(endMin<startMin).
export function DragTimeline({ startMin, endMin, blocked, onChange }) {
  const ref = React.useRef(null);
  const T0 = TIMELINE_START, T1 = TIMELINE_END, SPAN = T1 - T0, STEP = 10;
  const pct = (m) => ((m - T0) / SPAN) * 100;

  const posToMin = (clientX) => {
    const rect = ref.current.getBoundingClientRect();
    let r = (clientX - rect.left) / rect.width;
    r = Math.max(0, Math.min(1, r));
    return T0 + Math.round((r * SPAN) / STEP) * STEP;
  };
  // pivot 기준으로 m 방향에 있는 가장 가까운 예약 경계까지만 허용
  const clampSpan = (pivot, m) => {
    if (blocked.some((b) => pivot > b.start && pivot < b.end)) return null; // 예약 안에서 시작 금지
    if (m >= pivot) {
      let lim = T1;
      for (const b of blocked) if (b.start >= pivot) lim = Math.min(lim, b.start);
      return [pivot, Math.min(m, lim)];
    }
    let lim = T0;
    for (const b of blocked) if (b.end <= pivot) lim = Math.max(lim, b.end);
    return [Math.max(m, lim), pivot];
  };

  const addMove = (onMove) => {
    const onUp = () => { window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };
  // 빈 곳 클릭·드래그 → 새 선택. 오른쪽으로 24:00을 넘겨 끌면 익일(00:00~)로 감김.
  const beginDrag = (e) => {
    e.preventDefault();
    const rect = ref.current.getBoundingClientRect();
    const pivot = posToMin(e.clientX);
    if (blocked.some((b) => pivot > b.start && pivot < b.end)) return; // 예약 안에서 시작 금지
    const rawMin = (clientX) => T0 + Math.round((((clientX - rect.left) / rect.width) * SPAN) / STEP) * STEP; // 미클램프(경계 밖 허용)
    addMove((ev) => {
      const m = rawMin(ev.clientX);
      if (m <= pivot) { // 왼쪽 — 같은날 [m, pivot]
        const span = clampSpan(pivot, Math.max(m, T0));
        if (span && span[1] > span[0]) onChange(span[0], span[1]);
        return;
      }
      // 오른쪽 — 다음 예약 경계 전까지(경계 없으면 24:00 넘겨 익일까지 감김)
      let lim = pivot + SPAN - STEP;
      for (const b of blocked) if (b.start >= pivot) lim = Math.min(lim, b.start);
      const endAbs = Math.max(pivot + STEP, Math.min(lim, m));
      onChange(pivot, endAbs > T1 ? endAbs - T1 : endAbs);
    });
  };
  // 끝 핸들 — 절대 종료(분)를 델타로 이동. 24:00을 넘겨 끌면 00:00 쪽으로 감겨 익일로 '확' 넘어감.
  const beginEndDrag = (e) => {
    e.preventDefault(); e.stopPropagation();
    const startX = e.clientX, rect = ref.current.getBoundingClientRect();
    const s = startMin;
    const origEndAbs = endMin > s ? endMin : endMin + SPAN; // 같은날 endMin · 자정 넘김 endMin+1440
    addMove((ev) => {
      const deltaMin = ((ev.clientX - startX) / rect.width) * SPAN;
      let endAbs = s + Math.round((origEndAbs - s + deltaMin) / STEP) * STEP;
      endAbs = Math.max(s + STEP, Math.min(s + SPAN - STEP, endAbs)); // (시작, 시작+24h) · 최소 10분
      if (endAbs <= T1) { // 같은날 구간 — 다음 예약 경계까지만(자정 넘기면 충돌은 상위에서 날짜인식 검사)
        for (const b of blocked) if (b.start >= s) endAbs = Math.min(endAbs, b.start);
        endAbs = Math.max(endAbs, s + STEP);
      }
      onChange(s, endAbs > T1 ? endAbs - T1 : endAbs);
    });
  };
  // 시작 핸들 — 시작(분)을 델타로 이동(종료 고정). 같은날 구간에선 이전 예약 경계까지만.
  const beginStartDrag = (e) => {
    e.preventDefault(); e.stopPropagation();
    const startX = e.clientX, rect = ref.current.getBoundingClientRect();
    const origStart = startMin, overnight = endMin < origStart;
    addMove((ev) => {
      const deltaMin = ((ev.clientX - startX) / rect.width) * SPAN;
      let start = Math.round((origStart + deltaMin) / STEP) * STEP;
      if (overnight) {
        start = Math.max(endMin + STEP, Math.min(T1 - STEP, start)); // 익일 유지(종료 이후)
      } else {
        let lo = T0;
        for (const b of blocked) if (b.end <= endMin) lo = Math.max(lo, b.end);
        start = Math.max(lo, Math.min(endMin - STEP, start));
      }
      onChange(start, endMin);
    });
  };

  const ticks = [];
  for (let h = T0 / 60; h <= T1 / 60; h += 3) ticks.push(h);

  return (
    <div>
      <div
        ref={ref}
        onPointerDown={beginDrag}
        className="relative w-full cursor-crosshair select-none touch-none"
        style={{ height: 46, background: SURFACE, border: "1px solid " + LINE2, borderRadius: RADIUS }}
      >
        {/* 시간 눈금 */}
        {ticks.map((h) => (
          <div key={h} className="absolute top-0 bottom-0" style={{ left: pct(h * 60) + "%" }}>
            <div className="absolute top-0 h-2 w-px" style={{ background: LINE2 }} />
            <div className="absolute -translate-x-1/2 text-[9px] tabular-nums" style={{ bottom: 2, color: FAINT }}>{h}</div>
          </div>
        ))}
        {/* 기존 예약 (선택 불가 영역) */}
        {blocked.map((b, i) => (
          <div key={i} className="absolute top-1.5 bottom-1.5 flex items-center justify-center overflow-hidden"
            style={{
              left: pct(b.start) + "%", width: (pct(b.end) - pct(b.start)) + "%",
              background: "repeating-linear-gradient(45deg,#e7e1d6,#e7e1d6 5px,#ddd5c7 5px,#ddd5c7 10px)",
              borderRadius: 3,
            }}>
            <span className="text-[9px] font-semibold" style={{ color: MUTE }}>예약</span>
          </div>
        ))}
        {/* 자정 경계 안내 — 오른쪽 끝까지 끌면 여기를 넘어 익일(00:00~)로 이어짐 */}
        {endMin < startMin && (
          <div className="pointer-events-none absolute top-0 bottom-0 z-20" style={{ left: 0, borderLeft: "2px dashed " + GOLD_D }}>
            <span className="absolute rounded-br px-1 text-[8.5px] font-bold" style={{ top: 0, left: 0, color: "#fff", background: GOLD_D }}>익일 00:00</span>
          </div>
        )}
        {/* 선택 막대 — 같은날은 한 조각, 자정 넘김은 [시작~24:00]+[00:00~종료] 두 조각이 자정에서 이어짐 */}
        {(() => {
          if (endMin === startMin) return null;
          const overnight = endMin < startMin;
          const startHandle = (
            <div onPointerDown={beginStartDrag} className="absolute -left-1 top-0 bottom-0 z-10 w-2.5 cursor-ew-resize rounded-l" style={{ background: GOLD_D }} />
          );
          const endHandle = (
            <div onPointerDown={beginEndDrag} className="absolute -right-1 top-0 bottom-0 z-10 w-2.5 cursor-ew-resize rounded-r" style={{ background: GOLD_D }} />
          );
          if (!overnight) {
            return (
              <div className="absolute top-1 bottom-1 flex items-center justify-center"
                style={{ left: pct(startMin) + "%", width: (pct(endMin) - pct(startMin)) + "%", background: GOLD, borderRadius: 3 }}>
                <span className="px-1 text-[10px] font-bold tabular-nums text-white whitespace-nowrap">{minToStr(startMin)}~{minToStr(endMin)}</span>
                {startHandle}{endHandle}
              </div>
            );
          }
          return (
            <>
              {/* A: 시작 ~ 24:00 (오른쪽 끝이 흐려지며 자정 너머로 이어짐) */}
              <div className="absolute top-1 bottom-1 flex items-center"
                style={{ left: pct(startMin) + "%", right: 0, background: `linear-gradient(90deg, ${GOLD} 60%, ${GOLD}66)`, borderRadius: "3px 0 0 3px" }}>
                <span className="px-1 text-[10px] font-bold tabular-nums text-white whitespace-nowrap">{minToStr(startMin)}~익일 {minToStr(endMin)}</span>
                {startHandle}
              </div>
              {/* B: 00:00 ~ 종료 (익일 새벽 — 자정에서 A와 이어짐) */}
              <div className="absolute top-1 bottom-1"
                style={{ left: 0, width: Math.max(pct(endMin), 0.6) + "%", background: `linear-gradient(90deg, ${GOLD}66, ${GOLD} 40%)`, borderRadius: "0 3px 3px 0" }}>
                {endHandle}
              </div>
            </>
          );
        })()}
      </div>
      <p className="mt-1 text-[11px]" style={{ color: FAINT }}>막대를 클릭·드래그해 시간대를 선택하세요. <b style={{ color: GOLD_D }}>오른쪽 끝 손잡이를 24:00 너머로 끌면 자정을 넘겨 익일(00:00~)로 이어집니다.</b></p>
    </div>
  );
}

// 시간 스테퍼 — HH : MM 위/아래 화살표(골드). 시는 1씩(0~23), 분은 10씩(00~50) 순환.
function StepArrow({ dir, onClick, label }) {
  const Icon = dir === "up" ? ChevronUp : ChevronDown;
  return (
    <button type="button" onClick={onClick} aria-label={label}
      className="flex h-7 w-10 items-center justify-center outline-none transition hover:bg-[#f6f3ec] focus-visible:ring-1"
      style={{ borderRadius: RADIUS, color: GOLD_D }}>
      <Icon className="h-4 w-4" strokeWidth={2.2} />
    </button>
  );
}
// 숫자는 클릭하면 인풋으로 바뀌어 직접 입력·수정 가능. 커밋 시 0~max로 클램프.
function NumCol({ value, suffix, onUp, onDown, onSet, max, label }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const begin = () => { setDraft(pad2(value)); setEditing(true); };
  const commit = () => {
    setEditing(false);
    const n = parseInt(draft, 10);
    if (!isNaN(n)) onSet(Math.max(0, Math.min(max, n)));
  };
  return (
    <div className="flex flex-col items-center gap-0.5">
      <StepArrow dir="up" onClick={onUp} label={label + " 올리기"} />
      <div className="flex items-baseline gap-0.5 py-0.5">
        {editing ? (
          <input
            autoFocus
            type="text"
            inputMode="numeric"
            value={draft}
            onFocus={(e) => e.target.select()}
            onChange={(e) => setDraft(e.target.value.replace(/\D/g, "").slice(0, 2))}
            onBlur={commit}
            onKeyDown={(e) => { if (e.key === "Enter") commit(); else if (e.key === "Escape") setEditing(false); }}
            className="w-[40px] bg-transparent text-center text-[26px] font-bold leading-none tabular-nums outline-none"
            style={{ color: INK, borderBottom: "2px solid " + GOLD }}
          />
        ) : (
          <button type="button" onClick={begin} aria-label={label + " 직접 입력"}
            className="text-[26px] font-bold leading-none tabular-nums outline-none transition hover:opacity-70 focus-visible:ring-1"
            style={{ color: INK }}>{pad2(value)}</button>
        )}
        <span className="text-[12px]" style={{ color: FAINT }}>{suffix}</span>
      </div>
      <StepArrow dir="down" onClick={onDown} label={label + " 내리기"} />
    </div>
  );
}
export function TimeStepper({ h, m, onH, onM }) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-2" style={{ background: SURFACE, border: "1px solid " + LINE2, borderRadius: RADIUS }}>
      <NumCol value={h} suffix="시" label="시" max={23} onSet={onH} onUp={() => onH((h + 1) % 24)} onDown={() => onH((h + 23) % 24)} />
      <span className="text-[20px] font-bold" style={{ color: FAINT }}>:</span>
      <NumCol value={m} suffix="분" label="분" max={59} onSet={onM} onUp={() => onM((m + 10) % 60)} onDown={() => onM((m + 50) % 60)} />
    </div>
  );
}

export function Intake({ prefill } = {}) {
  const PARTNER = usePartner();
  const tp = usePartnerTerm(); // 사업부별 파트너 용어
  const { reservations } = useStore();
  const rooms = useCaseRooms().map((n) => ({ name: n }));  // [Phase4-1b] 현재 파트너 호실
  // 호실 카드에서 들어온 경우 해당 호실·현재 시각을 시작값으로 프리필. 아니면 KST 오늘을 기본 날짜로.
  const [date, setDate] = useState(prefill?.date || todayKST());
  const [room, setRoom] = useState(prefill?.room || rooms[0]?.name || "");
  const [sH, setSH] = useState(prefill?.sH ?? 9), [sM, setSM] = useState(prefill?.sM ?? 0);
  const [eH, setEH] = useState(prefill?.eH ?? 12), [eM, setEM] = useState(prefill?.eM ?? 0);
  const [manager, setManager] = useState(prefill?.manager || ""); // 예약 담당자명(필수)
  // [QA-P0] 보호자/반려동물 정보 — 제어입력(예약접수 시 DB 저장)
  const [chief, setChief] = useState("");     // 보호자 성함
  const [phone, setPhone] = useState("");     // 보호자 연락처
  const [petName, setPetName] = useState(""); // 반려동물 이름 → deceased
  const [breed, setBreed] = useState("");     // 품종
  const [age, setAge] = useState("");         // 나이
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  // 현재 입력 중인 슬롯
  const newSlot = pad2(sH) + ":" + pad2(sM) + "~" + pad2(eH) + ":" + pad2(eM);
  const { start: ns, end: ne } = parseSlot(newSlot);
  const timeInvalid = ns === ne;        // 길이 0 = 무효(자정 넘김은 허용)
  const endDate = endDateFor(date, newSlot);

  // 호실별 충돌 — 자정 넘김까지 비교하려고 날짜를 절대 분으로 환산(같은 날 필터 대신 전체 자사 예약과 대조)
  const newResv = { id: "__new__", slot: newSlot, date, endDate };
  const mine = reservations.filter((r) => r.partnerId === PARTNER.id);
  const slotConflict = (roomName) => !timeInvalid && mine.some(
    (x) => x.room === roomName && overlaps(newResv, x)
  );
  const currentConflict = slotConflict(room);
  const managerMissing = manager.trim().length === 0; // 담당자명 미입력
  // [QA-P0] 필수 보호자/펫 정보 미입력 여부
  const infoMissing = chief.trim().length === 0 || phone.trim().length === 0 || petName.trim().length === 0;
  const canConfirm = !timeInvalid && !currentConflict && !managerMissing && !infoMissing && !busy;

  // 드래그 타임라인용 — 분 단위 범위 ↔ 시/분 상태 동기화 + 현재 호실의 기존 예약
  const startMin = sH * 60 + sM, endMin = eH * 60 + eM;
  const applyRange = (lo, hi) => {
    setSH(Math.floor(lo / 60)); setSM(lo % 60);
    setEH(Math.floor(hi / 60)); setEM(hi % 60);
  };
  // 타임라인 빗금(blocked)은 하루(00:00~24:00) 뷰 — 같은 날짜·호실 예약만 분 범위로 표시
  const blocked = mine.filter((x) => x.room === room && x.date === date).map((x) => parseSlot(x.slot));

  // [QA-P0] 제어입력 필드(value/onChange로 실제 수집)
  const field = (label, ph, req, value, onChange) => (
    <label className="block">
      <span className="text-[12px] font-semibold" style={{ color: MUTE }}>{label}{req && <span style={{ color: GOLD }}> *</span>}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={ph} className="mt-1 w-full bg-transparent px-3 text-[13px] outline-none" style={{ height: 36, background: SURFACE, border: "1px solid " + (req && !value.trim() ? GOLD : LINE), borderRadius: RADIUS, color: INK }} />
    </label>
  );
  const summary = date + " · " + room + " · " + slotLabel(newSlot);
  const doConfirm = async () => {
    if (!canConfirm) return;
    if (!(await confirm({ title: "예약 접수 확정", message: summary + "\n담당자 " + manager.trim() + "\n보호자 " + chief.trim() + " · " + tp("subject") + " " + petName.trim() + "\n예약을 확정하고 보호자 영상제작 URL을 생성합니다." }))) return;
    setBusy(true);
    try {
      // 예약 생성 → 보호자 제작링크(토큰) 발급 → 실제 /u/<token> URL 표시
      const r = await actions.addReservation({
        partner: PARTNER.name, partnerId: PARTNER.id,
        deceased: petName.trim(), chief: chief.trim(), phone: phone.trim(),
        breed: breed.trim() || undefined, age: age.trim() || undefined,
        room, date, endDate, slot: newSlot, intakeManager: manager.trim(),
      });
      const sub = await actions.issueSubmission(r);
      setResult({ url: window.location.origin + "/u/" + sub.token });
    } catch (e) {
      toast("예약 접수 실패: " + (e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ maxWidth: 900 }}>
      <PageHeader title="예약 접수" sub="날짜·호실·시간 → 보호자/반려동물 정보 → 확정 시 보호자 영상제작 URL 생성" />
      <div className="flex items-start gap-4">
        {/* 왼쪽: 날짜·호실·시간 */}
        <div className="min-w-0 flex-1">
          <Card title="날짜 · 호실 · 시간">
            <div className="flex flex-wrap items-start gap-x-8 gap-y-3">
              <div style={{ width: 180 }}><DateField label="날짜" value={date} onChange={setDate} req /></div>
              <div className="min-w-0 flex-1">
                <span className="text-[12px] font-semibold" style={{ color: MUTE }}>{tp("room")}</span>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {rooms.map((r) => {
                    const on = room === r.name;
                    const blocked = slotConflict(r.name);
                    return (
                      <button key={r.name} type="button"
                        disabled={blocked && !on}
                        onClick={() => !blocked && setRoom(r.name)}
                        className="flex items-center gap-1.5 px-3.5 text-[13px] font-semibold tabular-nums outline-none transition"
                        style={{
                          height: 38, borderRadius: 999,
                          background: on ? GOLD : blocked ? "#ede9e1" : SURFACE,
                          color: on ? "#fff" : blocked ? FAINT : INK,
                          border: "1.5px solid " + (on ? GOLD : blocked ? LINE : LINE),
                          cursor: blocked && !on ? "not-allowed" : "pointer",
                          opacity: blocked && !on ? 0.55 : 1,
                        }}>
                        {r.name}
                        {blocked && !on && <span className="text-[10px]">사용중</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-4 border-t pt-4" style={{ borderColor: LINE }}>
              <span className="text-[12px] font-semibold" style={{ color: MUTE }}>시간대 선택</span>
              <div className="mt-1.5">
                <DragTimeline startMin={startMin} endMin={endMin} blocked={blocked} onChange={applyRange} />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-end gap-x-5 gap-y-3">
              <div>
                <span className="text-[12px] font-semibold" style={{ color: MUTE }}>시작 시간</span>
                <div className="mt-1.5"><TimeStepper h={sH} m={sM} onH={setSH} onM={setSM} /></div>
              </div>
              <span className="pb-5 text-[15px] font-bold" style={{ color: FAINT }}>~</span>
              <div>
                <span className="text-[12px] font-semibold" style={{ color: MUTE }}>종료 시간</span>
                <div className="mt-1.5"><TimeStepper h={eH} m={eM} onH={setEH} onM={setEM} /></div>
              </div>
            </div>

            {timeInvalid ? (
              <div className="mt-4 flex items-center gap-1.5 px-3 py-2 text-[12px] font-semibold" style={{ background: "#ede9e1", borderRadius: RADIUS, color: MUTE }}>
                시작과 종료 시간이 같습니다. 시간대를 지정해주세요.
              </div>
            ) : currentConflict ? (
              <div className="mt-4 flex items-center gap-1.5 px-3 py-2 text-[12px] font-semibold" style={{ background: "#ede9e1", borderRadius: RADIUS, color: MUTE }}>
                {room} — 해당 시간대에 이미 예약이 있습니다. 호실 또는 시간을 변경해주세요.
              </div>
            ) : managerMissing ? (
              <div className="mt-4 flex items-center gap-1.5 px-3 py-2 text-[12px] font-semibold" style={{ background: "#ede9e1", borderRadius: RADIUS, color: MUTE }}>
                담당자명을 입력해주세요.
              </div>
            ) : infoMissing ? (
              <div className="mt-4 flex items-center gap-1.5 px-3 py-2 text-[12px] font-semibold" style={{ background: "#ede9e1", borderRadius: RADIUS, color: MUTE }}>
                {tp("guardian")} 성함·연락처와 {tp("subject")} 이름을 입력해주세요.
              </div>
            ) : (
              <div className="mt-4 flex items-center gap-1.5 px-3 py-2 text-[12px] font-semibold tabular-nums" style={{ background: GOLD_SOFT, borderRadius: RADIUS, color: GOLD_D }}>
                <Check className="h-3.5 w-3.5" /> {summary}
              </div>
            )}
          </Card>
        </div>

        {/* 오른쪽: 담당자 + 보호자 + 반려동물 */}
        <div className="flex w-56 shrink-0 flex-col gap-3">
          <Card title="담당자">
            <label className="block">
              <span className="text-[12px] font-semibold" style={{ color: MUTE }}>담당자명<span style={{ color: GOLD }}> *</span></span>
              <input value={manager} onChange={(e) => setManager(e.target.value)} placeholder="예약 담당 직원명"
                className="mt-1 w-full bg-transparent px-3 text-[13px] outline-none"
                style={{ height: 36, background: SURFACE, border: "1px solid " + (managerMissing ? GOLD : LINE), borderRadius: RADIUS, color: INK }} />
            </label>
          </Card>
          <Card title={tp("guardian") + " 정보"}>
            <div className="space-y-3">
              {field("성함", "홍길동", true, chief, setChief)}
              {field("연락처", "010-0000-0000", true, phone, setPhone)}
            </div>
          </Card>
          <Card title={tp("subject") + " 정보"}>
            <div className="space-y-3">
              {field("이름", "초코", true, petName, setPetName)}
              {field("품종", "골든리트리버", false, breed, setBreed)}
              {field("나이", "15", false, age, setAge)}
            </div>
          </Card>
        </div>
      </div>

      {result ? (
        <div className="mt-4 px-4 py-3.5" style={{ background: GOLD_SOFT, border: "1px solid " + GOLD, borderRadius: RADIUS }}>
          <div className="flex items-center gap-1.5 text-[13px] font-bold" style={{ color: GOLD_D }}><Check className="h-4 w-4" /> 예약 확정 · 보호자 영상제작 URL이 생성되었습니다</div>
          <div className="mt-2.5 flex items-center gap-2">
            <div className="flex-1 px-3 py-2 text-[13px] tabular-nums" style={{ background: "#fff", border: "1px solid " + LINE, borderRadius: RADIUS, color: GOLD_D }}>{result.url}</div>
            <CopyBtn text={result.url} />
            <Btn size="sm" variant="neutral" onClick={() => { setResult(null); setChief(""); setPhone(""); setPetName(""); setBreed(""); setAge(""); setManager(""); }}>새 예약</Btn>
          </div>
          <p className="mt-2 text-[11px]" style={{ color: FAINT }}>※ 보호자에게 알림톡으로 자동 발송됩니다. (퇴실 시 자동 무효화)</p>
        </div>
      ) : (
        <button onClick={doConfirm} disabled={!canConfirm}
          className="mt-4 flex w-full items-center justify-center gap-2 text-[14px] font-bold text-white outline-none transition"
          style={{ height: 52, background: canConfirm ? GOLD : "#c8c0b0", borderRadius: RADIUS, cursor: canConfirm ? "pointer" : "not-allowed" }}>
          <Check className="h-4 w-4" /> 예약 확정 · 영상제작 URL 생성
        </button>
      )}
    </div>
  );
}

