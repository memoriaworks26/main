import React from "react";
import {
  SANS, SERIF, NAVY, BG, SURFACE, LINE, LINE2, GOLD, GOLD_D, GOLD_SOFT,
  INK, MUTE, FAINT, NAV_TEXT, NAV_FAINT, STATUS, RADIUS,
} from "./theme.js";

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
      className="inline-flex items-center justify-center gap-1.5 px-3.5 text-[13px] font-bold outline-none transition focus-visible:ring-1 hover:opacity-90"
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

// 테이블 (헤어라인, 데이터-ink)
export function Table({ cols, rows, renderCell }) {
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
          {rows.map((row, ri) => (
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
export function PageHeader({ title, sub, right }) {
  return (
    <div className="mb-4 flex items-end justify-between">
      <div>
        <h1 className="text-[18px] font-bold" style={{ color: INK }}>{title}</h1>
        {sub && <div className="mt-1 text-[12px]" style={{ color: MUTE }}>{sub}</div>}
      </div>
      {right && <div className="flex items-center gap-2.5">{right}</div>}
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

// 고인 성함 (명조 시그니처)
export function Deceased({ name, age, size = 17 }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span style={{ fontFamily: SERIF, fontSize: size, fontWeight: 700, color: INK, letterSpacing: "-.01em" }}>{name}</span>
      {age != null && <span className="text-[12px]" style={{ color: FAINT }}>{age}세</span>}
    </div>
  );
}
