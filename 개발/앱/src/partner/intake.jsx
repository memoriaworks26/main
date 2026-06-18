// [파트너] 예약 접수(Intake) — 호실·시간대 선택과 보호자/반려동물 정보 입력.
import React, { useState } from "react";
import {
  Check, ChevronUp, ChevronDown,
} from "lucide-react";
import { SURFACE, LINE, LINE2, GOLD, GOLD_D, GOLD_SOFT, INK, MUTE, FAINT, RADIUS } from "../theme.js";
import { Btn, Card, PageHeader, DateField, CopyBtn } from "../ui.jsx";
import { useStore } from "../store.js";
import * as D from "../data.js";
import { usePartner, pad2, parseSlot, overlaps, TIMELINE_START, TIMELINE_END } from "./shared.jsx";

const fmtMin = (m) => pad2(Math.floor(m / 60)) + ":" + pad2(m % 60);

// 드래그 타임라인 — 막대를 클릭·드래그해 시간대 선택. 기존 예약(blocked)은 넘어가지 못하도록 제한.
function DragTimeline({ startMin, endMin, blocked, onChange }) {
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

  const beginDrag = (mode) => (e) => {
    e.preventDefault();
    if (mode !== "new") e.stopPropagation();
    const pivot = mode === "left" ? endMin : mode === "right" ? startMin : posToMin(e.clientX);
    const onMove = (ev) => {
      const span = clampSpan(pivot, posToMin(ev.clientX));
      if (span && span[1] > span[0]) onChange(span[0], span[1]);
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const ticks = [];
  for (let h = T0 / 60; h <= T1 / 60; h += 2) ticks.push(h);

  return (
    <div>
      <div
        ref={ref}
        onPointerDown={beginDrag("new")}
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
        {/* 현재 선택 */}
        {endMin > startMin && (
          <div className="absolute top-1 bottom-1 flex items-center justify-center"
            style={{ left: pct(startMin) + "%", width: (pct(endMin) - pct(startMin)) + "%", background: GOLD, borderRadius: 3 }}>
            <span className="px-1 text-[10px] font-bold tabular-nums text-white whitespace-nowrap">
              {fmtMin(startMin)}~{fmtMin(endMin)}
            </span>
            <div onPointerDown={beginDrag("left")}
              className="absolute -left-1 top-0 bottom-0 w-2.5 cursor-ew-resize rounded-l"
              style={{ background: GOLD_D }} />
            <div onPointerDown={beginDrag("right")}
              className="absolute -right-1 top-0 bottom-0 w-2.5 cursor-ew-resize rounded-r"
              style={{ background: GOLD_D }} />
          </div>
        )}
      </div>
      <p className="mt-1 text-[11px]" style={{ color: FAINT }}>막대를 클릭·드래그해 시간대를 선택하세요. (양끝 손잡이로 미세 조정)</p>
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
function TimeStepper({ h, m, onH, onM }) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-2" style={{ background: SURFACE, border: "1px solid " + LINE2, borderRadius: RADIUS }}>
      <NumCol value={h} suffix="시" label="시" max={23} onSet={onH} onUp={() => onH((h + 1) % 24)} onDown={() => onH((h + 23) % 24)} />
      <span className="text-[20px] font-bold" style={{ color: FAINT }}>:</span>
      <NumCol value={m} suffix="분" label="분" max={59} onSet={onM} onUp={() => onM((m + 10) % 60)} onDown={() => onM((m + 50) % 60)} />
    </div>
  );
}

export function Intake() {
  const PARTNER = usePartner();
  const { reservations } = useStore();
  // 기본값은 기존 예약이 있는 날짜로 — 시간대 선택에서 블락(빗금) 영역이 바로 보이도록.
  const [date, setDate] = useState("2026-06-15");
  const rooms = D.ROOMS.filter((r) => r.type === "case");
  const [room, setRoom] = useState(rooms[0]?.name || "");
  const [sH, setSH] = useState(9), [sM, setSM] = useState(0);
  const [eH, setEH] = useState(12), [eM, setEM] = useState(0);
  const [result, setResult] = useState(null);

  // 현재 입력 중인 슬롯
  const newSlot = pad2(sH) + ":" + pad2(sM) + "~" + pad2(eH) + ":" + pad2(eM);
  const { start: ns, end: ne } = parseSlot(newSlot);
  const timeInvalid = ns >= ne;

  // 해당 날짜·호실의 기존 예약과 겹치는지 확인
  const sameDay = reservations.filter((r) => r.partner === PARTNER.name && r.date === date);
  const slotConflict = (roomName) => !timeInvalid && sameDay.some(
    (x) => x.room === roomName && overlaps({ id: "__new__", slot: newSlot }, x)
  );
  const currentConflict = slotConflict(room);
  const canConfirm = !timeInvalid && !currentConflict;

  // 드래그 타임라인용 — 분 단위 범위 ↔ 시/분 상태 동기화 + 현재 호실의 기존 예약
  const startMin = sH * 60 + sM, endMin = eH * 60 + eM;
  const applyRange = (lo, hi) => {
    setSH(Math.floor(lo / 60)); setSM(lo % 60);
    setEH(Math.floor(hi / 60)); setEM(hi % 60);
  };
  const blocked = sameDay.filter((x) => x.room === room).map((x) => parseSlot(x.slot));

  const field = (label, ph, req) => (
    <label className="block">
      <span className="text-[12px] font-semibold" style={{ color: MUTE }}>{label}{req && <span style={{ color: GOLD }}> *</span>}</span>
      <input placeholder={ph} className="mt-1 w-full bg-transparent px-3 text-[13px] outline-none" style={{ height: 36, background: SURFACE, border: "1px solid " + LINE, borderRadius: RADIUS, color: INK }} />
    </label>
  );
  const summary = date + " · " + room + " · " + pad2(sH) + ":" + pad2(sM) + " ~ " + pad2(eH) + ":" + pad2(eM);
  const doConfirm = () => {
    if (!canConfirm) return;
    setResult({ url: "memoria.works/f/" + Math.random().toString(36).slice(2, 8) });
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
                <span className="text-[12px] font-semibold" style={{ color: MUTE }}>호실</span>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {rooms.map((r) => {
                    const on = room === r.name;
                    const blocked = slotConflict(r.name);
                    return (
                      <button key={r.id} type="button"
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
                시작 시간이 종료 시간보다 늦습니다.
              </div>
            ) : currentConflict ? (
              <div className="mt-4 flex items-center gap-1.5 px-3 py-2 text-[12px] font-semibold" style={{ background: "#ede9e1", borderRadius: RADIUS, color: MUTE }}>
                {room} — 해당 시간대에 이미 예약이 있습니다. 호실 또는 시간을 변경해주세요.
              </div>
            ) : (
              <div className="mt-4 flex items-center gap-1.5 px-3 py-2 text-[12px] font-semibold tabular-nums" style={{ background: GOLD_SOFT, borderRadius: RADIUS, color: GOLD_D }}>
                <Check className="h-3.5 w-3.5" /> {summary}
              </div>
            )}
          </Card>
        </div>

        {/* 오른쪽: 보호자 + 반려동물 */}
        <div className="flex w-56 shrink-0 flex-col gap-3">
          <Card title="보호자 정보">
            <div className="space-y-3">
              {field("성함", "홍길동", true)}
              {field("연락처", "010-0000-0000", true)}
            </div>
          </Card>
          <Card title="반려동물 정보">
            <div className="space-y-3">
              {field("이름", "초코", true)}
              {field("품종", "골든리트리버", true)}
              {field("나이", "15", false)}
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
            <Btn size="sm" variant="neutral" onClick={() => setResult(null)}>새 예약</Btn>
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

