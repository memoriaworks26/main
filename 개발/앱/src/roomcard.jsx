import React from "react";
import { Monitor, Pencil, Play } from "lucide-react";
import { NAVY, SURFACE, LINE, INK, MUTE, FAINT, GOLD } from "./theme.js";
import { Tag, Deceased, ProgressBar } from "./ui.jsx";

// 빈소 슬레이트 (영상 미리보기 영역)
export function Slate({ room }) {
  if (room.type === "info")
    return (
      <div className="flex h-24 flex-col items-center justify-center gap-1.5" style={{ background: "#222c39" }}>
        <Monitor className="h-5 w-5" style={{ color: "#828c9b" }} strokeWidth={1.5} />
        <span className="text-[10.5px]" style={{ color: "#aab2bf" }}>종합안내 표출 중</span>
      </div>
    );
  if (room.type === "standby")
    return (
      <div className="flex h-24 items-center justify-center" style={{ background: "#f4f2ec" }}>
        <span className="text-[11px]" style={{ color: FAINT }}>비어 있음</span>
      </div>
    );
  const rendering = room.status === "rendering";
  return (
    <div className="relative flex h-24 items-center justify-center" style={{ background: "#d9d6cd" }}>
      <div className="absolute" style={{ inset: 8, border: "1px solid rgba(42,38,34,.12)" }} />
      {!rendering && <Play className="h-5 w-5" style={{ color: NAVY, opacity: 0.6 }} fill={NAVY} strokeWidth={0} />}
      {rendering && (
        <div className="absolute bottom-0 left-0 right-0">
          <div className="px-2 pb-1.5 text-center text-[10px] font-medium" style={{ color: "#3f5e87" }}>추모영상 제작 중</div>
          <ProgressBar />
        </div>
      )}
      <span
        className="absolute left-2 top-2 px-1.5 py-[2px] text-[9px] font-bold tracking-wider"
        style={{ background: "rgba(24,34,48,.62)", color: "#fff", borderRadius: 2 }}
      >
        추모영상
      </span>
    </div>
  );
}

// 빈소 카드
export function RoomCard({ room, onOpen }) {
  const isCase = room.type === "case";
  return (
    <div className="flex w-60 flex-col overflow-hidden" style={{ background: SURFACE, border: "1px solid " + LINE, borderRadius: 4 }}>
      <div className="flex items-center justify-between px-3" style={{ height: 40, borderBottom: "1px solid " + LINE }}>
        <div className="flex items-baseline gap-1.5">
          <span className="text-[13.5px] font-bold" style={{ color: INK }}>{room.name}</span>
          {room.floor && <span className="text-[11px]" style={{ color: FAINT }}>{room.floor}</span>}
        </div>
        <button className="p-0.5 outline-none transition hover:opacity-100 focus-visible:ring-1" style={{ color: FAINT, opacity: 0.7 }} aria-label={room.name + " 편집"}>
          <Pencil className="h-3.5 w-3.5" strokeWidth={1.8} />
        </button>
      </div>
      <Slate room={room} />
      <div className="flex flex-1 flex-col px-3 py-2.5">
        {isCase ? (
          <>
            <Deceased name={room.deceased} age={room.age} />
            <div className="mt-1 text-[11px]" style={{ color: MUTE }}>상주 {room.chief} · 입실 {room.in} · 발인 {room.out}</div>
            <div className="mt-3 flex items-center justify-between border-t pt-2.5" style={{ borderColor: LINE }}>
              <Tag s={room.status} />
              <button
                onClick={() => onOpen && onOpen(room)}
                className="text-[12px] font-semibold outline-none hover:underline focus-visible:ring-1"
                style={{ color: GOLD }}
              >
                {room.status === "review" ? "컨펌하기" : "열기"}
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-end justify-between pt-1">
            <Tag s={room.status} />
            <button className="text-[12px] font-semibold outline-none hover:underline focus-visible:ring-1" style={{ color: GOLD }}>설정</button>
          </div>
        )}
      </div>
    </div>
  );
}
