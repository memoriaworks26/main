// 관리자 콘솔 공용 헬퍼 — 여러 화면에서 함께 쓰는 컴포넌트.
// SaveBar: 미저장(초안) 경고/저장 바 · SearchSelect: 검색형 드롭다운(옵션 多).
import React, { useState } from "react";
import {
  AlertTriangle, Check, ChevronDown, Search,
} from "lucide-react";
import { SURFACE, LINE, GOLD, GOLD_D, GOLD_SOFT, INK, FAINT, RADIUS } from "../theme.js";
import { Btn } from "../ui.jsx";
import { confirm } from "../confirm.jsx";

export function SaveBar({ dirty, onSave, onReset, label = "저장하지 않은 변경사항이 있습니다 — 화면을 벗어나면 사라집니다." }) {
  if (!dirty) return null;
  const doSave = async () => { if (await confirm({ title: "변경사항 저장", message: "변경한 내용을 저장합니다." })) onSave?.(); };
  const doReset = async () => { if (await confirm({ title: "되돌리기", message: "저장하지 않은 변경을 모두 되돌립니다.", danger: true, confirmLabel: "되돌리기" })) onReset?.(); };
  return (
    <div className="mb-3 flex items-center gap-2 px-4 py-2.5" style={{ background: GOLD_SOFT, border: "1px solid " + GOLD, borderRadius: RADIUS }}>
      <AlertTriangle className="h-4 w-4 shrink-0" style={{ color: GOLD_D }} />
      <span className="text-[12.5px] font-semibold" style={{ color: GOLD_D }}>{label}</span>
      <div className="ml-auto flex items-center gap-2">
        <Btn size="sm" variant="neutral" onClick={doReset}>되돌리기</Btn>
        <Btn size="sm" onClick={doSave}><Check className="h-3.5 w-3.5" /> 저장</Btn>
      </div>
    </div>
  );
}

export function SearchSelect({ value, options, onChange, placeholder = "전체", width = 240 }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [pos, setPos] = useState(null); // 트리거 기준 fixed 좌표(부모 overflow에 안 잘리게)
  const ref = React.useRef(null);
  const btnRef = React.useRef(null);
  // 트리거 화면 좌표 측정 → 항상 바로 아래로 펼치고, 아래 공간에 맞춰 높이 제한(목록은 내부 스크롤)
  const place = React.useCallback(() => {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    const maxH = Math.min(340, Math.max(140, window.innerHeight - r.bottom - 12));
    setPos({ left: r.left, width: r.width, top: r.bottom + 4, maxH });
  }, []);
  React.useEffect(() => {
    if (!open) return;
    place();
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onScroll = () => setOpen(false); // 스크롤 시 닫기(fixed가 따라가지 않으므로)
    window.addEventListener("mousedown", onDown);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => { window.removeEventListener("mousedown", onDown); window.removeEventListener("scroll", onScroll, true); window.removeEventListener("resize", onScroll); };
  }, [open, place]);
  const list = options.filter((o) => o.label.toLowerCase().includes(q.trim().toLowerCase()));
  const cur = options.find((o) => o.value === value);
  return (
    <div ref={ref} className="relative" style={{ width }}>
      <button ref={btnRef} onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-2 px-3 text-left text-[13px] outline-none focus-visible:ring-1" style={{ height: 36, background: SURFACE, border: "1px solid " + LINE, borderRadius: RADIUS, color: INK }}>
        <span className="flex-1 truncate">{cur ? cur.label : placeholder}</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0" style={{ color: FAINT }} />
      </button>
      {open && pos && (
        <div className="fixed z-50 flex flex-col overflow-hidden" style={{ left: pos.left, top: pos.top, width: pos.width, maxHeight: pos.maxH, background: SURFACE, border: "1px solid " + LINE, borderRadius: RADIUS, boxShadow: "0 8px 24px rgba(0,0,0,.14)" }}>
          <div className="flex shrink-0 items-center gap-2 px-2.5 py-2" style={{ borderBottom: "1px solid " + LINE }}>
            <Search className="h-3.5 w-3.5 shrink-0" style={{ color: FAINT }} />
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="검색" className="w-full bg-transparent text-[12.5px] outline-none" style={{ color: INK }} />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto py-1">
            {list.length === 0 && <div className="px-3 py-2 text-[12px]" style={{ color: FAINT }}>검색 결과 없음</div>}
            {list.map((o) => (
              <button key={o.value} onClick={() => { onChange(o.value); setOpen(false); setQ(""); }}
                className="flex w-full items-center px-3 py-2 text-left text-[12.5px] outline-none" style={{ background: o.value === value ? GOLD_SOFT : "transparent", color: o.value === value ? GOLD_D : INK }}>
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

