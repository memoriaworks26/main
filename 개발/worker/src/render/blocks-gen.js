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
import { makeTitleVideo } from "./ffmpeg.js";

const FONT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../assets/NotoSansKR-Regular.otf");

const cfg = loadConfig();
// 타이틀 2장: ① 독사진 → 영정 초상(영정 배경 스톡 위에 합성), ② ①을 화풍·배경 변경(오버랩용). 선택 프롬프트 텍스트 반영.
const titlePrompt1 = (name, style, hasBg) => hasBg
  ? `첫 번째 사진의 ${name} 반려동물 얼굴을 그대로 살려, 두 번째 사진(영정 배경) 위에 자연스럽게 올린 영정 초상. 또렷한 얼굴, 따뜻하고 품위 있는 추모 분위기${style ? ", " + style : ""}, 고요하고 평온한 표정`
  : `${name} 반려동물 영정 초상, 또렷한 얼굴, 따뜻하고 품위 있는 추모 분위기${style ? ", " + style : ", 부드러운 황금빛 보케 배경"}, 고요하고 평온한 표정`;
const titlePrompt2 = (name, style) => `${name} 추모 초상을 다른 화풍·배경으로 재해석, 예술적 기법 변경${style ? ", " + style : ", 전통 한지 질감과 절제된 먹색"}, 은은하고 평온한 분위기`;
const STOCK_BG = "stock/jeongi_bg.png"; // memoria-content — 영정 배경 스톡
const aiPromptDefault = "잔잔하고 따뜻한 추억의 흐름, 부드럽고 느린 카메라 무빙, 평온하고 따뜻한 분위기";

// 타깃별 활성 프롬프트 body(ai_prompts). 없으면 null.
async function activePrompt(target) {
  const { data } = await db.from("ai_prompts").select("body").eq("target", target).eq("active", true).limit(1).maybeSingle();
  return data?.body || null;
}

export async function generateBlocks(job, assets) {
  if (cfg.stub) {
    log.info(`  [stub] generate-blocks job=${job.id} target=${job.regen_target || "all"}`);
    return { count: 0 };
  }
  const token = job.token;
  const name = job.pet_name || "";
  const photos = assets.filter((a) => a.kind === "photo" && a.storage_path);
  const titleA = photos.find((a) => a.role === "title") || photos[0];
  const aiPhotos = photos.filter((a) => a.role === "ai_video");
  const sign = (a) => st.signedUrl(cfg.uploadBucket, a.storage_path, 3600);
  const del = (role, sort) => { let q = db.from("submission_assets").delete().eq("submission_id", job.id).eq("role", role); if (sort != null) q = q.eq("sort_order", sort); return q; };
  const ins = (row) => db.from("submission_assets").insert(row);
  // 버전 히스토리 — 삭제 대신 기존 비활성(selected=false) + 새 버전 활성 삽입. 기존본도 나중에 선택 가능.
  const deselect = (role, sort) => { let q = db.from("submission_assets").update({ selected: false }).eq("submission_id", job.id).eq("role", role); if (sort != null) q = q.eq("sort_order", sort); return q; };
  const uniq = () => crypto.randomUUID().slice(0, 8);

  const titleStyle1 = await activePrompt("이미지1");  // 이미지1 전용 프롬프트
  const titleStyle2 = await activePrompt("이미지2");  // 이미지2 전용 프롬프트
  const aiStyle = await activePrompt("AI영상");
  // 활성(selected) 슬롯 자산 경로(최신)
  const curTitleImg = async (sort) => { const { data } = await db.from("submission_assets").select("storage_path").eq("submission_id", job.id).eq("role", "title_result").eq("sort_order", sort).eq("selected", true).order("created_at", { ascending: false }).limit(1).maybeSingle(); return data?.storage_path || null; };

  // 타이틀 이미지1(Seedream): 독사진 → 영정+배경. 새 버전 활성, 기존본은 히스토리로 보관.
  async function genTitleImg0() {
    if (!titleA) return 0;
    const ref = await sign(titleA);
    let bg = null;
    try { bg = await st.signedUrl("memoria-content", STOCK_BG, 3600); } catch { bg = null; } // 영정 배경 스톡(없으면 생략)
    const refs = bg ? [ref, bg] : [ref];
    const url1 = await generateTitleImage({ prompt: titlePrompt1(name, titleStyle1, !!bg), imageRefUrls: refs });
    const p = `${token}/results/title_0_${uniq()}.png`;
    await deselect("title_result", 0); await st.uploadFromUrl(cfg.uploadBucket, p, url1, "image/png");
    await ins({ submission_id: job.id, kind: "photo", role: "title_result", name: "이미지1", storage_path: p, sort_order: 0, selected: true });
    log.info("  타이틀 이미지1 생성(Seedream) +버전"); return 1;
  }
  // 타이틀 이미지2(Seedream): 활성 이미지1 → 화풍·배경 변경(오버랩용)
  async function genTitleImg1() {
    const p0 = await curTitleImg(0); if (!p0) throw new Error("이미지1을 먼저 생성하세요");
    const ref = await st.signedUrl(cfg.uploadBucket, p0, 3600);
    const url2 = await generateTitleImage({ prompt: titlePrompt2(name, titleStyle2), imageRefUrl: ref });
    const p = `${token}/results/title_1_${uniq()}.png`;
    await deselect("title_result", 1); await st.uploadFromUrl(cfg.uploadBucket, p, url2, "image/png");
    await ins({ submission_id: job.id, kind: "photo", role: "title_result", name: "이미지2", storage_path: p, sort_order: 1, selected: true });
    log.info("  타이틀 이미지2 생성(Seedream, 화풍변경) +버전"); return 1;
  }
  // 타이틀 영상화(ffmpeg): 이미지1·2 → 완성 클립(20초, 크레딧 없음)
  async function genTitleVideo() {
    const a0 = await curTitleImg(0), a1 = await curTitleImg(1);
    if (!a0 || !a1) throw new Error("이미지 1·2를 먼저 생성하세요");
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "mw-title-"));
    try {
      await st.downloadTo(await st.signedUrl(cfg.uploadBucket, a0, 3600), path.join(dir, "t0.png"));
      await st.downloadTo(await st.signedUrl(cfg.uploadBucket, a1, 3600), path.join(dir, "t1.png"));
      const tv = path.join(dir, "title.mp4");
      await makeTitleVideo(path.join(dir, "t0.png"), path.join(dir, "t1.png"), `사랑하는 ${name}`, FONT, tv);
      const vp = `${token}/results/title_${uniq()}.mp4`;                    // 버전 누적(고유 경로)
      await deselect("title_video"); await st.uploadTo(cfg.uploadBucket, vp, await fs.readFile(tv), "video/mp4");
      await ins({ submission_id: job.id, kind: "video", role: "title_video", name: "타이틀 영상", storage_path: vp, sort_order: 0, selected: true });
      log.info("  타이틀 영상화(ffmpeg) +버전");
    } finally { await fs.rm(dir, { recursive: true, force: true }); }
    return 0;
  }
  async function genTitleAll() { let c = await genTitleImg0(); c += await genTitleImg1(); await genTitleVideo(); return c; }
  // AI영상 i번(Kling) — 해당 독사진 1장 → 영상. 새 버전 활성, 기존본은 히스토리로 보관.
  async function genAi(i) {
    if (!aiPhotos[i]) return 0;
    const ref = await sign(aiPhotos[i]);
    const vurl = await generateMemoryVideo({ prompt: aiStyle || aiPromptDefault, imageUrl: ref });
    const vp = `${token}/results/ai_${i}_${uniq()}.mp4`;
    await deselect("ai_video_result", i);
    await st.uploadFromUrl(cfg.uploadBucket, vp, vurl, "video/mp4");
    await ins({ submission_id: job.id, kind: "video", role: "ai_video_result", name: `AI영상 ${String.fromCharCode(65 + i)}`, storage_path: vp, sort_order: i, selected: true });
    log.info(`  AI영상 ${String.fromCharCode(65 + i)} 생성(Kling) +버전`);
    return 1;
  }

  // target: null=전체 / "title"(전체) / "title:0"(이미지1) / "title:1"(이미지2) / "title:video"(영상화) / "ai:i"
  const target = job.regen_target;
  if (job.skip_ai && !target) { log.info("  AI 변환 안함 — 블록 생성 생략"); return { count: 0 }; }
  let count = 0;
  if (target === "title") count += await genTitleAll();
  else if (target === "title:0") count += await genTitleImg0();
  else if (target === "title:1") count += await genTitleImg1();
  else if (target === "title:video") await genTitleVideo();
  else if (target && target.startsWith("ai:")) count += await genAi(Number(target.slice(3)));
  else {
    // 병렬 발사 — 타이틀체인(이미지1→2→영상화)과 AI영상 N개는 서로 독립이라 동시 진행.
    //   (이미지2는 이미지1 출력에 의존 → genTitleAll 내부에서만 순차 유지)
    //   힉스필드 한 키 동시처리 실측 확인(4개 병렬 OK, 429 없음). 하나라도 실패하면 throw→작업 재시도.
    const counts = await Promise.all([
      genTitleAll(),
      ...aiPhotos.map((_, i) => genAi(i)),
    ]);
    count += counts.reduce((a, b) => a + b, 0);
  }
  return { count };
}
