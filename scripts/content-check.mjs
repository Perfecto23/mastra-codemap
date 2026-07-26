// Content-integrity check for Mastra CodeMap.
// Runs in plain Node (no test framework). Fails fast on first broken link,
// bad mermaid string, or dangling module id.
//
//   node scripts/content-check.mjs
//
// Exit code 0 = clean. Non-zero = list of problems.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SRC = join(ROOT, "src");

// ---------- collect TS source for type-level checks ----------
// Use sucrase (tiny, dependency-free TS→JS) to strip type annotations reliably.
async function loadData() {
  const { transform } = await import("sucrase");
  const t = (p) =>
    transform(readFileSync(p, "utf8"), {
      transforms: ["typescript"],
      keepUnusedImports: true,
      preserveDynamicImport: true,
    }).code
      .replace(/^"use strict";\s*/m, "")
      // Drop bare import lines entirely so missing dependency type-only imports don't blow up
      .replace(/^\s*import\s+[^;]*;\s*$/gm, "");
  const modSrc = t(join(SRC, "data/modules.ts"));
  const decSrc = t(join(SRC, "data/decisions.ts"));
  const flowSrc = t(join(SRC, "data/dataflow.ts"));

  const tmp = join(ROOT, ".content-check-tmp");
  const fs = await import("node:fs");
  fs.mkdirSync(tmp, { recursive: true });
  fs.writeFileSync(join(tmp, "modules.mjs"), modSrc);
  fs.writeFileSync(join(tmp, "decisions.mjs"), decSrc);
  fs.writeFileSync(join(tmp, "dataflow.mjs"), flowSrc);

  const [{ CORE_MODULES, SECONDARY_MODULES }, { DECISIONS }, { GENERATE_FLOW }] =
    await Promise.all([
      import(pathToFileURL(join(tmp, "modules.mjs")).href),
      import(pathToFileURL(join(tmp, "decisions.mjs")).href),
      import(pathToFileURL(join(tmp, "dataflow.mjs")).href),
    ]);

  fs.rmSync(tmp, { recursive: true, force: true });
  return { CORE_MODULES, SECONDARY_MODULES, DECISIONS, GENERATE_FLOW };
}

// ---------- walk for .astro / .tsx files ----------
function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith(".") || entry === "node_modules" || entry === "dist") continue;
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) out.push(...walk(p));
    else if (/\.(astro|tsx|ts|mjs)$/.test(p) && !p.includes("/content-check-tmp/"))
      out.push(p);
  }
  return out;
}

const errors = [];
const warn = (msg) => errors.push(msg);

const files = walk(SRC);

const { CORE_MODULES, SECONDARY_MODULES, DECISIONS, GENERATE_FLOW } = await loadData();

// ---------- 1. module / decision id integrity ----------
const coreIds = new Set(CORE_MODULES.map((m) => m.id));
const secIds = new Set(SECONDARY_MODULES.filter((m) => m.totalLoc > 0).map((m) => m.id));
const allModuleIds = new Set([...coreIds, ...secIds]);
const decisionIds = new Set(DECISIONS.map((d) => d.id));

for (const m of CORE_MODULES) {
  for (const dep of m.internalImports) {
    if (!allModuleIds.has(dep) && dep !== "base") {
      warn(`[modules] ${m.id}.internalImports references unknown module "${dep}"`);
    }
  }
  for (const dec of m.relatedDecisions ?? []) {
    if (!decisionIds.has(dec))
      warn(`[modules] ${m.id}.relatedDecisions references unknown decision "${dec}"`);
  }
}
for (const d of DECISIONS) {
  for (const aff of d.affects) {
    if (!coreIds.has(aff))
      warn(`[decisions] ${d.id}.affects references unknown core module "${aff}"`);
  }
}

// ---------- 2. mermaid syntax validation ----------
// Pull mermaid's parser. Mermaid uses window-ish globals in older versions;
// mermaid v11 exposes a parse() entrypoint when initialized.
const mermaidCharts = [];
// Collect every mermaid string literal from data files
function collectStrings(obj, path = "") {
  if (typeof obj === "string") {
    if (obj.includes("sequenceDiagram") || obj.includes("flowchart")) mermaidCharts.push({ path, value: obj });
    return;
  }
  if (Array.isArray(obj)) obj.forEach((v, i) => collectStrings(v, `${path}[${i}]`));
  else if (obj && typeof obj === "object")
    Object.entries(obj).forEach(([k, v]) => collectStrings(v, `${path}.${k}`));
}
collectStrings({ GENERATE_FLOW }, "GENERATE_FLOW");

// Scan .astro/.tsx files for mermaid charts passed to Mermaid component.
// Charts can be: (a) inline `chart={`...`}` (b) const X = `...` referenced via chart={X}.
const templateLitRe = /`((?:[^`\\]|\\.)*?)`/gs;
for (const file of files.filter((f) => /\.(astro|tsx)$/.test(f))) {
  const text = readFileSync(file, "utf8");
  // Grab every template literal containing mermaid keywords
  let m;
  let idx = 0;
  const re = new RegExp(templateLitRe.source, templateLitRe.flags);
  while ((m = re.exec(text))) {
    const val = m[1].replace(/\\`/g, "`");
    if (val.includes("sequenceDiagram") || val.includes("flowchart")) {
      mermaidCharts.push({ path: `${relative(ROOT, file)}#chart${idx++}`, value: val });
    }
  }
}

// Mermaid requires `document` to initialize; stub a minimal DOM in node.
async function loadMermaid() {
  // Install jsdom-free shim: mermaid v11's parse() in node needs a global `window.document`
  // with createElement/querySelector. We give it the minimum.
  const { JSDOM } = await import("jsdom").catch(() => ({ JSDOM: null }));
  if (!JSDOM) return null; // skip mermaid parse if jsdom not installed
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost/",
  });
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  // navigator is read-only on globalThis; copy needed fields onto a fresh object
  Object.defineProperty(globalThis, "navigator", {
    value: dom.window.navigator,
    configurable: true,
    writable: true,
  });
  globalThis.HTMLElement = dom.window.HTMLElement;
  globalThis.SVGElement = dom.window.SVGElement;
  const mermaid = (await import("mermaid")).default;
  mermaid.initialize({ startOnLoad: false, theme: "dark", securityLevel: "loose" });
  return mermaid;
}

const mermaid = await loadMermaid();
if (mermaid) {
  for (const { path, value } of mermaidCharts) {
    try {
      await mermaid.parse(value);
    } catch (e) {
      warn(`[mermaid] failed to parse ${path}: ${e?.message ?? e}`);
    }
  }
} else {
  console.warn("  ! jsdom not installed — skipping mermaid parse validation");
  console.warn("    tip: pnpm add -D jsdom  to enable mermaid syntax check");
}

// ---------- 3. anchor integrity across .astro / .tsx ----------
// Build a map of every page -> set of DOM ids it exposes.
// We approximate by scanning each page for `id="X"` in static markup AND
// by scanning for `id={`module-${m.id}`}` etc., but the simplest meaningful
// check: ensure every cross-page anchor referenced has a target id pattern
// that we can prove exists from data.

const pageToKnownIds = {
  "/modules": new Set([
    ...CORE_MODULES.map((m) => `module-${m.id}`),
    ...SECONDARY_MODULES.map((m) => `module-${m.id}`),
  ]),
  "/decisions": new Set(DECISIONS.map((d) => d.id)),
  "/dataflow": new Set(),
  "/": new Set(),
};
pageToKnownIds["/dataflow"].add(GENERATE_FLOW.steps[0]?.id);
// Step ids are referenced only internally; accept them as known.
for (const s of GENERATE_FLOW.steps) pageToKnownIds["/dataflow"].add(s.id);

const anchorRe = /href=["'](\/[a-z-]*)?#([A-Za-z0-9_-]+)["']/g;
for (const file of files) {
  const text = readFileSync(file, "utf8");
  let m;
  while ((m = anchorRe.exec(text))) {
    const page = m[1] || "/";
    const id = m[2];
    const known = pageToKnownIds[page];
    if (known && !known.has(id)) {
      warn(
        `[anchor] ${relative(ROOT, file)} links to ${page || "/"}#${id}, but that id isn't in the known-id set for the page`
      );
    }
  }
}

// ---------- report ----------
if (errors.length === 0) {
  console.log(`✓ content-check passed`);
  console.log(`  - ${CORE_MODULES.length} core modules, ${SECONDARY_MODULES.filter((m) => m.totalLoc > 0).length} secondary modules`);
  console.log(`  - ${DECISIONS.length} design decisions`);
  console.log(`  - ${mermaidCharts.length} mermaid charts${mermaid ? " validated" : " (parser skipped)"}`);
  process.exit(0);
} else {
  console.error(`✗ content-check found ${errors.length} problem(s):\n`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
