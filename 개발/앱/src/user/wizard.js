// 유저 위저드 — 상태·핸들러 훅. 화면(UserMobile)과 분리해 업로드/제출 로직을 한곳에 모은다.
// 토큰 = 비로그인 접근 권한. 라이브(env+토큰)면 실업로드/제출, 아니면 데모(목업).
import { useState, useRef, useEffect } from "react";
import { toast } from "../toast.jsx";
import { confirm } from "../confirm.jsx";
import { grabVideoFrame, grabVideoDuration } from "../lib/media.js";
import { getToken, resolveLink, fetchLinkConfig, uploadAsset, submitLink, shareUrlFor } from "../lib/userLink.js";
import { BACKEND_LIVE } from "../lib/supabase.js";
import { useStore, userTextOf } from "../store.js";
import * as D from "../data.js";
import { parseMB } from "./parts.jsx";

const STEPS = D.USER_STEPS;
const TRANSITIONS = D.USER_TRANSITIONS; // 전환 효과 명칭은 data.js에서 단일 관리

export function useUserWizard(previewBizId, stepCtl) {
  const token = getToken();
  const liveMode = BACKEND_LIVE && !!token;
  const store = useStore(); // 고객센터 문의처(본사 + 장례식장) — 설정에서 편집 → 하단 안내에 반영
  const { partners } = store;
  const preview = !!previewBizId;
  const bizForText = previewBizId || D.BIZ_UNITS[0].id;

  // 단계 — 외부(사업부별 세팅 미리보기)에서 제어하면 그걸 쓰고, 아니면 내부 상태
  const [stepIn, setStepIn] = useState(0);
  const step = stepCtl ? stepCtl.step : stepIn;
  const setStep = stepCtl ? stepCtl.setStep : setStepIn;
  const [agreed, setAgreed] = useState(false);             // 정보보호(개인정보) 수집·이용 — 필수
  const [marketingAgreed, setMarketingAgreed] = useState(false); // 마케팅 활용 — 선택
  const [policyOpen, setPolicyOpen] = useState(false);     // 개인정보처리방침 전문 모달
  // 슬라이드 소스 분리 — 사진(추억 슬라이드)·영상(추억 영상)을 따로 올린다. 최종 영상은 사진 슬라이드 → 영상 순서.
  const [photos, setPhotos] = useState([]); // 추억 슬라이드 소스(사진) — 최대 20장
  const [videos, setVideos] = useState([]); // 추억 영상 소스(영상) — 개수 제한 없음
  const [trans, setTrans] = useState(0);
  const [bgm, setBgm] = useState(0);
  const [letter, setLetter] = useState("");
  const [metDate, setMetDate] = useState("");   // 우리 처음 만난 날
  const [partDate, setPartDate] = useState(""); // 무지개다리 건넌 날
  const [titleSel, setTitleSel] = useState(0);
  const [petName, setPetName] = useState(""); // 반려동물 이름(타이틀 자막) — AI 변환 단계에서 입력
  const [transMap, setTransMap] = useState({});
  const [link, setLink] = useState({ mode: liveMode ? "live" : "demo", ok: true, token, petName: "", partnerName: "", status: "draft" });
  const [submitting, setSubmitting] = useState(false);
  const [videoStatus, setVideoStatus] = useState("queued");
  const photoRef = useRef(null);
  const videoRef = useRef(null);
  const aiFileRef = useRef(null);
  const PHOTO_MAX = 20;      // 추억 슬라이드 사진 최대 장수
  const VIDEO_MAX_SEC = 90;  // 추억 영상 총 길이 상한(1분30초)
  // 독사진 3장(AI 변환 전용) — 슬라이드 소스와 별개로 먼저 업로드.
  //   타이틀 1장 → GPT 이미지→이미지(영정 타이틀) · 나머지 2장 → Kling 이미지→영상(AI 추억 영상)
  const [aiPhotos, setAiPhotos] = useState([]); // 항상 빈 상태로 시작 — 보호자가 직접 3장 업로드
  const [skipAi, setSkipAi] = useState(false);  // 「AI 변환 안함」 — 체크 시 독사진 없이 진행(타이틀·AI영상 생성 생략)
  const addAiPhoto = () => aiFileRef.current && aiFileRef.current.click();
  const onAiFiles = (e) => {
    const room = Math.max(0, 3 - aiPhotos.length); // 최대 3장
    const files = Array.from(e.target.files || []).slice(0, room);
    files.forEach((f, k) => {
      const id = "ai-" + Date.now() + "-" + k;
      setAiPhotos((p) => [...p, { id, name: f.name, thumb: f.type.startsWith("image") ? URL.createObjectURL(f) : undefined, uploading: liveMode, storagePath: null }]);
      uploadAsset(token, f, { kind: "photo", onProgress: (pct) => setAiPhotos((p) => p.map((u) => (u.id === id ? { ...u, progress: pct } : u))) })
        .then((res) => setAiPhotos((p) => p.map((u) => (u.id === id ? { ...u, uploading: false, progress: 100, storagePath: res.storagePath } : u))))
        .catch((err) => { setAiPhotos((p) => p.filter((u) => u.id !== id)); toast(err.message || "업로드 실패"); });
    });
    e.target.value = "";
  };
  const removeAiPhoto = async (id) => {
    if (!(await confirm({ title: "사진 삭제", message: "이 사진을 삭제합니다.", danger: true }))) return;
    setAiPhotos((p) => {
      const gone = p.find((u) => u.id === id);
      if (gone && gone.thumb && gone.thumb.startsWith("blob:")) URL.revokeObjectURL(gone.thumb);
      return p.filter((u) => u.id !== id);
    });
  };
  const aiUploadingNow = aiPhotos.some((u) => u.uploading);

  // 토큰 해석 — 컨텍스트(반려동물/빈소)·진행 상태. 이미 제출된 링크면 완료 화면으로.
  useEffect(() => {
    let alive = true;
    resolveLink(token).then((r) => {
      if (!alive) return;
      setLink(r);
      if (r.petName) setPetName(r.petName); // 토큰에 반려동물명이 있으면 입력란 프리필
      if (r.ok && r.status && r.status !== "draft") {
        setVideoStatus(r.status);
        setStep(STEPS.length - 1);
      }
    });
    return () => { alive = false; };
  }, [token]);

  // [QA] 제작 상태 폴링 — 제작중이면 주기적으로 재조회해 완료 시 새로고침 없이 영상 노출.
  useEffect(() => {
    if (!liveMode || !token) return;
    if (videoStatus === "done" || videoStatus === "failed") return;
    let alive = true;
    const iv = setInterval(() => {
      resolveLink(token).then((r) => { if (alive && r.ok) { setLink(r); if (r.status) setVideoStatus(r.status); } });
    }, 8000);
    return () => { alive = false; clearInterval(iv); };
  }, [liveMode, token, videoStatus]);

  // [QA] 실 보호자 링크 — 토큰의 사업부 공개설정(예시사진·유저문구·동의문구·고객센터) 로드.
  //   실패하면 null → 아래 계산이 기본값으로 폴백(현 동작 유지).
  const [linkConfig, setLinkConfig] = useState(null);
  useEffect(() => {
    if (preview || !liveMode) return;
    let alive = true;
    fetchLinkConfig(token).then((c) => { if (alive && c) setLinkConfig(c); });
    return () => { alive = false; };
  }, [token, preview, liveMode]);

  // 표시 텍스트·예시사진·고객센터/동의문구 — 실 보호자 링크면 linkConfig(토큰 사업부) 우선,
  //   아니면(preview/데모) store·시드 기준. linkConfig null이면 자동 폴백(현 동작 유지).
  const cfg = (!preview && liveMode) ? linkConfig : null;
  const T = { ...userTextOf(store, bizForText), ...(cfg?.user_text || {}) };
  const examplePhotos = cfg?.user_photos || store.userPhotos[bizForText] || {};
  const company = cfg ? {
    ...store.company,
    csPhone: cfg.cs_phone ?? store.company.csPhone,
    csHours: cfg.cs_hours ?? store.company.csHours,
    consentPrivacy: cfg.consent_privacy ?? store.company.consentPrivacy,
    consentMarketing: cfg.consent_marketing ?? store.company.consentMarketing,
    privacyPolicy: cfg.privacy_policy ?? store.company.privacyPolicy,
    privacyOfficer: cfg.privacy_officer ?? store.company.privacyOfficer,
  } : store.company;

  // 사진(슬라이드)·영상(추억 영상) 공통 삭제/추가/순서변경 — kind별 state(setList)에 적용.
  const makeRemove = (setList, label) => async (id) => {
    if (!(await confirm({ title: label + " 삭제", message: "이 " + label + "을(를) 삭제합니다.", danger: true }))) return;
    setList((p) => {
      const gone = p.find((u) => u.id === id);
      if (gone && gone.thumb && gone.thumb.startsWith("blob:")) URL.revokeObjectURL(gone.thumb);
      return p.filter((u) => u.id !== id);
    });
  };
  const makeReorder = (setList) => (fromId, toId) => setList((p) => {
    if (!fromId || fromId === toId) return p;
    const arr = [...p];
    const from = arr.findIndex((u) => u.id === fromId);
    const to = arr.findIndex((u) => u.id === toId);
    if (from < 0 || to < 0) return p;
    arr.splice(to, 0, arr.splice(from, 1)[0]);
    return arr;
  });
  const removePhoto = makeRemove(setPhotos, "사진");
  const removeVideo = makeRemove(setVideos, "영상");
  const reorderPhotos = makeReorder(setPhotos);
  const reorderVideos = makeReorder(setVideos);
  const addPhoto = () => photoRef.current && photoRef.current.click();
  const addVideo = () => videoRef.current && videoRef.current.click();

  // 파일 업로드 핸들러 — kind에 맞는 state(setList)에 카드 추가 + 스토리지 업로드. 사진은 20장까지만.
  const makeOnFiles = (setList, kind, cap) => (e) => {
    let files = Array.from(e.target.files || []);
    if (cap) { const room = Math.max(0, cap - (kind === "photo" ? photos.length : videos.length)); files = files.slice(0, room); }
    files.forEach((f, k) => {
      const id = (kind === "photo" ? "p-" : "v-") + Date.now() + "-" + k;
      setList((p) => [...p, {
        id, name: f.name, kind,
        size: (f.size / 1048576).toFixed(1) + "MB",
        thumb: f.type.startsWith("image") ? URL.createObjectURL(f) : undefined,
        url: f.type.startsWith("video") ? URL.createObjectURL(f) : undefined, // 미리보기 재생용(세션 한정)
        uploading: liveMode, storagePath: null,
      }]);
      uploadAsset(token, f, { kind, onProgress: (pct) => setList((p) => p.map((u) => (u.id === id ? { ...u, progress: pct } : u))) })
        .then((res) => setList((p) => p.map((u) => (u.id === id ? { ...u, uploading: false, progress: 100, storagePath: res.storagePath } : u))))
        .catch((err) => { setList((p) => p.filter((u) => u.id !== id)); toast(err.message || "업로드 실패"); });
      // 영상은 첫 프레임 썸네일 + 재생 길이(초)를 비동기로 채운다(길이 합산·상한 검사에 사용)
      if (kind === "video") {
        // .catch로 무해한 실패(코덱·웹뷰 제약)를 흡수 — 전역 unhandledrejection 오탐 방지.
        grabVideoFrame(f).then((thumb) => { if (thumb) setList((p) => p.map((u) => (u.id === id ? { ...u, thumb } : u))); }).catch(() => {});
        grabVideoDuration(f).then((dur) => setList((p) => p.map((u) => (u.id === id ? { ...u, dur } : u)))).catch(() => {});
      }
    });
    e.target.value = "";
  };
  const onPhotoFiles = makeOnFiles(setPhotos, "photo", PHOTO_MAX);
  const onVideoFiles = makeOnFiles(setVideos, "video", null);

  const setItemTrans = (id, idx) => setTransMap((m) => ({ ...m, [id]: idx }));
  // 전환만 무작위 배치 — 사진(슬라이드) 순서는 그대로, 사진마다 전환 효과만 랜덤 지정
  const randomizeTrans = () => setTransMap(Object.fromEntries(photos.map((u) => [u.id, Math.floor(Math.random() * TRANSITIONS.length)])));
  const totalMB = [...photos, ...videos].reduce((sum, u) => sum + parseMB(u.size), 0);
  const overLimit = totalMB > 100;
  const photoOver = photos.length > PHOTO_MAX;
  const videoSecs = videos.reduce((sum, u) => sum + (u.dur || 0), 0); // 추억 영상 총 길이(초)
  const videoOver = videoSecs > VIDEO_MAX_SEC;
  const videoMeasuring = videos.some((u) => u.dur == null && !u.uploading); // 길이 측정 중(메타데이터 대기)
  const uploadingNow = [...photos, ...videos].some((u) => u.uploading);
  const shareUrl = shareUrlFor(link.token || token);

  // 위저드 입력 일괄 제출 → 렌더 큐잉(status=queued). 성공 시 완료 화면으로.
  const doSubmit = async () => {
    if (preview) { toast("미리보기입니다 — 실제 제출되지 않습니다"); return; }
    if (submitting) return;
    if (!(await confirm({ title: "제출하기", message: "입력한 내용으로 추모영상 제작을 제출합니다.\n제출 후에는 수정할 수 없습니다.", confirmLabel: "제출" }))) return;
    setSubmitting(true);
    // 카톡 인앱 등 제약 웹뷰에서 제출 중 예외가 나도 흰화면/멈춤 없이 안내 토스트로 복구.
    try {
      // 독사진 3장 — 타이틀(GPT i2i) 1장 + AI 영상(Kling i2v) 2장. AI 변환 안함이면 생략.
      const aiAssets = skipAi ? [] : aiPhotos.map((u, i) => ({
        kind: "photo",
        role: i === titleSel ? "title" : "ai_video",
        engine: i === titleSel ? "gpt-image" : "kling",
        name: u.name, storagePath: u.storagePath, sortOrder: i,
      }));
      // 추억 슬라이드 사진(앞) → 추억 영상(뒤) 순서. sortOrder는 사진 다음에 영상이 이어지도록 연속 부여.
      const assets = [
        ...aiAssets,
        ...photos.map((u, i) => ({ kind: "photo", role: "slide_photo", name: u.name, sizeMB: parseMB(u.size), storagePath: u.storagePath, sortOrder: i })),
        ...videos.map((u, i) => ({ kind: "video", role: "memory_video", name: u.name, sizeMB: parseMB(u.size), storagePath: u.storagePath, sortOrder: photos.length + i })),
      ];
      const res = await submitLink(link.token || token, {
        petName: petName.trim(), titleIndex: titleSel, transDefault: trans, transMap, bgmId: D.BGM[bgm]?.id, letter, metDate, partDate, assets, skipAi,
        privacyAgreed: agreed, marketingAgreed,
      });
      if (!res.ok) { toast(res.error || "제출에 실패했습니다. 다시 시도해 주세요."); return; }
      setVideoStatus(res.status || "queued");
      setStep(STEPS.length - 1);
    } catch (e) {
      toast("제출 중 오류가 발생했습니다. 다시 시도해 주세요. (" + (e?.message || e) + ")");
    } finally {
      setSubmitting(false);
    }
  };

  // StepBody에 넘기는 화면 상태·핸들러 묶음
  const st = { T, photos: examplePhotos, preview, agreed, setAgreed, marketingAgreed, setMarketingAgreed,
    slidePhotos: photos, videos, PHOTO_MAX, VIDEO_MAX_SEC, removePhoto, removeVideo, addPhoto, addVideo, onPhotoFiles, onVideoFiles, photoRef, videoRef, reorderPhotos, reorderVideos, photoOver, videoSecs, videoOver, videoMeasuring,
    aiPhotos, addAiPhoto, onAiFiles, removeAiPhoto, aiFileRef, skipAi, setSkipAi, petName, setPetName, trans, setTrans, bgm, setBgm, letter, setLetter, metDate, setMetDate, partDate, setPartDate, titleSel, setTitleSel, transMap, setItemTrans, randomizeTrans, totalMB, overLimit, link, shareUrl, videoStatus, company, openPolicy: () => setPolicyOpen(true) };

  const last = STEPS.length - 1;
  const previewStep = last - 1;
  // AI 변환: 반려동물명 입력 필수 + 독사진 3장(+완료). 단, 「AI 변환 안함」이면 사진 없이 진행.
  const blocked = (step === 0 && !agreed) || (step === 1 && (!petName.trim() || (!skipAi && (aiPhotos.length < 3 || aiUploadingNow)))) || (step === 2 && (overLimit || photoOver || videoOver || uploadingNow || videoMeasuring)) || (step === previewStep && (submitting || uploadingNow));

  return { st, T, step, setStep, last, previewStep, blocked, submitting, liveMode, link, company, partners, doSubmit, policyOpen, setPolicyOpen };
}
