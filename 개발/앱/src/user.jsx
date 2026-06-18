import React, { useState, useRef } from "react";
import { Check, Upload, Image, Film, Music, Play, ChevronLeft, ChevronRight, Heart, X, Sparkles, Shuffle } from "lucide-react";
import { SANS, SERIF, BG, SURFACE, LINE, LINE2, GOLD, GOLD_D, GOLD_SOFT, INK, MUTE, FAINT, STATUS, RADIUS } from "./theme.js";
import { Logo } from "./ui.jsx";
import { grabVideoFrame } from "./lib/media.js";
import * as D from "./data.js";

const STEPS = D.USER_STEPS;
const TRANSITIONS = D.USER_TRANSITIONS; // 전환 효과 명칭은 data.js에서 단일 관리

const parseMB = (s) => {
  const n = parseFloat(s);
  if (s.includes("GB")) return n * 1024;
  if (s.includes("MB")) return n;
  if (s.includes("KB")) return n / 1024;
  return 0;
};

// 상단 스텝퍼
function Stepper({ step }) {
  return (
    <div className="flex items-center gap-1 px-4 py-3" style={{ borderBottom: "1px solid " + LINE }}>
      {STEPS.map((s, i) => (
        <React.Fragment key={i}>
          <div className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold"
            style={{ background: i < step ? STATUS.published.c : i === step ? GOLD : "#e9e5dc", color: i <= step ? "#fff" : FAINT }}>
            {i < step ? <Check className="h-3 w-3" strokeWidth={3} /> : i + 1}
          </div>
          {i < STEPS.length - 1 && <div className="h-px flex-1" style={{ background: i < step ? STATUS.published.c : LINE2 }} />}
        </React.Fragment>
      ))}
    </div>
  );
}

function Title({ children, sub }) {
  return (
    <div className="mb-4">
      <h2 className="text-[17px] font-bold" style={{ color: INK }}>{children}</h2>
      {sub && <p className="mt-1 text-[12.5px] leading-relaxed" style={{ color: MUTE }}>{sub}</p>}
    </div>
  );
}

// 소스 미리보기 썸네일 (사진/영상) — thumb URL이 있으면 실제 이미지, 없으면 아이콘 폴백
function SourceThumb({ kind, thumb }) {
  return (
    <div className="relative flex items-center justify-center overflow-hidden"
      style={{ aspectRatio: "4/3", background: "linear-gradient(135deg,#f0ebe0,#e3d9c4)", borderTopLeftRadius: RADIUS, borderTopRightRadius: RADIUS }}>
      {thumb ? (
        <img src={thumb} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : kind === "photo" ? (
        <Image className="h-6 w-6" style={{ color: GOLD_D, opacity: 0.55 }} />
      ) : (
        <Film className="h-6 w-6" style={{ color: GOLD_D, opacity: 0.55 }} />
      )}
      {kind === "video" && (
        <span className="absolute bottom-1 right-1 flex h-4 w-4 items-center justify-center rounded-full" style={{ background: "rgba(0,0,0,.45)" }}>
          <Play className="h-2 w-2 text-white" fill="#fff" />
        </span>
      )}
    </div>
  );
}

function StepBody({ step, st }) {
  // 0 — 개인정보 동의
  if (step === 0)
    return (
      <div>
        <Title sub="소중한 기억을 영상으로 담기 위해 아래 동의가 필요합니다.">개인정보 활용 동의</Title>
        <div className="space-y-3 text-[12.5px] leading-relaxed" style={{ color: MUTE }}>
          <div className="px-4 py-3" style={{ background: "#f6f3ec", borderRadius: RADIUS, border: "1px solid " + LINE }}>
            <div className="mb-1.5 font-bold" style={{ color: INK }}>개인정보 수집·이용 동의 (필수)</div>
            <p>수집 항목: 반려동물·보호자 성함, 사진/영상, 연락처, 편지 내용</p>
            <p>수집 목적: 추모영상 제작 및 전달</p>
            <p>보유 기간: 보호자 삭제 요청 시까지 보관 (요청 시 즉시 파기)</p>
          </div>
          <button onClick={() => st.setAgreed((v) => !v)} className="flex w-full items-center gap-2 text-left text-[13px] font-semibold outline-none" style={{ color: INK }}>
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-sm" style={{ background: st.agreed ? GOLD : "#fff", border: "1.5px solid " + (st.agreed ? GOLD : LINE2) }}>
              {st.agreed && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
            </span>
            개인정보 수집·이용에 동의합니다 (필수)
          </button>
          {!st.agreed && <p className="text-[11.5px]" style={{ color: GOLD_D }}>※ 동의해야 다음 단계로 진행할 수 있습니다.</p>}
        </div>
      </div>
    );
  // 2 — 소스 업로드 (슬라이드 구성 · 100MB 제한)
  if (step === 2) {
    const pct = Math.min(100, (st.totalMB / 100) * 100);
    const warn = "#b06030";
    return (
      <div>
        <Title sub="추억 사진·영상을 올려주세요. 슬라이드 구간을 구성합니다. (사진·영상 합쳐 최대 20개 · 100MB)">소스 업로드</Title>
        <div className="mb-3">
          <div className="mb-1 flex justify-between text-[11px]" style={{ color: MUTE }}>
            <span>사용 용량</span>
            <span style={{ color: st.overLimit ? warn : INK, fontWeight: st.overLimit ? 700 : 400 }}>{st.totalMB.toFixed(1)} / 100 MB</span>
          </div>
          <div style={{ height: 5, background: LINE, borderRadius: 3, overflow: "hidden" }}>
            <div style={{ height: "100%", width: pct + "%", background: st.overLimit ? warn : GOLD, borderRadius: 3, transition: "width .3s ease" }} />
          </div>
          {st.overLimit && <p className="mt-1 text-[11px] font-semibold" style={{ color: warn }}>100MB를 초과했습니다. 파일을 삭제해 주세요.</p>}
        </div>
        <input ref={st.fileRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={st.onFiles} />
        <button onClick={st.addUpload} className="mb-3 flex w-full cursor-pointer flex-col items-center justify-center gap-1.5 py-7 outline-none transition hover:border-[#c9a86a]" style={{ border: "1.5px dashed " + LINE2, borderRadius: RADIUS, background: "#faf8f3" }}>
          <Upload className="h-6 w-6" style={{ color: GOLD }} />
          <span className="text-[12.5px] font-semibold" style={{ color: INK }}>사진·영상 끌어다 놓기</span>
          <span className="text-[11px]" style={{ color: FAINT }}>또는 눌러서 선택</span>
        </button>
        {st.uploads.length === 0 ? (
          <div className="py-6 text-center text-[12.5px]" style={{ color: FAINT }}>아직 올린 파일이 없습니다. 사진·영상을 추가해 주세요.</div>
        ) : (
          <>
            <div className="mb-1.5 flex items-center justify-between text-[11.5px]" style={{ color: MUTE }}>
              <span>{st.uploads.length} / 20개 업로드됨</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {st.uploads.map((u) => (
                <div key={u.id} className="relative overflow-hidden" style={{ background: SURFACE, border: "1px solid " + LINE, borderRadius: RADIUS }}>
                  <SourceThumb kind={u.kind} thumb={u.thumb} />
                  <button onClick={() => st.removeUpload(u.id)} className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full outline-none transition hover:opacity-80" style={{ background: "rgba(0,0,0,.5)", color: "#fff" }} aria-label="삭제"><X className="h-3 w-3" /></button>
                  <div className="px-2 py-1.5">
                    <div className="truncate text-[11.5px] font-semibold" style={{ color: INK }}>{u.name}</div>
                    <div className="text-[10.5px]" style={{ color: FAINT }}>{u.size}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }
  // 1 — AI 변환 (사진 3장 → 1장 타이틀 선택, 나머지 2장은 영상 변환)
  if (step === 1)
    return (
      <div>
        <Title sub="사진 3장을 올리고, 그중 한 장을 타이틀로 골라 주세요.">AI 변환</Title>

        {/* 가이드 — 상단(3장 전체에 적용) */}
        <div className="mb-3 px-3 py-2 text-[11px] leading-relaxed" style={{ background: "#f6f3ec", border: "1px solid " + LINE, borderRadius: RADIUS, color: MUTE }}>
          💡 <b style={{ color: INK }}>잘 나온 독사진</b>일수록 결과가 좋아요 — 아이만 또렷하게, 얼굴이 정면으로 나온 사진 3장을 올려주세요.
        </div>

        {/* 사진 3장 — 한 장은 타이틀, 나머지 2장은 영상 변환 */}
        <div className="mb-1.5 flex items-center gap-1.5 text-[12.5px] font-bold" style={{ color: INK }}>
          <Sparkles className="h-3.5 w-3.5" style={{ color: GOLD_D }} /> 사진 3장 <span className="font-normal" style={{ color: FAINT }}>· 한 장을 타이틀로 선택</span>
        </div>
        <p className="mb-2 text-[11.5px] leading-relaxed" style={{ color: MUTE }}>
          고른 1장에 영정 틀을 입혀 <b style={{ color: INK }}>타이틀</b>을, 나머지 2장으로 <b style={{ color: INK }}>AI 추억 영상</b>을 만듭니다.
        </p>
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map((i) => {
            const on = st.titleSel === i;
            return (
              <button key={i} onClick={() => st.setTitleSel(i)} className="relative flex flex-col items-center justify-center gap-1 outline-none transition focus-visible:ring-1"
                style={{ aspectRatio: "1", background: on ? GOLD_SOFT : "#f6f3ec", border: "1.5px solid " + (on ? GOLD : LINE2), borderRadius: RADIUS }}>
                <Image className="h-5 w-5" style={{ color: on ? GOLD_D : FAINT }} />
                <span className="text-[10.5px] font-semibold" style={{ color: on ? GOLD_D : MUTE }}>사진 {i + 1}</span>
                <span className="text-[9.5px]" style={{ color: on ? GOLD_D : FAINT }}>{on ? "타이틀" : "영상 변환"}</span>
                {on && <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full" style={{ background: GOLD }}><Check className="h-2.5 w-2.5 text-white" strokeWidth={3} /></span>}
              </button>
            );
          })}
        </div>
        <button className="mt-2 flex items-center gap-1 text-[11.5px] font-semibold outline-none" style={{ color: GOLD }}><Upload className="h-3.5 w-3.5" /> 사진 다시 올리기</button>
      </div>
    );
  // 3 — 장면 전환 (소스별 개별 설정 + 랜덤 배치)
  if (step === 3)
    return (
      <div>
        <Title sub="소스별 전환 효과를 설정합니다. 전체를 한번에 바꾸거나 파일 순서를 섞을 수 있습니다.">장면 전환</Title>
        <div className="mb-3 flex items-center gap-2">
          <span className="shrink-0 text-[12px] font-semibold" style={{ color: MUTE }}>전체 변경</span>
          <select value={st.trans} onChange={(e) => st.setAllTrans(+e.target.value)}
            className="flex-1 px-2 py-1.5 text-[12px] outline-none"
            style={{ background: SURFACE, border: "1px solid " + LINE2, borderRadius: RADIUS, color: INK }}>
            {TRANSITIONS.map((t, i) => <option key={i} value={i}>{t}</option>)}
          </select>
          <button onClick={st.shuffleUploads}
            className="flex shrink-0 items-center gap-1 px-3 py-1.5 text-[12px] font-semibold outline-none transition hover:opacity-75"
            style={{ background: GOLD_SOFT, border: "1px solid " + LINE2, borderRadius: RADIUS, color: GOLD_D }}>
            <Shuffle className="h-3.5 w-3.5" /> 랜덤 배치
          </button>
        </div>
        {st.uploads.length === 0 ? (
          <div className="py-6 text-center text-[12.5px]" style={{ color: FAINT }}>소스 업로드 단계에서 파일을 추가하세요.</div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {st.uploads.map((u, i) => (
              <div key={u.id} className="overflow-hidden" style={{ background: SURFACE, border: "1px solid " + LINE, borderRadius: RADIUS }}>
                <div className="relative">
                  <SourceThumb kind={u.kind} thumb={u.thumb} />
                  <span className="absolute left-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white" style={{ background: "rgba(0,0,0,.5)" }}>{i + 1}</span>
                </div>
                <div className="px-2 pb-2 pt-1.5">
                  <div className="mb-1.5 truncate text-[11.5px] font-semibold" style={{ color: INK }}>{u.name}</div>
                  <select value={st.transMap[u.id] ?? st.trans} onChange={(e) => st.setItemTrans(u.id, +e.target.value)}
                    className="w-full px-1.5 py-1 text-[11px] outline-none"
                    style={{ background: "#f6f3ec", border: "1px solid " + LINE2, borderRadius: RADIUS, color: INK }}>
                    {TRANSITIONS.map((t, j) => <option key={j} value={j}>{t}</option>)}
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  // 4 — 배경 음악
  if (step === 4)
    return (
      <div>
        <Title sub="추모영상에 흐를 배경 음악을 고릅니다.">배경 음악</Title>
        <div className="space-y-2">
          {D.BGM.map((b, i) => {
            const on = st.bgm === i;
            return (
              <button key={b.id} onClick={() => st.setBgm(i)} className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left outline-none transition focus-visible:ring-1" style={{ background: on ? GOLD_SOFT : SURFACE, border: "1.5px solid " + (on ? GOLD : LINE), borderRadius: RADIUS }}>
                <Play className="h-4 w-4 shrink-0" style={{ color: on ? GOLD_D : MUTE }} fill={on ? GOLD_D : "none"} />
                <span className="flex-1 text-[12.5px] font-semibold" style={{ color: INK }}>{b.name}</span>
                <span className="text-[11px]" style={{ color: FAINT }}>{b.meta}</span>
                {on && <Check className="h-4 w-4 shrink-0" style={{ color: GOLD_D }} strokeWidth={2.6} />}
              </button>
            );
          })}
        </div>
      </div>
    );
  // 5 — 편지 작성
  if (step === 5)
    return (
      <div>
        <Title sub="떠나보낸 아이에게 전하고 싶은 마음을 담아 주세요. 편지는 배경음과 함께 영상에 표시됩니다.">편지 작성</Title>
        <textarea value={st.letter} onChange={(e) => st.setLetter(e.target.value)} rows={7} maxLength={300} className="w-full resize-none p-3 text-[13px] leading-relaxed outline-none"
          style={{ background: SURFACE, border: "1px solid " + LINE, borderRadius: RADIUS, color: INK, fontFamily: SERIF }} />
        <div className="mt-1 text-right text-[11px]" style={{ color: FAINT }}>{st.letter.length} / 300</div>
      </div>
    );
  // 6 — 미리보기
  if (step === 6)
    return (
      <div>
        <Title sub="제작될 추모영상을 미리 확인합니다. (서버 렌더 영상 재생)">미리보기</Title>
        <div className="relative flex items-center justify-center" style={{ aspectRatio: "16/9", background: "#2a323d", borderRadius: RADIUS }}>
          <Play className="h-10 w-10 text-white" style={{ opacity: 0.85 }} fill="#fff" />
          <span className="absolute bottom-2 left-2 px-1.5 py-[2px] text-[9px] font-bold tracking-wider text-white" style={{ background: "rgba(0,0,0,.4)", borderRadius: 2 }}>16:9 · 1080p</span>
        </div>
        <div className="mt-3 text-center" style={{ fontFamily: SERIF, fontSize: 18, fontWeight: 700, color: INK }}>콩이</div>
        <p className="mt-1 text-center text-[12px]" style={{ color: MUTE }}>타이틀 · 오프닝 · 추억 슬라이드 · AI 영상 · 편지</p>
        {/* 유저가 고른 설정 요약 */}
        <div className="mt-3 space-y-1 px-3 py-2.5 text-[11.5px]" style={{ background: "#f6f3ec", border: "1px solid " + LINE, borderRadius: RADIUS, color: MUTE }}>
          <div className="flex justify-between"><span>슬라이드 소스</span><span style={{ color: INK }}>{st.uploads.length}개</span></div>
          <div className="flex justify-between"><span>타이틀 사진</span><span style={{ color: INK }}>{st.titleSel + 1}번 선택</span></div>
          <div className="flex justify-between"><span>AI 영상 변환</span><span style={{ color: INK }}>나머지 2장</span></div>
          <div className="flex justify-between"><span>장면 전환</span><span style={{ color: INK }}>{Object.keys(st.transMap).length > 0 ? "개별 설정" : TRANSITIONS[st.trans]}</span></div>
          <div className="flex justify-between"><span>배경 음악</span><span style={{ color: INK }}>{D.BGM[st.bgm].name}</span></div>
        </div>
      </div>
    );
  // 7 — 영상 완료
  return (
    <div className="flex flex-col items-center py-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full" style={{ background: GOLD_SOFT }}>
        <Heart className="h-7 w-7" style={{ color: GOLD_D }} fill={GOLD_D} />
      </div>
      <h2 className="mt-4 text-[17px] font-bold" style={{ color: INK }}>추모영상이 완성되었습니다</h2>
      <p className="mt-1.5 text-[12.5px] leading-relaxed" style={{ color: MUTE }}>아래 링크로 가족·조문객과 함께 보실 수 있습니다.<br />링크는 퇴실 시 자동으로 만료됩니다.</p>
      <div className="mt-4 w-full">
        <div className="relative flex items-center justify-center" style={{ aspectRatio: "16/9", background: "#2a323d", borderRadius: RADIUS }}>
          <Play className="h-10 w-10 text-white" fill="#fff" style={{ opacity: 0.9 }} />
        </div>
        <button className="mt-3 w-full py-2.5 text-[13px] font-bold text-white" style={{ background: GOLD, borderRadius: RADIUS }}>링크 복사 · 공유하기</button>
      </div>
    </div>
  );
}

export default function UserMobile() {
  const [step, setStep] = useState(0);
  const [agreed, setAgreed] = useState(false);
  const [uploads, setUploads] = useState(() => D.USER_UPLOADS.map((u) => ({ ...u })));
  const [trans, setTrans] = useState(0);
  const [bgm, setBgm] = useState(0);
  const [letter, setLetter] = useState(D.EDITOR_LETTER);
  const [titleSel, setTitleSel] = useState(0);
  const [transMap, setTransMap] = useState({});
  const fileRef = useRef(null);
  const removeUpload = (id) => setUploads((p) => {
    const gone = p.find((u) => u.id === id);
    if (gone && gone.thumb && gone.thumb.startsWith("blob:")) URL.revokeObjectURL(gone.thumb);
    return p.filter((u) => u.id !== id);
  });
  const addUpload = () => fileRef.current && fileRef.current.click();
  const onFiles = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach((f, k) => {
      const id = "u-" + Date.now() + "-" + k;
      const isVideo = f.type.startsWith("video");
      setUploads((p) => [
        ...p,
        {
          id,
          name: f.name,
          kind: isVideo ? "video" : "photo",
          size: (f.size / 1048576).toFixed(1) + "MB",
          thumb: f.type.startsWith("image") ? URL.createObjectURL(f) : undefined,
        },
      ]);
      // 영상은 첫 프레임 캡처가 끝나면 해당 카드 썸네일만 비동기 갱신 (실패 시 아이콘 폴백 유지)
      if (isVideo) grabVideoFrame(f).then((thumb) => {
        if (thumb) setUploads((p) => p.map((u) => (u.id === id ? { ...u, thumb } : u)));
      });
    });
    e.target.value = "";
  };
  const shuffleUploads = () => setUploads((p) => [...p].sort(() => Math.random() - 0.5));
  const setItemTrans = (id, idx) => setTransMap((m) => ({ ...m, [id]: idx }));
  const setAllTrans = (idx) => { setTrans(idx); setTransMap(Object.fromEntries(uploads.map((u) => [u.id, idx]))); };
  const totalMB = uploads.reduce((sum, u) => sum + parseMB(u.size), 0);
  const overLimit = totalMB > 100;
  const st = { agreed, setAgreed, uploads, removeUpload, addUpload, onFiles, fileRef, trans, setTrans, bgm, setBgm, letter, setLetter, titleSel, setTitleSel, transMap, setItemTrans, setAllTrans, shuffleUploads, totalMB, overLimit };

  const last = STEPS.length - 1;
  const previewStep = last - 1;
  const blocked = (step === 0 && !agreed) || (step === 2 && overLimit);

  return (
    <div className="flex items-start justify-center px-6 py-10" style={{ background: BG, minHeight: "calc(100vh - 44px)" }}>
      <div className="w-full" style={{ maxWidth: 390 }}>
        {/* 모바일 프레임 */}
        <div className="overflow-hidden" style={{ background: SURFACE, border: "1px solid " + LINE, borderRadius: 18, boxShadow: "0 10px 30px rgba(42,38,34,.10)" }}>
          {/* 헤더 */}
          <div className="flex flex-col items-center px-5 py-5 text-center" style={{ background: "#faf7f1", borderBottom: "1px solid " + LINE }}>
            <Logo height={30} />
            <div className="mt-2.5 text-[14px] font-bold" style={{ color: INK }}>추모영상 제작</div>
            <div className="mt-0.5 text-[11px]" style={{ color: FAINT }}>{step + 1} / {STEPS.length} · {STEPS[step]}</div>
          </div>
          <Stepper step={step} />
          <div className="px-5 py-5" style={{ minHeight: 360 }}><StepBody step={step} st={st} /></div>
          {/* 하단 네비 */}
          <div className="flex items-center justify-between gap-2 px-5 py-4" style={{ borderTop: "1px solid " + LINE }}>
            <button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}
              className="flex items-center gap-1 px-3 py-2 text-[13px] font-semibold disabled:opacity-40"
              style={{ color: MUTE }}>
              <ChevronLeft className="h-4 w-4" /> 이전
            </button>
            {step < last ? (
              <button onClick={() => !blocked && setStep((s) => Math.min(last, s + 1))} disabled={blocked}
                className="flex items-center gap-1 px-5 py-2 text-[13px] font-bold text-white disabled:opacity-40"
                style={{ background: GOLD, borderRadius: RADIUS }}>
                {step === 0 ? "동의하고 시작" : step === previewStep ? "미리보기" : "다음"} <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button onClick={() => setStep(0)} className="px-5 py-2 text-[13px] font-bold" style={{ color: GOLD }}>처음으로</button>
            )}
          </div>
        </div>
        <p className="mt-4 text-center text-[11px] leading-relaxed" style={{ color: FAINT }}>
          ⚠️ 유저 주체(보호자 직접 / 직원 대행) 미확정 — 직원 대행이면 이 트랙은 <b>재생 전용</b>으로 축소됩니다. (IA §4)
        </p>
      </div>
    </div>
  );
}
