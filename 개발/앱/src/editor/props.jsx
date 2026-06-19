// 편집기 — 오른쪽 속성 패널(PropPanel) + 보조(PromptManager·GenHistory).
// 선택(sel)에 따라 블록/전환/음악의 편집 컨트롤을 보여준다. 편집값은 상위(VideoEditor)의 edits로 컨트롤드.
import React from "react";
import { Image as ImageIcon, Music, Upload, Plus, RefreshCw, Trash2, ArrowRightLeft, Check } from "lucide-react";
import { SERIF, LINE, LINE2, GOLD, GOLD_D, GOLD_SOFT, INK, MUTE, FAINT, RADIUS } from "../theme.js";
import { toast } from "../toast.jsx";
import { genFrame } from "../lib/media.js";
import * as D from "../data.js";
import { BLOCK_ICON, KIND_LABEL, blockTrans, genDefault, exampleLetter, SLIDE_PHOTOS } from "./blocks.js";

// ── 오른쪽: 편집 패널 ──────────────────────────────────────────
function L({ children }) { return <div className="mb-1.5 text-[12.5px] font-semibold" style={{ color: INK }}>{children}</div>; }
const inputCls = "w-full px-3 text-[13.5px] outline-none";
const inputStyle = { height: 38, background: "#fff", border: "1px solid " + LINE2, borderRadius: RADIUS, color: INK };
function Field({ label, children }) { return <div className="mb-4"><L>{label}</L>{children}</div>; }

function PromptManager() {
  return (
    <div className="mt-5 border-t pt-4" style={{ borderColor: LINE }}>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[12.5px] font-bold" style={{ color: INK }}>AI 문구(프롬프트) 관리</span>
        <button onClick={() => toast("새 프롬프트를 추가합니다")} className="flex items-center gap-1 text-[12px] font-semibold" style={{ color: GOLD }}><Plus className="h-3.5 w-3.5" /> 새로 추가</button>
      </div>
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
      <p className="mt-2 text-[11.5px] leading-relaxed" style={{ color: FAINT }}>프롬프트에 참고 사진을 함께 넣어 더 정확하게 생성합니다(사진·문구 둘 다 지원).</p>
    </div>
  );
}

// 만든 결과물 누적 — 선택한 버전이 영상에 들어간다. "만들기"를 누를 때마다 아래에 쌓임.
function GenHistory({ kind, name, gen, onSelect }) {
  return (
    <div className="mt-3">
      <div className="mb-1.5 text-[11.5px] font-semibold" style={{ color: MUTE }}>
        만든 결과물 <span className="font-normal" style={{ color: FAINT }}>· 선택한 버전이 영상에 들어갑니다 ({gen.list.length})</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {gen.list.map((v, i) => {
          const on = v.id === gen.sel;
          return (
            <button key={v.id} onClick={() => onSelect(v.id)} className="relative overflow-hidden text-left outline-none transition focus-visible:ring-1"
              style={{ borderRadius: 6, border: "2px solid " + (on ? GOLD : LINE2) }} title={on ? "영상에 적용됨" : "이 버전을 적용"}>
              <img src={genFrame(kind, i, name)} alt="" className="block w-full" style={{ aspectRatio: "16/9", objectFit: "cover" }} />
              <div className="px-1.5 py-1 text-[10.5px] font-semibold" style={{ color: on ? GOLD_D : MUTE, background: on ? GOLD_SOFT : "#faf8f3" }}>{v.auto ? "자동본" : "버전 " + i}</div>
              {on && <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full" style={{ background: GOLD }}><Check className="h-2.5 w-2.5 text-white" strokeWidth={3} /></span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function PropPanel({ blocks, edits, onEdit, reservation, bgmName, gens, onGenerate, onSelectGen, sel }) {
  let item;
  if (sel.scope === "block") item = blocks.find((b) => b.id === sel.id);
  else if (sel.scope === "audio") item = D.EDITOR_TIMELINE.audio[0];
  else if (sel.scope === "trans") item = { effect: blockTrans(sel.id) };
  const k = sel.kind;
  if (!item) return null;
  const gen = sel.scope === "block" ? (gens[item.id] || genDefault(item.id)) : null; // 타이틀·슬라이드·AI 결과물 히스토리
  const name = reservation?.deceased || D.EDITOR_RESERVATION.deceased;
  // 편집값(컨트롤드) — 전환은 "trans-"+id, 음악은 "audio" 키로 보관
  const transKey = "trans-" + sel.id;
  const effect = (edits[transKey] && edits[transKey].effect) || blockTrans(sel.id);
  const au = edits.audio || {};
  const vol = au.volume != null ? au.volume : (item.volume != null ? item.volume : 100);
  // 추억 슬라이드 — 사진 조합 + 사진 사이 전환(기본 페이드). 편집값에 보관.
  const slideTrans = item.slideTrans || SLIDE_PHOTOS.slice(1).map(() => "페이드");
  const setSlideTrans = (i, v) => { const n = slideTrans.slice(); n[i] = v; onEdit(item.id, { slideTrans: n }); };
  const Icon = BLOCK_ICON[k] || (k === "audio" ? Music : k === "transition" ? ArrowRightLeft : ImageIcon);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-4 py-4" style={{ borderBottom: "1px solid " + LINE }}>
        <Icon className="h-5 w-5" style={{ color: GOLD_D }} />
        <span className="text-[14px] font-bold" style={{ color: INK }}>{KIND_LABEL[k]} 편집</span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {/* 소스 파일 (영상/클립/슬라이드/AI/음악) */}
        {(k === "video" || k === "audio" || k === "clip" || k === "slide" || k === "ai") && (
          <Field label={k === "audio" ? "지금 음악" : "지금 들어간 파일"}>
            <div className="px-3 py-2.5 text-[12.5px]" style={{ background: "#f6f3ec", border: "1px solid " + LINE, borderRadius: RADIUS, color: INK, wordBreak: "break-all" }}>{k === "audio" ? bgmName : (item.file || item.source || "").split("/").pop()}</div>
            <button onClick={() => toast(k === "audio" ? "음악 파일 선택 창을 엽니다" : "파일 선택 창을 엽니다")} className="mt-2 flex w-full items-center justify-center gap-1.5 py-2.5 text-[13px] font-bold text-white" style={{ background: GOLD, borderRadius: RADIUS }}><Upload className="h-4 w-4" /> {k === "audio" ? "다른 음악으로 바꾸기" : "다른 파일로 바꾸기"}</button>
          </Field>
        )}

        {k === "title" && (
          <>
            <Field label="화면에 보일 글자"><input className={inputCls} style={{ ...inputStyle, fontFamily: SERIF }} value={item.text ?? name} onChange={(e) => onEdit(item.id, { text: e.target.value })} /></Field>
            <Field label="보이는 시간 (초)"><input type="number" min="1" className={inputCls} style={inputStyle} value={item.dur} onChange={(e) => onEdit(item.id, { dur: Math.max(1, +e.target.value || 0) })} /></Field>
            <Field label="AI 문구 (타이틀)"><select className={inputCls} style={inputStyle}>{D.PROMPTS.filter((p) => p.target === "타이틀").map((p) => <option key={p.id}>{p.name}</option>)}</select></Field>
            <button onClick={() => onGenerate(item.id)} className="flex w-full items-center justify-center gap-1.5 py-2.5 text-[13px] font-bold text-white" style={{ background: GOLD, borderRadius: RADIUS }}><RefreshCw className="h-4 w-4" /> AI로 만들기</button>
            <GenHistory kind="title" name={name} gen={gen} onSelect={(vid) => onSelectGen(item.id, vid)} />
            <PromptManager />
          </>
        )}

        {(k === "clip" || k === "slide") && <Field label="보이는 시간 (초)"><input type="number" min="1" className={inputCls} style={inputStyle} value={item.dur} onChange={(e) => onEdit(item.id, { dur: Math.max(1, +e.target.value || 0) })} /></Field>}
        {k === "slide" && (
          <>
            <Field label={`사진 조합 · 사이 전환 (${SLIDE_PHOTOS.length}장)`}>
              <div className="px-2.5 py-2.5" style={{ background: "#f6f3ec", border: "1px solid " + LINE, borderRadius: RADIUS }}>
                {SLIDE_PHOTOS.map((src, i) => (
                  <React.Fragment key={i}>
                    {/* 사진 */}
                    <div className="flex items-center gap-2.5">
                      <img src={src} alt="" className="shrink-0" style={{ width: 64, aspectRatio: "16/9", objectFit: "cover", borderRadius: 4, border: "1px solid " + LINE2 }} />
                      <span className="text-[12px] font-semibold" style={{ color: INK }}>사진 {i + 1}</span>
                      <span className="ml-auto text-[10.5px]" style={{ color: FAINT }}>2.5초</span>
                    </div>
                    {/* 사진 사이 전환 */}
                    {i < SLIDE_PHOTOS.length - 1 && (
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
            <GenHistory kind="slide" name={name} gen={gen} onSelect={(vid) => onSelectGen(item.id, vid)} />
          </>
        )}

        {k === "ai" && (
          <>
            <Field label="보이는 시간 (초)"><input type="number" min="1" className={inputCls} style={inputStyle} value={item.dur} onChange={(e) => onEdit(item.id, { dur: Math.max(1, +e.target.value || 0) })} /></Field>
            <Field label="AI 문구 (영상)"><select className={inputCls} style={inputStyle}>{D.PROMPTS.filter((p) => p.target === "AI영상").map((p) => <option key={p.id}>{p.name}</option>)}</select></Field>
            <button onClick={() => onGenerate(item.id)} className="flex w-full items-center justify-center gap-1.5 py-2.5 text-[13px] font-bold text-white" style={{ background: GOLD, borderRadius: RADIUS }}><RefreshCw className="h-4 w-4" /> AI로 만들기</button>
            <GenHistory kind="ai" name={name} gen={gen} onSelect={(vid) => onSelectGen(item.id, vid)} />
            <PromptManager />
          </>
        )}

        {k === "letter" && (
          <Field label="편지 내용"><textarea rows={7} value={item.text ?? exampleLetter(name)} onChange={(e) => onEdit(item.id, { text: e.target.value })} className="w-full resize-none p-3 text-[13.5px] leading-relaxed outline-none" style={{ ...inputStyle, height: "auto", fontFamily: SERIF }} /></Field>
        )}

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

        {k === "audio" && (
          <>
            <Field label={`소리 크기 (${vol}%)`}><input type="range" min="0" max="100" value={vol} onChange={(e) => onEdit("audio", { volume: +e.target.value })} className="w-full" style={{ accentColor: GOLD }} /></Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="서서히 커지기 (초)"><input type="number" min="0" step="0.5" className={inputCls} style={inputStyle} value={au.fadeIn != null ? au.fadeIn : item.fadeIn} onChange={(e) => onEdit("audio", { fadeIn: +e.target.value })} /></Field>
              <Field label="서서히 작아지기 (초)"><input type="number" min="0" step="0.5" className={inputCls} style={inputStyle} value={au.fadeOut != null ? au.fadeOut : item.fadeOut} onChange={(e) => onEdit("audio", { fadeOut: +e.target.value })} /></Field>
            </div>
            <p className="text-[11.5px]" style={{ color: FAINT }}>배경 음악은 영상 전체에 1트랙으로 깔립니다.</p>
          </>
        )}
      </div>
    </div>
  );
}
