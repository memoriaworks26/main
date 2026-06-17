import React, { useState } from "react";
import {
  LayoutGrid, MonitorPlay, FileText, Clapperboard, Film, FolderOpen,
  Link2, Wallet, Settings, Bell, Search, Shield, Server, Cpu, Plus,
  Image, Music, MessageSquare, Users, HardDrive, RefreshCw, ChevronRight,
} from "lucide-react";
import {
  NAVY, BG, SURFACE, LINE, LINE2, GOLD, GOLD_SOFT, GOLD_D, INK, MUTE, FAINT,
  NAV_LINE, STATUS, SERIF, RADIUS,
} from "./theme.js";
import {
  Tag, Btn, Card, Metric, MetricRow, Summary, Table, PageHeader, NavItem,
  NavSection, Placeholder, Deceased,
} from "./ui.jsx";
import { RoomCard } from "./roomcard.jsx";
import * as D from "./data.js";

// ── 현황판 ─────────────────────────────────────────────────────
function Dashboard({ onOpenEditor }) {
  const cases = D.ROOMS.filter((r) => r.type === "case");
  const n = (s) => cases.filter((r) => r.status === s).length;
  return (
    <div>
      <PageHeader
        title="빈소 현황"
        right={
          <>
            <div className="flex items-center px-3" style={{ height: 36, width: 232, background: SURFACE, border: "1px solid " + LINE, borderRadius: RADIUS }}>
              <Search className="h-4 w-4" style={{ color: FAINT }} strokeWidth={1.9} />
              <input className="ml-2 w-full bg-transparent text-[13px] outline-none" placeholder="상주·고인 검색" style={{ color: INK }} />
            </div>
            <Btn onClick={() => onOpenEditor(D.RESERVATIONS[1])}><Plus className="h-4 w-4" strokeWidth={2.2} /> 추모영상 만들기</Btn>
          </>
        }
      />
      <div className="mb-4">
        <Summary items={[["진행 중 빈소", cases.length], ["컨펌 대기", n("review")], ["제작 중", n("rendering")], ["발행 완료", n("published")]]} />
      </div>
      <div className="flex flex-wrap gap-3.5">
        {D.ROOMS.map((r) => <RoomCard key={r.id} room={r} onOpen={() => onOpenEditor(r)} />)}
      </div>
    </div>
  );
}

// ── 사이니지 ───────────────────────────────────────────────────
function Signage() {
  const cols = [
    { key: "id", label: "디바이스" }, { key: "room", label: "호실" },
    { key: "status", label: "상태" }, { key: "playing", label: "표출 중" },
    { key: "ip", label: "IP" }, { key: "act", label: "", align: "right" },
  ];
  return (
    <div>
      <PageHeader title="사이니지" sub="라즈베리파이 디바이스 매핑 · 재생 · 온라인 상태 (udev·systemd · 네트워크 독립)" right={<Btn size="sm" variant="ghost"><RefreshCw className="h-3.5 w-3.5" /> 상태 새로고침</Btn>} />
      <Table cols={cols} rows={D.DEVICES} renderCell={(r, k) =>
        k === "status" ? <Tag s={r.status} /> :
        k === "act" ? <button className="text-[12px] font-semibold" style={{ color: GOLD }}>제어</button> :
        k === "ip" ? <span className="tabular-nums">{r.ip}</span> : r[k]
      } />
      <p className="mt-3 text-[11px]" style={{ color: FAINT }}>※ 사이니지 범위(영상 루프만 / 정보안내 화면도)는 메모리아웍스 확인 항목(⚠️E).</p>
    </div>
  );
}

// ── 예약·접수 ──────────────────────────────────────────────────
function Reservations({ onOpenEditor }) {
  const [filter, setFilter] = useState("all");
  const rows = D.RESERVATIONS.filter((r) => filter === "all" || r.status === filter);
  const cols = [
    { key: "deceased", label: "고인" }, { key: "chief", label: "상주" },
    { key: "phone", label: "연락처" }, { key: "room", label: "호실" },
    { key: "time", label: "일정" }, { key: "video", label: "영상" }, { key: "act", label: "", align: "right" },
  ];
  const filters = [["all", "전체"], ["review", "컨펌대기"], ["rendering", "제작중"], ["published", "발행완료"]];
  return (
    <div>
      <PageHeader title="예약·접수" sub="추모영상 폼 접수 → 자동 렌더 → 컨펌 요청" right={<Btn><Plus className="h-4 w-4" strokeWidth={2.2} /> 폼 접수</Btn>} />
      <div className="mb-3 flex gap-1.5">
        {filters.map(([k, label]) => (
          <button key={k} onClick={() => setFilter(k)} className="px-3 py-1.5 text-[12px] font-semibold transition" style={{ borderRadius: RADIUS, background: filter === k ? GOLD_SOFT : SURFACE, color: filter === k ? GOLD_D : MUTE, border: "1px solid " + (filter === k ? GOLD_SOFT : LINE) }}>{label}</button>
        ))}
      </div>
      <Table cols={cols} rows={rows} renderCell={(r, k) =>
        k === "deceased" ? <span style={{ fontFamily: SERIF, fontWeight: 700 }}>{r.deceased}</span> :
        k === "video" ? <Tag s={r.status} /> :
        k === "act" ? <button onClick={() => onOpenEditor(r)} className="text-[12px] font-semibold" style={{ color: GOLD }}>{r.status === "review" ? "컨펌" : "열기"}</button> : r[k]
      } />
    </div>
  );
}

// ── 편집·컨펌 ──────────────────────────────────────────────────
function Producing({ onOpenEditor }) {
  return (
    <div>
      <PageHeader title="편집·컨펌" sub="블록 편집기 + 미리보기(서버 렌더 영상 재생) + 컨펌" />
      <div className="grid grid-cols-2 gap-4">
        {D.RESERVATIONS.map((r) => (
          <div key={r.id} className="flex items-center justify-between px-4 py-3.5" style={{ background: SURFACE, border: "1px solid " + LINE, borderRadius: RADIUS }}>
            <div>
              <Deceased name={r.deceased} />
              <div className="mt-1 text-[12px]" style={{ color: MUTE }}>{r.room} · 상주 {r.chief}</div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Tag s={r.status} />
              <Btn size="sm" variant="ghost" onClick={() => onOpenEditor(r)}>편집기 열기 <ChevronRight className="h-3.5 w-3.5" /></Btn>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 콘텐츠 허브 ────────────────────────────────────────────────
function ContentHub() {
  return (
    <div>
      <PageHeader title="콘텐츠 허브" sub="클립·사진 선업로드 자산 풀 (블록 '클립'에서 선택)" right={<Btn size="sm"><Plus className="h-4 w-4" /> 자산 업로드</Btn>} />
      <div className="grid grid-cols-4 gap-3">
        {D.CONTENT.map((c) => (
          <div key={c.id} className="overflow-hidden" style={{ background: SURFACE, border: "1px solid " + LINE, borderRadius: RADIUS }}>
            <div className="flex h-28 items-center justify-center" style={{ background: c.kind === "clip" ? "#d9d6cd" : "#eef0f2" }}>
              {c.kind === "clip" ? <Clapperboard className="h-6 w-6" style={{ color: NAVY, opacity: 0.5 }} /> : <Image className="h-6 w-6" style={{ color: NAVY, opacity: 0.5 }} />}
            </div>
            <div className="px-3 py-2">
              <div className="truncate text-[12.5px] font-semibold" style={{ color: INK }}>{c.name}</div>
              <div className="mt-0.5 text-[11px]" style={{ color: FAINT }}>{c.meta} · {c.size}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 외부 링크 ──────────────────────────────────────────────────
function ExternalLinks() {
  const cols = [
    { key: "deceased", label: "고인" }, { key: "url", label: "링크(HLS)" },
    { key: "issued", label: "발행" }, { key: "expires", label: "만료" },
    { key: "views", label: "조회", align: "right" }, { key: "status", label: "상태" },
  ];
  return (
    <div>
      <PageHeader title="외부 링크" sub="발행 HLS 링크 · 토큰 · 만료 관리 (서명 URL · 퇴실 시 무효화)" />
      <Table cols={cols} rows={D.LINKS} renderCell={(r, k) =>
        k === "deceased" ? <span style={{ fontFamily: SERIF, fontWeight: 700 }}>{r.deceased}</span> :
        k === "url" ? <span className="tabular-nums" style={{ color: GOLD }}>{r.url}</span> :
        k === "status" ? <Tag s={r.status} /> :
        k === "views" ? <span className="tabular-nums">{r.views}</span> : r[k]
      } />
    </div>
  );
}

// ── 정산 ───────────────────────────────────────────────────────
function Settlement() {
  const [tab, setTab] = useState("partner");
  const total = D.SETTLEMENT_PARTNERS.reduce((s, p) => s + p.billed, 0);
  const paid = D.SETTLEMENT_PARTNERS.reduce((s, p) => s + p.paid, 0);
  const unpaid = D.SETTLEMENT_PARTNERS.reduce((s, p) => s + p.unpaid, 0);
  const won = (v) => v.toLocaleString() + "원";
  const pCols = [
    { key: "partner", label: "파트너사" }, { key: "count", label: "건", align: "right" },
    { key: "billed", label: "청구", align: "right" }, { key: "paid", label: "입금", align: "right" },
    { key: "unpaid", label: "미수금", align: "right" }, { key: "status", label: "상태" },
  ];
  const iCols = [
    { key: "deceased", label: "고인" }, { key: "chief", label: "상주" }, { key: "partner", label: "파트너사" },
    { key: "date", label: "예약일" }, { key: "amount", label: "금액(스냅샷)", align: "right" }, { key: "status", label: "정산" },
  ];
  return (
    <div>
      <PageHeader title="정산 내역" sub="단가 스냅샷 · 거래명세서(발행 시 동결) · 메일 발송" right={<><Btn size="sm" variant="ghost"><FileText className="h-3.5 w-3.5" /> 거래명세서</Btn><Btn size="sm" variant="neutral">엑셀</Btn></>} />
      <div className="mb-4">
        <MetricRow items={[
          { label: "이번달 총 청구", value: won(total), sub: "VAT 별도" },
          { label: "정산 완료", value: won(paid), accent: STATUS.done.c },
          { label: "미수금", value: won(unpaid), accent: STATUS.waiting.c, sub: "확인 필요" },
        ]} />
      </div>
      <div className="mb-3 flex gap-1.5">
        {[["partner", "파트너사별"], ["item", "예약 건별"]].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className="px-3 py-1.5 text-[12px] font-semibold" style={{ borderRadius: RADIUS, background: tab === k ? GOLD_SOFT : SURFACE, color: tab === k ? GOLD_D : MUTE, border: "1px solid " + (tab === k ? GOLD_SOFT : LINE) }}>{l}</button>
        ))}
      </div>
      {tab === "partner" ? (
        <Table cols={pCols} rows={D.SETTLEMENT_PARTNERS} renderCell={(r, k) =>
          k === "status" ? <Tag s={r.status} /> :
          ["billed", "paid", "unpaid"].includes(k) ? <span className="tabular-nums">{r[k] ? won(r[k]) : "—"}</span> :
          k === "count" ? <span className="tabular-nums">{r.count}건</span> : r[k]
        } />
      ) : (
        <Table cols={iCols} rows={D.SETTLEMENT_ITEMS} renderCell={(r, k) =>
          k === "deceased" ? <span style={{ fontFamily: SERIF, fontWeight: 700 }}>{r.deceased}</span> :
          k === "status" ? <Tag s={r.status} /> :
          k === "amount" ? <span className="tabular-nums">{won(r.amount)}</span> : r[k]
        } />
      )}
    </div>
  );
}

// ── 환경설정 (탭) ──────────────────────────────────────────────
function SettingsView() {
  const tabs = ["템플릿", "AI 프롬프트", "BGM 라이브러리", "알림", "사용자·권한", "디바이스 등록"];
  const [t, setT] = useState(tabs[0]);
  return (
    <div>
      <PageHeader title="환경설정" sub="관리자 전용 — 제작 규칙·자원·테넌트 관리" />
      <div className="mb-4 flex flex-wrap gap-1.5">
        {tabs.map((x) => (
          <button key={x} onClick={() => setT(x)} className="px-3 py-1.5 text-[12px] font-semibold" style={{ borderRadius: RADIUS, background: t === x ? GOLD_SOFT : SURFACE, color: t === x ? GOLD_D : MUTE, border: "1px solid " + (t === x ? GOLD_SOFT : LINE) }}>{x}</button>
        ))}
      </div>

      {t === "템플릿" && (
        <div className="space-y-3">
          {D.TEMPLATES.map((tpl) => (
            <Card key={tpl.id} title={tpl.partner + " · " + tpl.name}>
              <div className="flex items-center gap-2">
                {tpl.blocks.map((b, i) => (
                  <React.Fragment key={i}>
                    <span className="px-2.5 py-1 text-[12px] font-semibold" style={{ background: GOLD_SOFT, color: GOLD_D, borderRadius: RADIUS }}>{b}</span>
                    {i < tpl.blocks.length - 1 && <ChevronRight className="h-3.5 w-3.5" style={{ color: FAINT }} />}
                  </React.Fragment>
                ))}
                <span className="ml-2 text-[11px]" style={{ color: FAINT }}>순서 고정 — 어드민은 블록 내부 소스만 수정</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {t === "AI 프롬프트" && (
        <div className="space-y-2.5">
          {D.PROMPTS.map((p) => (
            <div key={p.id} className="px-4 py-3" style={{ background: SURFACE, border: "1px solid " + LINE, borderRadius: RADIUS }}>
              <div className="flex items-center gap-2">
                <span className="px-2 py-[2px] text-[11px] font-bold" style={{ background: "#e9eef5", color: "#3f5e87", borderRadius: 3 }}>{p.target}</span>
                <span className="text-[13px] font-semibold" style={{ color: INK }}>{p.name}</span>
              </div>
              <div className="mt-1.5 text-[12px] leading-relaxed" style={{ color: MUTE }}>{p.body}</div>
            </div>
          ))}
          <p className="text-[11px]" style={{ color: FAINT }}>※ 리스트 선택형 — 유저/어드민은 정의된 프롬프트 중 선택.</p>
        </div>
      )}

      {t === "BGM 라이브러리" && (
        <div className="space-y-2">
          {D.BGM.map((b) => (
            <div key={b.id} className="flex items-center justify-between px-4 py-2.5" style={{ background: SURFACE, border: "1px solid " + LINE, borderRadius: RADIUS }}>
              <div className="flex items-center gap-2.5"><Music className="h-4 w-4" style={{ color: GOLD }} /><span className="text-[13px] font-semibold" style={{ color: INK }}>{b.name}</span><span className="text-[11px]" style={{ color: FAINT }}>{b.meta}</span></div>
              {b.current ? <Tag s="published" label="현재 적용" /> : <button className="text-[12px] font-semibold" style={{ color: GOLD }}>적용</button>}
            </div>
          ))}
          <p className="text-[11px]" style={{ color: FAINT }}>※ 관리자는 BGM 곡 교체만 가능 (전체 1트랙 + 구간 페이드).</p>
        </div>
      )}

      {t === "알림" && (
        <Card title="발신번호 · 알림톡 템플릿">
          <div className="space-y-3 text-[13px]" style={{ color: INK }}>
            <div className="flex items-center justify-between"><span style={{ color: MUTE }}>발신번호 등록</span><Tag s="review" label="심사 대기" /></div>
            <div className="flex items-center justify-between"><span style={{ color: MUTE }}>알림톡 템플릿 — 컨펌 요청</span><Tag s="review" label="심사 대기" /></div>
            <div className="flex items-center justify-between"><span style={{ color: MUTE }}>알림톡 템플릿 — 발행 완료</span><Tag s="review" label="심사 대기" /></div>
            <p className="text-[11px]" style={{ color: FAINT }}>⚠️ 운영사 선행작업(임계경로) — 발신번호 사전등록·알림톡 심사는 지금 착수 필요.</p>
          </div>
        </Card>
      )}

      {t === "사용자·권한" && (
        <Table
          cols={[{ key: "name", label: "파트너사" }, { key: "region", label: "지역" }, { key: "manager", label: "담당자" }, { key: "role", label: "역할" }, { key: "active", label: "상태" }]}
          rows={D.PARTNERS.map((p) => ({ ...p, manager: p.manager, role: "파트너 관리자" }))}
          renderCell={(r, k) => k === "active" ? <Tag s={r.active ? "online" : "offline"} label={r.active ? "활성" : "비활성"} /> : r[k]}
        />
      )}

      {t === "디바이스 등록" && (
        <Table
          cols={[{ key: "id", label: "디바이스 ID" }, { key: "room", label: "매핑 호실" }, { key: "ip", label: "IP" }, { key: "status", label: "상태" }]}
          rows={D.DEVICES}
          renderCell={(r, k) => k === "status" ? <Tag s={r.status} /> : k === "ip" ? <span className="tabular-nums">{r.ip}</span> : r[k]}
        />
      )}
    </div>
  );
}

// ── 시스템 (총관리자) ──────────────────────────────────────────
function System() {
  const [t, setT] = useState("jobs");
  return (
    <div>
      <PageHeader title="시스템" sub="총관리자 전용 — 렌더 큐·에러·외부 의존성 모니터" />
      <div className="mb-4 flex gap-1.5">
        {[["jobs", "잡 대시보드 (BullBoard)"], ["uptime", "에러·업타임 (Sentry)"]].map(([k, l]) => (
          <button key={k} onClick={() => setT(k)} className="px-3 py-1.5 text-[12px] font-semibold" style={{ borderRadius: RADIUS, background: t === k ? GOLD_SOFT : SURFACE, color: t === k ? GOLD_D : MUTE, border: "1px solid " + (t === k ? GOLD_SOFT : LINE) }}>{l}</button>
        ))}
      </div>
      {t === "jobs" ? (
        <div className="grid grid-cols-3 gap-3">
          {D.JOB_QUEUES.map((q) => (
            <Card key={q.id} title={q.name}>
              <div className="grid grid-cols-2 gap-y-2 text-[13px]">
                <span style={{ color: MUTE }}>대기</span><span className="text-right tabular-nums" style={{ color: INK }}>{q.waiting}</span>
                <span style={{ color: MUTE }}>처리 중</span><span className="text-right tabular-nums" style={{ color: "#3f5e87" }}>{q.active}</span>
                <span style={{ color: MUTE }}>완료</span><span className="text-right tabular-nums" style={{ color: STATUS.done.c }}>{q.completed}</span>
                <span style={{ color: MUTE }}>실패</span><span className="text-right tabular-nums font-bold" style={{ color: q.failed ? STATUS.review.c : FAINT }}>{q.failed}</span>
              </div>
              {q.failed > 0 && <button className="mt-3 text-[12px] font-semibold" style={{ color: GOLD }}>실패 잡 재처리 →</button>}
            </Card>
          ))}
        </div>
      ) : (
        <Table
          cols={[{ key: "name", label: "외부 의존성" }, { key: "status", label: "상태" }, { key: "latency", label: "지연", align: "right" }, { key: "uptime", label: "업타임", align: "right" }]}
          rows={D.UPTIME}
          renderCell={(r, k) => k === "status" ? <Tag s={r.status} /> : k === "latency" || k === "uptime" ? <span className="tabular-nums">{r[k]}</span> : r[k]}
        />
      )}
    </div>
  );
}

// ── 사이드바 + 라우팅 셸 ───────────────────────────────────────
const ICON = { size: "h-4 w-4", sw: 1.9 };

export default function AdminConsole({ onOpenEditor }) {
  const [page, setPage] = useState("dashboard");

  const go = (p) => setPage(p);

  return (
    <div className="flex" style={{ minHeight: "calc(100vh - 44px)" }}>
      {/* 사이드바 */}
      <aside className="flex w-60 flex-col" style={{ background: NAVY }}>
        <div className="flex items-center px-4" style={{ height: 60 }}>
          <span className="text-[15px] font-bold tracking-tight" style={{ color: "#eef0f3" }}>Memoria<span style={{ color: GOLD }}>works</span></span>
        </div>
        <div className="px-4 pb-3"><div className="text-[12px] font-semibold" style={{ color: "#828c9b" }}>통합 관리자 콘솔</div></div>
        <nav className="flex-1 overflow-y-auto px-2.5 pb-4">
          <NavSection>운영</NavSection>
          <NavItem icon={<LayoutGrid className={ICON.size} strokeWidth={ICON.sw} />} label="현황판" active={page === "dashboard"} onClick={() => go("dashboard")} />
          <NavItem icon={<MonitorPlay className={ICON.size} strokeWidth={ICON.sw} />} label="사이니지" active={page === "signage"} onClick={() => go("signage")} />

          <NavSection>추모영상 제작</NavSection>
          <NavItem icon={<FileText className={ICON.size} strokeWidth={ICON.sw} />} label="예약·접수" active={page === "reservations"} onClick={() => go("reservations")} />
          <NavItem icon={<Clapperboard className={ICON.size} strokeWidth={ICON.sw} />} label="편집·컨펌" active={page === "producing"} onClick={() => go("producing")} />
          <NavItem icon={<Film className={ICON.size} strokeWidth={ICON.sw} />} label="영상 편집기" onClick={() => onOpenEditor(null)} />
          <NavItem icon={<FolderOpen className={ICON.size} strokeWidth={ICON.sw} />} label="콘텐츠 허브" active={page === "content"} onClick={() => go("content")} />
          <NavItem icon={<Link2 className={ICON.size} strokeWidth={ICON.sw} />} label="외부 링크" active={page === "links"} onClick={() => go("links")} />

          <NavSection>정산</NavSection>
          <NavItem icon={<Wallet className={ICON.size} strokeWidth={ICON.sw} />} label="정산 내역" active={page === "settlement"} onClick={() => go("settlement")} />

          <NavSection>환경설정</NavSection>
          <NavItem icon={<Settings className={ICON.size} strokeWidth={ICON.sw} />} label="설정" active={page === "settings"} onClick={() => go("settings")} />

          <div className="my-3 border-t" style={{ borderColor: NAV_LINE }} />
          <NavSection>시스템 · 총관리자</NavSection>
          <NavItem icon={<Server className={ICON.size} strokeWidth={ICON.sw} />} label="시스템 모니터" active={page === "system"} onClick={() => go("system")} />
        </nav>
      </aside>

      {/* 본문 */}
      <div className="flex flex-1 flex-col" style={{ background: BG }}>
        <Topbar />
        <main className="flex-1 px-6 py-5">
          {page === "dashboard" && <Dashboard onOpenEditor={onOpenEditor} />}
          {page === "signage" && <Signage />}
          {page === "reservations" && <Reservations onOpenEditor={onOpenEditor} />}
          {page === "producing" && <Producing onOpenEditor={onOpenEditor} />}
          {page === "content" && <ContentHub />}
          {page === "links" && <ExternalLinks />}
          {page === "settlement" && <Settlement />}
          {page === "settings" && <SettingsView />}
          {page === "system" && <System />}
        </main>
        <footer className="px-6 py-3 text-[11px]" style={{ color: FAINT, borderTop: "1px solid " + LINE }}>
          Memoriaworks · 관리자 권한 · 목업 (실데이터 아님)
        </footer>
      </div>
    </div>
  );
}

// ── 상단바 (검색 + 알림) ───────────────────────────────────────
function Topbar() {
  const [open, setOpen] = useState(false);
  return (
    <header className="relative flex items-center justify-between px-6" style={{ background: NAVY, height: 48 }}>
      <div className="flex items-center gap-2 text-[12px]" style={{ color: "#8b94a3" }}>
        <Shield className="h-3.5 w-3.5" /> 영광농협장례식장 외 2개 파트너사 · 전체 보기
      </div>
      <button onClick={() => setOpen((v) => !v)} className="relative p-1.5 outline-none focus-visible:ring-1" style={{ color: "#8b94a3" }} aria-label="알림">
        <Bell className="h-4 w-4" strokeWidth={1.9} />
        <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full" style={{ background: GOLD }} />
      </button>
      {open && (
        <div className="absolute right-4 top-12 z-10 w-80 overflow-hidden" style={{ background: SURFACE, border: "1px solid " + LINE, borderRadius: RADIUS, boxShadow: "0 8px 24px rgba(0,0,0,.12)" }}>
          <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wide" style={{ color: MUTE, borderBottom: "1px solid " + LINE }}>알림</div>
          {D.NOTIFICATIONS.map((n) => (
            <div key={n.id} className="flex items-start gap-2 px-3 py-2.5" style={{ borderBottom: "1px solid " + LINE }}>
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: STATUS[n.kind] ? STATUS[n.kind].c : GOLD }} />
              <span className="text-[12.5px]" style={{ color: INK }}>{n.text}</span>
            </div>
          ))}
        </div>
      )}
    </header>
  );
}
