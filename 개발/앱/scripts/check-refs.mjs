// 정적 참조 검사기 — "import 누락으로 인한 런타임 ReferenceError"를 빌드 전에 잡는다.
// (이 프로젝트엔 eslint가 없고 vite build는 undefined 참조를 못 잡으므로 분리 리팩토링 검증용)
//
// 사용: node scripts/check-refs.mjs <검사할 .jsx ...>
// 검사 내용:
//  1) 공유 모듈(theme/ui/store/toast/docs/roomcard/lib)이 export하는 심볼을
//     파일이 사용하는데 import하지 않았으면 보고.
//  2) lucide 아이콘(전 소스에서 쓰인 합집합)을 사용하는데 import 안 했으면 보고.
//  3) 대문자로 시작하는 JSX 태그 <Foo>가 import/로컬정의 어디에도 없으면 보고.
import { readFileSync, readdirSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), "../src");

// 문자열(' " `)을 인식하는 주석 제거기 — accept="image/*" 처럼 문자열 안의 /* 를
// 블록주석 시작으로 오인하지 않도록 한 글자씩 스캔한다.
const stripComments = (s) => {
  let out = "", i = 0, str = null;
  while (i < s.length) {
    const ch = s[i], nx = s[i + 1];
    if (str) {
      if (ch === "\\") { out += "  "; i += 2; continue; }
      if (ch === str) str = null;
      out += ch === "\n" ? "\n" : " "; i++; continue; // 문자열 내용은 공백으로 대체
    }
    if (ch === '"' || ch === "'" || ch === "`") { str = ch; out += " "; i++; continue; }
    if (ch === "/" && nx === "/") { while (i < s.length && s[i] !== "\n") i++; continue; }
    if (ch === "/" && nx === "*") { i += 2; while (i < s.length && !(s[i] === "*" && s[i + 1] === "/")) i++; i += 2; continue; }
    out += ch; i++;
  }
  return out;
};

// 공유 모듈의 export 심볼 → 모듈경로 매핑
const SHARED = ["theme.js", "ui.jsx", "store.js", "toast.jsx", "docs.jsx", "roomcard.jsx", "lib/media.js"];
const exportsOf = (rel) => {
  const t = readFileSync(join(SRC, rel), "utf8");
  const names = new Set();
  for (const m of t.matchAll(/export\s+(?:const|function|let)\s+([A-Za-z_$][\w$]*)/g)) names.add(m[1]);
  return names;
};
const symbolModule = new Map(); // symbol -> rel module
for (const rel of SHARED) for (const n of exportsOf(rel)) if (!symbolModule.has(n)) symbolModule.set(n, rel);

// lucide 합집합: 전 소스에서 import된 lucide 식별자 모으기
const lucide = new Set();
const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
  d.isDirectory() ? walk(join(dir, d.name)) : /\.(jsx?|mjs)$/.test(d.name) ? [join(dir, d.name)] : []);
for (const f of walk(SRC)) {
  const t = readFileSync(f, "utf8");
  for (const m of t.matchAll(/import\s*\{([^}]*)\}\s*from\s*["']lucide-react["']/g))
    for (const part of m[1].split(",")) {
      const name = part.trim().split(/\s+as\s+/).pop().trim();
      if (name) lucide.add(name);
    }
}

const importedNames = (text) => {
  const set = new Set();
  for (const m of text.matchAll(/import\s+([\s\S]*?)\s+from\s*["'][^"']+["']/g)) {
    let clause = m[1];
    const ns = clause.match(/\*\s+as\s+([\w$]+)/);
    if (ns) set.add(ns[1]);
    const def = clause.match(/^([\w$]+)\s*(,|$)/);
    if (def && def[1] !== "{") set.add(def[1]);
    const braces = clause.match(/\{([^}]*)\}/);
    if (braces) for (const p of braces[1].split(",")) {
      const name = p.trim().split(/\s+as\s+/).pop().trim();
      if (name) set.add(name);
    }
  }
  return set;
};

const localDefs = (text) => {
  const set = new Set(["React", "Fragment"]);
  // function / 단순 const·let·var 선언
  for (const m of text.matchAll(/(?:function|const|let|var)\s+([A-Za-z_$][\w$]*)/g)) set.add(m[1]);
  // 구조분해 선언 const {a, b} / const [a, b] 내부 식별자
  for (const m of text.matchAll(/(?:const|let|var)\s*[[{]([^\]}]*)[\]}]/g))
    for (const part of m[1].split(",")) {
      const name = part.trim().split(/[:=]/).pop().trim().replace(/[.]{3}/, "");
      if (/^[A-Za-z_$][\w$]*$/.test(name)) set.add(name);
    }
  // 구조분해 이름변경 { icon: Icon } — 대문자 별칭(컴포넌트로 쓰임)
  for (const m of text.matchAll(/[:]\s*([A-Z][\w$]*)/g)) set.add(m[1]);
  // 함수/화살표 파라미터로 넘어온 컴포넌트 (예: (onClick, Icon, label) => , function f(A, B))
  for (const m of text.matchAll(/(?:function\s*[\w$]*\s*|=>\s*|\)\s*=>|\()\s*\(([^)]*)\)/g))
    for (const part of m[1].split(",")) {
      const name = part.trim().split(/[:=]/)[0].trim().replace(/[.]{3}/, "");
      if (/^[A-Za-z_$][\w$]*$/.test(name)) set.add(name);
    }
  for (const m of text.matchAll(/\(([^)]*)\)\s*=>/g))
    for (const part of m[1].split(",")) {
      const name = part.trim().split(/[:=]/)[0].trim().replace(/[.]{3}/, "");
      if (/^[A-Za-z_$][\w$]*$/.test(name)) set.add(name);
    }
  return set;
};

// import 문 자체는 사용처가 아니므로 본문 스캔에서 제거 (별칭 텍스트 오탐 방지)
const stripImports = (s) => s.replace(/import\s[\s\S]*?from\s*["'][^"']+["'];?/g, " ");

// 인자가 없으면 src/ 전체(.jsx/.js)를 검사
const walkAll = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
  d.isDirectory() ? walkAll(join(dir, d.name)) : /\.(jsx?)$/.test(d.name) ? [join(dir, d.name)] : []);
const targets = process.argv.slice(2).length ? process.argv.slice(2) : walkAll(SRC).sort();

let problems = 0;
for (const file of targets) {
  const raw = readFileSync(file, "utf8");
  const code = stripComments(stripImports(raw));
  const imp = importedNames(raw);
  const local = localDefs(code);
  const known = new Set([...imp, ...local]);
  const report = [];

  // 같은 폴더의 shared.jsx(도메인 공용 헬퍼)도 검사 대상에 포함 — 사용 시 import 강제
  const fileSymbols = new Map(symbolModule);
  const siblingShared = join(dirname(resolve(file)), "shared.jsx");
  try {
    if (resolve(file) !== siblingShared)
      for (const m of readFileSync(siblingShared, "utf8").matchAll(/export\s+(?:const|function|let)\s+([A-Za-z_$][\w$]*)/g))
        fileSymbols.set(m[1], "./shared.jsx");
  } catch { /* shared.jsx 없거나 파싱 실패 시 무시 */ }

  // 1) + 2) 공유 심볼 / lucide 아이콘
  for (const [sym, mod] of fileSymbols)
    if (!imp.has(sym) && !local.has(sym) && new RegExp(`\\b${sym}\\b`).test(code))
      report.push(`  - 공유심볼 '${sym}' 사용하나 import 없음 (→ ${mod})`);
  for (const ic of lucide)
    if (!imp.has(ic) && !local.has(ic) && new RegExp(`\\b${ic}\\b`).test(code))
      report.push(`  - lucide '${ic}' 사용하나 import 없음`);

  // 3) JSX 태그
  for (const m of code.matchAll(/<([A-Z][\w]*)\b/g))
    if (!known.has(m[1])) report.push(`  - JSX <${m[1]}> 미해결 (import/정의 없음)`);

  const uniq = [...new Set(report)];
  if (uniq.length) { problems += uniq.length; console.log(`✗ ${file}`); console.log(uniq.join("\n")); }
  else console.log(`✓ ${file}`);
}
process.exit(problems ? 1 : 0);
