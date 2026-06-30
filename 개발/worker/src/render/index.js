// ─────────────────────────────────────────────────────────────
// 렌더 파이프라인 — 보호자 업로드 → Higgsfield(타이틀 Soul + 추억영상 DoP) → FFmpeg 합성 → memoria-final 업로드.
//   AI=Higgsfield 단일(OpenAI 불필요). 합성=ffmpeg-static. 한글 자막=assets/NotoSansKR-Regular.otf.
//   ※ 실제 AI 생성엔 Higgsfield 크레딧 필요(없으면 generate*가 403 → 작업 failed로 재시도/표시).
//   v1 순서: 타이틀①②(Soul) → 추억 사진 슬라이드 → 추억영상(DoP) → 편지 장면. (템플릿 blocks 순서 반영=후속)
// ─────────────────────────────────────────────────────────────
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { loadConfig } from "../config.js";
import { log } from "../log.js";
import { db } from "../supabase.js";
import * as st from "../storage.js";
import { compose, makeSolid, makeTitleVideo, makeSlideshow, letterScrollSegment } from "./ffmpeg.js";

const cfg = loadConfig();
const ASSETS = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../assets");
const FONT = path.join(ASSETS, "NotoSansKR-Regular.otf"); // 기본(캡션·편지·자막 폴백)
// 자막 폰트 key→파일 — 앱 data/editor.js SUBTITLE_FONTS와 동일 key. 파일 없으면 burnSubtitles가 FONT로 폴백.
const SUB_FONTS = {
  myeongjo: path.join(ASSETS, "NanumMyeongjo-Regular.ttf"),
  gothic: path.join(ASSETS, "NotoSansKR-Regular.otf"),
  pen: path.join(ASSETS, "NanumPenScript-Regular.ttf"),
};

// 완성본 서명URL 만료 — 예약 종료일(end_date) 자정(KST)까지. 보호자 링크(submissions.expires_at)와 동일 시점으로 묶임.
//   end_date 없으면 기본값, 임박/과거(재렌더 등)면 최소 floor로 보정해 즉시 만료 방지.
const MIN_EXPIRY_SEC = Number(process.env.VIDEO_MIN_EXPIRY_SEC) || 60 * 60 * 24 * 3;        // 최소 3일(검수·발인 당일 여유)
const DEFAULT_EXPIRY_SEC = Number(process.env.VIDEO_DEFAULT_EXPIRY_SEC) || 60 * 60 * 24 * 30; // end_date 없을 때 30일
function expiryFor(endDate) {
  const now = Date.now();
  let sec = DEFAULT_EXPIRY_SEC;
  if (endDate) {
    const target = new Date(`${endDate}T23:59:59+09:00`).getTime(); // 종료일 자정(KST)
    if (!Number.isNaN(target)) sec = Math.floor((target - now) / 1000);
  }
  if (sec < MIN_EXPIRY_SEC) sec = MIN_EXPIRY_SEC;
  return { sec, at: new Date(now + sec * 1000).toISOString() };
}

// ── 2단계: 최종 합성 ──────────────────────────────────────────────
// 저장된 블록 결과물(타이틀 Seedream·AI영상 Kling) + 보호자 소스(슬라이드·영상·편지)를 템플릿 순서로 합성.
//   순서: 타이틀①② → AI영상 A → 추억 슬라이드(사진) → 추억 영상(개별) → AI영상 B → 편지(+날짜)
const bySort = (p, q) => (p.sort_order ?? 0) - (q.sort_order ?? 0);
const fmtDate = (d) => (d ? String(d) : "");
const CLIP_PHOTO_DUR = 6; // 콘텐츠 허브 '이미지' 클립 노출 시간(초)

// 템플릿 blocks([{type, assetId?}]) → 렌더 플랜([{kind,i?,assetId?,fade?}]). 편집본(edit_doc.render.plan)이 없을 때 폴백용.
//   앱의 buildRenderPlan과 동일 매핑(편집값 없는 자연 순서). clip은 assetId가 있을 때만 포함.
function planFromBlocks(blocks) {
  let aiN = 0;
  return (blocks || []).map((b, idx) => {
    const fade = idx > 0;
    if (b.type === "title") return { kind: "title" };
    if (b.type === "ai") return { kind: "ai", i: aiN++, fade };
    if (b.type === "slide") return { kind: "slide", fade };
    if (b.type === "video") return { kind: "video", fade };
    if (b.type === "letter") return { kind: "letter", fade };
    if (b.type === "clip" && b.assetId) return { kind: "clip", assetId: b.assetId, fade };
    return null;
  }).filter(Boolean);
}
export async function composeFinal(job, assets) {
  if (cfg.stub) return { videoUrl: `stub://${job.id}`, finalPath: `stub/${job.id}.mp4`, finalMB: 0, expiresAt: null };
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "mw-compose-"));
  try {
    const name = job.pet_name || "";
    // 활성(selected) 버전만 사용(버전 히스토리 중 선택본). slide_photo/memory_video는 selected 무관(모두 사용).
    const pick = (role) => assets.filter((a) => a.role === role && a.storage_path && a.selected !== false).sort(bySort);
    const titleVid = pick("title_video")[0];        // 완성 타이틀 클립(우선)
    const titleRes = pick("title_result");          // 영정 이미지(1장; 구버전은 2장)
    const aiRes = pick("ai_video_result");          // 영상 A·B
    let slideVid = pick("slide_video")[0];          // 사전 합성된 슬라이드 영상(자동생성/「사진으로 만들기」 결과) — 있으면 우선
    const slidePhotos = pick("slide_photo");
    // 사전 합성본보다 슬라이드 사진이 더 최신(추가·교체 후 미재생성)이면 사전본 무시 → emitSlides가 현재 사진으로 재합성.
    if (slideVid && slidePhotos.some((p) => String(p.created_at || "") > String(slideVid.created_at || ""))) {
      log.info("  슬라이드 사진이 사전 합성본보다 최신 — 사전본 무시하고 현재 사진으로 재합성");
      slideVid = null;
    }
    const memVideos = pick("memory_video");
    // 슬라이드 사진 사이 전환 — 보호자가 위저드에서 고른 것(transition_map = 사진순 xfade명 배열). 없으면 fade.
    const slideXfades = Array.isArray(job.transition_map) ? job.transition_map : [];
    const sign = (a) => st.signedUrl(cfg.uploadBucket, a.storage_path, 3600);
    const dl = async (a, fn) => st.downloadTo(await sign(a), path.join(dir, fn));

    // 파트너·템플릿 — 폴백 실행순서(템플릿 blocks)·BGM·만료에 쓰임. 세그먼트 생성 전에 미리 조회.
    let partnerId = null, endDate = null, tpl = null;
    if (job.reservation_id) {
      const { data: r } = await db.from("reservations").select("partner_id, end_date").eq("id", job.reservation_id).maybeSingle();
      partnerId = r?.partner_id || null; endDate = r?.end_date || null;
    }
    if (partnerId) {
      const { data: t } = await db.from("templates").select("blocks, bgm_id, bgm_volume, bgm_fade_in, bgm_fade_out").eq("partner_id", partnerId).maybeSingle();
      tpl = t || null;
    }

    // 편집기 편집본(없으면 템플릿 blocks 순서로 폴백). render.plan = [{kind,i?,assetId?,fade?}], letter/subs/slideDur/memVol 오버라이드.
    const render = job.edit_doc?.render || null;
    const SLIDE_DUR = Number(render?.slideDur) || 7;   // 슬라이드 장당(초) — 기본 7(편집기 라벨 7~10초와 정합)
    const letterText = (render?.letter && render.letter.text != null) ? render.letter.text : job.letter;
    const metDate = render?.letter?.metDate ?? job.met_date;
    const partDate = render?.letter?.partDate ?? job.part_date;

    const segs = [];
    // 타이틀 — 완성 클립(title_video) 우선, 없으면 영정 이미지로 영상화(1장 기본·구버전 2장 호환), 없으면 텍스트.
    async function emitTitle() {
      if (titleVid) { await dl(titleVid, "title.mp4"); segs.push({ type: "video", path: path.join(dir, "title.mp4") }); return; }
      if (titleRes.length >= 1) {
        await dl(titleRes[0], "t0.png");
        let t1 = null;
        if (titleRes[1]) { await dl(titleRes[1], "t1.png"); t1 = path.join(dir, "t1.png"); } // 구버전(영정+화풍변경 2장) 호환
        const tv = path.join(dir, "title.mp4");
        await makeTitleVideo(path.join(dir, "t0.png"), t1, `사랑하는 ${name}`, FONT, tv);
        segs.push({ type: "video", path: tv }); return;
      }
      const bg = await makeSolid("0x161310", path.join(dir, "tbg.png")); segs.push({ type: "image", path: bg, dur: 6, caption: `사랑하는 ${name}` });
    }
    // AI영상(i=0 A, 1 B) — 해당 결과물 있으면.
    async function emitAi(i, fade) { if (aiRes[i]) { const fn = `ai${i}.mp4`; await dl(aiRes[i], fn); segs.push({ type: "video", path: path.join(dir, fn), fade }); } }
    // 추억 슬라이드(사진) — 사전 합성된 slide_video 있으면 그대로, 없으면 사진+전환으로 슬라이드쇼 합성(한 클립).
    async function emitSlides(fade) {
      if (slideVid) { await dl(slideVid, "slidevid.mp4"); segs.push({ type: "video", path: path.join(dir, "slidevid.mp4"), fade }); return; }
      if (!slidePhotos.length) return;
      const items = [];
      for (let i = 0; i < slidePhotos.length; i++) { await dl(slidePhotos[i], `s${i}.img`); items.push({ path: path.join(dir, `s${i}.img`), dur: SLIDE_DUR, xfade: slideXfades[i] || "fade" }); }
      const ss = path.join(dir, "slides.mp4");
      await makeSlideshow(items, ss);
      segs.push({ type: "video", path: ss, fade });
    }
    // 추억 영상(개별 클립) — 원본 사운드 유지(mem). 첫 클립만 경계 페이드.
    async function emitMemVideos(fade) { for (let i = 0; i < memVideos.length; i++) { await dl(memVideos[i], `m${i}.mp4`); segs.push({ type: "video", path: path.join(dir, `m${i}.mp4`), mem: true, fade: fade && i === 0 }); } }
    // 편지(아래→위 스크롤) + 날짜 카드.
    async function emitLetter(fade) {
      if (letterText) { const lv = path.join(dir, "letter.mp4"); await letterScrollSegment(letterText, FONT, lv); segs.push({ type: "video", path: lv, fade }); }
      if (metDate || partDate) {
        const bg = await makeSolid("0x161310", path.join(dir, "dbg.png"));
        const cap = [metDate ? `우리 처음 만난 날\n${fmtDate(metDate)}` : "", partDate ? `무지개다리 건넌 날\n${fmtDate(partDate)}` : ""].filter(Boolean).join("\n\n");
        segs.push({ type: "image", path: bg, dur: 6, caption: cap, letter: true });
      }
    }
    // 콘텐츠 허브 클립(영상/이미지) — 템플릿에서 지정한 자산을 id로 조회·다운로드해 합성. 자산 미지정/유실이면 조용히 생략.
    async function emitClip(assetId, fade) {
      if (!assetId) return;
      const { data: a } = await db.from("content_assets").select("kind, storage_path").eq("id", assetId).maybeSingle();
      if (!a?.storage_path) { log.warn(`  클립 자산 없음/미지정(assetId=${assetId}) — 생략`); return; }
      const isPhoto = a.kind === "photo";
      const fn = isPhoto ? `clip_${assetId}.img` : `clip_${assetId}.mp4`;
      try { await st.downloadTo(await st.signedUrl("memoria-content", a.storage_path, 3600), path.join(dir, fn)); }
      catch (e) { log.warn(`  클립 다운로드 실패(${assetId}): ${e.message} — 생략`); return; }
      if (isPhoto) segs.push({ type: "image", path: path.join(dir, fn), dur: CLIP_PHOTO_DUR, fade });
      else segs.push({ type: "video", path: path.join(dir, fn), fade });
    }

    // 실행 플랜 — 편집본(render.plan) 우선, 없으면 템플릿 blocks의 자연 순서(클립 포함). 둘 다 없으면(파트너 미상 등) 고정 폴백.
    const runPlan = render?.plan?.length ? render.plan : (tpl?.blocks?.length ? planFromBlocks(tpl.blocks) : null);
    if (runPlan) {
      for (const p of runPlan) {
        if (p.kind === "title") await emitTitle();
        else if (p.kind === "ai") await emitAi(p.i ?? 0, !!p.fade);
        else if (p.kind === "slide") await emitSlides(!!p.fade);
        else if (p.kind === "video") await emitMemVideos(!!p.fade);
        else if (p.kind === "letter") await emitLetter(!!p.fade);
        else if (p.kind === "clip") await emitClip(p.assetId, !!p.fade);
      }
    } else {
      // 템플릿조차 없을 때 — 기존 고정 순서: 타이틀 → AI A → 슬라이드 → 추억영상 → AI B → 편지
      await emitTitle(); await emitAi(0); await emitSlides(); await emitMemVideos(); await emitAi(1); await emitLetter();
    }
    if (!segs.length) throw new Error("합성할 세그먼트 없음(블록 결과물·소스 부재)");

    // BGM — 보호자가 위저드에서 고른 곡(submissions.bgm_id) 우선, 없거나 미해결이면 파트너 템플릿 기본곡으로 폴백.
    //   볼륨·페이드는 곡과 무관한 파트너 믹싱 설정이라 항상 템플릿 값(없으면 기본). (partnerId·tpl은 위에서 조회)
    let bgmPath = null;
    const bgmVol = tpl?.bgm_volume ?? 70, bgmFadeIn = Number(tpl?.bgm_fade_in ?? 1), bgmFadeOut = Number(tpl?.bgm_fade_out ?? 2), tplBgmId = tpl?.bgm_id || null;
    // 후보 우선순위: 보호자 선택(job.bgm_id) → 템플릿 기본(tplBgmId). 첫 '유효 음원'에서 멈춤(팬텀/구 id는 자동 스킵).
    for (const id of [...new Set([job.bgm_id, tplBgmId].filter(Boolean))]) {
      const { data: bgm } = await db.from("bgm").select("storage_path").eq("id", id).maybeSingle();
      if (!bgm?.storage_path) continue; // 해당 id에 음원 없음 → 다음 후보로
      try {
        bgmPath = path.join(dir, "bgm.mp3");
        await st.downloadTo(await st.signedUrl("memoria-content", bgm.storage_path, 3600), bgmPath);
        log.info(`  BGM 적용(vol ${bgmVol}, ${id === job.bgm_id ? "보호자선택" : "템플릿기본"}) → ${bgm.storage_path}`);
      } catch (e) { bgmPath = null; log.warn("  BGM 다운로드 실패(무음 진행): " + e.message); }
      break; // 유효 음원을 찾았으면(다운로드 성공/실패 무관) 폴백하지 않음
    }

    const out = path.join(dir, "final.mp4");
    await compose({ segments: segs, fontFile: FONT, subFonts: SUB_FONTS, bgmPath, bgmVol, bgmFadeIn, bgmFadeOut, subs: render?.subs || null, memVol: render?.memVol ?? 100, outPath: out });
    const finalPath = `${partnerId || "unknown"}/${job.id}_final.mp4`;
    const { size } = await fs.stat(out);                 // RAM에 통째로 안 올림 — 크기는 stat으로
    await st.uploadFinalStream(finalPath, out, "video/mp4"); // 디스크→스트림 PUT(긴 영상 OOM 방지)
    const finalMB = +(size / (1024 * 1024)).toFixed(1);
    const exp = expiryFor(endDate);
    const videoUrl = await st.signedUrl(cfg.finalBucket, finalPath, exp.sec);
    log.info(`  합성 완료 job=${job.id} segs=${segs.length} ${finalMB}MB exp=${exp.at} → ${finalPath}`);
    return { videoUrl, finalPath, finalMB, expiresAt: exp.at };
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}
