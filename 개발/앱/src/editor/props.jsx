// 편집기 — 오른쪽 속성 패널(PropPanel) + 보조(PromptPicker·PromptModal·GenHistory).
// 선택(sel)에 따라 블록/전환/음악의 편집 컨트롤을 보여준다. 편집값은 상위(VideoEditor)의 edits로 컨트롤드.
import React, { useState } from "react";
import { Image as ImageIcon, Music, Upload, Plus, RefreshCw, Trash2, ArrowRightLeft, Check, Type, SlidersHorizontal, X, Film } from "lucide-react";
import { SERIF, LINE, LINE2, GOLD, GOLD_D, GOLD_SOFT, INK, MUTE, FAINT, RADIUS } from "../theme.js";
import { DateField, Modal } from "../ui.jsx";
import { toast } from "../toast.jsx";
import * as D from "../data.js";
import { BLOCK_ICON, KIND_LABEL, blockTrans, genDefault, exampleLetter, SLIDE_PHOTOS, SLIDE_PER, TITLE_SYSTEM_TEXT } from "./blocks.js";

// ── 오른쪽: 편집 패널 ──────────────────────────────────────────
function L({ children }) { return <div className="mb-1.5 text-[12.5px] font-semibold" style={{ color: INK }}>{children}</div>; }
const inputCls = "w-full px-3 text-[13.5px] outline-none";
const inputStyle = { height: 38, background: "#fff", border: "1px solid " + LINE2, borderRadius: RADIUS, color: INK };
function Field({ label, children }) { return <div className="mb-4"><L>{label}</L>{children}</div>; }
// 소리 크기 슬라이더(0~100%) — 클립·추억영상 공용
function SoundField({ label, value, onChange }) {
  const v = value != null ? value : 100;
  return <Field label={`${label} (${v}%)`}><input type="range" min="0" max="100" value={v} onChange={(e) => onChange(+e.target.value)} className="w-full" style={{ accentColor: GOLD }} /></Field>;
}

// 프롬프트 카드 목록 — 관리 모달 본문
function PromptCards() {
  return (
    <div className="space-y-2">
      {D.PROMPTS.map((p) => (
        <div key={p.id} className="px-3 py-2.5" style={{ background: "#f6f3ec", border: "1px solid " + LINE, borderRadius: RADIUS }}>
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-[1px] text-[10.5px] font-bold" style={{ background: "#e9eef5", color: "#3f5e87", borderRadius: 3 }}>{p.target}</span>
            <span className="text-[12.5px] font-semibold" style={{ color: INK }}>{p.name}</span>
            <button onClick={() => toast(p.name + " 프롬프트를 편집합니다")} className="ml-auto text-[11.5px] font-semibold" style={{ color: GOLD }}>편집</button>
          </div>
          <div className="mt-1 text-[11.5px] leading-relaxed" style={{ color: MUTE }}>{p.body}</div>
          <div className="mt-2 flex items-center gap-2 border-t pt-2" style={{ borderColor: LINE }}>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center" style={{ background: "#fff", border: "1px dashed " + LINE2, borderRadius: RADIUS }}><ImageIcon className="h-4 w-4" style={{ color: FAINT }} /></span>
            <button onClick={() => toast("사진 선택 창을 엽니다")} className="flex items-center gap-1 text-[11.5px] font-semibold" style={{ color: GOLD }}><Upload className="h-3.5 w-3.5" /> 사진 추가</button>
            <span className="text-[10.5px]" style={{ color: FAINT }}>사진 + 문구를 함께 전송</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// AI 문구(프롬프트) 관리 모달 — 타이틀·추억영상 블록의 "관리" 버튼에서 호출
function PromptModal({ open, onClose }) {
  return (
    <Modal open={open} onClose={onClose} width={460}>
      <div className="flex items-center justify-between px-4" style={{ height: 48, borderBottom: "1px solid " + LINE }}>
        <span className="text-[14px] font-bold" style={{ color: INK }}>프롬프트 관리</span>
        <button onClick={() => toast("새 프롬프트를 추가합니다")} className="flex items-center gap-1 text-[12px] font-semibold" style={{ color: GOLD }}><Plus className="h-3.5 w-3.5" /> 새로 추가</button>
      </div>
      <div className="max-h-[58vh] overflow-y-auto px-4 py-3">
        <PromptCards />
        <p className="mt-2 text-[11.5px] leading-relaxed" style={{ color: FAINT }}>프롬프트에 참고 사진을 함께 넣어 더 정확하게 생성합니다(사진·문구 둘 다 지원).</p>
      </div>
      <div className="px-4 py-2.5" style={{ borderTop: "1px solid " + LINE }}>
        <button onClick={onClose} className="w-full py-2 text-[13px] font-bold" style={{ background: GOLD, color: "#fff", borderRadius: RADIUS }}>닫기</button>
      </div>
    </Modal>
  );
}

// 프롬프트 드롭다운 + 위에 작은 "관리" 버튼(모달 열기) — 타이틀·추억영상 공용
function PromptPicker({ target, onManage }) {
  return (
    <div className="mb-4">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[12.5px] font-semibold" style={{ color: INK }}>프롬프트</span>
        <button onClick={onManage} className="flex items-center gap-1 text-[11.5px] font-semibold outline-none" style={{ color: GOLD_D }}><SlidersHorizontal className="h-3.5 w-3.5" /> 관리</button>
      </div>
      <select className={inputCls} style={inputStyle}>{D.PROMPTS.filter((p) => p.target === target).map((p) => <option key={p.id}>{p.name}</option>)}</select>
    </div>
  );
}

// AI 생성 결과물 — 실제 산출물(타이틀 Seedream 이미지·AI영상 Kling 영상)을 표시. 없으면 '생성 전' 안내.
function GenHistory({ results = [] }) {
  if (!results.length) {
    return (
      <div className="mt-3 px-3 py-3 text-center text-[11.5px]" style={{ background: "#f6f3ec", border: "1px dashed " + LINE2, borderRadius: RADIUS, color: FAINT }}>
        아직 AI 생성 전입니다 — 「AI로 만들기」를 누르면 결과가 여기에 표시됩니다.
      </div>
    );
  }
  return (
    <div className="mt-3">
      <div className="mb-1.5 text-[11.5px] font-semibold" style={{ color: MUTE }}>AI 생성 결과 <span className="font-normal" style={{ color: FAINT }}>({results.length})</span></div>
      <div className="grid grid-cols-2 gap-2">
        {results.map((r, i) => (
          <div key={i} className="overflow-hidden" style={{ borderRadius: 6, border: "2px solid " + GOLD }}>
            {r.kind === "video"
              ? <video src={r.url} controls playsInline preload="metadata" className="block w-full" style={{ aspectRatio: "16/9", background: "#000" }} />
              : <img src={r.url} alt="" className="block w-full" style={{ aspectRatio: "16/9", objectFit: "cover", background: "#000" }} />}
            <div className="px-1.5 py-1 text-[10.5px] font-semibold" style={{ color: GOLD_D, background: GOLD_SOFT }}>{r.label || `결과 ${i + 1}`}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PropPanel({ blocks, subtitles = [], edits, onEdit, onRemoveSub, reservation, bgmName, media, gens, onGenerate, onSelectGen, onDeleteGen, sel }) {
  const [promptModal, setPromptModal] = useState(false); // AI 문구 관리 모달
  let item;
  if (sel.scope === "block") item = blocks.find((b) => b.id === sel.id);
  else if (sel.scope === "trans") item = { effect: blockTrans(sel.id) };
  else if (sel.scope === "subtitle") item = subtitles.find((s) => s.id === sel.id);
  const k = sel.kind;
  if (!item) return null;
  // 실제 보호자 자산(서명URL) — 없으면(미로드·dev) 목업 폴백.
  const _assets = media?.assets || [];
  const _slidePhotos = _assets.filter((a) => a.role === "slide_photo" && a.url);
  const _memoryVideos = _assets.filter((a) => a.role === "memory_video" && a.url);
  const _titlePhoto = _assets.find((a) => a.role === "title");
  const _aiPhotos = _assets.filter((a) => a.role === "ai_video");
  const srcAsset = k === "title" ? _titlePhoto : k === "ai" ? _aiPhotos[(item.aiIndex || 1) - 1] : null; // 블록 소스 사진
  // AI 생성 결과물(실데이터) — GenHistory에 실제로 표시.
  const _bySort = (p, q) => (p.sort_order ?? p.sortOrder ?? 0) - (q.sort_order ?? q.sortOrder ?? 0);
  const _titleResults = _assets.filter((a) => a.role === "title_result" && a.url).sort(_bySort);
  const _aiResults = _assets.filter((a) => a.role === "ai_video_result" && a.url).sort(_bySort);
  const _slideResult = _assets.find((a) => a.role === "slide_video" && a.url);
  const genResults = k === "title"
    ? _titleResults.map((a, i) => ({ kind: "image", url: a.url, label: i === 0 ? "① 영정" : i === 1 ? "② 화풍변경" : `장면 ${i + 1}` }))
    : k === "ai"
    ? (_aiResults[(item.aiIndex || 1) - 1] ? [{ kind: "video", url: _aiResults[(item.aiIndex || 1) - 1].url, label: "Kling AI영상" }] : [])
    : k === "slide"
    ? (_slideResult ? [{ kind: "video", url: _slideResult.url, label: "슬라이드 영상" }] : [])
    : [];
  const gen = sel.scope === "block" ? (gens[item.id] || genDefault(item.id)) : null; // 타이틀·슬라이드·AI 결과물 히스토리
  const name = reservation?.deceased || D.EDITOR_RESERVATION.deceased;
  // 편집값(컨트롤드) — 전환은 "trans-"+id, 음악은 "audio" 키로 보관
  const transKey = "trans-" + sel.id;
  const effect = (edits[transKey] && edits[transKey].effect) || blockTrans(sel.id);
  const au = edits.audio || {};                 // 배경 음악 편집값("audio" 키) — 추억 슬라이드에서 설정
  const audioItem = D.EDITOR_TIMELINE.audio[0];
  // 추억 슬라이드 — 실제 보호자 사진(없으면 목업 폴백) + 사진 사이 전환(기본 페이드).
  const slideSrcs = _slidePhotos.length ? _slidePhotos.map((a) => a.url) : SLIDE_PHOTOS;
  const slideTrans = item.slideTrans || slideSrcs.slice(1).map(() => "페이드");
  const setSlideTrans = (i, v) => { const n = slideTrans.slice(); n[i] = v; onEdit(item.id, { slideTrans: n }); };
  const Icon = BLOCK_ICON[k] || (k === "transition" ? ArrowRightLeft : k === "subtitle" ? Type : ImageIcon);

  return (
    <div className="flex h-full flex-col">
      <PromptModal open={promptModal} onClose={() => setPromptModal(false)} />
      <div className="flex items-center gap-2 px-4 py-4" style={{ borderBottom: "1px solid " + LINE }}>
        <Icon className="h-5 w-5" style={{ color: GOLD_D }} />
        <span className="text-[14px] font-bold" style={{ color: INK }}>{KIND_LABEL[k]} 편집</span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {/* 소스 파일 — 타이틀·AI영상은 독사진(이미지)·클립은 파일. 추억 영상(유저 영상 묶음)·슬라이드는 별도 처리라 미노출 */}
        {(k === "clip" || k === "ai" || k === "title") && (() => {
          const isPhoto = k === "title" || k === "ai"; // 독사진(이미지) 입력
          const fileName = srcAsset?.name || (item.file || item.source || "").split("/").pop() || "파일 없음";
          return (
            <Field label={isPhoto ? "보호자 독사진 (AI 변환 소스)" : "지금 들어간 파일"}>
              {srcAsset?.url && (
                <img src={srcAsset.url} alt="" className="mb-2 w-full" style={{ aspectRatio: "16/9", objectFit: "cover", borderRadius: RADIUS, border: "1px solid " + LINE2, background: "#000" }} />
              )}
              <div className="px-3 py-2.5 text-[12.5px]" style={{ background: "#f6f3ec", border: "1px solid " + LINE, borderRadius: RADIUS, color: INK, wordBreak: "break-all" }}>{fileName}</div>
              <button onClick={() => toast(isPhoto ? "사진 선택 창을 엽니다" : "파일 선택 창을 엽니다")} className="mt-2 flex w-full items-center justify-center gap-1.5 py-2.5 text-[13px] font-bold text-white" style={{ background: GOLD, borderRadius: RADIUS }}><Upload className="h-4 w-4" /> {isPhoto ? "사진 교체" : "다른 파일로 바꾸기"}</button>
            </Field>
          );
        })()}

        {k === "title" && (() => {
          const prefix = item.prefix ?? TITLE_SYSTEM_TEXT;
          const petName = item.text ?? name;
          return (
          <>
            <div className="grid grid-cols-2 gap-2">
              <Field label="시스템 문구"><input className={inputCls} style={{ ...inputStyle, fontFamily: SERIF }} value={prefix} onChange={(e) => onEdit(item.id, { prefix: e.target.value })} /></Field>
              <Field label="반려동물 이름"><input className={inputCls} style={{ ...inputStyle, fontFamily: SERIF }} value={petName} onChange={(e) => onEdit(item.id, { text: e.target.value })} /></Field>
            </div>
            <Field label="자막 미리보기 · 중앙 하단">
              <div className="flex items-center justify-center px-3 py-4" style={{ background: "#1c232c", borderRadius: RADIUS }}>
                <span style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 700, color: "#f3e9c8", textShadow: "0 2px 8px rgba(0,0,0,.6)" }}>{`${prefix} ${petName}`.trim()}</span>
              </div>
            </Field>
            <div className="mb-4 px-3 py-2.5 text-[11.5px] leading-relaxed" style={{ background: "#f6f3ec", border: "1px solid " + LINE, borderRadius: RADIUS, color: MUTE }}>
              ① <b style={{ color: INK }}>AI 초상화</b>(독사진→초상화)와 자막이 서서히 나타나고, <b style={{ color: INK }}>10초</b>에 ② <b style={{ color: INK }}>톤 변경 사진</b>이 오버랩되어 나타난 뒤 페이드아웃됩니다. (총 20초)
            </div>
            <PromptPicker target="타이틀" onManage={() => setPromptModal(true)} />
            <button onClick={() => onGenerate(item.id)} className="flex w-full items-center justify-center gap-1.5 py-2.5 text-[13px] font-bold text-white" style={{ background: GOLD, borderRadius: RADIUS }}><RefreshCw className="h-4 w-4" /> AI로 만들기</button>
            <GenHistory results={genResults} />
          </>
          );
        })()}

        {/* 클립: 보이는 시간 대신 소리 크기 조절 (슬라이드·추억영상은 보이는 시간 없음 · 타이틀만 유지) */}
        {k === "clip" && <SoundField label="클립 소리 크기" value={item.volume} onChange={(val) => onEdit(item.id, { volume: val })} />}
        {k === "slide" && (
          <>
            <Field label={`사진 조합 · 사이 전환 (${slideSrcs.length}장 · 장당 7~10초 · 총 2분30초 이내)`}>
              <div className="max-h-[260px] overflow-y-auto px-2.5 py-2.5" style={{ background: "#f6f3ec", border: "1px solid " + LINE, borderRadius: RADIUS }}>
                {slideSrcs.map((src, i) => (
                  <React.Fragment key={i}>
                    {/* 사진 */}
                    <div className="flex items-center gap-2.5">
                      <img src={src} alt="" className="shrink-0" style={{ width: 64, aspectRatio: "16/9", objectFit: "cover", borderRadius: 4, border: "1px solid " + LINE2 }} />
                      <span className="text-[12px] font-semibold" style={{ color: INK }}>사진 {i + 1}</span>
                      <span className="ml-auto text-[10.5px]" style={{ color: FAINT }}>{SLIDE_PER}초</span>
                    </div>
                    {/* 사진 사이 전환 */}
                    {i < slideSrcs.length - 1 && (
                      <div className="flex items-center gap-1.5 py-1" style={{ paddingLeft: 26 }}>
                        <span className="h-3.5 w-px" style={{ background: LINE2 }} />
                        <ArrowRightLeft className="h-3 w-3 shrink-0" style={{ color: GOLD_D }} />
                        <select value={slideTrans[i]} onChange={(e) => setSlideTrans(i, e.target.value)}
                          className="text-[11.5px] outline-none" style={{ height: 26, background: "#fff", border: "1px solid " + LINE2, borderRadius: RADIUS, color: INK, padding: "0 6px" }}>
                          {D.TRANSITION_TYPES.map((t) => <option key={t}>{t}</option>)}
                        </select>
                        <span className="h-3.5 w-px" style={{ background: LINE2 }} />
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>
              <button onClick={() => toast("사진 추가/순서 변경은 유저 업로드 기준으로 구성됩니다")} className="mt-2 flex w-full items-center justify-center gap-1.5 py-2 text-[12.5px] font-semibold" style={{ border: "1px dashed " + LINE2, borderRadius: RADIUS, color: GOLD_D }}><Plus className="h-3.5 w-3.5" /> 사진 추가 · 순서 변경</button>
            </Field>
            <button onClick={() => onGenerate(item.id)} className="flex w-full items-center justify-center gap-1.5 py-2.5 text-[13px] font-bold text-white" style={{ background: GOLD, borderRadius: RADIUS }}><RefreshCw className="h-4 w-4" /> 사진으로 만들기</button>
            <GenHistory results={genResults} />

            {/* 배경 음악 — 추억 슬라이드(보호자 사진)에만 깔린다. 추억 영상(유저 영상)은 원본 사운드 유지. */}
            <div className="mt-5 border-t pt-4" style={{ borderColor: LINE }}>
              <div className="mb-2 flex items-center gap-1.5 text-[12.5px] font-bold" style={{ color: INK }}><Music className="h-4 w-4" style={{ color: GOLD_D }} /> 배경 음악 <span className="font-normal" style={{ color: FAINT }}>· 추억 슬라이드(사진)에만</span></div>
              <p className="mb-2 text-[11px] leading-relaxed" style={{ color: FAINT }}>※ 추억 영상(보호자 영상)에는 BGM이 들어가지 않고 원본 사운드가 유지됩니다.</p>
              <Field label="지금 음악">
                <div className="px-3 py-2.5 text-[12.5px]" style={{ background: "#f6f3ec", border: "1px solid " + LINE, borderRadius: RADIUS, color: INK }}>{bgmName}</div>
                <button onClick={() => toast("음악 파일 선택 창을 엽니다")} className="mt-2 flex w-full items-center justify-center gap-1.5 py-2.5 text-[13px] font-bold text-white" style={{ background: GOLD, borderRadius: RADIUS }}><Upload className="h-4 w-4" /> 다른 음악으로 바꾸기</button>
              </Field>
              <SoundField label="소리 크기" value={au.volume != null ? au.volume : audioItem.volume} onChange={(val) => onEdit("audio", { volume: val })} />
              <div className="grid grid-cols-2 gap-2">
                <Field label="서서히 커지기 (초)"><input type="number" min="0" step="0.5" className={inputCls} style={inputStyle} value={au.fadeIn != null ? au.fadeIn : audioItem.fadeIn} onChange={(e) => onEdit("audio", { fadeIn: +e.target.value })} /></Field>
                <Field label="서서히 작아지기 (초)"><input type="number" min="0" step="0.5" className={inputCls} style={inputStyle} value={au.fadeOut != null ? au.fadeOut : audioItem.fadeOut} onChange={(e) => onEdit("audio", { fadeOut: +e.target.value })} /></Field>
              </div>
            </div>
          </>
        )}

        {k === "video" && (() => {
          // 추억 영상 — 보호자가 올린 실제 영상(없으면 목업 폴백). 슬라이드 뒤 개별 클립으로 이어붙임.
          const vids = _memoryVideos.length ? _memoryVideos : (D.USER_UPLOADS || []).filter((u) => u.kind === "video");
          return (
          <>
            <Field label={`보호자 영상 (${vids.length}개 · 슬라이드 뒤 개별 클립)`}>
              <div className="space-y-2 px-2.5 py-2.5" style={{ background: "#f6f3ec", border: "1px solid " + LINE, borderRadius: RADIUS }}>
                {vids.length === 0
                  ? <div className="py-2 text-center text-[11.5px]" style={{ color: FAINT }}>올라온 영상이 없습니다.</div>
                  : vids.map((v, i) => (
                    <div key={v.id || i}>
                      <div className="mb-1 flex items-center gap-2">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold" style={{ background: "#e7e2d8", color: MUTE }}>{i + 1}</span>
                        <Film className="h-3.5 w-3.5 shrink-0" style={{ color: GOLD_D }} />
                        <span className="min-w-0 flex-1 truncate text-[12px] font-semibold" style={{ color: INK }}>{v.name || `영상 ${i + 1}`}</span>
                      </div>
                      {v.url && <video src={v.url} controls playsInline preload="metadata" className="w-full" style={{ aspectRatio: "16/9", background: "#000", borderRadius: 4 }} />}
                    </div>
                  ))}
              </div>
              <p className="mt-2 text-[11px] leading-relaxed" style={{ color: FAINT }}>※ 추억 슬라이드(사진) 다음에 각 영상이 개별 클립으로 이어집니다. BGM 없이 원본 사운드 유지, 최종 렌더 시 합성됩니다.</p>
            </Field>
            <SoundField label="원본 소리 크기" value={item.volume} onChange={(val) => onEdit(item.id, { volume: val })} />
          </>
          );
        })()}

        {k === "ai" && (
          <>
            <PromptPicker target="AI영상" onManage={() => setPromptModal(true)} />
            <button onClick={() => onGenerate(item.id)} className="flex w-full items-center justify-center gap-1.5 py-2.5 text-[13px] font-bold text-white" style={{ background: GOLD, borderRadius: RADIUS }}><RefreshCw className="h-4 w-4" /> AI로 만들기</button>
            <GenHistory results={genResults} />
            <div className="mt-3 px-3 py-2.5 text-[11.5px] leading-relaxed" style={{ background: "#f6f3ec", border: "1px solid " + LINE, borderRadius: RADIUS, color: MUTE }}>
              독사진 1장 → AI 영상(약 8초). 추억 슬라이드 앞(A) · 추억 영상 뒤(B)로 유저 소스를 감쌉니다.
            </div>
            <div className="mt-4"><SoundField label="AI 영상 소리 크기" value={item.volume} onChange={(val) => onEdit(item.id, { volume: val })} /></div>
          </>
        )}

        {k === "letter" && (
          <>
            {/* 보호자(유저) 입력을 기본값으로 — 편집하면 그 값이 실시간으로 미리보기에 반영 */}
            <Field label="우리 처음 만난 날"><DateField value={item.metDate ?? media?.metDate ?? reservation?.metDate ?? ""} onChange={(d) => onEdit(item.id, { metDate: d })} /></Field>
            <Field label="무지개다리 건넌 날"><DateField value={item.partDate ?? media?.partDate ?? reservation?.partDate ?? ""} onChange={(d) => onEdit(item.id, { partDate: d })} /></Field>
            <Field label="편지 내용"><textarea rows={7} value={item.text ?? media?.letter ?? exampleLetter(name)} onChange={(e) => onEdit(item.id, { text: e.target.value })} className="w-full resize-none p-3 text-[13.5px] leading-relaxed outline-none" style={{ ...inputStyle, height: "auto", fontFamily: SERIF }} /></Field>
            <p className="text-[11.5px] leading-relaxed" style={{ color: FAINT }}>※ 보호자가 입력한 편지·날짜입니다. 수정하면 왼쪽 미리보기에 실시간 반영되고, 두 날짜는 편지 마지막에 크게 표시됩니다.</p>
          </>
        )}

        {k === "subtitle" && (() => {
          const fontVal = D.SUBTITLE_FONTS.find((f) => f.css === item.font)?.css || D.SUBTITLE_FONTS[0].css;
          const size = item.size ?? 48;
          return (
          <>
            <Field label="자막 글자"><textarea rows={3} value={item.text ?? ""} onChange={(e) => onEdit(item.id, { text: e.target.value })} className="w-full resize-none p-3 text-[13.5px] leading-relaxed outline-none" style={{ ...inputStyle, height: "auto", fontFamily: fontVal }} /></Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="폰트"><select className={inputCls} style={inputStyle} value={fontVal} onChange={(e) => onEdit(item.id, { font: e.target.value })}>{D.SUBTITLE_FONTS.map((f) => <option key={f.name} value={f.css}>{f.name}</option>)}</select></Field>
              <Field label="위치"><select className={inputCls} style={inputStyle} value={item.xPct != null ? "직접배치" : (item.pos || "하단")} onChange={(e) => onEdit(item.id, { pos: e.target.value, xPct: null, yPct: null })}>{item.xPct != null && <option value="직접배치">직접배치(드래그)</option>}{D.SUBTITLE_POS.map((p) => <option key={p}>{p}</option>)}</select></Field>
            </div>
            <Field label={`글자 크기 (${size}px)`}>
              <div className="flex items-center gap-2">
                <input type="range" min="20" max="80" step="1" value={size} onChange={(e) => onEdit(item.id, { size: +e.target.value })} className="flex-1" style={{ accentColor: GOLD }} />
                <input type="number" min="20" max="80" value={size} onChange={(e) => onEdit(item.id, { size: Math.max(20, Math.min(80, +e.target.value || 0)) })} className="w-16 px-2 text-[13px] outline-none" style={{ height: 34, background: "#fff", border: "1px solid " + LINE2, borderRadius: RADIUS, color: INK }} />
              </div>
            </Field>
            <Field label="미리보기">
              <div className="flex items-center justify-center px-3 py-4" style={{ background: "#1c232c", borderRadius: RADIUS, overflow: "hidden" }}>
                <span className="text-center leading-snug" style={{ fontFamily: fontVal, fontSize: Math.min(size, 34), color: item.color || "#f3e9c8", textShadow: "0 2px 8px rgba(0,0,0,.6)" }}>{item.text || "자막 미리보기"}</span>
              </div>
            </Field>
            <Field label="보이는 구간"><div className="px-3 py-2.5 text-[12.5px] tabular-nums" style={{ background: "#f6f3ec", border: "1px solid " + LINE, borderRadius: RADIUS, color: INK }}>{item.start}초 ~ {item.end}초 <span style={{ color: FAINT }}>· 타임라인에서 끌어 옮기거나 양끝으로 길이 조절</span></div></Field>
            <p className="text-[11.5px] leading-relaxed" style={{ color: FAINT }}>※ 자막은 영상 위에 표시됩니다. 미리보기에서 끌어 위치를 직접 잡을 수 있어요.</p>
            {onRemoveSub && (
              <button type="button" onClick={() => onRemoveSub(item.id)} className="mt-1 flex items-center justify-center gap-1 rounded-md py-2 text-[12.5px] font-semibold outline-none"
                style={{ color: "#a23b3b", background: "#f7ecec", border: "1px solid #e9d6d6" }}>
                <Trash2 className="h-3.5 w-3.5" /> 자막 삭제
              </button>
            )}
          </>
          );
        })()}

        {k === "transition" && (
          <>
            <Field label="장면이 바뀌는 효과">
              <div className="grid grid-cols-2 gap-2">
                {D.TRANSITION_TYPES.map((t) => (
                  <button key={t} onClick={() => onEdit(transKey, { effect: t })} className="flex h-16 flex-col items-center justify-center gap-1 text-[13px] font-bold" style={{ background: effect === t ? GOLD_SOFT : "#fff", border: "1.5px solid " + (effect === t ? GOLD : LINE2), borderRadius: 6, color: effect === t ? GOLD_D : MUTE }}>
                    <ArrowRightLeft className="h-4 w-4" /> {t}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="효과 길이"><select className={inputCls} style={inputStyle} value={(edits[transKey] && edits[transKey].len) || "0.5초 (기본)"} onChange={(e) => onEdit(transKey, { len: e.target.value })}><option>0.3초</option><option>0.5초 (기본)</option><option>1.0초</option></select></Field>
            <button onClick={() => { onEdit(transKey, { effect: "없음" }); toast("장면 전환 효과를 뺐습니다"); }} className="flex w-full items-center justify-center gap-1.5 py-2.5 text-[13px] font-semibold" style={{ border: "1px solid " + LINE2, borderRadius: RADIUS, color: MUTE }}><Trash2 className="h-4 w-4" /> 효과 빼기</button>
          </>
        )}

      </div>
    </div>
  );
}
