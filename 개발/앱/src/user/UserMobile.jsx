// 유저(보호자) 모바일 위저드 — 셸. 헤더·진행바·단계 본문·하단 네비·문의처 푸터.
// 상태/제출 로직은 useUserWizard()(wizard.js), 단계 본문은 StepBody(steps.jsx)로 분리.
import React from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { SERIF, BG, SURFACE, LINE, GOLD, INK, MUTE, FAINT, RADIUS } from "../theme.js";
import { Logo } from "../ui.jsx";
import { BACKEND_LIVE } from "../lib/supabase.js";
import { USER_STEPS } from "../data.js";
import { useUserWizard } from "./wizard.js";
import { Stepper, ContactRow, PolicyModal } from "./parts.jsx";
import { StepBody } from "./steps.jsx";

const STEPS = USER_STEPS;

export default function UserMobile() {
  const { st, step, setStep, last, previewStep, blocked, submitting, liveMode, link, company, partners, doSubmit, policyOpen, setPolicyOpen } = useUserWizard();

  // 라이브에서 토큰이 유효하지 않거나 만료된 경우 — 안내 화면.
  if (link.ok === false || link.status === "expired") {
    return (
      <div className="flex items-start justify-center px-6 py-10" style={{ background: BG, minHeight: "calc(100vh - 44px)" }}>
        <div className="w-full" style={{ maxWidth: 390 }}>
          <div className="flex flex-col items-center px-6 py-10 text-center" style={{ background: SURFACE, border: "1px solid " + LINE, borderRadius: 18 }}>
            <Logo height={30} />
            <h2 className="mt-5 text-[16px] font-bold" style={{ color: INK }}>
              {link.status === "expired" ? "만료된 링크입니다" : "링크를 확인할 수 없습니다"}
            </h2>
            <p className="mt-2 text-[12.5px] leading-relaxed" style={{ color: MUTE }}>
              {link.status === "expired"
                ? "퇴실 처리로 링크가 만료되었습니다. 빈소에 문의해 주세요."
                : "주소가 올바른지 확인해 주세요. 계속 문제가 있으면 빈소에 문의해 주세요."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 장례식장(파트너) 고객센터 — 링크의 빈소명으로 스토어에서 매칭 (설정에서 편집한 값 반영)
  const partnerCs = partners.find((p) => p.name === link.partnerName) || null;

  return (
    <div className="flex items-start justify-center px-6 py-10" style={{ background: BG, minHeight: "calc(100vh - 44px)" }}>
      <div className="w-full" style={{ maxWidth: 390 }}>
        {/* 모바일 프레임 */}
        <div className="overflow-hidden" style={{ background: SURFACE, border: "1px solid " + LINE, borderRadius: 18, boxShadow: "0 10px 30px rgba(42,38,34,.10)" }}>
          {/* 헤더 */}
          <div className="flex flex-col items-center px-5 py-5 text-center" style={{ background: "#faf7f1", borderBottom: "1px solid " + LINE }}>
            <Logo height={30} />
            <div className="mt-2.5 text-[14px] font-bold" style={{ color: INK }}>
              {link.petName ? <><span style={{ fontFamily: SERIF }}>{link.petName}</span> 추모영상 제작</> : "추모영상 제작"}
            </div>
            {link.partnerName && <div className="mt-0.5 text-[11px]" style={{ color: MUTE }}>{link.partnerName}</div>}
            <div className="mt-0.5 text-[11px]" style={{ color: FAINT }}>{step + 1} / {STEPS.length} · {STEPS[step]}</div>
          </div>
          <Stepper step={step} />
          <div className="px-5 py-5" style={{ minHeight: 360 }}><StepBody step={step} st={st} /></div>
          {/* 하단 네비 — 첫 화면(동의)에는 '이전' 숨김 */}
          <div className="flex items-center justify-between gap-2 px-5 py-4" style={{ borderTop: "1px solid " + LINE }}>
            {step === 0 ? <span /> : (
              <button onClick={() => setStep((s) => Math.max(0, s - 1))}
                className="flex items-center gap-1 px-3 py-2 text-[13px] font-semibold"
                style={{ color: MUTE }}>
                <ChevronLeft className="h-4 w-4" /> 이전
              </button>
            )}
            {step < last ? (
              <button onClick={() => { if (blocked) return; if (step === previewStep) doSubmit(); else setStep((s) => Math.min(last, s + 1)); }} disabled={blocked}
                className="flex items-center gap-1 px-5 py-2 text-[13px] font-bold text-white disabled:opacity-40"
                style={{ background: GOLD, borderRadius: RADIUS }}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {step === 0 ? "동의하고 시작" : step === previewStep ? (submitting ? "제출 중…" : "영상 만들기") : "다음"}
                {!submitting && <ChevronRight className="h-4 w-4" />}
              </button>
            ) : (
              <button onClick={() => { if (liveMode) return; setStep(0); }} className="px-5 py-2 text-[13px] font-bold disabled:opacity-40" disabled={liveMode} style={{ color: GOLD }}>
                {liveMode ? "제출 완료" : "처음으로"}
              </button>
            )}
          </div>
        </div>
        {/* 문의처 푸터 — 장례식장(파트너) / 본사 구분 */}
        {(partnerCs?.csPhone || company.csPhone) && (
          <div className="mt-5 flex items-start justify-center gap-5 pt-4 text-center" style={{ borderTop: "1px solid " + LINE }}>
            {partnerCs?.csPhone && (
              <ContactRow label="장례식장" phone={partnerCs.csPhone} hours={partnerCs.csHours} />
            )}
            {partnerCs?.csPhone && company.csPhone && <div className="self-stretch" style={{ width: 1, background: LINE }} />}
            {company.csPhone && (
              <ContactRow label="본사" phone={company.csPhone} hours={company.csHours} />
            )}
          </div>
        )}
        <div className="mt-3 text-center">
          <button onClick={() => setPolicyOpen(true)} className="text-[11.5px] font-semibold underline outline-none" style={{ color: MUTE }}>개인정보처리방침</button>
        </div>
        <p className="mt-2 text-center text-[11px] leading-relaxed" style={{ color: FAINT }}>
          유저 주체 = <b>보호자 직접 제작</b> · {liveMode ? "라이브(백엔드 연결)" : BACKEND_LIVE ? "토큰 없음(데모 표시)" : "데모 모드 — .env 연결 시 실업로드·제출"}
        </p>
      </div>
      {policyOpen && <PolicyModal text={company.privacyPolicy} onClose={() => setPolicyOpen(false)} />}
    </div>
  );
}
