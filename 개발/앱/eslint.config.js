// ESLint flat config — 분리 리팩토링 후 "미사용 변수·잘못된 hook 의존성" 같은
// 자체 check 스크립트가 못 잡는 결함을 보강한다. (check-refs/scope는 참조 누락 전용)
import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";

export default [
  { ignores: ["dist/**", "node_modules/**"] },

  // 앱 소스 (브라우저 · JSX · React 18 자동 런타임)
  {
    files: ["src/**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { ...globals.browser },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      // hooks는 검증된 클래식 2개만 사용. (v7 recommended의 실험적 react-compiler
      // 규칙들(refs·set-state-in-effect 등)은 이 코드베이스에서 오탐이 많아 제외)
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      // 미사용 변수는 경고. _프리픽스·대문자 컴포넌트/상수는 제외.
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^[A-Z_]" }],
      // 빈 catch는 이 코드베이스의 의도된 폴백 관용구(clipboard 등) — 허용.
      "no-empty": ["error", { allowEmptyCatch: true }],
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
    },
  },

  // 빌드/검사 스크립트 (Node 환경)
  {
    files: ["scripts/**/*.{js,mjs}", "*.config.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { ...globals.node },
    },
    rules: { ...js.configs.recommended.rules, "no-empty": ["error", { allowEmptyCatch: true }] },
  },
];
