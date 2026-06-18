import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalIcon } from "lucide-react";
import {
  SANS, SERIF, NAVY, MASTER, BG, SURFACE, LINE, LINE2, GOLD, GOLD_D, GOLD_SOFT,
  INK, MUTE, FAINT, NAV_TEXT, NAV_FAINT, STATUS, RADIUS,
} from "./theme.js";
import logoUrl from "./assets/memoria-logo.png";

// 브랜드 로고 (이미지). 다크 배경에선 밝은 띠 위에 올려 사용.
export function Logo({ height = 28 }) {
  return <img src={logoUrl} alt="Memoria Works" style={{ height, width: "auto", display: "block" }} />;
}

// 상태 태그 (색 + 점 + 라벨 → 색약 대응, 각진 모서리)
export function Tag({ s, label }) {
  const t = STATUS[s] || STATUS.standby;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-[3px] text-[11px] font-semibold"
      style={{ background: t.bg, color: t.c, borderRadius: 3 }}
    >
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: t.c }} />
      {label || t.label}
    </span>
  );
}

// 골드 액션 버튼
export function Btn({ children, onClick, variant = "gold", size = "md", ...rest }) {
  const h = size === "sm" ? 30 : 36;
  const styles =
    variant === "gold"
      ? { background: GOLD, color: "#fff", border: "none" }
      : variant === "ghost"
      ? { background: "transparent", color: GOLD, border: "1px solid " + LINE2 }
      : { background: SURFACE, color: INK, border: "1px solid " + LINE2 };
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center justify-center gap-1.5 px-3.5 text-[13px] font-bold outline-none transition focus-visible:ring-1 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:opacity-40"
      style={{ ...styles, height: h, borderRadius: RADIUS, fontFamily: SANS }}
      {...rest}
    >
      {children}
    </button>
  );
}

// 카드 (헤어라인 경계, 그림자 없음)
export function Card({ children, title, action, pad = true, className = "" }) {
  return (
    <div
      className={"overflow-hidden " + className}
      style={{ background: SURFACE, border: "1px solid " + LINE, borderRadius: RADIUS }}
    >
      {title && (
        <div
          className="flex items-center justify-between px-4"
          style={{ height: 44, borderBottom: "1px solid " + LINE }}
        >
          <span className="text-[13px] font-bold" style={{ color: INK }}>{title}</span>
          {action}
        </div>
      )}
      <div className={pad ? "p-4" : ""}>{children}</div>
    </div>
  );
}

// KPI 메트릭 카드
export function Metric({ label, value, sub, accent }) {
  return (
    <div
      className="flex flex-col px-4 py-3"
      style={{ background: SURFACE, border: "1px solid " + LINE, borderRadius: RADIUS }}
    >
      <span className="text-[12px]" style={{ color: MUTE }}>{label}</span>
      <span
        className="mt-1 text-[22px] font-bold tabular-nums"
        style={{ color: accent || INK, fontFamily: SANS }}
      >
        {value}
      </span>
      {sub && <span className="mt-0.5 text-[11px]" style={{ color: FAINT }}>{sub}</span>}
    </div>
  );
}

export function MetricRow({ items }) {
  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0,1fr))` }}>
      {items.map((m, i) => <Metric key={i} {...m} />)}
    </div>
  );
}

// 조용한 요약 스트립 (헤어라인 인라인 숫자, 큰 박스 금지)
export function Summary({ items }) {
  return (
    <div className="flex items-center" style={{ gap: 0 }}>
      {items.map(([label, val], i) => (
        <div
          key={label}
          className="flex items-baseline gap-1.5"
          style={{ paddingLeft: i ? 16 : 0, paddingRight: 16, borderLeft: i ? "1px solid " + LINE2 : "none" }}
        >
          <span className="text-[12px]" style={{ color: MUTE }}>{label}</span>
          <span className="text-[15px] font-bold tabular-nums" style={{ color: INK }}>{val}</span>
        </div>
      ))}
    </div>
  );
}

// 테이블 (헤어라인, 데이터-ink). rows 비면 empty 안내 노출.
export function Table({ cols, rows, renderCell, empty = "표시할 내용이 없습니다." }) {
  return (
    <div className="overflow-hidden" style={{ border: "1px solid " + LINE, borderRadius: RADIUS, background: SURFACE }}>
      <table className="w-full" style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#f6f3ec" }}>
            {cols.map((c) => (
              <th
                key={c.key}
                className="px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide"
                style={{ color: MUTE, borderBottom: "1px solid " + LINE, textAlign: c.align || "left" }}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={cols.length} className="px-3 py-10 text-center text-[13px]" style={{ color: FAINT }}>{empty}</td></tr>
          ) : rows.map((row, ri) => (
            <tr key={ri} className="transition hover:bg-[#f6f3ec]/60" style={{ borderBottom: ri < rows.length - 1 ? "1px solid " + LINE : "none" }}>
              {cols.map((c) => (
                <td key={c.key} className="px-3 py-2.5 text-[13px]" style={{ color: INK, textAlign: c.align || "left" }}>
                  {renderCell ? renderCell(row, c.key) : row[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// 페이지 헤더 (제목 + 우측 액션)
// back: { onClick, label? } → 제목 위 왼쪽에 뒤로가기 버튼 노출 (상세화면 공용)
export function PageHeader({ title, sub, right, back }) {
  return (
    <div className="mb-4">
      {back && (
        <button onClick={back.onClick}
          className="-ml-1 mb-1.5 inline-flex items-center gap-0.5 text-[12.5px] font-semibold outline-none transition hover:opacity-75 focus-visible:ring-1"
          style={{ color: MUTE }}>
          <ChevronLeft className="h-4 w-4" /> {back.label || "뒤로"}
        </button>
      )}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-[18px] font-bold" style={{ color: INK }}>{title}</h1>
          {sub && <div className="mt-1 text-[12px]" style={{ color: MUTE }}>{sub}</div>}
        </div>
        {right && <div className="flex items-center gap-2.5">{right}</div>}
      </div>
    </div>
  );
}

// 사이드바 네비 항목
export function NavItem({ icon, label, sub, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className="mb-0.5 flex w-full items-center gap-2.5 px-3 text-left outline-none transition focus-visible:ring-1"
      style={{
        height: sub ? 31 : 35,
        borderRadius: RADIUS,
        fontSize: 13,
        color: active ? "#fff" : NAV_TEXT,
        background: active ? "rgba(168,120,46,.14)" : "transparent",
        fontWeight: active ? 700 : 500,
        boxShadow: active ? "inset 2px 0 0 " + GOLD : "none",
      }}
    >
      {icon && <span className="shrink-0" style={{ opacity: active ? 1 : 0.85 }}>{icon}</span>}
      <span className={sub && !icon ? "pl-[26px]" : ""}>{label}</span>
    </button>
  );
}

export function NavSection({ children }) {
  return (
    <div className="mb-1 mt-3 px-3 text-[10px] font-bold uppercase tracking-[.12em]" style={{ color: NAV_FAINT }}>
      {children}
    </div>
  );
}

// 자리표시 (구성 예정)
export function Placeholder({ title, lines = [], badge = "구성 예정" }) {
  return (
    <div className="flex items-start justify-center px-6 py-14" style={{ background: BG }}>
      <div className="w-full px-9 py-10" style={{ maxWidth: 720, background: SURFACE, border: "1px solid " + LINE, borderRadius: 6 }}>
        <span className="inline-flex items-center px-2 py-[3px] text-[11px] font-semibold" style={{ background: GOLD_SOFT, color: GOLD_D, borderRadius: 3 }}>
          {badge}
        </span>
        <h2 className="mt-3" style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 800, color: INK }}>{title}</h2>
        <ul className="mt-5 space-y-2.5">
          {lines.map((l, i) => (
            <li key={i} className="flex items-start gap-2.5 text-[13px] leading-relaxed" style={{ color: MUTE }}>
              <span className="mt-[7px] shrink-0" style={{ width: 5, height: 5, borderRadius: "50%", background: GOLD }} />
              {l}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// 얇은 진행 바 (제작중) — 스피너 대신
export function ProgressBar() {
  return (
    <div className="mw-track">
      <div className="mw-fill" />
    </div>
  );
}

// 반려동물 이름 (명조 시그니처)
export function Deceased({ name, age, size = 17 }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span style={{ fontFamily: SERIF, fontSize: size, fontWeight: 700, color: INK, letterSpacing: "-.01em" }}>{name}</span>
      {age != null && <span className="text-[12px]" style={{ color: FAINT }}>{age}살</span>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 모달 — 웜 백드롭(마스터 톤) + 헤어라인 카드, 각진 모서리·그림자 절제
// ─────────────────────────────────────────────────────────────
export function Modal({ open, onClose, children, width = 340 }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
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
const pad2 = (n) => String(n).padStart(2, "0");
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
