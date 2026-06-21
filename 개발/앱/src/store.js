// ─────────────────────────────────────────────────────────────
// 목 DB — 클라이언트 인메모리 스토어 (백엔드 아님). data.js를 seed로 1회 적재.
// 모든 화면이 useStore()로 구독 → 한 곳에서 바꾸면 전 화면 전파.
// 본개발 시 actions 내부의 setState만 Supabase 호출로 교체하면 됨.
// ─────────────────────────────────────────────────────────────
import { useSyncExternalStore } from "react";
import * as D from "./data.js";

// 시드 사업부(메모리아웍스) — 기존 더미 데이터는 전부 이 사업부 소속.
const SEED_BIZ = D.BIZ_UNITS[0].id;

let state = {
  // 사업부 (최상위 테넌트) — 파트너사·고객·폼 등 모든 데이터가 bizUnit으로 묶임
  bizUnits: D.BIZ_UNITS.map((b) => ({ ...b })),
  bizUnit: SEED_BIZ,                                    // 현재 선택된 사업부
  termConfigs: {},                                     // 사업부별 용어 설정 { [bizId]: { [termKey]: { partner, user } } }
  userText: {},                                        // 사업부별 유저링크 텍스트 오버라이드 { [bizId]: { [key]: string } }
  userPhotos: {},                                      // 사업부별 예시 사진 오버라이드 { [bizId]: { good, bad } (dataURL) }
  reservations: D.RESERVATIONS.map((r) => ({ ...r })),
  accounts: D.ADMIN_ACCOUNTS.map((a) => ({ ...a })),
  devices: D.DEVICES.map((d) => ({ ...d })),
  signageSources: D.SIGNAGE_SOURCES.map((s) => ({ ...s })), // 사이니지 표출 소스(광고·대기·알림) — 라이브 컨트롤 소스 관리
  signageNotice: { ...D.SIGNAGE_NOTICE }, // 알림 모드 다음 예약 안내 문구(템플릿)
  secondJobs: D.SECOND_EDIT_JOBS.map((j) => ({ ...j })),
  storageClasses: D.STORAGE.classes.map((c) => ({ ...c })),
  templates: {
    // 기본 템플릿(__default__) — 신규 파트너 복제 원본 + 파트너별 { bgm, blocks }
    [D.DEFAULT_TEMPLATE_ID]: { bgm: D.DEFAULT_TEMPLATE.bgm, blocks: D.DEFAULT_TEMPLATE.blocks.map((b) => ({ ...b })) },
    ...Object.fromEntries(Object.entries(D.TEMPLATE_ASSIGN).map(([k, v]) => [k, { bgm: v.bgm, blocks: v.blocks.map((b) => ({ ...b })) }])),
  },
  formConfigs: Object.fromEntries(Object.entries(D.FORM_CONFIGS).map(([k, v]) => [k, Object.fromEntries(Object.entries(v).map(([fk, fv]) => [fk, { ...fv }]))])), // 파트너별 폼 선택항목 설정
  rooms: D.ROOMS.map((r) => ({ ...r })),               // 호실(명칭·위치 편집) — 파트너 대시보드
  partners: D.PARTNERS.map((p) => ({ ...p, bizUnit: p.bizUnit || SEED_BIZ })),  // 파트너사 — 시드는 메모리아웍스 사업부 소속

  settlementItems: D.SETTLEMENT_ITEMS.map((i) => ({ ...i })), // 정산 매출 건(추가·수정·삭제)
  content: D.CONTENT.map((c) => ({ ...c })),           // 콘텐츠 허브 자산(클립·사진) — 즉시 추가 전파
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
// 사업부 용어 조회 — 설정값 없으면 기본 용어. (파트너 콘솔·유저 링크 라벨이 이걸 쓰면 텍스트만 사업부별로 바뀜)
export const term = (s, key, side, bizId = s.bizUnit) => {
  const def = D.TERMS.find((t) => t.key === key);
  return s.termConfigs[bizId]?.[key]?.[side] ?? (def ? def[side] : key);
};
// 유저링크 텍스트 조회 — 사업부 오버라이드 있으면 그걸, 없으면 기본값(D.USER_TEXT).
export const userTextOf = (s, bizId = s.bizUnit) => ({ ...D.USER_TEXT, ...(s.userText[bizId] || {}) });

const mapById = (arr, id, patch) => arr.map((x) => (x.id === id ? { ...x, ...patch } : x));

export const actions = {
  // 사업부 (최상위 테넌트) — 전환 시 파트너사·고객·폼 등 전 데이터가 해당 사업부로 스코핑
  setBizUnit: (id) => set({ bizUnit: id }),
  addBizUnit: (name) => set((s) => { const id = "biz-" + Date.now(); return { bizUnits: [...s.bizUnits, { id, name }], bizUnit: id }; }), // 추가 즉시 선택
  // 사업부 용어 설정 (파트너 콘솔·유저 링크 노출 텍스트 — bizId·termKey별 patch)
  setTermConfig: (bizId, key, patch) => set((s) => ({
    termConfigs: { ...s.termConfigs, [bizId]: { ...(s.termConfigs[bizId] || {}), [key]: { ...(s.termConfigs[bizId]?.[key] || {}), ...patch } } },
  })),
  // 사업부별 유저링크 텍스트 오버라이드 (key별). value가 기본값과 같으면 오버라이드 제거.
  setUserText: (bizId, key, value) => set((s) => {
    const cur = { ...(s.userText[bizId] || {}) };
    if (value === D.USER_TEXT[key]) delete cur[key]; else cur[key] = value;
    return { userText: { ...s.userText, [bizId]: cur } };
  }),
  // 사업부별 예시 사진 (good/bad) — dataURL. null이면 기본 사진으로 복원.
  setUserPhoto: (bizId, key, dataUrl) => set((s) => {
    const cur = { ...(s.userPhotos[bizId] || {}) };
    if (dataUrl) cur[key] = dataUrl; else delete cur[key];
    return { userPhotos: { ...s.userPhotos, [bizId]: cur } };
  }),

  // 예약 (편집·컨펌 큐 ↔ 고객관리 ↔ 정산 ↔ 사이니지 공유)
  setReservationStatus: (id, status) => set((s) => ({ reservations: mapById(s.reservations, id, { status }) })),
  setReservationAssignee: (id, assignee) => set((s) => ({ reservations: mapById(s.reservations, id, { assignee }) })),
  setReservationRoom: (id, room) => set((s) => ({ reservations: mapById(s.reservations, id, { room }) })),
  updateReservation: (id, patch) => set((s) => ({ reservations: mapById(s.reservations, id, patch) })),
  removeReservation: (id) => set((s) => ({ reservations: s.reservations.filter((r) => r.id !== id) })),
  removeReservations: (ids) => set((s) => { const rm = new Set(ids); return { reservations: s.reservations.filter((r) => !rm.has(r.id)) }; }),

  // 회사정보 (고객센터 연락처 등 — 환경설정에서 편집 → 유저링크 문의처에 반영)
  updateCompany: (patch) => set((s) => ({ company: { ...s.company, ...patch } })),

  // 관리자 계정
  addAccount: (acct) => set((s) => ({ accounts: [...s.accounts, acct] })),
  updateAccount: (id, patch) => set((s) => ({ accounts: mapById(s.accounts, id, patch) })),
  removeAccount: (id) => set((s) => ({ accounts: s.accounts.filter((a) => a.id !== id) })),
  setAccountPerms: (id, perms) => set((s) => ({ accounts: mapById(s.accounts, id, { perms }) })),
  toggleAccountPerm: (id, key) => set((s) => ({
    accounts: s.accounts.map((a) => a.id !== id ? a : { ...a, perms: (a.perms || []).includes(key) ? a.perms.filter((p) => p !== key) : [...(a.perms || []), key] }),
  })),

  // 사이니지 디바이스 (파트너 라이브 컨트롤 ↔ 관리자 사이니지 공유)
  setDeviceMode: (id, mode) => set((s) => ({ devices: mapById(s.devices, id, { mode }) })),
  setDevicePlay: (id, play) => set((s) => ({ devices: mapById(s.devices, id, { play }) })),
  setDeviceVolume: (id, volume) => set((s) => ({ devices: mapById(s.devices, id, { volume, muted: volume === 0 }) })),
  setDeviceMuted: (id, muted) => set((s) => ({ devices: mapById(s.devices, id, { muted }) })),

  // 사이니지 표출 소스 (광고·대기·알림) — 라이브 컨트롤 소스 관리
  addSignageSource: (src) => set((s) => ({ signageSources: [...s.signageSources, src] })),
  removeSignageSource: (id) => set((s) => ({ signageSources: s.signageSources.filter((x) => x.id !== id) })),
  // 카테고리당 1개만 표출 — 같은 cat의 다른 소스는 자동 해제(선택 개념). 선택된 걸 다시 누르면 해제.
  selectSignageSource: (id) => set((s) => {
    const t = s.signageSources.find((x) => x.id === id);
    if (!t) return {};
    const on = !t.active;
    return { signageSources: s.signageSources.map((x) => x.cat !== t.cat ? x : { ...x, active: x.id === id ? on : false }) };
  }),
  setSignageNotice: (patch) => set((s) => ({ signageNotice: { ...s.signageNotice, ...patch } })),

  // 2차 가공 큐
  addSecondJob: (job) => set((s) => ({ secondJobs: [...s.secondJobs, job] })),
  setSecondJobStatus: (id, status) => set((s) => ({ secondJobs: mapById(s.secondJobs, id, { status }) })),
  setSecondJobAssignee: (id, assignee) => set((s) => ({ secondJobs: mapById(s.secondJobs, id, { assignee }) })),
  updateSecondJob: (id, patch) => set((s) => ({ secondJobs: mapById(s.secondJobs, id, patch) })),
  removeSecondJob: (id) => set((s) => ({ secondJobs: s.secondJobs.filter((j) => j.id !== id) })),

  // 스토리지 보존 정책
  setRetention: (key, retention) => set((s) => ({ storageClasses: s.storageClasses.map((c) => (c.key === key ? { ...c, retention } : c)) })),

  // 영상 템플릿 (파트너별 요소 구성·순서 + BGM 편집)
  setTemplateBgm: (pid, bgm) => set((s) => ({ templates: { ...s.templates, [pid]: { ...s.templates[pid], bgm } } })),
  setTemplateBlocks: (pid, blocks) => set((s) => ({ templates: { ...s.templates, [pid]: { ...s.templates[pid], blocks } } })),

  // 콘텐츠 허브 자산 (즉시 추가 → 템플릿 클립 드롭다운·허브에 즉시 반영)
  addContent: (asset) => set((s) => ({ content: [asset, ...s.content] })),
  removeContent: (id) => set((s) => ({ content: s.content.filter((c) => c.id !== id) })),

  // 유저 입력 폼 (파트너별 선택항목 설정 — key별 patch)
  setFormConfig: (pid, key, patch) => set((s) => ({
    formConfigs: { ...s.formConfigs, [pid]: { ...(s.formConfigs[pid] || {}), [key]: { ...(s.formConfigs[pid]?.[key] || {}), ...patch } } },
  })),

  // 호실 (명칭·위치 편집 — 파트너 대시보드)
  setRoom: (id, patch) => set((s) => ({ rooms: mapById(s.rooms, id, patch) })),

  // 파트너사 건당 단가 + 신규 등록
  setPartnerPrice: (id, unitPrice) => set((s) => ({ partners: mapById(s.partners, id, { unitPrice }) })),
  // 신규 등록 시 기본 템플릿(__default__)을 복제해 시작 → 0에서 세팅하지 않고 수정하는 방향
  addPartner: (partner) => set((s) => {
    const def = s.templates[D.DEFAULT_TEMPLATE_ID] || { bgm: null, blocks: [] };
    const cloned = { bgm: def.bgm, blocks: def.blocks.map((b, i) => ({ ...b, id: "e-" + Date.now() + "-" + i })) };
    // 신규 파트너는 현재 선택된 사업부 소속으로 등록
    return { partners: [...s.partners, { ...partner, bizUnit: s.bizUnit }], templates: { ...s.templates, [partner.id]: cloned } };
  }),
  updatePartner: (id, patch) => set((s) => ({ partners: mapById(s.partners, id, patch) })),

  // 정산 매출 건 (추가·금액수정·삭제)
  addSettlementItem: (item) => set((s) => ({ settlementItems: [...s.settlementItems, item] })),
  updateSettlementItem: (key, patch) => set((s) => ({ settlementItems: s.settlementItems.map((i) => (siKey(i) === key ? { ...i, ...patch } : i)) })),
  removeSettlementItem: (key) => set((s) => ({ settlementItems: s.settlementItems.filter((i) => siKey(i) !== key) })),

  // ── 일괄 커밋(저장 버튼) — 초안을 한 번에 반영 ──
  replaceTemplates: (templates) => set({ templates }),                          // 영상 템플릿 전체 교체
  setPartnerPrices: (priceMap) => set((s) => ({ partners: s.partners.map((p) => (priceMap[p.id] != null ? { ...p, unitPrice: priceMap[p.id] } : p)) })),
  replacePartnerSettlement: (partner, items) => set((s) => ({ settlementItems: [...s.settlementItems.filter((i) => i.partner !== partner), ...items] })),
};
