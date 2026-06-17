import React, { useState } from "react";
import { Check, Upload, Image, Film, Music, Play, ChevronLeft, ChevronRight, Heart } from "lucide-react";
import { SANS, SERIF, BG, SURFACE, LINE, LINE2, GOLD, GOLD_D, GOLD_SOFT, INK, MUTE, FAINT, STATUS, RADIUS } from "./theme.js";
import * as D from "./data.js";

const STEPS = D.USER_STEPS;

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

function StepBody({ step }) {
  if (step === 0)
    return (
      <div>
        <Title sub="소중한 기억을 영상으로 담기 위해 아래 동의가 필요합니다.">개인정보 활용 동의</Title>
        <div className="space-y-3 text-[12.5px] leading-relaxed" style={{ color: MUTE }}>
          <div className="px-4 py-3" style={{ background: "#f6f3ec", borderRadius: RADIUS, border: "1px solid " + LINE }}>
            <div className="mb-1.5 font-bold" style={{ color: INK }}>개인정보 수집·이용 동의 (필수)</div>
            <p>수집 항목: 고인·상주 성함, 사진/영상, 연락처, 편지 내용</p>
            <p>수집 목적: 추모 영상 제작 및 전달</p>
            <p>보유 기간: 제작 완료 후 30일 이내 삭제 (요청 시 즉시 삭제)</p>
          </div>
          <label className="flex items-center gap-2 text-[13px] font-semibold" style={{ color: INK }}>
            <span className="flex h-4 w-4 items-center justify-center rounded-sm" style={{ background: GOLD }}><Check className="h-3 w-3 text-white" strokeWidth={3} /></span>
            개인정보 수집·이용에 동의합니다 (필수)
          </label>
        </div>
      </div>
    );
  if (step === 1)
    return (
      <div>
        <Title sub="사진과 영상을 합쳐 최대 20개까지 업로드할 수 있습니다.">소스 업로드</Title>
        <div className="mb-3 flex flex-col items-center justify-center gap-1.5 py-7" style={{ border: "1.5px dashed " + LINE2, borderRadius: RADIUS, background: "#faf8f3" }}>
          <Upload className="h-6 w-6" style={{ color: GOLD }} />
          <span className="text-[12.5px] font-semibold" style={{ color: INK }}>사진·영상 끌어다 놓기</span>
          <span className="text-[11px]" style={{ color: FAINT }}>또는 눌러서 선택</span>
        </div>
        <div className="space-y-1.5">
          {D.USER_UPLOADS.map((u) => (
            <div key={u.id} className="flex items-center gap-2.5 px-3 py-2" style={{ background: SURFACE, border: "1px solid " + LINE, borderRadius: RADIUS }}>
              {u.kind === "photo" ? <Image className="h-4 w-4" style={{ color: MUTE }} /> : <Film className="h-4 w-4" style={{ color: MUTE }} />}
              <span className="flex-1 truncate text-[12.5px]" style={{ color: INK }}>{u.name}</span>
              <span className="text-[11px]" style={{ color: FAINT }}>{u.size}</span>
            </div>
          ))}
        </div>
      </div>
    );
  if (step === 2)
    return (
      <div>
        <Title sub="장면이 바뀔 때의 전환 효과를 선택합니다.">장면 전환</Title>
        <div className="grid grid-cols-2 gap-2.5">
          {["부드러운 페이드", "디졸브", "슬라이드", "전환 없음"].map((t, i) => (
            <div key={t} className="flex h-20 flex-col items-center justify-center gap-1.5" style={{ background: i === 0 ? GOLD_SOFT : SURFACE, border: "1px solid " + (i === 0 ? GOLD : LINE), borderRadius: RADIUS }}>
              <Film className="h-5 w-5" style={{ color: i === 0 ? GOLD_D : MUTE }} />
              <span className="text-[12px] font-semibold" style={{ color: i === 0 ? GOLD_D : INK }}>{t}</span>
            </div>
          ))}
        </div>
      </div>
    );
  if (step === 3)
    return (
      <div>
        <Title sub="추모 영상에 흐를 배경 음악을 고릅니다.">배경 음악</Title>
        <div className="space-y-2">
          {D.BGM.map((b, i) => (
            <div key={b.id} className="flex items-center gap-2.5 px-3 py-2.5" style={{ background: i === 0 ? GOLD_SOFT : SURFACE, border: "1px solid " + (i === 0 ? GOLD : LINE), borderRadius: RADIUS }}>
              <Play className="h-4 w-4" style={{ color: i === 0 ? GOLD_D : MUTE }} fill={i === 0 ? GOLD_D : "none"} />
              <span className="flex-1 text-[12.5px] font-semibold" style={{ color: INK }}>{b.name}</span>
              <span className="text-[11px]" style={{ color: FAINT }}>{b.meta}</span>
            </div>
          ))}
        </div>
      </div>
    );
  if (step === 4)
    return (
      <div>
        <Title sub="고인께 전하고 싶은 마음을 담아 주세요. 편지는 배경음과 함께 영상에 표시됩니다.">편지 작성</Title>
        <textarea defaultValue={D.EDITOR_LETTER} rows={7} className="w-full resize-none p-3 text-[13px] leading-relaxed outline-none"
          style={{ background: SURFACE, border: "1px solid " + LINE, borderRadius: RADIUS, color: INK, fontFamily: SERIF }} />
      </div>
    );
  if (step === 5)
    return (
      <div>
        <Title sub="제작될 추모 영상을 미리 확인합니다. (서버 렌더 영상 재생)">미리보기</Title>
        <div className="relative flex items-center justify-center" style={{ aspectRatio: "16/9", background: "#2a323d", borderRadius: RADIUS }}>
          <Play className="h-10 w-10 text-white" style={{ opacity: 0.85 }} fill="#fff" />
          <span className="absolute bottom-2 left-2 px-1.5 py-[2px] text-[9px] font-bold tracking-wider text-white" style={{ background: "rgba(0,0,0,.4)", borderRadius: 2 }}>16:9 · 1080p</span>
        </div>
        <div className="mt-3 text-center" style={{ fontFamily: SERIF, fontSize: 18, fontWeight: 700, color: INK }}>故 홍길동</div>
        <p className="mt-1 text-center text-[12px]" style={{ color: MUTE }}>타이틀 · 오프닝 · 추억 슬라이드 · AI 영상 · 편지</p>
      </div>
    );
  // step 6 — 영상 완료
  return (
    <div className="flex flex-col items-center py-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full" style={{ background: GOLD_SOFT }}>
        <Heart className="h-7 w-7" style={{ color: GOLD_D }} fill={GOLD_D} />
      </div>
      <h2 className="mt-4 text-[17px] font-bold" style={{ color: INK }}>추모 영상이 완성되었습니다</h2>
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
  return (
    <div className="flex items-start justify-center px-6 py-10" style={{ background: BG, minHeight: "calc(100vh - 44px)" }}>
      <div className="w-full" style={{ maxWidth: 390 }}>
        {/* 모바일 프레임 */}
        <div className="overflow-hidden" style={{ background: SURFACE, border: "1px solid " + LINE, borderRadius: 18, boxShadow: "0 10px 30px rgba(42,38,34,.10)" }}>
          {/* 헤더 */}
          <div className="px-5 py-4 text-center" style={{ background: "#f6f3ec", borderBottom: "1px solid " + LINE }}>
            <div className="text-[11px] font-semibold tracking-wide" style={{ color: GOLD_D }}>MEMORIA WORKS</div>
            <div className="mt-0.5 text-[14px] font-bold" style={{ color: INK }}>추모 영상 제작</div>
            <div className="mt-0.5 text-[11px]" style={{ color: FAINT }}>{step + 1} / {STEPS.length} · {STEPS[step]}</div>
          </div>
          <Stepper step={step} />
          <div className="px-5 py-5" style={{ minHeight: 360 }}><StepBody step={step} /></div>
          {/* 하단 네비 */}
          <div className="flex items-center justify-between gap-2 px-5 py-4" style={{ borderTop: "1px solid " + LINE }}>
            <button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}
              className="flex items-center gap-1 px-3 py-2 text-[13px] font-semibold disabled:opacity-40"
              style={{ color: MUTE }}>
              <ChevronLeft className="h-4 w-4" /> 이전
            </button>
            {step < STEPS.length - 1 ? (
              <button onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
                className="flex items-center gap-1 px-5 py-2 text-[13px] font-bold text-white"
                style={{ background: GOLD, borderRadius: RADIUS }}>
                {step === 0 ? "동의하고 시작" : step === 4 ? "미리보기" : "다음"} <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button onClick={() => setStep(0)} className="px-5 py-2 text-[13px] font-bold" style={{ color: GOLD }}>처음으로</button>
            )}
          </div>
        </div>
        <p className="mt-4 text-center text-[11px] leading-relaxed" style={{ color: FAINT }}>
          ⚠️ 유저 주체(유족 직접 / 직원 대행) 미확정 — 직원 대행이면 이 트랙은 <b>재생 전용</b>으로 축소됩니다. (IA §4)
        </p>
      </div>
    </div>
  );
}
