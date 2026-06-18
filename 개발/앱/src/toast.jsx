// ─────────────────────────────────────────────────────────────
// 전역 토스트 — 어디서든 toast("메시지") 호출, <ToastHost/>는 루트에 1회 렌더.
// 모듈 싱글톤 + useSyncExternalStore (store.js와 동일 패턴).
// ─────────────────────────────────────────────────────────────
import React, { useEffect, useSyncExternalStore } from "react";
import { Check } from "lucide-react";

let _cur = null; // { id, message }
let _seq = 0;
const _subs = new Set();
const _emit = () => _subs.forEach((l) => l());

export function toast(message) {
  _cur = { id: ++_seq, message };
  _emit();
}

const subscribe = (l) => { _subs.add(l); return () => _subs.delete(l); };
const snapshot = () => _cur;

export function ToastHost() {
  const cur = useSyncExternalStore(subscribe, snapshot, snapshot);
  useEffect(() => {
    if (!cur) return;
    const t = setTimeout(() => { if (_cur && _cur.id === cur.id) { _cur = null; _emit(); } }, 1900);
    return () => clearTimeout(t);
  }, [cur]);
  if (!cur) return null;
  return (
    <div
      key={cur.id}
      className="mw-pop fixed bottom-6 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 px-4 py-2.5 text-[13px] font-semibold text-white"
      style={{ background: "#2a2622", borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,.25)" }}
    >
      <Check className="h-4 w-4" style={{ color: "#9ec9b6" }} strokeWidth={2.6} /> {cur.message}
    </div>
  );
}
