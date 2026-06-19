// ─────────────────────────────────────────────────────────────
// 공용 React 훅.
// ─────────────────────────────────────────────────────────────
import { useEffect } from "react";

// 모달용 Escape 닫기 — 마운트 동안 window keydown(Escape)에서 onClose 호출.
// enabled=false면 리스너를 걸지 않음(조건부 모달).
export function useEscape(onClose, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, enabled]);
}
