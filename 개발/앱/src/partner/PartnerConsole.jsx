// 파트너 콘솔 셸 — 좌측 내비 + 화면 라우팅 + PartnerCtx Provider(현재 파트너사 주입).
// 비밀번호 변경 모달(PwChangeModal) 포함. (분리 전 partner.jsx 단일 파일)
import React, { useState } from "react";
import {
  AlertTriangle, Check, FilePlus, LayoutGrid, ListChecks, Lock, LogOut, MonitorPlay, Settings, X,
} from "lucide-react";
import { NAVY, BG, LINE, LINE2, GOLD, GOLD_D, INK, MUTE, FAINT, NAV_LINE, RADIUS } from "../theme.js";
import { Logo, Btn, Card, PageHeader, NavItem, NavSection, Modal, PwField } from "../ui.jsx";
import { toast } from "../toast.jsx";
import { signOut, changePassword, DEV_PREVIEW } from "../lib/auth.js";
import { useStore, actions } from "../store.js";
import * as D from "../data.js";
import { PartnerCtx, ICON } from "./shared.jsx";
import { PDashboard } from "./dashboard.jsx";
import { Intake } from "./intake.jsx";
import { PList, ReservDetail } from "./reservations.jsx";
import { Live } from "./live.jsx";

function PwChangeModal({ open, onClose }) {
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);
  const reset = () => { setCur(""); setNext(""); setConfirm(""); setDone(false); };
  const close = () => { reset(); onClose(); };
  const [busy, setBusy] = useState(false);
  const err = !next ? "" : next.length < 8 ? "새 비밀번호는 8자 이상이어야 합니다." : (confirm && next !== confirm) ? "새 비밀번호가 일치하지 않습니다." : "";
  const ok = cur && next.length >= 8 && next === confirm && !busy;
  const submit = async () => {
    if (!ok) return;
    if (DEV_PREVIEW) { setDone(true); setTimeout(close, 1400); return; }
    setBusy(true);
    try { await changePassword(cur, next); setDone(true); setTimeout(close, 1400); }
    catch (e) { toast(e.message || "비밀번호 변경 실패"); }
    finally { setBusy(false); }
  };
  return (
    <Modal open={open} onClose={close} width={360}>
      <div className="flex items-center justify-between px-5" style={{ height: 50, borderBottom: "1px solid " + LINE }}>
        <span className="flex items-center gap-2 text-[14px] font-semibold" style={{ color: INK }}><Lock className="h-4 w-4" style={{ color: GOLD_D }} /> 비밀번호 변경</span>
        <button onClick={close} className="transition hover:opacity-70" style={{ color: MUTE }}><X className="h-4 w-4" /></button>
      </div>
      {done ? (
        <div className="flex flex-col items-center gap-2 px-5 py-8 text-center">
          <Check className="h-7 w-7" style={{ color: GOLD_D }} />
          <span className="text-[13px] font-semibold" style={{ color: INK }}>비밀번호가 변경되었습니다.</span>
        </div>
      ) : (
        <>
          <div className="space-y-3 px-5 py-4">
            <PwField label="현재 비밀번호" value={cur} onChange={setCur} />
            <PwField label="새 비밀번호 (8자 이상)" value={next} onChange={setNext} />
            <PwField label="새 비밀번호 확인" value={confirm} onChange={setConfirm} />
            {err && <div className="flex items-center gap-1.5 text-[12px]" style={{ color: "#c0392b" }}><AlertTriangle className="h-3.5 w-3.5" /> {err}</div>}
          </div>
          <div className="flex items-center justify-end gap-2 px-5" style={{ height: 56, borderTop: "1px solid " + LINE }}>
            <Btn size="sm" variant="ghost" onClick={close}>취소</Btn>
            <Btn size="sm" onClick={submit} disabled={!ok}>변경</Btn>
          </div>
        </>
      )}
    </Modal>
  );
}

// ── 고객센터 (보호자 문의처) — 파트너가 자사 번호 등록 → 유저링크 하단 '장례식장' 문의처에 노출 ──
function PartnerCsCard({ partnerId }) {
  const { partners } = useStore();
  const live = partners.find((p) => p.id === partnerId) || {};
  const [phone, setPhone] = useState(live.csPhone || "");
  const [hours, setHours] = useState(live.csHours || "");

  const dirty = phone.trim() !== (live.csPhone || "") || hours.trim() !== (live.csHours || "");
  const save = () => {
    actions.updatePartner(partnerId, { csPhone: phone.trim(), csHours: hours.trim() });
    toast("고객센터 정보가 저장되었습니다 — 보호자 화면 문의처에 반영됩니다");
  };

  return (
    <Card title="고객센터 (보호자 문의처)">
      <div className="text-[12px]" style={{ color: MUTE }}>
        보호자가 보는 영상제작 화면 하단에 <b style={{ color: INK }}>장례식장 문의처</b>로 표시됩니다. (본사 고객센터와 함께 노출)
      </div>
      <div className="mt-3 max-w-md space-y-3">
        <label className="block">
          <div className="mb-1 text-[12px] font-semibold" style={{ color: MUTE }}>전화번호</div>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="예: 061-352-0444"
            className="w-full px-3 text-[13px] tabular-nums outline-none" style={{ height: 36, background: "#fff", border: "1px solid " + LINE2, borderRadius: RADIUS, color: INK }} />
        </label>
        <label className="block">
          <div className="mb-1 text-[12px] font-semibold" style={{ color: MUTE }}>운영시간 <span style={{ color: FAINT }}>(선택)</span></div>
          <input value={hours} onChange={(e) => setHours(e.target.value)} placeholder="예: 연중무휴 09:00–20:00"
            className="w-full px-3 text-[13px] outline-none" style={{ height: 36, background: "#fff", border: "1px solid " + LINE2, borderRadius: RADIUS, color: INK }} />
        </label>
        <div className="flex items-center gap-2">
          <Btn size="sm" onClick={save} disabled={!dirty || !phone.trim()}><Check className="h-4 w-4" /> 저장</Btn>
          {dirty && <span className="text-[11px]" style={{ color: FAINT }}>저장하지 않은 변경사항</span>}
        </div>
      </div>
    </Card>
  );
}

export default function PartnerConsole({ asPartner, onBackToAdmin, sessionPartner }) {
  const live = !!sessionPartner;                       // 실로그인 파트너 세션(운영) 여부
  const partner = sessionPartner || asPartner || D.PARTNERS[0];
  const [page, setPage] = useState("dashboard");
  const [detail, setDetail] = useState(null);
  const [intakePrefill, setIntakePrefill] = useState(null); // 호실 카드 신규예약 프리필(호실·현재 시각)
  const [pwOpen, setPwOpen] = useState(false);
  const go = (p) => { setDetail(null); setPage(p); };
  // 예약 접수 이동 + 프리필(호실 카드 신규예약 → 해당 호실·현재 시각). prefill에 room 없으면 무시.
  const goIntake = (prefill) => { setDetail(null); setIntakePrefill(prefill && prefill.room ? prefill : null); setPage("intake"); };
  const openDetail = (r) => setDetail(r); // 현재 화면 위에 상세 오버레이 (대시보드·예약 목록 공용)

  return (
    <PartnerCtx.Provider value={partner}>
    <div>
      {asPartner && (
        <div className="flex items-center gap-2 px-5 py-2" style={{ background: "#1e2c3d", borderBottom: "1.5px solid " + GOLD }}>
          <Lock className="h-3.5 w-3.5 shrink-0" style={{ color: GOLD }} />
          <span className="text-[12.5px] font-bold" style={{ color: GOLD }}>관리자 권한으로 접속중입니다</span>
          <span className="text-[12px]" style={{ color: "#79828f" }}>— {asPartner.name} ({asPartner.idCode})</span>
        </div>
      )}
      <div className="flex" style={{ minHeight: asPartner ? "calc(100vh - 44px - 37px)" : "calc(100vh - 44px)" }}>
      <aside className="flex w-60 flex-col" style={{ background: NAVY }}>
        <div className="flex items-center justify-center px-5" style={{ height: 76, background: NAVY, borderBottom: "1px solid " + NAV_LINE }}>
          <div className="flex items-center justify-center rounded-full bg-white px-5 py-2.5" style={{ cursor: "pointer" }} onClick={() => onBackToAdmin ? onBackToAdmin() : go("dashboard")}>
            {/* 파트너사 로고가 있으면 그것을, 없으면 메모리아웍스 로고 */}
            {partner.logo
              ? <img src={partner.logo} alt={partner.name} style={{ height: 30, maxWidth: 150, width: "auto", objectFit: "contain", display: "block" }} />
              : <Logo height={30} />}
          </div>
        </div>
        <div className="px-4 pb-3 pt-3.5">
          <div className="text-[15px] font-bold" style={{ color: "#eef0f3" }}>{partner.name}</div>
          <div className="text-[11px]" style={{ color: "#828c9b" }}>{partner.region} · 파트너 콘솔</div>
        </div>
        <nav className="flex-1 overflow-y-auto px-2.5 pb-4">
          <NavSection>운영</NavSection>
          <NavItem icon={<LayoutGrid className={ICON} strokeWidth={1.9} />} label="통합 대시보드" active={page === "dashboard"} onClick={() => go("dashboard")} />
          <NavItem icon={<FilePlus className={ICON} strokeWidth={1.9} />} label="예약 접수" active={page === "intake"} onClick={() => go("intake")} />
          <NavItem icon={<ListChecks className={ICON} strokeWidth={1.9} />} label="예약 목록" active={page === "list"} onClick={() => go("list")} />
          <NavItem icon={<MonitorPlay className={ICON} strokeWidth={1.9} />} label="라이브 컨트롤" active={page === "live"} onClick={() => go("live")} />


          <div className="my-3 border-t" style={{ borderColor: NAV_LINE }} />
          <NavSection>설정</NavSection>
          <NavItem icon={<Settings className={ICON} strokeWidth={1.9} />} label="설정" active={page === "settings"} onClick={() => go("settings")} />
        </nav>
        <div className="px-2.5 pb-2 pt-2" style={{ borderTop: "1px solid " + NAV_LINE }}>
          <button onClick={() => live ? signOut() : toast("로그아웃되었습니다")} className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-[12.5px] font-semibold outline-none focus-visible:ring-1" style={{ color: "#9aa6b6" }}>
            <LogOut className={ICON} strokeWidth={1.9} /> 로그아웃
          </button>
        </div>
        <div className="px-4 pb-3 text-[10px]" style={{ color: "#566073" }}>자사 테넌트로 스코핑 (멀티테넌트)</div>
      </aside>
      <div className="flex flex-1 flex-col" style={{ background: BG }}>
        <main className="flex-1 py-4 pl-2 pr-4">
          {detail ? <ReservDetail reserv={detail} onBack={() => setDetail(null)} /> : <>
          {page === "dashboard" && <PDashboard onNew={goIntake} onDetail={openDetail} />}
          {page === "intake" && <Intake prefill={intakePrefill} />}
          {page === "list" && <PList onDetail={openDetail} onNew={() => goIntake()} />}
          {page === "live" && <Live />}
          {page === "settings" && (
            <div>
              <PageHeader title="설정" sub="자사 정보 · 고객센터 · 고유 코드 · 비밀번호" />
              <div className="mb-4"><PartnerCsCard partnerId={partner.id} /></div>
              <div className="grid grid-cols-2 gap-4">
                <Card title="파트너사 정보">
                  <div className="space-y-2.5 text-[13px]" style={{ color: INK }}>
                    <div className="flex justify-between"><span style={{ color: MUTE }}>상호</span><span className="font-semibold">{partner.name}</span></div>
                    <div className="flex justify-between"><span style={{ color: MUTE }}>지역</span><span>{partner.region}</span></div>
                    <div className="flex justify-between"><span style={{ color: MUTE }}>담당자</span><span>{partner.manager}</span></div>
                    <div className="flex justify-between"><span style={{ color: MUTE }}>호실 수</span><span className="tabular-nums">{partner.rooms}실</span></div>
                  </div>
                </Card>
                <Card title="계정 · 비밀번호">
                  <div className="space-y-2.5 text-[13px]" style={{ color: INK }}>
                    <div className="flex justify-between"><span style={{ color: MUTE }}>ID 코드 (로그인)</span><span className="font-semibold" style={{ color: GOLD_D }}>{partner.idCode}</span></div>
                    <div className="flex justify-between"><span style={{ color: MUTE }}>고유 코드</span><span className="tabular-nums" style={{ color: MUTE }}>{partner.id}</span></div>
                    <div className="flex justify-between"><span style={{ color: MUTE }}>초기 비밀번호</span><span className="font-semibold tabular-nums" style={{ color: GOLD_D }}>{partner.idCode}</span></div>
                    <div className="flex items-center justify-between"><span style={{ color: MUTE }}>비밀번호</span><Btn size="sm" variant="ghost" onClick={() => setPwOpen(true)}>변경</Btn></div>
                  </div>
                </Card>
              </div>
            </div>
          )}
          </>}
        </main>
        <footer className="px-3 py-3 text-[11px]" style={{ color: FAINT, borderTop: "1px solid " + LINE }}>
          Memoriaworks · 파트너 권한{live ? "" : " · 목업 (실데이터 아님)"}
        </footer>
        <PwChangeModal open={pwOpen} onClose={() => setPwOpen(false)} />
      </div>
    </div>
    </div>
    </PartnerCtx.Provider>
  );
}
