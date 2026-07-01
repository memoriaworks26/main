// 유저 위저드 — 상태·핸들러 훅. 화면(UserMobile)과 분리해 업로드/제출 로직을 한곳에 모은다.
// 토큰 = 비로그인 접근 권한. 라이브(env+토큰)면 실업로드/제출, 아니면 데모(목업).
import { useState, useRef, useEffect } from "react";
import { toast } from "../toast.jsx";
import { confirm } from "../confirm.jsx";
import { grabVideoFrame, grabVideoDuration } from "../lib/media.js";
import { getToken, resolveLink, fetchLinkConfig, uploadAsset, submitLink, shareUrlFor, bgmPreviewUrl } from "../lib/userLink.js";
import { BACKEND_LIVE } from "../lib/supabase.js";
import { useStore, userTextOf } from "../store.js";
import * as D from "../data.js";
import { parseMB } from "./parts.jsx";

const STEPS = D.USER_STEPS;
const TRANSITIONS = D.USER_TRANSITIONS; // 전환 효과 명칭은 data.js에서 단일 관리

// previewOverride: 사업부별 세팅의 「저장 전 draft」를 미리보기에만 반영(스토어/DB 미반영). { text, photos }
export function useUserWizard(previewBizId, stepCtl, previewOverride) {
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
  // 독사진 1~3장(AI 변환 전용) — 슬라이드 소스와 별개로 먼저 업로드.
  //   1장 → 타이틀만(영정, AI 영상 없음) · 2장 → 타이틀 + AI 영상 A · 3장 → 타이틀 + AI 영상 A·B
  const [aiPhotos, setAiPhotos] = useState([]); // 항상 빈 상태로 시작 — 보호자가 1~3장 업로드
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
    const idx = aiPhotos.findIndex((u) => u.id === id);
    const gone = aiPhotos[idx];
    if (gone && gone.thumb && gone.thumb.startsWith("blob:")) URL.revokeObjectURL(gone.thumb);
    setAiPhotos((p) => p.filter((u) => u.id !== id));
    // 타이틀 인덱스 보정 — 삭제로 인덱스가 밀리거나 범위를 벗어나면 유효한 사진으로 재지정(타이틀 누락 방지).
    setTitleSel((s) => {
      let t = idx < s ? s - 1 : s;               // 타이틀 앞 사진을 지우면 한 칸 당김
      const nextLen = aiPhotos.length - 1;       // 삭제 후 장수
      if (t > nextLen - 1) t = nextLen - 1;      // 범위 밖이면 마지막으로
      return t < 0 ? 0 : t;
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
  //   완료 화면(제출 후)에서만 폴링한다. 편집 중(draft)에 폴링하면 8초마다 setLink(새 객체)로
  //   위저드가 리렌더 → 미리보기 슬라이드쇼가 계속 처음으로 되감겨(빨리감기·새로고침처럼 보임) 네트워크도 낭비.
  useEffect(() => {
    if (!liveMode || !token) return;
    if (step !== STEPS.length - 1) return;                       // 완료 화면에서만 — 편집 중엔 폴링 금지
    if (videoStatus === "done" || videoStatus === "failed") return;
    let alive = true;
    const iv = setInterval(() => {
      resolveLink(token).then((r) => { if (alive && r.ok) { setLink(r); if (r.status) setVideoStatus(r.status); } });
    }, 8000);
    return () => { alive = false; clearInterval(iv); };
  }, [liveMode, token, step, videoStatus]);

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
  // 미리보기에서 draft 오버라이드가 오면 그것만 반영(저장 전 미리보기) — 그 외엔 스토어/링크 설정 기준.
  const T = previewOverride
    ? { ...D.USER_TEXT, ...(previewOverride.text || {}) }
    : { ...userTextOf(store, bizForText), ...(cfg?.user_text || {}) };
  const examplePhotos = previewOverride
    ? (previewOverride.photos || {})
    : (cfg?.user_photos || store.userPhotos[bizForText] || {});
  // 배경 음악 선택지 — 실 보호자 링크면 토큰 사업부의 공용 BGM 라이브러리(linkConfig.bgm), 아니면 데모 시드.
  //   cfg 로드 전/데모/미리보기는 D.BGM 폴백. 라이브러리가 비어도 그대로 빈 목록(목 곡 노출 방지).
  const bgmList = cfg?.bgm || D.BGM;
  // BGM 미리듣기 지연 최소화 — 목록이 뜨면 서명URL을 미리 발급해 캐시(탭 시 네트워크 왕복 없이 즉시 재생).
  const [bgmUrls, setBgmUrls] = useState({});
  useEffect(() => {
    if (!liveMode) return;
    const paths = [...new Set(bgmList.map((b) => b.storage_path).filter(Boolean))];
    if (!paths.length) return;
    let alive = true;
    Promise.all(paths.map((p) => bgmPreviewUrl(p).then((u) => [p, u]).catch(() => [p, null])))
      .then((pairs) => { if (alive) setBgmUrls(Object.fromEntries(pairs.filter(([, u]) => u))); });
    return () => { alive = false; };
  }, [liveMode, bgmList]);
  const company = cfg ? {
    ...store.company,
    csPhone: cfg.cs_phone ?? store.company.csPhone,
    csHours: cfg.cs_hours ?? store.company.csHours,
    consentPrivacy: cfg.consent_privacy ?? store.company.consentPrivacy,
    consentMarketing: cfg.consent_marketing ?? store.company.consentMarketing,
    privacyPolicy: cfg.privacy_policy ?? store.company.privacyPolicy,
    privacyOfficer: cfg.privacy_officer ?? store.company.privacyOfficer,
  } : store.company;
  // 장례식장(파트너) 고객센터 — 라이브는 토큰 해석(cfg, partner_id 기준)으로 정확히. 동명 파트너사 충돌 없음.
  //   데모/미리보기(cfg 없음)는 시드 store.partners를 빈소명으로 폴백(시드데이터라 충돌 무관).
  const partnerCs = cfg
    ? (cfg.partner_cs_phone ? { csPhone: cfg.partner_cs_phone, csHours: cfg.partner_cs_hours } : null)
    : (() => { const p = partners.find((x) => x.name === link.partnerName); return p ? { csPhone: p.csPhone, csHours: p.csHours } : null; })();

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
        // 미리보기 URL은 핸들러가 아는 kind로 판정 — f.type은 iOS .mov/HEIC가 빈값/비표준(특히 카톡 인앱웹뷰)이라 신뢰 불가.
        thumb: kind === "photo" ? URL.createObjectURL(f) : undefined,
        url: kind === "video" ? URL.createObjectURL(f) : undefined, // 미리보기 재생용(세션 한정)
        uploading: liveMode, storagePath: null,
      }]);
      uploadAsset(token, f, {
        kind,
        onProgress: (pct) => setList((p) => p.map((u) => (u.id === id ? { ...u, progress: pct } : u))),
        onStage: (s) => setList((p) => p.map((u) => (u.id === id ? { ...u, stage: s } : u))),
      })
        .then((res) => setList((p) => p.map((u) => (u.id === id ? { ...u, uploading: false, progress: 100, stage: null, storagePath: res.storagePath } : u))))
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
      // 독사진 1~3장 — 타이틀(Seedream i2i) 1장 + AI 영상(Kling i2v) 0~2장(A·B). AI 변환 안함이면 생략.
      //   1장=타이틀만 · 2장=타이틀+A · 3장=타이틀+A·B. titleSel은 범위 밖일 수 없게 보정(타이틀 누락 방지).
      const tSel = Math.min(Math.max(titleSel, 0), Math.max(0, aiPhotos.length - 1));
      const aiAssets = skipAi ? [] : aiPhotos.map((u, i) => ({
        kind: "photo",
        role: i === tSel ? "title" : "ai_video",
        engine: i === tSel ? "seedream" : "kling",
        name: u.name, storagePath: u.storagePath, sortOrder: i,
      }));
      // 추억 슬라이드 사진(앞) → 추억 영상(뒤) 순서. sortOrder는 사진 다음에 영상이 이어지도록 연속 부여.
      const assets = [
        ...aiAssets,
        ...photos.map((u, i) => ({ kind: "photo", role: "slide_photo", name: u.name, sizeMB: parseMB(u.size), storagePath: u.storagePath, sortOrder: i })),
        ...videos.map((u, i) => ({ kind: "video", role: "memory_video", name: u.name, sizeMB: parseMB(u.size), storagePath: u.storagePath, sortOrder: photos.length + i })),
      ];
      // 슬라이드 전환 — 사진 순서(=slide_photo sortOrder)대로 ffmpeg xfade 명 배열로 해석해 워커에 전달.
      //   transMap[u.id](사진별 선택) 없으면 기본(trans). transMap 자체가 임시 id 키라 워커가 직접 못 쓰므로 여기서 해소.
      const transMapResolved = photos.map((u) => (TRANSITIONS[transMap[u.id] ?? trans] || {}).x || "fade");
      const res = await submitLink(link.token || token, {
        petName: petName.trim(), titleIndex: tSel, transDefault: trans, transMap: transMapResolved, bgmId: bgmList[bgm]?.id, letter, metDate, partDate, assets, skipAi,
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
    aiPhotos, addAiPhoto, onAiFiles, removeAiPhoto, aiFileRef, skipAi, setSkipAi, petName, setPetName, trans, setTrans, bgm, setBgm, bgmList, bgmUrls, signBgm: bgmPreviewUrl, letter, setLetter, metDate, setMetDate, partDate, setPartDate, titleSel, setTitleSel, transMap, setItemTrans, randomizeTrans, totalMB, overLimit, link, shareUrl, videoStatus, company, openPolicy: () => setPolicyOpen(true) };

  const last = STEPS.length - 1;
  const previewStep = last - 1;
  // AI 변환: 반려동물명 입력 필수 + 독사진 1장 이상(최대 3장, 업로드 완료). 단, 「AI 변환 안함」이면 사진 없이 진행.
  const noSource = photos.length + videos.length === 0; // 추억 소스(사진·영상) 미업로드 — 1개 이상 올려야 다음 진행
  const blocked = (step === 0 && !agreed) || (step === 1 && (!petName.trim() || (!skipAi && (aiPhotos.length < 1 || aiUploadingNow)))) || (step === 2 && (noSource || overLimit || photoOver || videoOver || uploadingNow || videoMeasuring)) || (step === previewStep && (submitting || uploadingNow));

  return { st, T, step, setStep, last, previewStep, blocked, submitting, liveMode, link, company, partnerCs, partners, doSubmit, policyOpen, setPolicyOpen };
}
