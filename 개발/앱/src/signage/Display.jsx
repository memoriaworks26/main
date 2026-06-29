// ─────────────────────────────────────────────────────────────
// 웹 사이니지 디스플레이 — 브라우저를 호실 TV로. 라즈베리파이 플레이어의 웹 버전.
//   /s/<token> 으로 접속 → device-sync(verify_jwt=false, 토큰 인증)를 3초 폴링.
//     · 콘텐츠      : video(서명URL·무한반복) / image / none(대기화면, 검은화면 금지)
//     · 라이브컨트롤 : mode·volume·muted·paused 즉시 반영, cmd(restart/refresh/…) 실행
//     · 알림 모드   : 하단 안내 문구 오버레이
//   Fullscreen API : 첫 화면 터치(사용자 제스처)로 자동 전체화면 진입 + 소리 활성.
// ─────────────────────────────────────────────────────────────
import React, { useEffect, useRef, useState, useCallback } from "react";
import { getSignageToken, syncDevice } from "../lib/signageLink.js";
import logo from "../assets/memoria-logo.png";

const POLL_MS = 3000;

// ── 전체화면 헬퍼(벤더 프리픽스 대응) ──
function enterFullscreen(el) {
  const fn = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
  if (fn) return fn.call(el).catch(() => {});
  return Promise.resolve();
}
function exitFullscreen() {
  const fn = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
  if (fn && (document.fullscreenElement || document.webkitFullscreenElement)) fn.call(document);
}
const isFs = () => !!(document.fullscreenElement || document.webkitFullscreenElement);

// ── 시계(대기화면용) ──
function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

// ── 대기화면(검은화면 금지) — 로고·호실·시계 ──
function Standby({ roomLabel, sub }) {
  const now = useClock();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const dateStr = `${now.getFullYear()}. ${String(now.getMonth() + 1).padStart(2, "0")}. ${String(now.getDate()).padStart(2, "0")}`;
  const dow = ["일", "월", "화", "수", "목", "금", "토"][now.getDay()];
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 22, background: "radial-gradient(120% 120% at 50% 35%, #1c2733 0%, #121922 55%, #0c1119 100%)", color: "#e9e3d6" }}>
      <img src={logo} alt="memoria" style={{ width: 132, opacity: 0.92, filter: "brightness(0) invert(1)" }} draggable={false} />
      {roomLabel && <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: 2, color: "#f4efe4" }}>{roomLabel}</div>}
      <div style={{ fontSize: 84, fontWeight: 300, letterSpacing: 4, lineHeight: 1, fontVariantNumeric: "tabular-nums", color: "#fbf8f1" }}>{hh}:{mm}</div>
      <div style={{ fontSize: 17, letterSpacing: 1, color: "#9aa3ad" }}>{dateStr} ({dow})</div>
      {sub && <div style={{ position: "absolute", bottom: 26, fontSize: 13, color: "#5e6772" }}>{sub}</div>}
    </div>
  );
}

export default function SignageDisplay() {
  const token = getSignageToken();
  const videoRef = useRef(null);
  const curIdRef = useRef(null);          // 현재 표출 콘텐츠 id(서버 보고용)
  const [resp, setResp] = useState(null); // 마지막 device-sync 응답
  const [content, setContent] = useState({ kind: "none" }); // 화면에 그릴 콘텐츠(id 바뀔 때만 교체)
  const [mediaKey, setMediaKey] = useState(0); // cmd(restart/refresh)로 미디어 강제 리로드
  const [err, setErr] = useState("");     // 일시 오류(연결 끊김 등) — 화면은 마지막 프레임 유지
  const [fatal, setFatal] = useState(""); // 치명(토큰 무효) — 폴링 중단
  const [interacted, setInteracted] = useState(false); // 첫 사용자 제스처(전체화면·소리 활성)
  const [fs, setFs] = useState(false);

  // ── device-sync 폴링 루프 ──
  useEffect(() => {
    if (!token) { setFatal("토큰이 없는 링크입니다. 호실 화면 링크로 접속하세요."); return; }
    let alive = true, stopped = false, timer;
    const tick = async () => {
      try {
        const r = await syncDevice(token, curIdRef.current);
        if (!alive) return;
        setErr(""); setResp(r);
        // 콘텐츠 — id 바뀔 때만 교체(같은 영상은 끊김 없이 계속 재생)
        const c = r.content || { kind: "none" };
        setContent((prev) => (prev.kind === c.kind && prev.id === c.id && prev.url === c.url ? prev : c));
        curIdRef.current = c.kind === "video" || c.kind === "image" ? (c.id ?? null) : null;
        // 일회성 명령
        if (r.cmd === "reboot") { stopped = true; window.location.reload(); return; }
        if (r.cmd === "restart" || r.cmd === "refresh" || r.cmd === "redownload") {
          curIdRef.current = null; setMediaKey((k) => k + 1);
        }
      } catch (e) {
        if (!alive) return;
        const msg = String(e?.message || e);
        if (/unauthorized|no token/i.test(msg)) { stopped = true; setFatal("해제된 화면입니다. 콘솔에서 링크를 다시 발급하세요."); return; }
        setErr("연결 끊김 — 재시도 중"); // 검은화면 금지: 마지막 프레임 유지
      } finally {
        if (alive && !stopped) timer = setTimeout(tick, POLL_MS);
      }
    };
    tick();
    return () => { alive = false; clearTimeout(timer); };
  }, [token]);

  // ── 음량·음소거·일시정지 반영(서버 → video) ──
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !resp) return;
    const vol = typeof resp.volume === "number" ? resp.volume : 100;
    v.volume = Math.max(0, Math.min(1, vol / 100));
    v.muted = !interacted || !!resp.muted || vol === 0; // 제스처 전에는 무조건 음소거(자동재생 정책)
    if (resp.paused) v.pause();
    else v.play().catch(() => {});
  }, [resp, interacted, content, mediaKey]);

  // ── 전체화면 상태 추적 ──
  useEffect(() => {
    const on = () => setFs(isFs());
    document.addEventListener("fullscreenchange", on);
    document.addEventListener("webkitfullscreenchange", on);
    return () => { document.removeEventListener("fullscreenchange", on); document.removeEventListener("webkitfullscreenchange", on); };
  }, []);

  // 첫 사용자 제스처 — 자동 전체화면 + 소리 활성. 'f' 토글, Esc 해제(브라우저 기본).
  const activate = useCallback(() => {
    setInteracted(true);
    enterFullscreen(document.documentElement);
  }, []);
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "f" || e.key === "F") { isFs() ? exitFullscreen() : enterFullscreen(document.documentElement); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const roomLabel = resp?.device ? null : null; // device-sync는 호실명을 안 줌 → 대기화면엔 표기 생략
  const mode = resp?.mode;
  const notice = resp?.notice;
  const showNotice = mode === "알림" && notice?.enabled && notice?.text;

  return (
    <div
      onPointerDown={!interacted ? activate : undefined}
      style={{ position: "fixed", inset: 0, background: "#0c1119", overflow: "hidden", cursor: interacted ? "none" : "pointer", userSelect: "none" }}
    >
      {/* 콘텐츠 레이어 */}
      {content.kind === "video" && content.url && (
        <video
          key={"v" + (content.id || "") + "-" + mediaKey}
          ref={videoRef}
          src={content.url}
          autoPlay
          loop
          playsInline
          muted={!interacted || !!resp?.muted}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", background: "#000" }}
        />
      )}
      {content.kind === "image" && content.url && (
        <img
          key={"i" + (content.id || "") + "-" + mediaKey}
          src={content.url}
          alt=""
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", background: "#000" }}
          draggable={false}
        />
      )}
      {(content.kind === "none" || !content.url) && !fatal && (
        <Standby roomLabel={roomLabel} sub={mode ? `${mode} · 대기` : "연결 대기"} />
      )}

      {/* 알림 문구 오버레이 */}
      {showNotice && (
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "18px 40px", fontSize: 26, fontWeight: 700, color: "#fff", background: "linear-gradient(to top, rgba(168,120,46,.96), rgba(168,120,46,.78) 70%, rgba(168,120,46,0))", textAlign: "center", letterSpacing: 0.5 }}>
          {notice.text}
        </div>
      )}

      {/* 첫 진입 — 전체화면 시작 안내(제스처 1회) */}
      {!interacted && !fatal && (
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, background: "rgba(8,12,18,.42)", backdropFilter: "blur(1px)", color: "#fff" }}>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: 1 }}>화면을 한 번 터치하면 시작합니다</div>
          <div style={{ fontSize: 14, color: "#cdd3da" }}>전체화면으로 전환되고 소리가 켜집니다</div>
        </div>
      )}

      {/* 일시 연결오류 표시(아주 약하게) */}
      {err && interacted && !fatal && (
        <div style={{ position: "absolute", top: 12, right: 14, padding: "4px 10px", fontSize: 12, borderRadius: 4, background: "rgba(0,0,0,.45)", color: "#e6c98a" }}>{err}</div>
      )}

      {/* 정지(일시정지) 표시 */}
      {resp?.paused && content.kind === "video" && interacted && (
        <div style={{ position: "absolute", top: 14, left: 16, padding: "4px 10px", fontSize: 12, borderRadius: 4, background: "rgba(0,0,0,.5)", color: "#cdd3da", letterSpacing: 1 }}>일시정지</div>
      )}

      {/* 치명 오류(토큰 무효 등) */}
      {fatal && (
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, background: "radial-gradient(120% 120% at 50% 40%, #241c18 0%, #14100c 100%)", color: "#e9e3d6" }}>
          <img src={logo} alt="memoria" style={{ width: 110, opacity: 0.85, filter: "brightness(0) invert(1)" }} draggable={false} />
          <div style={{ fontSize: 20, fontWeight: 600 }}>{fatal}</div>
        </div>
      )}

      {/* 전체화면 아님 + 상호작용 후 — 작은 진입 버튼(키오스크 보조) */}
      {interacted && !fs && !fatal && (
        <button
          onClick={() => enterFullscreen(document.documentElement)}
          style={{ position: "absolute", bottom: 14, right: 16, padding: "6px 12px", fontSize: 12, fontWeight: 700, borderRadius: 4, border: "1px solid rgba(255,255,255,.4)", background: "rgba(0,0,0,.4)", color: "#fff", cursor: "pointer" }}
        >전체화면</button>
      )}
    </div>
  );
}
