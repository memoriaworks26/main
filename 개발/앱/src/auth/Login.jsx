import React, { useState } from "react";
import { PawPrint, LogIn, Loader2, ShieldCheck, Store } from "lucide-react";
import {
  SANS, SERIF, BG, SURFACE, INK, MUTE, FAINT, LINE, LINE2,
  NAVY, GOLD, GOLD_D, GOLD_SOFT,
} from "../theme.js";
import { Logo } from "../ui.jsx";
import { signIn } from "../lib/auth.js";

// 관리자/파트너 공용 로그인 — 이메일+비번. mode로 문구만 분기.
// 콘텐츠는 좌측 정렬(오른쪽 채우지 않음). 웜 아이보리 + 네이비/골드.

// 포커스 링을 직접 그리는 입력 필드 (디자인 토큰 일관성 유지)
function Field({ label, ...rest }) {
  const [focus, setFocus] = useState(false);
  return (
    <div>
      <label className="mb-1.5 block text-[11.5px] font-semibold tracking-wide"
             style={{ color: focus ? GOLD_D : MUTE, transition: "color .15s" }}>
        {label}
      </label>
      <input
        {...rest}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        style={{
          width: "100%", height: 46, padding: "0 14px", fontSize: 14,
          border: `1px solid ${focus ? GOLD : LINE2}`, borderRadius: 9,
          background: focus ? "#fff" : SURFACE, color: INK, outline: "none",
          fontFamily: SANS,
          boxShadow: focus ? `0 0 0 3px ${GOLD_SOFT}` : "none",
          transition: "border-color .15s, box-shadow .15s, background .15s",
        }}
      />
    </div>
  );
}

export default function Login({ mode = "admin" }) {
  const [loginId, setLoginId] = useState("");
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isPartner = mode === "partner";
  const RoleIcon = isPartner ? Store : ShieldCheck;
  const title = isPartner ? "파트너 로그인" : "관리자 로그인";
  const sub = isPartner
    ? "장례식장 파트너 콘솔 — 자사 예약·사이니지 관리"
    : "메모리아웍스 운영 콘솔";

  const submit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError("");
    if (!loginId.trim() || !pw) { setError("아이디와 비밀번호를 입력해 주세요."); return; }
    setLoading(true);
    const r = await signIn(loginId, pw, mode);
    setLoading(false);
    if (!r.ok) setError(r.error || "로그인에 실패했습니다.");
    // 성공 시 AuthGate가 세션 변경을 감지해 콘솔로 전환.
  };

  return (
    <div
      className="flex items-center justify-center"
      style={{
        minHeight: "100vh", fontFamily: SANS, color: INK, padding: "0 24px",
        background: `radial-gradient(1200px 600px at 50% -10%, #f6f2ea 0%, ${BG} 55%)`,
      }}
    >
      <div className="w-full" style={{ maxWidth: 408 }}>
        <div>
          {/* 브랜드 */}
          <div className="mb-6 flex items-center gap-2.5">
            <div className="flex items-center justify-center rounded-full bg-white px-4 py-2"
                 style={{ border: `1px solid ${LINE}`, boxShadow: "0 1px 2px rgba(42,38,34,.05)" }}>
              <Logo height={26} />
            </div>
            <span className="inline-flex items-center justify-center rounded-full"
                  style={{ width: 30, height: 30, background: GOLD_SOFT }}>
              <PawPrint className="h-4 w-4" style={{ color: GOLD }} strokeWidth={2.2} />
            </span>
          </div>

          {/* 카드 */}
          <div
            style={{
              background: SURFACE, border: `1px solid ${LINE}`, borderRadius: 16,
              padding: "30px 30px 26px",
              boxShadow: "0 1px 2px rgba(42,38,34,.04), 0 24px 60px -28px rgba(42,38,34,.28)",
              position: "relative", overflow: "hidden",
            }}
          >
            {/* 상단 골드 액센트 */}
            <div style={{
              position: "absolute", top: 0, left: 0, right: 0, height: 3,
              background: `linear-gradient(90deg, ${GOLD} 0%, ${GOLD_D} 45%, transparent 100%)`,
            }} />

            <div className="mb-1 flex items-center gap-2">
              <RoleIcon className="h-[18px] w-[18px]" style={{ color: GOLD_D }} strokeWidth={2} />
              <h1 style={{ fontFamily: SERIF }} className="text-[22px] font-bold tracking-tight">{title}</h1>
            </div>
            <p className="mb-6 text-[12.5px]" style={{ color: MUTE }}>{sub}</p>

            <form onSubmit={submit} className="space-y-3.5">
              <Field label="아이디" type="text" autoComplete="username" value={loginId}
                     onChange={(e) => setLoginId(e.target.value)}
                     placeholder="아이디" autoFocus />
              <Field label="비밀번호" type="password" autoComplete="current-password" value={pw}
                     onChange={(e) => setPw(e.target.value)} placeholder="비밀번호" />

              {error && (
                <div className="rounded-md px-3 py-2 text-[12px] font-medium"
                     style={{ background: "#f6e9e4", color: "#b4452f" }}>
                  {error}
                </div>
              )}

              <button
                type="submit" disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-[10px] text-[14px] font-bold outline-none transition hover:opacity-95 focus-visible:ring-2"
                style={{
                  height: 48, marginTop: 6,
                  background: `linear-gradient(180deg, #20303f 0%, ${NAVY} 100%)`,
                  color: "#fff", letterSpacing: ".01em",
                  boxShadow: "0 8px 20px -10px rgba(24,34,48,.6)",
                  opacity: loading ? 0.7 : 1, cursor: loading ? "default" : "pointer",
                }}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" strokeWidth={2.2} />}
                {loading ? "로그인 중…" : "로그인"}
              </button>
            </form>
          </div>

          <p className="mt-5 text-[11px] leading-relaxed" style={{ color: FAINT }}>
            계정 문의는 {isPartner ? "메모리아웍스 운영팀" : "마스터 관리자"}에게 요청하세요.
            첫 로그인 후 ‘내 설정’에서 비밀번호를 변경하실 수 있습니다.
          </p>
        </div>
      </div>
    </div>
  );
}
