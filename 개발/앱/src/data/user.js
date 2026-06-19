// 더미 데이터 — 유저(보호자) 모바일 위저드 단계·업로드 예시.
import { swatch } from "../lib/media.js";

// 유저 모바일 — 7단계 위저드
export const USER_STEPS = [
  "개인정보 동의", "AI 변환", "소스 업로드·장면 전환", "배경 음악", "편지 작성", "미리보기", "영상 완료",
];

export const USER_UPLOADS = [
  { id: "u-1", name: "산책_봄날.jpg", kind: "photo", size: "3.2MB", thumb: swatch("#cfe0c3", "#9bbf86", "#6f9a57") },
  { id: "u-2", name: "가족나들이_2019.jpg", kind: "photo", size: "4.1MB", thumb: swatch("#f3d9bf", "#e0ad7e", "#c98a52") },
  { id: "u-3", name: "산책영상.mp4", kind: "video", size: "82MB" },
  { id: "u-4", name: "대표사진.jpg", kind: "photo", size: "2.8MB", thumb: swatch("#d6cfe6", "#a99bc8", "#8472ad") },
];
