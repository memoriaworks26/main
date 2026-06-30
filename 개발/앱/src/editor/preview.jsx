// 편집기 — 가운데 미리보기(원본 vs 작업본 2분할) + 실제 보호자 미디어 + 실시간 자막 오버레이.
import React, { useRef, useState, useEffect } from "react";
import { Play, Pause, SplitSquareHorizontal } from "lucide-react";
import { SERIF, NAVY, INK, MUTE, FAINT, GOLD_D, GOLD_SOFT } from "../theme.js";
import { blockFrame, KIND_LABEL } from "./blocks.js";
import { subtitleFontCss, subtitleEffectStyle, SUBTITLE_EFFECT_DEFAULT } from "../data.js";

// 자막 위치 — 저장된 xPct/yPct 우선, 없으면 상/중/하 프리셋(가로 중앙).
function subPos(s) {
  if (s.xPct != null && s.yPct != null) return { xPct: s.xPct, yPct: s.yPct };
  const yPct = s.pos === "상단" ? 14 : s.pos === "중앙" ? 50 : 85;
  return { xPct: 50, yPct };
}

// 영상 위 실시간 자막 — currentTime에 활성인 자막 + 선택 자막을 표시, 드래그로 위치 세팅.
function SubtitleLayer({ boxRef, subs, time, selSubId, onSubEdit, onSelSub }) {
  const [boxW, setBoxW] = useState(360);
  const [drag, setDrag] = useState(null);
  useEffect(() => {
    const el = boxRef.current; if (!el) return;
    const ro = new ResizeObserver(() => setBoxW(el.clientWidth || 360));
    ro.observe(el); setBoxW(el.clientWidth || 360);
    return () => ro.disconnect();
  }, [boxRef]);
  useEffect(() => {
    if (!drag) return;
    const move = (e) => {
      const r = boxRef.current?.getBoundingClientRect(); if (!r) return;
      const xPct = Math.min(100, Math.max(0, ((e.clientX - r.left) / r.width) * 100));
      const yPct = Math.min(100, Math.max(0, ((e.clientY - r.top) / r.height) * 100));
      setDrag((d) => (d ? { ...d, xPct, yPct } : d));
    };
    const up = () => { setDrag((d) => { if (d) onSubEdit(d.id, { xPct: +d.xPct.toFixed(1), yPct: +d.yPct.toFixed(1) }); return null; }); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up, { once: true });
    return () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
  }, [drag, boxRef, onSubEdit]);
  const shown = subs.filter((s) => (time >= s.start && time <= s.end) || s.id === selSubId);
  return (
    <>
      {shown.map((s) => {
        const p = drag && drag.id === s.id ? { xPct: drag.xPct, yPct: drag.yPct } : subPos(s);
        const fontPx = Math.max(8, (s.size || 48) * (boxW / 1920));
        const sel = s.id === selSubId;
        return (
          <div key={s.id}
            onPointerDown={(e) => { e.stopPropagation(); onSelSub && onSelSub(s.id); setDrag({ id: s.id, ...p }); }}
            className="absolute select-none px-1 text-center leading-snug"
            style={{
              left: p.xPct + "%", top: p.yPct + "%", transform: "translate(-50%,-50%)",
              maxWidth: "92%", cursor: "move", whiteSpace: "pre-wrap", zIndex: 20,
              fontFamily: subtitleFontCss(s.font), fontSize: fontPx, color: s.color || "#f3e9c8",
              ...subtitleEffectStyle(s.effect || SUBTITLE_EFFECT_DEFAULT),
              outline: sel ? "1px dashed rgba(212,175,90,.9)" : "none", borderRadius: 3,
            }}>
            {s.text || "자막"}
          </div>
        );
      })}
    </>
  );
}

// 블록별 실제 보호자 미디어 — 사진(타이틀/AI소스)·슬라이드(자동순환)·영상(재생)·편지(텍스트).
function MediaView({ media, onTime }) {
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false); // 사진 슬라이드 자동재생 X — 재생 버튼으로 순환 시작/정지
  const [err, setErr] = useState(false);
  useEffect(() => { setErr(false); setIdx(0); setPlaying(false); }, [media]); // 미디어 바뀌면 초기화(정지·첫 장)
  useEffect(() => {
    if (media?.kind !== "images" || media.urls.length < 2 || !playing) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % media.urls.length), 2200);
    return () => clearInterval(t);
  }, [media, playing]);
  if (!media) return null;
  // 서명URL 만료·스토리지 오류 등으로 로드 실패 시 빈 화면 대신 안내(깨진 이미지/영상 방지).
  if (err) return <div className="absolute inset-0 flex items-center justify-center" style={{ background: "#000" }}><span className="text-[12px]" style={{ color: "#aab2bf" }}>미디어를 불러올 수 없습니다 — 새로고침해 주세요</span></div>;
  if (media.kind === "image")
    return <img src={media.url} alt="" onError={() => setErr(true)} className="absolute inset-0 h-full w-full object-contain" style={{ background: "#000" }} />;
  if (media.kind === "images")
    return (
      <>
        <img src={media.urls[idx % media.urls.length]} alt="" onError={() => setErr(true)} className="absolute inset-0 h-full w-full object-contain" style={{ background: "#000" }} />
        {media.urls.length > 1 && (
          <>
            <button onClick={() => setPlaying((p) => !p)} aria-label={playing ? "정지" : "재생"}
              className="absolute bottom-2 left-2 z-10 flex h-7 w-7 items-center justify-center rounded-full outline-none" style={{ background: "rgba(0,0,0,.55)" }}>
              {playing ? <Pause className="h-3.5 w-3.5 text-white" fill="#fff" /> : <Play className="h-3.5 w-3.5 text-white" fill="#fff" />}
            </button>
            <span className="absolute bottom-2 right-2 z-10 px-1.5 py-[1px] text-[10px] tabular-nums text-white" style={{ background: "rgba(0,0,0,.5)", borderRadius: 3 }}>{(idx % media.urls.length) + 1}/{media.urls.length}</span>
          </>
        )}
      </>
    );
  if (media.kind === "videos")
    return <video src={media.urls[0]} controls playsInline preload="metadata" onError={() => setErr(true)} className="absolute inset-0 h-full w-full" style={{ background: "#000" }} onTimeUpdate={onTime} />;
  if (media.kind === "letter") {
    // 아래 → 위 크레딧 스크롤. 끝에 처음 만난 날 / 무지개다리 건넌 날을 크게.
    const dur = Math.max(14, Math.round((media.text || "").length / 12) + 12); // 글 길이에 비례
    return (
      <div className="absolute inset-0 overflow-hidden" style={{ background: "#161310" }}>
        <div style={{ position: "absolute", left: 0, right: 0, top: 0, padding: "0 11%", animation: `mw-letter-scroll ${dur}s linear infinite` }}>
          <p style={{ fontFamily: SERIF, fontSize: 13, lineHeight: 1.95, color: "#f3e9c8", whiteSpace: "pre-wrap", textAlign: "center", margin: 0 }}>{media.text}</p>
          {(media.metDate || media.partDate) && (
            <div style={{ marginTop: 34, textAlign: "center" }}>
              {media.metDate && (<div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10.5, letterSpacing: 1, color: "#bda77f" }}>우리 처음 만난 날</div>
                <div style={{ fontFamily: SERIF, fontSize: 26, fontWeight: 700, color: "#f6ecd2" }}>{media.metDate}</div>
              </div>)}
              {media.partDate && (<div>
                <div style={{ fontSize: 10.5, letterSpacing: 1, color: "#bda77f" }}>무지개다리 건넌 날</div>
                <div style={{ fontFamily: SERIF, fontSize: 26, fontWeight: 700, color: "#f6ecd2" }}>{media.partDate}</div>
              </div>)}
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
}

function PreviewBox({ label, badge, badgeColor, big, name, src, videoSrc, media, subs, selSubId, onSubEdit, onSelSub }) {
  const boxRef = useRef(null);
  const [time, setTime] = useState(0);
  const overlay = subs && subs.length > 0;
  const hasReal = !!media;
  return (
    <div className="flex flex-col">
      <div className="mb-1.5 flex items-center gap-2">
        <span className="text-[12.5px] font-semibold" style={{ color: MUTE }}>{label}</span>
        {badge && <span className="px-2 py-[2px] text-[10.5px] font-bold" style={{ background: badgeColor.bg, color: badgeColor.c, borderRadius: 3 }}>{badge}</span>}
      </div>
      <div ref={boxRef} className="relative w-full" style={{ aspectRatio: "16/9", background: "#1c232c", borderRadius: 6, overflow: "hidden" }}>
        {hasReal ? (
          <MediaView media={media} onTime={(e) => setTime(e.currentTarget.currentTime)} />
        ) : videoSrc ? (
          <video src={videoSrc} controls playsInline preload="metadata" className="absolute inset-0 h-full w-full" style={{ background: "#000" }}
            onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)} />
        ) : (
          <>
            {src ? (
              <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <span style={{ fontFamily: SERIF, fontSize: big ? 30 : 20, fontWeight: 700, color: "#f3efe6", textShadow: "0 2px 12px rgba(0,0,0,.5)" }}>{name}</span>
              </div>
            )}
            <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full" style={{ background: "rgba(255,255,255,.9)" }}><Play className="h-3.5 w-3.5" style={{ color: NAVY }} fill={NAVY} /></span>
              <div className="h-1.5 flex-1 rounded-full" style={{ background: "rgba(255,255,255,.25)" }}><div className="h-full rounded-full" style={{ width: "32%", background: "#fff" }} /></div>
              <span className="text-[11px] tabular-nums text-white">미리보기</span>
            </div>
          </>
        )}
        {/* 실제 미디어 라벨 배지 */}
        {hasReal && media.label && (
          <span className="absolute left-2 top-2 z-10 px-1.5 py-[2px] text-[10px] font-semibold" style={{ background: "rgba(0,0,0,.5)", color: "#e8ecf1", borderRadius: 3 }}>{media.label}</span>
        )}
        {/* 실시간 자막 오버레이 */}
        {overlay && <SubtitleLayer boxRef={boxRef} subs={subs} time={(media?.kind === "videos" || videoSrc) ? time : 0} selSubId={selSubId} onSubEdit={onSubEdit} onSelSub={onSelSub} />}
      </div>
    </div>
  );
}

export function Preview({ sel, blocks, gens, name, sourceVideoUrl, blockMedia = {}, subtitles = [], onSubEdit, onSelSub }) {
  const block = (sel.scope === "block" ? blocks.find((b) => b.id === sel.id) : null) || blocks[0] || null;
  const gen = block ? gens[block.id] : null;
  const origSrc = blockFrame(block, gen, name, true);
  const editedSrc = blockFrame(block, gen, name, false);
  const label = block ? (KIND_LABEL[block.type] || "") : "";
  const selSubId = sel.scope === "subtitle" ? sel.id : null;
  const bm = block ? blockMedia[block.id] : null;          // { source, result }
  const srcMedia = bm?.source || null;                      // 보호자 원본
  const resMedia = bm?.result || null;                      // AI 생성 결과(작업본)
  const isClip = block?.type === "clip";                    // 콘텐츠 허브 클립 — 보호자 원본/AI 결과가 아닌 템플릿 고정 자산
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <SplitSquareHorizontal className="h-4 w-4" style={{ color: GOLD_D }} />
        <span className="text-[13px] font-bold" style={{ color: INK }}>미리보기{isClip ? "" : " · 원본과 비교"}</span>
        {label && <span className="text-[11.5px]" style={{ color: FAINT }}>· 지금 보는 블록: <b style={{ color: MUTE }}>{label}</b></span>}
      </div>
      {isClip ? (
        // 클립 = 템플릿 고정 자산(원본 vs 작업본 비교가 없음) → 중앙 한 칸만.
        <div className="mx-auto" style={{ maxWidth: 560 }}>
          <PreviewBox label="콘텐츠 허브 클립" badge={resMedia ? "최종본에 그대로 삽입" : "자산 미연결"} badgeColor={{ bg: GOLD_SOFT, c: GOLD_D }} big name={name} src={editedSrc} media={resMedia} />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {/* 원본 = 보호자가 올린 실제 소스. 없으면 완성영상(있으면)·목업 폴백. (편집값인 자막은 여기 표시 안 함 — 비교용 원본) */}
          <PreviewBox label="유저가 만든 원본" badge={srcMedia ? "보호자 원본" : sourceVideoUrl ? "완성본 · 재생" : "원본 · 수정불가"} badgeColor={{ bg: "rgba(90,100,112,.15)", c: "#5a6470" }}
            name={name} src={origSrc} videoSrc={sourceVideoUrl} media={srcMedia} />
          {/* 작업본 = AI 생성 결과(타이틀 Seedream·AI영상 Kling). 자막 미리보기·드래그는 편집 중인 이쪽에 표시. */}
          <PreviewBox label="내가 편집 중" badge={resMedia ? "작업본 · AI 결과" : "작업본 · 생성 전"} badgeColor={{ bg: GOLD_SOFT, c: GOLD_D }} big name={name} src={editedSrc} media={resMedia}
            subs={subtitles} selSubId={selSubId} onSubEdit={onSubEdit} onSelSub={onSelSub} />
        </div>
      )}
      <div className="mt-1.5 text-[11.5px]" style={{ color: FAINT }}>
        {subtitles.length
          ? "자막을 끌어 위치를 잡으세요. 영상 재생 시 설정한 시간 구간에만 표시됩니다(최종 렌더에 그대로 반영)."
          : isClip
          ? (resMedia ? "콘텐츠 허브에 연결된 클립입니다 — 최종본에 그대로 들어갈 실제 클립입니다(편집 없음)." : "이 클립에 콘텐츠 허브 자산이 연결되지 않았습니다 — 템플릿에서 클립 자산을 지정하세요.")
          : resMedia
          ? "왼쪽 보호자 원본 → 오른쪽 AI 변환 결과. 「AI로 만들기」로 재생성합니다."
          : srcMedia
          ? "왼쪽은 보호자 원본. 오른쪽 작업본은 AI 생성 후 결과물로 바뀝니다."
          : "왼쪽에서 블록을 고르면 보호자 원본이 표시됩니다."}
      </div>
    </div>
  );
}
