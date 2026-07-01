// 편집기 — 오른쪽 속성 패널(PropPanel) + 보조(AssetCard·PromptPicker·PromptModal).
// 선택(sel)에 따라 블록/전환/음악의 편집 컨트롤을 보여준다. 편집값은 상위(VideoEditor)의 edits로 컨트롤드.
import React, { useState, useRef, useEffect } from "react";
import { Image as ImageIcon, Music, Upload, Plus, RefreshCw, Trash2, ArrowRightLeft, ArrowUp, ArrowDown, Check, Type, SlidersHorizontal, X, Film, Download, Loader2, Play } from "lucide-react";
import { SERIF, LINE, LINE2, GOLD, GOLD_D, GOLD_SOFT, INK, MUTE, FAINT, RADIUS } from "../theme.js";
import { DateField, Modal } from "../ui.jsx";
import { toast } from "../toast.jsx";
import { confirm } from "../confirm.jsx";
import * as D from "../data.js";
import * as storage from "../lib/storage.js";
import { useStore, actions } from "../store.js";
import { BLOCK_ICON, KIND_LABEL, blockTrans, exampleLetter, SLIDE_PHOTOS, SLIDE_PER, TITLE_SYSTEM_TEXT } from "./blocks.js";

const PROMPT_TARGETS = ["이미지1", "이미지2", "AI영상 A", "AI영상 B"]; // API 호출별 프롬프트. AI영상은 A(앞)·B(뒤) 분리

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
                  <button onClick={async () => { if (await confirm({ message: "이 내역을 삭제할까요? 되돌릴 수 없습니다.", danger: true })) onDeleteVersion(v.id); }} title="이 버전 삭제" className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full outline-none" style={{ background: "rgba(0,0,0,.55)", color: "#fff" }}><X className="h-2.5 w-2.5" strokeWidth={2.5} /></button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
// 작은 아이콘 버튼 — 추억 슬라이드 사진 순서변경(↑↓)·삭제 전용.
function IcoBtn({ icon, onClick, disabled, title, danger }) {
  const Ico = icon;
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={title} aria-label={title}
      className="flex h-6 w-6 shrink-0 items-center justify-center outline-none transition disabled:opacity-30 focus-visible:ring-1"
      style={{ background: "#fff", border: "1px solid " + LINE2, borderRadius: 5, color: danger ? "#a23b3b" : MUTE }}>
      <Ico className="h-3.5 w-3.5" strokeWidth={2} />
    </button>
  );
}

// 이 영상 배경 음악 — 공용 라이브러리에서 골라 submissions.bgm_id로 지정(합성이 템플릿보다 우선) + 미리듣기.
//   보호자가 위저드에서 고른 곡이 기본으로 표시되고, 스태프가 이 영상만 다른 곡으로 바꿀 수 있다.
function SlideBgmPicker({ reservation, submissionId, media, bgmLib, tplBgmId, canEdit }) {
  const curId = media?.bgmId ?? "";                     // "" = 템플릿 기본
  const cur = bgmLib.find((b) => b.id === curId) || null;
  const tpl = bgmLib.find((b) => b.id === tplBgmId) || null;
  const [url, setUrl] = useState(null);                 // 미리듣기 서명URL(선택 곡)
  const [loading, setLoading] = useState(false);
  const audioRef = useRef(null);
  const pick = (id) => canEdit ? actions.setSubmissionBgm(reservation.id, submissionId, id) : toast("실제 예약에서만 변경할 수 있습니다");
  // 선택 곡이 바뀌면 미리듣기 초기화(재생 중지 + URL 폐기)
  useEffect(() => { setUrl(null); if (audioRef.current) audioRef.current.pause(); }, [curId]);
  const preview = async () => {
    const b = cur || tpl;
    if (!b?.storagePath) { toast("미리들을 음원이 없습니다"); return; }
    setLoading(true);
    try {
      const u = await storage.signedUrl(storage.BUCKETS.content, b.storagePath, 600);
      setUrl(u);
      setTimeout(() => audioRef.current?.play().catch(() => {}), 0); // src 반영 후 재생
    } catch { toast("미리듣기 URL 발급에 실패했습니다"); }
    finally { setLoading(false); }
  };
  return (
    <Field label="이 영상 배경 음악">
      <select className={inputCls} style={inputStyle} value={curId} onChange={(e) => pick(e.target.value)}>
        <option value="">템플릿 기본{tpl ? ` · ${tpl.name}` : " · 없음"}</option>
        {bgmLib.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
      </select>
      <div className="mt-1.5 flex items-center gap-2">
        <button type="button" onClick={preview} disabled={loading} className="flex items-center gap-1 px-2.5 py-1.5 text-[12px] font-semibold outline-none disabled:opacity-50" style={{ border: "1px solid " + LINE2, borderRadius: RADIUS, color: GOLD_D }}>
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />} 미리듣기
        </button>
        <span className="min-w-0 flex-1 truncate text-[11px]" style={{ color: FAINT }}>{cur ? "이 영상 전용 · " + cur.name : (tpl ? "템플릿 기본곡 사용" : "지정된 곡 없음")}</span>
      </div>
      {url && <audio ref={audioRef} src={url} controls className="mt-2 w-full" style={{ height: 34 }} />}
      {bgmLib.length === 0 && <p className="mt-1.5 text-[11px] leading-relaxed" style={{ color: FAINT }}>공용 음악 라이브러리가 비어 있습니다 — 콘텐츠 허브 「음악」이나 아래 업로드로 추가하세요.</p>}
    </Field>
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

// 기본 프롬프트 관리 모달 — 타깃별(이미지1·이미지2·AI영상) 「기본」 선택(=활성 지정) + CRUD.
//   「기본」으로 고른 프롬프트가 보호자 요청 시 자동 생성(1차 API 호출)에 사용됨. 편집기·편집컨펌 페이지 공용(export).
export function PromptModal({ open, onClose }) {
  const store = useStore();
  const [tab, setTab] = useState(PROMPT_TARGETS[0]); // 상단 탭 — 타깃(이미지1·이미지2·AI영상)별 분리
  useEffect(() => { if (open) actions.reloadPrompts(); }, [open]); // 편집기 밖(편집컨펌)에서 열어도 최신 목록 보장
  const list = store.prompts.filter((p) => p.target === tab);
  const active = list.find((p) => p.active) || list[0];
  return (
    <Modal open={open} onClose={onClose} width={500}>
      <div className="flex items-center justify-between px-4" style={{ height: 48, borderBottom: "1px solid " + LINE }}>
        <span className="text-[14px] font-bold" style={{ color: INK }}>기본 프롬프트 관리</span>
        <button onClick={onClose} className="p-1" style={{ color: FAINT }}><X className="h-4 w-4" /></button>
      </div>
      {/* 상단 탭 — 타깃별로 구분(이미지1·이미지2·AI영상) */}
      <div className="flex items-center gap-1.5 px-4 pt-3" style={{ borderBottom: "1px solid " + LINE, paddingBottom: 12 }}>
        {PROMPT_TARGETS.map((t) => {
          const on = tab === t;
          return (
            <button key={t} onClick={() => setTab(t)} className="px-3.5 py-2 text-[12.5px] font-bold outline-none transition focus-visible:ring-1"
              style={{ borderRadius: RADIUS, background: on ? GOLD_SOFT : "transparent", color: on ? GOLD_D : MUTE, border: "1px solid " + (on ? GOLD : LINE) }}>
              {t}
            </button>
          );
        })}
      </div>
      <div className="max-h-[60vh] overflow-y-auto px-4 py-3">
        <div className="mb-2 flex items-center gap-2">
          <span className="shrink-0 text-[11.5px] font-semibold" style={{ color: MUTE }}>기본</span>
          <select value={active?.id || ""} onChange={(e) => actions.setPromptActive(e.target.value, tab)} className="min-w-0 flex-1 px-2 py-1 text-[11.5px] outline-none" style={{ background: "#fff", border: "1px solid " + LINE2, borderRadius: 4, color: INK }}>
            {list.length === 0 && <option value="">없음 — 「추가」로 생성</option>}
            {list.map((p) => <option key={p.id} value={p.id}>{p.name}{p.active ? " ✓(기본)" : ""}</option>)}
          </select>
          <button onClick={() => actions.savePrompt({ target: tab, name: "새 프롬프트", body: "" })} className="flex shrink-0 items-center gap-1 text-[12px] font-semibold" style={{ color: GOLD }}><Plus className="h-3.5 w-3.5" /> 추가</button>
        </div>
        {list.length > 0 && <div className="space-y-2">{list.map((p) => <PromptCard key={p.id} p={p} />)}</div>}
        <p className="mt-4 text-[11.5px] leading-relaxed" style={{ color: FAINT }}>※ 「기본」으로 고른 프롬프트가 보호자 요청 시 자동 생성(1차 API)에 사용됩니다. 편집기에서는 건별로 다른 프롬프트를 골라 재생성할 수 있습니다.</p>
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

export function PropPanel({ blocks, subtitles = [], edits, onEdit, onRemoveSub, reservation, partnerId, media, onGenerate, sel }) {
  const [promptModal, setPromptModal] = useState(false); // AI 문구 관리 모달
  const _store = useStore();                    // BGM 설정(파트너 템플릿) — 훅은 early-return 위에서 무조건 호출(hooks 규칙)
  let item;
  if (sel.scope === "block") item = blocks.find((b) => b.id === sel.id);
  else if (sel.scope === "trans") item = { effect: blockTrans(sel.id) };
  else if (sel.scope === "subtitle") item = subtitles.find((s) => s.id === sel.id);
  const k = sel.kind;
  if (!item) return null;
  // 실제 보호자 자산(서명URL) — 없으면(미로드·dev) 목업 폴백.
  const _assets = media?.assets || [];
  const _bySort = (p, q) => (p.sortOrder ?? 0) - (q.sortOrder ?? 0);
  const _slidePhotos = _assets.filter((a) => a.role === "slide_photo" && a.url).sort(_bySort);
  // 추억영상은 sortOrder 순 — 워커(emitMemVideos는 sort_order 순)와 인덱스를 맞춰 영상별 음량이 같은 영상에 적용되게.
  const _memoryVideos = _assets.filter((a) => a.role === "memory_video" && a.url).sort(_bySort);
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
  // 슬라이드 영상 — 버전 내역(최신 우선) + 활성본. 자동생성(유저 요청)/「사진으로 만들기」가 버전 누적(deselect+삽입).
  const _slideVers = slotVers("slide_video", 0);
  const _slideResult = selOf(_slideVers);
  const name = reservation?.deceased || D.EDITOR_RESERVATION.deceased;
  // 편집값(컨트롤드) — 전환은 "trans-"+id, 음악은 "audio" 키로 보관
  const transKey = "trans-" + sel.id;
  const effect = (edits[transKey] && edits[transKey].effect) || blockTrans(sel.id);
  const _pid = partnerId || reservation?.partnerId; // 파트너 스코프 통일(VideoEditor가 이름매칭으로 해결한 id 우선)
  const _tb = (_pid && _store.templates?.[_pid]) || {};
  const bgmVol = _tb.bgmVol ?? 70, bgmFadeIn = _tb.bgmFadeIn ?? 1, bgmFadeOut = _tb.bgmFadeOut ?? 2;
  // 추억 슬라이드 — 실제 보호자 사진(없으면 목업 폴백) + 사진 사이 전환(기본 페이드).
  const _slideMock = !_slidePhotos.length;  // 실제 업로드 사진 없음/로딩 전 → 샘플(렌더엔 안 들어감)
  const _vidMock = !_memoryVideos.length;   // 실제 보호자 영상 없음/로딩 전 → 샘플
  // 실제 사진이면 자산객체(id 보유·순서변경·삭제 가능), 없으면 샘플 URL만.
  const slideItems = _slidePhotos.length ? _slidePhotos : SLIDE_PHOTOS.map((url) => ({ url }));
  const slideSrcs = slideItems.map((it) => it.url);
  const slideTrans = item.slideTrans || slideSrcs.slice(1).map(() => "페이드");
  const setSlideTrans = (i, v) => { const n = slideTrans.slice(); n[i] = v; onEdit(item.id, { slideTrans: n }); };
  // 사진 순서변경·삭제 — 실제 예약(제출물+토큰)에서만. sort_order를 즉시 DB에 반영(내역/버전과 무관한 단일 슬롯).
  const canEditSlide = !!(reservation?.id && media?.submissionId && media?.token);
  const moveSlide = (assetId, dir) => actions.moveSlidePhoto(reservation.id, media.submissionId, assetId, dir);
  const removeSlide = async (assetId) => {
    if (_slidePhotos.length <= 1) { toast("최소 한 장은 남겨 주세요"); return; }
    if (await confirm({ title: "사진 삭제", message: "이 사진을 추억 슬라이드에서 삭제합니다.", danger: true })) actions.deleteAsset(reservation.id, assetId);
  };
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
            <AssetCard label="① 영정 이미지" hint="독사진 → 영정·배경" asset={_img1} kind="image" generating={isGen("title:0")} onGenerate={() => gen("title:0")} genLabel={_img1 ? "재생성" : "AI 생성"} onAdd={addV("title_result", 0, "image")}
              promptSlot={<PromptPicker target="이미지1" onManage={() => setPromptModal(true)} />}
              history={hist(_img1Vers)} onSelect={selV("title_result", 0)} onDeleteVersion={delV} />
            <AssetCard label="② 화풍변경" hint="영정 → 화풍·배경 변경(오버랩용)" asset={_img2} kind="image" generating={isGen("title:1")} onGenerate={() => gen("title:1")} genLabel={_img2 ? "재생성" : "AI 생성"} onAdd={addV("title_result", 1, "image")}
              promptSlot={<PromptPicker target="이미지2" onManage={() => setPromptModal(true)} />}
              history={hist(_img2Vers)} onSelect={selV("title_result", 1)} onDeleteVersion={delV} />
            <AssetCard label="③ 영상화" hint="영정+화풍변경 → 완성 클립 20초" asset={_titleVideo} kind="video" generating={isGen("title:video")} onGenerate={() => gen("title:video")} genLabel={_titleVideo ? "다시 만들기" : "영상 만들기"} onAdd={addV("title_video", 0, "video")} addAccept="video/*"
              history={hist(_titleVidVers)} onSelect={selV("title_video", 0)} onDeleteVersion={delV} />
            <div className="mb-2 px-3 py-2.5 text-[11px] leading-relaxed" style={{ background: "#f6f3ec", border: "1px solid " + LINE, borderRadius: RADIUS, color: MUTE }}>
              ① 영정+자막이 서서히 나타나고 <b style={{ color: INK }}>10초</b>에 ② 화풍변경이 오버랩 → 페이드아웃(총 20초). 이미지를 바꾸면 <b style={{ color: INK }}>③ 영상화</b>를 다시 눌러 반영하세요.
            </div>
          </>
          );
        })()}

        {/* 클립: 보이는 시간 대신 소리 크기 조절 (슬라이드·추억영상은 보이는 시간 없음 · 타이틀만 유지) */}
        {k === "clip" && <SoundField label="클립 소리 크기" value={item.volume} onChange={(val) => onEdit(item.id, { volume: val })} />}
        {k === "slide" && (
          <>
            {_slideMock && <div className="mb-2 px-3 py-2 text-[11px] leading-relaxed" style={{ background: "#fbf3e6", border: "1px solid #ecd9b0", borderRadius: RADIUS, color: "#8a6d3b" }}>샘플 미리보기입니다 — 실제 업로드 사진이 아직 없거나 불러오는 중이라, 아래 사진은 최종 렌더에 들어가지 않습니다.</div>}
            <Field label={`사진 조합 · 사이 전환 (${slideSrcs.length}장 · 장당 7~10초 · 총 2분30초 이내)`}>
              <div className="max-h-[260px] overflow-y-auto px-2.5 py-2.5" style={{ background: "#f6f3ec", border: "1px solid " + LINE, borderRadius: RADIUS }}>
                {slideItems.map((it, i) => (
                  <React.Fragment key={it.id || i}>
                    {/* 사진 — 실제 사진이면 ↑↓로 순서변경·휴지통으로 삭제 */}
                    <div className="flex items-center gap-2.5">
                      <img src={it.url} alt="" className="shrink-0" style={{ width: 64, aspectRatio: "16/9", objectFit: "cover", borderRadius: 4, border: "1px solid " + LINE2 }} />
                      <span className="text-[12px] font-semibold" style={{ color: INK }}>사진 {i + 1}</span>
                      {canEditSlide && !_slideMock ? (
                        <div className="ml-auto flex items-center gap-1">
                          <span className="mr-0.5 text-[10.5px]" style={{ color: FAINT }}>{SLIDE_PER}초</span>
                          <IcoBtn icon={ArrowUp} title="위로" disabled={i === 0} onClick={() => moveSlide(it.id, -1)} />
                          <IcoBtn icon={ArrowDown} title="아래로" disabled={i === slideItems.length - 1} onClick={() => moveSlide(it.id, 1)} />
                          <IcoBtn icon={Trash2} title="사진 삭제" danger onClick={() => removeSlide(it.id)} />
                        </div>
                      ) : (
                        <span className="ml-auto text-[10.5px]" style={{ color: FAINT }}>{SLIDE_PER}초</span>
                      )}
                    </div>
                    {/* 사진 사이 전환 */}
                    {i < slideItems.length - 1 && (
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
            <button onClick={() => onGenerate(item.id)} disabled={isGen("slides")} className="flex w-full items-center justify-center gap-1.5 py-2.5 text-[13px] font-bold text-white disabled:opacity-60" style={{ background: GOLD, borderRadius: RADIUS }}><RefreshCw className={"h-4 w-4" + (isGen("slides") ? " animate-spin" : "")} /> {isGen("slides") ? "슬라이드 영상 만드는 중…" : "사진으로 만들기"}</button>
            {/* 생성 결과 — 활성본 미리보기 + 내역(버전 선택/삭제). 자동생성·「사진으로 만들기」 결과가 여기 누적된다. */}
            {(() => {
              const canEdit = !!(reservation?.id && media?.token);
              const selSlide = (vid) => canEdit ? actions.selectAsset(reservation.id, _subId, vid, "slide_video", 0) : null;
              const delSlide = (vid) => canEdit ? actions.deleteAsset(reservation.id, vid) : null;
              const slideHist = _slideVers.map((v) => ({ id: v.id, url: v.url, selected: v.selected }));
              return (
                <div className="mt-3">
                  <AssetCard label="슬라이드 영상" hint="사진 → 영상(현재 적용본)" asset={_slideResult} kind="video"
                    generating={isGen("slides")} history={slideHist}
                    onSelect={canEdit ? selSlide : undefined} onDeleteVersion={canEdit ? delSlide : undefined} />
                </div>
              );
            })()}

            {/* 배경 음악 — 추억 슬라이드(보호자 사진)에만 깔린다. 추억 영상(유저 영상)은 원본 사운드 유지. */}
            <div className="mt-5 border-t pt-4" style={{ borderColor: LINE }}>
              <div className="mb-2 flex items-center gap-1.5 text-[12.5px] font-bold" style={{ color: INK }}><Music className="h-4 w-4" style={{ color: GOLD_D }} /> 배경 음악 <span className="font-normal" style={{ color: FAINT }}>· 추억 슬라이드(사진)에만</span></div>
              <p className="mb-2 text-[11px] leading-relaxed" style={{ color: FAINT }}>※ 추억 영상(보호자 영상)에는 BGM이 들어가지 않고 원본 사운드가 유지됩니다.</p>
              {!_pid && <div className="mb-2 px-3 py-2 text-[11px] leading-relaxed" style={{ background: "#fbeaea", border: "1px solid #e6c6c6", borderRadius: RADIUS, color: "#9a3b3b" }}>이 예약에 파트너가 연결되지 않아 소리 크기·페이드 설정은 저장되지 않습니다(곡 선택은 이 영상에 적용됩니다).</div>}
              {/* 이 영상 배경 음악 — 공용 라이브러리에서 골라 이 영상에만 적용(submissions.bgm_id · 합성이 템플릿보다 우선) */}
              <SlideBgmPicker reservation={reservation} submissionId={media?.submissionId} media={media} bgmLib={(_store.bgm || []).filter((b) => !b.partnerId || b.partnerId === _pid)} tplBgmId={_tb.bgm} canEdit={!!(reservation?.id && media?.submissionId)} />
              {reservation?.id && media?.submissionId ? (
                <FileButton accept="audio/*" onFile={(f) => actions.uploadSlideBgm(reservation.id, media.submissionId, _pid, f)}
                  className="mt-1 flex w-full items-center justify-center gap-1.5 py-2.5 text-[13px] font-bold text-white" style={{ background: GOLD, borderRadius: RADIUS }}>
                  <Upload className="h-4 w-4" /> 새 음악 올려서 적용
                </FileButton>
              ) : (
                <button onClick={() => toast("실제 예약에서만 업로드할 수 있습니다")} className="mt-1 flex w-full items-center justify-center gap-1.5 py-2.5 text-[13px] font-bold text-white" style={{ background: GOLD, borderRadius: RADIUS }}><Upload className="h-4 w-4" /> 새 음악 올려서 적용</button>
              )}
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
          const vols = item.vols || [];
          const setVol = (i, val) => { const n = item.vols ? item.vols.slice() : vids.map(() => 100); n[i] = val; onEdit(item.id, { vols: n }); };
          return (
          <>
            {_vidMock && <div className="mb-2 px-3 py-2 text-[11px] leading-relaxed" style={{ background: "#fbf3e6", border: "1px solid #ecd9b0", borderRadius: RADIUS, color: "#8a6d3b" }}>샘플 미리보기입니다 — 실제 보호자 영상이 아직 없거나 불러오는 중입니다.</div>}
            <Field label={`보호자 영상 (${vids.length}개 · 슬라이드 뒤 개별 클립 · 소리 개별 조절)`}>
              <div className="space-y-3 px-2.5 py-2.5" style={{ background: "#f6f3ec", border: "1px solid " + LINE, borderRadius: RADIUS }}>
                {vids.length === 0
                  ? <div className="py-2 text-center text-[11.5px]" style={{ color: FAINT }}>올라온 영상이 없습니다.</div>
                  : vids.map((v, i) => (
                    <div key={v.id || i} className={i > 0 ? "pt-3" : ""} style={i > 0 ? { borderTop: "1px solid " + LINE } : undefined}>
                      <div className="mb-1 flex items-center gap-2">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold" style={{ background: "#e7e2d8", color: MUTE }}>{i + 1}</span>
                        <Film className="h-3.5 w-3.5 shrink-0" style={{ color: GOLD_D }} />
                        <span className="min-w-0 flex-1 truncate text-[12px] font-semibold" style={{ color: INK }}>{v.name || `영상 ${i + 1}`}</span>
                      </div>
                      {v.url && <video src={v.url} controls playsInline preload="metadata" className="w-full" style={{ aspectRatio: "16/9", background: "#000", borderRadius: 4 }} />}
                      <div className="mt-1.5"><SoundField label={`${i + 1}번 영상 소리 크기`} value={vols[i]} onChange={(val) => setVol(i, val)} /></div>
                    </div>
                  ))}
              </div>
              <p className="mt-2 text-[11px] leading-relaxed" style={{ color: FAINT }}>※ 추억 슬라이드(사진) 다음에 각 영상이 개별 클립으로 이어집니다. 원본 사운드 유지, 영상마다 소리 크기를 따로 조절할 수 있고 0%면 음소거됩니다. 최종 렌더 시 합성됩니다.</p>
            </Field>
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
            <AssetCard label={"AI 영상 " + String.fromCharCode(65 + i)} hint="독사진 → 영상(약 5초)" asset={resA} kind="video" generating={isGen("ai:" + i)} onGenerate={gen} genLabel={resA ? "재생성" : "AI 생성"} onAdd={addV("ai_video_result", i, "video")} addAccept="video/*"
              promptSlot={<PromptPicker target={"AI영상 " + String.fromCharCode(65 + i)} onManage={() => setPromptModal(true)} />}
              history={hist(aiResVers)} onSelect={selV("ai_video_result", i)} onDeleteVersion={delV} />
            <div className="mt-1 px-3 py-2.5 text-[11.5px] leading-relaxed" style={{ background: "#f6f3ec", border: "1px solid " + LINE, borderRadius: RADIUS, color: MUTE }}>
              추억 슬라이드 앞(A) · 추억 영상 뒤(B)로 유저 소스를 감쌉니다. AI 영상은 사진으로 생성돼 소리가 없습니다(음량 조절 없음).
            </div>
          </>
          );
        })()}

        {k === "letter" && (
          <>
            {!(item.text != null || media?.letter) && <div className="mb-2 px-3 py-2 text-[11px] leading-relaxed" style={{ background: "#fbf3e6", border: "1px solid #ecd9b0", borderRadius: RADIUS, color: "#8a6d3b" }}>샘플 편지입니다 — 보호자가 작성한 편지가 아직 없거나 불러오는 중입니다.</div>}
            {/* 보호자(유저) 입력을 기본값으로 — 편집하면 그 값이 실시간으로 미리보기에 반영 */}
            <Field label="우리 처음 만난 날"><DateField value={item.metDate ?? media?.metDate ?? reservation?.metDate ?? ""} onChange={(d) => onEdit(item.id, { metDate: d })} /></Field>
            <Field label="무지개다리 건넌 날"><DateField value={item.partDate ?? media?.partDate ?? reservation?.partDate ?? ""} onChange={(d) => onEdit(item.id, { partDate: d })} /></Field>
            <Field label="편지 내용"><textarea rows={7} value={item.text ?? media?.letter ?? exampleLetter(name)} onChange={(e) => onEdit(item.id, { text: e.target.value })} className="w-full resize-none p-3 text-[13.5px] leading-relaxed outline-none" style={{ ...inputStyle, height: "auto", fontFamily: SERIF }} /></Field>
            <p className="text-[11.5px] leading-relaxed" style={{ color: FAINT }}>※ 보호자가 입력한 편지·날짜입니다. 수정하면 왼쪽 미리보기에 실시간 반영되고, 두 날짜는 편지 마지막에 크게 표시됩니다.</p>
          </>
        )}

        {k === "subtitle" && (() => {
          const font = item.font ?? D.SUBTITLE_FONT_DEFAULT;
          const fontVal = D.subtitleFontCss(font);
          const size = item.size ?? 48;
          const color = item.color || "#f3e9c8";
          const effect = item.effect || D.SUBTITLE_EFFECT_DEFAULT;
          const fx = D.subtitleEffectStyle(effect);
          return (
          <>
            <Field label="자막 글자"><textarea rows={3} value={item.text ?? ""} onChange={(e) => onEdit(item.id, { text: e.target.value })} className="w-full resize-none p-3 text-[13.5px] leading-relaxed outline-none" style={{ ...inputStyle, height: "auto", fontFamily: fontVal }} /></Field>
            <Field label="자막 줄 · 동시 노출 트랙"><select className={inputCls} style={inputStyle} value={item.track ?? 0} onChange={(e) => onEdit(item.id, { track: +e.target.value })}><option value={0}>자막 1 (첫째 줄)</option><option value={1}>자막 2 (둘째 줄)</option></select></Field>
            <Field label="위치"><select className={inputCls} style={inputStyle} value={item.xPct != null ? "직접배치" : (item.pos || "하단")} onChange={(e) => onEdit(item.id, { pos: e.target.value, xPct: null, yPct: null })}>{item.xPct != null && <option value="직접배치">직접배치(드래그)</option>}{D.SUBTITLE_POS.map((p) => <option key={p}>{p}</option>)}</select></Field>
            <Field label="글자 방향">
              <label className="flex cursor-pointer items-center gap-2 px-3 text-[13px]" style={{ ...inputStyle, height: 38 }}>
                <input type="checkbox" checked={!!item.vertical} onChange={(e) => onEdit(item.id, { vertical: e.target.checked })} style={{ accentColor: GOLD, width: 16, height: 16 }} />
                세로로 변환 <span style={{ color: FAINT }}>· 글자를 세로로 세워서 표시</span>
              </label>
            </Field>
            <Field label="폰트"><select className={inputCls} style={{ ...inputStyle, fontFamily: fontVal }} value={font} onChange={(e) => onEdit(item.id, { font: e.target.value })}>{D.SUBTITLE_FONTS.map((f) => <option key={f.key} value={f.key} style={{ fontFamily: f.css }}>{f.name}</option>)}</select></Field>
            <Field label={`글자 크기 (${size}px)`}>
              <div className="flex items-center gap-2">
                <input type="range" min="20" max="80" step="1" value={size} onChange={(e) => onEdit(item.id, { size: +e.target.value })} className="flex-1" style={{ accentColor: GOLD }} />
                <input type="number" min="20" max="80" value={size} onChange={(e) => onEdit(item.id, { size: Math.max(20, Math.min(80, +e.target.value || 0)) })} className="w-16 px-2 text-[13px] outline-none" style={{ height: 34, background: "#fff", border: "1px solid " + LINE2, borderRadius: RADIUS, color: INK }} />
              </div>
            </Field>
            <Field label="글자 색상">
              <div className="flex flex-wrap items-center gap-1.5">
                {D.SUBTITLE_COLORS.map((c) => {
                  const on = color.toLowerCase() === c.toLowerCase();
                  return <button key={c} type="button" onClick={() => onEdit(item.id, { color: c })} title={c} className="h-7 w-7 rounded-full outline-none" style={{ background: c, border: "2px solid " + (on ? GOLD : LINE2), boxShadow: c.toLowerCase() === "#ffffff" ? "inset 0 0 0 1px " + LINE2 : "none" }} />;
                })}
                <input type="color" value={color} onChange={(e) => onEdit(item.id, { color: e.target.value })} title="직접 선택" className="h-7 w-9 cursor-pointer outline-none" style={{ border: "1px solid " + LINE2, borderRadius: 5, background: "#fff", padding: 1 }} />
              </div>
            </Field>
            <Field label="글자 효과">
              <select className={inputCls} style={inputStyle} value={effect} onChange={(e) => onEdit(item.id, { effect: e.target.value })}>
                {D.SUBTITLE_EFFECTS.map((ef) => <option key={ef} value={ef}>{ef === "박스" ? "박스 (반투명 배경)" : ef === "그림자" ? "그림자" : ef === "외곽선" ? "외곽선 (검정 테두리)" : "없음"}</option>)}
              </select>
            </Field>
            <Field label="미리보기">
              <div className="flex items-center justify-center px-3 py-5" style={{ background: "#1c232c", borderRadius: RADIUS, overflow: "hidden" }}>
                <span className="text-center leading-snug" style={{ fontFamily: fontVal, fontSize: Math.min(size, 34), color, borderRadius: 4, ...(item.vertical ? { writingMode: "vertical-rl", maxHeight: 120 } : null), ...fx }}>{item.text || "자막 미리보기"}</span>
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
            {/* 렌더가 지원하는 효과만 노출 — 페이드/없음. (디졸브·슬라이드 등은 합성 미지원이라 제거) */}
            <Field label="장면이 바뀌는 효과">
              <div className="grid grid-cols-2 gap-2">
                {["페이드", "없음"].map((t) => (
                  <button key={t} onClick={() => onEdit(transKey, { effect: t })} className="flex h-16 flex-col items-center justify-center gap-1 text-[13px] font-bold" style={{ background: effect === t ? GOLD_SOFT : "#fff", border: "1.5px solid " + (effect === t ? GOLD : LINE2), borderRadius: 6, color: effect === t ? GOLD_D : MUTE }}>
                    <ArrowRightLeft className="h-4 w-4" /> {t}
                  </button>
                ))}
              </div>
            </Field>
            <p className="text-[11.5px] leading-relaxed" style={{ color: FAINT }}>※ 장면 사이를 부드럽게 잇는 페이드로 합성됩니다.</p>
          </>
        )}

      </div>
    </div>
  );
}
