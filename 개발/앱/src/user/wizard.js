// 유저 위저드 — 상태·핸들러 훅. 화면(UserMobile)과 분리해 업로드/제출 로직을 한곳에 모은다.
// 토큰 = 비로그인 접근 권한. 라이브(env+토큰)면 실업로드/제출, 아니면 데모(목업).
import { useState, useRef, useEffect } from "react";
import { toast } from "../toast.jsx";
import { confirm } from "../confirm.jsx";
import { grabVideoFrame } from "../lib/media.js";
import { getToken, resolveLink, uploadAsset, submitLink, shareUrlFor } from "../lib/userLink.js";
import { BACKEND_LIVE } from "../lib/supabase.js";
import { useStore } from "../store.js";
import * as D from "../data.js";
import { parseMB } from "./parts.jsx";

const STEPS = D.USER_STEPS;
const TRANSITIONS = D.USER_TRANSITIONS; // 전환 효과 명칭은 data.js에서 단일 관리

export function useUserWizard() {
  const token = getToken();
  const liveMode = BACKEND_LIVE && !!token;
  const { company, partners } = useStore(); // 고객센터 문의처(본사 + 장례식장) — 설정에서 편집 → 하단 안내에 반영

  const [step, setStep] = useState(0);
  const [agreed, setAgreed] = useState(false);             // 정보보호(개인정보) 수집·이용 — 필수
  const [marketingAgreed, setMarketingAgreed] = useState(false); // 마케팅 활용 — 선택
  const [policyOpen, setPolicyOpen] = useState(false);     // 개인정보처리방침 전문 모달
  // 항상 빈 상태로 시작 — 보호자가 슬라이드 소스를 직접 업로드.
  const [uploads, setUploads] = useState([]);
  const [trans, setTrans] = useState(0);
  const [bgm, setBgm] = useState(0);
  const [letter, setLetter] = useState("");
  const [metDate, setMetDate] = useState("");   // 우리 처음 만난 날
  const [partDate, setPartDate] = useState(""); // 무지개다리 건넌 날
  const [titleSel, setTitleSel] = useState(0);
  const [transMap, setTransMap] = useState({});
  const [link, setLink] = useState({ mode: liveMode ? "live" : "demo", ok: true, token, petName: "", partnerName: "", status: "draft" });
  const [submitting, setSubmitting] = useState(false);
  const [videoStatus, setVideoStatus] = useState("queued");
  const fileRef = useRef(null);
  const aiFileRef = useRef(null);
  // 독사진 3장(AI 변환 전용) — 슬라이드 소스와 별개로 먼저 업로드.
  //   타이틀 1장 → GPT 이미지→이미지(영정 타이틀) · 나머지 2장 → Kling 이미지→영상(AI 추억 영상)
  const [aiPhotos, setAiPhotos] = useState([]); // 항상 빈 상태로 시작 — 보호자가 직접 3장 업로드
  const addAiPhoto = () => aiFileRef.current && aiFileRef.current.click();
  const onAiFiles = (e) => {
    const room = Math.max(0, 3 - aiPhotos.length); // 최대 3장
    const files = Array.from(e.target.files || []).slice(0, room);
    files.forEach((f, k) => {
      const id = "ai-" + Date.now() + "-" + k;
      setAiPhotos((p) => [...p, { id, name: f.name, thumb: f.type.startsWith("image") ? URL.createObjectURL(f) : undefined, uploading: liveMode, storagePath: null }]);
      uploadAsset(token, f, { kind: "photo" })
        .then((res) => setAiPhotos((p) => p.map((u) => (u.id === id ? { ...u, uploading: false, storagePath: res.storagePath } : u))))
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
      if (r.ok && r.status && r.status !== "draft") {
        setVideoStatus(r.status);
        setStep(STEPS.length - 1);
      }
    });
    return () => { alive = false; };
  }, [token]);

  const removeUpload = async (id) => {
    if (!(await confirm({ title: "파일 삭제", message: "이 파일을 삭제합니다.", danger: true }))) return;
    setUploads((p) => {
      const gone = p.find((u) => u.id === id);
      if (gone && gone.thumb && gone.thumb.startsWith("blob:")) URL.revokeObjectURL(gone.thumb);
      return p.filter((u) => u.id !== id);
    });
  };
  const addUpload = () => fileRef.current && fileRef.current.click();
  const onFiles = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach((f, k) => {
      const id = "u-" + Date.now() + "-" + k;
      const isVideo = f.type.startsWith("video");
      setUploads((p) => [
        ...p,
        {
          id,
          name: f.name,
          kind: isVideo ? "video" : "photo",
          size: (f.size / 1048576).toFixed(1) + "MB",
          thumb: f.type.startsWith("image") ? URL.createObjectURL(f) : undefined,
          uploading: liveMode,          // 라이브면 업로드 진행 표시
          storagePath: null,
        },
      ]);
      // 실제 스토리지 업로드(라이브). 끝나면 storagePath 부착, 실패 시 카드 제거 + 안내.
      uploadAsset(token, f, { kind: isVideo ? "video" : "photo" })
        .then((res) => setUploads((p) => p.map((u) => (u.id === id ? { ...u, uploading: false, storagePath: res.storagePath } : u))))
        .catch((err) => { setUploads((p) => p.filter((u) => u.id !== id)); toast(err.message || "업로드 실패"); });
      // 영상은 첫 프레임 캡처가 끝나면 해당 카드 썸네일만 비동기 갱신 (실패 시 아이콘 폴백 유지)
      if (isVideo) grabVideoFrame(f).then((thumb) => {
        if (thumb) setUploads((p) => p.map((u) => (u.id === id ? { ...u, thumb } : u)));
      });
    });
    e.target.value = "";
  };
  const setItemTrans = (id, idx) => setTransMap((m) => ({ ...m, [id]: idx }));
  // 전환만 무작위 배치 — 사진 순서는 그대로, 소스마다 전환 효과만 랜덤 지정
  const randomizeTrans = () => setTransMap(Object.fromEntries(uploads.map((u) => [u.id, Math.floor(Math.random() * TRANSITIONS.length)])));
  // 드래그로 소스 순서 변경 — fromId를 toId 위치로 이동
  const reorderUploads = (fromId, toId) => setUploads((p) => {
    if (!fromId || fromId === toId) return p;
    const arr = [...p];
    const from = arr.findIndex((u) => u.id === fromId);
    const to = arr.findIndex((u) => u.id === toId);
    if (from < 0 || to < 0) return p;
    arr.splice(to, 0, arr.splice(from, 1)[0]);
    return arr;
  });
  const totalMB = uploads.reduce((sum, u) => sum + parseMB(u.size), 0);
  const overLimit = totalMB > 100;
  const uploadingNow = uploads.some((u) => u.uploading);
  const shareUrl = shareUrlFor(link.token || token);

  // 위저드 입력 일괄 제출 → 렌더 큐잉(status=queued). 성공 시 완료 화면으로.
  const doSubmit = async () => {
    if (submitting) return;
    if (!(await confirm({ title: "제출하기", message: "입력한 내용으로 추모영상 제작을 제출합니다.\n제출 후에는 수정할 수 없습니다.", confirmLabel: "제출" }))) return;
    setSubmitting(true);
    // 독사진 3장 — 타이틀(GPT i2i) 1장 + AI 영상(Kling i2v) 2장. 슬라이드 소스와 함께 제출.
    const aiAssets = aiPhotos.map((u, i) => ({
      kind: "photo",
      role: i === titleSel ? "title" : "ai_video",
      engine: i === titleSel ? "gpt-image" : "kling",
      name: u.name, storagePath: u.storagePath, sortOrder: i,
    }));
    const assets = [
      ...aiAssets,
      ...uploads.map((u, i) => ({ kind: u.kind, role: "source", name: u.name, sizeMB: parseMB(u.size), storagePath: u.storagePath, sortOrder: i })),
    ];
    const res = await submitLink(link.token || token, {
      titleIndex: titleSel, transDefault: trans, transMap, bgmId: D.BGM[bgm]?.id, letter, metDate, partDate, assets,
      privacyAgreed: agreed, marketingAgreed,
    });
    setSubmitting(false);
    if (!res.ok) { toast(res.error || "제출에 실패했습니다. 다시 시도해 주세요."); return; }
    setVideoStatus(res.status || "queued");
    setStep(STEPS.length - 1);
  };

  // StepBody에 넘기는 화면 상태·핸들러 묶음
  const st = { agreed, setAgreed, marketingAgreed, setMarketingAgreed, uploads, removeUpload, addUpload, onFiles, fileRef, aiPhotos, addAiPhoto, onAiFiles, removeAiPhoto, aiFileRef, trans, setTrans, bgm, setBgm, letter, setLetter, metDate, setMetDate, partDate, setPartDate, titleSel, setTitleSel, transMap, setItemTrans, randomizeTrans, reorderUploads, totalMB, overLimit, link, shareUrl, videoStatus, company, openPolicy: () => setPolicyOpen(true) };

  const last = STEPS.length - 1;
  const previewStep = last - 1;
  // AI 변환: 독사진 3장 모두 업로드(+업로드 완료)해야 다음 단계로 진행 가능
  const blocked = (step === 0 && !agreed) || (step === 1 && (aiPhotos.length < 3 || aiUploadingNow)) || (step === 2 && (overLimit || uploadingNow)) || (step === previewStep && (submitting || uploadingNow));

  return { st, step, setStep, last, previewStep, blocked, submitting, liveMode, link, company, partners, doSubmit, policyOpen, setPolicyOpen };
}
