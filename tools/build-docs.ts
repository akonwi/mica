#!/usr/bin/env bun

import { mkdir, rm } from "node:fs/promises";
import { dirname, join, relative } from "node:path";

type Level = "css" | "native" | "js";
type Page = {
  group: string;
  slug: string;
  title: string;
  lead: string;
  level?: Level;
  scripts?: string[];
};
type Manifest = { groups: string[]; pages: Page[] };

const ROOT = dirname(import.meta.dir);
const SOURCE = join(ROOT, "docs-src");
const manifest = await Bun.file(join(SOURCE, "pages.json")).json() as Manifest;
const shell = await Bun.file(join(SOURCE, "shell.html")).text();
const LEVEL_LABEL: Record<Level, string> = {
  css: "CSS-only",
  native: "native behavior",
  js: "JS-enhanced",
};
const DOCS_URL = "https://akonwi.io/mica/";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function hrefFor(slug: string, fromRoot: boolean): string {
  if (slug === "index") return fromRoot ? "index.html" : "../index.html";
  return fromRoot ? `docs/${slug}.html` : `${slug}.html`;
}

function navHtml(current: string, fromRoot: boolean): string {
  const parts = [
    `<a class="brand" href="${hrefFor("index", fromRoot)}">mica</a>`,
  ];
  for (const group of manifest.groups) {
    parts.push(`<h2>${escapeHtml(group)}</h2>`);
    for (const page of manifest.pages.filter((candidate) => candidate.group === group)) {
      const currentAttribute = page.slug === current ? ' aria-current="page"' : "";
      parts.push(
        `<a href="${hrefFor(page.slug, fromRoot)}"${currentAttribute}>${escapeHtml(page.title)}</a>`,
      );
    }
    if (group === "Start") {
      parts.push(`<a href="${fromRoot ? "llms.txt" : "../llms.txt"}">llms.txt</a>`);
    }
  }
  return parts.join("\n      ");
}

function pagerHtml(index: number, fromRoot: boolean): string {
  const page = manifest.pages[index];
  if (page.slug === "index") return "";
  const previous = manifest.pages[index - 1];
  const next = manifest.pages[index + 1];
  const previousLink = previous
    ? `<a href="${hrefFor(previous.slug, fromRoot)}">&larr; ${escapeHtml(previous.title)}</a>`
    : "<span></span>";
  const nextLink = next
    ? `<a href="${hrefFor(next.slug, fromRoot)}">${escapeHtml(next.title)} &rarr;</a>`
    : "<span></span>";
  return `\n          <m-hstack justify="between" class="pager">${previousLink}${nextLink}</m-hstack>`;
}

async function pageHtml(page: Page, index: number): Promise<string> {
  const fromRoot = page.slug === "index";
  const body = (await Bun.file(join(SOURCE, "pages", `${page.slug}.html`)).text()).trim();
  const scripts = (page.scripts ?? [])
    .map((script) => `  <script type="module" src="${fromRoot ? script : `../${script}`}"></script>`)
    .join("\n");
  const replacements: Record<string, string> = {
    DOCUMENT_TITLE: escapeHtml(fromRoot ? "mica" : `${page.title} — mica`),
    MICA_CSS: fromRoot ? "mica.css" : "../mica.css",
    SITE_CSS: fromRoot ? "docs/site.css" : "site.css",
    SCRIPTS: scripts,
    NAV: navHtml(page.slug, fromRoot),
    PAGE_TITLE: escapeHtml(page.title),
    LEAD: escapeHtml(page.lead),
    BODY: `\n${body}\n`,
    PAGER: pagerHtml(index, fromRoot),
  };
  let html = shell;
  for (const [name, value] of Object.entries(replacements)) {
    html = html.replaceAll(`{{${name}}}`, value);
  }
  const unresolved = html.match(/{{[A-Z_]+}}/g);
  if (unresolved) throw new Error(`${page.slug}: unresolved ${unresolved.join(", ")}`);
  return html;
}

function llmsTxt(): string {
  const lines = [
    "# mica",
    "",
    "This is the documentation for the `@akonwi/mica` package, a CSS-first",
    "component library built from custom elements, native HTML, and small",
    "optional ES modules. It has no shared runtime and requires no consumer",
    "build step.",
    "",
    "Import `@akonwi/mica/mica.css`, then import only the enhancement modules",
    "used by the page. Follow documented element names, attributes, classes,",
    "and markup anatomy exactly; optional modules enhance working markup and",
    "never render it.",
    "",
  ];
  for (const group of manifest.groups) {
    lines.push(`## ${group === "Start" ? "Overview" : group}`, "");
    for (const page of manifest.pages.filter((candidate) => candidate.group === group)) {
      const href = page.slug === "index" ? DOCS_URL : `${DOCS_URL}docs/${page.slug}.html`;
      const level = page.level ? ` (${LEVEL_LABEL[page.level]})` : "";
      lines.push(`- [${page.title}](${href}): ${page.lead}${level}`);
    }
    lines.push("");
  }
  lines.push(
    "## Additional reference",
    "",
    `- [Kitchen-sink demo](${DOCS_URL}demo.html): Every component and representative state on one page.`,
    "- [Package README](https://github.com/akonwi/mica#readme): Installation, distribution options, progressive-enhancement model, and browser support.",
    "",
  );
  return lines.join("\n");
}

const outputs = new Map<string, string>();
for (const [index, page] of manifest.pages.entries()) {
  const output = page.slug === "index" ? "index.html" : `docs/${page.slug}.html`;
  if (outputs.has(output)) throw new Error(`duplicate output: ${output}`);
  outputs.set(output, await pageHtml(page, index));
}
outputs.set("docs/site.css", await Bun.file(join(SOURCE, "site.css")).text());
outputs.set("llms.txt", llmsTxt());

const checkOnly = process.argv.includes("--check");
const docsDirectory = join(ROOT, "docs");
if (!checkOnly) await mkdir(docsDirectory, { recursive: true });

const expectedDocs = new Set(
  manifest.pages.filter((page) => page.slug !== "index").map((page) => `${page.slug}.html`),
);
const staleDocs = [...new Bun.Glob("*.html").scanSync(docsDirectory)]
  .filter((file) => !expectedDocs.has(file));
if (staleDocs.length > 0) {
  if (checkOnly) {
    throw new Error(`generated docs not in manifest: ${staleDocs.join(", ")}`);
  }
  for (const file of staleDocs) {
    await rm(join(docsDirectory, file));
    console.log(`removed docs/${file}`);
  }
}

if (checkOnly) {
  const stale: string[] = [];
  for (const [path, content] of outputs) {
    const file = Bun.file(join(ROOT, path));
    if (!(await file.exists()) || await file.text() !== content) stale.push(path);
  }
  if (stale.length > 0) {
    for (const path of stale) console.error(`stale: ${path}`);
    console.error("run: bun run docs:build");
    process.exit(1);
  }
  console.log(`ok: ${outputs.size} static documentation files are current`);
} else {
  for (const [path, content] of outputs) {
    await Bun.write(join(ROOT, path), content);
    console.log(`wrote ${relative(ROOT, join(ROOT, path))}`);
  }
}
