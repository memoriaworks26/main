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
