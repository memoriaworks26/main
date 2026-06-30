// 추모영상 편집기 진입점 — 실제 구현은 editor/ 폴더에 분리되어 있다.
// (App.jsx의 import 경로 호환을 위해 default export를 그대로 재노출)
//
// 화면 구조:
//   editor/VideoEditor.jsx — 셸(블록 구성·편집 문서·undo/redo·발행 단계)
//   editor/blocks.js       — 블록 상수·순수 로직(buildBlocks·segments·blockFrame·seedGens)
//   editor/timeline.jsx    — BlockList(왼쪽) + Timeline(가운데 하단)
//   editor/preview.jsx     — Preview(원본 vs 작업본 2분할)
//   editor/props.jsx       — PropPanel(오른쪽) + AssetCard·PromptManager
export { default } from "./editor/VideoEditor.jsx";
