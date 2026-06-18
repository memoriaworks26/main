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
