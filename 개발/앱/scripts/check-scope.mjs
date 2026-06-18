// 스코프 인식 "정의 안 된 참조" 검사 — check-refs.mjs(모듈 단위)가 못 잡는
// 함수 스코프 오류(예: 한 컴포넌트에서 정의한 헬퍼를 다른 컴포넌트에서 사용)를 잡는다.
// @babel/traverse의 scope.getBinding으로 ESLint no-undef와 동일한 판정.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
const traverse = _traverse.default || _traverse;

const SRC = join(fileURLToPath(new URL("..", import.meta.url)), "src");

const GLOBALS = new Set([
  // JS 표준
  "Object", "Array", "String", "Number", "Boolean", "Math", "JSON", "Date", "RegExp",
  "Map", "Set", "WeakMap", "WeakSet", "Promise", "Symbol", "Error", "Proxy", "Reflect",
  "parseInt", "parseFloat", "isNaN", "isFinite", "encodeURIComponent", "decodeURIComponent",
  "Infinity", "NaN", "undefined", "globalThis", "structuredClone", "BigInt", "Intl",
  // 브라우저
  "window", "document", "console", "navigator", "location", "history", "fetch",
  "setTimeout", "clearTimeout", "setInterval", "clearInterval", "requestAnimationFrame",
  "cancelAnimationFrame", "URL", "URLSearchParams", "Blob", "File", "FileReader",
  "FormData", "Image", "Audio", "AudioContext", "webkitAudioContext", "localStorage",
  "sessionStorage", "alert", "confirm", "prompt", "performance", "crypto", "atob", "btoa",
  "HTMLElement", "Event", "CustomEvent", "MutationObserver", "ResizeObserver",
  "IntersectionObserver", "getComputedStyle", "DOMParser", "AbortController",
  // 빌드/런타임
  "React", "process", "import",
]);

const files = [];
(function walk(dir) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(jsx?|mjs)$/.test(e)) files.push(p);
  }
})(SRC);

let problems = 0;
for (const file of files) {
  const code = readFileSync(file, "utf8");
  let ast;
  try {
    ast = parse(code, { sourceType: "module", plugins: ["jsx"] });
  } catch (e) {
    console.log(`✗ ${file}\n   파싱 실패: ${e.message}`);
    problems++;
    continue;
  }
  const found = [];
  traverse(ast, {
    ReferencedIdentifier(path) {
      const { node, scope } = path;
      const name = node.name;
      if (GLOBALS.has(name)) return;
      // getBinding만 사용 — hasGlobal/hasBinding은 '바인딩 없는 참조'를 global로 등록해
      // 정작 찾으려는 undefined를 걸러버리므로 쓰지 않는다.
      if (scope.getBinding(name)) return;
      found.push({ name, line: node.loc?.start.line });
    },
  });
  if (found.length) {
    // 같은 이름 중복 제거(첫 등장 라인)
    const seen = new Map();
    for (const f of found) if (!seen.has(f.name)) seen.set(f.name, f.line);
    console.log(`✗ ${file.replace(SRC, "src")}`);
    for (const [name, line] of seen) console.log(`   line ${line}: '${name}' 정의되지 않음(스코프 밖)`);
    problems += seen.size;
  }
}

if (problems === 0) console.log("✓ 스코프 검사 통과 — 정의 안 된 참조 없음");
else { console.log(`\n총 ${problems}건`); process.exitCode = 1; }
