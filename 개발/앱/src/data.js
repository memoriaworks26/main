// 더미 데이터 진입점(배럴) — 실제 정의는 data/ 폴더에 도메인별로 분리되어 있다.
// (전 콘솔이 쓰는 import * as D from "./data.js" · "../data.js" 호환을 위해 묶어서 재노출)
// 본개발에서 API 연결로 교체.
//
//   data/rooms.js      — ROOMS·RESERVATIONS·SECOND_EDIT_*
//   data/partners.js   — PARTNERS
//   data/content.js    — CONTENT·BGM·PROMPTS
//   data/templates.js  — TEMPLATE_*·DEFAULT_TEMPLATE·elementDef
//   data/signage.js    — DEVICES·SIGNAGE_*·STORAGE
//   data/settlement.js — SETTLEMENT_*·STATEMENTS
//   data/editor.js     — EDITOR_*·TRANSITION_TYPES·USER_TRANSITIONS·SUBTITLE_POS
//   data/user.js       — USER_STEPS·USER_UPLOADS
//   data/forms.js      — FORM_*·BIZ_UNITS·RESERV_DETAIL
//   data/company.js    — COMPANY·LINKS·DOWNLOAD_TARGETS·FINAL_VIDEOS·파일명 헬퍼
//   data/accounts.js   — ADMIN_*·*_PERMS
export * from "./data/rooms.js";
export * from "./data/partners.js";
export * from "./data/content.js";
export * from "./data/templates.js";
export * from "./data/signage.js";
export * from "./data/settlement.js";
export * from "./data/editor.js";
export * from "./data/user.js";
export * from "./data/forms.js";
export * from "./data/company.js";
export * from "./data/accounts.js";
