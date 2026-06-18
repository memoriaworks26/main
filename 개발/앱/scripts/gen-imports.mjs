// import 헤더 생성기 — 분리한 컴포넌트 본문(코드 조각)을 읽어, 그 코드가 실제로
// 사용하는 외부 심볼을 모듈별로 묶어 import 문을 출력한다. (분리 리팩토링 보조 도구)
//
// 사용: node scripts/gen-imports.mjs <body조각.jsx> [상대경로깊이=./]
//   예) node scripts/gen-imports.mjs /tmp/part.jsx ../   →  "../theme.js" 식으로 출력
// 주의: admin/partner 폴더 내부 cross-module 심볼(SaveBar 등)은 모르므로,
//       남는 미해결은 check-refs.mjs가 잡아준다 → 수동으로 ./shared.jsx 등 추가.
import { readFileSync, readdirSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), "../src");
const file = process.argv[2];
const up = process.argv[3] || "./"; // 새 파일에서 src 루트까지의 상대경로 (예: 하위폴더면 "../")

const stripComments = (s) => {
  let out = "", i = 0, str = null;
  while (i < s.length) {
    const ch = s[i], nx = s[i + 1];
    if (str) { if (ch === "\\") { i += 2; out += "  "; continue; } if (ch === str) str = null; out += ch === "\n" ? "\n" : " "; i++; continue; }
    if (ch === '"' || ch === "'" || ch === "`") { str = ch; out += " "; i++; continue; }
    if (ch === "/" && nx === "/") { while (i < s.length && s[i] !== "\n") i++; continue; }
    if (ch === "/" && nx === "*") { i += 2; while (i < s.length && !(s[i] === "*" && s[i + 1] === "/")) i++; i += 2; continue; }
    out += ch; i++;
  }
  return out;
};

const exportsOf = (rel) => {
  const t = readFileSync(join(SRC, rel), "utf8");
  const names = [];
  for (const m of t.matchAll(/export\s+(?:const|function|let)\s+([A-Za-z_$][\w$]*)/g)) names.push(m[1]);
  return names;
};
const MODULES = { "theme.js": exportsOf("theme.js"), "ui.jsx": exportsOf("ui.jsx"), "toast.jsx": exportsOf("toast.jsx"), "docs.jsx": exportsOf("docs.jsx"), "roomcard.jsx": exportsOf("roomcard.jsx"), "store.js": exportsOf("store.js"), "lib/media.js": exportsOf("lib/media.js") };

const lucide = new Set();
const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((d) => d.isDirectory() ? walk(join(dir, d.name)) : /\.jsx?$/.test(d.name) ? [join(dir, d.name)] : []);
for (const f of walk(SRC)) for (const m of readFileSync(f, "utf8").matchAll(/import\s*\{([^}]*)\}\s*from\s*["']lucide-react["']/g))
  for (const p of m[1].split(",")) { const n = p.trim().split(/\s+as\s+/).pop().trim(); if (n) lucide.add(n); }

const code = stripComments(readFileSync(file, "utf8"));
const uses = (name) => new RegExp(`\\b${name}\\b`).test(code);

// React 훅
const reactHooks = ["useState", "useEffect", "useRef", "useMemo", "useCallback", "useContext", "createContext"].filter(uses);
const lines = [`import React${reactHooks.length ? `, { ${reactHooks.join(", ")} }` : ""} from "react";`];

// lucide
const usedLucide = [...lucide].filter(uses).sort();
if (usedLucide.length) lines.push(`import {\n  ${usedLucide.join(", ")},\n} from "lucide-react";`);

// 공유 모듈
for (const [rel, names] of Object.entries(MODULES)) {
  const used = names.filter(uses);
  if (used.length) lines.push(`import { ${used.join(", ")} } from "${up}${rel}";`);
}
// data 네임스페이스
if (/\bD\./.test(code)) lines.push(`import * as D from "${up}data.js";`);

console.log(lines.join("\n"));
