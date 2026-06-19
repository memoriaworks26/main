// [파트너] 사이니지 라이브 — 호실 디스플레이 장비 상태/제어, 음량·소스 관리.
import React, { useState } from "react";
import {
  AlertTriangle, Bell, Film, Image as ImageIcon, Megaphone, Monitor, Pause, Play,
  Plus, RefreshCw, Repeat, Settings2, Square, Trash2, Upload, Volume2, VolumeX,
  Wifi, WifiOff, X, Zap,
} from "lucide-react";
import { SURFACE, LINE, LINE2, GOLD, GOLD_D, GOLD_SOFT, INK, MUTE, FAINT, STATUS, RADIUS } from "../theme.js";
import { Btn, PageHeader, Modal } from "../ui.jsx";
import { useStore, actions } from "../store.js";
import { toast } from "../toast.jsx";
import * as D from "../data.js";
import { usePartner } from "./shared.jsx";

const SIG_GREEN = "#3a7468", LIVE_GOLD = "#a8782e", PAUSE_BLUE = "#3f5e87", STOP_BROWN = "#8a6f5a", WARN_AMBER = "#a8782e";

const CAT_META = {
  "광고": { icon: Megaphone, label: "광고", color: LIVE_GOLD },
  "대기": { icon: Monitor, label: "대기화면", color: PAUSE_BLUE },
  "알림": { icon: Bell, label: "알림", color: SIG_GREEN },
};
const SOURCE_KINDS = [
  { key: "이미지", icon: ImageIcon, ext: ".jpg" },
  { key: "영상", icon: Film, ext: ".mp4" },
];

// 파트너의 다음(가장 임박한) 예약 — 알림 문구 자동 생성용. 발행 완료 건은 제외.
function nextReservation(reservations, partnerName) {
  const mine = reservations
    .filter((r) => r.partner === partnerName && r.status !== "published")
    .sort((a, b) => (a.date + a.slot).localeCompare(b.date + b.slot));
  return mine[0] || null;
}
// 알림 문구 템플릿에 다음 예약값 치환
function fillNotice(tpl, r) {
  if (!r) return "";
  return (tpl || "")
    .replace(/\{chief\}/g, r.chief)
    .replace(/\{deceased\}/g, r.deceased)
    .replace(/\{room\}/g, r.room)
    .replace(/\{slot\}/g, r.slot)
    .replace(/\{date\}/g, r.date);
}

// 음량 조절 — 슬라이더 + 음소거 토글. volume 0 또는 muted면 음소거 상태.
function VolumeControl({ dev }) {
  const muted = dev.muted || dev.volume === 0;
  const toggleMute = () => actions.setDeviceMuted(dev.id, !dev.muted);
  return (
    <div className="mb-2.5 flex items-center gap-2">
      <button onClick={toggleMute} title={muted ? "음소거 해제" : "음소거"}
        className="shrink-0 outline-none transition hover:opacity-70 focus-visible:ring-1"
        style={{ color: muted ? STOP_BROWN : SIG_GREEN }}>
        {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      </button>
      <input type="range" min={0} max={100} value={muted ? 0 : dev.volume}
        onChange={(e) => actions.setDeviceVolume(dev.id, +e.target.value)}
        className="h-1.5 flex-1 cursor-pointer" style={{ accentColor: GOLD }} />
      <span className="w-10 shrink-0 text-right text-[11px] tabular-nums" style={{ color: muted ? FAINT : MUTE }}>
        {muted ? "음소거" : dev.volume}
      </span>
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
  const { signageSources, signageNotice, reservations } = useStore();
  const offline = dev.status === "offline";
  const mode = dev.mode;
  const play = dev.play || (dev.status === "live" ? "playing" : "stopped");
  const setMode = (m) => actions.setDeviceMode(dev.id, m);
  const setPlay = (p) => actions.setDevicePlay(dev.id, p);
  const live = !offline && play === "playing";

  // 모드별 표출 콘텐츠 — 제작영상은 dev.playing, 그 외(광고·대기·알림)는 켜진 소스를 무한 반복
  const activeSrc = signageSources.find((s) => s.cat === mode && s.active);
  const modeLabel = CAT_META[mode]?.label || "제작영상";
  // 알림 모드: 소스 위에 다음 예약 안내 문구 오버레이
  const noticeText = signageNotice.enabled ? fillNotice(signageNotice.template, nextReservation(reservations, PARTNER.name)) : "";

  let slateMain;
  if (offline) slateMain = "신호 없음";
  else if (mode === "제작영상") slateMain = dev.playing + (live ? " 재생중" : " 대기");
  else if (activeSrc) slateMain = activeSrc.name + "\n" + modeLabel + (live ? " 무한 반복중" : " 일시정지");
  else slateMain = modeLabel + " 소스 미등록";

  const slateBg = offline ? "#211d18" : live ? "#16231d" : "#1c232c";
  const showNotice = !offline && mode === "알림" && live && noticeText;

  return (
    <div className="overflow-hidden" style={{ background: SURFACE, border: "1px solid " + LINE, borderRadius: 8 }}>
      {/* 미리보기 슬레이트 */}
      <div className="relative flex items-center justify-center px-4 text-center" style={{ aspectRatio: "16/9", background: slateBg }}>
        <span className="absolute left-2.5 top-2.5 px-2 py-[3px] text-[10.5px] font-bold" style={{ borderRadius: 3, background: offline ? "#403a33" : "rgba(255,255,255,.92)", color: offline ? "#d8d0c2" : SIG_GREEN }}>
          {offline ? "오프라인" : "연결됨"}
        </span>
        {live && (
          mode === "제작영상" ? (
            <span className="absolute right-2.5 top-2.5 flex items-center gap-1 px-2 py-[3px] text-[10.5px] font-bold text-white" style={{ borderRadius: 3, background: LIVE_GOLD }}>
              <span className="h-1.5 w-1.5 rounded-full bg-white" /> LIVE
            </span>
          ) : (
            <span className="absolute right-2.5 top-2.5 flex items-center gap-1 px-2 py-[3px] text-[10.5px] font-bold text-white" style={{ borderRadius: 3, background: CAT_META[mode]?.color || LIVE_GOLD }}>
              <Repeat className="h-3 w-3" /> 반복
            </span>
          )
        )}
        <span className="text-[12.5px]" style={{ color: offline ? "#8a7676" : "rgba(243,239,230,.92)", whiteSpace: "pre-line" }}>{slateMain}</span>
        {showNotice && (
          <span className="absolute inset-x-0 bottom-0 truncate px-3 py-1.5 text-left text-[11px] font-semibold text-white" style={{ background: "rgba(168,120,46,.92)" }}>
            {noticeText}
          </span>
        )}
      </div>

      {/* 정보 + 제어 */}
      <div className="px-4 py-3.5">
        <div className="mb-0.5 flex items-center gap-2">
          <span className="text-[15px] font-bold" style={{ color: INK }}>{dev.room}</span>
          {offline && <span className="flex items-center gap-1 text-[12px] font-semibold" style={{ color: STOP_BROWN }}><AlertTriangle className="h-3.5 w-3.5" /> 오프라인</span>}
        </div>
        <div className="mb-3 text-[12px]" style={{ color: offline ? FAINT : live ? SIG_GREEN : MUTE }}>
          {offline ? "마지막 통신: " + dev.lastComm : mode === "제작영상" ? (live ? dev.playing + " 재생중" : "대기 모드") : modeLabel + (live ? " 무한 반복" : " 정지")}
        </div>

        {offline ? (
          <>
            <div className="mb-2.5 px-3 py-2.5 text-[12.5px]" style={{ background: "#f1ece3", border: "1px solid #e4dcce", borderRadius: RADIUS, color: STOP_BROWN }}>장비가 응답하지 않습니다.</div>
            <div className="space-y-2">
              <button onClick={() => toast("상태를 새로고침했습니다")} className="flex w-full items-center justify-center gap-1.5 py-2.5 text-[12.5px] font-bold" style={{ borderRadius: RADIUS, border: "1px solid " + LINE2, color: INK }}><RefreshCw className="h-4 w-4" /> 상태 새로고침</button>
              <button onClick={() => toast("플레이어를 재시작했습니다")} className="flex w-full items-center justify-center gap-1.5 py-2.5 text-[12.5px] font-bold" style={{ borderRadius: RADIUS, border: "1.5px solid " + SIG_GREEN, color: SIG_GREEN }}><Play className="h-4 w-4" /> 플레이어 재시작</button>
              <button onClick={() => toast("장비를 재부팅했습니다")} className="flex w-full items-center justify-center gap-1.5 py-2.5 text-[12.5px] font-bold" style={{ borderRadius: RADIUS, border: "1.5px solid " + WARN_AMBER, color: WARN_AMBER }}><Zap className="h-4 w-4" /> 장비 재부팅</button>
            </div>
          </>
        ) : (
          <>
            <VolumeControl dev={dev} />
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

// ── 사이니지 소스 관리 — 광고·대기화면·알림 표출 콘텐츠 등록/관리(이미지·영상 업로드) ──

// 알림 문구 편집기 — 다음 예약을 자동 치환해 소스 위에 띄울 안내 문구
function NoticeEditor() {
  const PARTNER = usePartner();
  const { signageNotice, reservations } = useStore();
  const nextRes = nextReservation(reservations, PARTNER.name);
  const preview = fillNotice(signageNotice.template, nextRes);
  const chips = [["{chief}", "보호자명"], ["{deceased}", "반려동물명"], ["{room}", "호실"], ["{slot}", "시간"], ["{date}", "날짜"]];
  return (
    <div className="mt-4 pt-4" style={{ borderTop: "1px solid " + LINE }}>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[12px] font-semibold" style={{ color: MUTE }}>다음 예약 알림 문구</span>
        <button onClick={() => actions.setSignageNotice({ enabled: !signageNotice.enabled })}
          className="px-2 py-1 text-[11px] font-bold outline-none transition focus-visible:ring-1"
          style={{ borderRadius: RADIUS, border: "1px solid " + (signageNotice.enabled ? SIG_GREEN : LINE2), color: signageNotice.enabled ? "#fff" : MUTE, background: signageNotice.enabled ? SIG_GREEN : "#fff" }}>
          {signageNotice.enabled ? "표출 켜짐" : "표출 꺼짐"}
        </button>
      </div>
      <textarea value={signageNotice.template} onChange={(e) => actions.setSignageNotice({ template: e.target.value })}
        rows={2} className="w-full resize-none px-3 py-2 text-[12.5px] outline-none focus-visible:ring-1"
        style={{ border: "1px solid " + LINE2, borderRadius: RADIUS, color: INK }} />
      <div className="mt-1.5 flex flex-wrap gap-1">
        {chips.map(([tag, ko]) => (
          <button key={tag} onClick={() => actions.setSignageNotice({ template: signageNotice.template + " " + tag })}
            className="px-2 py-0.5 text-[11px] font-semibold outline-none transition hover:opacity-80 focus-visible:ring-1"
            style={{ borderRadius: RADIUS, background: GOLD_SOFT, color: GOLD_D, border: "1px solid " + GOLD }}>+ {ko}</button>
        ))}
      </div>
      <div className="mt-2 text-[11px]" style={{ color: FAINT }}>미리보기 {nextRes ? "· 다음 예약 " + nextRes.deceased : "· 예정 예약 없음"}</div>
      <div className="mt-1 truncate px-3 py-2 text-[12px] font-semibold text-white" style={{ borderRadius: RADIUS, background: "rgba(168,120,46,.92)" }}>
        {preview || "표출할 다음 예약이 없습니다"}
      </div>
    </div>
  );
}

// 소스 등록/관리 모달 — 한 카테고리(광고|대기|알림)의 표출 소스 목록 + 업로드/삭제/사용 토글
function SourceManagerModal({ cat, onClose }) {
  const { signageSources } = useStore();
  const list = signageSources.filter((s) => s.cat === cat);
  const meta = CAT_META[cat];
  const Icon = meta.icon;
  const [name, setName] = useState("");
  const [kind, setKind] = useState("이미지");
  const [file, setFile] = useState("");

  // 파일 업로드(목업) — 드롭존 클릭 시 선택된 파일로 간주
  const pickFile = () => {
    const def = SOURCE_KINDS.find((k) => k.key === kind);
    const fn = (kind === "영상" ? "새_영상_" : "새_이미지_") + Date.now().toString(36).slice(-4) + def.ext;
    setFile(fn);
    if (!name.trim()) setName(fn.replace(/\.\w+$/, ""));
  };
  const add = () => {
    if (!file) { toast("이미지 또는 영상 파일을 올려주세요"); return; }
    const nm = name.trim() || file.replace(/\.\w+$/, "");
    actions.addSignageSource({ id: "src-" + Date.now().toString(36), cat, name: nm, kind, file, active: false });
    setName(""); setFile("");
    toast(meta.label + " 소스를 등록했습니다");
  };

  return (
    <Modal open onClose={onClose} width={480}>
      <div className="flex items-center justify-between px-5" style={{ height: 50, borderBottom: "1px solid " + LINE }}>
        <span className="flex items-center gap-2 text-[14px] font-semibold" style={{ color: INK }}>
          <Icon className="h-4 w-4" style={{ color: meta.color }} /> {meta.label} 소스 관리
        </span>
        <button onClick={onClose} className="transition hover:opacity-70" style={{ color: MUTE }}><X className="h-4 w-4" /></button>
      </div>

      <div className="max-h-[72vh] overflow-y-auto px-5 py-4">
        <div className="mb-2 flex items-start gap-1.5 px-3 py-2 text-[12px] leading-relaxed" style={{ background: "#faf8f3", border: "1px solid " + LINE, borderRadius: RADIUS, color: MUTE }}>
          <Repeat className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: meta.color }} />
          <span>표출할 <b style={{ color: INK }}>{meta.label}</b> 소스 1개를 선택하세요. 호실에서 {meta.label} 탭을 누르면 그 소스가 무한 반복됩니다.</span>
        </div>

        {/* 등록된 소스 목록 */}
        <div className="mb-1.5 text-[12px] font-semibold" style={{ color: MUTE }}>등록된 소스 {list.length}건</div>
        <div className="space-y-1.5">
          {list.length === 0 && (
            <div className="px-3 py-4 text-center text-[12.5px]" style={{ background: "#faf8f3", border: "1px dashed " + LINE2, borderRadius: RADIUS, color: FAINT }}>등록된 {meta.label} 소스가 없습니다.</div>
          )}
          {list.map((s) => {
            const KindIcon = s.kind === "영상" ? Film : ImageIcon;
            return (
              <div key={s.id} className="flex items-center gap-2 px-3 py-2" style={{ background: "#fff", border: "1px solid " + LINE, borderRadius: RADIUS }}>
                <KindIcon className="h-4 w-4 shrink-0" style={{ color: meta.color }} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12.5px] font-semibold" style={{ color: INK }}>{s.name}</div>
                  <div className="truncate text-[11px]" style={{ color: FAINT }}>{s.kind} · {s.file}</div>
                </div>
                <button onClick={() => actions.selectSignageSource(s.id)}
                  className="shrink-0 px-2.5 py-1 text-[11px] font-bold outline-none transition focus-visible:ring-1"
                  style={{ borderRadius: RADIUS, border: "1px solid " + (s.active ? meta.color : LINE2), color: s.active ? "#fff" : MUTE, background: s.active ? meta.color : "#fff" }}>
                  {s.active ? "선택됨" : "선택"}
                </button>
                <button onClick={() => { actions.removeSignageSource(s.id); toast("소스를 삭제했습니다"); }}
                  className="shrink-0 transition hover:opacity-70" title="삭제" style={{ color: STOP_BROWN }}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>

        {/* 신규 업로드 */}
        <div className="mt-4 pt-4" style={{ borderTop: "1px solid " + LINE }}>
          <div className="mb-1.5 text-[12px] font-semibold" style={{ color: MUTE }}>새 소스 업로드</div>
          <div className="mb-2 grid grid-cols-2 gap-2">
            {SOURCE_KINDS.map((k) => {
              const on = kind === k.key; const KI = k.icon;
              return (
                <button key={k.key} onClick={() => setKind(k.key)} className="flex items-center justify-center gap-1.5 py-2 text-[12.5px] font-semibold outline-none transition focus-visible:ring-1"
                  style={{ borderRadius: RADIUS, background: on ? GOLD_SOFT : "#fff", color: on ? GOLD_D : MUTE, border: "1.5px solid " + (on ? GOLD : LINE2) }}>
                  <KI className="h-4 w-4" /> {k.key}
                </button>
              );
            })}
          </div>
          {file ? (
            <div className="mb-2 flex items-center gap-2 px-3 py-2.5" style={{ background: GOLD_SOFT, border: "1px solid " + GOLD, borderRadius: RADIUS }}>
              {kind === "영상" ? <Film className="h-4 w-4" style={{ color: GOLD_D }} /> : <ImageIcon className="h-4 w-4" style={{ color: GOLD_D }} />}
              <span className="min-w-0 flex-1 truncate text-[12.5px] font-semibold" style={{ color: INK }}>{file}</span>
              <button onClick={() => setFile("")} className="shrink-0 transition hover:opacity-70" style={{ color: MUTE }}><X className="h-3.5 w-3.5" /></button>
            </div>
          ) : (
            <button onClick={pickFile} className="mb-2 flex w-full flex-col items-center justify-center gap-1.5 py-6 outline-none transition hover:border-[#c9a86a]"
              style={{ border: "1.5px dashed " + LINE2, borderRadius: RADIUS, background: "#faf8f3" }}>
              <Upload className="h-6 w-6" style={{ color: GOLD }} />
              <span className="text-[12.5px] font-semibold" style={{ color: INK }}>{kind} 파일 끌어다 놓기 또는 눌러서 선택</span>
              <span className="text-[11px]" style={{ color: FAINT }}>{kind === "영상" ? "mp4 · mov" : "jpg · png"}</span>
            </button>
          )}
          <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="소스 이름"
            className="mb-2 w-full px-3 py-2 text-[12.5px] outline-none focus-visible:ring-1"
            style={{ border: "1px solid " + LINE2, borderRadius: RADIUS, color: INK }} />
          <Btn size="sm" className="w-full" onClick={add}><Plus className="h-3.5 w-3.5" /> 소스 등록</Btn>
        </div>

        {/* 알림 전용 — 다음 예약 안내 문구 */}
        {cat === "알림" && <NoticeEditor />}
      </div>
    </Modal>
  );
}

// 소스 관리 버튼 바 — 광고·대기화면·알림 카테고리별 등록 현황 + 관리 진입
function SourceManager({ sources, onOpen }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="flex items-center gap-1.5 text-[12.5px] font-semibold" style={{ color: MUTE }}>
        <Settings2 className="h-3.5 w-3.5" style={{ color: GOLD_D }} /> 소스 관리
      </span>
      {D.SIGNAGE_SOURCE_CATS.map((cat) => {
        const meta = CAT_META[cat];
        const Icon = meta.icon;
        const list = sources.filter((s) => s.cat === cat);
        const sel = list.find((s) => s.active);
        return (
          <button key={cat} onClick={() => onOpen(cat)}
            className="flex max-w-[230px] items-center gap-1.5 px-3 py-1.5 text-[12.5px] font-semibold outline-none transition hover:opacity-80 focus-visible:ring-1"
            style={{ background: SURFACE, border: "1px solid " + LINE, borderRadius: RADIUS, color: INK }}>
            <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: meta.color }} /> {meta.label}
            <span className="truncate" style={{ color: sel ? meta.color : FAINT }}>{sel ? sel.name : "미선택"}</span>
          </button>
        );
      })}
    </div>
  );
}

// ── 라즈베리파이 디바이스 헬스 — 온라인·오프라인·네트워크 끊김 모니터 ──
// 색은 라이브 컨트롤과 동일 웜톤(빨강·버건디 배제, 디자인 가이드).

// 자사 디바이스를 상태별로 분류 (오프라인=네트워크 끊김)
function deviceHealth(devices, partnerName) {
  const my = devices.filter((d) => d.partner === partnerName);
  const offline = my.filter((d) => d.status === "offline");
  const live = my.filter((d) => d.status === "live");
  const online = my.filter((d) => d.status !== "offline");
  return { my, offline, live, online };
}

function StatPill({ label, n, c = MUTE }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 text-[12.5px] font-semibold" style={{ background: SURFACE, border: "1px solid " + LINE, borderRadius: RADIUS }}>
      <span style={{ color: FAINT }}>{label}</span><span className="tabular-nums" style={{ color: c }}>{n}</span>
    </div>
  );
}

// 디바이스 이슈 배너 — 오프라인(네트워크 끊김). 이상 없으면 한 줄 확인 표시.
function DeviceAlerts({ offline }) {
  if (offline.length === 0) {
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
    </div>
  );
}

export function Live() {
  const PARTNER = usePartner();
  const { devices, signageSources } = useStore(); // 목 DB — 라이브 컨트롤 ↔ 관리자 사이니지 공유
  const { my, offline, live, online } = deviceHealth(devices, PARTNER.name);
  const rows = devices.filter((d) => d.partner === PARTNER.name && d.room.includes("호실")).slice(0, 4);
  const [srcCat, setSrcCat] = useState(null); // 열린 소스 관리 모달 카테고리
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
        <DeviceAlerts offline={offline} />
        {/* 광고·대기화면·알림 소스 등록/관리(이미지·영상 업로드) */}
        <SourceManager sources={signageSources} onOpen={setSrcCat} />
      </div>
      <div className="grid grid-cols-4 gap-3">
        {rows.map((d) => <LiveCard key={d.id} dev={d} />)}
      </div>
      {srcCat && <SourceManagerModal cat={srcCat} onClose={() => setSrcCat(null)} />}
    </div>
  );
}
