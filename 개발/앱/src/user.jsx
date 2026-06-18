import React, { useState, useRef, useEffect } from "react";
import { Check, Upload, Image, Film, Music, Play, Pause, ChevronLeft, ChevronRight, Heart, X, Sparkles, Shuffle, GripVertical, Loader2 } from "lucide-react";
import { SANS, SERIF, BG, SURFACE, LINE, LINE2, GOLD, GOLD_D, GOLD_SOFT, INK, MUTE, FAINT, STATUS, RADIUS } from "./theme.js";
import { Logo } from "./ui.jsx";
import { toast } from "./toast.jsx";
import { grabVideoFrame } from "./lib/media.js";
import { getToken, resolveLink, uploadAsset, submitLink, shareUrlFor } from "./lib/userLink.js";
import { BACKEND_LIVE } from "./lib/supabase.js";
import * as D from "./data.js";
import dogGood from "./assets/dog-good.jpg"; // AI 변환 가이드 — 좋은 예(전신·정면·단독)
import dogBad from "./assets/dog-bad.jpg";   // 〃 — 나쁜 예(여러 마리·흐림)

const STEPS = D.USER_STEPS;
const TRANSITIONS = D.USER_TRANSITIONS; // 전환 효과 명칭은 data.js에서 단일 관리

const parseMB = (s) => {
  const n = parseFloat(s);
  if (s.includes("GB")) return n * 1024;
  if (s.includes("MB")) return n;
  if (s.includes("KB")) return n / 1024;
  return 0;
};

// 상단 스텝퍼
function Stepper({ step }) {
  return (
    <div className="flex items-center gap-1 px-4 py-3" style={{ borderBottom: "1px solid " + LINE }}>
      {STEPS.map((s, i) => (
        <React.Fragment key={i}>
          <div className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold"
            style={{ background: i < step ? STATUS.published.c : i === step ? GOLD : "#e9e5dc", color: i <= step ? "#fff" : FAINT }}>
            {i < step ? <Check className="h-3 w-3" strokeWidth={3} /> : i + 1}
          </div>
          {i < STEPS.length - 1 && <div className="h-px flex-1" style={{ background: i < step ? STATUS.published.c : LINE2 }} />}
        </React.Fragment>
      ))}
    </div>
  );
}

function Title({ children, sub }) {
  return (
    <div className="mb-4">
      <h2 className="text-[17px] font-bold" style={{ color: INK }}>{children}</h2>
      {sub && <p className="mt-1 text-[12.5px] leading-relaxed" style={{ color: MUTE }}>{sub}</p>}
    </div>
  );
}

// 좋은/나쁜 사진 예시 — AI 변환 가이드에 실사 예시 사진으로 표시
function PhotoExampleGuide() {
  const Card = ({ src, badge, badgeColor, BadgeIcon, caption, imgStyle }) => (
    <div className="overflow-hidden" style={{ background: SURFACE, border: "1px solid " + LINE, borderRadius: RADIUS }}>
      <div className="relative overflow-hidden" style={{ aspectRatio: "1", background: "#e8e1d1" }}>
        <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" style={imgStyle} />
        <span className="absolute right-1.5 top-1.5 flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9.5px] font-bold text-white" style={{ background: badgeColor }}>
          <BadgeIcon className="h-2.5 w-2.5" strokeWidth={3} /> {badge}
        </span>
      </div>
      <div className="px-2 py-1.5 text-center text-[10.5px] font-semibold leading-snug" style={{ color: MUTE }}>{caption}</div>
    </div>
  );
  return (
    <div className="mb-3 grid grid-cols-2 gap-2">
      <Card src={dogGood} badge="좋은 예" badgeColor={STATUS.published.c} BadgeIcon={Check} caption="정면 · 또렷한 전신 · 한 마리" />
      <Card src={dogBad} badge="피해주세요" badgeColor={FAINT} BadgeIcon={X} caption="흐릿함 · 여러 마리" imgStyle={{ filter: "blur(1.6px) saturate(.9)", transform: "scale(1.1)" }} />
    </div>
  );
}

// 소스 미리보기 썸네일 (사진/영상) — thumb URL이 있으면 실제 이미지, 없으면 아이콘 폴백
function SourceThumb({ kind, thumb }) {
  return (
    <div className="relative flex items-center justify-center overflow-hidden"
      style={{ aspectRatio: "4/3", background: "linear-gradient(135deg,#f0ebe0,#e3d9c4)", borderTopLeftRadius: RADIUS, borderTopRightRadius: RADIUS }}>
      {thumb ? (
        <img src={thumb} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : kind === "photo" ? (
        <Image className="h-6 w-6" style={{ color: GOLD_D, opacity: 0.55 }} />
      ) : (
        <Film className="h-6 w-6" style={{ color: GOLD_D, opacity: 0.55 }} />
      )}
      {kind === "video" && (
        <span className="absolute bottom-1 right-1 flex h-4 w-4 items-center justify-center rounded-full" style={{ background: "rgba(0,0,0,.45)" }}>
          <Play className="h-2 w-2 text-white" fill="#fff" />
        </span>
      )}
    </div>
  );
}

function StepBody({ step, st }) {
  const [dragId, setDragId] = useState(null);   // 장면 전환 — 끌고 있는 소스 id
  const [overId, setOverId] = useState(null);   // 현재 드롭 대상 소스 id
  // 배경 음악 미리듣기 — 실제 mp3 자산이 없는 목업이라 WebAudio로 잔잔한 톤을 합성해 소리가 나게 한다.
  // (본운영: b.src(실제 파일)로 <audio> 재생으로 교체)
  const [playingBgm, setPlayingBgm] = useState(null);
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
        <Title sub="소중한 기억을 영상으로 담기 위해 아래 동의가 필요합니다.">개인정보 활용 동의</Title>
        <div className="space-y-3 text-[12.5px] leading-relaxed" style={{ color: MUTE }}>
          <div className="px-4 py-3" style={{ background: "#f6f3ec", borderRadius: RADIUS, border: "1px solid " + LINE }}>
            <div className="mb-1.5 font-bold" style={{ color: INK }}>개인정보 수집·이용 동의 (필수)</div>
            <p>수집 항목: 반려동물·보호자 성함, 사진/영상, 연락처, 편지 내용</p>
            <p>수집 목적: 추모영상 제작 및 전달</p>
            <p>보유 기간: 보호자 삭제 요청 시까지 보관 (요청 시 즉시 파기)</p>
          </div>
          <button onClick={() => st.setAgreed((v) => !v)} className="flex w-full items-center gap-2 text-left text-[13px] font-semibold outline-none" style={{ color: INK }}>
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-sm" style={{ background: st.agreed ? GOLD : "#fff", border: "1.5px solid " + (st.agreed ? GOLD : LINE2) }}>
              {st.agreed && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
            </span>
            개인정보 수집·이용에 동의합니다 (필수)
          </button>
          {!st.agreed && <p className="text-[11.5px]" style={{ color: GOLD_D }}>※ 동의해야 다음 단계로 진행할 수 있습니다.</p>}
        </div>
      </div>
    );
  // 프로세스 3 — 소스 업로드 + 장면 전환 (한 화면에서 올리고·순서·전환까지)
  if (step === 2) {
    const pct = Math.min(100, (st.totalMB / 100) * 100);
    const warn = "#b06030";
    return (
      <div>
        <Title sub="추억 사진·영상을 올리고, 카드를 끌어 순서를 바꾸고 전환 효과를 정하세요. (최대 20개 · 100MB)">소스 업로드 · 장면 전환</Title>
        <div className="mb-3">
          <div className="mb-1 flex justify-between text-[11px]" style={{ color: MUTE }}>
            <span>사용 용량</span>
            <span style={{ color: st.overLimit ? warn : INK, fontWeight: st.overLimit ? 700 : 400 }}>{st.totalMB.toFixed(1)} / 100 MB</span>
          </div>
          <div style={{ height: 5, background: LINE, borderRadius: 3, overflow: "hidden" }}>
            <div style={{ height: "100%", width: pct + "%", background: st.overLimit ? warn : GOLD, borderRadius: 3, transition: "width .3s ease" }} />
          </div>
          {st.overLimit && <p className="mt-1 text-[11px] font-semibold" style={{ color: warn }}>100MB를 초과했습니다. 파일을 삭제해 주세요.</p>}
        </div>
        <input ref={st.fileRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={st.onFiles} />
        <button onClick={st.addUpload} className="mb-3 flex w-full cursor-pointer flex-col items-center justify-center gap-1.5 py-7 outline-none transition hover:border-[#c9a86a]" style={{ border: "1.5px dashed " + LINE2, borderRadius: RADIUS, background: "#faf8f3" }}>
          <Upload className="h-6 w-6" style={{ color: GOLD }} />
          <span className="text-[12.5px] font-semibold" style={{ color: INK }}>사진·영상 끌어다 놓기</span>
          <span className="text-[11px]" style={{ color: FAINT }}>또는 눌러서 선택</span>
        </button>
        {st.uploads.length === 0 ? (
          <div className="py-6 text-center text-[12.5px]" style={{ color: FAINT }}>아직 올린 파일이 없습니다. 사진·영상을 추가해 주세요.</div>
        ) : (
          <>
            <div className="mb-1.5 flex items-center justify-between text-[11.5px]" style={{ color: MUTE }}>
              <span>{st.uploads.length} / 20개 · <span style={{ color: FAINT }}>끌어서 순서 변경</span></span>
              <button onClick={st.randomizeTrans}
                className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold outline-none transition hover:opacity-75"
                style={{ background: GOLD_SOFT, border: "1px solid " + LINE2, borderRadius: RADIUS, color: GOLD_D }}>
                <Shuffle className="h-3 w-3" /> 전환 랜덤
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {st.uploads.map((u, i) => (
                <div key={u.id}
                  draggable
                  onDragStart={() => setDragId(u.id)}
                  onDragEnd={() => { setDragId(null); setOverId(null); }}
                  onDragOver={(e) => { e.preventDefault(); if (overId !== u.id) setOverId(u.id); }}
                  onDrop={(e) => { e.preventDefault(); st.reorderUploads(dragId, u.id); setOverId(null); }}
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
                      <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(0,0,0,.35)" }}><Loader2 className="h-4 w-4 animate-spin text-white" /></div>
                    )}
                    <button onClick={() => st.removeUpload(u.id)} className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full outline-none transition hover:opacity-80" style={{ background: "rgba(0,0,0,.5)", color: "#fff" }} aria-label="삭제"><X className="h-2.5 w-2.5" /></button>
                  </div>
                  <select value={st.transMap[u.id] ?? st.trans} onChange={(e) => st.setItemTrans(u.id, +e.target.value)}
                    className="w-full px-0.5 py-0.5 text-[9px] outline-none" style={{ background: "#f6f3ec", border: "1px solid " + LINE2, borderRadius: 4, color: INK }}>
                    {TRANSITIONS.map((t, j) => <option key={j} value={j}>{t.ko}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }
  // 1 — AI 변환: 독사진 3장 전용 업로드 + 역할 지정 (슬라이드 소스와 별개로 먼저 올림)
  if (step === 1)
    return (
      <div>
        <Title sub="추모영상에 쓸 독사진 3장을 올려주세요. 한 장은 타이틀, 나머지 2장은 AI 추억 영상이 됩니다.">AI 변환 · 독사진 3장</Title>

        {/* 가이드 — 상단(3장 전체에 적용) */}
        <PhotoExampleGuide />
        <div className="mb-3 px-3 py-2 text-[11px] leading-relaxed" style={{ background: "#f6f3ec", border: "1px solid " + LINE, borderRadius: RADIUS, color: MUTE }}>
          💡 <b style={{ color: INK }}>잘 나온 독사진</b>일수록 결과가 좋아요 — 아이만 또렷하게, 얼굴이 정면. (추억 슬라이드용 사진·영상은 다음 ‘소스 업로드’ 단계)
        </div>

        <div className="mb-1.5 flex items-center gap-1.5 text-[12.5px] font-bold" style={{ color: INK }}>
          <Sparkles className="h-3.5 w-3.5" style={{ color: GOLD_D }} /> 독사진 3장 <span className="font-normal" style={{ color: FAINT }}>· 한 장을 타이틀로 선택</span>
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
                    <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(0,0,0,.35)" }}><Loader2 className="h-5 w-5 animate-spin text-white" /></div>
                  )}
                  {on && <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full" style={{ background: GOLD }}><Check className="h-2.5 w-2.5 text-white" strokeWidth={3} /></span>}
                </button>
                <button onClick={() => st.removeAiPhoto(photo.id)} className="absolute left-1 top-1 flex h-5 w-5 items-center justify-center rounded-full outline-none transition hover:opacity-80" style={{ background: "rgba(0,0,0,.5)", color: "#fff" }} aria-label="삭제"><X className="h-3 w-3" /></button>
                <div className="px-1 py-1 text-center">
                  <div className="text-[9.5px] font-bold" style={{ color: on ? GOLD_D : MUTE }}>{on ? "타이틀" : "AI 영상"}</div>
                  <div className="text-[8.5px]" style={{ color: FAINT }}>{on ? "GPT i2i" : "Kling i2v"}</div>
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-[10.5px] leading-relaxed" style={{ color: FAINT }}>
          타이틀 1장 → GPT 이미지→이미지로 영정 타이틀 · 나머지 2장 → Kling 이미지→영상으로 AI 추억 영상.
        </p>
      </div>
    );
  // 프로세스 4 — 배경 음악 (선택 시 미리듣기 재생)
  if (step === 3)
    return (
      <div>
        <Title sub="배경 음악을 고르면 미리듣기가 재생됩니다.">배경 음악</Title>
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
        <Title sub="떠나보낸 아이에게 전하고 싶은 마음을 담아 주세요. 편지는 배경음과 함께 영상에 표시됩니다.">편지 작성</Title>
        <textarea value={st.letter} onChange={(e) => st.setLetter(e.target.value)} rows={7} maxLength={300} className="w-full resize-none p-3 text-[13px] leading-relaxed outline-none"
          style={{ background: SURFACE, border: "1px solid " + LINE, borderRadius: RADIUS, color: INK, fontFamily: SERIF }} />
        <div className="mt-1 text-right text-[11px]" style={{ color: FAINT }}>{st.letter.length} / 300</div>
      </div>
    );
  // 5 — 미리보기
  if (step === 5)
    return (
      <div>
        <Title sub="제작될 추모영상을 미리 확인합니다. (서버 렌더 영상 재생)">미리보기</Title>
        <div className="relative flex items-center justify-center" style={{ aspectRatio: "16/9", background: "#2a323d", borderRadius: RADIUS }}>
          <Play className="h-10 w-10 text-white" style={{ opacity: 0.85 }} fill="#fff" />
          <span className="absolute bottom-2 left-2 px-1.5 py-[2px] text-[9px] font-bold tracking-wider text-white" style={{ background: "rgba(0,0,0,.4)", borderRadius: 2 }}>16:9 · 1080p</span>
        </div>
        <div className="mt-3 text-center" style={{ fontFamily: SERIF, fontSize: 18, fontWeight: 700, color: INK }}>{st.link.petName || "콩이"}</div>
        <p className="mt-1 text-center text-[12px]" style={{ color: MUTE }}>타이틀 · 오프닝 · 추억 슬라이드 · AI 영상 · 편지</p>
        {/* 유저가 고른 설정 요약 */}
        <div className="mt-3 space-y-1 px-3 py-2.5 text-[11.5px]" style={{ background: "#f6f3ec", border: "1px solid " + LINE, borderRadius: RADIUS, color: MUTE }}>
          <div className="flex justify-between"><span>슬라이드 소스</span><span style={{ color: INK }}>{st.uploads.length}개</span></div>
          <div className="flex justify-between"><span>타이틀 사진</span><span style={{ color: INK }}>{st.titleSel + 1}번 선택</span></div>
          <div className="flex justify-between"><span>AI 영상 변환</span><span style={{ color: INK }}>나머지 2장</span></div>
          <div className="flex justify-between"><span>장면 전환</span><span style={{ color: INK }}>{Object.keys(st.transMap).length > 0 ? "개별 설정" : TRANSITIONS[st.trans]?.ko}</span></div>
          <div className="flex justify-between"><span>배경 음악</span><span style={{ color: INK }}>{D.BGM[st.bgm].name}</span></div>
        </div>
      </div>
    );
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
        <div className="relative flex flex-col items-center justify-center gap-2" style={{ aspectRatio: "16/9", background: "#2a323d", borderRadius: RADIUS }}>
          {done ? (
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

export default function UserMobile() {
  // 토큰 = 비로그인 접근 권한. 라이브(env+토큰)면 실업로드/제출, 아니면 데모(목업).
  const token = getToken();
  const liveMode = BACKEND_LIVE && !!token;

  const [step, setStep] = useState(0);
  const [agreed, setAgreed] = useState(false);
  // 항상 빈 상태로 시작 — 보호자가 슬라이드 소스를 직접 업로드.
  const [uploads, setUploads] = useState([]);
  const [trans, setTrans] = useState(0);
  const [bgm, setBgm] = useState(0);
  const [letter, setLetter] = useState(liveMode ? "" : D.EDITOR_LETTER);
  const [titleSel, setTitleSel] = useState(0);
  const [transMap, setTransMap] = useState({});
  const [link, setLink] = useState({ mode: liveMode ? "live" : "demo", ok: true, token, petName: "", partnerName: "", status: "draft" });
  const [submitting, setSubmitting] = useState(false);
  const [videoStatus, setVideoStatus] = useState("queued");
  const fileRef = useRef(null);
  const aiFileRef = useRef(null);
  // 독사진 3장(AI 변환 전용) — 슬라이드 소스와 별개로 먼저 업로드.
  //   타이틀 1장 → GPT 이미지→이미지(영정 타이틀) · 나머지 2장 → Kling 이미지→영상(AI 추억 영상)
  const [aiPhotos, setAiPhotos] = useState([]); // 항상 빈 상태로 시작 — 보호자가 직접 3장 업로드
  const addAiPhoto = () => aiFileRef.current && aiFileRef.current.click();
  const onAiFiles = (e) => {
    const room = Math.max(0, 3 - aiPhotos.length); // 최대 3장
    const files = Array.from(e.target.files || []).slice(0, room);
    files.forEach((f, k) => {
      const id = "ai-" + Date.now() + "-" + k;
      setAiPhotos((p) => [...p, { id, name: f.name, thumb: f.type.startsWith("image") ? URL.createObjectURL(f) : undefined, uploading: liveMode, storagePath: null }]);
      uploadAsset(token, f, { kind: "photo" })
        .then((res) => setAiPhotos((p) => p.map((u) => (u.id === id ? { ...u, uploading: false, storagePath: res.storagePath } : u))))
        .catch((err) => { setAiPhotos((p) => p.filter((u) => u.id !== id)); toast(err.message || "업로드 실패"); });
    });
    e.target.value = "";
  };
  const removeAiPhoto = (id) => setAiPhotos((p) => {
    const gone = p.find((u) => u.id === id);
    if (gone && gone.thumb && gone.thumb.startsWith("blob:")) URL.revokeObjectURL(gone.thumb);
    return p.filter((u) => u.id !== id);
  });
  const aiUploadingNow = aiPhotos.some((u) => u.uploading);

  // 토큰 해석 — 컨텍스트(반려동물/빈소)·진행 상태. 이미 제출된 링크면 완료 화면으로.
  useEffect(() => {
    let alive = true;
    resolveLink(token).then((r) => {
      if (!alive) return;
      setLink(r);
      if (r.ok && r.status && r.status !== "draft") {
        setVideoStatus(r.status);
        setStep(STEPS.length - 1);
      }
    });
    return () => { alive = false; };
  }, [token]);

  const removeUpload = (id) => setUploads((p) => {
    const gone = p.find((u) => u.id === id);
    if (gone && gone.thumb && gone.thumb.startsWith("blob:")) URL.revokeObjectURL(gone.thumb);
    return p.filter((u) => u.id !== id);
  });
  const addUpload = () => fileRef.current && fileRef.current.click();
  const onFiles = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach((f, k) => {
      const id = "u-" + Date.now() + "-" + k;
      const isVideo = f.type.startsWith("video");
      setUploads((p) => [
        ...p,
        {
          id,
          name: f.name,
          kind: isVideo ? "video" : "photo",
          size: (f.size / 1048576).toFixed(1) + "MB",
          thumb: f.type.startsWith("image") ? URL.createObjectURL(f) : undefined,
          uploading: liveMode,          // 라이브면 업로드 진행 표시
          storagePath: null,
        },
      ]);
      // 실제 스토리지 업로드(라이브). 끝나면 storagePath 부착, 실패 시 카드 제거 + 안내.
      uploadAsset(token, f, { kind: isVideo ? "video" : "photo" })
        .then((res) => setUploads((p) => p.map((u) => (u.id === id ? { ...u, uploading: false, storagePath: res.storagePath } : u))))
        .catch((err) => { setUploads((p) => p.filter((u) => u.id !== id)); toast(err.message || "업로드 실패"); });
      // 영상은 첫 프레임 캡처가 끝나면 해당 카드 썸네일만 비동기 갱신 (실패 시 아이콘 폴백 유지)
      if (isVideo) grabVideoFrame(f).then((thumb) => {
        if (thumb) setUploads((p) => p.map((u) => (u.id === id ? { ...u, thumb } : u)));
      });
    });
    e.target.value = "";
  };
  const setItemTrans = (id, idx) => setTransMap((m) => ({ ...m, [id]: idx }));
  // 전환만 무작위 배치 — 사진 순서는 그대로, 소스마다 전환 효과만 랜덤 지정
  const randomizeTrans = () => setTransMap(Object.fromEntries(uploads.map((u) => [u.id, Math.floor(Math.random() * TRANSITIONS.length)])));
  // 드래그로 소스 순서 변경 — fromId를 toId 위치로 이동
  const reorderUploads = (fromId, toId) => setUploads((p) => {
    if (!fromId || fromId === toId) return p;
    const arr = [...p];
    const from = arr.findIndex((u) => u.id === fromId);
    const to = arr.findIndex((u) => u.id === toId);
    if (from < 0 || to < 0) return p;
    arr.splice(to, 0, arr.splice(from, 1)[0]);
    return arr;
  });
  const totalMB = uploads.reduce((sum, u) => sum + parseMB(u.size), 0);
  const overLimit = totalMB > 100;
  const uploadingNow = uploads.some((u) => u.uploading);
  const shareUrl = shareUrlFor(link.token || token);

  // 위저드 입력 일괄 제출 → 렌더 큐잉(status=queued). 성공 시 완료 화면으로.
  const doSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    // 독사진 3장 — 타이틀(GPT i2i) 1장 + AI 영상(Kling i2v) 2장. 슬라이드 소스와 함께 제출.
    const aiAssets = aiPhotos.map((u, i) => ({
      kind: "photo",
      role: i === titleSel ? "title" : "ai_video",
      engine: i === titleSel ? "gpt-image" : "kling",
      name: u.name, storagePath: u.storagePath, sortOrder: i,
    }));
    const assets = [
      ...aiAssets,
      ...uploads.map((u, i) => ({ kind: u.kind, role: "source", name: u.name, sizeMB: parseMB(u.size), storagePath: u.storagePath, sortOrder: i })),
    ];
    const res = await submitLink(link.token || token, {
      titleIndex: titleSel, transDefault: trans, transMap, bgmId: D.BGM[bgm]?.id, letter, assets,
    });
    setSubmitting(false);
    if (!res.ok) { toast(res.error || "제출에 실패했습니다. 다시 시도해 주세요."); return; }
    setVideoStatus(res.status || "queued");
    setStep(STEPS.length - 1);
  };

  const st = { agreed, setAgreed, uploads, removeUpload, addUpload, onFiles, fileRef, aiPhotos, addAiPhoto, onAiFiles, removeAiPhoto, aiFileRef, trans, setTrans, bgm, setBgm, letter, setLetter, titleSel, setTitleSel, transMap, setItemTrans, randomizeTrans, reorderUploads, totalMB, overLimit, link, shareUrl, videoStatus };

  const last = STEPS.length - 1;
  const previewStep = last - 1;
  const blocked = (step === 0 && !agreed) || (step === 1 && (aiPhotos.length === 0 || aiUploadingNow)) || (step === 2 && (overLimit || uploadingNow)) || (step === previewStep && (submitting || uploadingNow));

  // 라이브에서 토큰이 유효하지 않거나 만료된 경우 — 안내 화면.
  if (link.ok === false || link.status === "expired") {
    return (
      <div className="flex items-start justify-center px-6 py-10" style={{ background: BG, minHeight: "calc(100vh - 44px)" }}>
        <div className="w-full" style={{ maxWidth: 390 }}>
          <div className="flex flex-col items-center px-6 py-10 text-center" style={{ background: SURFACE, border: "1px solid " + LINE, borderRadius: 18 }}>
            <Logo height={30} />
            <h2 className="mt-5 text-[16px] font-bold" style={{ color: INK }}>
              {link.status === "expired" ? "만료된 링크입니다" : "링크를 확인할 수 없습니다"}
            </h2>
            <p className="mt-2 text-[12.5px] leading-relaxed" style={{ color: MUTE }}>
              {link.status === "expired"
                ? "퇴실 처리로 링크가 만료되었습니다. 빈소에 문의해 주세요."
                : "주소가 올바른지 확인해 주세요. 계속 문제가 있으면 빈소에 문의해 주세요."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start justify-center px-6 py-10" style={{ background: BG, minHeight: "calc(100vh - 44px)" }}>
      <div className="w-full" style={{ maxWidth: 390 }}>
        {/* 모바일 프레임 */}
        <div className="overflow-hidden" style={{ background: SURFACE, border: "1px solid " + LINE, borderRadius: 18, boxShadow: "0 10px 30px rgba(42,38,34,.10)" }}>
          {/* 헤더 */}
          <div className="flex flex-col items-center px-5 py-5 text-center" style={{ background: "#faf7f1", borderBottom: "1px solid " + LINE }}>
            <Logo height={30} />
            <div className="mt-2.5 text-[14px] font-bold" style={{ color: INK }}>
              {link.petName ? <><span style={{ fontFamily: SERIF }}>{link.petName}</span> 추모영상 제작</> : "추모영상 제작"}
            </div>
            {link.partnerName && <div className="mt-0.5 text-[11px]" style={{ color: MUTE }}>{link.partnerName}</div>}
            <div className="mt-0.5 text-[11px]" style={{ color: FAINT }}>{step + 1} / {STEPS.length} · {STEPS[step]}</div>
          </div>
          <Stepper step={step} />
          <div className="px-5 py-5" style={{ minHeight: 360 }}><StepBody step={step} st={st} /></div>
          {/* 하단 네비 */}
          <div className="flex items-center justify-between gap-2 px-5 py-4" style={{ borderTop: "1px solid " + LINE }}>
            <button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}
              className="flex items-center gap-1 px-3 py-2 text-[13px] font-semibold disabled:opacity-40"
              style={{ color: MUTE }}>
              <ChevronLeft className="h-4 w-4" /> 이전
            </button>
            {step < last ? (
              <button onClick={() => { if (blocked) return; if (step === previewStep) doSubmit(); else setStep((s) => Math.min(last, s + 1)); }} disabled={blocked}
                className="flex items-center gap-1 px-5 py-2 text-[13px] font-bold text-white disabled:opacity-40"
                style={{ background: GOLD, borderRadius: RADIUS }}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {step === 0 ? "동의하고 시작" : step === previewStep ? (submitting ? "제출 중…" : "영상 만들기") : "다음"}
                {!submitting && <ChevronRight className="h-4 w-4" />}
              </button>
            ) : (
              <button onClick={() => { if (liveMode) return; setStep(0); }} className="px-5 py-2 text-[13px] font-bold disabled:opacity-40" disabled={liveMode} style={{ color: GOLD }}>
                {liveMode ? "제출 완료" : "처음으로"}
              </button>
            )}
          </div>
        </div>
        <p className="mt-4 text-center text-[11px] leading-relaxed" style={{ color: FAINT }}>
          유저 주체 = <b>보호자 직접 제작</b> · {liveMode ? "라이브(백엔드 연결)" : BACKEND_LIVE ? "토큰 없음(데모 표시)" : "데모 모드 — .env 연결 시 실업로드·제출"}
        </p>
      </div>
    </div>
  );
}
