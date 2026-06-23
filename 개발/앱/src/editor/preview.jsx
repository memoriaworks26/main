// 편집기 — 가운데 미리보기(원본 vs 작업본 2분할).
import React from "react";
import { Play, SplitSquareHorizontal } from "lucide-react";
import { SERIF, NAVY, INK, MUTE, FAINT, GOLD_D, GOLD_SOFT } from "../theme.js";
import { blockFrame, KIND_LABEL } from "./blocks.js";

function PreviewBox({ label, badge, badgeColor, big, name, src, videoSrc }) {
  return (
    <div className="flex flex-col">
      <div className="mb-1.5 flex items-center gap-2">
        <span className="text-[12.5px] font-semibold" style={{ color: MUTE }}>{label}</span>
        {badge && <span className="px-2 py-[2px] text-[10.5px] font-bold" style={{ background: badgeColor.bg, color: badgeColor.c, borderRadius: 3 }}>{badge}</span>}
      </div>
      <div className="relative w-full" style={{ aspectRatio: "16/9", background: "#1c232c", borderRadius: 6, overflow: "hidden" }}>
        {videoSrc ? (
          // 실제 완성 영상 — 네이티브 컨트롤로 재생(목업 프레임·가짜 진행바 대체)
          <video src={videoSrc} controls playsInline preload="metadata" className="absolute inset-0 h-full w-full" style={{ background: "#000" }} />
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
      </div>
    </div>
  );
}

export function Preview({ sel, blocks, gens, name, sourceVideoUrl }) {
  // 선택한 블록(없으면 첫 블록) 기준 — 원본=자동본(v0), 작업본=선택한 결과물 버전
  const block = (sel.scope === "block" ? blocks.find((b) => b.id === sel.id) : null) || blocks[0] || null;
  const gen = block ? gens[block.id] : null;
  const origSrc = blockFrame(block, gen, name, true);
  const editedSrc = blockFrame(block, gen, name, false);
  const label = block ? (KIND_LABEL[block.type] || "") : "";
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <SplitSquareHorizontal className="h-4 w-4" style={{ color: GOLD_D }} />
        <span className="text-[13px] font-bold" style={{ color: INK }}>미리보기 · 원본과 비교</span>
        {label && <span className="text-[11.5px]" style={{ color: FAINT }}>· 지금 보는 블록: <b style={{ color: MUTE }}>{label}</b></span>}
      </div>
      <div className="grid grid-cols-2 gap-4">
        {/* 원본 = 보호자가 완성한 실제 추모영상(있으면 재생), 없으면 블록 프레임 미리보기 */}
        <PreviewBox label="유저가 만든 원본" badge={sourceVideoUrl ? "완성본 · 재생" : "원본 · 수정불가"} badgeColor={{ bg: "rgba(90,100,112,.15)", c: "#5a6470" }} name={name} src={origSrc} videoSrc={sourceVideoUrl} />
        <PreviewBox label="내가 편집 중" badge="작업본" badgeColor={{ bg: GOLD_SOFT, c: GOLD_D }} big name={name} src={editedSrc} />
      </div>
      <div className="mt-1.5 text-[11.5px]" style={{ color: FAINT }}>
        {sourceVideoUrl
          ? "왼쪽은 보호자가 완성한 실제 영상(재생 가능), 오른쪽은 선택한 블록의 편집 미리보기입니다."
          : "선택한 블록의 결과물을 보여줍니다. 왼쪽에서 블록을, 오른쪽 ‘결과물’에서 버전을 고르면 작업본이 바뀝니다."}
      </div>
    </div>
  );
}
