// [총괄] 사업부별 세팅 — 사업부별로 텍스트/용어를 커스텀. 구조는 그대로, 표시 텍스트만 변경.
//  · 유저 링크 탭: 실제 UserMobile 미리보기(좌) + 그 단계의 도메인 텍스트 편집(우)
//  · 파트너사 용어 탭: 파트너 콘솔 표기 용어 편집(개념별)
// [편집 모델] 입력은 로컬 draft에만 쌓이고(미리보기에는 즉시 반영) 실제 데이터(스토어/DB)는
//   상단 "저장" 버튼을 눌러야 일괄 반영된다 — 키 입력마다 DB가 바뀌던 실시간 저장을 폐지.
// (펫↔사람 등 도메인이 바뀌면 달라질 표현만 노출 · 공통/버튼/단계명은 제외)
import React, { useState, useRef, useEffect } from "react";
import { RotateCcw, Smartphone, Building2, Upload, Save, Undo2 } from "lucide-react";
import { SURFACE, LINE, LINE2, GOLD, GOLD_D, GOLD_SOFT, INK, MUTE, FAINT, RADIUS } from "../theme.js";
import { PageHeader } from "../ui.jsx";
import { useStore, actions } from "../store.js";
import { toast } from "../toast.jsx";
import * as D from "../data.js";
import UserMobile from "../user/UserMobile.jsx";
import dogGood from "../assets/dog-good.jpg";
import dogBad from "../assets/dog-bad.jpg";

// 예시 사진 슬롯 — 사업부별 good/bad 예시 사진 파일 교체(미리보기에 즉시 반영, 저장 전엔 draft).
function PhotoSlot({ which, label, def, photoDraft, setPhotoDraft }) {
  const cur = photoDraft[which];
  const ref = useRef(null);
  const onFile = (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => setPhotoDraft((d) => ({ ...d, [which]: r.result }));
    r.readAsDataURL(f);
    e.target.value = "";
  };
  const clear = () => setPhotoDraft((d) => { const n = { ...d }; delete n[which]; return n; });
  return (
    <div className="overflow-hidden" style={{ border: "1px solid " + LINE, borderRadius: RADIUS, background: SURFACE }}>
      <div className="relative" style={{ aspectRatio: "1", background: "#e8e1d1" }}>
        <img src={cur || def} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <span className="absolute left-1.5 top-1.5 rounded-full px-1.5 py-0.5 text-[9.5px] font-bold text-white" style={{ background: "rgba(0,0,0,.55)" }}>{label}</span>
        {cur && <button onClick={clear} title="기본 사진으로" className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full" style={{ background: "rgba(0,0,0,.55)", color: "#fff" }}><RotateCcw className="h-3 w-3" /></button>}
      </div>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={onFile} />
      <button onClick={() => ref.current && ref.current.click()} className="flex w-full items-center justify-center gap-1 py-1.5 text-[11.5px] font-semibold outline-none transition hover:bg-[#f6f3ec]" style={{ color: GOLD_D }}><Upload className="h-3.5 w-3.5" /> 사진 변경</button>
    </div>
  );
}

const isLong = (k) => k === "letterPlaceholder" || k.startsWith("sub") || k === "aiGuide";

// ── 유저 링크 탭 ──────────────────────────────────────────────
function UserLinkTab({ bizUnit, textDraft, setTextDraft, photoDraft, setPhotoDraft }) {
  const T = { ...D.USER_TEXT, ...textDraft };  // draft 반영된 표시 텍스트
  const [step, setStep] = useState(1); // 미리보기·편집 동기화(첫 도메인 단계=AI 변환)
  const stepFields = D.USER_TEXT_FIELDS.find((g) => g.step === step);

  const setText = (key, value) => setTextDraft((d) => {
    const n = { ...d };
    if (value === D.USER_TEXT[key]) delete n[key]; else n[key] = value;
    return n;
  });

  return (
    <div>
      {/* 단계 탭 — 미리보기·편집 동기화. 도메인 항목 있는 단계엔 골드 점 */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        {D.USER_STEPS.map((label, i) => {
          const on = step === i;
          const hasFields = D.USER_TEXT_FIELDS.some((g) => g.step === i);
          return (
            <button key={i} onClick={() => setStep(i)} className="flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] font-semibold outline-none transition focus-visible:ring-1"
              style={{ borderRadius: RADIUS, background: on ? GOLD_SOFT : SURFACE, color: on ? GOLD_D : MUTE, border: "1px solid " + (on ? GOLD : LINE) }}>
              <span className="tabular-nums">{i + 1}</span> {label}
              {hasFields && <span className="h-1.5 w-1.5 rounded-full" style={{ background: on ? GOLD_D : GOLD }} />}
            </button>
          );
        })}
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: "minmax(340px, 410px) 1fr" }}>
        {/* 좌: 실제 유저 링크 미리보기(구조 동일) — draft 오버라이드로 저장 전 미리보기 */}
        <div className="self-start overflow-hidden" style={{ border: "1px solid " + LINE, borderRadius: RADIUS }}>
          <div className="flex items-center gap-1.5 px-3 py-2 text-[12px] font-bold" style={{ background: SURFACE, borderBottom: "1px solid " + LINE, color: INK }}>
            <Smartphone className="h-3.5 w-3.5" style={{ color: GOLD_D }} /> 미리보기 <span className="font-normal" style={{ color: FAINT }}>· 저장 전 미리보기(저장해야 실제 반영)</span>
          </div>
          <UserMobile previewBizId={bizUnit} step={step} onStep={setStep} previewOverride={{ text: textDraft, photos: photoDraft }} />
        </div>

        {/* 우: 현재 단계의 도메인 텍스트만 편집 */}
        <div className="min-w-0">
          <div className="mb-1.5 flex items-center gap-1.5 text-[12.5px] font-bold" style={{ color: INK }}>
            {step + 1}. {D.USER_STEPS[step]} <span className="font-normal" style={{ color: FAINT }}>· 이 단계의 도메인 텍스트</span>
          </div>
          {stepFields ? (
            <div className="overflow-hidden" style={{ background: SURFACE, border: "1px solid " + LINE, borderRadius: RADIUS }}>
              {stepFields.items.map(([key, label, hint], i) => {
                const changed = textDraft[key] != null;
                return (
                  <div key={key} className="flex items-start gap-2 px-3 py-2.5" style={{ borderTop: i ? "1px solid " + LINE : "none" }}>
                    <div className="w-32 shrink-0 pt-1.5">
                      <div className="text-[12px] font-semibold" style={{ color: MUTE }}>{label}</div>
                      {hint && <div className="text-[10.5px] leading-tight" style={{ color: FAINT }}>{hint}</div>}
                    </div>
                    {isLong(key)
                      ? <textarea rows={2} value={T[key]} onChange={(e) => setText(key, e.target.value)} className="min-w-0 flex-1 resize-none px-2.5 py-1.5 text-[13px] leading-relaxed outline-none focus-visible:ring-1" style={{ border: "1px solid " + LINE2, borderRadius: RADIUS, color: INK }} />
                      : <input value={T[key]} onChange={(e) => setText(key, e.target.value)} className="min-w-0 flex-1 px-2.5 text-[13px] outline-none focus-visible:ring-1" style={{ height: 36, border: "1px solid " + LINE2, borderRadius: RADIUS, color: INK }} />}
                    <button onClick={() => setText(key, D.USER_TEXT[key])} disabled={!changed} title="기본값으로" className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center outline-none transition disabled:opacity-20" style={{ color: changed ? GOLD_D : FAINT }}>
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="px-3 py-4 text-[12.5px]" style={{ background: SURFACE, border: "1px solid " + LINE, borderRadius: RADIUS, color: FAINT }}>
              이 단계는 사업부 공통입니다 — 도메인에 따라 바꿀 텍스트가 없습니다.
            </div>
          )}

          {/* AI 변환 단계 — 예시 사진(좋은 예/피해주세요) 파일 교체 */}
          {step === 1 && (
            <div className="mt-3">
              <div className="mb-1.5 text-[12.5px] font-bold" style={{ color: INK }}>예시 사진 <span className="font-normal" style={{ color: FAINT }}>· 좋은 예 / 피해주세요 (사진 가이드)</span></div>
              <div className="grid grid-cols-2 gap-2" style={{ maxWidth: 320 }}>
                <PhotoSlot which="good" label="좋은 예" def={dogGood} photoDraft={photoDraft} setPhotoDraft={setPhotoDraft} />
                <PhotoSlot which="bad" label="피해주세요" def={dogBad} photoDraft={photoDraft} setPhotoDraft={setPhotoDraft} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── 파트너사 용어 탭 ──────────────────────────────────────────
function PartnerTermTab({ termDraft, setTermDraft }) {
  const setTerm = (key, value) => setTermDraft((d) => ({ ...d, [key]: value }));
  return (
    <div style={{ maxWidth: 640 }}>
      <div className="overflow-hidden" style={{ background: SURFACE, border: "1px solid " + LINE, borderRadius: RADIUS }}>
        <div className="grid items-center gap-3 px-4 py-2.5 text-[11.5px] font-bold" style={{ gridTemplateColumns: "150px 1fr 40px", background: "#faf8f3", borderBottom: "1px solid " + LINE, color: MUTE }}>
          <span>개념</span><span>파트너 콘솔 표기</span><span />
        </div>
        {D.TERMS.map((t, i) => {
          const pv = termDraft[t.key] ?? t.partner;
          const changed = termDraft[t.key] != null && termDraft[t.key] !== t.partner;
          return (
            <div key={t.key} className="grid items-center gap-3 px-4 py-2.5" style={{ gridTemplateColumns: "150px 1fr 40px", borderTop: i ? "1px solid " + LINE : "none" }}>
              <span className="text-[12.5px] font-semibold" style={{ color: INK }}>{t.concept}</span>
              <input value={pv} onChange={(e) => setTerm(t.key, e.target.value)} className="w-full px-2.5 text-[13px] outline-none focus-visible:ring-1" style={{ height: 36, background: "#fff", border: "1px solid " + LINE2, borderRadius: RADIUS, color: INK }} />
              <button onClick={() => setTerm(t.key, t.partner)} disabled={!changed} title="기본값으로" className="flex h-7 w-7 items-center justify-center outline-none transition disabled:opacity-20" style={{ color: changed ? GOLD_D : FAINT }}>
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-[11.5px] leading-relaxed" style={{ color: FAINT }}>※ 파트너 콘솔(예약·고객·대시보드 등)에 표시되는 용어입니다. 사업부별로 표현만 바뀝니다.</p>
    </div>
  );
}

// draft 초기값 — 현재 스토어의 사업부별 오버라이드를 복제(저장 전 편집 버퍼).
const initTextDraft = (s, biz) => ({ ...(s.userText[biz] || {}) });
const initPhotoDraft = (s, biz) => ({ ...(s.userPhotos[biz] || {}) });
const initTermDraft = (s, biz) => {
  const cfg = s.termConfigs[biz] || {};
  const out = {};
  for (const k of Object.keys(cfg)) if (cfg[k]?.partner != null) out[k] = cfg[k].partner;
  return out;
};

export function BizUnitSettings() {
  const s = useStore();
  const { bizUnits, bizUnit } = s;
  const biz = bizUnits.find((b) => b.id === bizUnit) || bizUnits[0];
  const [tab, setTab] = useState("user");
  const tabs = [["user", "유저 링크", Smartphone], ["partner", "파트너사 용어", Building2]];

  // 편집 버퍼(draft) — 저장 전까지 스토어/DB에 쓰지 않는다. 사업부 전환 시 새 사업부 값으로 초기화.
  const [textDraft, setTextDraft] = useState(() => initTextDraft(s, bizUnit));
  const [photoDraft, setPhotoDraft] = useState(() => initPhotoDraft(s, bizUnit));
  const [termDraft, setTermDraft] = useState(() => initTermDraft(s, bizUnit));
  useEffect(() => {
    setTextDraft(initTextDraft(s, bizUnit));
    setPhotoDraft(initPhotoDraft(s, bizUnit));
    setTermDraft(initTermDraft(s, bizUnit));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bizUnit]);

  // 저장 대상 변경분 계산 — draft vs 스토어. (기본값 = USER_TEXT / TERMS 시드)
  const baseText = s.userText[bizUnit] || {};
  const basePhoto = s.userPhotos[bizUnit] || {};
  const baseTerm = s.termConfigs[bizUnit] || {};
  const textVal = (m, k) => (m[k] != null ? m[k] : D.USER_TEXT[k]);
  const termVal = (m, t) => (m[t.key] != null ? m[t.key] : t.partner);

  const textKeys = [...new Set([...Object.keys(textDraft), ...Object.keys(baseText)])];
  const photoKeys = [...new Set([...Object.keys(photoDraft), ...Object.keys(basePhoto)])];
  const textChanges = textKeys.filter((k) => textVal(textDraft, k) !== textVal(baseText, k));
  const photoChanges = photoKeys.filter((k) => (photoDraft[k] || null) !== (basePhoto[k] || null));
  const termChanges = D.TERMS.filter((t) => termVal(termDraft, t) !== (baseTerm[t.key]?.partner ?? t.partner));
  const dirty = textChanges.length + photoChanges.length + termChanges.length > 0;

  const save = () => {
    if (!dirty) return;
    textChanges.forEach((k) => actions.setUserText(bizUnit, k, textVal(textDraft, k)));
    photoChanges.forEach((k) => actions.setUserPhoto(bizUnit, k, photoDraft[k] || null));
    termChanges.forEach((t) => actions.setTermConfig(bizUnit, t.key, { partner: termVal(termDraft, t) }));
    toast("사업부별 세팅을 저장했습니다");
  };
  const revert = () => {
    setTextDraft(initTextDraft(s, bizUnit));
    setPhotoDraft(initPhotoDraft(s, bizUnit));
    setTermDraft(initTermDraft(s, bizUnit));
  };

  const dirtyCount = textChanges.length + photoChanges.length + termChanges.length;

  return (
    <div>
      <PageHeader title="사업부별 세팅" sub={`${biz?.name || ""} · 사업부별 텍스트·용어 커스텀 — 구조는 그대로, 표시되는 단어만 변경`}
        right={<>
          {dirty && <span className="text-[11.5px] font-semibold" style={{ color: GOLD_D }}>저장 안 된 변경 {dirtyCount}건</span>}
          <button onClick={revert} disabled={!dirty} className="flex items-center gap-1.5 px-3 py-2 text-[12.5px] font-semibold outline-none transition disabled:opacity-30" style={{ borderRadius: RADIUS, background: SURFACE, color: MUTE, border: "1px solid " + LINE }}>
            <Undo2 className="h-3.5 w-3.5" /> 되돌리기
          </button>
          <button onClick={save} disabled={!dirty} className="flex items-center gap-1.5 px-4 py-2 text-[12.5px] font-bold text-white outline-none transition disabled:opacity-30" style={{ borderRadius: RADIUS, background: GOLD }}>
            <Save className="h-3.5 w-3.5" /> 저장
          </button>
        </>} />

      <div className="mb-4 flex gap-1.5">
        {tabs.map(([k, label, Icon]) => {
          const on = tab === k;
          return (
            <button key={k} onClick={() => setTab(k)} className="flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-bold outline-none transition focus-visible:ring-1"
              style={{ borderRadius: RADIUS, background: on ? GOLD_SOFT : SURFACE, color: on ? GOLD_D : MUTE, border: "1px solid " + (on ? GOLD : LINE) }}>
              <Icon className="h-4 w-4" /> {label}
            </button>
          );
        })}
      </div>

      {tab === "user"
        ? <UserLinkTab bizUnit={bizUnit} textDraft={textDraft} setTextDraft={setTextDraft} photoDraft={photoDraft} setPhotoDraft={setPhotoDraft} />
        : <PartnerTermTab termDraft={termDraft} setTermDraft={setTermDraft} />}
    </div>
  );
}
