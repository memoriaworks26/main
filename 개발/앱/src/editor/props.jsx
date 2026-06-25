// 편집기 — 오른쪽 속성 패널(PropPanel) + 보조(PromptPicker·PromptModal·GenHistory).
// 선택(sel)에 따라 블록/전환/음악의 편집 컨트롤을 보여준다. 편집값은 상위(VideoEditor)의 edits로 컨트롤드.
import React, { useState, useRef } from "react";
import { Image as ImageIcon, Music, Upload, Plus, RefreshCw, Trash2, ArrowRightLeft, Check, Type, SlidersHorizontal, X, Film, Download, Loader2 } from "lucide-react";
import { SERIF, LINE, LINE2, GOLD, GOLD_D, GOLD_SOFT, INK, MUTE, FAINT, RADIUS } from "../theme.js";
import { DateField, Modal } from "../ui.jsx";
import { toast } from "../toast.jsx";
import * as D from "../data.js";
import { useStore, actions } from "../store.js";
import { BLOCK_ICON, KIND_LABEL, blockTrans, exampleLetter, SLIDE_PHOTOS, SLIDE_PER, TITLE_SYSTEM_TEXT } from "./blocks.js";

const PROMPT_TARGETS = ["이미지1", "이미지2", "AI영상"]; // API 호출별 프롬프트(타이틀 통합 X)

// ── 오른쪽: 편집 패널 ──────────────────────────────────────────
function L({ children }) { return <div className="mb-1.5 text-[12.5px] font-semibold" style={{ color: INK }}>{children}</div>; }
const inputCls = "w-full px-3 text-[13.5px] outline-none";
const inputStyle = { height: 38, background: "#fff", border: "1px solid " + LINE2, borderRadius: RADIUS, color: INK };
function Field({ label, children }) { return <div className="mb-4"><L>{label}</L>{children}</div>; }
// 파일 선택 버튼(숨김 input) — 소스 사진/영상 교체·추가용.
function FileButton({ accept, onFile, className, style, children }) {
  const ref = useRef(null);
  return (
    <>
      <input ref={ref} type="file" accept={accept} className="hidden" onChange={(e) => { const f = e.target.files && e.target.files[0]; if (f) onFile(f); e.target.value = ""; }} />
      <button type="button" onClick={() => ref.current && ref.current.click()} className={className} style={style}>{children}</button>
    </>
  );
}

// 서명URL 자동 다운로드 — 크로스오리진(Supabase 서명URL)은 download 속성이 무시돼 새 탭으로 열리므로,
//   fetch→blob→object URL로 받아 강제로 파일 저장(새 창 없이 바로 내려받음). 실패 시에만 직접 앵커 폴백.
async function dlAnchor(url, name) {
  const fname = name || (url.split("/").pop() || "download").split("?")[0];
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("fetch " + res.status);
    const obj = URL.createObjectURL(await res.blob());
    const a = document.createElement("a"); a.href = obj; a.download = fname;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(obj), 4000);
  } catch {
    const a = document.createElement("a"); a.href = url; a.download = fname; a.rel = "noopener";
    document.body.appendChild(a); a.click(); a.remove();
  }
}

// 소스/결과 카드 — 미리보기 + 생성(API) + 다운로드 + 교체 + 생성내역(버전 선택). 생성 중 로딩 표시.
function AssetCard({ label, hint, asset, kind = "image", generating, onGenerate, genLabel = "AI 생성", onAdd, addAccept = "image/*", history = [], onSelect, onDeleteVersion, promptSlot }) {
  const has = !!asset?.url;
  const btn = "flex items-center gap-1 px-2 py-1.5 text-[11.5px] font-semibold outline-none disabled:opacity-50";
  const sub = { border: "1px solid " + LINE2, borderRadius: 5, color: MUTE };
  const thumb = (v) => kind === "video"
    ? <video src={v.url} muted playsInline preload="metadata" className="h-full w-full object-cover" />
    : <img src={v.url} alt="" className="h-full w-full object-cover" />;
  return (
    <div className="mb-3 px-2.5 py-2.5" style={{ background: "#faf8f3", border: "1px solid " + LINE2, borderRadius: RADIUS }}>
      <div className="mb-1.5 flex items-center gap-1.5">
        <span className="text-[12px] font-bold" style={{ color: INK }}>{label}</span>
        {hint && <span className="text-[10.5px]" style={{ color: FAINT }}>{hint}</span>}
        {generating && <span className="ml-auto flex items-center gap-1 text-[10.5px] font-bold" style={{ color: GOLD_D }}><Loader2 className="h-3 w-3 animate-spin" /> 생성 중…</span>}
        {!generating && has && <span className="ml-auto text-[10.5px] font-bold" style={{ color: "#3a7468" }}>완료</span>}
      </div>
      <div className="relative w-full overflow-hidden" style={{ aspectRatio: "16/9", background: "#1c232c", borderRadius: 6 }}>
        {has ? (kind === "video"
          ? <video src={asset.url} controls playsInline preload="metadata" className="absolute inset-0 h-full w-full" />
          : <img src={asset.url} alt="" className="absolute inset-0 h-full w-full object-contain" />)
          : <div className="absolute inset-0 flex items-center justify-center text-[11px]" style={{ color: FAINT }}>{onGenerate ? "아직 없음 — 생성하세요" : "없음"}</div>}
        {generating && <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5" style={{ background: "rgba(20,24,30,.6)" }}><Loader2 className="h-6 w-6 animate-spin text-white" /><span className="text-[11px] font-semibold text-white">생성 중… 잠시만요</span></div>}
      </div>
      {promptSlot && <div className="mt-2">{promptSlot}</div>}
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {onGenerate && <button onClick={onGenerate} disabled={generating} className={btn + " text-white"} style={{ background: GOLD, borderRadius: 5 }}><RefreshCw className="h-3.5 w-3.5" /> {genLabel}</button>}
        {has && <button onClick={() => dlAnchor(asset.url, asset.name)} className={btn} style={sub}><Download className="h-3.5 w-3.5" /> 다운로드</button>}
        {onAdd && <FileButton accept={addAccept} onFile={onAdd} className={btn} style={sub}><Plus className="h-3.5 w-3.5" /> 추가</FileButton>}
      </div>
      {/* 내역 — 클릭해 적용(활성 표시) / X로 삭제. 덮어쓰기 없이 누적. */}
      {history.length > 0 && onSelect && (
        <div className="mt-2">
          <div className="mb-1 text-[10.5px] font-semibold" style={{ color: FAINT }}>내역 ({history.length}) · 눌러서 적용</div>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {history.map((v) => (
              <div key={v.id} className="relative shrink-0" style={{ width: 56 }}>
                <button onClick={() => onSelect(v.id)} title={v.selected ? "현재 적용본" : "이 버전 적용"}
                  className="relative block w-full overflow-hidden outline-none" style={{ aspectRatio: "16/9", borderRadius: 4, border: "2px solid " + (v.selected ? GOLD : LINE2) }}>
                  {thumb(v)}
                  {v.selected && <span className="absolute left-0.5 bottom-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full" style={{ background: GOLD }}><Check className="h-2.5 w-2.5 text-white" strokeWidth={3} /></span>}
                </button>
                {onDeleteVersion && history.length > 1 && (
                  <button onClick={() => onDeleteVersion(v.id)} title="이 버전 삭제" className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full outline-none" style={{ background: "rgba(0,0,0,.55)", color: "#fff" }}><X className="h-2.5 w-2.5" strokeWidth={2.5} /></button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
// 소리 크기 슬라이더(0~100%) — 클립·추억영상 공용
function SoundField({ label, value, onChange }) {
  const v = value != null ? value : 100;
  return <Field label={`${label} (${v}%)`}><input type="range" min="0" max="100" value={v} onChange={(e) => onChange(+e.target.value)} className="w-full" style={{ accentColor: GOLD }} /></Field>;
}

// 프롬프트 카드(실데이터) — 이름·내용 편집 + 활성 지정 + 삭제. 생성 시 활성 프롬프트가 쓰임.
function PromptCard({ p }) {
  const [name, setName] = useState(p.name);
  const [body, setBody] = useState(p.body || "");
  const dirty = name !== p.name || body !== (p.body || "");
  return (
    <div className="px-3 py-2.5" style={{ background: "#f6f3ec", border: "1px solid " + (p.active ? GOLD : LINE), borderRadius: RADIUS }}>
      <div className="flex items-center gap-2">
        <span className="px-1.5 py-[1px] text-[10.5px] font-bold" style={{ background: "#e9eef5", color: "#3f5e87", borderRadius: 3 }}>{p.target}</span>
        <input value={name} onChange={(e) => setName(e.target.value)} className="min-w-0 flex-1 px-2 py-1 text-[12.5px] font-semibold outline-none" style={{ background: "#fff", border: "1px solid " + LINE2, borderRadius: 4, color: INK }} />
        <button onClick={() => actions.removePrompt(p.id)} title="삭제" className="p-1" style={{ color: "#a23b3b" }}><Trash2 className="h-3.5 w-3.5" /></button>
      </div>
      <textarea rows={2} value={body} onChange={(e) => setBody(e.target.value)} placeholder="생성 프롬프트(영문 권장)" className="mt-2 w-full resize-none p-2 text-[11.5px] leading-relaxed outline-none" style={{ background: "#fff", border: "1px solid " + LINE2, borderRadius: 4, color: MUTE }} />
      {/* 참고 이미지 — 텍스트와 함께 생성에 전송(이미지1 등 Seedream 멀티이미지). */}
      <div className="mt-2 flex items-center gap-2">
        {p.refImageUrl
          ? <img src={p.refImageUrl} alt="" style={{ width: 48, aspectRatio: "1", objectFit: "cover", borderRadius: 4, border: "1px solid " + LINE2 }} />
          : <span className="flex shrink-0 items-center justify-center" style={{ width: 48, height: 48, background: "#fff", border: "1px dashed " + LINE2, borderRadius: 4 }}><ImageIcon className="h-4 w-4" style={{ color: FAINT }} /></span>}
        <FileButton accept="image/*" onFile={(f) => actions.uploadPromptRef(p.id, f)} className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold" style={{ border: "1px solid " + LINE2, borderRadius: 5, color: GOLD_D }}><Upload className="h-3.5 w-3.5" /> 참고 사진</FileButton>
        {p.refImage && <button onClick={() => actions.clearPromptRef(p.id)} className="text-[11px]" style={{ color: "#a23b3b" }}>제거</button>}
        <span className="text-[10px]" style={{ color: FAINT }}>사진+문구 함께 전송</span>
      </div>
      {dirty && <button onClick={() => actions.savePrompt({ id: p.id, target: p.target, name, body })} className="mt-1.5 flex items-center gap-1 text-[11.5px] font-bold" style={{ color: GOLD }}><Check className="h-3.5 w-3.5" /> 저장</button>}
    </div>
  );
}

// AI 문구(프롬프트) 관리 모달 — 실데이터 CRUD.
function PromptModal({ open, onClose }) {
  const store = useStore();
  const [addTarget, setAddTarget] = useState("이미지1");
  return (
    <Modal open={open} onClose={onClose} width={480}>
      <div className="flex items-center justify-between px-4" style={{ height: 48, borderBottom: "1px solid " + LINE }}>
        <span className="text-[14px] font-bold" style={{ color: INK }}>프롬프트 관리</span>
        <div className="flex items-center gap-1.5">
          <select value={addTarget} onChange={(e) => setAddTarget(e.target.value)} className="px-2 py-1 text-[11.5px] outline-none" style={{ background: "#fff", border: "1px solid " + LINE2, borderRadius: 4, color: INK }}>{PROMPT_TARGETS.map((t) => <option key={t}>{t}</option>)}</select>
          <button onClick={() => actions.savePrompt({ target: addTarget, name: "새 프롬프트", body: "" })} className="flex items-center gap-1 text-[12px] font-semibold" style={{ color: GOLD }}><Plus className="h-3.5 w-3.5" /> 추가</button>
        </div>
      </div>
      <div className="max-h-[58vh] space-y-2 overflow-y-auto px-4 py-3">
        {store.prompts.length === 0 && <div className="py-6 text-center text-[12px]" style={{ color: FAINT }}>프롬프트가 없습니다 — 위 「추가」로 만드세요.</div>}
        {store.prompts.map((p) => <PromptCard key={p.id} p={p} />)}
        <p className="mt-1 text-[11.5px] leading-relaxed" style={{ color: FAINT }}>※ 여기선 프롬프트 추가·수정·삭제만. 실제 사용할 프롬프트는 각 블록(이미지1·이미지2·AI영상)의 드롭다운에서 선택합니다.</p>
      </div>
      <div className="px-4 py-2.5" style={{ borderTop: "1px solid " + LINE }}>
        <button onClick={onClose} className="w-full py-2 text-[13px] font-bold" style={{ background: GOLD, color: "#fff", borderRadius: RADIUS }}>닫기</button>
      </div>
    </Modal>
  );
}

// 프롬프트 드롭다운(실데이터) + 「관리」. 선택 = 활성 지정(생성에 사용).
function PromptPicker({ target, onManage }) {
  const store = useStore();
  const list = store.prompts.filter((p) => p.target === target);
  const active = list.find((p) => p.active) || list[0];
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[12.5px] font-semibold" style={{ color: INK }}>프롬프트</span>
        <button onClick={onManage} className="flex items-center gap-1 text-[11.5px] font-semibold outline-none" style={{ color: GOLD_D }}><SlidersHorizontal className="h-3.5 w-3.5" /> 관리</button>
      </div>
      <select className={inputCls} style={inputStyle} value={active?.id || ""} onChange={(e) => actions.setPromptActive(e.target.value, target)}>
        {list.length === 0 && <option value="">프롬프트 없음 — 「관리」에서 추가</option>}
        {list.map((p) => <option key={p.id} value={p.id}>{p.name}{p.active ? " ✓" : ""}</option>)}
      </select>
      {active?.body && <div className="mt-1.5 text-[11px] leading-relaxed" style={{ color: FAINT }}>{active.body}</div>}
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

export function PropPanel({ blocks, subtitles = [], edits, onEdit, onRemoveSub, reservation, bgmName, media, onGenerate, sel }) {
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
  // 소스/결과 모두 버전 히스토리(슬롯당 다중) + 활성본 + 생성중 상태.
  const _subId = media?.submissionId;
  const _genActive = ["queued", "rendering"].includes(media?.status);
  const _genTarget = media?.regenTarget;
  const isGen = (t) => _genActive && (!_genTarget || _genTarget === t || (_genTarget === "title" && t.startsWith("title")));
  const _newest = (p, q) => String(q.createdAt || "").localeCompare(String(p.createdAt || "")); // 최신 우선
  const slotVers = (role, sort) => _assets.filter((a) => a.role === role && (a.sortOrder ?? 0) === sort && a.url).sort(_newest);
  const selOf = (list) => list.find((a) => a.selected) || list[0] || null;
  // 타이틀 소스 슬롯(독사진) — 버전 히스토리
  const _titleSrcSlot = (_assets.find((a) => a.role === "title")?.sortOrder) ?? 0;
  const _titleSrcVers = slotVers("title", _titleSrcSlot);
  const _titlePhoto = selOf(_titleSrcVers);
  // AI 소스 — 슬롯별 활성본(블록 i = i번째)
  const _aiSrcSel = _assets.filter((a) => a.role === "ai_video" && a.url && a.selected).sort((p, q) => (p.sortOrder ?? 0) - (q.sortOrder ?? 0));
  const srcAsset = k === "title" ? _titlePhoto : k === "ai" ? _aiSrcSel[(item.aiIndex || 1) - 1] : null; // 블록 소스 사진(활성)
  const _titleVidVers = slotVers("title_video", 0), _titleVideo = selOf(_titleVidVers);
  const _img1Vers = slotVers("title_result", 0), _img1 = selOf(_img1Vers);
  const _img2Vers = slotVers("title_result", 1), _img2 = selOf(_img2Vers);
  const _slideResult = _assets.find((a) => a.role === "slide_video" && a.url);
  const genResults = (k === "slide" && _slideResult) ? [{ kind: "video", url: _slideResult.url, label: "슬라이드 영상" }] : [];
  const name = reservation?.deceased || D.EDITOR_RESERVATION.deceased;
  // 편집값(컨트롤드) — 전환은 "trans-"+id, 음악은 "audio" 키로 보관
  const transKey = "trans-" + sel.id;
  const effect = (edits[transKey] && edits[transKey].effect) || blockTrans(sel.id);
  const _store = useStore();                    // BGM 설정(파트너 템플릿)
  const _pid = reservation?.partnerId;
  const _tb = (_pid && _store.templates?.[_pid]) || {};
  const bgmVol = _tb.bgmVol ?? 70, bgmFadeIn = _tb.bgmFadeIn ?? 1, bgmFadeOut = _tb.bgmFadeOut ?? 2;
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
        {/* 클립 소스 파일(콘텐츠 허브) — 타이틀·AI영상의 독사진은 각 섹션에서 카드로 매니징 */}
        {k === "clip" && (() => {
          const fileName = srcAsset?.name || (item.file || item.source || "").split("/").pop() || "파일 없음";
          return (
            <Field label="지금 들어간 파일">
              <div className="px-3 py-2.5 text-[12.5px]" style={{ background: "#f6f3ec", border: "1px solid " + LINE, borderRadius: RADIUS, color: INK, wordBreak: "break-all" }}>{fileName}</div>
            </Field>
          );
        })()}

        {k === "title" && (() => {
          const prefix = item.prefix ?? TITLE_SYSTEM_TEXT;
          const petName = item.text ?? name;
          const resId = reservation?.id, tok = media?.token, canEdit = !!(resId && tok);
          const gen = (t) => canEdit ? actions.regenBlock(resId, t) : toast("실제 예약에서만 생성됩니다");
          const addV = (role, sort, kind) => (f) => canEdit ? actions.addAsset(resId, _subId, tok, f, role, sort, kind) : toast("실제 예약에서만 추가할 수 있습니다");
          const selV = (role, sort) => (vid) => canEdit ? actions.selectAsset(resId, _subId, vid, role, sort) : null;
          const delV = (vid) => canEdit ? actions.deleteAsset(resId, vid) : null;
          const hist = (vers) => vers.map((v) => ({ id: v.id, url: v.url, selected: v.selected }));
          return (
          <>
            <div className="grid grid-cols-2 gap-2">
              <Field label="시스템 문구"><input className={inputCls} style={{ ...inputStyle, fontFamily: SERIF }} value={prefix} onChange={(e) => onEdit(item.id, { prefix: e.target.value })} /></Field>
              <Field label="반려동물 이름"><input className={inputCls} style={{ ...inputStyle, fontFamily: SERIF }} value={petName} onChange={(e) => onEdit(item.id, { text: e.target.value })} /></Field>
            </div>
            <AssetCard label="보호자 독사진" hint="원본 소스 · 추가/선택" asset={_titlePhoto} kind="image" onAdd={addV("title", _titleSrcSlot, "image")}
              history={hist(_titleSrcVers)} onSelect={selV("title", _titleSrcSlot)} onDeleteVersion={delV} />
            <AssetCard label="① 이미지1" hint="독사진 → 영정·배경" asset={_img1} kind="image" generating={isGen("title:0")} onGenerate={() => gen("title:0")} genLabel={_img1 ? "재생성" : "AI 생성"} onAdd={addV("title_result", 0, "image")}
              promptSlot={<PromptPicker target="이미지1" onManage={() => setPromptModal(true)} />}
              history={hist(_img1Vers)} onSelect={selV("title_result", 0)} onDeleteVersion={delV} />
            <AssetCard label="② 이미지2" hint="이미지1 → 화풍·배경 변경" asset={_img2} kind="image" generating={isGen("title:1")} onGenerate={() => gen("title:1")} genLabel={_img2 ? "재생성" : "AI 생성"} onAdd={addV("title_result", 1, "image")}
              promptSlot={<PromptPicker target="이미지2" onManage={() => setPromptModal(true)} />}
              history={hist(_img2Vers)} onSelect={selV("title_result", 1)} onDeleteVersion={delV} />
            <AssetCard label="③ 영상화" hint="이미지1+2 → 완성 클립 20초" asset={_titleVideo} kind="video" generating={isGen("title:video")} onGenerate={() => gen("title:video")} genLabel={_titleVideo ? "다시 만들기" : "영상 만들기"} onAdd={addV("title_video", 0, "video")} addAccept="video/*"
              history={hist(_titleVidVers)} onSelect={selV("title_video", 0)} onDeleteVersion={delV} />
            <div className="mb-2 px-3 py-2.5 text-[11px] leading-relaxed" style={{ background: "#f6f3ec", border: "1px solid " + LINE, borderRadius: RADIUS, color: MUTE }}>
              ① 이미지1+자막이 서서히 나타나고 <b style={{ color: INK }}>10초</b>에 ② 이미지2가 오버랩 → 페이드아웃(총 20초). 이미지를 바꾸면 <b style={{ color: INK }}>③ 영상화</b>를 다시 눌러 반영하세요.
            </div>
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
              {reservation?.id && media?.token && media?.submissionId ? (
                <FileButton accept="image/*" onFile={(f) => actions.addSlidePhoto(reservation.id, media.submissionId, media.token, f)}
                  className="mt-2 flex w-full items-center justify-center gap-1.5 py-2 text-[12.5px] font-semibold" style={{ border: "1px dashed " + LINE2, borderRadius: RADIUS, color: GOLD_D }}>
                  <Plus className="h-3.5 w-3.5" /> 슬라이드 사진 추가
                </FileButton>
              ) : (
                <button onClick={() => toast("실제 예약에서만 추가할 수 있습니다")} className="mt-2 flex w-full items-center justify-center gap-1.5 py-2 text-[12.5px] font-semibold" style={{ border: "1px dashed " + LINE2, borderRadius: RADIUS, color: GOLD_D }}><Plus className="h-3.5 w-3.5" /> 슬라이드 사진 추가</button>
              )}
            </Field>
            <button onClick={() => onGenerate(item.id)} className="flex w-full items-center justify-center gap-1.5 py-2.5 text-[13px] font-bold text-white" style={{ background: GOLD, borderRadius: RADIUS }}><RefreshCw className="h-4 w-4" /> 사진으로 만들기</button>
            <GenHistory results={genResults} />

            {/* 배경 음악 — 추억 슬라이드(보호자 사진)에만 깔린다. 추억 영상(유저 영상)은 원본 사운드 유지. */}
            <div className="mt-5 border-t pt-4" style={{ borderColor: LINE }}>
              <div className="mb-2 flex items-center gap-1.5 text-[12.5px] font-bold" style={{ color: INK }}><Music className="h-4 w-4" style={{ color: GOLD_D }} /> 배경 음악 <span className="font-normal" style={{ color: FAINT }}>· 추억 슬라이드(사진)에만</span></div>
              <p className="mb-2 text-[11px] leading-relaxed" style={{ color: FAINT }}>※ 추억 영상(보호자 영상)에는 BGM이 들어가지 않고 원본 사운드가 유지됩니다.</p>
              <Field label="지금 음악">
                <div className="px-3 py-2.5 text-[12.5px]" style={{ background: "#f6f3ec", border: "1px solid " + LINE, borderRadius: RADIUS, color: INK }}>{bgmName}</div>
                {reservation?.partnerId ? (
                  <FileButton accept="audio/*" onFile={(f) => actions.uploadBgm(reservation.partnerId, f)}
                    className="mt-2 flex w-full items-center justify-center gap-1.5 py-2.5 text-[13px] font-bold text-white" style={{ background: GOLD, borderRadius: RADIUS }}>
                    <Upload className="h-4 w-4" /> 음악 파일 업로드
                  </FileButton>
                ) : (
                  <button onClick={() => toast("실제 예약에서만 업로드할 수 있습니다")} className="mt-2 flex w-full items-center justify-center gap-1.5 py-2.5 text-[13px] font-bold text-white" style={{ background: GOLD, borderRadius: RADIUS }}><Upload className="h-4 w-4" /> 음악 파일 업로드</button>
                )}
              </Field>
              <SoundField label="소리 크기" value={bgmVol} onChange={(val) => actions.setTemplateBgm(_pid, { volume: val })} />
              <div className="grid grid-cols-2 gap-2">
                <Field label="서서히 커지기 (초)"><input type="number" min="0" step="0.5" className={inputCls} style={inputStyle} value={bgmFadeIn} onChange={(e) => actions.setTemplateBgm(_pid, { fadeIn: +e.target.value })} /></Field>
                <Field label="서서히 작아지기 (초)"><input type="number" min="0" step="0.5" className={inputCls} style={inputStyle} value={bgmFadeOut} onChange={(e) => actions.setTemplateBgm(_pid, { fadeOut: +e.target.value })} /></Field>
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

        {k === "ai" && (() => {
          const resId = reservation?.id, tok = media?.token, canEdit = !!(resId && tok);
          const i = (item.aiIndex || 1) - 1;
          const aiResVers = slotVers("ai_video_result", i);
          const resA = selOf(aiResVers);
          const srcSlot = srcAsset?.sortOrder ?? i;
          const aiSrcVers = slotVers("ai_video", srcSlot);
          const gen = () => canEdit ? actions.regenBlock(resId, "ai:" + i) : toast("실제 예약에서만 생성됩니다");
          const addV = (role, sort, kind) => (f) => canEdit ? actions.addAsset(resId, _subId, tok, f, role, sort, kind) : toast("실제 예약에서만 추가할 수 있습니다");
          const selV = (role, sort) => (vid) => canEdit ? actions.selectAsset(resId, _subId, vid, role, sort) : null;
          const delV = (vid) => canEdit ? actions.deleteAsset(resId, vid) : null;
          const hist = (vers) => vers.map((v) => ({ id: v.id, url: v.url, selected: v.selected }));
          return (
          <>
            <AssetCard label="보호자 독사진" hint="원본 소스 · 추가/선택" asset={srcAsset} kind="image" onAdd={addV("ai_video", srcSlot, "image")}
              history={hist(aiSrcVers)} onSelect={selV("ai_video", srcSlot)} onDeleteVersion={delV} />
            <AssetCard label="AI 영상 (Kling)" hint="독사진 → 영상(약 5초)" asset={resA} kind="video" generating={isGen("ai:" + i)} onGenerate={gen} genLabel={resA ? "재생성" : "AI 생성"} onAdd={addV("ai_video_result", i, "video")} addAccept="video/*"
              promptSlot={<PromptPicker target="AI영상" onManage={() => setPromptModal(true)} />}
              history={hist(aiResVers)} onSelect={selV("ai_video_result", i)} onDeleteVersion={delV} />
            <div className="mt-1 px-3 py-2.5 text-[11.5px] leading-relaxed" style={{ background: "#f6f3ec", border: "1px solid " + LINE, borderRadius: RADIUS, color: MUTE }}>
              추억 슬라이드 앞(A) · 추억 영상 뒤(B)로 유저 소스를 감쌉니다.
            </div>
            <div className="mt-3"><SoundField label="AI 영상 소리 크기" value={item.volume} onChange={(val) => onEdit(item.id, { volume: val })} /></div>
          </>
          );
        })()}

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
