// ─────────────────────────────────────────────────────────────
// 블록 생성(2단계 中 1단계) — 보호자 독사진 → 타이틀(Seedream i2i) + AI영상(Kling i2v).
//   결과를 memoria-uploads/{token}/results/ 에 저장 + submission_assets(role=*_result) 적재.
//   전체 합성은 안 함(관리자 「최종 렌더」에서 compose). 편집기는 이 결과물을 블록별로 표시.
// ─────────────────────────────────────────────────────────────
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { db } from "../supabase.js";
import * as st from "../storage.js";
import { loadConfig } from "../config.js";
import { log } from "../log.js";
import { generateTitleImage, generateMemoryVideo } from "./higgsfield.js";
import { makeTitleVideo, makeSlideshow, faststartRemux } from "./ffmpeg.js";

const SLIDE_DUR_DEF = 7; // 슬라이드 미리보기 장당(초) — 최종 합성(index.js)과 정합

const FONT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../assets/NotoSansKR-Regular.otf");

const cfg = loadConfig();
// 타이틀 2장: ① 독사진 → 영정 사진(추모 액자·카드 구도, 영정 배경 스톡을 액자 뒤 배경으로), ② ①을 화풍·배경 변경(오버랩용). 선택 프롬프트 텍스트 반영.
//   ① 핵심: 단순 배경·톤 변경이 아니라, 사진을 추모 액자/카드에 담고 뒤에 영정 배경 요소를 둔 "영정 사진" 구도.
const titlePrompt1 = (name, style, hasBg) => hasBg
  ? `첫 번째 사진 속 ${name} 반려동물의 얼굴과 생김새를 그대로 살려 만든 영정 사진. 사진을 품위 있는 추모 액자(또는 추모 카드)에 담고, 두 번째 사진을 액자 뒤 은은한 추모 배경으로 둔 추모 제단 구도${style ? ", " + style : ""}. 또렷하고 평온한 표정, 따뜻하고 격조 있는 추모 분위기, 가로 16:9 구도`
  : `${name} 반려동물의 영정 사진, 또렷한 얼굴. 사진을 품위 있는 추모 액자(또는 추모 카드)에 담고, 액자를 받치는 받침과 뒤쪽 은은한 추모 배경${style ? ", " + style : ", 부드러운 미색 배경과 따뜻한 빛, 작은 꽃 장식"}, 가로 16:9 구도. 평온하고 격조 있는 추모 분위기`;
const titlePrompt2 = (name, style) => `${name} 추모 초상을 다른 화풍·배경으로 재해석, 예술적 기법 변경${style ? ", " + style : ", 전통 한지 질감과 절제된 먹색"}, 은은하고 평온한 분위기`;
const STOCK_BG = "stock/jeongi_bg.png"; // memoria-content — 영정 배경 스톡
const aiPromptDefault = "잔잔하고 따뜻한 추억의 흐름, 부드럽고 느린 카메라 무빙, 평온하고 따뜻한 분위기";

// 타깃별 선택(활성) 프롬프트 — { body, refImage }. 텍스트+참고이미지 함께 생성에 사용. 없으면 null.
async function activePrompt(target) {
  const { data } = await db.from("ai_prompts").select("body, ref_image").eq("target", target).eq("active", true).limit(1).maybeSingle();
  return data ? { body: data.body || null, refImage: data.ref_image || null } : null;
}

// 보호자 원본 영상 정규화 — faststart 리먹스(무손실, 재인코딩 X)로 편집기 미리보기 즉시 재생.
//   이미 정규화된(/norm/) 건 건너뜀(멱등). 실패(코덱 비호환 등)해도 best-effort로 원본 유지(최종 compose에서 어차피 재인코딩).
//   다운로드·업로드 모두 스트리밍 → 30분 원본도 RAM에 통째 안 올림(OOM 없음).
async function normalizeMemoryVideos(job, assets) {
  const vids = (assets || []).filter((a) => a.role === "memory_video" && a.kind === "video" && a.storage_path && !a.storage_path.includes("/norm/"));
  if (!vids.length) return 0;
  let n = 0;
  for (const a of vids) {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "mw-norm-"));
    try {
      const ext = (a.storage_path.split(".").pop() || "mp4").toLowerCase();
      const src = path.join(dir, `in.${ext}`), out = path.join(dir, "out.mp4");
      await st.downloadTo(await st.signedUrl(cfg.uploadBucket, a.storage_path, 3600), src);
      await faststartRemux(src, out);
      const np = `${job.token}/norm/${crypto.randomUUID().slice(0, 8)}.mp4`;
      await st.uploadStream(cfg.uploadBucket, np, out, "video/mp4");
      await db.from("submission_assets").update({ storage_path: np }).eq("id", a.id);
      n++; log.info(`  추억영상 faststart 정규화 → ${np}`);
    } catch (e) {
      log.warn(`  추억영상 정규화 건너뜀(${a.id}): ${e.message}`);
    } finally { await fs.rm(dir, { recursive: true, force: true }); }
  }
  return n;
}

// ── per-job 생성 컨텍스트 — 소스 선택·헬퍼·활성(기본) 프롬프트를 모아 제너레이터들이 공유. ──
async function buildCtx(job, assets) {
  const token = job.token;
  const name = job.pet_name || "";
  const photos = assets.filter((a) => a.kind === "photo" && a.storage_path);
  const _bySort = (p, q) => (p.sort_order ?? 0) - (q.sort_order ?? 0);
  // 소스도 버전 히스토리 — 활성(selected) 본을 사용. 슬롯당 하나.
  const titleA = photos.filter((a) => a.role === "title" && a.selected).sort(_bySort)[0] || photos.find((a) => a.role === "title") || photos[0];
  const aiSel = photos.filter((a) => a.role === "ai_video" && a.selected).sort(_bySort);
  const aiPhotos = aiSel.length ? aiSel : photos.filter((a) => a.role === "ai_video").sort(_bySort);
  // 추억 슬라이드 사진(보호자) — sort 순. 전환효과는 보호자가 위저드에서 고른 것(transition_map = 사진순 xfade명 배열).
  const slidePhotos = photos.filter((a) => a.role === "slide_photo").sort(_bySort);
  const slideXfades = Array.isArray(job.transition_map) ? job.transition_map : [];
  const sign = (a) => st.safeImageUrl(cfg.uploadBucket, a.storage_path, 3600); // B: 힉스필드 안전 포맷(jpg/png) 보장
  const ins = (row) => db.from("submission_assets").insert(row);
  // 버전 히스토리 — 삭제 대신 기존 비활성(selected=false) + 새 버전 활성 삽입. 기존본도 나중에 선택 가능.
  const deselect = (role, sort) => { let q = db.from("submission_assets").update({ selected: false }).eq("submission_id", job.id).eq("role", role); if (sort != null) q = q.eq("sort_order", sort); return q; };
  const uniq = () => crypto.randomUUID().slice(0, 8);
  // 활성(selected) 슬롯 자산 경로(최신)
  const curTitleImg = async (sort) => { const { data } = await db.from("submission_assets").select("storage_path").eq("submission_id", job.id).eq("role", "title_result").eq("sort_order", sort).eq("selected", true).order("created_at", { ascending: false }).limit(1).maybeSingle(); return data?.storage_path || null; };
  // 프롬프트 참고이미지(memoria-content) 서명URL — 없으면 null.
  const pRef = async (p) => { if (!p?.refImage) return null; try { return await st.safeImageUrl("memoria-content", p.refImage, 3600); } catch { return null; } };
  // 타깃별 활성(기본) 프롬프트 — 생성에 사용.
  const titleStyle1 = await activePrompt("이미지1");
  const titleStyle2 = await activePrompt("이미지2");
  // AI영상은 A(앞)·B(뒤) 각각 별도 프롬프트. 구버전 단일 'AI영상'은 폴백으로 둘 다에 적용.
  const aiStyleA = await activePrompt("AI영상 A");
  const aiStyleB = await activePrompt("AI영상 B");
  const aiStyleLegacy = await activePrompt("AI영상");
  return { job, token, name, titleA, aiPhotos, slidePhotos, slideXfades, sign, ins, deselect, uniq, curTitleImg, pRef, titleStyle1, titleStyle2, aiStyleA, aiStyleB, aiStyleLegacy };
}

// 타이틀 이미지1(Seedream): 독사진 + 영정배경 + (선택)프롬프트 참고이미지 + 텍스트. 새 버전 활성.
async function genTitleImg0(ctx) {
  const { job, token, name, titleA, sign, ins, deselect, uniq, pRef, titleStyle1 } = ctx;
  if (!titleA) return 0;
  const ref = await sign(titleA);
  let bg = null;
  try { bg = await st.safeImageUrl("memoria-content", STOCK_BG, 3600); } catch { bg = null; } // 영정 배경 스톡(없으면 생략)
  const pref = await pRef(titleStyle1);
  const refs = [ref, bg, pref].filter(Boolean);
  const url1 = await generateTitleImage({ prompt: titlePrompt1(name, titleStyle1?.body, !!bg), imageRefUrls: refs });
  const p = `${token}/results/title_0_${uniq()}.png`;
  await deselect("title_result", 0); await st.uploadFromUrl(cfg.uploadBucket, p, url1, "image/png");
  await ins({ submission_id: job.id, kind: "photo", role: "title_result", name: "이미지1", storage_path: p, sort_order: 0, selected: true });
  log.info("  타이틀 이미지1 생성(Seedream) +버전"); return 1;
}
// 타이틀 이미지2(Seedream): 활성 이미지1 → 화풍·배경 변경(오버랩용)
async function genTitleImg1(ctx) {
  const { job, token, name, ins, deselect, uniq, curTitleImg, pRef, titleStyle2 } = ctx;
  const p0 = await curTitleImg(0); if (!p0) throw new Error("이미지1을 먼저 생성하세요");
  const ref = await st.safeImageUrl(cfg.uploadBucket, p0, 3600);
  const pref = await pRef(titleStyle2);
  const url2 = await generateTitleImage({ prompt: titlePrompt2(name, titleStyle2?.body), imageRefUrls: [ref, pref].filter(Boolean) });
  const p = `${token}/results/title_1_${uniq()}.png`;
  await deselect("title_result", 1); await st.uploadFromUrl(cfg.uploadBucket, p, url2, "image/png");
  await ins({ submission_id: job.id, kind: "photo", role: "title_result", name: "이미지2", storage_path: p, sort_order: 1, selected: true });
  log.info("  타이틀 이미지2 생성(Seedream, 화풍변경) +버전"); return 1;
}
// 타이틀 영상화(ffmpeg): 영정(이미지1) → 화풍변경(이미지2) 크로스페이드 완성 클립(20초, 크레딧 없음).
//   화풍변경(이미지2)이 없으면 영정 1장(18초)으로 폴백 — 화풍변경 생성 실패에도 타이틀은 나옴.
async function genTitleVideo(ctx) {
  const { job, token, name, ins, deselect, uniq, curTitleImg } = ctx;
  const a0 = await curTitleImg(0);
  if (!a0) throw new Error("이미지1(영정)을 먼저 생성하세요");
  const a1 = await curTitleImg(1); // 화풍변경(있으면 영정→화풍 오버랩, 없으면 영정 1장)
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "mw-title-"));
  try {
    await st.downloadTo(await st.signedUrl(cfg.uploadBucket, a0, 3600), path.join(dir, "t0.png"));
    let t1 = null;
    if (a1) { await st.downloadTo(await st.signedUrl(cfg.uploadBucket, a1, 3600), path.join(dir, "t1.png")); t1 = path.join(dir, "t1.png"); }
    const tv = path.join(dir, "title.mp4");
    await makeTitleVideo(path.join(dir, "t0.png"), t1, `사랑하는 ${name}`, FONT, tv);
    const vp = `${token}/results/title_${uniq()}.mp4`;                    // 버전 누적(고유 경로)
    await deselect("title_video"); await st.uploadTo(cfg.uploadBucket, vp, await fs.readFile(tv), "video/mp4");
    await ins({ submission_id: job.id, kind: "video", role: "title_video", name: "타이틀 영상", storage_path: vp, sort_order: 0, selected: true });
    log.info(`  타이틀 영상화(ffmpeg, ${t1 ? "영정→화풍변경 2장" : "영정 1장"}) +버전`);
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
  return 0;
}
// 타이틀 일괄 — 영정(이미지1) → 화풍변경(이미지2) → 영상화. 화풍변경 실패해도 영정만으로 영상화 진행.
async function genTitleAll(ctx) {
  let c = await genTitleImg0(ctx);
  try { c += await genTitleImg1(ctx); } catch (e) { log.warn("  화풍변경(이미지2) 생성 실패 — 영정 1장으로 타이틀 진행: " + (e.message || e)); }
  await genTitleVideo(ctx);
  return c;
}

// 추억 슬라이드 영상(ffmpeg, 크레딧 없음) — 보호자 사진 N장 + 사이 전환을 한 클립으로. 「사진으로 만들기」/최종합성 공용.
async function genSlides(ctx) {
  const { job, token, slidePhotos, slideXfades, ins, deselect, uniq } = ctx;
  if (!slidePhotos.length) { log.info("  슬라이드 사진 없음 — 슬라이드 영상 생략"); return 0; }
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "mw-slides-"));
  try {
    const items = [];
    for (let i = 0; i < slidePhotos.length; i++) {
      const fn = path.join(dir, `s${i}.img`);
      await st.downloadTo(await st.signedUrl(cfg.uploadBucket, slidePhotos[i].storage_path, 3600), fn);
      items.push({ path: fn, dur: SLIDE_DUR_DEF, xfade: slideXfades[i] || "fade" });
    }
    const out = path.join(dir, "slides.mp4");
    await makeSlideshow(items, out);
    const vp = `${token}/results/slides_${uniq()}.mp4`;
    await deselect("slide_video", 0); await st.uploadTo(cfg.uploadBucket, vp, await fs.readFile(out), "video/mp4");
    await ins({ submission_id: job.id, kind: "video", role: "slide_video", name: "슬라이드 영상", storage_path: vp, sort_order: 0, selected: true });
    log.info(`  슬라이드 영상 합성(ffmpeg, ${slidePhotos.length}장) +버전`);
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
  return 1;
}
// AI영상 i번(Kling) — 해당 독사진 1장 → 영상. 새 버전 활성, 기존본은 히스토리로 보관.
async function genAi(ctx, i) {
  const { job, token, aiPhotos, sign, ins, deselect, uniq, aiStyleA, aiStyleB, aiStyleLegacy } = ctx;
  if (!aiPhotos[i]) return 0;
  const ref = await sign(aiPhotos[i]);
  // i=0 → 영상 A(앞), i=1 → 영상 B(뒤). 각 전용 프롬프트(없으면 구버전 단일→기본값 폴백).
  const style = (i === 0 ? aiStyleA : aiStyleB) || aiStyleLegacy;
  const vurl = await generateMemoryVideo({ prompt: style?.body || aiPromptDefault, imageUrl: ref });
  const vp = `${token}/results/ai_${i}_${uniq()}.mp4`;
  await deselect("ai_video_result", i);
  await st.uploadFromUrl(cfg.uploadBucket, vp, vurl, "video/mp4");
  await ins({ submission_id: job.id, kind: "video", role: "ai_video_result", name: `AI영상 ${String.fromCharCode(65 + i)}`, storage_path: vp, sort_order: i, selected: true });
  log.info(`  AI영상 ${String.fromCharCode(65 + i)} 생성(Kling) +버전`);
  return 1;
}

export async function generateBlocks(job, assets) {
  if (cfg.stub) {
    log.info(`  [stub] generate-blocks job=${job.id} target=${job.regen_target || "all"}`);
    return { count: 0 };
  }
  // 보호자 원본 영상 faststart 정규화(미리보기 즉시 재생) — skip_ai 여부·target과 무관하게 항상(멱등).
  await normalizeMemoryVideos(job, assets);
  // target: null=전체 / "title"(전체) / "title:0"(이미지1) / "title:1"(이미지2) / "title:video"(영상화) / "ai:i"
  const target = job.regen_target;
  if (job.skip_ai && !target) { log.info("  AI 변환 안함 — 블록 생성 생략"); return { count: 0 }; }
  const ctx = await buildCtx(job, assets);
  let count = 0;
  if (target === "title") count += await genTitleAll(ctx);
  else if (target === "title:0") count += await genTitleImg0(ctx);
  else if (target === "title:1") count += await genTitleImg1(ctx);
  else if (target === "title:video") await genTitleVideo(ctx);
  else if (target === "slides") count += await genSlides(ctx);
  else if (target && target.startsWith("ai:")) count += await genAi(ctx, Number(target.slice(3)));
  else {
    // 병렬 발사 — 타이틀체인(영정→영상화)과 AI영상 N개는 서로 독립이라 동시 진행.
    //   힉스필드 한 키 동시처리 실측 확인(4개 병렬 OK, 429 없음).
    //   ※ allSettled — 하나(예: Kling 1개)가 실패해도 나머지(타이틀·다른 AI영상)는 살린다(blocks_ready).
    //     전부 실패한 경우에만 throw → 작업 재시도/실패. (실패분은 편집기에서 개별 「AI 생성」으로 재시도)
    const settled = await Promise.allSettled([
      genTitleAll(ctx),
      ...ctx.aiPhotos.map((_, i) => genAi(ctx, i)),
    ]);
    settled.filter((r) => r.status === "rejected")
      .forEach((r) => log.error("  블록 일부 생성 실패: " + (r.reason?.message || r.reason)));
    const ok = settled.filter((r) => r.status === "fulfilled");
    if (!ok.length) throw (settled[0]?.reason || new Error("블록 생성 전부 실패"));
    count += ok.reduce((a, r) => a + (r.value || 0), 0);
  }
  return { count };
}
