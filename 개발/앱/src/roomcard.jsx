import React, { useState } from "react";
import { Pencil, Check, X, Play, ChevronRight, Plus } from "lucide-react";
import { SURFACE, LINE, LINE2, INK, MUTE, FAINT, GOLD, SERIF } from "./theme.js";
import { Tag, Deceased } from "./ui.jsx";
import { toast } from "./toast.jsx";

// 실시간 사이니지 화면 미리보기 — 호실 화면에 지금 표출 중인 내용을 16:9 슬레이트로.
function ScreenPreview({ room, device }) {
  const isCase = room.type === "case";
  const offline = !device || device.status === "offline";
  const live = device && device.status === "live";
  return (
    <div className="relative flex items-center justify-center px-3 text-center" style={{ aspectRatio: "16 / 9", background: "#000", borderBottom: "1px solid " + LINE }}>
      <span className="absolute left-2 top-2 px-1.5 py-[2px] text-[9.5px] font-bold" style={{ borderRadius: 3, background: offline ? "rgba(255,255,255,.12)" : "rgba(255,255,255,.92)", color: offline ? "#999" : "#222" }}>
        {offline ? "오프라인" : "연결됨"}
      </span>
      {live && (
        <span className="absolute right-2 top-2 flex items-center gap-1 px-1.5 py-[2px] text-[9.5px] font-bold text-white" style={{ borderRadius: 3, border: "1px solid rgba(255,255,255,.55)" }}>
          <span className="h-1.5 w-1.5 rounded-full bg-white" /> LIVE
        </span>
      )}
      {isCase && live ? (
        <span style={{ fontFamily: SERIF, fontSize: 18, fontWeight: 700, color: "#f3efe6", textShadow: "0 2px 10px rgba(0,0,0,.7)" }}>{room.deceased}</span>
      ) : (
        <span className="text-[11.5px]" style={{ color: offline ? "#555" : "rgba(243,239,230,.9)" }}>{offline ? "신호 없음" : device ? device.playing : "사이니지 미연결"}</span>
      )}
      {live && (
        <div className="absolute bottom-2 left-2 right-2 flex items-center gap-1.5">
          <span className="flex h-4 w-4 items-center justify-center rounded-full" style={{ background: "rgba(255,255,255,.9)" }}><Play className="h-2 w-2" style={{ color: "#000" }} fill="#000" /></span>
          <div className="h-1 flex-1 rounded-full" style={{ background: "rgba(255,255,255,.25)" }}><div className="h-full rounded-full" style={{ width: "42%", background: "#fff" }} /></div>
        </div>
      )}
    </div>
  );
}

// 호실 카드 — 호실 = 명칭 + 위치, 수정 버튼으로 둘 다 편집 (저장은 onSave로 스토어 전파)
// 파트너 대시보드용: 예약정보(반려동물·보호자) + 실시간 사이니지 표출 상태. (영상제작 진행상태·안치/화장은 HQ 영역이라 미표시)
export function RoomCard({ room, device, reserv, onOpen, onOpenReserv, readOnly, onSave, onCheckout, checkedOut, onNew }) {
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
      {/* 실시간 화면 미리보기 */}
      <ScreenPreview room={room} device={device} />
      <div className="flex flex-1 flex-col px-3 py-2.5">
        {isCase ? (
          <>
            {room.deceased && !checkedOut ? (
              <>
                <Deceased name={room.deceased} age={room.age} />
                <div className="mt-1 text-[11px]" style={{ color: MUTE }}>보호자 {room.chief}</div>
                {reserv && (onOpenReserv || onCheckout) && (
                  <div className="mt-2.5 flex items-center gap-2 border-t pt-2.5" style={{ borderColor: LINE }}>
                    {onOpenReserv && (
                      <button onClick={() => onOpenReserv(reserv)} className="flex items-center gap-0.5 text-[12px] font-semibold outline-none hover:underline focus-visible:ring-1" style={{ color: GOLD }}>예약 상세 <ChevronRight className="h-3.5 w-3.5" /></button>
                    )}
                    {onCheckout && (
                      <button onClick={() => onCheckout(room)} className="ml-auto px-3 py-1 text-[12.5px] font-semibold outline-none transition hover:bg-black/[.03] focus-visible:ring-1" style={{ borderRadius: 4, border: "1px solid " + LINE2, color: MUTE }}>퇴실</button>
                    )}
                  </div>
                )}
              </>
            ) : (
              /* 빈 호실(퇴실 포함) — 신규 예약 버튼 */
              <div className="flex flex-1 items-center justify-center">
                {onNew ? (
                  <button onClick={onNew} className="flex items-center gap-1.5 px-3 py-1.5 text-[12.5px] font-semibold outline-none transition hover:opacity-80 focus-visible:ring-1"
                    style={{ borderRadius: 6, border: "1.5px dashed " + GOLD, color: GOLD }}>
                    <Plus className="h-3.5 w-3.5" /> 신규 예약
                  </button>
                ) : (
                  <span className="text-[12px]" style={{ color: FAINT }}>빈 호실</span>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-1 items-center justify-between pt-1">
            <Tag s={device ? device.status : room.status} />
            {!readOnly && <button onClick={() => toast(room.name + " 사이니지 설정을 엽니다")} className="text-[12px] font-semibold outline-none hover:underline focus-visible:ring-1" style={{ color: GOLD }}>설정</button>}
          </div>
        )}
      </div>
    </div>
  );
}
