// ─────────────────────────────────────────────────────────────
// 목 DB — 클라이언트 인메모리 스토어 (백엔드 아님). data.js를 seed로 1회 적재.
// 모든 화면이 useStore()로 구독 → 한 곳에서 바꾸면 전 화면 전파.
// 본개발 시 actions 내부의 setState만 Supabase 호출로 교체하면 됨.
// ─────────────────────────────────────────────────────────────
import { useSyncExternalStore } from "react";
import * as D from "./data.js";
import { BACKEND_LIVE } from "./lib/supabase.js";
import { DEV_PREVIEW } from "./lib/auth.js";
import * as orgs from "./lib/data/orgs.js";
import * as resv from "./lib/data/reservations.js";
import * as sjobs from "./lib/data/secondjobs.js";
import * as tpl from "./lib/data/templates.js";
import * as settle from "./lib/data/settlements.js";
import * as cfg from "./lib/data/config.js";
import * as content from "./lib/data/content.js";
import * as system from "./lib/data/system.js";
import * as accountsData from "./lib/data/accounts.js";
import * as signage from "./lib/data/signage.js";
import * as roomsData from "./lib/data/rooms.js";
import * as locksData from "./lib/data/locks.js";
import * as storage from "./lib/storage.js";
import * as subs from "./lib/data/submissions.js";
import * as vids from "./lib/data/videos.js";
import * as promptsData from "./lib/data/prompts.js";
import { toast } from "./toast.jsx";

// 라이브(로그인+백엔드) = DB hydrate·write-through. DEV_PREVIEW = 기존 목업 시드.
// [Phase4 배선] 배선된 도메인만 라이브에서 빈 시드로 시작해 DB에서 채움.
// 아직 안 배선된 도메인은 라이브에서도 목업 시드 유지(슬라이스별로 순차 전환).
const LIVE = BACKEND_LIVE && !DEV_PREVIEW;

// 시드 사업부(메모리아웍스) — 기존 더미 데이터는 전부 이 사업부 소속.
const SEED_BIZ = D.BIZ_UNITS[0].id;

let state = {
  // 사업부 (최상위 테넌트) — 파트너사·고객·폼 등 모든 데이터가 bizUnit으로 묶임 [Phase4-1 배선]
  bizUnits: LIVE ? [] : D.BIZ_UNITS.map((b) => ({ ...b })),
  bizUnit: LIVE ? null : SEED_BIZ,                     // 현재 선택된 사업부(라이브는 hydrate 후 설정)
  termConfigs: {},                                     // 사업부별 용어 설정 { [bizId]: { [termKey]: { partner, user } } }
  userText: {},                                        // 사업부별 유저링크 텍스트 오버라이드 { [bizId]: { [key]: string } }
  userPhotos: {},                                      // 사업부별 예시 사진 오버라이드 { [bizId]: { good, bad } (dataURL) }
  reservations: LIVE ? [] : D.RESERVATIONS.map((r) => ({ ...r })),  // [Phase4-2 배선]
  accounts: LIVE ? [] : D.ADMIN_ACCOUNTS.map((a) => ({ ...a })),  // [Phase3b 배선]
  devices: LIVE ? [] : D.DEVICES.map((d) => ({ ...d })),  // [Phase4-6 배선]
  signageSources: LIVE ? [] : D.SIGNAGE_SOURCES.map((s) => ({ ...s })), // 표출 소스 [Phase4-6 배선]
  signageNotice: { ...D.SIGNAGE_NOTICE }, // 알림 문구(라이브=파트너 hydrate로 덮어씀, 없으면 이 기본값)
  currentPartnerId: null,                 // [Phase4-6] 파트너 세션의 partner_id(소스·알림 쓰기용)
  editLocks: [],                          // [Phase9] 편집기 동시편집 잠금 현황
  submissions: [],                        // [Phase5] 보호자 제작링크(예약↔submission)
  reservationMedia: {},                   // 예약별 보호자 업로드 자산(서명URL) — 편집기 미리보기용
  prompts: LIVE ? [] : (D.PROMPTS || []), // AI 프롬프트(ai_prompts) — 타이틀·AI영상 생성 문구

  videos: LIVE ? [] : D.FINAL_VIDEOS.map((v) => ({ ...v })),  // [QA-P1] 발행 영상(워커 렌더 산출물)
  secondJobs: LIVE ? [] : D.SECOND_EDIT_JOBS.map((j) => ({ ...j })),  // [Phase4-3 배선]
  storageClasses: LIVE ? [] : D.STORAGE.classes.map((c) => ({ ...c })),  // [Phase4-8 배선]
  templates: LIVE ? {} : {  // [Phase4-4 배선] 라이브는 hydrate로 채움
    // 기본 템플릿(__default__) — 신규 파트너 복제 원본 + 파트너별 { bgm, blocks }
    [D.DEFAULT_TEMPLATE_ID]: { bgm: D.DEFAULT_TEMPLATE.bgm, blocks: D.DEFAULT_TEMPLATE.blocks.map((b) => ({ ...b })) },
    ...Object.fromEntries(Object.entries(D.TEMPLATE_ASSIGN).map(([k, v]) => [k, { bgm: v.bgm, blocks: v.blocks.map((b) => ({ ...b })) }])),
  },
  formConfigs: LIVE ? {} : Object.fromEntries(Object.entries(D.FORM_CONFIGS).map(([k, v]) => [k, Object.fromEntries(Object.entries(v).map(([fk, fv]) => [fk, { ...fv }]))])), // 파트너별 폼 선택항목 설정 [Phase4-7 배선]
  rooms: LIVE ? [] : D.ROOMS.map((r) => ({ ...r })),   // 호실 [Phase4-1b 배선] — 파트너 세션에서 hydrate
  partners: LIVE ? [] : D.PARTNERS.map((p) => ({ ...p, bizUnit: p.bizUnit || SEED_BIZ })),  // 파트너사 [Phase4-1 배선]

  settlementItems: LIVE ? [] : D.SETTLEMENT_ITEMS.map((i) => ({ ...i })), // 정산 매출 건 [Phase4-5 배선]
  settlementDeposits: LIVE ? [] : D.SETTLEMENT_DEPOSITS.map((d) => ({ ...d })), // 입금 내역 [Phase4-5b 배선]
  statements: LIVE ? [] : D.STATEMENTS.map((x) => ({ ...x })),                 // 거래명세서 [Phase4-5b 배선]
  content: LIVE ? [] : D.CONTENT.map((c) => ({ ...c })),  // 콘텐츠 허브 자산 [Phase4-4b 배선]
  company: { ...D.COMPANY },                            // 회사정보 — 고객센터 연락처 등 편집값(설정 ↔ 유저링크 공유)
};

// 정산 매출 건 식별 키 (ymd·항목명) — store 액션과 admin UI가 공유(단일 정의).
export const siKey = (it) => it.ymd + "·" + it.deceased;

const listeners = new Set();
const getSnapshot = () => state;            // 상태 미변경 시 동일 참조 → 무한루프 방지
const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l); };
// patch: 부분 객체 또는 (prev)=>부분 객체. 매 변경마다 새 최상위 state 객체 생성.
function set(patch) {
  const next = typeof patch === "function" ? patch(state) : patch;
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

// 전체 상태 구독 (컴포넌트에서 필요한 부분만 구조분해 후 로컬 가공)
export function useStore() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

// ── 사업부 스코핑 헬퍼 ─────────────────────────────────────────
// 현재 사업부의 파트너사 목록. (예약/고객은 partner 이름으로 연결되므로 이름 집합도 함께)
export const bizPartners = (s) => s.partners.filter((p) => p.bizUnit === s.bizUnit);
export const bizPartnerNames = (s) => new Set(bizPartners(s).map((p) => p.name));
// 현재 사업부 예약(고객) — 소속 파트너의 예약만
export const bizReservations = (s) => { const names = bizPartnerNames(s); return s.reservations.filter((r) => names.has(r.partner)); };
// [QA-P1] 파트너 정산 집계(매출건·청구·입금·미수금) — 단일 기준(대시보드·파트너상세·정산 공용).
export const partnerSettle = (s, partnerName) => {
  const items = s.settlementItems.filter((i) => i.partner === partnerName);
  const billed = items.reduce((a, i) => a + i.amount, 0);
  const paid = s.settlementDeposits.filter((d) => d.partner === partnerName).reduce((a, d) => a + d.amount, 0);
  return { count: items.length, billed, paid, unpaid: billed - paid };
};
// [QA-P1] 예약의 보호자 제작링크(submission) 조회 — 고객상세·예약상세 공용.
export const submissionFor = (s, reservationId) => s.submissions.find((x) => x.reservationId === reservationId) || null;
// [QA] 예약의 발행 영상(videos) 조회 — 다운로드(서명URL) 대상.
export const videoFor = (s, reservationId) => s.videos.find((x) => x.reservationId === reservationId) || null;
// 현재 사업부 전체 정산 합계.
export const bizSettleTotals = (s) => bizPartners(s).reduce((acc, p) => {
  const r = partnerSettle(s, p.name);
  return { billed: acc.billed + r.billed, paid: acc.paid + r.paid, unpaid: acc.unpaid + r.unpaid };
}, { billed: 0, paid: 0, unpaid: 0 });
// 사업부 용어 조회 — 설정값 없으면 기본 용어. (파트너 콘솔·유저 링크 라벨이 이걸 쓰면 텍스트만 사업부별로 바뀜)
export const term = (s, key, side, bizId = s.bizUnit) => {
  const def = D.TERMS.find((t) => t.key === key);
  return s.termConfigs[bizId]?.[key]?.[side] ?? (def ? def[side] : key);
};
// 유저링크 텍스트 조회 — 사업부 오버라이드 있으면 그걸, 없으면 기본값(D.USER_TEXT).
export const userTextOf = (s, bizId = s.bizUnit) => ({ ...D.USER_TEXT, ...(s.userText[bizId] || {}) });

const mapById = (arr, id, patch) => arr.map((x) => (x.id === id ? { ...x, ...patch } : x));

export const actions = {
  // [Phase4-1] 라이브 부팅 시 DB에서 사업부·파트너 적재(AuthGate가 staff 로그인 후 호출).
  hydrateOrgs: ({ bizUnits, partners }) => set((s) => ({
    bizUnits,
    bizUnit: s.bizUnit || bizUnits[0]?.id || null,
    partners,
  })),
  // [Phase4-2] 예약 적재.
  hydrateReservations: (reservations) => set({ reservations }),
  // [Phase4-3] 2차 가공 적재.
  hydrateSecondJobs: (secondJobs) => set({ secondJobs }),
  // [Phase4-4] 영상 템플릿 적재.
  hydrateTemplates: (templates) => set({ templates }),
  // [Phase4-4b] 콘텐츠 허브 적재.
  hydrateContent: (content) => set({ content }),
  // [Phase4-8] 스토리지 보존정책 적재.
  hydrateStorageClasses: (storageClasses) => set({ storageClasses }),
  // [Phase3b] 관리자 계정(staff) 적재.
  hydrateAccounts: (accounts) => set({ accounts }),
  // [Phase4-6] 사이니지 디바이스 적재.
  hydrateDevices: (devices) => set({ devices }),
  // [Phase4-1b] 호실 적재(파트너 세션).
  hydrateRooms: (rooms) => set({ rooms }),
  // [Phase5] 보호자 제작링크 적재 + 발급(예약→토큰). 반환: 발급된 submission(토큰 포함).
  hydrateSubmissions: (submissions) => set({ submissions }),
  // AI 프롬프트 관리(ai_prompts) — 타깃별 목록·CRUD·활성 선택. 생성에 활성 프롬프트 사용.
  hydratePrompts: (prompts) => set({ prompts }),
  savePrompt: (p) => {
    if (!LIVE) { set((s) => ({ prompts: p.id && s.prompts.some((x) => x.id === p.id) ? s.prompts.map((x) => x.id === p.id ? { ...x, ...p } : x) : [...s.prompts, { ...p, id: p.id || "pr-" + Date.now() }] })); return; }
    promptsData.upsertPrompt(p)
      .then((saved) => set((s) => ({ prompts: s.prompts.some((x) => x.id === saved.id) ? s.prompts.map((x) => x.id === saved.id ? saved : x) : [...s.prompts, saved] })))
      .catch((e) => toast("프롬프트 저장 실패: " + e.message));
  },
  removePrompt: (id) => {
    set((s) => ({ prompts: s.prompts.filter((x) => x.id !== id) }));
    if (LIVE) promptsData.deletePrompt(id).catch((e) => toast("프롬프트 삭제 실패: " + e.message));
  },
  setPromptActive: (id, target) => {
    set((s) => ({ prompts: s.prompts.map((x) => x.target === target ? { ...x, active: x.id === id } : x) }));
    if (LIVE) promptsData.setActivePrompt(id, target).catch((e) => toast("활성 설정 실패: " + e.message));
  },
  // 단일 블록 AI 재생성 — 워커가 해당 블록만 재생성(타이틀/AI영상).
  regenBlock: (reservationId, target) => {
    if (!LIVE || !reservationId) return;
    subs.regenBlock(reservationId, target).catch((e) => toast("재생성 요청 실패: " + e.message));
  },
  // 최종 합성 요청 — 워커가 블록 결과물로 최종 영상 합성(관리자 「최종 렌더」).
  requestCompose: (reservationId) => {
    if (!LIVE || !reservationId) return;
    subs.requestCompose(reservationId).catch((e) => toast("합성 요청 실패: " + e.message));
  },
  // 편집기용 보호자 자산(서명URL) — 예약별 캐시. 편집기 진입 시 로드.
  loadReservationMedia: (reservationId) => {
    if (!LIVE || !reservationId) return;
    subs.fetchReservationMedia(reservationId)
      .then((m) => set((s) => ({ reservationMedia: { ...s.reservationMedia, [reservationId]: m } })))
      .catch(() => {});
  },
  // [QA-P1] 발행 영상 적재(staff/collab — 기간별 다운로드·용량).
  hydrateVideos: (videos) => set({ videos }),
  issueSubmission: (reservation) => {
    if (LIVE) {
      return subs.issueSubmission({ reservationId: reservation.id, petName: reservation.deceased, partnerName: reservation.partner })
        .then((sub) => { set((s) => ({ submissions: [...s.submissions, sub] })); return sub; })
        .catch((e) => { toast("링크 생성 실패: " + e.message); throw e; });
    }
    const sub = { id: "sub-" + Date.now(), token: Math.random().toString(36).slice(2, 12), reservationId: reservation.id, petName: reservation.deceased, partnerName: reservation.partner, status: "draft" };
    set((s) => ({ submissions: [...s.submissions, sub] }));
    return Promise.resolve(sub);
  },
  // [Phase9] 편집기 잠금 현황 적재/갱신(라이브만) + master 강제해제.
  hydrateLocks: (editLocks) => set({ editLocks }),
  refreshLocks: () => { if (!LIVE) return; locksData.fetchLocks().then((l) => set({ editLocks: l })).catch(() => {}); },
  // 편집·컨펌 큐 최신화 — 워커 렌더 진행/완료(submission·video·reservation)를 주기 폴링으로 반영.
  refreshProduction: () => {
    if (!LIVE) return;
    Promise.all([resv.fetchReservations(), subs.fetchSubmissions(), vids.fetchVideos()])
      .then(([reservations, submissions, videos]) => set({ reservations, submissions, videos }))
      .catch(() => {});
  },
  forceReleaseEditLock: (kind, id) => {
    if (!LIVE) { set((s) => ({ editLocks: s.editLocks.filter((l) => !(l.targetKind === kind && l.targetId === id)) })); return; }
    locksData.releaseLock(kind, id).then(() => actions.refreshLocks()).catch((e) => toast("강제 해제 실패: " + e.message));
  },
  // [Phase4-6] 사이니지 소스·알림 적재(파트너 세션) + 현재 파트너 id.
  setCurrentPartner: (id) => set({ currentPartnerId: id }),
  hydrateSignage: ({ sources, notice }) => set((s) => ({ signageSources: sources, signageNotice: notice || s.signageNotice })),
  // [Phase4-5] 정산 매출 건 적재.
  hydrateSettlementItems: (settlementItems) => set({ settlementItems }),
  // [Phase4-5b] 입금·명세서 적재.
  hydrateSettlementExtra: ({ deposits, statements }) => set({ settlementDeposits: deposits, statements }),
  // [Phase4-7] 설정(회사·용어·유저문구·폼) 적재.
  hydrateConfig: ({ company, termConfigs, userText, formConfigs, userPhotos }) => set((s) => ({
    company: { ...s.company, ...company }, termConfigs, userText, formConfigs, userPhotos: userPhotos || {},
  })),

  // 사업부 (최상위 테넌트) — 전환 시 파트너사·고객·폼 등 전 데이터가 해당 사업부로 스코핑
  setBizUnit: (id) => set({ bizUnit: id }),
  addBizUnit: (name) => {
    if (LIVE) {
      orgs.createBizUnit(name)
        .then((b) => set((s) => ({ bizUnits: [...s.bizUnits, b], bizUnit: b.id })))
        .catch((e) => toast("사업부 추가 실패: " + e.message));
      return;
    }
    set((s) => { const id = "biz-" + Date.now(); return { bizUnits: [...s.bizUnits, { id, name }], bizUnit: id }; }); // 추가 즉시 선택
  },
  // 사업부 용어 설정 (파트너 콘솔·유저 링크 노출 텍스트 — bizId·termKey별 patch) [Phase4-7 배선]
  setTermConfig: (bizId, key, patch) => {
    const merged = { ...(state.termConfigs[bizId]?.[key] || {}), ...patch };
    const apply = (s) => ({ termConfigs: { ...s.termConfigs, [bizId]: { ...(s.termConfigs[bizId] || {}), [key]: merged } } });
    if (LIVE) { cfg.upsertTerm(bizId, key, merged).then(() => set(apply)).catch((e) => toast("용어 저장 실패: " + e.message)); return; }
    set(apply);
  },
  // 사업부별 유저링크 텍스트 오버라이드 (key별). value가 기본값과 같으면 오버라이드 제거. [Phase4-7 배선]
  setUserText: (bizId, key, value) => {
    const isDefault = value === D.USER_TEXT[key];
    const apply = (s) => { const cur = { ...(s.userText[bizId] || {}) }; if (isDefault) delete cur[key]; else cur[key] = value; return { userText: { ...s.userText, [bizId]: cur } }; };
    if (LIVE) {
      (isDefault ? cfg.deleteUserText(bizId, key) : cfg.upsertUserText(bizId, key, value))
        .then(() => set(apply)).catch((e) => toast("문구 저장 실패: " + e.message));
      return;
    }
    set(apply);
  },
  // 사업부별 예시 사진 (good/bad) — dataURL. null이면 기본 사진으로 복원. [QA] DB 영속화.
  setUserPhoto: (bizId, key, dataUrl) => {
    const apply = (s) => { const cur = { ...(s.userPhotos[bizId] || {}) }; if (dataUrl) cur[key] = dataUrl; else delete cur[key]; return { userPhotos: { ...s.userPhotos, [bizId]: cur } }; };
    if (LIVE) {
      (dataUrl ? cfg.upsertUserPhoto(bizId, key, dataUrl) : cfg.deleteUserPhoto(bizId, key))
        .then(() => set(apply)).catch((e) => toast("예시사진 저장 실패: " + e.message));
      return;
    }
    set(apply);
  },

  // 예약 (편집·컨펌 큐 ↔ 고객관리 ↔ 정산 ↔ 사이니지 공유) [Phase4-2 배선]
  // [QA-P0] 예약접수(intake) 실배선. 신규 예약 생성 → store/DB 반영. 반환: 생성된 예약(id 포함).
  addReservation: (data) => {
    const id = data.id || ("R-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5));
    const base = { status: "review", requestedAt: new Date().toISOString(), ...data, id };
    if (LIVE) {
      const partnerId = base.partnerId || state.currentPartnerId;
      return resv.createReservation({ ...base, partnerId })
        .then((r) => { set((s) => ({ reservations: [...s.reservations, r] })); return r; })
        .catch((e) => { toast("예약 접수 실패: " + e.message); throw e; });
    }
    const r = { partner: base.partner, ...base };
    set((s) => ({ reservations: [...s.reservations, r] }));
    return Promise.resolve(r);
  },
  setReservationStatus: (id, status) => actions.updateReservation(id, { status }),
  setReservationAssignee: (id, assignee) => actions.updateReservation(id, { assignee }),
  setReservationRoom: (id, room) => actions.updateReservation(id, { room }),
  updateReservation: (id, patch) => {
    if (LIVE) {
      resv.updateReservation(id, patch)
        .then((r) => set((s) => ({ reservations: mapById(s.reservations, id, r) })))
        .catch((e) => toast("예약 저장 실패: " + e.message));
      return;
    }
    set((s) => ({ reservations: mapById(s.reservations, id, patch) }));
  },
  removeReservation: (id) => {
    if (LIVE) {
      resv.deleteReservations([id])
        .then(() => set((s) => ({ reservations: s.reservations.filter((r) => r.id !== id) })))
        .catch((e) => toast("예약 삭제 실패: " + e.message));
      return;
    }
    set((s) => ({ reservations: s.reservations.filter((r) => r.id !== id) }));
  },
  removeReservations: (ids) => {
    if (LIVE) {
      resv.deleteReservations(ids)
        .then(() => set((s) => { const rm = new Set(ids); return { reservations: s.reservations.filter((r) => !rm.has(r.id)) }; }))
        .catch((e) => toast("예약 삭제 실패: " + e.message));
      return;
    }
    set((s) => { const rm = new Set(ids); return { reservations: s.reservations.filter((r) => !rm.has(r.id)) }; });
  },

  // 회사정보 (고객센터 연락처 등 — 환경설정에서 편집 → 유저링크 문의처에 반영) [Phase4-7 배선]
  updateCompany: (patch) => {
    if (LIVE) {
      cfg.updateCompany(patch).then((co) => set((s) => ({ company: { ...s.company, ...co } }))).catch((e) => toast("회사정보 저장 실패: " + e.message));
      return;
    }
    set((s) => ({ company: { ...s.company, ...patch } }));
  },

  // 관리자 계정 [Phase3b 배선] — 생성/삭제는 edge function, 수정은 staff DB(master RLS).
  addAccount: (acct) => {
    if (LIVE) {
      accountsData.provisionStaff({ name: acct.name, loginId: acct.loginId, role: acct.role, perms: acct.perms })
        .then((r) => set((s) => ({ accounts: [...s.accounts, {
          id: r.authUserId, name: acct.name, loginId: acct.loginId,
          email: `${acct.loginId}@staff.memoriaworks.kr`, phone: "—",
          role: acct.role, status: "active", perms: acct.perms || [], lastLogin: "—",
        }] })))
        .catch((e) => toast("계정 발급 실패: " + e.message));
      return;
    }
    set((s) => ({ accounts: [...s.accounts, acct] }));
  },
  updateAccount: (id, patch) => {
    if (LIVE) {
      accountsData.updateStaff(id, patch)
        .then((a) => set((s) => ({ accounts: mapById(s.accounts, id, a) })))
        .catch((e) => toast("계정 수정 실패: " + e.message));
      return;
    }
    set((s) => ({ accounts: mapById(s.accounts, id, patch) }));
  },
  removeAccount: (id) => {
    if (LIVE) {
      accountsData.deleteAccount(id)
        .then(() => set((s) => ({ accounts: s.accounts.filter((a) => a.id !== id) })))
        .catch((e) => toast("계정 삭제 실패: " + e.message));
      return;
    }
    set((s) => ({ accounts: s.accounts.filter((a) => a.id !== id) }));
  },
  setAccountPerms: (id, perms) => {
    if (LIVE) {
      accountsData.updateStaff(id, { perms })
        .then((a) => set((s) => ({ accounts: mapById(s.accounts, id, a) })))
        .catch((e) => toast("권한 저장 실패: " + e.message));
      return;
    }
    set((s) => ({ accounts: mapById(s.accounts, id, { perms }) }));
  },
  toggleAccountPerm: (id, key) => {
    const cur = state.accounts.find((a) => a.id === id);
    const perms = (cur?.perms || []).includes(key) ? cur.perms.filter((p) => p !== key) : [...(cur?.perms || []), key];
    if (LIVE) { actions.setAccountPerms(id, perms); return; }
    set((s) => ({ accounts: mapById(s.accounts, id, { perms }) }));
  },

  // 사이니지 디바이스 (파트너 라이브 컨트롤 ↔ 관리자 사이니지 공유) [Phase4-6 배선]
  //   mode/volume/muted는 DB 반영. play(재생/정지)는 전송제어 상태라 store 전용(실제 제어=Phase8).
  setDeviceMode: (id, mode) => {
    if (LIVE) { signage.updateDevice(id, { mode }).then(() => set((s) => ({ devices: mapById(s.devices, id, { mode }) }))).catch((e) => toast("모드 저장 실패: " + e.message)); return; }
    set((s) => ({ devices: mapById(s.devices, id, { mode }) }));
  },
  setDevicePlay: (id, play) => set((s) => ({ devices: mapById(s.devices, id, { play }) })),
  setDeviceVolume: (id, volume) => {
    if (LIVE) { signage.updateDevice(id, { volume, muted: volume === 0 }).then(() => set((s) => ({ devices: mapById(s.devices, id, { volume, muted: volume === 0 }) }))).catch((e) => toast("음량 저장 실패: " + e.message)); return; }
    set((s) => ({ devices: mapById(s.devices, id, { volume, muted: volume === 0 }) }));
  },
  setDeviceMuted: (id, muted) => {
    if (LIVE) { signage.updateDevice(id, { muted }).then(() => set((s) => ({ devices: mapById(s.devices, id, { muted }) }))).catch((e) => toast("음소거 저장 실패: " + e.message)); return; }
    set((s) => ({ devices: mapById(s.devices, id, { muted }) }));
  },

  // 사이니지 표출 소스 (광고·대기·알림) — 파트너별 [Phase4-6 배선]
  addSignageSource: (src) => {
    if (LIVE) {
      const pid = state.currentPartnerId;
      if (!pid) { toast("파트너 컨텍스트가 없습니다."); return; }
      const finish = (storagePath) => signage.addSource(pid, { ...src, storagePath })
        .then((a) => set((s) => ({ signageSources: [...s.signageSources, a] })))
        .catch((e) => toast("소스 추가 실패: " + e.message));
      if (src.fileObj) {  // 실제 파일 업로드(memoria-content, 파트너 폴더) → 경로 저장
        const path = `${pid}/signage/${src.id}.${storage.extOf(src.fileObj.name)}`;
        storage.uploadFile(storage.BUCKETS.content, path, src.fileObj).then(() => finish(path)).catch((e) => toast("업로드 실패: " + e.message));
      } else { finish(null); }
      return;
    }
    set((s) => ({ signageSources: [...s.signageSources, src] }));
  },
  removeSignageSource: (id) => {
    if (LIVE) {
      const sp = state.signageSources.find((x) => x.id === id)?.storagePath;
      signage.removeSource(id)
        .then(() => {
          set((s) => ({ signageSources: s.signageSources.filter((x) => x.id !== id) }));
          if (sp) storage.removeFiles(storage.BUCKETS.content, [sp]).catch(() => {}); // 스토리지 파일 정리(best-effort)
        })
        .catch((e) => toast("소스 삭제 실패: " + e.message));
      return;
    }
    set((s) => ({ signageSources: s.signageSources.filter((x) => x.id !== id) }));
  },
  // 카테고리당 1개만 표출 — 같은 cat의 다른 소스는 자동 해제. 선택된 걸 다시 누르면 해제.
  selectSignageSource: (id) => {
    const t = state.signageSources.find((x) => x.id === id);
    if (!t) return;
    const on = !t.active;
    const apply = (s) => ({ signageSources: s.signageSources.map((x) => x.cat !== t.cat ? x : { ...x, active: x.id === id ? on : false }) });
    if (LIVE) {
      signage.selectSource(state.currentPartnerId, id, t.cat, on)
        .then(() => set(apply)).catch((e) => toast("소스 선택 실패: " + e.message));
      return;
    }
    set(apply);
  },
  setSignageNotice: (patch) => {
    const merged = { ...state.signageNotice, ...patch };
    if (LIVE) {
      signage.upsertNotice(state.currentPartnerId, merged)
        .then(() => set({ signageNotice: merged })).catch((e) => toast("알림 저장 실패: " + e.message));
      return;
    }
    set({ signageNotice: merged });
  },

  // 2차 가공 큐 [Phase4-3 배선]
  addSecondJob: (job) => {
    if (LIVE) {
      sjobs.createSecondJob(job)
        .then((j) => set((s) => ({ secondJobs: [...s.secondJobs, j] })))
        .catch((e) => toast("2차 가공 추가 실패: " + e.message));
      return;
    }
    set((s) => ({ secondJobs: [...s.secondJobs, job] }));
  },
  setSecondJobStatus: (id, status) => actions.updateSecondJob(id, { status }),
  setSecondJobAssignee: (id, assignee) => actions.updateSecondJob(id, { assignee }),
  updateSecondJob: (id, patch) => {
    if (LIVE) {
      sjobs.updateSecondJob(id, patch)
        .then((j) => set((s) => ({ secondJobs: mapById(s.secondJobs, id, j) })))
        .catch((e) => toast("2차 가공 저장 실패: " + e.message));
      return;
    }
    set((s) => ({ secondJobs: mapById(s.secondJobs, id, patch) }));
  },
  removeSecondJob: (id) => {
    if (LIVE) {
      sjobs.deleteSecondJob(id)
        .then(() => set((s) => ({ secondJobs: s.secondJobs.filter((j) => j.id !== id) })))
        .catch((e) => toast("2차 가공 삭제 실패: " + e.message));
      return;
    }
    set((s) => ({ secondJobs: s.secondJobs.filter((j) => j.id !== id) }));
  },

  // 스토리지 보존 정책 [Phase4-8 배선]
  setRetention: (key, retention) => {
    if (LIVE) {
      system.setRetention(key, retention)
        .then(() => set((s) => ({ storageClasses: s.storageClasses.map((c) => (c.key === key ? { ...c, retention } : c)) })))
        .catch((e) => toast("보존정책 저장 실패: " + e.message));
      return;
    }
    set((s) => ({ storageClasses: s.storageClasses.map((c) => (c.key === key ? { ...c, retention } : c)) }));
  },

  // 영상 템플릿 (파트너별 요소 구성·순서 + BGM 편집) [Phase4-4 배선]
  setTemplateBgm: (pid, bgm) => {
    const next = { ...(state.templates[pid] || { bgm: null, blocks: [] }), bgm };
    if (LIVE) {
      tpl.upsertTemplate(pid, next)
        .then(() => set((s) => ({ templates: { ...s.templates, [pid]: next } })))
        .catch((e) => toast("BGM 저장 실패: " + e.message));
      return;
    }
    set((s) => ({ templates: { ...s.templates, [pid]: next } }));
  },
  setTemplateBlocks: (pid, blocks) => {
    const next = { ...(state.templates[pid] || { bgm: null, blocks: [] }), blocks };
    if (LIVE) {
      tpl.upsertTemplate(pid, next)
        .then(() => set((s) => ({ templates: { ...s.templates, [pid]: next } })))
        .catch((e) => toast("템플릿 저장 실패: " + e.message));
      return;
    }
    set((s) => ({ templates: { ...s.templates, [pid]: next } }));
  },

  // 콘텐츠 허브 자산 (즉시 추가 → 템플릿 클립 드롭다운·허브에 즉시 반영) [Phase4-4b 배선]
  addContent: (asset) => {
    if (LIVE) {
      if (asset.kind === "audio") { toast("음악(BGM) 추가는 추후 지원됩니다."); return; }
      const pid = asset.shared ? null : state.partners.find((p) => p.name === asset.partner)?.id;
      if (!asset.shared && !pid) { toast("파트너를 찾을 수 없습니다."); return; }
      const insert = (storagePath, size) => content.addContent({ ...asset, storagePath, size: size || asset.size }, pid)
        .then((a) => set((s) => ({ content: [a, ...s.content] })))
        .catch((e) => toast("자산 추가 실패: " + e.message));
      if (asset.file) {
        const path = `${asset.shared ? "shared" : pid}/${asset.id}.${storage.extOf(asset.file.name)}`;
        const size = `${(asset.file.size / 1048576).toFixed(1)}MB`;
        storage.uploadFile(storage.BUCKETS.content, path, asset.file).then(() => insert(path, size)).catch((e) => toast("업로드 실패: " + e.message));
      } else { insert(null); }
      return;
    }
    set((s) => ({ content: [asset, ...s.content] }));
  },
  removeContent: (id) => {
    if (LIVE) {
      content.deleteContent(id)
        .then(() => set((s) => ({ content: s.content.filter((c) => c.id !== id) })))
        .catch((e) => toast("자산 삭제 실패: " + e.message));
      return;
    }
    set((s) => ({ content: s.content.filter((c) => c.id !== id) }));
  },

  // 유저 입력 폼 (파트너별 선택항목 설정 — key별 patch) [Phase4-7 배선]
  setFormConfig: (pid, key, patch) => {
    const merged = { ...(state.formConfigs[pid]?.[key] || {}), ...patch };
    const apply = (s) => ({ formConfigs: { ...s.formConfigs, [pid]: { ...(s.formConfigs[pid] || {}), [key]: merged } } });
    if (LIVE) { cfg.upsertForm(pid, key, merged).then(() => set(apply)).catch((e) => toast("폼 설정 저장 실패: " + e.message)); return; }
    set(apply);
  },

  // 호실 (명칭·위치 편집 — 파트너 대시보드) [Phase4-1b 배선]
  setRoom: (id, patch) => {
    if (LIVE) {
      roomsData.updateRoom(id, patch).then((r) => set((s) => ({ rooms: mapById(s.rooms, id, r) }))).catch((e) => toast("호실 저장 실패: " + e.message));
      return;
    }
    set((s) => ({ rooms: mapById(s.rooms, id, patch) }));
  },

  // 파트너사 건당 단가 + 신규 등록 [Phase4-1 배선]
  setPartnerPrice: (id, unitPrice) => {
    if (LIVE) {
      orgs.updatePartner(id, { unitPrice })
        .then((p) => set((s) => ({ partners: mapById(s.partners, id, p) })))
        .catch((e) => toast("단가 저장 실패: " + e.message));
      return;
    }
    set((s) => ({ partners: mapById(s.partners, id, { unitPrice }) }));
  },
  // 신규 등록 시 기본 템플릿(__default__)을 복제해 시작 → 0에서 세팅하지 않고 수정하는 방향
  addPartner: (partner) => {
    if (LIVE) {
      // 현재 사업부 소속으로 등록 + 기본 템플릿(__default__) 복제.
      orgs.createPartner({ ...partner, bizUnit: state.bizUnit })
        .then(async (p) => {
          const def = state.templates[D.DEFAULT_TEMPLATE_ID] || { bgm: null, blocks: [] };
          const cloned = { bgm: def.bgm, blocks: def.blocks.map((b, i) => ({ ...b, id: "e-" + Date.now() + "-" + i })) };
          // 로그인 계정 발급(임시비번=ID코드) — 등록 즉시 파트너가 로그인 가능하도록.
          try { await accountsData.provisionPartner(p.id); } catch (e) { toast("로그인 계정 발급 실패(파트너 등록은 완료): " + e.message); }
          try { await tpl.upsertTemplate(p.id, cloned); } catch (e) { toast("템플릿 생성 실패: " + e.message); }
          try { await roomsData.createRoomsForPartner(p.id, partner.rooms); } catch (e) { toast("호실 생성 실패: " + e.message); }
          set((s) => ({ partners: [...s.partners, p], templates: { ...s.templates, [p.id]: cloned } }));
        })
        .catch((e) => toast("파트너 등록 실패: " + e.message));
      return;
    }
    set((s) => {
      const def = s.templates[D.DEFAULT_TEMPLATE_ID] || { bgm: null, blocks: [] };
      const cloned = { bgm: def.bgm, blocks: def.blocks.map((b, i) => ({ ...b, id: "e-" + Date.now() + "-" + i })) };
      return { partners: [...s.partners, { ...partner, bizUnit: s.bizUnit }], templates: { ...s.templates, [partner.id]: cloned } };
    });
  },
  updatePartner: (id, patch) => {
    if (LIVE) {
      orgs.updatePartner(id, patch)
        .then((p) => set((s) => ({ partners: mapById(s.partners, id, p) })))
        .catch((e) => toast("파트너 저장 실패: " + e.message));
      return;
    }
    set((s) => ({ partners: mapById(s.partners, id, patch) }));
  },

  // 정산 매출 건 (추가·금액수정·삭제) [Phase4-5 배선]
  addSettlementItem: (item) => {
    if (LIVE) {
      const pid = state.partners.find((p) => p.name === item.partner)?.id;
      if (!pid) { toast("파트너를 찾을 수 없습니다."); return; }
      settle.addItem(pid, item)
        .then((it) => set((s) => ({ settlementItems: [...s.settlementItems, it] })))
        .catch((e) => toast("매출 추가 실패: " + e.message));
      return;
    }
    set((s) => ({ settlementItems: [...s.settlementItems, item] }));
  },
  updateSettlementItem: (key, patch) => {
    if (LIVE) {
      const cur = state.settlementItems.find((i) => siKey(i) === key);
      if (!cur?.id) { set((s) => ({ settlementItems: s.settlementItems.map((i) => (siKey(i) === key ? { ...i, ...patch } : i)) })); return; }
      settle.updateItem(cur.id, patch)
        .then((it) => set((s) => ({ settlementItems: s.settlementItems.map((i) => (siKey(i) === key ? it : i)) })))
        .catch((e) => toast("매출 수정 실패: " + e.message));
      return;
    }
    set((s) => ({ settlementItems: s.settlementItems.map((i) => (siKey(i) === key ? { ...i, ...patch } : i)) }));
  },
  removeSettlementItem: (key) => {
    if (LIVE) {
      const cur = state.settlementItems.find((i) => siKey(i) === key);
      const after = () => set((s) => ({ settlementItems: s.settlementItems.filter((i) => siKey(i) !== key) }));
      if (!cur?.id) { after(); return; }
      settle.deleteItem(cur.id).then(after).catch((e) => toast("매출 삭제 실패: " + e.message));
      return;
    }
    set((s) => ({ settlementItems: s.settlementItems.filter((i) => siKey(i) !== key) }));
  },

  // 정산 입금 내역 [Phase4-5b 배선]
  addDeposit: (dp) => {
    if (LIVE) {
      const pid = state.partners.find((p) => p.name === dp.partner)?.id;
      if (!pid) { toast("파트너를 찾을 수 없습니다."); return; }
      settle.addDeposit(pid, dp).then((d) => set((s) => ({ settlementDeposits: [...s.settlementDeposits, d] }))).catch((e) => toast("입금 추가 실패: " + e.message));
      return;
    }
    set((s) => ({ settlementDeposits: [...s.settlementDeposits, dp] }));
  },
  updateDeposit: (id, patch) => {
    if (LIVE) {
      settle.updateDeposit(id, patch).then((d) => set((s) => ({ settlementDeposits: s.settlementDeposits.map((x) => x.id === id ? d : x) }))).catch((e) => toast("입금 수정 실패: " + e.message));
      return;
    }
    set((s) => ({ settlementDeposits: s.settlementDeposits.map((x) => x.id === id ? { ...x, ...patch } : x) }));
  },
  removeDeposit: (id) => {
    if (LIVE) {
      settle.deleteDeposit(id).then(() => set((s) => ({ settlementDeposits: s.settlementDeposits.filter((x) => x.id !== id) }))).catch((e) => toast("입금 삭제 실패: " + e.message));
      return;
    }
    set((s) => ({ settlementDeposits: s.settlementDeposits.filter((x) => x.id !== id) }));
  },
  addStatement: (st) => {
    if (LIVE) {
      const pid = state.partners.find((p) => p.name === st.partner)?.id;
      if (!pid) { toast("파트너를 찾을 수 없습니다."); return; }
      settle.addStatement(pid, st).then((x) => set((s) => ({ statements: [x, ...s.statements] }))).catch((e) => toast("명세서 발행 실패: " + e.message));
      return;
    }
    set((s) => ({ statements: [st, ...s.statements] }));
  },

  // ── 일괄 커밋(저장 버튼) — 초안을 한 번에 반영 ──
  replaceTemplates: (templates) => {                                            // 영상 템플릿 전체 교체(저장 버튼) [Phase4-4]
    if (LIVE) {
      tpl.upsertMany(templates)
        .then(() => set({ templates }))
        .catch((e) => toast("템플릿 저장 실패: " + e.message));
      return;
    }
    set({ templates });
  },
  setPartnerPrices: (priceMap) => {
    if (LIVE) {
      Promise.all(Object.entries(priceMap).filter(([, v]) => v != null)
        .map(([id, unitPrice]) => orgs.updatePartner(id, { unitPrice })))
        .then(() => set((s) => ({ partners: s.partners.map((p) => (priceMap[p.id] != null ? { ...p, unitPrice: priceMap[p.id] } : p)) })))
        .catch((e) => toast("단가 일괄 저장 실패: " + e.message));
      return;
    }
    set((s) => ({ partners: s.partners.map((p) => (priceMap[p.id] != null ? { ...p, unitPrice: priceMap[p.id] } : p)) }));
  },
  replacePartnerSettlement: (partner, items) => {                               // [Phase4-5] 파트너 매출 일괄 저장
    if (LIVE) {
      const pid = state.partners.find((p) => p.name === partner)?.id;
      if (!pid) { toast("파트너를 찾을 수 없습니다."); return; }
      settle.replacePartnerItems(pid, items)
        .then((rows) => set((s) => ({ settlementItems: [...s.settlementItems.filter((i) => i.partner !== partner), ...rows] })))
        .catch((e) => toast("정산 저장 실패: " + e.message));
      return;
    }
    set((s) => ({ settlementItems: [...s.settlementItems.filter((i) => i.partner !== partner), ...items] }));
  },
};
