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

// 미리보기 캔버스 슬라이드쇼 — 보호자 슬라이드 사진/영상 첫프레임을 크로스페이드로 순환(ffmpeg 슬라이드 구간을 클라이언트에서 모사).
function SlideCanvas({ frames }) {
  const ref = useRef(null);
  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const ctx = cv.getContext("2d"); const W = cv.width, H = cv.height;
    const imgs = frames.map((src) => { const im = new window.Image(); im.src = src; return im; }); // window.Image — lucide-react의 Image 아이콘 import와 이름충돌 회피(전역 생성자 명시)
    // contain(fit) — 절대 crop 안 함. 전체가 보이도록 맞추고 남는 쪽은 여백(배경색). 세로사진=좌우 여백, 가로사진=상하 여백.
    const drawContain = (im) => {
      const ir = im.naturalWidth / im.naturalHeight, cr = W / H; let w, h, x, y;
      if (ir > cr) { w = W; h = W / ir; x = 0; y = (H - h) / 2; } else { h = H; w = H * ir; x = (W - w) / 2; y = 0; }
      ctx.drawImage(im, x, y, w, h);
    };
    const PER = 2600, FADE = 700; let raf; const t0 = performance.now();
    const frame = (now) => {
      const n = imgs.length;
      ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H); // 여백색 = 최종 영상 ffmpeg pad(검정)과 일치(WYSIWYG)
      if (n) {
        const e = now - t0, idx = Math.floor(e / PER) % n, prev = (idx - 1 + n) % n, a = Math.min(1, (e % PER) / FADE);
        if (n > 1 && imgs[prev].complete && imgs[prev].naturalWidth) drawContain(imgs[prev]);
        if (imgs[idx].complete && imgs[idx].naturalWidth) { ctx.globalAlpha = n > 1 ? a : 1; drawContain(imgs[idx]); ctx.globalAlpha = 1; }
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [frames]);
  return <canvas ref={ref} width={640} height={360} className="absolute inset-0 h-full w-full" />;
}

// 소스 업로드 그리드 — 사진(슬라이드, 전환 선택) / 영상(추억 영상) 공용. withTrans면 카드마다 전환 선택 노출.
function UploadGrid({ items, withTrans, st, onAdd, onFiles, inputRef, onRemove, onReorder, accept, addLabel, addHint }) {
  const [dragId, setDragId] = useState(null);
  const [overId, setOverId] = useState(null);
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
              draggable
              onDragStart={() => setDragId(u.id)}
              onDragEnd={() => { setDragId(null); setOverId(null); }}
              onDragOver={(e) => { e.preventDefault(); if (overId !== u.id) setOverId(u.id); }}
              onDrop={(e) => { e.preventDefault(); onReorder(dragId, u.id); setOverId(null); }}
              className="flex cursor-grab flex-col gap-1 p-1 transition active:cursor-grabbing"
              style={{ background: SURFACE, border: "1px solid " + (overId === u.id && dragId !== u.id ? GOLD : LINE), borderRadius: RADIUS, opacity: dragId === u.id ? 0.45 : 1 }}>
              <div className="relative overflow-hidden" style={{ aspectRatio: "1", borderRadius: 4, background: "linear-gradient(135deg,#f0ebe0,#e3d9c4)" }}>
                {u.thumb ? (
                  <img src={u.thumb} alt="" className="absolute inset-0 h-full w-full object-cover" />
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
    </>
  );
}

export function StepBody({ step, st }) {
  // 배경 음악 미리듣기 — 실제 mp3 자산이 없는 목업이라 WebAudio로 잔잔한 톤을 합성해 소리가 나게 한다.
  // (본운영: b.src(실제 파일)로 <audio> 재생으로 교체)
  const [playingBgm, setPlayingBgm] = useState(null);
  const [openPrivacy, setOpenPrivacy] = useState(false);   // 동의 0단계 — 개인정보 상세 펼침
  const [openMarketing, setOpenMarketing] = useState(false); // 동의 0단계 — 마케팅 상세 펼침
  const audioCtxRef = useRef(null);
  const oscRef = useRef([]);
  const stopPreview = () => {
    oscRef.current.forEach((o) => { try { o.stop(); } catch { /* already stopped */ } });
    oscRef.current = [];
    setPlayingBgm(null);
  };
  const playPreview = (bi) => {
    stopPreview();
    try {
      const ctx = audioCtxRef.current || (audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)());
      const now = ctx.currentTime;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.1, now + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);
      gain.connect(ctx.destination);
      // 곡마다 살짝 다른 화음(트랙 구분용)
      const chord = [261.63, 329.63, 392.0].map((f) => f * (1 + bi * 0.05));
      chord.forEach((f, k) => {
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.value = f;
        osc.connect(gain);
        osc.start(now + k * 0.12);
        osc.stop(now + 1.8);
        oscRef.current.push(osc);
      });
      setPlayingBgm(bi);
      setTimeout(() => setPlayingBgm((p) => (p === bi ? null : p)), 1800);
    } catch { /* WebAudio 미지원 환경 — 무음 폴백 */ }
  };
  useEffect(() => stopPreview, []); // 언마운트 시 정지
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
        <p className="mb-2 text-[11px]" style={{ color: FAINT }}>최대 20장 · 장당 7~10초 · 끌어서 순서 변경 · 사진마다 전환 효과 선택</p>
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
              <p className="mb-2 text-[11px]" style={{ color: FAINT }}>개수 제한 없음 · 총 길이 1분30초 이내 · 사진 슬라이드 다음에 묶음으로 이어집니다 · 원본 소리 그대로(배경음악 없음)</p>
              {st.videoOver && <p className="mb-2 text-[11px] font-semibold" style={{ color: warn }}>추억 영상 총 길이가 1분30초를 넘었습니다. 영상을 줄여 주세요.</p>}
              <UploadGrid items={st.videos} st={st} onAdd={st.addVideo} onFiles={st.onVideoFiles} inputRef={st.videoRef} onRemove={st.removeVideo} onReorder={st.reorderVideos} accept="video/*" addLabel="영상 추가" addHint="영상만 · 총 1분30초 이내" />
            </div>
          );
        })()}
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
        <PhotoExampleGuide good={st.photos.good} bad={st.photos.bad} />
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
                  <div className="text-[10px] font-bold" style={{ color: on ? GOLD_D : MUTE }}>{on ? "이미지" : "영상"}</div>
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
          타이틀 1장 → AI 초상화 + 톤 변경(영정 타이틀) · 나머지 2장 → AI 영상(추억 슬라이드 앞·추억 영상 뒤).
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
          {D.BGM.map((b, i) => {
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
    const slideFrames = [...st.slidePhotos, ...st.videos].map((u) => u.thumb).filter(Boolean);
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
          {!st.skipAi && <div className="flex justify-between"><span>AI 영상 변환</span><span style={{ color: INK }}>나머지 2장 (앞·뒤)</span></div>}
          {st.skipAi && <div className="flex justify-between"><span>AI 변환</span><span style={{ color: INK }}>사용 안 함</span></div>}
          <div className="flex justify-between"><span>장면 전환</span><span style={{ color: INK }}>{Object.keys(st.transMap).length > 0 ? "개별 설정" : TRANSITIONS[st.trans]?.ko}</span></div>
          <div className="flex justify-between"><span>배경 음악</span><span style={{ color: INK }}>{D.BGM[st.bgm].name}</span></div>
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
                {st.videoStatus === "rendering" ? "제작 중…" : "제작 대기 중…"}
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
