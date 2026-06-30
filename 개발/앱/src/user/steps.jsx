// 유저 위저드 — 단계별 본문(StepBody). 동의 → AI 독사진 → 소스 업로드 → 배경음악 → 편지 → 미리보기 → 완료.
// 상태/핸들러는 wizard.js의 useUserWizard()에서 만든 st 객체로 받는다.
import React, { useState, useRef, useEffect } from "react";
import { Check, Upload, Image, Film, Play, Pause, Heart, X, Sparkles, Shuffle, Loader2 } from "lucide-react";
import { SERIF, SURFACE, LINE, LINE2, GOLD, GOLD_D, GOLD_SOFT, INK, MUTE, FAINT, RADIUS } from "../theme.js";
import { DateField } from "../ui.jsx";
import { BACKEND_LIVE } from "../lib/supabase.js";
import * as D from "../data.js";
import { toast } from "../toast.jsx";
import { Title, PhotoExampleGuide } from "./parts.jsx";

const TRANSITIONS = D.USER_TRANSITIONS; // 전환 효과 명칭은 data.js에서 단일 관리

// 미리보기 캔버스 슬라이드쇼 — 보호자 슬라이드 사진을 순환하며, 각 사진이 등장할 때
// 유저가 고른 전환 효과(USER_TRANSITIONS의 ffmpeg xfade 값)를 캔버스로 근사 재현한다.
//   frames: [{ src, x }] — src=썸네일, x=그 사진으로 넘어올 때의 전환(ffmpeg xfade 명).
//   (ffmpeg 최종 렌더와 100% 동일하진 않은 근사 미리보기 — 효과의 느낌/방향만 일치)
function SlideCanvas({ frames }) {
  const ref = useRef(null);
  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const ctx = cv.getContext("2d"); const W = cv.width, H = cv.height;
    const imgs = frames.map((f) => { const im = new window.Image(); im.src = f.src; return im; }); // window.Image — lucide-react의 Image 아이콘 import와 이름충돌 회피(전역 생성자 명시)
    const xs = frames.map((f) => f.x || "fade"); // 각 사진의 전환 효과(ffmpeg xfade 명)
    // contain(fit) — 절대 crop 안 함. 전체가 보이도록 맞추고 남는 쪽은 여백(배경색). 세로사진=좌우 여백, 가로사진=상하 여백.
    const fit = (im) => { const ir = im.naturalWidth / im.naturalHeight, cr = W / H; return ir > cr ? { w: W, h: W / ir, x: 0, y: (H - W / ir) / 2 } : { w: H * ir, h: H, x: (W - H * ir) / 2, y: 0 }; };
    const drawContain = (im) => { const r = fit(im); ctx.drawImage(im, r.x, r.y, r.w, r.h); };
    const ready = (im) => im && im.complete && im.naturalWidth; // 방어적 — 미로딩/인덱스어긋남 시 .complete를 undefined에서 읽지 않게
    const veil = (color, alpha) => { ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = color; ctx.fillRect(0, 0, W, H); ctx.restore(); };
    // 전환 렌더 — pre(이전)→cur(현재)로 진행도 p(0~1)만큼 넘어가는 한 프레임을 그린다.
    const renderTrans = (pre, cur, p, x) => {
      const drawCur = () => ready(cur) && drawContain(cur);
      const drawPre = () => ready(pre) && drawContain(pre);
      switch (x) {
        case "none": drawCur(); break; // 하드 컷 — 즉시 현재
        case "fadeblack": if (p < 0.5) { drawPre(); veil("#000", p * 2); } else { drawCur(); veil("#000", (1 - p) * 2); } break;
        case "fadewhite": if (p < 0.5) { drawPre(); veil("#fff", p * 2); } else { drawCur(); veil("#fff", (1 - p) * 2); } break;
        case "wipeleft": drawPre(); ctx.save(); ctx.beginPath(); ctx.rect(W * (1 - p), 0, W * p, H); ctx.clip(); drawCur(); ctx.restore(); break;
        case "slideleft": drawPre(); ctx.save(); ctx.translate(W * (1 - p), 0); drawCur(); ctx.restore(); break;
        case "circleopen": drawPre(); ctx.save(); ctx.beginPath(); ctx.arc(W / 2, H / 2, (Math.hypot(W, H) / 2) * p, 0, Math.PI * 2); ctx.clip(); drawCur(); ctx.restore(); break;
        case "radial": drawPre(); ctx.save(); ctx.beginPath(); ctx.moveTo(W / 2, H / 2); ctx.arc(W / 2, H / 2, Math.hypot(W, H), -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p); ctx.closePath(); ctx.clip(); drawCur(); ctx.restore(); break;
        case "zoomin": drawPre(); ctx.save(); ctx.globalAlpha = p; const s = 0.7 + 0.3 * p; ctx.translate(W / 2, H / 2); ctx.scale(s, s); ctx.translate(-W / 2, -H / 2); drawCur(); ctx.restore(); break;
        default: drawPre(); ctx.save(); ctx.globalAlpha = p; drawCur(); ctx.restore(); break; // fade·dissolve = 크로스페이드
      }
    };
    const PER = 2600, FADE = 700; let raf; const t0 = performance.now();
    // 경과시간은 rAF 콜백 인자(now)가 아니라 performance.now()로 직접 계산한다.
    // 카톡 등 일부 인앱 웹뷰는 requestAnimationFrame이 콜백에 타임스탬프를 안 넘겨(now=undefined),
    // now-t0 = NaN → 인덱스 NaN → imgs[NaN].complete 접근에서 크래시했다(유저링크가 카톡으로 열리는 경로라 빈번).
    const frame = () => {
      const n = imgs.length;
      ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H); // 여백색 = 최종 영상 ffmpeg pad(검정)과 일치(WYSIWYG)
      if (n) {
        const e = performance.now() - t0, idx = Math.floor(e / PER) % n, prev = (idx - 1 + n) % n, p = Math.min(1, (e % PER) / FADE);
        const cur = imgs[idx], pre = imgs[prev];
        if (n > 1 && p < 1) renderTrans(pre, cur, p, xs[idx]); // 등장 전환 진행 중
        else if (ready(cur)) drawContain(cur);                 // 전환 완료 후 정지 구간
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [frames]);
  return <canvas ref={ref} width={640} height={360} className="absolute inset-0 h-full w-full" />;
}

// 드래그 중 페이지 스크롤 차단 — 모듈 레벨 고정 참조라야 add/remove가 같은 함수로 매칭됨(리렌더로 신원이 바뀌지 않음).
// iOS Safari는 pointermove의 preventDefault만으론 스크롤이 안 막혀, 비수동(passive:false) touchmove로 직접 차단해야 한다.
const blockTouchMove = (e) => { e.preventDefault(); };

// 소스 업로드 그리드 — 사진(슬라이드, 전환 선택) / 영상(추억 영상) 공용. withTrans면 카드마다 전환 선택 노출.
// 순서 변경 드래그는 Pointer Events로 구현 — 모바일 터치(길게 눌러 끌기)·데스크톱 마우스 모두 동작.
// (HTML5 draggable은 터치에서 동작하지 않아 모바일 위저드에서 무용지물이었음)
// iOS/Android 차이 대응: iOS=비수동 touchmove로 스크롤 차단·콜아웃(callout) 억제, Android=touch-action:none·contextmenu 억제.
function UploadGrid({ items, withTrans, st, onAdd, onFiles, inputRef, onRemove, onReorder, accept, addLabel, addHint }) {
  const [dragId, setDragId] = useState(null);   // 끌고 있는 카드 id
  const [overId, setOverId] = useState(null);   // 드롭 대상으로 강조할 카드 id
  const [ghost, setGhost] = useState(null);     // 손가락/커서 따라다니는 미리보기 {x,y,thumb,kind}
  const drag = useRef(null);                     // 진행 중 드래그 추적(스테일 클로저 회피용 mutable)

  // 현재 포인터 좌표 아래의 카드 id (고스트는 pointer-events:none이라 hit-test에서 무시됨)
  const cardIdAt = (x, y) => {
    const el = document.elementFromPoint(x, y);
    const card = el && el.closest && el.closest("[data-uid]");
    return card ? card.getAttribute("data-uid") : null;
  };
  // 실제 드래그 시작 — 포인터 캡처로 손가락이 카드를 벗어나도 move/up을 계속 받는다.
  const begin = () => {
    const d = drag.current; if (!d || d.active) return;
    d.active = true;
    if (d.timer) { clearTimeout(d.timer); d.timer = null; }
    try { d.el.setPointerCapture(d.pointerId); } catch {}
    document.addEventListener("touchmove", blockTouchMove, { passive: false }); // iOS 스크롤 차단(Android는 touch-action으로도 막히지만 같이 적용)
    setDragId(d.id);
    setGhost({ x: d.x, y: d.y, thumb: d.thumb, kind: d.kind });
    if (navigator.vibrate) { try { navigator.vibrate(8); } catch {} } // iOS Safari 미지원 → no-op
  };
  const onCardPointerDown = (e, u) => {
    if (e.target.closest && e.target.closest("button, select, input")) return; // 삭제·전환 조작은 드래그 제외
    if (u.uploading) return;                                  // 업로드 중 카드는 순서 변경 금지
    if (e.pointerType === "mouse" && e.button !== 0) return;  // 마우스는 좌클릭만
    drag.current = {
      id: u.id, thumb: u.thumb, kind: u.kind, el: e.currentTarget, pointerId: e.pointerId,
      startX: e.clientX, startY: e.clientY, x: e.clientX, y: e.clientY, active: false, over: null,
      timer: e.pointerType === "mouse" ? null : setTimeout(begin, 180), // 터치: 길게 눌러야 드래그(스와이프 스크롤과 구분)
    };
  };
  const onCardPointerMove = (e) => {
    const d = drag.current; if (!d) return;
    d.x = e.clientX; d.y = e.clientY;
    if (!d.active) {
      const moved = Math.abs(e.clientX - d.startX) > 6 || Math.abs(e.clientY - d.startY) > 6;
      if (e.pointerType === "mouse") { if (moved) begin(); }              // 마우스: 살짝 끌면 시작
      else if (moved) { clearTimeout(d.timer); drag.current = null; }     // 터치: 길게 누르기 전 움직이면 스크롤로 간주
      return;
    }
    e.preventDefault();                                                   // 드래그 중에는 페이지 스크롤 막기
    setGhost((g) => (g ? { ...g, x: e.clientX, y: e.clientY } : g));
    const over = cardIdAt(e.clientX, e.clientY);
    d.over = over && over !== d.id ? over : null;
    setOverId(d.over);
  };
  const end = (reorder) => {
    const d = drag.current;
    if (d) {
      if (d.timer) clearTimeout(d.timer);
      if (reorder && d.active && d.over) onReorder(d.id, d.over);
      try { d.el.releasePointerCapture(d.pointerId); } catch {}
    }
    document.removeEventListener("touchmove", blockTouchMove);
    drag.current = null;
    setDragId(null); setOverId(null); setGhost(null);
  };
  // 언마운트 시 타이머·스크롤차단 리스너 잔존 방지
  useEffect(() => () => { if (drag.current && drag.current.timer) clearTimeout(drag.current.timer); document.removeEventListener("touchmove", blockTouchMove); }, []);

  return (
    <>
      <input ref={inputRef} type="file" accept={accept} multiple className="hidden" onChange={onFiles} />
      <button onClick={onAdd} className="mb-3 flex w-full cursor-pointer flex-col items-center justify-center gap-1.5 py-6 outline-none transition hover:border-[#c9a86a]" style={{ border: "1.5px dashed " + LINE2, borderRadius: RADIUS, background: "#faf8f3" }}>
        <Upload className="h-5 w-5" style={{ color: GOLD }} />
        <span className="text-[12.5px] font-semibold" style={{ color: INK }}>{addLabel}</span>
        <span className="text-[11px]" style={{ color: FAINT }}>{addHint}</span>
      </button>
      {items.length === 0 ? null : (
        <div className="grid grid-cols-4 gap-2">
          {items.map((u, i) => (
            <div key={u.id}
              data-uid={u.id}
              onPointerDown={(e) => onCardPointerDown(e, u)}
              onPointerMove={onCardPointerMove}
              onPointerUp={() => end(true)}
              onPointerCancel={() => end(false)}
              onContextMenu={(e) => e.preventDefault()}
              className="flex cursor-grab select-none flex-col gap-1 p-1 transition active:cursor-grabbing"
              style={{ background: SURFACE, border: "1px solid " + (overId === u.id && dragId !== u.id ? GOLD : LINE), borderRadius: RADIUS, opacity: dragId === u.id ? 0.4 : 1, transform: overId === u.id && dragId !== u.id ? "scale(1.05)" : "none", touchAction: dragId ? "none" : undefined, WebkitTouchCallout: "none", WebkitUserSelect: "none" }}>
              <div className="relative overflow-hidden" style={{ aspectRatio: "1", borderRadius: 4, background: "linear-gradient(135deg,#f0ebe0,#e3d9c4)" }}>
                {u.thumb ? (
                  <img src={u.thumb} alt="" draggable={false} className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <span className="absolute inset-0 flex items-center justify-center">
                    {u.kind === "photo"
                      ? <Image className="h-4 w-4" style={{ color: GOLD_D, opacity: 0.55 }} />
                      : <Film className="h-4 w-4" style={{ color: GOLD_D, opacity: 0.55 }} />}
                  </span>
                )}
                <span className="absolute left-0.5 top-0.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full px-1 text-[9px] font-bold text-white" style={{ background: GOLD_D }}>{i + 1}</span>
                {u.uploading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5" style={{ background: "rgba(0,0,0,.45)" }}>
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                    {u.stage === "compress"
                      ? <span className="text-[9px] font-bold text-white">압축 중</span>
                      : u.progress != null && <span className="text-[9px] font-bold tabular-nums text-white">{u.progress}%</span>}
                  </div>
                )}
                <button onClick={() => onRemove(u.id)} className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full outline-none transition hover:opacity-80" style={{ background: "rgba(0,0,0,.5)", color: "#fff" }} aria-label="삭제"><X className="h-2.5 w-2.5" /></button>
                {u.kind === "video" && u.dur != null && (
                  <span className="absolute bottom-0.5 right-0.5 px-1 text-[8.5px] font-bold tabular-nums text-white" style={{ background: "rgba(0,0,0,.6)", borderRadius: 3 }}>
                    {Math.floor(u.dur / 60)}:{String(Math.round(u.dur % 60)).padStart(2, "0")}
                  </span>
                )}
              </div>
              {withTrans && (
                <select value={st.transMap[u.id] ?? st.trans} onChange={(e) => st.setItemTrans(u.id, +e.target.value)}
                  className="w-full px-0.5 py-0.5 text-[9px] outline-none" style={{ background: "#f6f3ec", border: "1px solid " + LINE2, borderRadius: 4, color: INK }}>
                  {TRANSITIONS.map((t, j) => <option key={j} value={j}>{t.ko}</option>)}
                </select>
              )}
            </div>
          ))}
        </div>
      )}
      {ghost && (
        <div className="pointer-events-none fixed z-50" style={{ left: ghost.x, top: ghost.y, width: 64, height: 64, transform: "translate(-50%,-50%) rotate(-3deg)", borderRadius: 6, overflow: "hidden", background: "linear-gradient(135deg,#f0ebe0,#e3d9c4)", border: "2px solid " + GOLD, boxShadow: "0 8px 20px rgba(0,0,0,.35)" }}>
          {ghost.thumb
            ? <img src={ghost.thumb} alt="" draggable={false} className="h-full w-full object-cover" />
            : <span className="flex h-full w-full items-center justify-center">{ghost.kind === "photo" ? <Image className="h-5 w-5" style={{ color: GOLD_D }} /> : <Film className="h-5 w-5" style={{ color: GOLD_D }} />}</span>}
        </div>
      )}
    </>
  );
}

export function StepBody({ step, st }) {
  // 배경 음악 미리듣기 — 실제 음원(public/bgm/*.mp3, b.src)을 <audio>로 재생.
  const [playingBgm, setPlayingBgm] = useState(null);
  const [openPrivacy, setOpenPrivacy] = useState(false);   // 동의 0단계 — 개인정보 상세 펼침
  const [openMarketing, setOpenMarketing] = useState(false); // 동의 0단계 — 마케팅 상세 펼침
  const audioElRef = useRef(null);
  const stopPreview = () => {
    const a = audioElRef.current;
    if (a) { try { a.pause(); a.currentTime = 0; } catch { /* noop */ } }
    setPlayingBgm(null);
  };
  const playPreview = async (bi) => {
    stopPreview();
    const item = st.bgmList[bi];
    // 정적 데모곡은 src, 실 라이브러리 곡은 미리 발급된 서명URL(즉시) 우선, 없으면 그때 발급.
    let src = item?.src || (item?.storage_path && st.bgmUrls?.[item.storage_path]);
    if (!src && item?.storage_path && st.signBgm) src = await st.signBgm(item.storage_path);
    if (!src) return;
    try {
      let a = audioElRef.current;
      if (!a) { a = audioElRef.current = new window.Audio(); a.preload = "auto"; a.addEventListener("ended", () => setPlayingBgm(null)); }
      a.src = src; a.currentTime = 0;
      a.play().then(() => setPlayingBgm(bi)).catch(() => { /* 자동재생 차단 등 */ });
    } catch { /* Audio 미지원 — 무음 폴백 */ }
  };
  useEffect(() => stopPreview, [step]); // 단계 이동·언마운트 시 미리듣기 자동 정지
  // 0 — 개인정보 동의
  if (step === 0)
    return (
      <div>
        <Title sub={st.T.sub0}>개인정보 활용 동의</Title>
        <div className="space-y-4 text-[12.5px] leading-relaxed" style={{ color: MUTE }}>
          {/* 1. 정보보호(개인정보) 수집·이용 — 필수 */}
          <div>
            <div className="px-4 py-3" style={{ background: "#f6f3ec", borderRadius: RADIUS, border: "1px solid " + LINE }}>
              <div className="flex items-center gap-1.5 font-bold" style={{ color: INK }}>
                개인정보 수집·이용 동의 <span className="px-1.5 py-[1px] text-[10px] font-bold" style={{ background: GOLD_D, color: "#fff", borderRadius: 3 }}>필수</span>
                <button onClick={() => setOpenPrivacy((v) => !v)} className="ml-auto text-[11.5px] font-semibold underline outline-none" style={{ color: GOLD_D }}>{openPrivacy ? "접기" : "펼쳐보기"}</button>
              </div>
              {openPrivacy && (
                <div className="mt-2">
                  <div className="flex justify-end">
                    <button onClick={st.openPolicy} className="text-[11.5px] font-semibold underline outline-none" style={{ color: GOLD_D }}>전문 보기</button>
                  </div>
                  <div style={{ whiteSpace: "pre-line" }}>{st.company?.consentPrivacy}</div>
                  {/* 처리·위탁 주체(정보 관리 주체) 고지 — 장례식장 수집 → 메모리아웍스 제작 위탁 */}
                  <div className="mt-2 pt-2" style={{ borderTop: "1px dashed " + LINE2 }}>
                    <p><b style={{ color: INK }}>처리·위탁</b> {st.link?.partnerName || "장례식장"}이(가) 수집하며, 추모영상 제작을 위해 <b style={{ color: INK }}>메모리아웍스</b>에 처리 위탁됩니다</p>
                    <p><b style={{ color: INK }}>제3자 제공</b> 법령에 근거한 경우를 제외하고 제3자에게 제공하지 않습니다</p>
                    <p>
                      <b style={{ color: INK }}>개인정보 보호책임자</b> 메모리아웍스 고객센터
                      {st.company?.csPhone ? <span> · {st.company.csPhone}</span> : null}
                    </p>
                  </div>
                </div>
              )}
            </div>
            <button onClick={() => st.setAgreed((v) => !v)} className="mt-2 flex w-full items-center gap-2 text-left text-[13px] font-semibold outline-none" style={{ color: INK }}>
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-sm" style={{ background: st.agreed ? GOLD : "#fff", border: "1.5px solid " + (st.agreed ? GOLD : LINE2) }}>
                {st.agreed && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
              </span>
              개인정보 수집·이용에 동의합니다 <span style={{ color: GOLD_D }}>(필수)</span>
            </button>
            <p className="mt-1 text-[11.5px]" style={{ color: st.agreed ? FAINT : GOLD_D }}>
              ※ 동의를 거부할 권리가 있으나, 필수 항목 미동의 시 추모영상 제작·전달이 불가합니다.
            </p>
          </div>

          {/* 2. 마케팅 활용 — 선택 (활용 내용 구체적으로 명시) */}
          <div>
            <div className="px-4 py-3" style={{ background: "#f6f3ec", borderRadius: RADIUS, border: "1px solid " + LINE }}>
              <div className="flex items-center gap-1.5 font-bold" style={{ color: INK }}>
                마케팅·홍보 활용 동의 <span className="px-1.5 py-[1px] text-[10px] font-bold" style={{ background: "#eceef0", color: "#5a6470", borderRadius: 3 }}>선택</span>
                <button onClick={() => setOpenMarketing((v) => !v)} className="ml-auto text-[11.5px] font-semibold underline outline-none" style={{ color: GOLD_D }}>{openMarketing ? "접기" : "펼쳐보기"}</button>
              </div>
              {openMarketing && (
                <div className="mt-2">
                  <div style={{ whiteSpace: "pre-line" }}>{st.company?.consentMarketing}</div>
                  <p className="mt-2" style={{ color: FAINT }}>※ 선택 항목으로, 동의하지 않아도 추모영상 제작·이용에는 영향이 없습니다.</p>
                </div>
              )}
            </div>
            <button onClick={() => st.setMarketingAgreed((v) => !v)} className="mt-2 flex w-full items-center gap-2 text-left text-[13px] font-semibold outline-none" style={{ color: INK }}>
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-sm" style={{ background: st.marketingAgreed ? GOLD : "#fff", border: "1.5px solid " + (st.marketingAgreed ? GOLD : LINE2) }}>
                {st.marketingAgreed && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
              </span>
              마케팅·홍보 활용에 동의합니다 <span style={{ color: FAINT }}>(선택)</span>
            </button>
          </div>
        </div>
      </div>
    );
  // 프로세스 3 — 소스 업로드 (사진 슬라이드 · 추억 영상 분리) + 사진 장면 전환
  if (step === 2) {
    const pct = Math.min(100, (st.totalMB / 100) * 100);
    const warn = "#b06030";
    return (
      <div>
        <Title sub={st.T.sub2}>소스 업로드 · 장면 전환</Title>
        <div className="mb-4">
          <div className="mb-1 flex justify-between text-[11px]" style={{ color: MUTE }}>
            <span>사용 용량</span>
            <span style={{ color: st.overLimit ? warn : INK, fontWeight: st.overLimit ? 700 : 400 }}>{st.totalMB.toFixed(1)} / 100 MB</span>
          </div>
          <div style={{ height: 5, background: LINE, borderRadius: 3, overflow: "hidden" }}>
            <div style={{ height: "100%", width: pct + "%", background: st.overLimit ? warn : GOLD, borderRadius: 3, transition: "width .3s ease" }} />
          </div>
          {st.overLimit && <p className="mt-1 text-[11px] font-semibold" style={{ color: warn }}>100MB를 초과했습니다. 파일을 삭제해 주세요.</p>}
        </div>

        {/* 추억 슬라이드 사진 — 최대 20장, 사진마다 전환 선택 */}
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[12.5px] font-bold" style={{ color: INK }}>
            <Image className="h-3.5 w-3.5" style={{ color: GOLD_D }} /> 추억 슬라이드 사진
            <span className="font-normal" style={{ color: st.photoOver ? warn : FAINT }}>· {st.slidePhotos.length}/{st.PHOTO_MAX}장</span>
          </div>
          {st.slidePhotos.length > 0 && (
            <button onClick={st.randomizeTrans}
              className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold outline-none transition hover:opacity-75"
              style={{ background: GOLD_SOFT, border: "1px solid " + LINE2, borderRadius: RADIUS, color: GOLD_D }}>
              <Shuffle className="h-3 w-3" /> 전환 랜덤
            </button>
          )}
        </div>
        <p className="mb-2 text-[11px]" style={{ color: FAINT }}>최대 20장 · 장당 7~10초 · 길게 눌러 끌어서 순서 변경 · 사진마다 전환 효과 선택</p>
        <UploadGrid items={st.slidePhotos} withTrans st={st} onAdd={st.addPhoto} onFiles={st.onPhotoFiles} inputRef={st.photoRef} onRemove={st.removePhoto} onReorder={st.reorderPhotos} accept="image/*" addLabel="사진 추가" addHint={`사진만 · 최대 ${st.PHOTO_MAX}장`} />
        {st.photoOver && <p className="mt-1 text-[11px] font-semibold" style={{ color: warn }}>사진은 최대 {st.PHOTO_MAX}장까지 올릴 수 있어요.</p>}

        {/* 추억 영상 — 개수 제한 없으나 총 길이 1분30초 상한. 원본 사운드 유지(BGM 없음), 사진 슬라이드 뒤에 묶음으로 이어짐 */}
        {(() => {
          const sec = st.videoSecs || 0;
          const cap = st.VIDEO_MAX_SEC;
          const fmt = (s) => Math.floor(s / 60) + ":" + String(Math.round(s % 60)).padStart(2, "0");
          const vpct = Math.min(100, (sec / cap) * 100);
          return (
            <div className="mt-6">
              <div className="mb-2 flex items-center gap-1.5 text-[12.5px] font-bold" style={{ color: INK }}>
                <Film className="h-3.5 w-3.5" style={{ color: GOLD_D }} /> 추억 영상
                <span className="font-normal" style={{ color: FAINT }}>· {st.videos.length}개</span>
                <span className="ml-auto text-[11.5px] font-bold tabular-nums" style={{ color: st.videoOver ? warn : st.videoMeasuring ? FAINT : INK }}>
                  {st.videoMeasuring ? "길이 확인 중…" : `${fmt(sec)} / ${fmt(cap)}`}
                </span>
              </div>
              {/* 총 길이 게이지 — 사진 용량 바와 별개로 영상은 '초'로 막는다 */}
              <div className="mb-1" style={{ height: 5, background: LINE, borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: vpct + "%", background: st.videoOver ? warn : GOLD, borderRadius: 3, transition: "width .3s ease" }} />
              </div>
              <p className="mb-2 text-[11px]" style={{ color: FAINT }}>개수 제한 없음 · 총 길이 1분30초 이내 · 길게 눌러 끌어서 순서 변경 · 사진 슬라이드 다음에 묶음으로 이어집니다 · 원본 소리 그대로(배경음악 없음)</p>
              {st.videoOver && <p className="mb-2 text-[11px] font-semibold" style={{ color: warn }}>추억 영상 총 길이가 1분30초를 넘었습니다. 영상을 줄여 주세요.</p>}
              <UploadGrid items={st.videos} st={st} onAdd={st.addVideo} onFiles={st.onVideoFiles} inputRef={st.videoRef} onRemove={st.removeVideo} onReorder={st.reorderVideos} accept="video/*" addLabel="영상 추가" addHint="영상만 · 총 1분30초 이내" />
            </div>
          );
        })()}
        {st.slidePhotos.length + st.videos.length === 0 && (
          <p className="mt-3 text-[11px] font-semibold" style={{ color: warn }}>※ 추억 사진이나 영상을 1개 이상 올려야 다음 단계로 넘어갈 수 있어요.</p>
        )}
      </div>
    );
  }
  // 1 — AI 변환: 독사진 3장 전용 업로드 + 역할 지정 (슬라이드 소스와 별개로 먼저 올림)
  if (step === 1)
    return (
      <div>
        <Title sub={st.T.sub1}>{st.T.title1}</Title>

        {/* 반려동물 이름 — 타이틀(영정) 자막에 그대로 들어감 */}
        <div className="mb-4">
          <label className="block">
            <span className="mb-1 block text-[12.5px] font-bold" style={{ color: INK }}>{st.T.petNameLabel} <span style={{ color: GOLD_D }}>*</span></span>
            <input value={st.petName} onChange={(e) => st.setPetName(e.target.value)} maxLength={20}
              className="w-full px-3 text-[15px] outline-none"
              style={{ height: 44, background: SURFACE, border: "1.5px solid " + (st.petName.trim() ? LINE : GOLD), borderRadius: RADIUS, color: INK, fontFamily: SERIF, fontWeight: 700 }} />
          </label>
          <p className="mt-1 text-[11px]" style={{ color: FAINT }}>{st.T.petNameHint}</p>
        </div>

        {/* AI 변환 안함 — 체크 시 독사진 없이 진행(타이틀·AI영상 생성 생략) */}
        <label className="mb-4 flex cursor-pointer items-start gap-2.5 px-3 py-2.5" style={{ background: st.skipAi ? "#f1ede3" : "#faf8f3", border: "1.5px solid " + (st.skipAi ? GOLD : LINE2), borderRadius: RADIUS }}>
          <input type="checkbox" checked={st.skipAi} onChange={(e) => st.setSkipAi(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0" style={{ accentColor: GOLD }} />
          <span>
            <span className="block text-[12.5px] font-bold" style={{ color: INK }}>AI 변환 안함</span>
            <span className="mt-0.5 block text-[11px] leading-relaxed" style={{ color: MUTE }}>독사진 없이 진행합니다. 타이틀·AI영상 없이 <b>추억 슬라이드·영상·편지</b>로만 제작됩니다.</span>
          </span>
        </label>

        {st.skipAi ? (
          <div className="mb-2 px-3 py-3 text-[11.5px] leading-relaxed" style={{ background: "#f6f3ec", border: "1px solid " + LINE, borderRadius: RADIUS, color: MUTE }}>
            AI 변환을 사용하지 않습니다. 다음 단계에서 추억 사진·영상과 편지를 올려 주세요.
          </div>
        ) : (
        <>
        {/* 가이드 — 상단(3장 전체에 적용) */}
        <PhotoExampleGuide good={st.photos.good} bad={st.photos.bad} goodCap={st.T.photoGoodCap} badCap={st.T.photoBadCap} />
        <div className="mb-3 px-3 py-2 text-[11px] leading-relaxed" style={{ background: "#f6f3ec", border: "1px solid " + LINE, borderRadius: RADIUS, color: MUTE }}>
          💡 {st.T.aiGuide}
        </div>

        <div className="mb-1.5 flex items-center gap-1.5 text-[12.5px] font-bold" style={{ color: INK }}>
          <Sparkles className="h-3.5 w-3.5" style={{ color: GOLD_D }} /> 독사진 3장 <span className="font-normal" style={{ color: FAINT }}>· 한 장을 타이틀로 선택</span>
          <span className="ml-auto text-[11.5px] font-bold tabular-nums" style={{ color: st.aiPhotos.length === 3 ? "#3a7468" : GOLD_D }}>{st.aiPhotos.length}/3</span>
        </div>
        <input ref={st.aiFileRef} type="file" accept="image/*" multiple className="hidden" onChange={st.onAiFiles} />
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map((i) => {
            const photo = st.aiPhotos[i];
            if (!photo)
              return (
                <button key={i} onClick={st.addAiPhoto} className="flex flex-col items-center justify-center gap-1 outline-none transition hover:border-[#c9a86a]"
                  style={{ aspectRatio: "1", background: "#faf8f3", border: "1.5px dashed " + LINE2, borderRadius: RADIUS }}>
                  <Upload className="h-5 w-5" style={{ color: GOLD }} />
                  <span className="text-[10px] font-semibold" style={{ color: MUTE }}>사진 추가</span>
                </button>
              );
            const on = st.titleSel === i;
            // 비타이틀(=AI영상) 순번: 앞 사진 = A, 뒤 사진 = B. (타이틀 제외하고 앞에서부터 0=A,1=B)
            const aiRank = [0, 1, 2].filter((j) => j !== st.titleSel && j < i).length;
            return (
              <div key={photo.id} className="relative overflow-hidden" style={{ background: SURFACE, border: "1.5px solid " + (on ? GOLD : LINE), borderRadius: RADIUS }}>
                <button onClick={() => st.setTitleSel(i)} className="relative block w-full outline-none" style={{ aspectRatio: "1" }} aria-label={"사진 " + (i + 1) + " 타이틀로 선택"}>
                  {photo.thumb
                    ? <img src={photo.thumb} alt="" className="absolute inset-0 h-full w-full object-cover" />
                    : <span className="absolute inset-0 flex items-center justify-center" style={{ background: "#f0ebe0" }}><Image className="h-6 w-6" style={{ color: GOLD_D, opacity: .5 }} /></span>}
                  {photo.uploading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5" style={{ background: "rgba(0,0,0,.45)" }}>
                      <Loader2 className="h-5 w-5 animate-spin text-white" />
                      {photo.progress != null && <span className="text-[10px] font-bold tabular-nums text-white">{photo.progress}%</span>}
                    </div>
                  )}
                  {on && <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full" style={{ background: GOLD }}><Check className="h-2.5 w-2.5 text-white" strokeWidth={3} /></span>}
                </button>
                <button onClick={() => st.removeAiPhoto(photo.id)} className="absolute left-1 top-1 flex h-5 w-5 items-center justify-center rounded-full outline-none transition hover:opacity-80" style={{ background: "rgba(0,0,0,.5)", color: "#fff" }} aria-label="삭제"><X className="h-3 w-3" /></button>
                <div className="px-1 py-1.5 text-center">
                  <div className="text-[10px] font-bold" style={{ color: on ? GOLD_D : MUTE }}>{on ? "타이틀" : "영상 " + String.fromCharCode(65 + aiRank)}</div>
                </div>
              </div>
            );
          })}
        </div>
        {st.aiPhotos.length < 3 && (
          <p className="mt-2 text-[11px] font-semibold leading-relaxed" style={{ color: GOLD_D }}>
            ※ 독사진 3장을 모두 올려야 다음 단계로 넘어갈 수 있어요. (현재 {st.aiPhotos.length}/3)
          </p>
        )}
        <p className="mt-2 text-[10.5px] leading-relaxed" style={{ color: FAINT }}>
          타이틀 1장 → AI 초상화(영정 타이틀) · 나머지 2장 → AI 영상: <b style={{ color: MUTE }}>앞 사진 = A</b>(추억 슬라이드 앞) · <b style={{ color: MUTE }}>뒤 사진 = B</b>(추억 영상 뒤).
        </p>
        <p className="mt-1.5 text-[10.5px] leading-relaxed" style={{ color: FAINT }}>
          ※ 사진만 올릴 수 있어요 (영상은 업로드 불가).
        </p>
        <p className="mt-1 text-[10.5px] leading-relaxed" style={{ color: FAINT }}>
          ※ AI 변환 영상과 이미지는 원본의 생김새와 다를 수 있습니다.
        </p>
        </>
        )}
      </div>
    );
  // 프로세스 4 — 배경 음악 (선택 시 미리듣기 재생)
  if (step === 3)
    return (
      <div>
        <Title sub={st.T.sub3}>배경 음악</Title>
        <div className="space-y-2">
          {st.bgmList.length === 0 && (
            <div className="px-3 py-4 text-center text-[12.5px]" style={{ background: SURFACE, border: "1px solid " + LINE, borderRadius: RADIUS, color: FAINT }}>
              등록된 배경 음악이 없습니다. 담당자에게 문의해 주세요.
            </div>
          )}
          {st.bgmList.map((b, i) => {
            const on = st.bgm === i;
            const playing = playingBgm === i;
            return (
              <div key={b.id} onClick={() => { st.setBgm(i); playPreview(i); }}
                className="flex w-full cursor-pointer items-center gap-2.5 px-3 py-2.5 outline-none transition"
                style={{ background: on ? GOLD_SOFT : SURFACE, border: "1.5px solid " + (on ? GOLD : LINE), borderRadius: RADIUS }}>
                <span role="button"
                  onClick={(e) => { e.stopPropagation(); playing ? stopPreview() : playPreview(i); }}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                  style={{ background: on ? GOLD : "#ece7dc" }} aria-label={playing ? "정지" : "미리듣기"}>
                  {playing
                    ? <Pause className="h-4 w-4" style={{ color: on ? "#fff" : MUTE }} fill={on ? "#fff" : MUTE} />
                    : <Play className="h-4 w-4" style={{ color: on ? "#fff" : MUTE }} fill={on ? "#fff" : "none"} />}
                </span>
                <span className="flex-1 text-[12.5px] font-semibold" style={{ color: INK }}>{b.name}</span>
                <span className="text-[11px]" style={{ color: FAINT }}>{b.meta}</span>
                {on && <Check className="h-4 w-4 shrink-0" style={{ color: GOLD_D }} strokeWidth={2.6} />}
              </div>
            );
          })}
        </div>
      </div>
    );
  // 4 — 편지 작성
  if (step === 4)
    return (
      <div>
        <Title sub={st.T.sub4}>편지 작성</Title>
        {/* 상단 — 우리 처음 만난 날 · 무지개다리 건넌 날. 편지 마지막에 크게 들어갑니다. */}
        <div className="mb-3 grid grid-cols-2 gap-2">
          <DateField label={st.T.metDateLabel} value={st.metDate} onChange={st.setMetDate} />
          <DateField label={st.T.partDateLabel} value={st.partDate} onChange={st.setPartDate} />
        </div>
        <textarea value={st.letter} onChange={(e) => st.setLetter(e.target.value)} rows={7} maxLength={300}
          placeholder={st.T.letterPlaceholder}
          className="w-full resize-none p-3 text-[13px] leading-relaxed outline-none"
          style={{ background: SURFACE, border: "1px solid " + LINE, borderRadius: RADIUS, color: INK, fontFamily: SERIF }} />
        <div className="mt-1 text-right text-[11px]" style={{ color: FAINT }}>{st.letter.length} / 300</div>
      </div>
    );
  // 5 — 미리보기 (ffmpeg 합성 전 — 슬라이드는 캔버스로, 영상은 직접 재생)
  if (step === 5) {
    // 추억 슬라이드 = 사진만 (영상은 아래 '추억 영상' 섹션에서 개별 클립으로 재생)
    // 각 사진의 선택 전환(transMap[id] ?? 기본 trans)을 함께 넘겨 미리보기에 실제 효과 반영.
    const slideFrames = st.slidePhotos
      .map((u) => ({ src: u.thumb, x: TRANSITIONS[st.transMap[u.id] ?? st.trans]?.x || "fade" }))
      .filter((f) => f.src);
    const playable = st.videos.filter((v) => v.url);
    return (
      <div>
        <Title sub={st.T.sub5}>미리보기</Title>
        <div className="relative overflow-hidden" style={{ aspectRatio: "16/9", background: "#1c232c", borderRadius: RADIUS }}>
          {slideFrames.length ? <SlideCanvas frames={slideFrames} /> : <div className="flex h-full items-center justify-center"><Play className="h-10 w-10 text-white" style={{ opacity: 0.85 }} fill="#fff" /></div>}
          <span className="absolute bottom-2 left-2 px-1.5 py-[2px] text-[9px] font-bold tracking-wider text-white" style={{ background: "rgba(0,0,0,.45)", borderRadius: 2 }}>추억 슬라이드 미리보기 · 16:9</span>
        </div>
        {/* 추억 영상 — 실제 재생 */}
        {playable.length > 0 && (
          <div className="mt-2">
            <div className="mb-1 text-[11.5px] font-bold" style={{ color: INK }}>추억 영상 {playable.length}개</div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {playable.map((v) => (
                <video key={v.id} src={v.url} controls playsInline preload="metadata" className="shrink-0" style={{ width: 168, aspectRatio: "16/9", background: "#000", borderRadius: 6 }} />
              ))}
            </div>
          </div>
        )}
        <p className="mt-2 text-[11px] leading-relaxed" style={{ color: FAINT }}>
          {st.skipAi
            ? "추억 슬라이드·영상·편지로 제작됩니다. (위는 슬라이드·영상 미리보기)"
            : "타이틀·AI 영상은 제작 후 완성본에서 확인됩니다. (위는 추억 슬라이드·영상 미리보기)"}
        </p>
        <div className="mt-3 text-center" style={{ fontFamily: SERIF, fontSize: 18, fontWeight: 700, color: INK }}>{st.petName || st.link.petName || "콩이"}</div>
        <p className="mt-1 text-center text-[12px]" style={{ color: MUTE }}>{st.skipAi ? "추억 슬라이드 · 추억 영상 · 편지" : "타이틀 · AI 영상 · 추억 슬라이드 · 추억 영상 · 편지"}</p>
        {/* 유저가 고른 설정 요약 */}
        <div className="mt-3 space-y-1 px-3 py-2.5 text-[11.5px]" style={{ background: "#f6f3ec", border: "1px solid " + LINE, borderRadius: RADIUS, color: MUTE }}>
          <div className="flex justify-between"><span>추억 슬라이드 사진</span><span style={{ color: INK }}>{st.slidePhotos.length}장</span></div>
          <div className="flex justify-between"><span>추억 영상</span><span style={{ color: INK }}>{st.videos.length}개</span></div>
          {!st.skipAi && <div className="flex justify-between"><span>타이틀 사진</span><span style={{ color: INK }}>{st.titleSel + 1}번 선택</span></div>}
          {!st.skipAi && <div className="flex justify-between"><span>AI 영상 변환</span><span style={{ color: INK }}>나머지 2장 (앞=A · 뒤=B)</span></div>}
          {st.skipAi && <div className="flex justify-between"><span>AI 변환</span><span style={{ color: INK }}>사용 안 함</span></div>}
          <div className="flex justify-between"><span>장면 전환</span><span style={{ color: INK }}>{Object.keys(st.transMap).length > 0 ? "개별 설정" : TRANSITIONS[st.trans]?.ko}</span></div>
          <div className="flex justify-between"><span>배경 음악</span><span style={{ color: INK }}>{st.bgmList[st.bgm]?.name || "선택 안 함"}</span></div>
        </div>
      </div>
    );
  }
  // 6 — 제출 완료 (렌더 큐잉 → 제작중 → 완료 상태별 노출)
  const done = st.videoStatus === "done";
  const copyShare = async () => {
    try { await navigator.clipboard.writeText(st.shareUrl); toast("링크를 복사했습니다"); }
    catch { toast("링크: " + st.shareUrl); }
  };
  return (
    <div className="flex flex-col items-center py-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full" style={{ background: GOLD_SOFT }}>
        {done ? <Heart className="h-7 w-7" style={{ color: GOLD_D }} fill={GOLD_D} /> : <Check className="h-7 w-7" style={{ color: GOLD_D }} strokeWidth={3} />}
      </div>
      <h2 className="mt-4 text-[17px] font-bold" style={{ color: INK }}>
        {done ? "추모영상이 완성되었습니다" : "제작 신청이 접수되었습니다"}
      </h2>
      <p className="mt-1.5 text-[12.5px] leading-relaxed" style={{ color: MUTE }}>
        {done
          ? <>아래 링크로 가족·조문객과 함께 보실 수 있습니다.<br />링크는 퇴실 시 자동으로 만료됩니다.</>
          : <>올려주신 사진·영상으로 추모영상을 제작하고 있습니다.<br />완료되면 같은 링크에서 바로 보실 수 있습니다.</>}
      </p>
      <div className="mt-4 w-full">
        <div className="relative flex flex-col items-center justify-center gap-2" style={{ aspectRatio: "16/9", background: "#2a323d", borderRadius: RADIUS, overflow: "hidden" }}>
          {done && st.link?.videoUrl ? (
            <video src={st.link.videoUrl} controls playsInline className="absolute inset-0 h-full w-full" style={{ background: "#000" }} />
          ) : done ? (
            <Play className="h-10 w-10 text-white" fill="#fff" style={{ opacity: 0.9 }} />
          ) : (
            <>
              <Loader2 className="h-8 w-8 animate-spin text-white" style={{ opacity: 0.85 }} />
              <span className="text-[11.5px] font-semibold text-white" style={{ opacity: 0.8 }}>
                추모영상 제작 중…
              </span>
            </>
          )}
        </div>
        {/* 공유 링크 — 토큰 기반, 제작중에도 미리 공유 가능 */}
        <div className="mt-3 flex items-center gap-2 px-3 py-2 text-[11.5px]" style={{ background: "#f6f3ec", border: "1px solid " + LINE, borderRadius: RADIUS, color: MUTE }}>
          <span className="truncate" style={{ color: INK }}>{st.shareUrl}</span>
        </div>
        <button onClick={copyShare} className="mt-2 w-full py-2.5 text-[13px] font-bold text-white" style={{ background: GOLD, borderRadius: RADIUS }}>링크 복사 · 공유하기</button>
        {!BACKEND_LIVE && <p className="mt-2 text-[10.5px]" style={{ color: FAINT }}>※ 현재 데모 모드 — 백엔드(.env) 연결 시 실제 업로드·제작 큐잉으로 동작합니다.</p>}
      </div>
    </div>
  );
}
