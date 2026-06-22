import React, { useEffect, useRef, useState } from "react";
import { Loader2, ShieldAlert, LogOut } from "lucide-react";
import { SANS, BG, INK, MUTE, NAVY } from "../theme.js";
import { getSession, onAuthChange, fetchProfile, signOut } from "../lib/auth.js";
import { actions } from "../store.js";
import { fetchOrgs } from "../lib/data/orgs.js";
import { fetchReservations } from "../lib/data/reservations.js";
import { fetchSecondJobs } from "../lib/data/secondjobs.js";
import { fetchTemplates } from "../lib/data/templates.js";
import { fetchSettlementItems, fetchDeposits, fetchStatements } from "../lib/data/settlements.js";
import { fetchConfig } from "../lib/data/config.js";
import { fetchContent } from "../lib/data/content.js";
import { fetchStorageClasses } from "../lib/data/system.js";
import { fetchStaff } from "../lib/data/accounts.js";
import { fetchDevices, fetchSources, fetchNotice } from "../lib/data/signage.js";
import { fetchRooms } from "../lib/data/rooms.js";
import { fetchLocks, acquireLock, heartbeatLock, releaseLock } from "../lib/data/locks.js";
import { fetchSubmissions } from "../lib/data/submissions.js";
import { fetchVideos } from "../lib/data/videos.js";
import { toast } from "../toast.jsx";
import Login from "./Login.jsx";
import AdminConsole from "../admin.jsx";
import PartnerConsole from "../partner.jsx";
import VideoEditor from "../editor.jsx";

function Splash() {
  return (
    <div style={{ minHeight: "100vh", background: BG, fontFamily: SANS, color: MUTE }}
         className="flex items-center justify-center gap-2 text-[13px]">
      <Loader2 className="h-4 w-4 animate-spin" /> 불러오는 중…
    </div>
  );
}

function NoAccess() {
  return (
    <div style={{ minHeight: "100vh", background: BG, fontFamily: SANS, color: INK }}
         className="flex items-center">
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "0 48px" }}>
        <div style={{ maxWidth: 420 }}>
          <ShieldAlert className="mb-3 h-7 w-7" style={{ color: "#b4452f" }} strokeWidth={1.8} />
          <h1 className="mb-1.5 text-[18px] font-bold">접근 권한이 없습니다</h1>
          <p className="mb-5 text-[13px]" style={{ color: MUTE }}>
            이 계정은 관리자·파트너 어느 콘솔에도 연결되어 있지 않습니다. 마스터 관리자에게 권한 부여를 요청하세요.
          </p>
          <button onClick={() => signOut()}
                  className="flex items-center gap-2 rounded-md px-4 text-[13px] font-bold text-white"
                  style={{ height: 40, background: NAVY }}>
            <LogOut className="h-4 w-4" /> 로그아웃
          </button>
        </div>
      </div>
    </div>
  );
}

// 운영(실로그인) 진입점. 세션 없으면 로그인, 있으면 신원별 콘솔.
export default function AuthGate({ mode }) {
  const [session, setSession] = useState(undefined); // undefined=로딩 · null=없음 · obj=있음
  const [profile, setProfile] = useState(null);
  const [resolving, setResolving] = useState(false);
  const [hydrated, setHydrated] = useState(false);   // staff: DB(사업부·파트너) 적재 완료
  const [editor, setEditor] = useState(null);
  const [asPartnerView, setAsPartnerView] = useState(null); // 마스터가 파트너 콘솔을 들여다보는 뷰(읽기)

  useEffect(() => {
    let alive = true;
    getSession().then((s) => { if (alive) setSession(s); });
    const off = onAuthChange((s) => { if (alive) setSession(s); });
    return () => { alive = false; off(); };
  }, []);

  useEffect(() => {
    if (session === undefined) return;
    if (!session) { setProfile(null); setHydrated(false); return; }
    let alive = true;
    setResolving(true);
    fetchProfile(session).then((p) => { if (alive) { setProfile(p); setResolving(false); } });
    return () => { alive = false; };
  }, [session]);

  // 로그인 → 신원별 DB 적재(렌더 전). staff=전체, partner=자기 스코프(RLS 자동).
  useEffect(() => {
    if (!profile || profile.kind === "none") return;
    let alive = true;
    const done = () => { if (alive) setHydrated(true); };
    const fail = (e) => { if (alive) { toast("데이터 로드 실패: " + e.message); setHydrated(true); } };
    if (profile.kind === "staff") {
      Promise.all([fetchOrgs(), fetchReservations(), fetchSecondJobs(), fetchTemplates(), fetchSettlementItems(), fetchConfig(), fetchContent(), fetchStorageClasses(), fetchStaff(), fetchDevices(), fetchDeposits(), fetchStatements(), fetchLocks(), fetchSubmissions(), fetchVideos()])
        .then(([o, reservations, secondJobs, templates, settlementItems, config, content, storageClasses, accounts, devices, deposits, statements, locks, submissions, videos]) => {
          if (!alive) return;
          actions.hydrateOrgs(o);
          actions.hydrateReservations(reservations);
          actions.hydrateSecondJobs(secondJobs);
          actions.hydrateTemplates(templates);
          actions.hydrateSettlementItems(settlementItems);
          actions.hydrateConfig(config);
          actions.hydrateContent(content);
          actions.hydrateStorageClasses(storageClasses);
          actions.hydrateAccounts(accounts);
          actions.hydrateDevices(devices);
          actions.hydrateSettlementExtra({ deposits, statements });
          actions.hydrateLocks(locks);
          actions.hydrateSubmissions(submissions);
          actions.hydrateVideos(videos);
          done();
        })
        .catch(fail);
    } else { // partner — RLS가 자기 파트너 데이터로 자동 스코핑
      actions.setCurrentPartner(profile.partner.id);
      Promise.all([fetchReservations(), fetchDevices(), fetchRooms(), fetchSources(), fetchNotice(), fetchSubmissions()])
        .then(([reservations, devices, rooms, sources, notice, submissions]) => {
          if (!alive) return;
          actions.hydrateReservations(reservations);
          actions.hydrateDevices(devices);
          actions.hydrateRooms(rooms);
          actions.hydrateSignage({ sources, notice });
          actions.hydrateSubmissions(submissions);
          done();
        })
        .catch(fail);
    }
    return () => { alive = false; };
  }, [profile]);

  // [Phase4-6 수정] 마스터 '파트너로 보기' — 그 파트너로 currentPartner 설정 + 호실·소스·알림 로드.
  //   (이게 있어야 라이브컨트롤 소스 등록·알림 저장이 그 파트너로 동작)
  useEffect(() => {
    if (profile?.kind !== "staff") return;
    if (!asPartnerView) { actions.setCurrentPartner(null); return; }
    const pid = asPartnerView.id;
    actions.setCurrentPartner(pid);
    let alive = true;
    Promise.all([fetchRooms(pid), fetchSources(pid), fetchNotice(pid)])
      .then(([rooms, sources, notice]) => { if (alive) { actions.hydrateRooms(rooms); actions.hydrateSignage({ sources, notice }); } })
      .catch((e) => toast("파트너 데이터 로드 실패: " + e.message));
    return () => { alive = false; };
  }, [asPartnerView, profile]);

  // 편집기 오버레이 동안 배경 스크롤 잠금(App과 동일)
  useEffect(() => {
    if (!editor) return;
    window.scrollTo(0, 0);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [editor]);

  // [Phase9] 편집기 열기/닫기 = 동시편집 잠금 획득/해제 + 하트비트.
  const hbRef = useRef(null);
  const lockRef = useRef(null);
  const openEditor = async (item) => {
    const it = item || {};
    const kind = it.secondJobId ? "second" : "reservation";
    const id = it.secondJobId || it.id;
    if (!id) { setEditor(it); return; }   // 새 건 등 — 잠금 대상 없음
    let r;
    try { r = await acquireLock(kind, id); }
    catch { toast("편집기를 여는 중 오류가 발생했습니다"); return; }
    if (!r?.ok) { toast((r?.holder ? r.holder + "님이 " : "") + "편집 중입니다"); actions.refreshLocks(); return; }
    lockRef.current = { kind, id };
    setEditor(it);
    actions.refreshLocks();
    hbRef.current = setInterval(() => heartbeatLock(kind, id).catch(() => {}), 60000);
  };
  const closeEditor = () => {
    if (hbRef.current) { clearInterval(hbRef.current); hbRef.current = null; }
    const lk = lockRef.current;
    if (lk) { releaseLock(lk.kind, lk.id).catch(() => {}); lockRef.current = null; actions.refreshLocks(); }
    setEditor(null);
  };

  if (session === undefined) return <Splash />;
  if (!session) return <Login mode={mode} />;
  if (resolving || profile === null) return <Splash />;
  if (profile.kind === "none") return <NoAccess />;
  if (!hydrated) return <Splash />;   // 신원별 데이터 적재 대기
  if (profile.kind === "partner") return <PartnerConsole sessionPartner={profile.partner} />;

  // 마스터 "파트너로 보기" — 진짜 세션 가장이 아니라 마스터 읽기권한으로 그 파트너 콘솔을 봄.
  // (예약 등 배선된 도메인은 그 파트너 것으로 정확히 필터; 미배선 도메인은 자리표시)
  if (asPartnerView) {
    return <PartnerConsole asPartner={asPartnerView} onBackToAdmin={() => setAsPartnerView(null)} />;
  }

  // staff 콘솔
  return (
    <div className="min-w-[1080px]" style={{ background: BG, minHeight: "100vh", fontFamily: SANS, color: INK }}>
      <AdminConsole sessionAccount={profile.account} onOpenEditor={openEditor} onLoginAsPartner={setAsPartnerView} />
      {editor && (
        <div className="fixed inset-0" style={{ zIndex: 40, background: BG }}>
          <VideoEditor reservation={editor} onClose={closeEditor} />
        </div>
      )}
    </div>
  );
}
