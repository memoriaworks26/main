// [파트너] 사이니지 라이브 — 호실 디스플레이 장비 상태/제어, 신호·경보.
import React from "react";
import {
  AlertTriangle, Pause, Play, RefreshCw, Square, Wifi, WifiOff, Zap,
} from "lucide-react";
import { SURFACE, LINE, LINE2, GOLD, GOLD_D, GOLD_SOFT, INK, MUTE, FAINT, STATUS, RADIUS } from "../theme.js";
import { Btn, PageHeader } from "../ui.jsx";
import { useStore, actions } from "../store.js";
import * as D from "../data.js";
import { usePartner } from "./shared.jsx";

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
  const PARTNER = usePartner();
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
      <div className="relative flex items-center justify-center px-4 text-center" style={{ aspectRatio: "16/9", background: slateBg }}>
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

// ── 라즈베리파이 디바이스 헬스 — 온라인·오프라인·네트워크 끊김 모니터 ──
// 색은 라이브 컨트롤과 동일 웜톤(빨강·버건디 배제, 디자인 가이드).
const SIG_WEAK = 40; // 신호 세기 임계 — 이 값 미만이면 네트워크 불안정

// 자사 디바이스를 상태별로 분류 (오프라인=네트워크 끊김, weak=신호 약함)
function deviceHealth(devices, partnerName) {
  const my = devices.filter((d) => d.partner === partnerName);
  const offline = my.filter((d) => d.status === "offline");
  const weak = my.filter((d) => d.status !== "offline" && d.signal > 0 && d.signal < SIG_WEAK);
  const live = my.filter((d) => d.status === "live");
  const online = my.filter((d) => d.status !== "offline");
  return { my, offline, weak, live, online };
}

function StatPill({ label, n, c = MUTE }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 text-[12.5px] font-semibold" style={{ background: SURFACE, border: "1px solid " + LINE, borderRadius: RADIUS }}>
      <span style={{ color: FAINT }}>{label}</span><span className="tabular-nums" style={{ color: c }}>{n}</span>
    </div>
  );
}

// 디바이스 이슈 배너 — 오프라인(네트워크 끊김)·신호 약함. 이상 없으면 한 줄 확인 표시.
function DeviceAlerts({ offline, weak }) {
  if (offline.length === 0 && weak.length === 0) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-2 text-[12.5px] font-semibold" style={{ background: STATUS.online.bg, color: STATUS.online.c, borderRadius: RADIUS }}>
        <Wifi className="h-3.5 w-3.5" /> 모든 사이니지 정상 연결 · 네트워크 이상 없음
      </div>
    );
  }
  return (
    <div className="space-y-1.5">
      {offline.map((d) => (
        <div key={d.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 px-3 py-2 text-[12.5px]" style={{ background: "#f1ece3", border: "1px solid #e4dcce", borderRadius: RADIUS, color: STOP_BROWN }}>
          <WifiOff className="h-4 w-4 shrink-0" />
          <span className="font-bold">{d.room}</span>
          <span>오프라인 · 네트워크 끊김</span>
          {d.lastComm && <span className="tabular-nums" style={{ color: FAINT }}>마지막 통신 {d.lastComm}</span>}
          <span className="ml-auto tabular-nums" style={{ color: FAINT }}>{d.id} · {d.ip}</span>
        </div>
      ))}
      {weak.map((d) => (
        <div key={d.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 px-3 py-2 text-[12.5px]" style={{ background: GOLD_SOFT, border: "1px solid " + GOLD, borderRadius: RADIUS, color: GOLD_D }}>
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="font-bold">{d.room}</span>
          <span>신호 약함 · 네트워크 불안정</span>
          <span className="tabular-nums" style={{ color: FAINT }}>신호 {d.signal}</span>
          <span className="ml-auto tabular-nums" style={{ color: FAINT }}>{d.id} · {d.ip}</span>
        </div>
      ))}
    </div>
  );
}

export function Live() {
  const PARTNER = usePartner();
  const { devices } = useStore(); // 목 DB — 라이브 컨트롤 ↔ 관리자 사이니지 공유
  const { my, offline, weak, live, online } = deviceHealth(devices, PARTNER.name);
  const rows = devices.filter((d) => d.partner === PARTNER.name && d.room.includes("호실")).slice(0, 4);
  return (
    <div>
      <PageHeader title="라이브 컨트롤" sub="사이니지를 실시간으로 제어합니다." right={<Btn size="sm" variant="neutral"><RefreshCw className="h-3.5 w-3.5" /> 상태 새로고침</Btn>} />
      {/* 라즈베리파이 디바이스 헬스 — 온라인·오프라인·네트워크 끊김 */}
      <div className="mb-4 space-y-2">
        <div className="flex flex-wrap gap-2">
          <StatPill label="전체" n={my.length} />
          <StatPill label="재생중" n={live.length} c={LIVE_GOLD} />
          <StatPill label="연결됨" n={online.length} c={SIG_GREEN} />
          <StatPill label="오프라인" n={offline.length} c={STOP_BROWN} />
        </div>
        <DeviceAlerts offline={offline} weak={weak} />
      </div>
      <div className="grid grid-cols-4 gap-3">
        {rows.map((d) => <LiveCard key={d.id} dev={d} />)}
      </div>
    </div>
  );
}

