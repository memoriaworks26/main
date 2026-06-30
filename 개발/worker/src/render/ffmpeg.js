// ─────────────────────────────────────────────────────────────
// FFmpeg 합성 — 템플릿 블록(이미지/영상) → 16:9 세그먼트 정규화 → concat → BGM.
//   ffmpeg-static 휴대용 바이너리 사용(로컬·Railway 동일). 캡션 drawtext(한글은 fontfile 필요).
//   세그먼트 단위로 인코딩 후 concat → 혼합 입력(이미지+영상)도 안정적으로 이어붙임.
// ─────────────────────────────────────────────────────────────
import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import ffmpegStatic from "ffmpeg-static";
import ffprobeStatic from "ffprobe-static";
import { log } from "../log.js";

// 운영(Railway)은 apt ffmpeg(드로텍스트 포함)를 FFMPEG_PATH로 주입 — ffmpeg-static Linux엔 drawtext 없음.
// 로컬은 ffmpeg-static 폴백.
const ffmpegPath = process.env.FFMPEG_PATH || ffmpegStatic;
const ffprobePath = process.env.FFPROBE_PATH || ffprobeStatic.path;

const W = 1920, H = 1080, FPS = 30;
const FIT = `scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1`;

function run(bin, args) {
  return new Promise((res, rej) => {
    const p = spawn(bin, args, { stdio: ["ignore", "ignore", "pipe"] });
    let err = ""; p.stderr.on("data", (d) => (err += d));
    p.on("error", rej);
    p.on("close", (c) => (c === 0 ? res() : rej(new Error(`ffmpeg(${c}): ` + err.slice(-600)))));
  });
}
const ff = (args) => run(ffmpegPath, args);

// drawtext 텍스트 escape — 줄바꿈(\n)은 보존(편지 멀티라인), %·:·\·' 처리.
const escText = (t) => String(t).replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/:/g, "\\:").replace(/'/g, "’");

// 긴 텍스트를 maxChars 폭으로 줄바꿈(기존 \n 단락 유지, 띄어쓰기 우선·긴 한글런 하드랩).
function wrapText(text, maxChars) {
  const out = [];
  for (const para of String(text).split("\n")) {
    if (!para) { out.push(""); continue; }
    let line = "";
    for (const word of para.split(" ")) {
      if ((line ? line.length + 1 : 0) + word.length <= maxChars) { line = line ? line + " " + word : word; continue; }
      if (line) { out.push(line); line = ""; }
      let w = word;
      while (w.length > maxChars) { out.push(w.slice(0, maxChars)); w = w.slice(maxChars); }
      line = w;
    }
    if (line) out.push(line);
  }
  return out.join("\n");
}

// 짧은 캡션(타이틀 펫 이름 등) — 하단 중앙 1줄.
function caption(text, fontFile) {
  if (!text) return "";
  const font = fontFile ? `fontfile='${fontFile}':` : "";
  return `,drawtext=${font}text='${escText(text)}':fontcolor=white:fontsize=64:x=(w-text_w)/2:y=h-180:box=1:boxcolor=black@0.45:boxborderw=24`;
}
// 편지 장면 — 자동 줄바꿈 + 화면 중앙·행간, 작은 폰트.
function letterCaption(text, fontFile) {
  if (!text) return "";
  const font = fontFile ? `fontfile='${fontFile}':` : "";
  const wrapped = wrapText(text, 24);
  return `,drawtext=${font}text='${escText(wrapped)}':fontcolor=white:fontsize=44:line_spacing=18:x=(w-text_w)/2:y=(h-text_h)/2:box=1:boxcolor=black@0.35:boxborderw=48`;
}
const capFor = (cap, isLetter, fontFile) => (isLetter ? letterCaption(cap, fontFile) : caption(cap, fontFile));

// ultrafast preset + threads 0(가용 코어 전부) — 긴 영상도 인코딩이 코어수만큼 빨라져 reaper 창 안에 들어옴.
//   (대용량 RAM 폭증의 주범은 인코딩이 아니라 최종본 fs.readFile였고, 그건 스트리밍 업로드로 제거 → threads 풀어도 안전)
const ENC = ["-c:v", "libx264", "-preset", "ultrafast", "-threads", "0", "-pix_fmt", "yuv420p", "-an"];
const FADEIN = ",fade=t=in:st=0:d=0.4"; // 장면전환(「없음」 아닌 경계)의 부드러운 페이드인
async function imageSegment(src, dur, out, cap, fontFile, isLetter, fade) {
  await ff(["-y", "-loop", "1", "-t", String(dur), "-i", src, "-vf", FIT + (fade ? FADEIN : "") + capFor(cap, isLetter, fontFile), "-r", String(FPS), ...ENC, out]);
}
async function videoSegment(src, dur, out, cap, fontFile, isLetter, fade) {
  const args = ["-y", "-i", src];
  if (dur) args.push("-t", String(dur));
  args.push("-vf", FIT + (fade ? FADEIN : "") + capFor(cap, isLetter, fontFile), "-r", String(FPS), ...ENC, out);
  await ff(args);
}

// 오디오 스트림 존재 여부(추억영상 원본 사운드 판정).
function hasAudio(file) {
  return new Promise((res) => {
    const p = spawn(ffprobePath, ["-v", "error", "-select_streams", "a", "-show_entries", "stream=codec_type", "-of", "csv=p=0", file]);
    let o = ""; p.stdout.on("data", (d) => (o += d));
    p.on("error", () => res(false));
    p.on("close", () => res(o.trim().length > 0));
  });
}

// segments: [{ type:'image'|'video', path, dur, caption?, letter?, mem?, vol? }]
//   mem=추억영상(원본사운드 유지·BGM 덕킹), vol=0~200 세그별 음량%(없으면 mem은 memVol·그외 100)
// bgmPath?, bgmVol(0~100), bgmFadeIn/Out(초), fontFile?(한글캡션), outPath
export async function compose({ segments, bgmPath, bgmVol = 70, bgmFadeIn = 1, bgmFadeOut = 2, fontFile, subs = null, subFonts = null, memVol = 100, outPath }) {
  if (!segments?.length) throw new Error("compose: 세그먼트 없음");
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "mw-render-"));
  try {
    const parts = [];
    for (let i = 0; i < segments.length; i++) {
      const s = segments[i]; const seg = path.join(dir, `seg${i}.mp4`);
      if (s.type === "video") await videoSegment(s.path, s.dur, seg, s.caption, fontFile, s.letter, s.fade);
      else await imageSegment(s.path, s.dur || 5, seg, s.caption, fontFile, s.letter, s.fade);
      parts.push(seg);
    }
    const list = path.join(dir, "list.txt");
    await fs.writeFile(list, parts.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join("\n"));
    const concat = path.join(dir, "concat.mp4");           // 영상 전용(세그 -an)
    await ff(["-y", "-f", "concat", "-safe", "0", "-i", list, "-c", "copy", concat]);

    // 자막 — 편집기 자막 트랙을 최종 타임라인 절대시간으로 번인(있을 때만 영상 재인코딩). 없으면 무비용.
    let base = concat;
    if (subs && subs.length) { const subbed = path.join(dir, "subbed.mp4"); await burnSubtitles(concat, subbed, subs, fontFile, subFonts); base = subbed; }

    // ── 오디오 트랙 구성 ── 추억영상 원본 사운드(해당 구간 배치) + BGM(볼륨·페이드, 추억영상 구간 덕킹)
    const durs = []; for (const p of parts) durs.push(await durationOf(p));
    const total = durs.reduce((a, b) => a + b, 0);
    const offs = []; { let a = 0; for (const d of durs) { offs.push(a); a += d; } }
    // 오디오 보유 세그먼트(추억영상·클립 등)를 각자 볼륨으로 믹스. 세그 vol 우선 → 추억영상(mem)은 memVol 폴백 → 그 외 100.
    //   vol<=0(음소거)이거나 오디오 트랙이 없는 세그(타이틀·슬라이드·AI영상·편지)는 믹스·BGM덕킹 모두 제외.
    const segAudio = []; const duckRanges = [];
    for (let i = 0; i < segments.length; i++) {
      const s = segments[i];
      if (!s.mem && !s.clip) continue;                          // 소스 오디오 세그(추억영상·클립)만 — 타이틀/슬라이드/AI영상/편지는 항상 무음(BGM 덕킹 안 함)
      const segVol = s.vol != null ? s.vol : (s.mem ? memVol : 100); // 편집기 슬라이더(영상별·클립별)
      if (segVol <= 0) continue;                                 // 음소거 — 믹스·덕킹 제외
      if (!(await hasAudio(s.path))) continue;                   // 오디오 트랙 없으면 제외
      duckRanges.push([offs[i], offs[i] + durs[i]]);
      segAudio.push({ src: s.path, start: offs[i], gain: (Math.max(0, Math.min(200, segVol)) / 100).toFixed(2) });
    }
    if (!bgmPath && segAudio.length === 0) { await ff(["-y", "-i", base, "-c", "copy", "-movflags", "+faststart", outPath]); return outPath; } // 무음(+faststart 리먹스)

    const args = ["-y", "-i", base]; const fc = []; const mix = [];
    segAudio.forEach((m, j) => {
      args.push("-i", m.src); const ms = Math.round(m.start * 1000);
      fc.push(`[${1 + j}:a]adelay=${ms}|${ms},volume=${m.gain}[ma${j}]`); mix.push(`[ma${j}]`);
    });
    if (bgmPath) {
      const bidx = 1 + segAudio.length; args.push("-stream_loop", "-1", "-i", bgmPath);
      const vol = (Math.max(0, Math.min(100, bgmVol)) / 100).toFixed(2);
      const duck = duckRanges.length
        ? `if(${duckRanges.map(([s, e]) => `between(t,${s.toFixed(2)},${e.toFixed(2)})`).join("+")},0,${vol})`
        : `${vol}`;
      let bg = `[${bidx}:a]atrim=0:${total.toFixed(2)},volume='${duck}':eval=frame`;
      if (bgmFadeIn > 0) bg += `,afade=t=in:st=0:d=${bgmFadeIn}`;
      if (bgmFadeOut > 0) bg += `,afade=t=out:st=${Math.max(0, total - bgmFadeOut).toFixed(2)}:d=${bgmFadeOut}`;
      fc.push(`${bg}[bg]`); mix.push("[bg]");
    }
    fc.push(`${mix.join("")}amix=inputs=${mix.length}:normalize=0:duration=longest[aout]`);
    args.push("-filter_complex", fc.join(";"), "-map", "0:v:0", "-map", "[aout]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", "-t", total.toFixed(2), outPath);
    await ff(args);
    return outPath;
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

// 타이틀 영상 — 영정 이미지에 "사랑하는 X" 자막을 서서히 띄움.
//   img1: 영정 이미지(필수). img2: (옵션·구버전 호환) 있으면 ②로 크로스페이드. caption: 자막(없으면 생략).
//   ※ 타이틀 단순화(2026-06-30): 기본은 영정 1장 → 18초 단일 클립. img2가 주어지면 기존 2장 오버랩 유지.
export async function makeTitleVideo(img1, img2, caption, fontFile, out) {
  const dir = path.dirname(out);
  const font = fontFile ? `fontfile='${fontFile}':` : "";
  // 자막: 큰 글씨(100), 3초까지 투명 → 8초까지 아주 천천히 서서히 → 유지. border가 text alpha와 함께 페이드.
  const cap = caption
    ? `,drawtext=${font}text='${escText(caption)}':fontcolor=white:fontsize=100:borderw=4:bordercolor=black:x=(w-text_w)/2:y=h-260:alpha='if(lt(t,3),0,if(lt(t,8),(t-3)/5,1))'`
    : "";
  if (!img2) {
    // 단일 영정 타이틀 — 18초, 천천히 3초 페이드인 + 자막 서서히. (+faststart: 편집기 미리보기 즉시 재생)
    await ff(["-y", "-loop", "1", "-t", "18", "-i", img1, "-vf", `${FIT},fade=t=in:st=0:d=3${cap}`, "-r", String(FPS), ...ENC, "-movflags", "+faststart", out]);
    return out;
  }
  const seg1 = path.join(dir, "_tt1.mp4"), seg2 = path.join(dir, "_tt2.mp4");
  // ① 이미지1 14초(천천히 3초 페이드인). xfade offset10+dur4=14 안에 들어와야 함. ② 이미지2 10초. 자막은 세그가 아니라 합성본에 얹음.
  await ff(["-y", "-loop", "1", "-t", "14", "-i", img1, "-vf", `${FIT},fade=t=in:st=0:d=3`, "-r", String(FPS), ...ENC, seg1]);
  await ff(["-y", "-loop", "1", "-t", "10", "-i", img2, "-vf", FIT, "-r", String(FPS), ...ENC, seg2]);
  // 10초 지점에서 ②로 크로스페이드(천천히 4초) → 총 ~20초. 자막을 최종 합성본에 얹어 20초 끝까지 유지(배경 초상만 화풍 전환, 문구는 고정). +faststart: 편집기 미리보기 즉시 재생.
  await ff(["-y", "-i", seg1, "-i", seg2, "-filter_complex", `[0][1]xfade=transition=fade:duration=4:offset=10,format=yuv420p${cap}`, "-r", String(FPS), ...ENC, "-movflags", "+faststart", out]);
  return out;
}

// 추억 슬라이드쇼 — 보호자 사진 N장을 각 dur초 노출 + 사진 사이 xfade 전환으로 한 클립 합성.
//   items: [{ path, dur, xfade }] — xfade=그 사진으로 넘어올 때 전환(ffmpeg xfade 명, 첫 장은 무시).
//   각 장을 16:9(1920×1080)/30fps로 정규화 → xfade 체인(offset 누적). 미지원/'none' 전환명은 fade로 폴백.
const XFADE_OK = new Set([
  "fade", "fadeblack", "fadewhite", "dissolve", "distance", "pixelize", "radial",
  "wipeleft", "wiperight", "wipeup", "wipedown", "slideleft", "slideright", "slideup", "slidedown",
  "smoothleft", "smoothright", "smoothup", "smoothdown", "circleopen", "circleclose", "circlecrop", "rectcrop",
  "zoomin", "hlslice", "hrslice", "vuslice", "vdslice", "diagtl", "diagtr", "diagbl", "diagbr",
]);
const XFADE_DUR = 1.0; // 전환 길이(초) — dur보다 작아야 함(슬라이드 7초 기준 여유).
// 전환 「없음」 판정 — "없음"/"none"/빈값이면 xfade 안 함(장면을 뚝 끊어 이어붙임).
const isCut = (x) => !x || x === "none" || x === "없음";
// xfade 체인 — [0][1]xfade@off1[v1]; [v1][2]xfade@off2[v2]; … 마지막은 [vout].
async function xfadeChain(items, segs, out) {
  const args = ["-y"]; segs.forEach((s) => args.push("-i", s));
  const fc = []; let prev = "[0:v]"; let off = (items[0].dur || 7) - XFADE_DUR;
  for (let i = 1; i < segs.length; i++) {
    const t = XFADE_OK.has(items[i].xfade) ? items[i].xfade : "fade";
    const label = i === segs.length - 1 ? "[vout]" : `[v${i}]`;
    fc.push(`${prev}[${i}:v]xfade=transition=${t}:duration=${XFADE_DUR}:offset=${off.toFixed(2)}${label}`);
    prev = label; off += (items[i].dur || 7) - XFADE_DUR;
  }
  args.push("-filter_complex", fc.join(";"), "-map", "[vout]", "-r", String(FPS), ...ENC, "-movflags", "+faststart", out);
  await ff(args);
}
// 하드컷 이어붙이기 — 균일 세그먼트를 재인코딩 없이 concat(-c copy). 전환 「없음」 기본 + xfade 실패 폴백.
//   모든 세그가 imageSegment로 동일 규격(1920x1080·yuv420p·30fps)이라 copy concat이 안전.
async function concatSegs(segs, out) {
  const dir = path.dirname(out);
  const list = path.join(dir, "_slides_list.txt");
  await fs.writeFile(list, segs.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join("\n"));
  await ff(["-y", "-f", "concat", "-safe", "0", "-i", list, "-c", "copy", "-movflags", "+faststart", out]);
}
export async function makeSlideshow(items, out) {
  if (!items?.length) throw new Error("slideshow: 사진 없음");
  const dir = path.dirname(out);
  // 1장 — 단일 이미지 클립(페이드인).
  if (items.length === 1) {
    await imageSegment(items[0].path, items[0].dur || 7, out, null, null, false, true);
    return out;
  }
  // 각 장을 정규화 세그먼트로(첫 장만 가벼운 페이드인, 나머지는 xfade/concat가 처리).
  const segs = [];
  for (let i = 0; i < items.length; i++) {
    const s = path.join(dir, `_ss${i}.mp4`);
    await imageSegment(items[i].path, items[i].dur || 7, s, null, null, false, i === 0);
    segs.push(s);
  }
  // 전환효과가 하나도 없으면(전부 「없음」) xfade 없이 하드컷 concat — 보호자 선택 존중 + 취약한 xfade 체인 회피.
  //   전환이 있으면 xfade로 겹치되, 운영 ffmpeg가 긴 체인에서 실패(auto_scale 재초기화 등)해도
  //   하드컷 concat으로 폴백해 슬라이드 영상은 항상 만들어지게 한다(내역에 반드시 뜨도록).
  const wantXfade = items.slice(1).some((it) => !isCut(it.xfade));
  if (wantXfade) {
    try { await xfadeChain(items, segs, out); return out; }
    catch (e) { log.warn("  슬라이드 xfade 실패 — 하드컷(concat)으로 폴백: " + (e.message || e)); }
  }
  await concatSegs(segs, out);
  return out;
}

// 편지 영상 — 텍스트가 아래 → 위로 흐르는 크레딧 스크롤(편집기 미리보기와 동일 연출).
// 편지 스크롤(아래→위). 날짜(처음 만난 날·무지개다리 건넌 날)도 고정 카드가 아니라 편지 본문에 이어
//   같은 스크롤로 마지막에 올라온다(라벨 작게·날짜 크게). dates={metDate,partDate} (없으면 본문만).
export async function letterScrollSegment(text, dates, fontFile, out) {
  const font = fontFile ? `fontfile='${fontFile}':` : "";
  const wrapped = wrapText(text || "", 28);
  const hasBody = !!wrapped.trim();
  // 콘텐츠 요소들(본문 + 날짜 라벨/값)에 누적 y오프셋 부여 → 하나의 블록으로 함께 스크롤.
  const els = [];
  let h = 0;
  if (hasBody) { els.push({ text: wrapped, size: 40, ls: 16, off: 0, color: "0xf3e9c8" }); h = wrapped.split("\n").length * 56; }
  const addDate = (label, val) => {
    if (!val) return;
    h += hasBody || els.length ? 110 : 0;                                  // 본문/직전 항목과 간격
    els.push({ text: label, size: 32, ls: 6, off: h, color: "0xbda77f" }); h += 46; // 라벨(작게·흐린 골드)
    els.push({ text: String(val), size: 60, ls: 6, off: h, color: "0xf6ecd2" }); h += 84; // 날짜(크게·밝게)
  };
  addDate("우리 처음 만난 날", dates?.metDate);
  addDate("무지개다리 건넌 날", dates?.partDate);
  if (!els.length) els.push({ text: " ", size: 40, ls: 16, off: 0, color: "0xf3e9c8" }); // 안전장치(빈 편지·날짜)
  const totalH = Math.max(h, 1);
  const dur = Math.min(52, Math.max(12, Math.round((H + totalH) / 55)));   // 읽기 속도 ~55px/s
  const top = `(h-(h+${totalH})*t/${dur})`;                                // 콘텐츠 상단 y: h(아래) → -totalH(위)
  const vf = els.map((e) => `drawtext=${font}text='${escText(e.text)}':fontcolor=${e.color}:fontsize=${e.size}:line_spacing=${e.ls}:x=(w-text_w)/2:y=(${top}+${e.off})`).join(",");
  await ff(["-y", "-f", "lavfi", "-i", `color=c=0x161310:s=${W}x${H}:d=${dur}`,
    "-vf", vf, "-r", String(FPS), ...ENC, out]);
  return { path: out, dur };
}

// faststart 리먹스 — 재인코딩 없이(스트림 복사, 무손실) moov atom을 파일 앞으로.
//   보호자 원본 영상이 브라우저 미리보기에서 전체 다운로드 없이 즉시 재생되게. 코덱 비호환이면 호출측에서 throw 처리.
export async function faststartRemux(inPath, outPath) {
  await ff(["-y", "-i", inPath, "-c", "copy", "-movflags", "+faststart", outPath]);
  return outPath;
}

// 자막 효과 → drawtext 조각(박스/그림자/외곽선/없음). 앱 미리보기 subtitleEffectStyle과 같은 의미. 콜론(:)으로 끝남.
function subEffectFilter(effect) {
  switch (effect) {
    case "그림자": return "shadowcolor=black@0.75:shadowx=3:shadowy=3:";
    case "외곽선": return "borderw=4:bordercolor=black:";
    case "없음": return "";
    case "박스":
    default: return "box=1:boxcolor=black@0.4:boxborderw=16:"; // 기본(옛 자막 호환)
  }
}

// 자막 번인 — 편집기 자막 트랙(절대시간 start~end)을 최종 영상 위에 그려 재인코딩.
//   위치 pos(상단/중앙/하단)·xPct/yPct, 색상, 폰트(key→subFonts 파일, 없으면 기본), 효과(박스/그림자/외곽선) 반영.
export async function burnSubtitles(inPath, outPath, subs, fontFile, subFonts = null) {
  const filters = (subs || []).filter((s) => (s.text || "").trim()).map((s) => {
    const ffile = (subFonts && subFonts[s.font]) || fontFile;  // 폰트 key→파일(미지정·옛자막은 기본 폰트)
    const font = ffile ? `fontfile='${ffile}':` : "";
    const size = Math.max(20, Math.min(80, Number(s.size) || 48));
    const color = (s.color || "#f3e9c8").replace("#", "0x");
    const x = s.xPct != null ? `(w*${(s.xPct / 100).toFixed(4)})` : "(w-text_w)/2";
    const y = s.yPct != null ? `(h*${(s.yPct / 100).toFixed(4)})`
      : s.pos === "상단" ? "h*0.10" : s.pos === "중앙" ? "(h-text_h)/2" : "h-200";
    const st = Number(s.start) || 0, en = Number(s.end) || st + 3;
    return `drawtext=${font}text='${escText(s.text)}':fontcolor=${color}:fontsize=${size}:x=${x}:y=${y}:${subEffectFilter(s.effect)}enable='between(t,${st.toFixed(2)},${en.toFixed(2)})'`;
  });
  if (!filters.length) { await ff(["-y", "-i", inPath, "-c", "copy", outPath]); return outPath; }
  await ff(["-y", "-i", inPath, "-vf", filters.join(","), "-r", String(FPS), ...ENC, outPath]);
  return outPath;
}

// 단색 배경 이미지(편지 장면 등) 1920x1080.
export async function makeSolid(color, out) {
  await ff(["-y", "-f", "lavfi", "-i", `color=c=${color}:s=${W}x${H}`, "-frames:v", "1", out]);
  return out;
}

export function durationOf(file) {
  return new Promise((res, rej) => {
    const p = spawn(ffprobePath, ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", file]);
    let o = ""; p.stdout.on("data", (d) => (o += d));
    p.on("error", rej);
    p.on("close", (c) => (c === 0 ? res(parseFloat(o)) : rej(new Error("ffprobe " + c))));
  });
}
