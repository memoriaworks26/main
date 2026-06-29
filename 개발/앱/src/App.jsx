import React, { useState, useEffect } from "react";
import { Shield, Users, Link2 } from "lucide-react";
import { SANS, MASTER, BG, INK, GOLD } from "./theme.js";
import AdminConsole from "./admin.jsx";
import PartnerConsole from "./partner.jsx";
import UserMobile from "./user.jsx";
import VideoEditor from "./editor.jsx";
import { ToastHost } from "./toast.jsx";
import { ConfirmHost } from "./confirm.jsx";
import { getToken } from "./lib/userLink.js";
import { getSignageToken } from "./lib/signageLink.js";
import SignageDisplay from "./signage/Display.jsx";
import { DEV_PREVIEW } from "./lib/auth.js";
import AuthGate from "./auth/AuthGate.jsx";

// ─────────────────────────────────────────────────────────────
// Memoria Works — 진입 분기
//   1) /u/<token>  → 보호자 유저링크(비로그인)
//   2) DEV_PREVIEW → 목업 권한전환(개발용, VITE_DEV_PREVIEW=1)
//   3) 그 외(운영) → AuthGate(실제 Supabase Auth 로그인 → 신원별 콘솔)
// ─────────────────────────────────────────────────────────────

const MASTER_TABS = [
  { id: "admin", label: "관리자 권한", icon: Shield },
  { id: "partner", label: "파트너 권한", icon: Users },
  { id: "user", label: "유저 링크", icon: Link2 },
];

// 전역 스타일(애니메이션·스크롤바) — 목업·운영 모두에서 주입.
function AppStyles() {
  return (
    <style>{`
      * { font-family: ${SANS}; }
      .mw-track { height: 3px; background: rgba(63,94,135,.18); overflow: hidden; border-radius: 2px; }
      .mw-fill { height: 100%; width: 40%; background: #3f5e87; animation: mw-move 1.4s ease-in-out infinite; }
      @keyframes mw-move { 0% { transform: translateX(-110%) } 100% { transform: translateX(320%) } }
      .mw-fade { animation: mw-fade .16s ease-out; }
      .mw-pop { animation: mw-pop .18s cubic-bezier(.2,.7,.3,1); }
      @keyframes mw-fade { from { opacity: 0 } to { opacity: 1 } }
      @keyframes mw-pop { from { opacity: 0; transform: translateY(6px) scale(.985) } to { opacity: 1; transform: none } }
      @keyframes mw-eq { from { transform: scaleY(.35) } to { transform: scaleY(1) } }
      @media (prefers-reduced-motion: reduce) { .mw-fill { animation: none; width: 100% } .mw-fade, .mw-pop { animation: none } }
      ::-webkit-scrollbar { width: 9px; height: 9px; }
      ::-webkit-scrollbar-thumb { background: #cfc8bb; border-radius: 5px; }
    `}</style>
  );
}

function MasterNav({ view, setView }) {
  return (
    <div className="flex items-center justify-between px-5" style={{ background: MASTER, height: 44 }}>
      <div className="flex items-baseline gap-3">
        <span className="text-[13px] font-bold tracking-tight" style={{ color: "#eef0f3" }}>
          Memoria<span style={{ color: GOLD }}>works</span>
        </span>
        <span className="text-[10.5px]" style={{ color: "#5a6472" }}>권한별 화면 전환 · 목업</span>
      </div>
      <nav className="flex h-full items-stretch">
        {MASTER_TABS.map((t) => {
          const on = view === t.id;
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setView(t.id)}
              className="relative flex items-center gap-1.5 px-4 text-[12.5px] font-semibold outline-none transition focus-visible:ring-1"
              style={{ color: on ? "#fff" : "#79828f" }}>
              <Icon className="h-3.5 w-3.5" strokeWidth={2} />{t.label}
              {on && <span className="absolute inset-x-3 bottom-0" style={{ height: 2, background: GOLD }} />}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

// 개발용 목업(권한 전환) — 기존 동작 보존. VITE_DEV_PREVIEW=1 일 때만.
function MockupApp() {
  const [view, setView] = useState("admin");
  const [editor, setEditor] = useState(null);
  const [asPartner, setAsPartner] = useState(null);

  const openEditor = (item) => setEditor(item || {});
  const closeEditor = () => setEditor(null);

  useEffect(() => {
    if (!editor) return;
    window.scrollTo(0, 0);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [editor]);
  const switchView = (v) => { setAsPartner(null); setView(v); };
  const loginAsPartner = (partner) => { setAsPartner(partner); setView("partner"); };

  return (
    <div className="min-w-[1080px]" style={{ background: BG, minHeight: "100vh", fontFamily: SANS, color: INK }}>
      <MasterNav view={view} setView={switchView} />
      {view === "admin" && <AdminConsole onOpenEditor={openEditor} onLoginAsPartner={loginAsPartner} />}
      {view === "partner" && <PartnerConsole asPartner={asPartner} onBackToAdmin={asPartner ? () => switchView("admin") : null} />}
      {view === "user" && <UserMobile />}
      {editor && (
        <div className="fixed inset-x-0 bottom-0" style={{ top: 44, zIndex: 40, background: BG }}>
          <VideoEditor reservation={editor} onClose={closeEditor} />
        </div>
      )}
    </div>
  );
}

export default function App() {
  // 0) 사이니지 웹 디스플레이 — /s/<token> 호실 화면(비로그인·전체화면·폴링).
  if (getSignageToken()) {
    return <SignageDisplay />;
  }

  // 1) 보호자 토큰 링크 — 비로그인 유저 페이지만.
  if (getToken()) {
    return (
      <div style={{ background: BG, minHeight: "100vh", fontFamily: SANS, color: INK }}>
        <AppStyles />
        <UserMobile />
        <ToastHost />
        <ConfirmHost />
      </div>
    );
  }

  // 2) 개발용 목업 미리보기.
  if (DEV_PREVIEW) {
    return (
      <>
        <AppStyles />
        <MockupApp />
        <ToastHost />
        <ConfirmHost />
      </>
    );
  }

  // 3) 운영 — 실제 로그인. 경로로 관리자/파트너 구분.
  const mode = typeof window !== "undefined" && window.location.pathname.startsWith("/partner") ? "partner" : "admin";
  return (
    <>
      <AppStyles />
      <AuthGate mode={mode} />
      <ToastHost />
      <ConfirmHost />
    </>
  );
}
