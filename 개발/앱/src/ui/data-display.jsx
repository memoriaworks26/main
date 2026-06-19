// 공용 UI — 데이터 표시(카드·KPI 메트릭·요약 스트립·반려동물 이름).
import React from "react";
import { SANS, SERIF, SURFACE, LINE, LINE2, INK, MUTE, FAINT, RADIUS } from "../theme.js";

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
export function Metric({ label, value, sub, accent, style: sx }) {
  return (
    <div
      className="flex flex-col px-4 py-3"
      style={{ background: SURFACE, border: "1px solid " + LINE, borderRadius: RADIUS, ...sx }}
    >
      <span className="text-[12px]" style={{ color: MUTE }}>{label}</span>
      <span
        className="mt-1 text-[22px] font-bold tabular-nums whitespace-nowrap"
        style={{ color: accent || INK, fontFamily: SANS }}
      >
        {value}
      </span>
      {sub && <span className="mt-0.5 text-[11px]" style={{ color: FAINT }}>{sub}</span>}
    </div>
  );
}

export function MetricRow({ items, fit }) {
  return fit ? (
    <div className="flex gap-3">
      {items.map((m, i) => <Metric key={i} {...m} style={{ width: 180 }} />)}
    </div>
  ) : (
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

// 반려동물 이름 (명조 시그니처)
export function Deceased({ name, age, size = 17 }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span style={{ fontFamily: SERIF, fontSize: size, fontWeight: 700, color: INK, letterSpacing: "-.01em" }}>{name}</span>
      {age != null && <span className="text-[12px]" style={{ color: FAINT }}>{age}살</span>}
    </div>
  );
}
