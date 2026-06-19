// 공용 UI — 오버레이(모달·달력·날짜 입력). DateField는 Modal+Calendar를 함께 쓴다.
import React, { useState } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalIcon } from "lucide-react";
import { SURFACE, LINE, LINE2, GOLD, GOLD_D, GOLD_SOFT, INK, MUTE, FAINT, RADIUS } from "../theme.js";
import { useEscape } from "../lib/hooks.js";
import { pad2 } from "../lib/util.js";

// ─────────────────────────────────────────────────────────────
// 모달 — 웜 백드롭(마스터 톤) + 헤어라인 카드, 각진 모서리·그림자 절제
// ─────────────────────────────────────────────────────────────
export function Modal({ open, onClose, children, width = 340 }) {
  useEscape(onClose, open);
  if (!open) return null;
  return (
    <div
      className="mw-fade fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(14,22,32,.42)", backdropFilter: "blur(2px)" }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div
        className="mw-pop overflow-hidden"
        style={{ width, background: SURFACE, border: "1px solid " + LINE, borderRadius: RADIUS, boxShadow: "0 18px 48px -18px rgba(14,22,32,.45)" }}
      >
        {children}
      </div>
    </div>
  );
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const toISO = (y, m, d) => `${y}-${pad2(m + 1)}-${pad2(d)}`;
const parseISO = (s) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || "");
  return m ? { y: +m[1], mo: +m[2] - 1, d: +m[3] } : null;
};

// 달력 그리드 (월 이동 · 오늘·선택 강조 · 빨강 배제, 골드 한정)
export function Calendar({ value, onSelect }) {
  const today = new Date();
  const sel = parseISO(value);
  const [view, setView] = useState(() => sel ? { y: sel.y, mo: sel.mo } : { y: today.getFullYear(), mo: today.getMonth() });

  const first = new Date(view.y, view.mo, 1);
  const lead = first.getDay(); // 그 달 1일의 요일(일=0)
  const days = new Date(view.y, view.mo + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < lead; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const isToday = (d) => d && today.getFullYear() === view.y && today.getMonth() === view.mo && today.getDate() === d;
  const isSel = (d) => d && sel && sel.y === view.y && sel.mo === view.mo && sel.d === d;
  const step = (n) => setView((v) => {
    const nm = v.mo + n;
    return { y: v.y + Math.floor(nm / 12), mo: ((nm % 12) + 12) % 12 };
  });

  const navBtn = (onClick, Icon, label) => (
    <button onClick={onClick} aria-label={label}
      className="flex h-7 w-7 items-center justify-center outline-none transition hover:bg-[#f6f3ec] focus-visible:ring-1"
      style={{ border: "1px solid " + LINE2, borderRadius: RADIUS, color: MUTE }}>
      <Icon className="h-4 w-4" strokeWidth={2} />
    </button>
  );

  return (
    <div>
      {/* 헤더 — 월 이동 */}
      <div className="flex items-center justify-between px-4" style={{ height: 48, borderBottom: "1px solid " + LINE }}>
        {navBtn(() => step(-1), ChevronLeft, "이전 달")}
        <div className="text-[14px] font-bold tabular-nums" style={{ color: INK }}>
          {view.y}년 {view.mo + 1}월
        </div>
        {navBtn(() => step(1), ChevronRight, "다음 달")}
      </div>

      {/* 본문 */}
      <div className="px-4 pb-2 pt-3">
        <div className="grid grid-cols-7">
          {WEEKDAYS.map((w) => (
            <div key={w} className="flex h-7 items-center justify-center text-[11px] font-bold" style={{ color: FAINT }}>{w}</div>
          ))}
          {cells.map((d, i) => {
            if (!d) return <div key={i} className="h-9" />;
            const sel_ = isSel(d), tdy = isToday(d);
            return (
              <button key={i} onClick={() => onSelect?.(toISO(view.y, view.mo, d))}
                className="mx-auto flex h-9 w-9 items-center justify-center text-[13px] tabular-nums outline-none transition focus-visible:ring-1"
                style={{
                  borderRadius: RADIUS,
                  fontWeight: sel_ ? 700 : tdy ? 600 : 500,
                  color: sel_ ? "#fff" : INK,
                  background: sel_ ? GOLD : "transparent",
                  boxShadow: tdy && !sel_ ? "inset 0 0 0 1px " + GOLD_SOFT + ", inset 0 -2px 0 " + GOLD : "none",
                }}
                onMouseEnter={(e) => { if (!sel_) e.currentTarget.style.background = "#f6f3ec"; }}
                onMouseLeave={(e) => { if (!sel_) e.currentTarget.style.background = "transparent"; }}>
                {d}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// 날짜 입력 필드 — 클릭 시 달력 모달 (톤앤매너 일치)
export function DateField({ label, value, onChange, req, placeholder = "YYYY-MM-DD" }) {
  const [open, setOpen] = useState(false);
  return (
    <label className="block">
      {label && (
        <span className="text-[12px] font-semibold" style={{ color: MUTE }}>
          {label}{req && <span style={{ color: GOLD }}> *</span>}
        </span>
      )}
      <button type="button" onClick={() => setOpen(true)}
        className="mt-1 flex w-full items-center justify-between px-3 text-[13px] outline-none transition hover:bg-[#f9f7f1] focus-visible:ring-1"
        style={{ height: 36, background: SURFACE, border: "1px solid " + LINE, borderRadius: RADIUS, color: value ? INK : FAINT }}>
        <span>{value || placeholder}</span>
        <CalIcon className="h-4 w-4 shrink-0" style={{ color: MUTE }} strokeWidth={1.9} />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} width={320}>
        <Calendar value={value} onSelect={(d) => { onChange?.(d); setOpen(false); }} />
        <div className="flex items-center justify-between px-4" style={{ height: 46, borderTop: "1px solid " + LINE }}>
          <button onClick={() => { const t = new Date(); onChange?.(toISO(t.getFullYear(), t.getMonth(), t.getDate())); setOpen(false); }}
            className="text-[12px] font-semibold outline-none transition hover:opacity-80" style={{ color: GOLD_D }}>
            오늘로
          </button>
          <button onClick={() => setOpen(false)}
            className="text-[12px] font-semibold outline-none transition hover:opacity-80" style={{ color: MUTE }}>
            닫기
          </button>
        </div>
      </Modal>
    </label>
  );
}
