import React, { useState } from "react";
import { Pencil, Check, X } from "lucide-react";
import { SURFACE, LINE, INK, MUTE, FAINT, GOLD } from "./theme.js";
import { Tag, Deceased } from "./ui.jsx";

// 추모실 카드 — 호실 = 명칭 + 위치, 수정 버튼으로 둘 다 편집 (저장은 onSave로 스토어 전파)
export function RoomCard({ room, onOpen, readOnly, onSave }) {
  const isCase = room.type === "case";
  // 표시값은 room(스토어)에서, 편집은 draft로만. 저장 시 onSave(id, {name, floor})
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ name: room.name, loc: room.floor || "" });
  const open = () => { setDraft({ name: room.name, loc: room.floor || "" }); setEditing(true); };
  const save = () => {
    if (onSave) onSave(room.id, { name: draft.name.trim() || room.name, floor: draft.loc.trim() });
    setEditing(false);
  };
  const inputCls = "min-w-0 bg-transparent px-1.5 text-[12px] outline-none focus-visible:ring-1";
  const inputStyle = { height: 26, border: "1px solid " + LINE, borderRadius: 4, color: INK };

  return (
    <div className="flex w-60 flex-col overflow-hidden" style={{ background: SURFACE, border: "1px solid " + LINE, borderRadius: 4 }}>
      <div className="flex items-center justify-between gap-1.5 px-3" style={{ minHeight: 40, borderBottom: "1px solid " + LINE }}>
        {editing ? (
          <>
            <input autoFocus value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }}
              placeholder="명칭" className={inputCls + " flex-1"} style={inputStyle} />
            <input value={draft.loc} onChange={(e) => setDraft((d) => ({ ...d, loc: e.target.value }))}
              onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }}
              placeholder="위치" className={inputCls} style={{ ...inputStyle, width: 56 }} />
            <button onClick={save} className="shrink-0 p-0.5 outline-none focus-visible:ring-1" style={{ color: GOLD }} aria-label="저장"><Check className="h-3.5 w-3.5" strokeWidth={2.4} /></button>
            <button onClick={() => setEditing(false)} className="shrink-0 p-0.5 outline-none focus-visible:ring-1" style={{ color: FAINT }} aria-label="취소"><X className="h-3.5 w-3.5" strokeWidth={2.2} /></button>
          </>
        ) : (
          <>
            <div className="flex min-w-0 items-baseline gap-1.5">
              <span className="truncate text-[13.5px] font-bold" style={{ color: INK }}>{room.name}</span>
              {room.floor && <span className="shrink-0 text-[11px]" style={{ color: FAINT }}>{room.floor}</span>}
            </div>
            <button onClick={open} className="shrink-0 p-0.5 outline-none transition hover:opacity-100 focus-visible:ring-1" style={{ color: FAINT, opacity: 0.7 }} aria-label={room.name + " 편집"}>
              <Pencil className="h-3.5 w-3.5" strokeWidth={1.8} />
            </button>
          </>
        )}
      </div>
      <div className="flex flex-1 flex-col px-3 py-2.5">
        {isCase ? (
          <>
            <Deceased name={room.deceased} age={room.age} />
            <div className="mt-1 text-[11px]" style={{ color: MUTE }}>보호자 {room.chief} · 안치 {room.in} · 화장 {room.out}</div>
            <div className="mt-3 flex items-center justify-between border-t pt-2.5" style={{ borderColor: LINE }}>
              <Tag s={room.status} />
              {!readOnly && (
                <button
                  onClick={() => onOpen && onOpen(room)}
                  className="text-[12px] font-semibold outline-none hover:underline focus-visible:ring-1"
                  style={{ color: GOLD }}
                >
                  {room.status === "review" ? "컨펌하기" : "열기"}
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-end justify-between pt-1">
            <Tag s={room.status} />
            {!readOnly && <button className="text-[12px] font-semibold outline-none hover:underline focus-visible:ring-1" style={{ color: GOLD }}>설정</button>}
          </div>
        )}
      </div>
    </div>
  );
}
