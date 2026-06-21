// 유저 위저드 — 프레젠테이션 조각 모음(상태 없음).
// Stepper(상단 진행)·Title·ContactRow(푸터 문의처)·PhotoExampleGuide(AI 가이드 예시)·PolicyModal(처리방침 전문).
import React from "react";
import { Check, Phone, X } from "lucide-react";
import { SURFACE, LINE, LINE2, GOLD, GOLD_D, INK, MUTE, FAINT, STATUS, RADIUS } from "../theme.js";
import { useEscape } from "../lib/hooks.js";
import { USER_STEPS } from "../data.js";
import dogGood from "../assets/dog-good.jpg"; // AI 변환 가이드 — 좋은 예(전신·정면·단독)
import dogBad from "../assets/dog-bad.jpg";   // 〃 — 나쁜 예(여러 마리·흐림)

const STEPS = USER_STEPS;

// 업로드 용량 문자열("12.3MB"/"1.2GB") → MB 숫자
export const parseMB = (s) => {
  const n = parseFloat(s);
  if (s.includes("GB")) return n * 1024;
  if (s.includes("MB")) return n;
  if (s.includes("KB")) return n / 1024;
  return 0;
};

// 상단 스텝퍼
export function Stepper({ step }) {
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

export function Title({ children, sub }) {
  return (
    <div className="mb-4">
      <h2 className="text-[17px] font-bold" style={{ color: INK }}>{children}</h2>
      {sub && <p className="mt-1 text-[12.5px] leading-relaxed" style={{ color: MUTE }}>{sub}</p>}
    </div>
  );
}

// 문의처 한 칸 (푸터용) — 라벨(장례식장/본사) 고객센터 · 이름 / 전화(탭하면 연결) / 운영시간
export function ContactRow({ label, name, phone, hours }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="text-[10.5px] font-semibold tracking-wide" style={{ color: MUTE }}>
        {label} 고객센터{name && <span style={{ color: FAINT, fontWeight: 400 }}> · {name}</span>}
      </div>
      <a href={`tel:${phone.replace(/[^0-9]/g, "")}`} className="inline-flex items-center gap-1.5 text-[13.5px] font-bold tabular-nums" style={{ color: INK }}>
        <Phone className="h-3.5 w-3.5" style={{ color: GOLD_D }} /> {phone}
      </a>
      {hours && <div className="text-[10.5px]" style={{ color: FAINT }}>{hours}</div>}
    </div>
  );
}

// 좋은/나쁜 사진 예시 — AI 변환 가이드. good/bad 사진은 사업부별 오버라이드(없으면 기본 강아지 사진).
export function PhotoExampleGuide({ good, bad }) {
  const Card = ({ src, badge, badgeColor, BadgeIcon, caption, imgStyle }) => (
    <div className="overflow-hidden" style={{ background: SURFACE, border: "1px solid " + LINE, borderRadius: RADIUS }}>
      <div className="relative overflow-hidden" style={{ aspectRatio: "1", background: "#e8e1d1" }}>
        <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" style={imgStyle} />
        <span className="absolute right-1.5 top-1.5 flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9.5px] font-bold text-white" style={{ background: badgeColor }}>
          <BadgeIcon className="h-2.5 w-2.5" strokeWidth={3} /> {badge}
        </span>
      </div>
      <div className="px-2 py-1.5 text-center text-[10.5px] font-semibold leading-snug" style={{ color: MUTE }}>{caption}</div>
    </div>
  );
  return (
    <div className="mb-3 grid grid-cols-2 gap-2">
      <Card src={good || dogGood} badge="좋은 예" badgeColor={STATUS.published.c} BadgeIcon={Check} caption="정면 · 또렷한 전신 · 한 마리" />
      <Card src={bad || dogBad} badge="피해주세요" badgeColor={FAINT} BadgeIcon={X} caption="흐릿함 · 여러 마리" imgStyle={bad ? undefined : { filter: "blur(1.6px) saturate(.9)", transform: "scale(1.1)" }} />
    </div>
  );
}

// 개인정보처리방침 전문 모달 — 동의란·푸터의 '전문 보기'에서 호출. 본문은 환경설정에서 편집한 회사 전문.
export function PolicyModal({ text, onClose }) {
  useEscape(onClose);
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center" style={{ background: "rgba(20,26,36,.5)" }} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="flex max-h-[85vh] w-full flex-col sm:max-w-md" style={{ background: SURFACE, border: "1px solid " + LINE, borderTopLeftRadius: 14, borderTopRightRadius: 14, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}>
        <div className="flex shrink-0 items-center justify-between px-5" style={{ height: 50, borderBottom: "1px solid " + LINE }}>
          <span className="text-[14px] font-bold" style={{ color: INK }}>개인정보처리방침</span>
          <button onClick={onClose} className="p-1" style={{ color: FAINT }} aria-label="닫기"><X className="h-4 w-4" /></button>
        </div>
        <div className="overflow-y-auto px-5 py-4 text-[12px] leading-relaxed" style={{ color: MUTE, whiteSpace: "pre-line" }}>
          {text || "등록된 개인정보처리방침이 없습니다."}
        </div>
        <div className="shrink-0 px-5 py-3" style={{ borderTop: "1px solid " + LINE }}>
          <button onClick={onClose} className="w-full py-2.5 text-[13px] font-bold text-white" style={{ background: GOLD, borderRadius: RADIUS }}>닫기</button>
        </div>
      </div>
    </div>
  );
}
