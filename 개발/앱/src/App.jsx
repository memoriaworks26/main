import React, { useState } from "react";
import { Search, Pencil, Plus, Monitor, LayoutGrid, Film, Bell, Wallet, Settings, Shield, Users, Link2, Calendar, Scissors, Cpu, HardDrive, Music, Send, SlidersHorizontal, Sparkles, Activity, AlertTriangle, Receipt, UserCog, Tv, PlayCircle, ChevronRight, RefreshCw, Upload } from "lucide-react";
import logoUrl from "./assets/logo.png";

// ─────────────────────────────────────────────────────────────
// Memoriaworks — 추모영상 관리 시스템 (목업 / 권한 전환)
// 디자인 방향(리서치 반영): "조종석" 사고 + 데이터-ink 절제 + 의미 중심 색.
// AI 제네릭 회피: 보라 그라데이션·과한 라운드·장식 애니메이션 배제.
// 주제 적합 세련됨: 따뜻한 아이보리 톤 + 고인 성함 명조(세리프) 시그니처 + 헤어라인 정밀함.
// 색은 상태에만(빨강 미사용). 모션은 상태 표시에만.
// ─────────────────────────────────────────────────────────────


const SANS = "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, system-ui, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif";
const SERIF = "'Nanum Myeongjo', 'Apple Myungjo', Batang, 'Times New Roman', serif"; // 고인 성함 시그니처

// 따뜻한 팔레트 (제한·일관)
const NAVY = "#182230";       // 사이드바
const MASTER = "#0e1620";     // 마스터바(최상위)
const BG = "#efece5";         // 따뜻한 스톤 배경
const SURFACE = "#fcfbf8";    // 카드 표면(웜 화이트)
const LINE = "#e4dfd5";       // 헤어라인
const LINE2 = "#d8d2c5";
const GOLD = "#a8782e";       // 절제된 골드 (의미·액션 한정)
const GOLD_D = "#8f6526";
const GOLD_SOFT = "#f1e8d8";
const INK = "#2a2622";        // 웜 잉크
const MUTE = "#726c63";       // 보조
const FAINT = "#9c968c";      // 약한

// 상태색: 의미 전용, 채도 절제, 빨강 없음. (색 + 라벨 + 점 → 색약 대응)
const STATUS = {
  published: { label: "발행완료", c: "#3a7468", bg: "#e9f1ee" },
  review:    { label: "컨펌대기", c: "#9a6a1c", bg: "#f4ead7" },
  rendering: { label: "제작중",   c: "#3f5e87", bg: "#e9eef5" },
  standby:   { label: "예비",     c: "#8a857b", bg: "#eeece6" },
  info:      { label: "안내화면", c: "#5a6470", bg: "#eceef0" },
};

function Tag({ s }) {
  const t = STATUS[s];
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-[3px] text-[11px] font-semibold"
          style={{ background: t.bg, color: t.c, borderRadius: 3 }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: t.c }} />{t.label}
    </span>
  );
}

// ── 마스터 네비 (권한 전환) ────────────────────────────────────
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
          Memoria<span style={{ color: GOLD }}>works</span></span>
        <span className="text-[10.5px]" style={{ color: "#5a6472" }}>권한별 화면 전환 · 목업</span>
      </div>
      <nav className="flex h-full items-stretch">
        {MASTER_TABS.map((t) => {
          const on = view === t.id; const Icon = t.icon;
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

// ── 데이터 ─────────────────────────────────────────────────────
const ROOMS = [
  { id: 1, name: "1호실", floor: "1층", type: "case", status: "published", deceased: "故 홍길동", age: 79, in: "06.15", out: "06.17" },
  { id: 2, name: "2호실", floor: "1층", type: "case", status: "review",    deceased: "故 김영수", age: 82, in: "06.16", out: "06.18" },
  { id: 3, name: "3호실", floor: "2층", type: "case", status: "rendering", deceased: "故 이순자", age: 75, in: "06.16", out: "06.18" },
  { id: 4, name: "4호실", floor: "2층", type: "case", status: "published", deceased: "故 박철호", age: 88, in: "06.14", out: "06.16" },
  { id: 5, name: "예비", floor: "", type: "standby", status: "standby" },
  { id: 6, name: "종합안내 로비", floor: "", type: "info", status: "info" },
  { id: 7, name: "종합안내 현관", floor: "", type: "info", status: "info" },
];

function Slate({ room }) {
  if (room.type === "info")
    return (
      <div className="flex h-24 flex-col items-center justify-center gap-1.5" style={{ background: "#222c39" }}>
        <Monitor className="h-5 w-5" style={{ color: "#828c9b" }} strokeWidth={1.5} />
        <span className="text-[10.5px]" style={{ color: "#aab2bf" }}>종합안내 표출 중</span>
      </div>
    );
  if (room.type === "standby")
    return (
      <div className="flex h-24 items-center justify-center" style={{ background: "#f4f2ec" }}>
        <span className="text-[11px]" style={{ color: FAINT }}>비어 있음</span>
      </div>
    );
  const rendering = room.status === "rendering";
  return (
    <div className="relative flex h-24 items-center justify-center" style={{ background: "#d9d6cd" }}>
      <div className="absolute" style={{ inset: 8, border: "1px solid rgba(42,38,34,.12)" }} />
      {!rendering && (
        <span style={{ width: 0, height: 0, borderTop: "7px solid transparent", borderBottom: "7px solid transparent", borderLeft: "11px solid " + NAVY, opacity: .7 }} />
      )}
      {rendering && (
        <div className="absolute bottom-0 left-0 right-0">
          <div className="px-2 pb-1.5 text-[10px] font-medium text-center" style={{ color: "#3f5e87" }}>추모영상 제작 중</div>
          <div className="mw-track"><div className="mw-fill" /></div>
        </div>
      )}
      <span className="absolute left-2 top-2 px-1.5 py-[2px] text-[9px] font-bold tracking-wider"
            style={{ background: "rgba(24,34,48,.62)", color: "#fff", borderRadius: 2 }}>추모영상</span>
    </div>
  );
}

function RoomCard({ room }) {
  const isCase = room.type === "case";
  return (
    <div className="flex w-60 flex-col overflow-hidden" style={{ background: SURFACE, border: "1px solid " + LINE, borderRadius: 4 }}>
      <div className="flex items-center justify-between px-3" style={{ height: 40, borderBottom: "1px solid " + LINE }}>
        <div className="flex items-baseline gap-1.5">
          <span className="text-[13.5px] font-bold" style={{ color: INK }}>{room.name}</span>
          {room.floor && <span className="text-[11px]" style={{ color: FAINT }}>{room.floor}</span>}
        </div>
        <button className="p-0.5 outline-none transition hover:opacity-100 focus-visible:ring-1" style={{ color: FAINT, opacity: .7 }} aria-label={room.name + " 편집"}>
          <Pencil className="h-3.5 w-3.5" strokeWidth={1.8} />
        </button>
      </div>
      <Slate room={room} />
      <div className="flex flex-1 flex-col px-3 py-2.5">
        {isCase ? (
          <>
            <div className="flex items-baseline gap-1.5">
              <span style={{ fontFamily: SERIF, fontSize: 17, fontWeight: 700, color: INK, letterSpacing: "-.01em" }}>{room.deceased}</span>
              <span className="text-[12px]" style={{ color: FAINT }}>{room.age}세</span>
            </div>
            <div className="mt-1 text-[11px]" style={{ color: MUTE }}>입실 {room.in} · 발인 {room.out}</div>
            <div className="mt-3 flex items-center justify-between border-t pt-2.5" style={{ borderColor: LINE }}>
              <Tag s={room.status} />
              <button className="text-[12px] font-semibold outline-none hover:underline focus-visible:ring-1" style={{ color: GOLD }}>
                {room.status === "review" ? "컨펌하기" : "열기"}
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-end justify-between pt-1">
            <Tag s={room.status} />
            <button className="text-[12px] font-semibold outline-none hover:underline focus-visible:ring-1" style={{ color: GOLD }}>설정</button>
          </div>
        )}
      </div>
    </div>
  );
}

const NAV_ROOMS = ["1호실 (1층)", "2호실 (1층)", "3호실 (2층)", "4호실 (2층)", "예비", "종합안내 로비", "종합안내 현관"];

// ── 사이드바 IA (설계 확정 · funein 가안 교체) ──────────────────
const NAV_GROUPS = [
  { group: "운영", items: [
    { id: "현황판", label: "현황판", icon: LayoutGrid },
    { id: "빈소", label: "빈소·호실", icon: Tv, rooms: true },
    { id: "사이니지", label: "사이니지", icon: Cpu, badge: "E" },
  ]},
  { group: "추모영상 제작", items: [
    { id: "예약접수", label: "예약·접수", icon: Calendar, badge: "D" },
    { id: "편집컨펌", label: "편집·컨펌", icon: Scissors },
    { id: "콘텐츠허브", label: "콘텐츠 허브", icon: Film },
    { id: "외부링크", label: "외부 링크", icon: Link2 },
  ]},
  { group: "정산", items: [
    { id: "정산", label: "정산 내역", icon: Receipt },
  ]},
  { group: "환경설정", items: [
    { id: "템플릿", label: "템플릿", icon: SlidersHorizontal },
    { id: "AI프롬프트", label: "AI 프롬프트", icon: Sparkles },
    { id: "BGM", label: "BGM 라이브러리", icon: Music },
    { id: "알림설정", label: "알림(발신번호·알림톡)", icon: Send },
    { id: "사용자권한", label: "사용자·권한", icon: UserCog },
    { id: "디바이스", label: "디바이스 등록", icon: HardDrive },
  ]},
  { group: "시스템", root: true, items: [
    { id: "잡대시보드", label: "잡 대시보드", icon: Activity },
    { id: "에러업타임", label: "에러·업타임", icon: AlertTriangle },
  ]},
];
const NAV_TITLE = Object.fromEntries(NAV_GROUPS.flatMap((g) => g.items.map((it) => [it.id, it.label])));
function navTitle(id) { return NAV_TITLE[id] || id; }

// ── 화면용 더미 데이터 ─────────────────────────────────────────
const BLOCK_C = { "타이틀": "#8f6526", "AI영상": "#3f5e87", "슬라이드": "#3a7468", "클립": "#5a6470", "편지": "#9a6a1c" };
const BLOCKS = [
  { id: 1, type: "타이틀", title: "오프닝 타이틀", status: "done", dur: 18, desc: "故 김영수 · 영정 오버레이" },
  { id: 2, type: "슬라이드", title: "생애 슬라이드", status: "done", dur: 42, desc: "사진 12 · 클립 2" },
  { id: 3, type: "AI영상", title: "AI 영상 변환", status: "rendering", dur: 8, desc: "독사진 → 영상(Kling)" },
  { id: 4, type: "클립", title: "가족 영상", status: "done", dur: 35, desc: "콘텐츠 허브 선택" },
  { id: 5, type: "편지", title: "추모 편지", status: "done", dur: 24, desc: "배경음만 · BGM 제외" },
];
const SIGNAGE = [
  { room: "1호실 (1층)", device: "pi-101", online: true, playing: "故 홍길동 추모영상", ver: "v3" },
  { room: "2호실 (1층)", device: "pi-102", online: true, playing: "컨펌 대기 — 직전 영상 유지", ver: "v1" },
  { room: "3호실 (2층)", device: "pi-201", online: true, playing: "제작 중 — 직전 영상 유지", ver: "—" },
  { room: "4호실 (2층)", device: "pi-202", online: true, playing: "故 박철호 추모영상", ver: "v2" },
  { room: "종합안내 로비", device: "pi-lobby", online: true, playing: "종합안내 표출", ver: "—" },
  { room: "종합안내 현관", device: "pi-gate", online: false, playing: "오프라인 — 로컬 루프 지속", ver: "—" },
];
const RESERVATIONS = [
  { id: "MW-240617-02", room: "2호실", deceased: "故 김영수", status: "review", source: "직원 대행", updated: "10:24" },
  { id: "MW-240617-03", room: "3호실", deceased: "故 이순자", status: "rendering", source: "직원 대행", updated: "09:58" },
  { id: "MW-240615-01", room: "1호실", deceased: "故 홍길동", status: "published", source: "직원 대행", updated: "06.15" },
  { id: "MW-240614-04", room: "4호실", deceased: "故 박철호", status: "published", source: "직원 대행", updated: "06.14" },
];
const LINKS = [
  { deceased: "故 홍길동", url: "memoria.works/m/3xK9…", expires: "발인 후 7일", active: true },
  { deceased: "故 박철호", url: "memoria.works/m/7bQ2…", expires: "만료됨", active: false },
];
const SETTLE = [
  { id: "MW-240615-01", deceased: "故 홍길동", amount: "₩ 330,000", frozen: true, state: "발행(동결)", date: "06.15" },
  { id: "MW-240614-04", deceased: "故 박철호", amount: "₩ 330,000", frozen: true, state: "발행(동결)", date: "06.14" },
  { id: "MW-240617-02", deceased: "故 김영수", amount: "₩ 330,000", frozen: false, state: "미발행(수정가능)", date: "—" },
];
const STUB_TEXT = {
  "템플릿": ["파트너사별 블록 순서·구성 규칙(고정) 정의", "유저 폼이 이를 펼쳐 EDL 인스턴스 생성"],
  "AI프롬프트": ["타이틀·AI영상 프롬프트 리스트(선택형) 관리", "런타임 provider 선택 UI 없음 — 어댑터 고정(OpenAI·Kling)"],
  "BGM": ["BGM 곡 등록·관리", "관리자는 곡 교체만 가능(트랙 편집 불가)"],
  "알림설정": ["발신번호 사전등록 · 알림톡 템플릿 심사 (임계경로 ⚠)", "솔라피 알림톡 우선 + SMS 폴백"],
  "사용자권한": ["파트너사(테넌트)·계정·역할(RBAC)", "사업부(총관리자) → 파트너사 범위 제한"],
  "디바이스": ["라즈베리파이 ID · 호실 매핑 (udev/systemd)", "USB 자동인식 · 예약 재부팅 · 워치독"],
  "에러업타임": ["Sentry 에러 트래킹", "외부 의존성(OpenAI·Kling·솔라피) 업타임·알림"],
};

function Summary() {
  const cases = ROOMS.filter((r) => r.type === "case");
  const n = (s) => cases.filter((r) => r.status === s).length;
  const items = [
    ["진행 중 빈소", cases.length],
    ["컨펌 대기", n("review")],
    ["제작 중", n("rendering")],
    ["발행 완료", n("published")],
  ];
  return (
    <div className="flex items-center" style={{ gap: 0 }}>
      {items.map(([label, val], i) => (
        <div key={label} className="flex items-baseline gap-1.5" style={{ paddingLeft: i ? 16 : 0, paddingRight: 16, borderLeft: i ? "1px solid " + LINE2 : "none" }}>
          <span className="text-[12px]" style={{ color: MUTE }}>{label}</span>
          <span className="text-[15px] font-bold tabular-nums" style={{ color: INK }}>{val}</span>
        </div>
      ))}
    </div>
  );
}

function NavItem({ icon, label, sub, active, badge, onClick }) {
  return (
    <button onClick={onClick}
      className="mb-0.5 flex w-full items-center gap-2.5 px-3 text-left outline-none transition focus-visible:ring-1"
      style={{
        height: sub ? 31 : 35, borderRadius: 4,
        fontSize: 13, color: active ? "#fff" : "#a7afbb",
        background: active ? "rgba(168,120,46,.14)" : "transparent",
        fontWeight: active ? 700 : 500,
        boxShadow: active ? "inset 2px 0 0 " + GOLD : "none",
      }}>
      {icon && <span className="shrink-0" style={{ opacity: active ? 1 : .85 }}>{icon}</span>}
      <span className={sub && !icon ? "pl-[26px]" : ""}>{label}</span>
      {badge && (
        <span className="ml-auto inline-flex items-center justify-center text-[9px] font-bold"
          style={{ width: 15, height: 15, borderRadius: 3, color: "#1c140a", background: "#caa052" }}
          title={"메모리아웍스 확인 필요 (" + badge + ")"}>⚠</span>
      )}
    </button>
  );
}

// ── 공용 UI 조각 ───────────────────────────────────────────────
function Panel({ children, className = "", style = {} }) {
  return <div className={className} style={{ background: SURFACE, border: "1px solid " + LINE, borderRadius: 6, ...style }}>{children}</div>;
}
function SearchBox({ placeholder, w = 232 }) {
  return (
    <div className="flex items-center px-3" style={{ height: 36, width: w, background: SURFACE, border: "1px solid " + LINE, borderRadius: 4 }}>
      <Search className="h-4 w-4" style={{ color: FAINT }} strokeWidth={1.9} />
      <input className="ml-2 w-full bg-transparent text-[13px] outline-none" placeholder={placeholder} style={{ color: INK }} />
    </div>
  );
}
function PrimaryBtn({ icon: Icon, children, onClick }) {
  return (
    <button onClick={onClick}
      className="inline-flex items-center gap-1.5 px-3.5 text-[13px] font-bold text-white outline-none transition focus-visible:ring-1 hover:bg-[#8f6526]"
      style={{ background: GOLD, height: 36, borderRadius: 4 }}>
      {Icon && <Icon className="h-4 w-4" strokeWidth={2.2} />}{children}
    </button>
  );
}
function GhostBtn({ children, onClick }) {
  return (
    <button onClick={onClick}
      className="inline-flex items-center gap-1.5 px-3 text-[13px] font-semibold outline-none transition hover:bg-[#efe9dd] focus-visible:ring-1"
      style={{ color: INK, height: 36, border: "1px solid " + LINE2, borderRadius: 4, background: SURFACE }}>
      {children}
    </button>
  );
}
function Chip({ on, children, onClick }) {
  return (
    <button onClick={onClick} className="px-3 py-1.5 text-[12.5px] font-semibold outline-none transition focus-visible:ring-1"
      style={{ borderRadius: 999, border: "1px solid " + (on ? GOLD : LINE2), background: on ? GOLD_SOFT : SURFACE, color: on ? GOLD_D : MUTE }}>
      {children}
    </button>
  );
}
function Dot({ on }) {
  return <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: on ? "#3a7468" : "#9c968c" }} />;
}
function MiniState({ ok, label }) {
  return <span className="inline-flex items-center gap-1.5 text-[12.5px]" style={{ color: ok ? "#3a7468" : MUTE }}><Dot on={ok} />{label}</span>;
}
function BlockKind({ t }) {
  return <span className="inline-flex items-center px-1.5 py-[1px] text-[10.5px] font-bold" style={{ color: "#fff", background: BLOCK_C[t] || MUTE, borderRadius: 3 }}>{t}</span>;
}
function PageHeader({ title, sub, right }) {
  return (
    <div className="mb-4 flex items-end justify-between">
      <div>
        <h1 className="text-[18px] font-bold" style={{ color: INK }}>{title}</h1>
        {sub && <p className="mt-1.5 text-[12.5px] leading-relaxed" style={{ color: MUTE }}>{sub}</p>}
      </div>
      {right}
    </div>
  );
}
function Table({ cols, rows }) {
  return (
    <Panel>
      <table className="w-full text-left" style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr>{cols.map((c, i) => (
            <th key={i} className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide" style={{ color: FAINT, borderBottom: "1px solid " + LINE }}>{c}</th>
          ))}</tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri}>{r.map((cell, ci) => (
              <td key={ci} className="px-4 py-3 text-[13px] align-middle" style={{ color: INK, borderBottom: ri < rows.length - 1 ? "1px solid " + LINE : "none" }}>{cell}</td>
            ))}</tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}

// ── 화면들 ─────────────────────────────────────────────────────
function StatusBoardScreen() {
  return (
    <>
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h1 className="text-[18px] font-bold" style={{ color: INK }}>빈소 현황</h1>
          <div className="mt-2"><Summary /></div>
        </div>
        <div className="flex items-center gap-2.5">
          <SearchBox placeholder="상주·고인 검색" />
          <PrimaryBtn icon={Plus}>추모영상 만들기</PrimaryBtn>
        </div>
      </div>
      <div className="flex flex-wrap gap-3.5">{ROOMS.map((r) => <RoomCard key={r.id} room={r} />)}</div>
    </>
  );
}

function RoomDetailScreen({ room }) {
  const data = ROOMS.find((r) => room.startsWith(r.name)) || ROOMS[0];
  const isCase = data.type === "case";
  return (
    <>
      <PageHeader title={room} sub={isCase ? "빈소 상세 · 추모영상 진행 상태" : "사이니지 안내/예비 화면"} />
      <div className="flex gap-4" style={{ alignItems: "flex-start" }}>
        <Panel style={{ width: 360 }}>
          <div className="px-5 py-5">
            {isCase ? (
              <>
                <div className="flex items-baseline gap-2">
                  <span style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 700, color: INK }}>{data.deceased}</span>
                  <span className="text-[13px]" style={{ color: FAINT }}>{data.age}세</span>
                </div>
                <div className="mt-2 text-[13px]" style={{ color: MUTE }}>입실 {data.in} · 발인 {data.out}</div>
                <div className="mt-4 flex items-center justify-between border-t pt-4" style={{ borderColor: LINE }}>
                  <Tag s={data.status} />
                  <PrimaryBtn icon={Scissors}>{data.status === "review" ? "컨펌하기" : "편집·컨펌"}</PrimaryBtn>
                </div>
              </>
            ) : (
              <div className="text-[13px] leading-relaxed" style={{ color: MUTE }}>
                이 화면은 사이니지 안내/예비 표출입니다. 표출 설정은 <b style={{ color: INK }}>사이니지</b>·<b style={{ color: INK }}>환경설정</b>에서 관리합니다.
              </div>
            )}
          </div>
        </Panel>
        {isCase && (
          <Panel className="flex-1">
            <div className="px-5 py-4">
              <div className="text-[11px] font-bold uppercase tracking-wide" style={{ color: FAINT }}>블록 진행 (순서 고정)</div>
              <div className="mt-3">
                {BLOCKS.map((b) => (
                  <div key={b.id} className="flex items-center justify-between border-b py-2" style={{ borderColor: LINE }}>
                    <span className="flex items-center gap-2 text-[13px]" style={{ color: INK }}><BlockKind t={b.type} />{b.title}</span>
                    <span className="text-[12px]" style={{ color: b.status === "rendering" ? "#3f5e87" : "#3a7468" }}>{b.status === "rendering" ? "렌더링 중" : "렌더 완료"}</span>
                  </div>
                ))}
              </div>
            </div>
          </Panel>
        )}
      </div>
    </>
  );
}

function SignageScreen() {
  return (
    <>
      <PageHeader title="사이니지"
        sub="라즈베리파이 디바이스 · 호실 매핑 · 재생 상태 (네트워크 독립 · 장애 시 직전 영상 유지)"
        right={<span className="inline-flex items-center px-2 py-[5px] text-[11px] font-semibold" style={{ background: GOLD_SOFT, color: GOLD_D, borderRadius: 3 }}>⚠ 범위 확인: 영상 루프 vs 정보안내 화면</span>} />
      <Table cols={["호실", "디바이스", "상태", "현재 재생", "버전"]}
        rows={SIGNAGE.map((s) => [
          s.room,
          <span style={{ fontFamily: "monospace", fontSize: 12, color: MUTE }}>{s.device}</span>,
          <MiniState ok={s.online} label={s.online ? "온라인" : "오프라인"} />,
          s.playing,
          <span className="tabular-nums">{s.ver}</span>,
        ])} />
    </>
  );
}

function ReservationScreen() {
  const [f, setF] = useState("전체");
  const filters = ["전체", "컨펌대기", "제작중", "발행완료"];
  return (
    <>
      <PageHeader title="예약 · 접수"
        sub="추모영상 폼 접수 → 자동 렌더 → 컨펌 요청"
        right={<div className="flex items-center gap-2.5"><SearchBox placeholder="예약번호·고인 검색" w={200} /><PrimaryBtn icon={Plus}>추모영상 만들기</PrimaryBtn></div>} />
      <div className="mb-3 flex items-center gap-1.5">
        {filters.map((x) => <Chip key={x} on={f === x} onClick={() => setF(x)}>{x}</Chip>)}
        <span className="ml-2 text-[12px]" style={{ color: FAINT }}>· 유저 주체(유족 직접/직원 대행) 확인 전 — 현재 직원 대행 가정 ⚠</span>
      </div>
      <Table cols={["예약번호", "호실", "고인", "상태", "접수", "갱신"]}
        rows={RESERVATIONS.map((r) => [
          <span style={{ fontFamily: "monospace", fontSize: 12 }}>{r.id}</span>,
          r.room,
          <span style={{ fontFamily: SERIF, fontSize: 15, color: INK }}>{r.deceased}</span>,
          <Tag s={r.status} />,
          r.source,
          r.updated,
        ])} />
    </>
  );
}

function ContentHubScreen() {
  const assets = [["가족 영상 A", "클립"], ["가족 영상 B", "클립"], ["로비 안내 루프", "클립"], ["기본 BGM · 잔잔", "BGM"], ["기본 BGM · 따뜻", "BGM"]];
  return (
    <>
      <PageHeader title="콘텐츠 허브" sub="클립·BGM 선업로드 자산 풀 (편집기에서 드롭다운으로 선택)" right={<PrimaryBtn icon={Upload}>업로드</PrimaryBtn>} />
      <div className="flex flex-wrap gap-3.5">
        {assets.map(([name, kind], i) => (
          <Panel key={i} style={{ width: 200, overflow: "hidden" }}>
            <div className="flex h-28 items-center justify-center" style={{ background: "#e7e3d9" }}>
              {kind === "BGM" ? <Music className="h-6 w-6" style={{ color: FAINT }} /> : <Film className="h-6 w-6" style={{ color: FAINT }} />}
            </div>
            <div className="px-3 py-2.5">
              <div className="text-[13px] font-semibold" style={{ color: INK }}>{name}</div>
              <div className="mt-0.5 text-[11px]" style={{ color: FAINT }}>{kind}</div>
            </div>
          </Panel>
        ))}
      </div>
    </>
  );
}

function ExternalLinkScreen() {
  return (
    <>
      <PageHeader title="외부 링크" sub="발행 영상 HLS 링크 · 토큰 · 만료 (서명 URL · 퇴실 시 무효화)" />
      <Table cols={["고인", "링크", "만료", "상태", ""]}
        rows={LINKS.map((l) => [
          <span style={{ fontFamily: SERIF, fontSize: 15, color: INK }}>{l.deceased}</span>,
          <span style={{ fontFamily: "monospace", fontSize: 12, color: MUTE }}>{l.url}</span>,
          l.expires,
          <MiniState ok={l.active} label={l.active ? "활성" : "무효"} />,
          <button className="text-[12.5px] font-semibold outline-none hover:underline" style={{ color: GOLD }}>{l.active ? "링크 복사" : "재발급"}</button>,
        ])} />
    </>
  );
}

function SettlementScreen() {
  return (
    <>
      <PageHeader title="정산 내역"
        sub="단가 스냅샷 고정(예약 생성 시점 기준) · 발행 시 거래명세서 동결"
        right={<GhostBtn>거래명세서 메일 발송</GhostBtn>} />
      <Table cols={["예약번호", "고인", "금액(스냅샷)", "상태", "발행일"]}
        rows={SETTLE.map((s) => [
          <span style={{ fontFamily: "monospace", fontSize: 12 }}>{s.id}</span>,
          <span style={{ fontFamily: SERIF, fontSize: 15, color: INK }}>{s.deceased}</span>,
          <span className="tabular-nums font-semibold">{s.amount}</span>,
          s.frozen ? <MiniState ok label={s.state} /> : <span className="text-[12.5px]" style={{ color: GOLD_D }}>{s.state}</span>,
          s.date,
        ])} />
    </>
  );
}

function JobDashboardScreen() {
  const queues = [["AI 외부호출", "2 대기 · 1 처리", "#3f5e87"], ["FFmpeg 합성", "1 처리", "#3a7468"], ["프록시 생성", "0 대기", "#8a857b"]];
  return (
    <>
      <PageHeader title="잡 대시보드" sub="렌더 큐 3종 상태 · 실패 잡 재처리 (BullBoard) · 총관리자 전용" />
      <div className="flex gap-3.5">
        {queues.map(([name, stat, c], i) => (
          <Panel key={i} style={{ width: 220 }}>
            <div className="px-4 py-4">
              <div className="text-[13px] font-bold" style={{ color: INK }}>{name}</div>
              <div className="mt-2 text-[12.5px]" style={{ color: MUTE }}>{stat}</div>
              <div className="mt-3 h-1.5" style={{ background: "#e7e3d9", borderRadius: 2 }}><div style={{ width: "40%", height: "100%", background: c, borderRadius: 2 }} /></div>
            </div>
          </Panel>
        ))}
      </div>
      <div className="mt-5">
        <Table cols={["잡 ID", "유형", "상태", "재시도"]}
          rows={[
            [<span style={{ fontFamily: "monospace", fontSize: 12 }}>job_8821</span>, "FFmpeg 합성", <MiniState ok label="처리 중" />, "0/3"],
            [<span style={{ fontFamily: "monospace", fontSize: 12 }}>job_8817</span>, "AI 영상(Kling)", <span className="text-[12.5px]" style={{ color: GOLD_D }}>재시도 중</span>, "1/3"],
          ]} />
      </div>
    </>
  );
}

function ConfigStub({ nav }) {
  return (
    <>
      <PageHeader title={navTitle(nav)} />
      <Panel style={{ maxWidth: 640 }}>
        <div className="px-6 py-6">
          <span className="inline-flex items-center px-2 py-[3px] text-[11px] font-semibold" style={{ background: GOLD_SOFT, color: GOLD_D, borderRadius: 3 }}>구성 예정</span>
          <ul className="mt-4 space-y-2.5">
            {(STUB_TEXT[nav] || ["구성 예정"]).map((l, i) => (
              <li key={i} className="flex items-start gap-2.5 text-[13px] leading-relaxed" style={{ color: MUTE }}>
                <span className="mt-[7px] shrink-0" style={{ width: 5, height: 5, borderRadius: "50%", background: GOLD }} />{l}
              </li>
            ))}
          </ul>
        </div>
      </Panel>
    </>
  );
}

// ── 편집·컨펌 (우선순위 화면) ──────────────────────────────────
function TrimSlider() {
  return (
    <div className="mt-3">
      <div className="relative" style={{ height: 26 }}>
        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2" style={{ height: 4, background: "#d8d2c5", borderRadius: 2 }} />
        <div className="absolute top-1/2 -translate-y-1/2" style={{ left: "14%", right: "22%", height: 4, background: GOLD, borderRadius: 2 }} />
        {["14%", "78%"].map((l, i) => (
          <div key={i} className="absolute top-1/2 -translate-y-1/2" style={{ left: l, width: 12, height: 18, marginLeft: -6, background: SURFACE, border: "1px solid " + GOLD, borderRadius: 3, boxShadow: "0 1px 2px rgba(0,0,0,.12)" }} />
        ))}
      </div>
      <div className="flex justify-between text-[11px]" style={{ color: FAINT }}><span>00:00</span><span>트림 구간</span><span>00:18</span></div>
    </div>
  );
}
function FieldLabel({ children }) { return <div className="mb-1.5 text-[12px] font-semibold" style={{ color: MUTE }}>{children}</div>; }
function Select({ options }) {
  return (
    <select className="w-full px-2.5 text-[13px] outline-none" style={{ height: 34, background: SURFACE, border: "1px solid " + LINE2, borderRadius: 4, color: INK }}>
      {options.map((o) => <option key={o}>{o}</option>)}
    </select>
  );
}
function EditPanelBody({ b }) {
  const photo = <div><FieldLabel>사진</FieldLabel><GhostBtn>사진 교체</GhostBtn></div>;
  const regen = (
    <div>
      <FieldLabel>AI 프롬프트 (리스트 선택)</FieldLabel>
      <Select options={["정중한 추모 톤", "따뜻한 회상", "담백한 기록"]} />
      <div className="mt-2"><PrimaryBtn icon={RefreshCw}>AI 재생성</PrimaryBtn></div>
    </div>
  );
  if (b.type === "타이틀" || b.type === "AI영상") return <>{photo}{regen}<TrimNote /></>;
  if (b.type === "슬라이드") return (
    <>
      <div><FieldLabel>소스 (사진·클립)</FieldLabel><GhostBtn>소스 교체</GhostBtn></div>
      <div><PrimaryBtn icon={RefreshCw}>FFmpeg 재합성</PrimaryBtn></div>
      <TrimNote />
    </>
  );
  if (b.type === "클립") return (
    <>
      <div><FieldLabel>클립 선택 (콘텐츠 허브)</FieldLabel><Select options={["가족 영상 A", "가족 영상 B", "로비 안내 루프"]} /></div>
      <TrimNote />
    </>
  );
  if (b.type === "편지") return (
    <>
      <div>
        <FieldLabel>편지 텍스트</FieldLabel>
        <textarea rows={4} defaultValue="사랑하는 아버지께…" className="w-full px-2.5 py-2 text-[13px] outline-none"
          style={{ background: SURFACE, border: "1px solid " + LINE2, borderRadius: 4, color: INK, resize: "none" }} />
      </div>
      <div className="text-[11px]" style={{ color: FAINT }}>배경음만 · BGM 제외</div>
      <TrimNote />
    </>
  );
  return null;
}
function TrimNote() { return <div className="text-[11px]" style={{ color: FAINT }}>트림은 미리보기 하단 슬라이더에서 조정합니다.</div>; }

function EditorConfirmScreen() {
  const [sel, setSel] = useState(BLOCKS[0].id);
  const b = BLOCKS.find((x) => x.id === sel);
  const rendering = b.status === "rendering";
  return (
    <>
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h1 className="text-[18px] font-bold" style={{ color: INK }}>편집 · 컨펌</h1>
          <p className="mt-1.5 text-[12.5px]" style={{ color: MUTE }}>故 김영수 · 미리보기 = 서버 렌더 영상 재생(480p 프록시) · 블록 순서 고정, 내부 소스만 수정</p>
        </div>
        <div className="flex items-center gap-2"><GhostBtn>반려</GhostBtn><PrimaryBtn>컨펌 → 섹션별 렌더</PrimaryBtn></div>
      </div>
      <div className="flex gap-4" style={{ alignItems: "flex-start" }}>
        {/* 좌: 블록 리스트 */}
        <Panel style={{ width: 232, overflow: "hidden" }}>
          <div className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide" style={{ color: FAINT, borderBottom: "1px solid " + LINE }}>블록 (순서 고정)</div>
          <div className="p-2">
            {BLOCKS.map((x) => {
              const on = x.id === sel;
              return (
                <button key={x.id} onClick={() => setSel(x.id)}
                  className="mb-1.5 flex w-full items-start gap-2.5 px-2.5 py-2 text-left outline-none transition focus-visible:ring-1"
                  style={{ borderRadius: 5, background: on ? GOLD_SOFT : "transparent", border: "1px solid " + (on ? "#e3d2ac" : "transparent") }}>
                  <div className="mt-0.5 flex h-9 w-12 shrink-0 items-center justify-center" style={{ background: "#e7e3d9", borderRadius: 3 }}>
                    {x.status === "rendering" ? <span className="text-[9px]" style={{ color: "#3f5e87" }}>렌더중</span> : <PlayCircle className="h-4 w-4" style={{ color: FAINT }} />}
                  </div>
                  <div className="min-w-0">
                    <BlockKind t={x.type} />
                    <div className="mt-0.5 truncate text-[12.5px] font-semibold" style={{ color: INK }}>{x.title}</div>
                    <div className="truncate text-[11px]" style={{ color: FAINT }}>{x.dur}s · {x.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </Panel>

        {/* 중앙: 미리보기 */}
        <div className="flex-1" style={{ minWidth: 0 }}>
          <Panel style={{ overflow: "hidden" }}>
            <div className="relative" style={{ aspectRatio: "16 / 9", background: "#1c2530" }}>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                {rendering ? (
                  <>
                    <span className="text-[12px]" style={{ color: "#9fb0c6" }}>렌더링 중…</span>
                    <div className="mt-2 mw-track" style={{ width: 160 }}><div className="mw-fill" /></div>
                  </>
                ) : (
                  <>
                    <PlayCircle className="h-12 w-12" style={{ color: "rgba(255,255,255,.85)" }} strokeWidth={1.4} />
                    <span className="mt-2 text-[11px]" style={{ color: "#8a94a3" }}>서버 렌더 영상 재생 · Canvas 불필요</span>
                  </>
                )}
              </div>
              <span className="absolute left-3 top-3 px-1.5 py-[2px] text-[10px] font-bold" style={{ background: "rgba(0,0,0,.45)", color: "#fff", borderRadius: 2 }}>16:9 · 480p</span>
              <span className="absolute right-3 top-3"><BlockKind t={b.type} /></span>
            </div>
            <div className="px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-semibold" style={{ color: INK }}>{b.title}</span>
                <span className="text-[12px]" style={{ color: rendering ? "#3f5e87" : "#3a7468" }}>{rendering ? "렌더링 중" : "렌더 완료"}</span>
              </div>
              <TrimSlider />
            </div>
          </Panel>
          <div className="mt-3 flex items-center justify-between px-1 text-[12px]" style={{ color: MUTE }}>
            <span>전체 5블록 · 컨펌 시 섹션별 렌더 → 컨펌 후 통합 렌더</span>
            <span className="inline-flex items-center gap-1.5"><Music className="h-3.5 w-3.5" /> BGM: 기본 · 잔잔</span>
          </div>
        </div>

        {/* 우: 편집 패널 */}
        <Panel style={{ width: 300 }}>
          <div className="px-4 py-3 text-[11px] font-bold uppercase tracking-wide" style={{ color: FAINT, borderBottom: "1px solid " + LINE }}>블록 편집 — {b.type}</div>
          <div className="space-y-4 px-4 py-4">
            <EditPanelBody b={b} />
            <div className="border-t pt-4" style={{ borderColor: LINE }}>
              <FieldLabel>BGM (전역 · 곡 교체만)</FieldLabel>
              <Select options={["기본 · 잔잔", "기본 · 따뜻", "사용자 업로드"]} />
            </div>
          </div>
        </Panel>
      </div>
    </>
  );
}

function renderScreen(nav) {
  if (NAV_ROOMS.includes(nav)) return <RoomDetailScreen room={nav} />;
  switch (nav) {
    case "현황판": return <StatusBoardScreen />;
    case "사이니지": return <SignageScreen />;
    case "예약접수": return <ReservationScreen />;
    case "편집컨펌": return <EditorConfirmScreen />;
    case "콘텐츠허브": return <ContentHubScreen />;
    case "외부링크": return <ExternalLinkScreen />;
    case "정산": return <SettlementScreen />;
    case "잡대시보드": return <JobDashboardScreen />;
    default: return <ConfigStub nav={nav} />;
  }
}

function AdminView() {
  const [nav, setNav] = useState("현황판");
  const isRoom = NAV_ROOMS.includes(nav);
  return (
    <div className="flex" style={{ minHeight: "calc(100vh - 44px)" }}>
      <aside className="flex w-60 flex-col" style={{ background: NAVY }}>
        <div className="flex items-center px-4" style={{ height: 60 }}>
          <div className="inline-flex items-center px-3" style={{ height: 38, background: "#fbfaf6", border: "1px solid #e4dfd5", borderRadius: 6 }}>
            <img src={logoUrl} alt="Memoriaworks" className="block" style={{ height: 22, width: "auto" }} />
          </div>
        </div>
        <div className="px-4 pb-3"><div className="text-[12px] font-semibold" style={{ color: "#828c9b" }}>영광농협장례식장</div></div>
        <nav className="flex-1 overflow-y-auto px-2.5 pb-3">
          {NAV_GROUPS.map((g) => (
            <div key={g.group}>
              <div className="mb-1 mt-3 px-3 text-[10px] font-bold uppercase tracking-[.12em]" style={{ color: "#5a6577" }}>
                {g.group}{g.root && " · 총관리자"}
              </div>
              {g.items.map((it) => {
                const Icon = it.icon;
                const active = nav === it.id || (it.rooms && isRoom);
                return (
                  <React.Fragment key={it.id}>
                    <NavItem icon={<Icon className="h-4 w-4" strokeWidth={1.9} />} label={it.label} badge={it.badge}
                      active={active} onClick={() => setNav(it.rooms ? NAV_ROOMS[0] : it.id)} />
                    {it.rooms && (nav === it.id || isRoom) && NAV_ROOMS.map((r) => (
                      <NavItem key={r} label={r} sub active={nav === r} onClick={() => setNav(r)} />
                    ))}
                  </React.Fragment>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col" style={{ background: BG }}>
        <header className="flex items-center justify-between px-6" style={{ background: NAVY, height: 48 }}>
          <div className="flex items-center gap-2 text-[13px]">
            <span style={{ color: "#7a8392" }}>관리자</span>
            <ChevronRight className="h-3.5 w-3.5" style={{ color: "#586273" }} />
            <span className="font-semibold" style={{ color: "#fff" }}>{isRoom ? "빈소 · " + nav : navTitle(nav)}</span>
          </div>
          <button className="relative p-1.5 outline-none focus-visible:ring-1" style={{ color: "#8b94a3" }} aria-label="알림">
            <Bell className="h-4 w-4" strokeWidth={1.9} />
            <span className="absolute right-1 top-1" style={{ width: 6, height: 6, borderRadius: "50%", background: GOLD }} />
          </button>
        </header>

        <main className="flex-1 px-6 py-5">{renderScreen(nav)}</main>

        <footer className="px-6 py-3 text-[11px]" style={{ color: FAINT, borderTop: "1px solid " + LINE }}>
          Memoriaworks · 관리자 권한 · 목업 (실데이터 아님)
        </footer>
      </div>
    </div>
  );
}

// ── 자리표시 (파트너 / 유저 링크) ──────────────────────────────
function Placeholder({ title, lines }) {
  return (
    <div className="flex items-start justify-center px-6 py-14" style={{ background: BG, minHeight: "calc(100vh - 44px)" }}>
      <div className="w-full px-9 py-10" style={{ maxWidth: 700, background: SURFACE, border: "1px solid " + LINE, borderRadius: 6 }}>
        <span className="inline-flex items-center px-2 py-[3px] text-[11px] font-semibold" style={{ background: GOLD_SOFT, color: GOLD_D, borderRadius: 3 }}>구성 예정</span>
        <h2 className="mt-3" style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 800, color: INK }}>{title}</h2>
        <ul className="mt-5 space-y-2.5">
          {lines.map((l, i) => (
            <li key={i} className="flex items-start gap-2.5 text-[13px] leading-relaxed" style={{ color: MUTE }}>
              <span className="mt-[7px] shrink-0" style={{ width: 5, height: 5, borderRadius: "50%", background: GOLD }} />{l}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
const PartnerView = () => <Placeholder title="파트너사(장례식장) 권한 화면" lines={[
  "자사 빈소·예약·추모영상만 보이는 범위 제한(멀티테넌트 스코핑).",
  "추모영상 폼 접수 → 자동 렌더 → 컨펌 요청 흐름.",
  "발행 영상·외부 링크 관리, 자사 정산 내역 조회.",
  "권한 분리 시 관리자 화면에서 기능을 떼어 구성.",
]} />;
const UserLinkView = () => <Placeholder title="유족·조문객 링크 (모바일 공개)" lines={[
  "발행된 추모영상 재생(HLS) — 차분·정중한 톤(아이보리/웜그레이).",
  "퇴실 시 즉시 무효화되는 토큰 링크.",
  "운영툴은 기능 중심, 이 화면은 위로 중심으로 톤을 분리.",
  "별도 디자인 트랙으로 구성 예정.",
]} />;

export default function App() {
  const [view, setView] = useState("admin");
  return (
    <div className="min-w-[1080px]" style={{ background: BG, minHeight: "100vh", fontFamily: SANS, color: INK }}>
      <style>{`
        @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css');
        @import url('https://fonts.googleapis.com/css2?family=Nanum+Myeongjo:wght@400;700;800&display=swap');
        * { font-family: ${SANS}; }
        .mw-track { height: 3px; background: rgba(63,94,135,.18); overflow: hidden; }
        .mw-fill { height: 100%; width: 40%; background: #3f5e87; animation: mw-move 1.4s ease-in-out infinite; }
        @keyframes mw-move { 0% { transform: translateX(-110%) } 100% { transform: translateX(320%) } }
        @media (prefers-reduced-motion: reduce) { .mw-fill { animation: none; width: 100% } }
      `}</style>
      <MasterNav view={view} setView={setView} />
      {view === "admin" && <AdminView />}
      {view === "partner" && <PartnerView />}
      {view === "user" && <UserLinkView />}
    </div>
  );
}
