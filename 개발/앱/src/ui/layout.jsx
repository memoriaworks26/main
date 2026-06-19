// 공용 UI — 레이아웃/내비(페이지 헤더·사이드바 항목·섹션·자리표시).
import React from "react";
import { ChevronLeft } from "lucide-react";
import { SERIF, BG, SURFACE, LINE, GOLD, GOLD_D, GOLD_SOFT, INK, MUTE, FAINT, NAV_TEXT, NAV_FAINT, RADIUS } from "../theme.js";

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
