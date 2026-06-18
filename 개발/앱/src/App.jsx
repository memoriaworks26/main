import React, { useState } from "react";
import { Shield, Users, Link2 } from "lucide-react";
import { SANS, MASTER, BG, INK, GOLD } from "./theme.js";
import AdminConsole from "./admin.jsx";
import PartnerConsole from "./partner.jsx";
import UserMobile from "./user.jsx";
import VideoEditor from "./editor.jsx";

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

  const openEditor = (item) => setEditor(item || {});
  const closeEditor = () => setEditor(null);

  return (
    <div className="min-w-[1080px]" style={{ background: BG, minHeight: "100vh", fontFamily: SANS, color: INK }}>
      <style>{`
        @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css');
        @import url('https://fonts.googleapis.com/css2?family=Nanum+Myeongjo:wght@400;700;800&display=swap');
        * { font-family: ${SANS}; }
        .mw-track { height: 3px; background: rgba(63,94,135,.18); overflow: hidden; border-radius: 2px; }
        .mw-fill { height: 100%; width: 40%; background: #3f5e87; animation: mw-move 1.4s ease-in-out infinite; }
        @keyframes mw-move { 0% { transform: translateX(-110%) } 100% { transform: translateX(320%) } }
        .mw-fade { animation: mw-fade .16s ease-out; }
        .mw-pop { animation: mw-pop .18s cubic-bezier(.2,.7,.3,1); }
        @keyframes mw-fade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes mw-pop { from { opacity: 0; transform: translateY(6px) scale(.985) } to { opacity: 1; transform: none } }
        @media (prefers-reduced-motion: reduce) { .mw-fill { animation: none; width: 100% } .mw-fade, .mw-pop { animation: none } }
        ::-webkit-scrollbar { width: 9px; height: 9px; }
        ::-webkit-scrollbar-thumb { background: #cfc8bb; border-radius: 5px; }
      `}</style>

      <MasterNav view={view} setView={setView} />

      {editor ? (
        <VideoEditor reservation={editor} onClose={closeEditor} />
      ) : (
        <>
          {view === "admin" && <AdminConsole onOpenEditor={openEditor} />}
          {view === "partner" && <PartnerConsole />}
          {view === "user" && <UserMobile />}
        </>
      )}
    </div>
  );
}
