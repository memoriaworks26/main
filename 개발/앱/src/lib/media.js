// ─────────────────────────────────────────────────────────────
// 미디어 유틸 — 순수 함수 모음. data.js(더미 데이터)에 로직이 섞이지 않도록 분리.
// ─────────────────────────────────────────────────────────────

// 더미 사진 썸네일 생성 — 실제 이미지가 없는 목업 단계에서 카드 미리보기를 채우기 위한
// 작은 SVG data URI(그라데이션 + 풍경 실루엣). 본개발에서 실제 업로드 이미지 URL로 교체.
export const swatch = (a, b, c) =>
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='160' height='120'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='${a}'/><stop offset='1' stop-color='${b}'/></linearGradient></defs><rect width='160' height='120' fill='url(#g)'/><circle cx='118' cy='40' r='22' fill='${c}' opacity='0.5'/><path d='M0 96 L46 60 L84 88 L120 56 L160 90 L160 120 L0 120 Z' fill='${c}' opacity='0.45'/></svg>`
  );

const _enc = (svg) => "data:image/svg+xml;utf8," + encodeURIComponent(svg);
const _esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// 추억 사진 예시 썸네일(16:9 장면) — 보호자 업로드 사진 대용. 인덱스별로 다른 장면(공원·노을·하늘·벚꽃·들판·호숫가).
export const photoThumb = (i = 0) => {
  const S = [
    { a: "#bfe0ef", b: "#eaf3e2", sun: "#f6ecbe", hill: "#8fb56a" },
    { a: "#ffd9a8", b: "#ffb27a", sun: "#fff2cf", hill: "#c98a52" },
    { a: "#cfe6f3", b: "#eef6fb", sun: "#ffffff", hill: "#9bbcc8" },
    { a: "#f6d9e6", b: "#f0e2ee", sun: "#ffffff", hill: "#d49ab0" },
    { a: "#e9e2cf", b: "#f3ecd9", sun: "#fff2cf", hill: "#cbb07a" },
    { a: "#cfe0e0", b: "#eef3ef", sun: "#ffffff", hill: "#7fae9a" },
  ][i % 6];
  return _enc(`<svg xmlns='http://www.w3.org/2000/svg' width='320' height='180'><defs><linearGradient id='s' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='${S.a}'/><stop offset='1' stop-color='${S.b}'/></linearGradient></defs><rect width='320' height='180' fill='url(#s)'/><circle cx='250' cy='46' r='26' fill='${S.sun}' opacity='0.9'/><path d='M0 130 L70 96 L130 124 L200 84 L260 118 L320 92 L320 180 L0 180 Z' fill='${S.hill}' opacity='0.5'/><path d='M0 150 L80 124 L150 148 L230 116 L320 146 L320 180 L0 180 Z' fill='${S.hill}' opacity='0.82'/></svg>`);
};

// 추모영상 결과물 예시 프레임(16:9) — 종류별로 실제 결과물에 가깝게.
//  title: 명조 이름 + 영정 프레임 · slide: 사진 장면 · ai: 시네마틱 입자.
export const genFrame = (kind, i = 0, name = "추모") => {
  if (kind === "title") {
    const [a, b, c] = [["#241c12", "#4a3618", "#ecc98f"], ["#1f1a20", "#43303c", "#dcb16a"], ["#22180f", "#4a2f1c", "#e3b274"], ["#1c1a16", "#3c352a", "#d8c08a"]][i % 4];
    return _enc(`<svg xmlns='http://www.w3.org/2000/svg' width='320' height='180'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='${a}'/><stop offset='1' stop-color='${b}'/></linearGradient></defs><rect width='320' height='180' fill='url(#g)'/><circle cx='252' cy='44' r='34' fill='${c}' opacity='0.16'/><circle cx='64' cy='134' r='24' fill='${c}' opacity='0.13'/><circle cx='288' cy='126' r='13' fill='${c}' opacity='0.2'/><rect x='13' y='13' width='294' height='154' fill='none' stroke='${c}' stroke-opacity='0.55' stroke-width='1.5'/><rect x='19' y='19' width='282' height='142' fill='none' stroke='${c}' stroke-opacity='0.25'/><text x='160' y='103' text-anchor='middle' font-family='Nanum Myeongjo, Batang, serif' font-size='40' font-weight='700' fill='${c}'>${_esc(name)}</text></svg>`);
  }
  if (kind === "ai") {
    const [a, b] = [["#161d2b", "#2b3a55"], ["#1a1726", "#3a2c4e"], ["#13202a", "#24474a"]][i % 3];
    let p = "";
    for (let k = 0; k < 8; k++) p += `<circle cx='${18 + (k * 47) % 300}' cy='${16 + (k * 53) % 150}' r='${3 + (k % 3)}' fill='#f3dce6' opacity='0.5'/>`;
    return _enc(`<svg xmlns='http://www.w3.org/2000/svg' width='320' height='180'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='${a}'/><stop offset='1' stop-color='${b}'/></linearGradient><radialGradient id='v' cx='0.5' cy='0.5' r='0.75'><stop offset='0.55' stop-color='#000' stop-opacity='0'/><stop offset='1' stop-color='#000' stop-opacity='0.5'/></radialGradient></defs><rect width='320' height='180' fill='url(#g)'/><path d='M0 140 Q80 110 160 134 T320 126 L320 180 L0 180 Z' fill='#ffffff' opacity='0.06'/>${p}<rect width='320' height='180' fill='url(#v)'/></svg>`);
  }
  return photoThumb(i); // slide
};

// 영상 파일의 재생 길이(초)를 읽어 반환 (Promise). 메타데이터만 로드.
// 코덱·CORS 제약으로 실패하면 0 → 호출부에서 길이 합산에서 제외.
export const grabVideoDuration = (file) =>
  new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.src = url;
    v.onloadedmetadata = () => {
      const d = Number.isFinite(v.duration) ? v.duration : 0;
      URL.revokeObjectURL(url);
      resolve(d);
    };
    v.onerror = () => { URL.revokeObjectURL(url); resolve(0); };
  });

// 콘텐츠 허브 업로드 — 종류별 메타데이터 자동 추출(길이·해상도). 실패하면 0/null → 표시는 폴백.
//   브라우저 네이티브 디코드만 사용(외부 의존성 0). 메타데이터만 로드하므로 빠름.

// 이미지 픽셀 크기 {w,h} — 실패 시 null.
export const grabImageSize = (file) =>
  new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { const r = { w: img.naturalWidth, h: img.naturalHeight }; URL.revokeObjectURL(url); resolve(r); };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });

// 영상 길이(초)+해상도 {duration,w,h} — 실패 시 0.
export const grabVideoMeta = (file) =>
  new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.src = url;
    v.onloadedmetadata = () => {
      const r = { duration: Number.isFinite(v.duration) ? v.duration : 0, w: v.videoWidth || 0, h: v.videoHeight || 0 };
      URL.revokeObjectURL(url); resolve(r);
    };
    v.onerror = () => { URL.revokeObjectURL(url); resolve({ duration: 0, w: 0, h: 0 }); };
  });

// 오디오 길이(초) {duration} — 실패 시 0.
export const grabAudioMeta = (file) =>
  new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const a = document.createElement("audio");
    a.preload = "metadata";
    a.src = url;
    a.onloadedmetadata = () => { const r = { duration: Number.isFinite(a.duration) ? a.duration : 0 }; URL.revokeObjectURL(url); resolve(r); };
    a.onerror = () => { URL.revokeObjectURL(url); resolve({ duration: 0 }); };
  });

// 영상 파일의 첫 프레임을 캡처해 JPEG data URL로 반환 (Promise).
// 코덱·CORS 제약으로 실패하면 null → 호출부에서 아이콘 폴백 유지.
export const grabVideoFrame = (file) =>
  new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.muted = true;
    v.preload = "metadata";
    v.src = url;
    const done = () => {
      try {
        const c = document.createElement("canvas");
        c.width = v.videoWidth || 160;
        c.height = v.videoHeight || 120;
        c.getContext("2d").drawImage(v, 0, 0, c.width, c.height);
        resolve(c.toDataURL("image/jpeg", 0.7));
      } catch (_) {
        resolve(null);
      }
      URL.revokeObjectURL(url);
    };
    v.onloadeddata = () => { try { v.currentTime = 0.1; } catch (_) { done(); } };
    v.onseeked = done;
    v.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
  });

// 업로드 전 영상 다운스케일(1080p) — 용량↓ = 업로드 시간↓. 오디오 보존.
//   ⚠️ 실험적 · 기기/브라우저 지원 편차 큼. 다음이면 "원본 그대로" 반환(회귀 0):
//      · 영상 아님 / 작은 용량(<40MB) / 이미 1080p 이하 / MediaRecorder·captureStream 미지원
//      · 어떤 단계든 실패 / 결과가 원본보다 안 작음
//   방식: <video> 네이티브 디코드(아이폰 HEVC 포함) → 캔버스 1080p 드로잉 → MediaRecorder 인코딩,
//        오디오는 WebAudio(MediaElementSource→MediaStreamDestination)로 캡처(엘리먼트는 무음).
//   비고: 실시간 처리(영상 길이만큼 소요) — 추억영상 상한 90초라 허용. 대용량·4K에서만 작동해 이득.
const DOWNSCALE_MIN_BYTES = 40 * 1024 * 1024;
export async function downscaleVideo(file, { maxW = 1920, maxH = 1080 } = {}) {
  try {
    if (!file || !file.type?.startsWith("video/") || file.size < DOWNSCALE_MIN_BYTES) return file;
    if (typeof MediaRecorder === "undefined" || typeof HTMLCanvasElement === "undefined"
        || !HTMLCanvasElement.prototype.captureStream) return file;

    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "auto"; video.playsInline = true; video.muted = false;
    video.src = url;
    await new Promise((res, rej) => { video.onloadedmetadata = res; video.onerror = () => rej(new Error("load")); });

    const sw = video.videoWidth, sh = video.videoHeight;
    if (!sw || !sh || (sw <= maxW && sh <= maxH)) { URL.revokeObjectURL(url); return file; } // 이미 충분히 작음
    const scale = Math.min(maxW / sw, maxH / sh);
    const tw = Math.round((sw * scale) / 2) * 2, th = Math.round((sh * scale) / 2) * 2;

    const canvas = document.createElement("canvas");
    canvas.width = tw; canvas.height = th;
    const ctx2d = canvas.getContext("2d");

    // 오디오 캡처(무음 출력) — muted여도 신호 보존. 실패하면 영상만(무음).
    let audioTracks = [], actx = null;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) {
        actx = new AC();
        const dest = actx.createMediaStreamDestination();
        actx.createMediaElementSource(video).connect(dest); // ctx.destination 미연결 → 사용자에겐 무음
        audioTracks = dest.stream.getAudioTracks();
      }
    } catch { audioTracks = []; }

    const cstream = canvas.captureStream(30);
    const out = new MediaStream([cstream.getVideoTracks()[0], ...audioTracks]);
    const mime = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"]
      .find((m) => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(m));
    if (!mime) { URL.revokeObjectURL(url); actx?.close(); return file; }

    const rec = new MediaRecorder(out, { mimeType: mime, videoBitsPerSecond: Math.min(8e6, tw * th * 4) });
    const chunks = [];
    rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
    const stopped = new Promise((res) => { rec.onstop = res; });

    rec.start(1000);
    if (actx?.state === "suspended") { try { await actx.resume(); } catch { /* */ } }
    let drawing = true;
    const draw = () => { if (!drawing) return; ctx2d.drawImage(video, 0, 0, tw, th); requestAnimationFrame(draw); };
    await video.play();          // 자동재생 거부되면 throw → catch → 원본
    draw();
    await new Promise((res) => { video.onended = res; });
    drawing = false;
    rec.stop();
    await stopped;
    actx?.close();
    URL.revokeObjectURL(url);

    const blob = new Blob(chunks, { type: mime.split(";")[0] });
    if (!blob.size || blob.size >= file.size) return file; // 이득 없으면 원본
    const base = (file.name || "video").replace(/\.[^.]+$/, "");
    return new File([blob], `${base}_1080p.${mime.includes("mp4") ? "mp4" : "webm"}`, { type: blob.type });
  } catch {
    return file; // 어떤 실패든 원본 업로드(회귀 0)
  }
}

// 업로드 전 이미지 정규화 — 무엇이 들어와도(HEIC·WebP·PNG…) JPEG로 통일. 힉스필드 입력 안정성 + 용량 절감.
//   · EXIF 회전 보정(아이폰 사진 눕는 문제) — createImageBitmap의 imageOrientation으로 픽셀에 회전 반영
//   · 장축 상한(maxEdge)으로 과대 원본 폭주 방지 → URL fetch 크기제한/타임아웃 회피
//   · 브라우저가 디코딩 못 하면(데스크톱 HEIC 등) 원본 File 그대로 반환 → 워커(safeImageUrl)가 최종 정규화
export async function imageToJpeg(file, { maxEdge = 2048, quality = 0.9 } = {}) {
  if (!file || !file.type || !file.type.startsWith("image/")) return file; // 이미지 아니면 패스
  let bitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch (_) {
    return file; // 디코딩 불가 → 원본 그대로(서버 정규화가 받음)
  }
  try {
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height) || 1);
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    canvas.getContext("2d").drawImage(bitmap, 0, 0, w, h);
    const blob = await new Promise((r) => canvas.toBlob(r, "image/jpeg", quality));
    if (!blob) return file;
    const base = (file.name || "photo").replace(/\.[^.]+$/, "");
    return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
  } catch (_) {
    return file;
  } finally {
    if (bitmap && bitmap.close) bitmap.close();
  }
}
