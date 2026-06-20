// 관리자 콘솔 셸 — 좌측 내비게이션 + 권한(perms) 기반 페이지 라우팅.
// 각 화면 컴포넌트는 admin/ 하위 도메인 파일에서 import. (분리 전 admin.jsx 단일 파일)
import React, { useState } from "react";
import {
  ChevronDown, Clapperboard, ClipboardList, Download, FolderOpen, HardDrive, KeyRound, LayoutGrid, LayoutTemplate, LogOut, MonitorPlay, Scissors, Settings, ShieldCheck, UserCircle, Users2, Wallet,
} from "lucide-react";
import { NAVY, BG, SURFACE, LINE, GOLD, GOLD_SOFT, INK, MUTE, FAINT, NAV_LINE } from "../theme.js";
import { Logo, NavItem, NavSection } from "../ui.jsx";
import { toast } from "../toast.jsx";
import { useStore } from "../store.js";
import * as D from "../data.js";
import { Dashboard } from "./overview.jsx";
import { PartnersManage } from "./partners.jsx";
import { Customers } from "./customers.jsx";
import { Production, SecondEdit } from "./production.jsx";
import { ContentHub } from "./content.jsx";
import { Templates } from "./templates.jsx";
import { Settlement } from "./settlement.jsx";
import { SettingsView, MySettings, AccountsManage } from "./settings.jsx";
import { Storage, Signage, Downloads } from "./system.jsx";
import { FormBuilder } from "./forms.jsx";

const ICON = { size: "h-4 w-4", sw: 1.9 };

// ── 현재 로그인 계정 (사이드바 좌상단 · 계정 전환은 목업) ──────────
function UserChip({ account, accounts, onSwitch }) {
  const [open, setOpen] = useState(false);
  const role = D.ADMIN_ROLES[account.role];
  return (
    <div className="relative px-4 pb-3 pt-3.5">
      <button onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2.5 px-2.5 py-2 text-left outline-none focus-visible:ring-1"
        style={{ background: "#202b3a", border: "1px solid " + NAV_LINE, borderRadius: 8 }}>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white" style={{ background: account.role === "master" ? GOLD : "#3f5e87" }}>{account.name.slice(0, 1)}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[12.5px] font-bold" style={{ color: "#eef0f3" }}>{account.name}</span>
          <span className="block text-[11px]" style={{ color: account.role === "master" ? "#d8b06a" : "#9aa6b6" }}>{role.label}</span>
        </span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0" style={{ color: "#79828f" }} />
      </button>
      {open && (
        <div className="absolute left-4 right-4 z-20 mt-1 overflow-hidden" style={{ background: SURFACE, border: "1px solid " + LINE, borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,.18)" }}>
          <div className="px-3 py-1.5 text-[10.5px] font-bold uppercase tracking-wide" style={{ color: FAINT, borderBottom: "1px solid " + LINE }}>계정 전환 · 목업</div>
          {accounts.filter((a) => a.status === "active").map((a) => (
            <button key={a.id} onClick={() => { onSwitch(a); setOpen(false); }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left outline-none" style={{ background: a.id === account.id ? GOLD_SOFT : "transparent" }}>
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ background: a.role === "master" ? GOLD : "#3f5e87" }}>{a.name.slice(0, 1)}</span>
              <span className="flex-1 text-[12.5px]" style={{ color: INK }}>{a.name}</span>
              <span className="text-[11px]" style={{ color: MUTE }}>{D.ADMIN_ROLES[a.role].label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminConsole({ onOpenEditor, onLoginAsPartner }) {
  const { accounts } = useStore();
  const [accountId, setAccountId] = useState(D.ADMIN_ACCOUNTS[0].id); // 기본: 마스터 관리자
  const account = accounts.find((a) => a.id === accountId) || accounts[0];
  const [page, setPage] = useState("overview");
  const [focus, setFocus] = useState(null); // 페이지 이동 시 특정 항목 포커스(예: 대시보드 최근예약 → 고객 상세)
  const go = (p, f = null) => { setPage(p); setFocus(f); };
  // 협력파트너(collab) = 영상 다운로드 전용 · 다운로드 페이지는 협력파트너 고유 · 내 설정은 모두 접근 · 마스터=풀 액세스
  const canFor = (a, k) => {
    if (a.role === "collab") return k === "downloads" || k === "mysettings";
    if (k === "downloads") return false;
    return k === "mysettings" || a.role === "master" || (a.perms || []).includes(k);
  };
  const can = (k) => canFor(account, k);
  const NAV_ORDER = ["downloads", "overview", "partners", "customers", "forms", "production", "secondedit", "templates", "content", "settlement", "mysettings", "accounts", "settings", "storage", "signage"];
  const switchAccount = (a) => { setAccountId(a.id); if (!canFor(a, page)) setPage(NAV_ORDER.find((k) => canFor(a, k)) || "mysettings"); };
  const activePage = can(page) ? page : (NAV_ORDER.find(can) || "mysettings"); // 권한 없는 페이지는 접근 가능한 첫 페이지로

  return (
    <div className="flex" style={{ minHeight: "calc(100vh - 44px)" }}>
      <aside className="flex w-60 flex-col" style={{ background: NAVY }}>
        <div className="flex items-center justify-center px-5" style={{ height: 76, background: NAVY, borderBottom: "1px solid " + NAV_LINE }}>
          <div className="flex items-center justify-center rounded-full bg-white px-5 py-2.5" style={{ cursor: "pointer" }} onClick={() => go("overview")}>
            <Logo height={30} />
          </div>
        </div>
        <UserChip account={account} accounts={accounts} onSwitch={switchAccount} />
        <nav className="flex-1 overflow-y-auto px-2.5 pb-4">
          {can("downloads") && <>
            <NavSection>협력파트너</NavSection>
            <NavItem icon={<Download className={ICON.size} strokeWidth={ICON.sw} />} label="영상 다운로드" active={activePage === "downloads"} onClick={() => go("downloads")} />
          </>}

          {(can("overview") || can("partners") || can("customers") || can("forms")) && <NavSection>총괄</NavSection>}
          {can("overview") && <NavItem icon={<LayoutGrid className={ICON.size} strokeWidth={ICON.sw} />} label="대시보드" active={activePage === "overview"} onClick={() => go("overview")} />}
          {can("partners") && <NavItem icon={<Users2 className={ICON.size} strokeWidth={ICON.sw} />} label="파트너사 관리" active={activePage === "partners"} onClick={() => go("partners")} />}
          {can("customers") && <NavItem icon={<UserCircle className={ICON.size} strokeWidth={ICON.sw} />} label="고객관리" active={activePage === "customers"} onClick={() => go("customers")} />}
          {can("forms") && <NavItem icon={<ClipboardList className={ICON.size} strokeWidth={ICON.sw} />} label="유저 입력 폼" active={activePage === "forms"} onClick={() => go("forms")} />}

          {(can("production") || can("secondedit") || can("templates") || can("content")) && <NavSection>추모영상 제작</NavSection>}
          {can("production") && <NavItem icon={<Clapperboard className={ICON.size} strokeWidth={ICON.sw} />} label="편집·컨펌" active={activePage === "production"} onClick={() => go("production")} />}
          {can("secondedit") && <NavItem icon={<Scissors className={ICON.size} strokeWidth={ICON.sw} />} label="2차 가공" active={activePage === "secondedit"} onClick={() => go("secondedit")} />}
          {can("templates") && <NavItem icon={<LayoutTemplate className={ICON.size} strokeWidth={ICON.sw} />} label="영상 템플릿" active={activePage === "templates"} onClick={() => go("templates")} />}
          {can("content") && <NavItem icon={<FolderOpen className={ICON.size} strokeWidth={ICON.sw} />} label="콘텐츠 허브" active={activePage === "content"} onClick={() => go("content")} />}

          {can("settlement") && <>
            <NavSection>정산</NavSection>
            <NavItem icon={<Wallet className={ICON.size} strokeWidth={ICON.sw} />} label="정산 내역" active={activePage === "settlement"} onClick={() => go("settlement")} />
          </>}

          <NavSection>환경설정</NavSection>
          <NavItem icon={<KeyRound className={ICON.size} strokeWidth={ICON.sw} />} label="내 설정" active={activePage === "mysettings"} onClick={() => go("mysettings")} />
          {can("accounts") && <NavItem icon={<ShieldCheck className={ICON.size} strokeWidth={ICON.sw} />} label="계정·권한" active={activePage === "accounts"} onClick={() => go("accounts")} />}
          {can("settings") && <NavItem icon={<Settings className={ICON.size} strokeWidth={ICON.sw} />} label="설정" active={activePage === "settings"} onClick={() => go("settings")} />}

          {(can("storage") || can("signage")) && <>
            <div className="my-3 border-t" style={{ borderColor: NAV_LINE }} />
            <NavSection>시스템 · 총관리자</NavSection>
            {can("storage") && <NavItem icon={<HardDrive className={ICON.size} strokeWidth={ICON.sw} />} label="스토리지" active={activePage === "storage"} onClick={() => go("storage")} />}
            {can("signage") && <NavItem icon={<MonitorPlay className={ICON.size} strokeWidth={ICON.sw} />} label="사이니지" active={activePage === "signage"} onClick={() => go("signage")} />}
          </>}
        </nav>
        <div className="px-2.5 pb-4 pt-2" style={{ borderTop: "1px solid " + NAV_LINE }}>
          <button onClick={() => toast("로그아웃되었습니다")} className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-[12.5px] font-semibold outline-none focus-visible:ring-1" style={{ color: "#9aa6b6" }}>
            <LogOut className={ICON.size} strokeWidth={ICON.sw} /> 로그아웃
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col" style={{ background: BG }}>
        <main className="flex-1 px-3 py-4" style={{ maxWidth: 1000 }}>
          {activePage === "downloads" && <Downloads />}
          {activePage === "overview" && <Dashboard go={go} />}
          {activePage === "partners" && <PartnersManage go={go} onLoginAsPartner={onLoginAsPartner} />}
          {activePage === "customers" && <Customers initialSel={focus} account={account} />}
          {activePage === "production" && <Production onOpenEditor={onOpenEditor} account={account} />}
          {activePage === "secondedit" && <SecondEdit onOpenEditor={onOpenEditor} account={account} />}
          {activePage === "templates" && <Templates />}
          {activePage === "content" && <ContentHub />}
          {activePage === "settlement" && <Settlement />}
          {activePage === "accounts" && <AccountsManage account={account} />}
          {activePage === "forms" && <FormBuilder />}
          {activePage === "settings" && <SettingsView account={account} />}
          {activePage === "mysettings" && <MySettings account={account} />}
          {activePage === "storage" && <Storage />}
          {activePage === "signage" && <Signage />}
        </main>
        <footer className="px-3 py-3 text-[11px]" style={{ color: FAINT, borderTop: "1px solid " + LINE }}>
          Memoriaworks · 관리자({D.ADMIN_ROLES[account.role].label}) · 목업 (실데이터 아님)
        </footer>
      </div>
    </div>
  );
}

