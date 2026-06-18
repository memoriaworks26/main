// [파트너] 예약 접수(Intake) — 호실·시간대 선택과 보호자/반려동물 정보 입력.
import React, { useState } from "react";
import {
  Check, ChevronUp, ChevronDown,
} from "lucide-react";
import { SURFACE, LINE, LINE2, GOLD, GOLD_D, GOLD_SOFT, INK, MUTE, FAINT, RADIUS } from "../theme.js";
import { Btn, Card, PageHeader, DateField, CopyBtn } from "../ui.jsx";
import { useStore } from "../store.js";
import * as D from "../data.js";
import { usePartner, pad2, parseSlot, overlaps } from "./shared.jsx";

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
function NumCol({ value, suffix, onUp, onDown, label }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <StepArrow dir="up" onClick={onUp} label={label + " 올리기"} />
      <div className="flex items-baseline gap-0.5 py-0.5">
        <span className="text-[26px] font-bold leading-none tabular-nums" style={{ color: INK }}>{pad2(value)}</span>
        <span className="text-[12px]" style={{ color: FAINT }}>{suffix}</span>
      </div>
      <StepArrow dir="down" onClick={onDown} label={label + " 내리기"} />
    </div>
  );
}
function TimeStepper({ h, m, onH, onM }) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-2" style={{ background: SURFACE, border: "1px solid " + LINE2, borderRadius: RADIUS }}>
      <NumCol value={h} suffix="시" label="시" onUp={() => onH((h + 1) % 24)} onDown={() => onH((h + 23) % 24)} />
      <span className="text-[20px] font-bold" style={{ color: FAINT }}>:</span>
      <NumCol value={m} suffix="분" label="분" onUp={() => onM((m + 10) % 60)} onDown={() => onM((m + 50) % 60)} />
    </div>
  );
}

export function Intake() {
  const PARTNER = usePartner();
  const { reservations } = useStore();
  const [date, setDate] = useState("2026-06-18");
  const rooms = D.ROOMS.filter((r) => r.type === "case");
  const [room, setRoom] = useState(rooms[0]?.name || "");
  const [sH, setSH] = useState(13), [sM, setSM] = useState(40);
  const [eH, setEH] = useState(18), [eM, setEM] = useState(40);
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

            <div className="mt-4 flex flex-wrap items-end gap-x-5 gap-y-3 border-t pt-4" style={{ borderColor: LINE }}>
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

