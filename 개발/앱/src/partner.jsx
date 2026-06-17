import React, { useState } from "react";
import { LayoutGrid, FilePlus, ListChecks, MonitorPlay, Wallet, Settings, Plus } from "lucide-react";
import { NAVY, BG, SURFACE, LINE, LINE2, GOLD, GOLD_SOFT, GOLD_D, INK, MUTE, FAINT, NAV_LINE, SERIF, RADIUS } from "./theme.js";
import { Tag, Btn, Card, MetricRow, Table, PageHeader, NavItem, NavSection, Deceased } from "./ui.jsx";
import { RoomCard } from "./roomcard.jsx";
import * as D from "./data.js";

const PARTNER = D.PARTNERS[0]; // 영광농협장례식장 (테넌트 스코핑)
const ICON = "h-4 w-4";

// 자사 현황판
function PDashboard({ onOpenEditor }) {
  const rooms = D.ROOMS;
  const cases = rooms.filter((r) => r.type === "case");
  return (
    <div>
      <PageHeader title="통합 대시보드" sub={PARTNER.name + " · 자사 빈소 현황"} right={<Btn size="sm"><Plus className="h-4 w-4" /> 신규 예약</Btn>} />
      <div className="mb-4">
        <MetricRow items={[
          { label: "오늘 예약", value: "2건" },
          { label: "진행 중", value: cases.filter((r) => r.status !== "published").length + "건" },
          { label: "이번달 완료", value: "12건" },
          { label: "이번달 청구", value: "180만", sub: "VAT 별도" },
        ]} />
      </div>
      <div className="mb-2 text-[13px] font-bold" style={{ color: INK }}>호실별 현황 <span className="font-normal" style={{ color: FAINT }}>· 오늘 기준</span></div>
      <div className="flex flex-wrap gap-3.5">
        {rooms.map((r) => <RoomCard key={r.id} room={r} onOpen={() => onOpenEditor(r)} />)}
      </div>
    </div>
  );
}

// 예약 접수 폼
function Intake() {
  const field = (label, ph, req) => (
    <label className="block">
      <span className="text-[12px] font-semibold" style={{ color: MUTE }}>{label}{req && <span style={{ color: GOLD }}> *</span>}</span>
      <input placeholder={ph} className="mt-1 w-full bg-transparent px-3 text-[13px] outline-none" style={{ height: 36, background: SURFACE, border: "1px solid " + LINE, borderRadius: RADIUS, color: INK }} />
    </label>
  );
  return (
    <div>
      <PageHeader title="예약 접수" sub="날짜·호실·시간 → 상주/고인 정보 → 추모영상 폼" />
      <div className="grid grid-cols-2 gap-4" style={{ maxWidth: 880 }}>
        <Card title="📅 일정">
          <div className="space-y-3">
            {field("날짜", "2026-06-18", true)}
            <label className="block">
              <span className="text-[12px] font-semibold" style={{ color: MUTE }}>호실 <span style={{ color: GOLD }}>*</span></span>
              <select className="mt-1 w-full px-3 text-[13px] outline-none" style={{ height: 36, background: SURFACE, border: "1px solid " + LINE, borderRadius: RADIUS, color: INK }}>
                {D.NAV_ROOMS.slice(0, 4).map((r) => <option key={r}>{r}</option>)}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-2">{field("입실", "06-18 09:00")}{field("발인", "06-20 07:00")}</div>
          </div>
        </Card>
        <Card title="상주 · 고인 정보">
          <div className="space-y-3">
            {field("상주 성함", "상주 성함을 입력해 주세요", true)}
            {field("연락처", "010-0000-0000", true)}
            {field("고인 성함", "故 ○○○", true)}
            {field("향년", "79", false)}
          </div>
        </Card>
      </div>
      <div className="mt-4 flex gap-2" style={{ maxWidth: 880 }}>
        <Btn>접수 + 추모영상 폼 발송</Btn>
        <Btn variant="neutral">임시 저장</Btn>
      </div>
    </div>
  );
}

// 예약 목록
function PList({ onOpenEditor }) {
  const cols = [
    { key: "deceased", label: "고인" }, { key: "chief", label: "상주" }, { key: "phone", label: "연락처" },
    { key: "room", label: "호실" }, { key: "time", label: "일정" }, { key: "video", label: "영상" }, { key: "act", label: "", align: "right" },
  ];
  return (
    <div>
      <PageHeader title="예약 목록" sub="자사 예약 · 영상 진행 상태" />
      <Table cols={cols} rows={D.RESERVATIONS} renderCell={(r, k) =>
        k === "deceased" ? <span style={{ fontFamily: SERIF, fontWeight: 700 }}>{r.deceased}</span> :
        k === "video" ? <Tag s={r.status} /> :
        k === "act" ? <button onClick={() => onOpenEditor(r)} className="text-[12px] font-semibold" style={{ color: GOLD }}>{r.status === "review" ? "컨펌" : "보기"}</button> : r[k]
      } />
    </div>
  );
}

// 라이브 컨트롤 (사이니지 조회·제어)
function Live() {
  const cols = [{ key: "room", label: "호실" }, { key: "id", label: "디바이스" }, { key: "status", label: "상태" }, { key: "playing", label: "표출 중" }, { key: "act", label: "", align: "right" }];
  return (
    <div>
      <PageHeader title="라이브 컨트롤" sub="자사 호실 대기화면 ↔ 추모영상 표출 전환 (조회·제어)" />
      <Table cols={cols} rows={D.DEVICES.slice(0, 4)} renderCell={(r, k) =>
        k === "status" ? <Tag s={r.status} /> :
        k === "act" ? <button className="text-[12px] font-semibold" style={{ color: r.status === "offline" ? FAINT : GOLD }} disabled={r.status === "offline"}>{r.status === "offline" ? "오프라인" : "전환"}</button> : r[k]
      } />
    </div>
  );
}

// 자사 정산 조회
function PSettle() {
  const won = (v) => v.toLocaleString() + "원";
  const rows = D.SETTLEMENT_ITEMS.filter((i) => i.partner === PARTNER.name);
  const cols = [{ key: "deceased", label: "고인" }, { key: "chief", label: "상주" }, { key: "date", label: "예약일" }, { key: "amount", label: "금액", align: "right" }, { key: "status", label: "정산" }];
  return (
    <div>
      <PageHeader title="정산 조회" sub="자사 거래 내역 (조회 전용 · 단가 스냅샷 고정)" />
      <Table cols={cols} rows={rows} renderCell={(r, k) =>
        k === "deceased" ? <span style={{ fontFamily: SERIF, fontWeight: 700 }}>{r.deceased}</span> :
        k === "status" ? <Tag s={r.status} /> :
        k === "amount" ? <span className="tabular-nums">{won(r.amount)}</span> : r[k]
      } />
    </div>
  );
}

export default function PartnerConsole({ onOpenEditor }) {
  const [page, setPage] = useState("dashboard");
  const go = setPage;
  return (
    <div className="flex" style={{ minHeight: "calc(100vh - 44px)" }}>
      <aside className="flex w-60 flex-col" style={{ background: NAVY }}>
        <div className="flex items-center px-4" style={{ height: 60 }}>
          <span className="text-[15px] font-bold tracking-tight" style={{ color: "#eef0f3" }}>Memoria<span style={{ color: GOLD }}>works</span></span>
        </div>
        <div className="px-4 pb-3">
          <div className="text-[12px] font-semibold" style={{ color: "#eef0f3" }}>{PARTNER.name}</div>
          <div className="text-[11px]" style={{ color: "#828c9b" }}>{PARTNER.region} · 파트너 콘솔</div>
        </div>
        <nav className="flex-1 px-2.5">
          <NavSection>운영</NavSection>
          <NavItem icon={<LayoutGrid className={ICON} strokeWidth={1.9} />} label="통합 대시보드" active={page === "dashboard"} onClick={() => go("dashboard")} />
          <NavItem icon={<FilePlus className={ICON} strokeWidth={1.9} />} label="예약 접수" active={page === "intake"} onClick={() => go("intake")} />
          <NavItem icon={<ListChecks className={ICON} strokeWidth={1.9} />} label="예약 목록" active={page === "list"} onClick={() => go("list")} />
          <NavItem icon={<MonitorPlay className={ICON} strokeWidth={1.9} />} label="라이브 컨트롤" active={page === "live"} onClick={() => go("live")} />
          <div className="my-3 border-t" style={{ borderColor: NAV_LINE }} />
          <NavSection>정산 · 설정</NavSection>
          <NavItem icon={<Wallet className={ICON} strokeWidth={1.9} />} label="정산 조회" active={page === "settle"} onClick={() => go("settle")} />
          <NavItem icon={<Settings className={ICON} strokeWidth={1.9} />} label="설정" active={page === "settings"} onClick={() => go("settings")} />
        </nav>
        <div className="px-4 py-3 text-[10px]" style={{ color: "#566073" }}>자사 테넌트로 스코핑 (멀티테넌트)</div>
      </aside>
      <div className="flex flex-1 flex-col" style={{ background: BG }}>
        <header className="flex items-center justify-between px-6" style={{ background: NAVY, height: 48 }}>
          <span className="text-[12px]" style={{ color: "#8b94a3" }}>{PARTNER.name} · 운영중</span>
          <button className="text-[12px] font-semibold" style={{ color: "#8b94a3" }}>로그아웃</button>
        </header>
        <main className="flex-1 px-6 py-5">
          {page === "dashboard" && <PDashboard onOpenEditor={onOpenEditor} />}
          {page === "intake" && <Intake />}
          {page === "list" && <PList onOpenEditor={onOpenEditor} />}
          {page === "live" && <Live />}
          {page === "settle" && <PSettle />}
          {page === "settings" && (
            <div>
              <PageHeader title="설정" sub="자사 정보 · 담당자" />
              <Card title="파트너사 정보">
                <div className="space-y-2.5 text-[13px]" style={{ color: INK }}>
                  <div className="flex justify-between"><span style={{ color: MUTE }}>상호</span><span className="font-semibold">{PARTNER.name}</span></div>
                  <div className="flex justify-between"><span style={{ color: MUTE }}>지역</span><span>{PARTNER.region}</span></div>
                  <div className="flex justify-between"><span style={{ color: MUTE }}>담당자</span><span>{PARTNER.manager}</span></div>
                  <div className="flex justify-between"><span style={{ color: MUTE }}>호실 수</span><span className="tabular-nums">{PARTNER.rooms}실</span></div>
                </div>
              </Card>
            </div>
          )}
        </main>
        <footer className="px-6 py-3 text-[11px]" style={{ color: FAINT, borderTop: "1px solid " + LINE }}>
          Memoriaworks · 파트너 권한 · 목업 (실데이터 아님)
        </footer>
      </div>
    </div>
  );
}
