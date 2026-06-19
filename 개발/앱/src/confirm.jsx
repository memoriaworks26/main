// ─────────────────────────────────────────────────────────────
// 전역 컨펌 — 어디서든 await confirm("…") 또는 confirm({ … }) 호출.
// window.confirm 대체. <ConfirmHost/>는 루트에 1회 렌더.
// 모듈 싱글톤 + useSyncExternalStore (toast.jsx와 동일 패턴).
//
//   if (!(await confirm({ title:"삭제", message:"…", danger:true }))) return;
//   actions.remove(id);
//
// 반환: Promise<boolean> (확인 true / 취소·ESC·백드롭 false)
// ─────────────────────────────────────────────────────────────
import React, { useEffect, useSyncExternalStore } from "react";
import { AlertTriangle, Check, Trash2 } from "lucide-react";
import { SURFACE, LINE, LINE2, GOLD, GOLD_D, GOLD_SOFT, INK, MUTE, FAINT, RADIUS } from "./theme.js";

const CLAY = "#a85d4a";      // 삭제(파괴적) 강조 — 빨강 배제, 절제된 클레이 톤
const CLAY_SOFT = "#f1e3dd";

let _cur = null; // { id, opts, resolve }
let _seq = 0;
const _subs = new Set();
const _emit = () => _subs.forEach((l) => l());

// confirm("메시지") 또는 confirm({ title, message, confirmLabel, cancelLabel, danger })
export function confirm(arg) {
  const opts = typeof arg === "string" ? { message: arg } : (arg || {});
  return new Promise((resolve) => {
    // 직전 컨펌이 떠 있으면 취소 처리 후 교체
    if (_cur) _cur.resolve(false);
    _cur = { id: ++_seq, opts, resolve };
    _emit();
  });
}

const _close = (result) => {
  if (!_cur) return;
  const r = _cur.resolve;
  _cur = null;
  _emit();
  r(result);
};

const subscribe = (l) => { _subs.add(l); return () => _subs.delete(l); };
const snapshot = () => _cur;

export function ConfirmHost() {
  const cur = useSyncExternalStore(subscribe, snapshot, snapshot);
  useEffect(() => {
    if (!cur) return;
    const onKey = (e) => {
      if (e.key === "Escape") _close(false);
      if (e.key === "Enter") _close(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cur]);
  if (!cur) return null;

  const {
    title, message,
    confirmLabel, cancelLabel = "취소",
    danger = false,
  } = cur.opts;
  const accent = danger ? CLAY : GOLD;
  const accentSoft = danger ? CLAY_SOFT : GOLD_SOFT;
  const Icon = danger ? Trash2 : AlertTriangle;
  const ok = confirmLabel || (danger ? "삭제" : "확인");

  return (
    <div
      key={cur.id}
      className="mw-fade fixed inset-0 z-[70] flex items-center justify-center p-4"
      style={{ background: "rgba(14,22,32,.42)", backdropFilter: "blur(2px)" }}
      onMouseDown={(e) => e.target === e.currentTarget && _close(false)}
    >
      <div
        className="mw-pop overflow-hidden"
        style={{ width: 360, background: SURFACE, border: "1px solid " + LINE, borderRadius: RADIUS, boxShadow: "0 18px 48px -18px rgba(14,22,32,.45)" }}
      >
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-start gap-3">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center"
              style={{ background: accentSoft, borderRadius: RADIUS, color: accent }}
            >
              <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
            </span>
            <div className="min-w-0 pt-0.5">
              {title && (
                <div className="text-[14.5px] font-bold leading-snug" style={{ color: INK }}>{title}</div>
              )}
              {message && (
                <div className={(title ? "mt-1 " : "") + "text-[13px] leading-relaxed"} style={{ color: title ? MUTE : INK, whiteSpace: "pre-line" }}>{message}</div>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-3" style={{ borderTop: "1px solid " + LINE, background: "#faf8f3" }}>
          <button
            onClick={() => _close(false)}
            className="inline-flex items-center justify-center px-3.5 text-[13px] font-bold outline-none transition hover:bg-black/[.03] focus-visible:ring-1"
            style={{ height: 34, background: SURFACE, color: INK, border: "1px solid " + LINE2, borderRadius: RADIUS }}
          >
            {cancelLabel}
          </button>
          <button
            autoFocus
            onClick={() => _close(true)}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 text-[13px] font-bold text-white outline-none transition hover:opacity-90 focus-visible:ring-1"
            style={{ height: 34, background: accent, border: "none", borderRadius: RADIUS }}
          >
            {danger ? <Trash2 className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" strokeWidth={2.4} />}
            {ok}
          </button>
        </div>
      </div>
    </div>
  );
}
