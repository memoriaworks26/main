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
import { usePartner, usePartnerTerm } from "./shared.jsx";

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
function nextReservation(reservations, partnerId) {
  const mine = reservations
    .filter((r) => r.partnerId === partnerId && r.status !== "published")
    .sort((a, b) => String((a.date || "") + (a.slot || "")).localeCompare(String((b.date || "") + (b.slot || ""))));
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

// 웹 화면 링크 발급/열기/복사 — 호실에 웹 디스플레이를 연결(또는 재발급).
function WebLinkRow({ room, connected }) {
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState(null);
  const issue = async () => {
    setBusy(true);
    try {
      const url = await actions.issueRoomWebLink(room);
      setLink(url);
      window.open(url, "_blank", "noopener");
      toast("웹 화면 링크 발급 — 새 탭에서 열렸습니다");
    } catch (e) { toast(e.message || "발급 실패"); }
    finally { setBusy(false); }
  };
  const copy = async () => {
    if (!link) return;
    try { await navigator.clipboard.writeText(link); toast("링크를 복사했습니다"); } catch { toast("복사 실패 — 직접 선택해 복사하세요"); }
  };
  return (
    <div className="mt-2.5 pt-2.5" style={{ borderTop: "1px solid " + LINE }}>
      <div className="flex items-center gap-1.5">
        <button onClick={issue} disabled={busy}
          className="flex flex-1 items-center justify-center gap-1.5 py-2 text-[12px] font-bold outline-none transition focus-visible:ring-1"
          style={{ borderRadius: RADIUS, border: "1.5px solid " + GOLD, color: busy ? FAINT : GOLD_D, background: GOLD_SOFT }}>
          <Monitor className="h-3.5 w-3.5" /> {busy ? "발급 중…" : connected ? "새 링크 발급·열기" : "웹 화면 링크 발급·열기"}
        </button>
        {link && (
          <button onClick={copy} className="px-2.5 py-2 text-[12px] font-semibold outline-none transition focus-visible:ring-1"
            style={{ borderRadius: RADIUS, border: "1px solid " + LINE2, color: INK }}>복사</button>
        )}
      </div>
      {link && <div className="mt-1.5 truncate text-[11px]" style={{ color: FAINT, fontFamily: "ui-monospace, monospace" }} title={link}>{link}</div>}
      {connected && !link && <div className="mt-1 text-[11px]" style={{ color: FAINT }}>※ 새 링크를 발급하면 기존에 열어둔 화면은 해제됩니다.</div>}
    </div>
  );
}

// 호실 1칸 — 연결된 웹/파이 디스플레이가 있으면 제어, 없으면 링크 발급으로 연결.
function LiveCard({ room, dev }) {
  const PARTNER = usePartner();
  const { signageSources, signageNotice, reservations } = useStore();
  const connected = !!dev && !!dev.enrolled;             // 토큰 발급된(=실제 연결된) 디스플레이
  const offline = connected && dev.status === "offline";
  const mode = dev?.mode || "대기";
  const play = dev?.play || (dev?.status === "live" ? "playing" : "stopped");
  const setMode = (m) => actions.setDeviceMode(dev.id, m);
  const setPlay = (p) => actions.setDevicePlay(dev.id, p);
  const live = connected && !offline && play === "playing";

  // 모드별 표출 콘텐츠 — 제작영상은 dev.playing, 그 외(광고·대기·알림)는 켜진 소스를 무한 반복
  const activeSrc = signageSources.find((s) => s.cat === mode && s.active);
  const modeLabel = CAT_META[mode]?.label || "제작영상";
  const noticeText = signageNotice.enabled ? fillNotice(signageNotice.template, nextReservation(reservations, PARTNER.id)) : "";

  let slateMain;
  if (!connected) slateMain = "디스플레이 미연결";
  else if (offline) slateMain = "신호 없음";
  else if (mode === "제작영상") slateMain = (dev.playing || "제작영상") + (live ? " 재생중" : " 대기");
  else if (activeSrc) slateMain = activeSrc.name + "\n" + modeLabel + (live ? " 무한 반복중" : " 일시정지");
  else slateMain = modeLabel + " 화면";

  const slateBg = !connected ? "#232b35" : offline ? "#211d18" : live ? "#16231d" : "#1c232c";
  const showNotice = live && mode === "알림" && noticeText;
  const badge = !connected ? { t: "미연결", bg: "#3a4452", c: "#cfd6df" } : offline ? { t: "오프라인", bg: "#403a33", c: "#d8d0c2" } : { t: "연결됨", bg: "rgba(255,255,255,.92)", c: SIG_GREEN };

  return (
    <div className="overflow-hidden" style={{ background: SURFACE, border: "1px solid " + LINE, borderRadius: 8 }}>
      {/* 미리보기 슬레이트 */}
      <div className="relative flex items-center justify-center px-4 text-center" style={{ aspectRatio: "16/9", background: slateBg }}>
        <span className="absolute left-2.5 top-2.5 px-2 py-[3px] text-[10.5px] font-bold" style={{ borderRadius: 3, background: badge.bg, color: badge.c }}>{badge.t}</span>
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
        <span className="text-[12.5px]" style={{ color: !connected ? "rgba(207,214,223,.85)" : offline ? "#8a7676" : "rgba(243,239,230,.92)", whiteSpace: "pre-line" }}>{slateMain}</span>
        {showNotice && (
          <span className="absolute inset-x-0 bottom-0 truncate px-3 py-1.5 text-left text-[11px] font-semibold text-white" style={{ background: "rgba(168,120,46,.92)" }}>{noticeText}</span>
        )}
      </div>

      {/* 정보 + 제어 */}
      <div className="px-4 py-3.5">
        <div className="mb-0.5 flex items-center gap-2">
          <span className="text-[15px] font-bold" style={{ color: INK }}>{room.name || dev?.id || "호실"}</span>
          {offline && <span className="flex items-center gap-1 text-[12px] font-semibold" style={{ color: STOP_BROWN }}><AlertTriangle className="h-3.5 w-3.5" /> 오프라인</span>}
        </div>
        <div className="mb-3 text-[12px]" style={{ color: !connected ? FAINT : offline ? FAINT : live ? SIG_GREEN : MUTE }}>
          {!connected ? "웹 화면 링크를 발급해 디스플레이를 연결하세요"
            : offline ? "마지막 통신: " + (dev.lastComm || "—")
            : mode === "제작영상" ? (live ? (dev.playing || "제작영상") + " 재생중" : "대기 모드")
            : modeLabel + (live ? " 무한 반복" : " 정지")}
        </div>

        {!connected ? (
          <div className="px-3 py-2.5 text-[12.5px]" style={{ background: "#f4f1ea", border: "1px dashed " + LINE2, borderRadius: RADIUS, color: MUTE }}>
            이 호실에 연결된 화면이 없습니다. 아래 링크를 호실 TV(브라우저)에서 열면 자동 전체화면으로 표출됩니다.
          </div>
        ) : offline ? (
          <>
            <div className="mb-2.5 px-3 py-2.5 text-[12.5px]" style={{ background: "#f1ece3", border: "1px solid #e4dcce", borderRadius: RADIUS, color: STOP_BROWN }}>장비가 응답하지 않습니다.</div>
            <div className="space-y-2">
              <button onClick={() => actions.refreshDevices()} className="flex w-full items-center justify-center gap-1.5 py-2.5 text-[12.5px] font-bold" style={{ borderRadius: RADIUS, border: "1px solid " + LINE2, color: INK }}><RefreshCw className="h-4 w-4" /> 상태 새로고침</button>
              <button onClick={() => actions.sendDeviceCommand(dev.id, "restart")} className="flex w-full items-center justify-center gap-1.5 py-2.5 text-[12.5px] font-bold" style={{ borderRadius: RADIUS, border: "1.5px solid " + SIG_GREEN, color: SIG_GREEN }}><Play className="h-4 w-4" /> 플레이어 재시작</button>
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

        {/* 웹 화면 링크 — 미연결이면 연결, 연결돼 있으면 재발급·열기 */}
        <WebLinkRow room={room} connected={connected} />
      </div>
    </div>
  );
}

// ── 사이니지 소스 관리 — 광고·대기화면·알림 표출 콘텐츠 등록/관리(이미지·영상 업로드) ──

// 알림 문구 편집기 — 다음 예약을 자동 치환해 소스 위에 띄울 안내 문구
function NoticeEditor() {
  const PARTNER = usePartner();
  const tp = usePartnerTerm(); // 사업부별 파트너 용어(빈소/호실 등)
  const { signageNotice, reservations } = useStore();
  const nextRes = nextReservation(reservations, PARTNER.id);
  const preview = fillNotice(signageNotice.template, nextRes);
  const chips = [["{chief}", "보호자명"], ["{deceased}", "반려동물명"], ["{room}", tp("room")], ["{slot}", "시간"], ["{date}", "날짜"]];
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
  const tp = usePartnerTerm(); // 사업부별 파트너 용어(빈소/호실 등)
  const { signageSources } = useStore();
  const list = signageSources.filter((s) => s.cat === cat);
  const meta = CAT_META[cat];
  const Icon = meta.icon;
  const [name, setName] = useState("");
  const [kind, setKind] = useState("이미지");
  const [file, setFile] = useState("");        // 표시 파일명
  const [fileObj, setFileObj] = useState(null); // 실제 업로드 파일

  // 실제 파일 선택 — File 객체 보관(업로드는 store가 스토리지로). 종류는 파일 MIME로 자동 보정.
  const onPick = (e) => {
    const f = e.target.files?.[0]; e.target.value = ""; if (!f) return;
    setFileObj(f); setFile(f.name);
    if (f.type) setKind(f.type.startsWith("video") ? "영상" : "이미지");
    if (!name.trim()) setName(f.name.replace(/\.\w+$/, ""));
  };
  const clearFile = () => { setFileObj(null); setFile(""); };
  const add = () => {
    if (!fileObj) { toast("이미지 또는 영상 파일을 올려주세요"); return; }
    const nm = name.trim() || file.replace(/\.\w+$/, "");
    actions.addSignageSource({ id: "src-" + Date.now().toString(36), cat, name: nm, kind, file, fileObj, active: false });
    setName(""); clearFile();
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
          <span>표출할 <b style={{ color: INK }}>{meta.label}</b> 소스 1개를 선택하세요. {tp("room")}에서 {meta.label} 탭을 누르면 그 소스가 무한 반복됩니다.</span>
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
              <button onClick={clearFile} className="shrink-0 transition hover:opacity-70" style={{ color: MUTE }}><X className="h-3.5 w-3.5" /></button>
            </div>
          ) : (
            <label className="mb-2 flex w-full cursor-pointer flex-col items-center justify-center gap-1.5 py-6 outline-none transition hover:border-[#c9a86a]"
              style={{ border: "1.5px dashed " + LINE2, borderRadius: RADIUS, background: "#faf8f3" }}>
              <input type="file" className="hidden" accept={kind === "영상" ? "video/*" : "image/*"} onChange={onPick} />
              <Upload className="h-6 w-6" style={{ color: GOLD }} />
              <span className="text-[12.5px] font-semibold" style={{ color: INK }}>{kind} 파일 끌어다 놓기 또는 눌러서 선택</span>
              <span className="text-[11px]" style={{ color: FAINT }}>{kind === "영상" ? "mp4 · mov" : "jpg · png"}</span>
            </label>
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

// ── 디바이스 헬스 — 호실별 연결/오프라인 모니터 ──
// 색은 라이브 컨트롤과 동일 웜톤(빨강·버건디 배제, 디자인 가이드).

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
  const { devices, signageSources, rooms } = useStore(); // 호실 기준 — 디바이스 없어도 호실 카드 노출
  // 자사 호실 정렬 + 호실↔디바이스 매핑(roomId)
  const myRooms = rooms.filter((r) => r.partnerId === PARTNER.id).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const myDevices = devices.filter((d) => d.partnerId === PARTNER.id);
  // roomId 우선, 없으면(옛/목업 데이터) 호실명으로 매칭
  const devForRoom = (room) => myDevices.find((d) => (d.roomId && d.roomId === room.id) || (!d.roomId && d.room && d.room === room.name)) || null;
  const cards = myRooms.map((room) => ({ room, dev: devForRoom(room) }));
  // 호실에 매칭 안 된 디바이스(호실 미지정 등)도 누락 없이 뒤에 표시
  const matched = new Set(cards.map((c) => c.dev?.id).filter(Boolean));
  const orphans = myDevices.filter((d) => !matched.has(d.id))
    .map((d) => ({ room: { id: d.roomId, partnerId: d.partnerId, name: d.room || d.id }, dev: d }));
  const allCards = [...cards, ...orphans];

  const connected = allCards.filter((c) => c.dev && c.dev.enrolled && c.dev.status !== "offline");
  const liveN = connected.filter((c) => (c.dev.play || (c.dev.status === "live" ? "playing" : "stopped")) === "playing");
  const offlineCards = allCards.filter((c) => c.dev && c.dev.enrolled && c.dev.status === "offline");
  const unlinked = allCards.filter((c) => !c.dev || !c.dev.enrolled);

  const [srcCat, setSrcCat] = useState(null); // 열린 소스 관리 모달 카테고리
  return (
    <div>
      <PageHeader title="라이브 컨트롤" sub="호실별 사이니지 화면을 실시간으로 제어합니다." right={<Btn size="sm" variant="neutral" onClick={() => actions.refreshDevices()}><RefreshCw className="h-3.5 w-3.5" /> 상태 새로고침</Btn>} />
      {/* 호실 헬스 — 연결·미연결·오프라인 */}
      <div className="mb-4 space-y-2">
        <div className="flex flex-wrap gap-2">
          <StatPill label="호실" n={myRooms.length} />
          <StatPill label="재생중" n={liveN.length} c={LIVE_GOLD} />
          <StatPill label="연결됨" n={connected.length} c={SIG_GREEN} />
          <StatPill label="미연결" n={unlinked.length} c={STOP_BROWN} />
          {offlineCards.length > 0 && <StatPill label="오프라인" n={offlineCards.length} c={STOP_BROWN} />}
        </div>
        {offlineCards.length > 0 && <DeviceAlerts offline={offlineCards.map((c) => ({ ...c.dev, room: c.room.name }))} />}
        {/* 광고·대기화면·알림 소스 등록/관리(이미지·영상 업로드) */}
        <SourceManager sources={signageSources} onOpen={setSrcCat} />
      </div>
      {allCards.length === 0 ? (
        <div className="px-4 py-10 text-center text-[13px]" style={{ background: SURFACE, border: "1px dashed " + LINE2, borderRadius: 8, color: FAINT }}>
          등록된 호실이 없습니다. 파트너사 대시보드에서 호실을 먼저 추가하세요.
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-3">
          {allCards.map((c) => <LiveCard key={c.dev?.id || c.room.id || c.room.name} room={c.room} dev={c.dev} />)}
        </div>
      )}
      {srcCat && <SourceManagerModal cat={srcCat} onClose={() => setSrcCat(null)} />}
    </div>
  );
}
