// 유저(보호자) 링크 진입점 — 실제 구현은 user/ 폴더에 분리되어 있다.
// (App.jsx의 import 경로 호환을 위해 default export를 그대로 재노출)
//
// 화면 구조:
//   user/UserMobile.jsx — 셸(헤더·진행바·단계 본문·하단 네비·문의처 푸터)
//   user/wizard.js      — useUserWizard() 상태·업로드·제출 훅
//   user/steps.jsx      — StepBody(동의/AI독사진/소스업로드/배경음악/편지/미리보기/완료)
//   user/parts.jsx      — 프레젠테이션 조각(Stepper·Title·ContactRow·PhotoExampleGuide·PolicyModal)
export { default } from "./user/UserMobile.jsx";
