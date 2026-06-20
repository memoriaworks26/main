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

export function StepBody({ step, st }) {
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
        <div className="space-y-4 text-[12.5px] leading-relaxed" style={{ color: MUTE }}>
          {/* 1. 정보보호(개인정보) 수집·이용 — 필수 */}
          <div>
            <div className="px-4 py-3" style={{ background: "#f6f3ec", borderRadius: RADIUS, border: "1px solid " + LINE }}>
              <div className="mb-1.5 flex items-center gap-1.5 font-bold" style={{ color: INK }}>
                개인정보 수집·이용 동의 <span className="px-1.5 py-[1px] text-[10px] font-bold" style={{ background: GOLD_D, color: "#fff", borderRadius: 3 }}>필수</span>
                <button onClick={st.openPolicy} className="ml-auto text-[11.5px] font-semibold underline outline-none" style={{ color: GOLD_D }}>전문 보기</button>
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
              <div className="mb-1.5 flex items-center gap-1.5 font-bold" style={{ color: INK }}>
                마케팅·홍보 활용 동의 <span className="px-1.5 py-[1px] text-[10px] font-bold" style={{ background: "#eceef0", color: "#5a6470", borderRadius: 3 }}>선택</span>
              </div>
              <div style={{ whiteSpace: "pre-line" }}>{st.company?.consentMarketing}</div>
              <p className="mt-2" style={{ color: FAINT }}>※ 선택 항목으로, 동의하지 않아도 추모영상 제작·이용에는 영향이 없습니다.</p>
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

        {/* 반려동물 이름 — 타이틀(영정) 자막에 그대로 들어감 */}
        <div className="mb-4">
          <label className="block">
            <span className="mb-1 block text-[12.5px] font-bold" style={{ color: INK }}>반려동물 이름 <span style={{ color: GOLD_D }}>*</span></span>
            <input value={st.petName} onChange={(e) => st.setPetName(e.target.value)} placeholder="예: 콩이" maxLength={20}
              className="w-full px-3 text-[15px] outline-none"
              style={{ height: 44, background: SURFACE, border: "1.5px solid " + (st.petName.trim() ? LINE : GOLD), borderRadius: RADIUS, color: INK, fontFamily: SERIF, fontWeight: 700 }} />
          </label>
          <p className="mt-1 text-[11px]" style={{ color: FAINT }}>타이틀(영정) 자막에 그대로 표시됩니다.</p>
        </div>

        {/* 가이드 — 상단(3장 전체에 적용) */}
        <PhotoExampleGuide />
        <div className="mb-3 px-3 py-2 text-[11px] leading-relaxed" style={{ background: "#f6f3ec", border: "1px solid " + LINE, borderRadius: RADIUS, color: MUTE }}>
          💡 <b style={{ color: INK }}>잘 나온 독사진</b>일수록 결과가 좋아요 — 아이만 또렷하게, 얼굴이 정면. (추억 슬라이드용 사진·영상은 다음 ‘소스 업로드’ 단계)
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
                    <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(0,0,0,.35)" }}><Loader2 className="h-5 w-5 animate-spin text-white" /></div>
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
          타이틀 1장 → 영정 타이틀 · 나머지 2장 → AI 추억 영상.
        </p>
        <p className="mt-1.5 text-[10.5px] leading-relaxed" style={{ color: FAINT }}>
          ※ 사진만 올릴 수 있어요 (영상은 업로드 불가).
        </p>
        <p className="mt-1 text-[10.5px] leading-relaxed" style={{ color: FAINT }}>
          ※ AI 변환 영상과 이미지는 원본의 생김새와 다를 수 있습니다.
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
        {/* 상단 — 우리 처음 만난 날 · 무지개다리 건넌 날. 편지 마지막에 크게 들어갑니다. */}
        <div className="mb-3 grid grid-cols-2 gap-2">
          <DateField label="우리 처음 만난 날" value={st.metDate} onChange={st.setMetDate} />
          <DateField label="무지개다리 건넌 날" value={st.partDate} onChange={st.setPartDate} />
        </div>
        <textarea value={st.letter} onChange={(e) => st.setLetter(e.target.value)} rows={7} maxLength={300}
          placeholder={"받는이 (예: 내 사랑 몽이에게)\n\n전하고 싶은 마음을 적어주세요.\n\n글쓴이 (예: 엄마가)"}
          className="w-full resize-none p-3 text-[13px] leading-relaxed outline-none"
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
        <div className="mt-3 text-center" style={{ fontFamily: SERIF, fontSize: 18, fontWeight: 700, color: INK }}>{st.petName || st.link.petName || "콩이"}</div>
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
