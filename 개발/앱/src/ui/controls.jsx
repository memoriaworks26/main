// 공용 UI — 기본 컨트롤(로고·상태태그·버튼·체크박스·진행바·복사·비밀번호).
import React, { useState } from "react";
import { Copy, Check, Eye, EyeOff } from "lucide-react";
import { SANS, SURFACE, LINE2, GOLD, GOLD_D, INK, MUTE, FAINT, STATUS, RADIUS } from "../theme.js";
import logoUrl from "../assets/memoria-logo.png";

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
export function Btn({ children, onClick, variant = "gold", size = "md", className = "", ...rest }) {
  const h = size === "sm" ? 34 : 36;
  const styles =
    variant === "gold"
      ? { background: GOLD, color: "#fff", border: "none" }
      : variant === "ghost"
      ? { background: "transparent", color: GOLD, border: "1px solid " + LINE2 }
      : { background: SURFACE, color: INK, border: "1px solid " + LINE2 };
  return (
    <button
      onClick={onClick}
      className={"inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap px-3.5 text-[13px] font-bold outline-none transition focus-visible:ring-1 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:opacity-40 " + className}
      style={{ ...styles, height: h, borderRadius: RADIUS, fontFamily: SANS }}
      {...rest}
    >
      {children}
    </button>
  );
}

// 행 선택 체크박스 (Table select 컬럼·전역 공용) — 금색 강조, 부분선택(indeterminate) 지원
export function Checkbox({ checked, indeterminate, onChange, ariaLabel }) {
  return (
    <button type="button" role="checkbox" aria-checked={indeterminate ? "mixed" : checked} aria-label={ariaLabel}
      onClick={(e) => { e.stopPropagation(); onChange?.(e); }}
      className="flex h-[18px] w-[18px] items-center justify-center outline-none transition focus-visible:ring-1"
      style={{ borderRadius: 5, border: "1.5px solid " + (checked || indeterminate ? GOLD_D : LINE2), background: checked || indeterminate ? GOLD_D : SURFACE }}>
      {indeterminate ? <span style={{ width: 8, height: 2, background: "#fff", borderRadius: 1 }} />
        : checked ? <Check className="h-3 w-3 text-white" strokeWidth={3} /> : null}
    </button>
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

// ─────────────────────────────────────────────────────────────
// 클립보드 복사 버튼 — 관리자(ID코드·링크)·파트너 콘솔 공용.
// ─────────────────────────────────────────────────────────────
export function CopyBtn({ text, label = "복사" }) {
  const [done, setDone] = useState(false);
  const copy = () => {
    try { navigator.clipboard && navigator.clipboard.writeText(text); } catch (e) {}
    setDone(true);
    setTimeout(() => setDone(false), 1500);
  };
  return (
    <Btn size="sm" variant="neutral" onClick={copy}>
      {done ? <><Check className="h-3.5 w-3.5" /> 복사됨</> : <><Copy className="h-3.5 w-3.5" /> {label}</>}
    </Btn>
  );
}

// ─────────────────────────────────────────────────────────────
// 비밀번호 입력 칸 (표시/숨김 토글) — 관리자·파트너 비밀번호 변경/재설정 공용.
// placeholder·autoFocus는 선택 props (관리자 재설정 모달에서 사용).
// ─────────────────────────────────────────────────────────────
export function PwField({ label, value, onChange, placeholder, autoFocus }) {
  const [show, setShow] = useState(false);
  return (
    <label className="block">
      <div className="mb-1 text-[12px] font-semibold" style={{ color: MUTE }}>{label}</div>
      <div className="relative">
        <input
          type={show ? "text" : "password"} value={value} autoFocus={autoFocus} autoComplete="off"
          onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
          className="w-full pl-3 pr-10 text-[13px] outline-none focus-visible:ring-1"
          style={{ height: 38, background: "#fff", border: "1px solid " + LINE2, borderRadius: RADIUS, color: INK }} />
        <button type="button" onClick={() => setShow((v) => !v)} tabIndex={-1}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1" style={{ color: FAINT }} aria-label={show ? "숨기기" : "표시"}>
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </label>
  );
}
