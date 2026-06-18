import React, { useState } from "react";
import {
  LayoutGrid, FilePlus, ListChecks, MonitorPlay,
  Settings, Plus, ChevronLeft, ChevronRight, Copy, Send,
  Play, Pause, Square, RefreshCw, Zap, AlertTriangle, Check,
  Lock, Eye, EyeOff, X,
} from "lucide-react";
import { NAVY, BG, SURFACE, LINE, LINE2, GOLD, GOLD_SOFT, GOLD_D, INK, MUTE, FAINT, NAV_LINE, SERIF, RADIUS, STATUS } from "./theme.js";
import { Tag, Btn, Card, MetricRow, Table, PageHeader, NavItem, NavSection, Logo, DateField, Modal } from "./ui.jsx";
import { RoomCard } from "./roomcard.jsx";
import * as D from "./data.js";
import { useStore, actions } from "./store.js";

const PARTNER = D.PARTNERS[0]; // 무지개동산 반려동물장례식장 (테넌트 스코핑)
const ICON = "h-4 w-4";

// 복사 버튼 (클릭 시 클립보드 복사 + 잠깐 "복사됨")
function CopyBtn({ text, label = "복사" }) {
  const [done, setDone] = useState(false);
  const copy = () => { try { navigator.clipboard && navigator.clipboard.writeText(text); } catch (e) {} setDone(true); setTimeout(() => setDone(false), 1500); };
  return <Btn size="sm" variant="neutral" onClick={copy}>{done ? <><Check className="h-3.5 w-3.5" /> 복사됨</> : <><Copy className="h-3.5 w-3.5" /> {label}</>}</Btn>;
}

// 비밀번호 입력 칸 (표시/숨김 토글)
function PwField({ label, value, onChange }) {
  const [show, setShow] = useState(false);
  return (
    <label className="block">
      <span className="text-[12px] font-semibold" style={{ color: MUTE }}>{label}</span>
      <div className="mt-1 flex items-center px-3" style={{ height: 36, background: SURFACE, border: "1px solid " + LINE, borderRadius: RADIUS }}>
        <input type={show ? "text" : "password"} value={value} onChange={(e) => onChange(e.target.value)} autoComplete="off"
          className="flex-1 bg-transparent text-[13px] outline-none" style={{ color: INK }} />
        <button type="button" onClick={() => setShow((s) => !s)} className="shrink-0 transition hover:opacity-70" style={{ color: MUTE }}>
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </label>
  );
}

// 비밀번호 변경 모달 (목업 — 실제 저장 없음, 입력 검증만)
function PwChangeModal({ open, onClose }) {
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);
  const reset = () => { setCur(""); setNext(""); setConfirm(""); setDone(false); };
  const close = () => { reset(); onClose(); };
  const err = !next ? "" : next.length < 8 ? "새 비밀번호는 8자 이상이어야 합니다." : (confirm && next !== confirm) ? "새 비밀번호가 일치하지 않습니다." : "";
  const ok = cur && next.length >= 8 && next === confirm;
  const submit = () => { if (!ok) return; setDone(true); setTimeout(close, 1400); };
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

// 자사 현황판 (조회 — 편집·컨펌은 관리자 HQ가 수행)
function PDashboard({ onNew }) {
  const { rooms } = useStore(); // 목 DB — 추모실 명칭·위치 편집 전파
  const cases = rooms.filter((r) => r.type === "case");
  return (
    <div>
      <PageHeader title="통합 대시보드" sub={PARTNER.name + " · 자사 추모실 현황"} right={<Btn size="sm" onClick={onNew}><Plus className="h-4 w-4" /> 신규 예약</Btn>} />
      <div className="mb-4">
        <MetricRow items={[
          { label: "오늘 예약", value: "2건" },
          { label: "진행 중", value: cases.filter((r) => r.status !== "published").length + "건" },
          { label: "이번달 완료", value: "12건" },
          { label: "이번달 청구", value: "180만", sub: "VAT 별도" },
        ]} />
      </div>
      <div className="mb-2 text-[13px] font-bold" style={{ color: INK }}>추모실별 현황 <span className="font-normal" style={{ color: FAINT }}>· 오늘 기준</span></div>
      <div className="flex flex-wrap gap-3.5">
        {rooms.map((r) => <RoomCard key={r.id} room={r} readOnly onSave={(id, patch) => actions.setRoom(id, patch)} />)}
      </div>
    </div>
  );
}

// 예약 접수 폼 (확정 → 보호자 URL 생성)
function Intake() {
  const [date, setDate] = useState("2026-06-18");
  const [result, setResult] = useState(null); // 확정 후 생성된 URL
  const confirm = () => setResult({ url: "memoria.works/f/" + Math.random().toString(36).slice(2, 8) });
  const field = (label, ph, req) => (
    <label className="block">
      <span className="text-[12px] font-semibold" style={{ color: MUTE }}>{label}{req && <span style={{ color: GOLD }}> *</span>}</span>
      <input placeholder={ph} className="mt-1 w-full bg-transparent px-3 text-[13px] outline-none" style={{ height: 36, background: SURFACE, border: "1px solid " + LINE, borderRadius: RADIUS, color: INK }} />
    </label>
  );
  return (
    <div>
      <PageHeader title="예약 접수" sub="날짜·추모실·시간 → 보호자/반려동물 정보 → 확정 시 보호자 영상제작 URL 생성" />
      <div className="grid grid-cols-2 gap-4" style={{ maxWidth: 880 }}>
        <Card title="일정">
          <div className="space-y-3">
            <DateField label="날짜" value={date} onChange={setDate} req />
            <label className="block">
              <span className="text-[12px] font-semibold" style={{ color: MUTE }}>추모실 <span style={{ color: GOLD }}>*</span></span>
              <select className="mt-1 w-full px-3 text-[13px] outline-none" style={{ height: 36, background: SURFACE, border: "1px solid " + LINE, borderRadius: RADIUS, color: INK }}>
                {D.NAV_ROOMS.slice(0, 4).map((r) => <option key={r}>{r}</option>)}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-2">{field("안치", "06-18 09:00")}{field("화장", "06-20 07:00")}</div>
          </div>
        </Card>
        <Card title="보호자 · 반려동물 정보">
          <div className="space-y-3">
            {field("보호자 성함", "보호자 성함을 입력해 주세요", true)}
            {field("연락처", "010-0000-0000", true)}
            {field("반려동물 이름", "반려동물 이름을 입력해 주세요", true)}
            {field("품종", "말티즈", false)}
            {field("나이", "15", false)}
          </div>
        </Card>
      </div>
      {result ? (
        <div className="mt-4 px-4 py-3.5" style={{ maxWidth: 880, background: GOLD_SOFT, border: "1px solid " + GOLD, borderRadius: RADIUS }}>
          <div className="flex items-center gap-1.5 text-[13px] font-bold" style={{ color: GOLD_D }}><Check className="h-4 w-4" /> 예약 확정 · 보호자 영상제작 URL이 생성되었습니다</div>
          <div className="mt-2.5 flex items-center gap-2">
            <div className="flex-1 px-3 py-2 text-[13px] tabular-nums" style={{ background: "#fff", border: "1px solid " + LINE, borderRadius: RADIUS, color: GOLD_D }}>{result.url}</div>
            <CopyBtn text={result.url} />
            <Btn size="sm" variant="neutral" onClick={() => setResult(null)}>새 예약</Btn>
          </div>
          <p className="mt-2 text-[11px]" style={{ color: FAINT }}>※ 보호자에게 알림톡으로 자동 발송됩니다. (퇴실 시 자동 무효화)</p>
        </div>
      ) : (
        <div className="mt-4 flex gap-2" style={{ maxWidth: 880 }}>
          <Btn onClick={confirm}>예약 확정 · 영상제작 URL 생성</Btn>
          <Btn variant="neutral">임시 저장</Btn>
        </div>
      )}
    </div>
  );
}

// 예약 목록 → 상세
function PList({ onDetail }) {
  const { reservations } = useStore(); // 목 DB — 관리자 컨펌·발행이 자사 목록에 전파
  const cols = [
    { key: "deceased", label: "반려동물" }, { key: "chief", label: "보호자" }, { key: "phone", label: "연락처" },
    { key: "room", label: "추모실" }, { key: "time", label: "일정" }, { key: "video", label: "영상" }, { key: "act", label: "", align: "right" },
  ];
  return (
    <div>
      <PageHeader title="예약 목록" sub="자사 예약 · 영상 진행 상태" />
      <Table cols={cols} empty="아직 접수된 예약이 없습니다. ‘예약 접수’에서 신규 예약을 등록하세요." rows={reservations.filter((r) => r.partner === PARTNER.name)} renderCell={(r, k) =>
        k === "deceased" ? <button onClick={() => onDetail(r)} style={{ fontFamily: SERIF, fontWeight: 700, color: INK }} className="hover:underline">{r.deceased}</button> :
        k === "video" ? <Tag s={r.status} /> :
        k === "act" ? <button onClick={() => onDetail(r)} className="text-[12px] font-semibold" style={{ color: GOLD }}>상세 →</button> : r[k]
      } />
    </div>
  );
}

// 예약 상세 (보호자 영상제작 URL · 문자 재발송)
function ReservDetail({ reserv, onBack }) {
  const { reservations } = useStore();
  const r = reservations.find((x) => x.id === (reserv && reserv.id)) || reserv || reservations[1]; // 라이브 상태 반영
  const d = D.RESERV_DETAIL;
  const [sent, setSent] = useState(false);
  const resend = () => { setSent(true); setTimeout(() => setSent(false), 1500); };
  return (
    <div>
      <PageHeader title={r.deceased} sub={r.room + " · 보호자 " + r.chief} back={{ onClick: onBack, label: "예약 목록" }} />
      <div className="grid grid-cols-2 gap-4">
        <Card title="예약 정보">
          <div className="space-y-2 text-[13px]" style={{ color: INK }}>
            <div className="flex justify-between"><span style={{ color: MUTE }}>반려동물</span><span style={{ fontFamily: SERIF, fontWeight: 700 }}>{r.deceased}</span></div>
            <div className="flex justify-between"><span style={{ color: MUTE }}>보호자</span><span>{r.chief}</span></div>
            <div className="flex justify-between"><span style={{ color: MUTE }}>연락처</span><span className="tabular-nums">{r.phone}</span></div>
            <div className="flex justify-between"><span style={{ color: MUTE }}>추모실·일정</span><span>{r.room} · {r.time}</span></div>
            <div className="flex items-center justify-between"><span style={{ color: MUTE }}>영상</span><Tag s={r.status} /></div>
          </div>
        </Card>
        <Card title="추모 영상">
          <div className="relative flex items-center justify-center" style={{ aspectRatio: "16/9", background: "#2a323d", borderRadius: RADIUS }}>
            <span className="text-[12px]" style={{ color: "#aab2bf" }}>{r.status === "published" ? "발행 완료" : r.status === "review" ? "컨펌 대기" : "제작 중"}</span>
          </div>
          <p className="mt-2 text-[11px]" style={{ color: FAINT }}>※ 영상 편집·컨펌은 관리자(HQ)에서 진행됩니다.</p>
        </Card>
      </div>
      <div className="mt-4">
        <Card title="🔗 보호자 영상제작 URL">
          <div className="flex items-center gap-2">
            <div className="flex-1 px-3 py-2 text-[13px] tabular-nums" style={{ background: "#f6f3ec", border: "1px solid " + LINE, borderRadius: RADIUS, color: GOLD_D }}>{d.formUrl}</div>
            <CopyBtn text={d.formUrl} />
            <Btn size="sm" onClick={resend}>{sent ? <><Check className="h-3.5 w-3.5" /> 발송됨</> : <><Send className="h-3.5 w-3.5" /> 문자 재발송</>}</Btn>
          </div>
          <div className="mt-2 flex items-center gap-4 text-[11px]" style={{ color: FAINT }}>
            <span>고유 코드: <b style={{ color: MUTE }}>{d.code}</b></span>
            <span>최근 발송: {d.smsSentAt}</span>
            <span>퇴실 시 자동 무효화</span>
          </div>
        </Card>
      </div>
      <div className="mt-4">
        <Card title="📝 보호자 입력 정보 (유저 입력 폼 수신)">
          <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 text-[13px]" style={{ color: INK }}>
            {d.form.map((f, i) => (
              <div key={i} className="flex justify-between gap-3" style={{ gridColumn: f.value && f.value.length > 18 ? "span 2" : undefined }}>
                <span className="shrink-0" style={{ color: MUTE }}>{f.label}{f.common && <span className="ml-1 text-[10px]" style={{ color: FAINT }}>공통</span>}</span>
                <span className="text-right">{f.value}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px]" style={{ color: FAINT }}>※ 파트너사 폼 템플릿 기준으로 수집 — 공통 항목 + 파트너사 전용 항목.</p>
        </Card>
      </div>
    </div>
  );
}

// 라이브 컨트롤 — 빨강·버건디 배제(디자인 가이드). LIVE·정지·오프라인은 웜톤(골드·브라운·뉴트럴)으로 표현.
const SIG_GREEN = "#3a7468", LIVE_GOLD = "#a8782e", PAUSE_BLUE = "#3f5e87", STOP_BROWN = "#8a6f5a", WARN_AMBER = "#a8782e";

function SignalBar({ value }) {
  return (
    <div className="mb-2.5 flex items-center gap-2">
      <span className="shrink-0 text-[11px]" style={{ color: FAINT }}>신호</span>
      <div className="relative h-1.5 flex-1 rounded-full" style={{ background: "#e7e2d8" }}>
        <div className="h-full rounded-full" style={{ width: value + "%", background: SIG_GREEN }} />
      </div>
      <span className="shrink-0 text-[11px] tabular-nums" style={{ color: MUTE }}>{value}</span>
    </div>
  );
}

function CtrlBtn({ icon, label, color, active, onClick }) {
  return (
    <button onClick={onClick} className="flex flex-1 items-center justify-center gap-1.5 py-2 text-[12.5px] font-bold outline-none transition focus-visible:ring-1"
      style={{ borderRadius: RADIUS, border: "1.5px solid " + color, color, background: active ? color + "1f" : "#fff" }}>
      {icon} {label}
    </button>
  );
}

function LiveCard({ dev }) {
  const offline = dev.status === "offline";
  const mode = dev.mode;
  const play = dev.play || (dev.status === "live" ? "playing" : "stopped");
  const setMode = (m) => actions.setDeviceMode(dev.id, m);
  const setPlay = (p) => actions.setDevicePlay(dev.id, p);
  const live = !offline && play === "playing";

  const slateBg = offline ? "#211d18" : live ? "#16231d" : "#1c232c";
  const slateText = offline ? "신호 없음" : live ? dev.playing + " 재생중" : PARTNER.name + " · " + dev.room + " 대기화면";

  return (
    <div className="overflow-hidden" style={{ background: SURFACE, border: "1px solid " + LINE, borderRadius: 8 }}>
      {/* 미리보기 슬레이트 */}
      <div className="relative flex items-center justify-center px-4 text-center" style={{ height: 116, background: slateBg }}>
        <span className="absolute left-2.5 top-2.5 px-2 py-[3px] text-[10.5px] font-bold" style={{ borderRadius: 3, background: offline ? "#403a33" : "rgba(255,255,255,.92)", color: offline ? "#d8d0c2" : SIG_GREEN }}>
          {offline ? "오프라인" : "연결됨"}
        </span>
        {live && (
          <span className="absolute right-2.5 top-2.5 flex items-center gap-1 px-2 py-[3px] text-[10.5px] font-bold text-white" style={{ borderRadius: 3, background: LIVE_GOLD }}>
            <span className="h-1.5 w-1.5 rounded-full bg-white" /> LIVE
          </span>
        )}
        <span className="text-[12.5px]" style={{ color: offline ? "#8a7676" : "rgba(243,239,230,.92)", whiteSpace: "pre-line" }}>{slateText}</span>
      </div>

      {/* 정보 + 제어 */}
      <div className="px-4 py-3.5">
        <div className="mb-0.5 flex items-center gap-2">
          <span className="text-[15px] font-bold" style={{ color: INK }}>{dev.room}</span>
          {offline && <span className="flex items-center gap-1 text-[12px] font-semibold" style={{ color: STOP_BROWN }}><AlertTriangle className="h-3.5 w-3.5" /> 오프라인</span>}
        </div>
        <div className="mb-3 text-[12px]" style={{ color: offline ? FAINT : live ? SIG_GREEN : MUTE }}>
          {offline ? "마지막 통신: " + dev.lastComm : live ? dev.playing + " 재생중" : "대기 모드"}
        </div>

        {offline ? (
          <>
            <div className="mb-2.5 px-3 py-2.5 text-[12.5px]" style={{ background: "#f1ece3", border: "1px solid #e4dcce", borderRadius: RADIUS, color: STOP_BROWN }}>장비가 응답하지 않습니다.</div>
            <div className="space-y-2">
              <button className="flex w-full items-center justify-center gap-1.5 py-2.5 text-[12.5px] font-bold" style={{ borderRadius: RADIUS, border: "1px solid " + LINE2, color: INK }}><RefreshCw className="h-4 w-4" /> 상태 새로고침</button>
              <button className="flex w-full items-center justify-center gap-1.5 py-2.5 text-[12.5px] font-bold" style={{ borderRadius: RADIUS, border: "1.5px solid " + SIG_GREEN, color: SIG_GREEN }}><Play className="h-4 w-4" /> 플레이어 재시작</button>
              <button className="flex w-full items-center justify-center gap-1.5 py-2.5 text-[12.5px] font-bold" style={{ borderRadius: RADIUS, border: "1.5px solid " + WARN_AMBER, color: WARN_AMBER }}><Zap className="h-4 w-4" /> 장비 재부팅</button>
            </div>
          </>
        ) : (
          <>
            <SignalBar value={dev.signal} />
            <div className="mb-2 grid grid-cols-4 gap-1.5">
              {D.SIGNAGE_MODES.map((m) => {
                const on = mode === m;
                return (
                  <button key={m} onClick={() => setMode(m)} className="py-2 text-[12px] font-bold outline-none transition focus-visible:ring-1"
                    style={{ borderRadius: RADIUS, background: on ? INK : "#fff", color: on ? "#fff" : MUTE, border: "1px solid " + (on ? INK : LINE2) }}>{m}</button>
                );
              })}
            </div>
            <div className="flex gap-1.5">
              <CtrlBtn icon={<Play className="h-4 w-4" fill="currentColor" />} label="재생" color={SIG_GREEN} active={play === "playing"} onClick={() => setPlay("playing")} />
              <CtrlBtn icon={<Pause className="h-4 w-4" fill="currentColor" />} label="일시정지" color={PAUSE_BLUE} active={play === "paused"} onClick={() => setPlay("paused")} />
              <CtrlBtn icon={<Square className="h-3.5 w-3.5" fill="currentColor" />} label="정지" color={STOP_BROWN} active={play === "stopped"} onClick={() => setPlay("stopped")} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Live() {
  const { devices } = useStore(); // 목 DB — 라이브 컨트롤 ↔ 관리자 사이니지 공유
  const rows = devices.filter((d) => d.partner === PARTNER.name && d.room.includes("추모실")).slice(0, 4);
  return (
    <div>
      <PageHeader title="라이브 컨트롤" sub="사이니지를 실시간으로 제어합니다." />
      <div className="grid grid-cols-2 gap-4">
        {rows.map((d) => <LiveCard key={d.id} dev={d} />)}
      </div>
    </div>
  );
}

export default function PartnerConsole() {
  const [page, setPage] = useState("dashboard");
  const [detail, setDetail] = useState(null);
  const [pwOpen, setPwOpen] = useState(false);
  const go = (p) => { setDetail(null); setPage(p); };
  const openDetail = (r) => { setDetail(r); setPage("list"); };

  return (
    <div className="flex" style={{ minHeight: "calc(100vh - 44px)" }}>
      <aside className="flex w-60 flex-col" style={{ background: NAVY }}>
        <div className="flex items-center justify-center px-5" style={{ height: 76, background: NAVY, borderBottom: "1px solid " + NAV_LINE }}>
          <div className="flex items-center justify-center rounded-full bg-white px-5 py-2.5">
            <Logo height={30} />
          </div>
        </div>
        <div className="px-4 pb-3 pt-3.5">
          <div className="text-[15px] font-bold" style={{ color: "#eef0f3" }}>{PARTNER.name}</div>
          <div className="text-[11px]" style={{ color: "#828c9b" }}>{PARTNER.region} · 파트너 콘솔</div>
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
        <div className="px-4 py-3 text-[10px]" style={{ color: "#566073" }}>자사 테넌트로 스코핑 (멀티테넌트)</div>
      </aside>
      <div className="flex flex-1 flex-col" style={{ background: BG }}>
        <header className="flex items-center justify-between px-6" style={{ background: NAVY, height: 48 }}>
          <span className="text-[12px]" style={{ color: "#8b94a3" }}>{PARTNER.name} · 운영중</span>
          <button className="text-[12px] font-semibold" style={{ color: "#8b94a3" }}>로그아웃</button>
        </header>
        <main className="flex-1 px-6 py-5">
          {page === "dashboard" && <PDashboard onNew={() => go("intake")} />}
          {page === "intake" && <Intake />}
          {page === "list" && (detail ? <ReservDetail reserv={detail} onBack={() => setDetail(null)} /> : <PList onDetail={openDetail} />)}
          {page === "live" && <Live />}
          {page === "settings" && (
            <div>
              <PageHeader title="설정" sub="자사 정보 · 고유 코드 · 비밀번호" />
              <div className="grid grid-cols-2 gap-4" style={{ maxWidth: 880 }}>
                <Card title="파트너사 정보">
                  <div className="space-y-2.5 text-[13px]" style={{ color: INK }}>
                    <div className="flex justify-between"><span style={{ color: MUTE }}>상호</span><span className="font-semibold">{PARTNER.name}</span></div>
                    <div className="flex justify-between"><span style={{ color: MUTE }}>지역</span><span>{PARTNER.region}</span></div>
                    <div className="flex justify-between"><span style={{ color: MUTE }}>담당자</span><span>{PARTNER.manager}</span></div>
                    <div className="flex justify-between"><span style={{ color: MUTE }}>추모실 수</span><span className="tabular-nums">{PARTNER.rooms}실</span></div>
                  </div>
                </Card>
                <Card title="고유 코드 · 비밀번호">
                  <div className="space-y-2.5 text-[13px]" style={{ color: INK }}>
                    <div className="flex justify-between"><span style={{ color: MUTE }}>고유 코드</span><span className="tabular-nums font-semibold" style={{ color: GOLD_D }}>{PARTNER.id}</span></div>
                    <div className="flex items-center justify-between"><span style={{ color: MUTE }}>비밀번호</span><Btn size="sm" variant="ghost" onClick={() => setPwOpen(true)}>변경</Btn></div>
                  </div>
                </Card>
              </div>
            </div>
          )}
        </main>
        <footer className="px-6 py-3 text-[11px]" style={{ color: FAINT, borderTop: "1px solid " + LINE }}>
          Memoriaworks · 파트너 권한 · 목업 (실데이터 아님)
        </footer>
        <PwChangeModal open={pwOpen} onClose={() => setPwOpen(false)} />
      </div>
    </div>
  );
}
