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

// ─────────────────────────────────────────────────────────────
// Memoria Works — 통합 인터페이스 (목업 / 권한 전환)
// 디자인: 디자인_가이드.md · IA: 메뉴구조_IA.md · 더미데이터
// 따뜻한 아이보리 + 네이비/골드 · 반려동물 이름 명조 · 빨강 배제 · lucide
// ─────────────────────────────────────────────────────────────

const MASTER_TABS = [
  { id: "admin", label: "관리자 권한", icon: Shield },
  { id: "partner", label: "파트너 권한", icon: Users },
  { id: "user", label: "유저 링크", icon: Link2 },
];

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

export default function App() {
  const [view, setView] = useState("admin");
  const [editor, setEditor] = useState(null); // null | reservation/room 객체
  const [asPartner, setAsPartner] = useState(null); // 관리자가 파트너로 접속 시 해당 파트너 객체

  const openEditor = (item) => setEditor(item || {});
  const closeEditor = () => setEditor(null);

  // 편집기(오버레이)가 열려 있는 동안 뒤 배경(메인창) 스크롤 잠금 — 상단 틈으로 비치지 않게 최상단 고정.
  useEffect(() => {
    if (!editor) return;
    window.scrollTo(0, 0);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [editor]);
  const switchView = (v) => { setAsPartner(null); setView(v); };
  const loginAsPartner = (partner) => { setAsPartner(partner); setView("partner"); };

  // 보호자 토큰 링크(/u/<token> 또는 ?t=)로 진입하면 마스터 내비 없이 유저 페이지만 노출.
  if (getToken()) {
    return (
      <div style={{ background: BG, minHeight: "100vh", fontFamily: SANS, color: INK }}>
        <UserMobile />
        <ToastHost />
        <ConfirmHost />
      </div>
    );
  }

  return (
    <div className="min-w-[1080px]" style={{ background: BG, minHeight: "100vh", fontFamily: SANS, color: INK }}>
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

      <MasterNav view={view} setView={switchView} />

      {/* 콘솔은 항상 마운트 유지 — 편집기는 위에 오버레이로 띄워, 닫으면(발행·컨펌·뒤로가기) 직전 화면(큐 등)으로 복귀 */}
      {view === "admin" && <AdminConsole onOpenEditor={openEditor} onLoginAsPartner={loginAsPartner} />}
      {view === "partner" && <PartnerConsole asPartner={asPartner} onBackToAdmin={asPartner ? () => switchView("admin") : null} />}
      {view === "user" && <UserMobile />}

      {editor && (
        <div className="fixed inset-x-0 bottom-0" style={{ top: 44, zIndex: 40, background: BG }}>
          <VideoEditor reservation={editor} onClose={closeEditor} />
        </div>
      )}
      <ToastHost />
      <ConfirmHost />
    </div>
  );
}
