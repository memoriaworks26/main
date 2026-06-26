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
async function imageSegment(src, dur, out, cap, fontFile, isLetter) {
  await ff(["-y", "-loop", "1", "-t", String(dur), "-i", src, "-vf", FIT + capFor(cap, isLetter, fontFile), "-r", String(FPS), ...ENC, out]);
}
async function videoSegment(src, dur, out, cap, fontFile, isLetter) {
  const args = ["-y", "-i", src];
  if (dur) args.push("-t", String(dur));
  args.push("-vf", FIT + capFor(cap, isLetter, fontFile), "-r", String(FPS), ...ENC, out);
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

// segments: [{ type:'image'|'video', path, dur, caption?, letter?, mem? }] (mem=추억영상: 원본사운드 유지·BGM 덕킹)
// bgmPath?, bgmVol(0~100), bgmFadeIn/Out(초), fontFile?(한글캡션), outPath
export async function compose({ segments, bgmPath, bgmVol = 70, bgmFadeIn = 1, bgmFadeOut = 2, fontFile, outPath }) {
  if (!segments?.length) throw new Error("compose: 세그먼트 없음");
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "mw-render-"));
  try {
    const parts = [];
    for (let i = 0; i < segments.length; i++) {
      const s = segments[i]; const seg = path.join(dir, `seg${i}.mp4`);
      if (s.type === "video") await videoSegment(s.path, s.dur, seg, s.caption, fontFile, s.letter);
      else await imageSegment(s.path, s.dur || 5, seg, s.caption, fontFile, s.letter);
      parts.push(seg);
    }
    const list = path.join(dir, "list.txt");
    await fs.writeFile(list, parts.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join("\n"));
    const concat = path.join(dir, "concat.mp4");           // 영상 전용(세그 -an)
    await ff(["-y", "-f", "concat", "-safe", "0", "-i", list, "-c", "copy", concat]);

    // ── 오디오 트랙 구성 ── 추억영상 원본 사운드(해당 구간 배치) + BGM(볼륨·페이드, 추억영상 구간 덕킹)
    const durs = []; for (const p of parts) durs.push(await durationOf(p));
    const total = durs.reduce((a, b) => a + b, 0);
    const offs = []; { let a = 0; for (const d of durs) { offs.push(a); a += d; } }
    const memAudio = []; const memRanges = [];
    for (let i = 0; i < segments.length; i++) {
      if (!segments[i].mem) continue;
      memRanges.push([offs[i], offs[i] + durs[i]]);
      if (await hasAudio(segments[i].path)) memAudio.push({ src: segments[i].path, start: offs[i] });
    }
    if (!bgmPath && memAudio.length === 0) { await ff(["-y", "-i", concat, "-c", "copy", "-movflags", "+faststart", outPath]); return outPath; } // 무음(+faststart 리먹스)

    const args = ["-y", "-i", concat]; const fc = []; const mix = [];
    memAudio.forEach((m, j) => {
      args.push("-i", m.src); const ms = Math.round(m.start * 1000);
      fc.push(`[${1 + j}:a]adelay=${ms}|${ms}[ma${j}]`); mix.push(`[ma${j}]`);
    });
    if (bgmPath) {
      const bidx = 1 + memAudio.length; args.push("-stream_loop", "-1", "-i", bgmPath);
      const vol = (Math.max(0, Math.min(100, bgmVol)) / 100).toFixed(2);
      const duck = memRanges.length
        ? `if(${memRanges.map(([s, e]) => `between(t,${s.toFixed(2)},${e.toFixed(2)})`).join("+")},0,${vol})`
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

// 타이틀 영상(20초) — ① 페이드인 + "사랑하는 X" 자막 페이드인(~10초) → ② 오버랩(크로스페이드) → 끝.
//   img1/img2: 타이틀 결과 이미지 2장(Seedream). caption: 자막(없으면 생략).
export async function makeTitleVideo(img1, img2, caption, fontFile, out) {
  const dir = path.dirname(out);
  const font = fontFile ? `fontfile='${fontFile}':` : "";
  const seg1 = path.join(dir, "_tt1.mp4"), seg2 = path.join(dir, "_tt2.mp4");
  // 자막: 큰 글씨(100), 3초까지 투명 → 8초까지 아주 천천히 서서히 → 유지. border가 text alpha와 함께 페이드.
  const cap = caption
    ? `,drawtext=${font}text='${escText(caption)}':fontcolor=white:fontsize=100:borderw=4:bordercolor=black:x=(w-text_w)/2:y=h-260:alpha='if(lt(t,3),0,if(lt(t,8),(t-3)/5,1))'`
    : "";
  // ① 이미지1 14초(천천히 3초 페이드인 + 자막 서서히). xfade offset10+dur4=14 안에 들어와야 함. ② 이미지2 10초.
  await ff(["-y", "-loop", "1", "-t", "14", "-i", img1, "-vf", `${FIT},fade=t=in:st=0:d=3${cap}`, "-r", String(FPS), ...ENC, seg1]);
  await ff(["-y", "-loop", "1", "-t", "10", "-i", img2, "-vf", FIT, "-r", String(FPS), ...ENC, seg2]);
  // 10초 지점에서 ②로 크로스페이드(천천히 4초) → 총 ~19초. +faststart: moov를 앞으로(편집기 미리보기 즉시 재생)
  await ff(["-y", "-i", seg1, "-i", seg2, "-filter_complex", "[0][1]xfade=transition=fade:duration=4:offset=10,format=yuv420p", "-r", String(FPS), ...ENC, "-movflags", "+faststart", out]);
  return out;
}

// 편지 영상 — 텍스트가 아래 → 위로 흐르는 크레딧 스크롤(편집기 미리보기와 동일 연출).
export async function letterScrollSegment(text, fontFile, out) {
  const font = fontFile ? `fontfile='${fontFile}':` : "";
  const wrapped = wrapText(text, 28);
  const lines = wrapped.split("\n").length;
  const fontsize = 40, lineh = fontsize + 16, TH = lines * lineh;
  const dur = Math.min(40, Math.max(12, Math.round((H + TH) / 55))); // 읽기 속도 ~55px/s
  const y = `(h-(h+${TH})*t/${dur})`;                                 // h(아래) → -TH(위)
  await ff(["-y", "-f", "lavfi", "-i", `color=c=0x161310:s=${W}x${H}:d=${dur}`,
    "-vf", `drawtext=${font}text='${escText(wrapped)}':fontcolor=0xf3e9c8:fontsize=${fontsize}:line_spacing=16:x=(w-text_w)/2:y=${y}`,
    "-r", String(FPS), ...ENC, out]);
  return { path: out, dur };
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
