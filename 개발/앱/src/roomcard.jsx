import React, { useState, useEffect, useRef } from "react";
import { Pencil, Check, X, Repeat, ChevronRight, Plus } from "lucide-react";
import { SURFACE, LINE, LINE2, INK, MUTE, FAINT, GOLD, SERIF } from "./theme.js";
import { slotLabel } from "./partner/shared.jsx";
import { Tag, Deceased } from "./ui.jsx";
import { toast } from "./toast.jsx";
import { confirm } from "./confirm.jsx";
import * as storage from "./lib/storage.js";
import { signageState } from "./lib/signageContent.js";

// 실시간 사이니지 화면 미리보기 — 지금 호실 TV(/s/ 화면)에 나오는 콘텐츠를 그대로 16:9로 재생.
//   signage(대시보드가 device-sync 규칙으로 계산): { exists, onlineNow, waiting, offline, mode, play, ref }
//     ref: { kind:'video'|'image', bucket, path, key } 또는 null → 여기서 서명URL 발급해 재생.
//   콘텐츠가 없으면(발행 전·미접속 등) 상태 슬레이트로 폴백(검은화면 방지).
function ScreenPreview({ room, device, signage }) {
  const s = signage || signageState(device);
  const ref = s.ref;
  const isCase = room.type === "case";
  const online = s.onlineNow;
  const isProd = s.mode === "제작영상";
  const playing = online && s.play === "playing";

  // 표출 콘텐츠 서명URL — 경로 바뀔 때만 재발급(같은 콘텐츠는 폴링마다 리로드하지 않음).
  const [url, setUrl] = useState("");
  useEffect(() => {
    if (!ref?.path) { setUrl(""); return; }
    let alive = true; setUrl("");
    // 대시보드를 오래 켜둬도 재생이 안 끊기게 넉넉한 만료(6h)로 발급 — 경로 바뀔 때만 재발급.
    storage.signedUrl(ref.bucket, ref.path, 6 * 3600).then((u) => { if (alive) setUrl(u); }).catch(() => { if (alive) setUrl(""); });
    return () => { alive = false; };
  }, [ref?.bucket, ref?.path]);

  // 라이브 컨트롤 재생/정지 반영 — 정지 상태면 프레임 고정(실제 화면과 동일).
  const vidRef = useRef(null);
  useEffect(() => {
    const v = vidRef.current;
    if (!v) return;
    if (playing) v.play?.().catch(() => {}); else v.pause?.();
  }, [playing, url]);

  const showMedia = online && ref && url;

  // 연결 배지 — 라이브 컨트롤과 동일 표기.
  const badge = !s.exists ? { t: "미연결", bg: "rgba(255,255,255,.12)", c: "#9aa1ab" }
    : s.waiting ? { t: "접속 대기", bg: "rgba(240,220,168,.92)", c: "#7a5a1e" }
    : s.offline ? { t: "오프라인", bg: "rgba(255,255,255,.14)", c: "#c3bbac" }
    : { t: "연결됨", bg: "rgba(255,255,255,.92)", c: "#2f6d5f" };

  // 미디어가 없을 때의 슬레이트 문구.
  const slate = !s.exists ? "사이니지 미연결"
    : s.waiting ? "접속 대기"
    : s.offline ? "연결 끊김"
    : isProd ? "제작영상 준비 중"
    : (device?.playing || "대기화면");

  return (
    <div className="relative flex items-center justify-center overflow-hidden px-3 text-center" style={{ aspectRatio: "16 / 9", background: "#000", borderBottom: "1px solid " + LINE }}>
      {showMedia ? (
        ref.kind === "video" ? (
          <video key={ref.key} ref={vidRef} src={url} autoPlay={playing} loop muted playsInline
            className="absolute inset-0 h-full w-full" style={{ objectFit: "contain", background: "#000" }} />
        ) : (
          <img key={ref.key} src={url} alt="" draggable={false}
            className="absolute inset-0 h-full w-full" style={{ objectFit: "contain", background: "#000" }} />
        )
      ) : online && isProd && isCase && room.deceased ? (
        <span style={{ fontFamily: SERIF, fontSize: 18, fontWeight: 700, color: "#f3efe6", textShadow: "0 2px 10px rgba(0,0,0,.7)" }}>{room.deceased}</span>
      ) : (
        <span className="text-[11.5px]" style={{ color: online ? "rgba(243,239,230,.9)" : "#6b7280", whiteSpace: "pre-line" }}>{slate}</span>
      )}

      <span className="absolute left-2 top-2 z-10 px-1.5 py-[2px] text-[9.5px] font-bold" style={{ borderRadius: 3, background: badge.bg, color: badge.c }}>{badge.t}</span>
      {playing && ref && (
        <span className="absolute right-2 top-2 z-10 flex items-center gap-1 px-1.5 py-[2px] text-[9.5px] font-bold text-white" style={{ borderRadius: 3, background: isProd ? "rgba(168,120,46,.95)" : "rgba(0,0,0,.5)", border: isProd ? "none" : "1px solid rgba(255,255,255,.55)" }}>
          {isProd ? <><span className="h-1.5 w-1.5 rounded-full bg-white" /> LIVE</> : <><Repeat className="h-2.5 w-2.5" /> 반복</>}
        </span>
      )}
      {online && ref && !playing && (
        <span className="absolute bottom-2 left-2 z-10 px-1.5 py-[2px] text-[9px] font-bold" style={{ borderRadius: 3, background: "rgba(0,0,0,.55)", color: "#cdd3da" }}>일시정지</span>
      )}
    </div>
  );
}

// 호실 카드 — 호실 = 명칭 + 위치, 수정 버튼으로 둘 다 편집 (저장은 onSave로 스토어 전파)
// 파트너 대시보드용: 예약정보(반려동물·보호자) + 실시간 사이니지 표출 상태. (영상제작 진행상태·안치/화장은 HQ 영역이라 미표시)
export function RoomCard({ room, device, signage, reserv, onOpen, onOpenReserv, readOnly, onSave, onCheckout, onNew }) {
  const isCase = room.type === "case";
  // 표시값은 room(스토어)에서, 편집은 draft로만. 저장 시 onSave(id, {name, floor})
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ name: room.name, loc: room.floor || "" });
  const open = () => { setDraft({ name: room.name, loc: room.floor || "" }); setEditing(true); };
  const save = async () => {
    if (!(await confirm({ title: "호실 저장", message: "변경한 호실 명칭·위치를 저장합니다." }))) return;
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
      <ScreenPreview room={room} device={device} signage={signage} />
      <div className="flex flex-1 flex-col px-3 py-2.5">
        {isCase ? (
          <>
            {room.deceased ? (
              <>
                <Deceased name={room.deceased} age={room.age} />
                <div className="mt-1 text-[11px]" style={{ color: MUTE }}>보호자 {room.chief}</div>
                {reserv?.slot && (
                  <div className="mt-0.5 text-[11px] tabular-nums" style={{ color: FAINT }}>예약 {slotLabel(reserv.slot)}</div>
                )}
                {reserv && (onOpenReserv || onCheckout) && (
                  <div className="mt-2.5 flex items-center gap-2 border-t pt-2.5" style={{ borderColor: LINE }}>
                    {onOpenReserv && (
                      <button onClick={() => onOpenReserv(reserv)} className="flex items-center gap-0.5 text-[12px] font-semibold outline-none hover:underline focus-visible:ring-1" style={{ color: GOLD }}>예약 상세 <ChevronRight className="h-3.5 w-3.5" /></button>
                    )}
                    {onCheckout && (
                      <button onClick={() => onCheckout(room, reserv)} className="ml-auto px-3 py-1 text-[12.5px] font-semibold outline-none transition hover:bg-black/[.03] focus-visible:ring-1" style={{ borderRadius: 4, border: "1px solid " + LINE2, color: MUTE }}>퇴실</button>
                    )}
                  </div>
                )}
              </>
            ) : (
              /* 빈 호실 — 신규 예약 버튼 */
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
