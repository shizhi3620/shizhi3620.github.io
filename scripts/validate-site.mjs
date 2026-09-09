#!/usr/bin/env node

import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, extname, join, normalize, relative, resolve, sep } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const contentRoot = join(root, "content");
const publicDir = process.env.HUGO_DESTINATION || join(tmpdir(), "shizhi-blog-public");
const errors = [];

function report(scope, message) {
  errors.push(`${scope}: ${message}`);
}

function parseScalar(value) {
  const trimmed = value.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  if (trimmed === "true" || trimmed === "false") return trimmed === "true";
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    return trimmed.slice(1, -1).split(",").map((item) => parseScalar(item)).filter(Boolean);
  }
  return trimmed;
}

function parseFrontMatter(source, file) {
  const match = source.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n?/);
  if (!match) {
    report(file, "front matter must begin and end with YAML delimiters");
    return { data: {}, body: source };
  }

  const data = {};
  for (const [index, line] of match[1].split(/\r?\n/).entries()) {
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    const field = line.match(/^([A-Za-z][A-Za-z0-9_-]*):\s*(.*)$/);
    if (!field) {
      report(file, `front matter line ${index + 1} is not a supported key/value field`);
      continue;
    }
    data[field[1]] = parseScalar(field[2]);
  }
  return { data, body: source.slice(match[0].length) };
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const fullPath = join(directory, entry.name);
    return entry.isDirectory() ? walk(fullPath) : [fullPath];
  }));
  return files.flat();
}

function checkRequiredPostFields(file, data) {
  for (const key of ["title", "date", "description", "tags", "categories", "draft", "translationKey"]) {
    if (data[key] === undefined || data[key] === "") report(file, `missing required field '${key}'`);
  }
  if (data.date && !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:Z|[+-]\d{2}:?\d{2})?)?$/.test(String(data.date))) {
    report(file, "date must use ISO-8601 format");
  }
  for (const key of ["tags", "categories"]) {
    if (data[key] !== undefined && (!Array.isArray(data[key]) || data[key].length === 0 || data[key].some((value) => typeof value !== "string" || !value.trim()))) {
      report(file, `'${key}' must be a non-empty inline YAML list of strings`);
    }
  }
  if (data.draft !== undefined && typeof data.draft !== "boolean") report(file, "'draft' must be true or false");
}

function checkImages(file, body) {
  const markdownImages = /!\[([^\]]*)\]\([^)]*\)/g;
  for (const match of body.matchAll(markdownImages)) {
    if (!match[1].trim()) report(file, "image is missing Markdown alt text");
  }
  const htmlImages = /<img\b([^>]*)>/gi;
  for (const match of body.matchAll(htmlImages)) {
    if (!/\balt\s*=\s*["'][^"']+?["']/i.test(match[1])) report(file, "image is missing non-empty HTML alt text");
  }
}

function checkSensitiveContent(file, source) {
  const approvedEmails = new Set(["shizhi3620@gmail.com"]);
  const emailPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
  for (const value of source.matchAll(emailPattern)) {
    if (!approvedEmails.has(value[0].toLowerCase())) {
      report(file, "contains an unapproved contact address");
      break;
    }
  }

  const sensitivePatterns = [
    /(?:api[_-]?key|secret|token|password|passwd)\s*[:=]\s*["']?[A-Za-z0-9_\-\/+=]{12,}/i,
    /(?:sk|ghp|github_pat)_[A-Za-z0-9_\-]{12,}/i,
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i,
    /\b(?:confidential|nda|internal use only|interview invitation|offer letter)\b/i,
    /\b(?:保密|机密|仅限内部|面试邀请|录用通知)\b/,
  ];
  for (const pattern of sensitivePatterns) {
    if (pattern.test(source)) {
      report(file, "contains a possible credential or private-work/interview marker; redact it before publishing");
      break;
    }
  }
}

function outputPathForUrl(urlPath) {
  const pathname = decodeURIComponent(urlPath.split(/[?#]/, 1)[0]);
  const candidate = normalize(join(publicDir, pathname.replace(/^\/+/, "")));
  if (!candidate.startsWith(`${publicDir}${sep}`) && candidate !== publicDir) return null;
  if (pathname.endsWith("/")) return join(candidate, "index.html");
  if (extname(pathname)) return candidate;
  return join(candidate, "index.html");
}

function isLocalHref(href) {
  return href.startsWith("/") || href.startsWith("https://shizhi3620.github.io/");
}

function hasAttribute(html, tag, attribute, value) {
  const quoted = `["']${value}["']`;
  return new RegExp(`<${tag}\\b[^>]*\\b${attribute}=(?:${quoted}|${value})(?:\\s|/?>)`, "i").test(html);
}

async function validateBuildOutput() {
  const htmlFiles = (await walk(publicDir)).filter((file) => file.endsWith(".html"));
  if (htmlFiles.length === 0) {
    report("build", "Hugo produced no HTML pages");
    return;
  }

  for (const file of htmlFiles) {
    const html = await readFile(file, "utf8");
    const label = relative(root, file);
    if (!/<html\b[^>]*\blang=(?:["'][^"']+["']|[^\s>]+)/i.test(html)) report(label, "missing document language metadata");
    if (!hasAttribute(html, "meta", "name", "description")) report(label, "missing meta description");
    if (!hasAttribute(html, "link", "rel", "canonical")) report(label, "missing canonical URL");
    for (const property of ["og:title", "og:description", "og:url", "og:type"]) {
      if (!hasAttribute(html, "meta", "property", property)) report(label, `missing ${property} Open Graph metadata`);
    }
    if (!hasAttribute(html, "main", "id", "main-content")) report(label, "missing main content landmark");
    if ((html.match(/<h1\b/gi) || []).length !== 1) report(label, "must contain exactly one h1");
    const headings = [...html.matchAll(/<h([1-6])\b[^>]*>/gi)].map((match) => Number(match[1]));
    for (let index = 1; index < headings.length; index += 1) {
      if (headings[index] > headings[index - 1] + 1) {
        report(label, "heading levels must not skip levels");
        break;
      }
    }
    for (const image of html.matchAll(/<img\b([^>]*)>/gi)) {
      if (!/\balt\s*=\s*["'][^"']+?["']/i.test(image[1])) report(label, "rendered image is missing non-empty alt text");
    }
    for (const match of html.matchAll(/\bhref=(?:["']([^"']+)["']|([^\s>]+))/gi)) {
      const href = match[1] || match[2];
      if (!isLocalHref(href)) continue;
      const localPath = href.startsWith("https://") ? new URL(href).pathname : href;
      const target = outputPathForUrl(localPath);
      if (!target || !existsSync(target)) report(label, "contains a broken internal link");
    }
  }

  for (const required of ["sitemap.xml", "robots.txt", "zh/index.xml", "en/index.xml"]) {
    if (!existsSync(join(publicDir, required))) report("build", `missing generated ${required}`);
  }
}

async function main() {
  const allContentFiles = (await walk(contentRoot)).filter((file) => extname(file) === ".md");
  const pagesByKey = new Map();

  for (const file of allContentFiles) {
    const source = await readFile(file, "utf8");
    const { data, body } = parseFrontMatter(source, relative(root, file));
    const language = relative(contentRoot, file).split(sep)[0];
    const label = relative(root, file);
    if (!["zh", "en"].includes(language)) report(label, "must live under content/zh or content/en");
    if (!data.title || !data.description) report(label, "missing required field 'title' or 'description'");
    if (!data.translationKey || typeof data.translationKey !== "string") report(label, "missing required field 'translationKey'");
    checkImages(label, body);
    checkSensitiveContent(label, source);

    if (relative(join(contentRoot, language, "posts"), file).split(sep).length === 1 && basename(file) !== "_index.md") {
      checkRequiredPostFields(label, data);
      if (language === "en" && data.translationSource !== "ai-reviewed") report(label, "English post must declare translationSource: ai-reviewed");
    }
    if (data.translationKey) {
      const pairing = pagesByKey.get(data.translationKey) || {};
      if (pairing[language]) report(label, `duplicate translationKey '${data.translationKey}' for ${language}`);
      pairing[language] = { data, file: label };
      pagesByKey.set(data.translationKey, pairing);
    }
  }

  for (const [translationKey, pairing] of pagesByKey) {
    if (pairing.zh && pairing.en) continue;
    const only = pairing.zh || pairing.en;
    if (only.data.translationPending === true && pairing.zh) continue;
    report(only.file, `translationKey '${translationKey}' must have one published post in each language (or Chinese source must set translationPending: true)`);
  }

  const styles = await readFile(join(root, "assets/css/site.css"), "utf8");
  if (!/:focus-visible\b/.test(styles)) report("assets/css/site.css", "must provide a :focus-visible keyboard indicator");
  if (/outline\s*:\s*(?:0|none)/i.test(styles) && !/:focus-visible\b/.test(styles)) report("assets/css/site.css", "must not remove focus outlines without a visible replacement");

  await rm(publicDir, { recursive: true, force: true });
  await mkdir(publicDir, { recursive: true });
  const hugo = spawnSync("hugo", ["--minify", "--gc", "--destination", publicDir, "--cacheDir", join(tmpdir(), "blog-hugo-cache")], {
    cwd: root,
    encoding: "utf8",
  });
  if (hugo.status !== 0) report("build", "Hugo production build failed");
  else await validateBuildOutput();

  if (errors.length > 0) {
    console.error(`Site validation failed with ${errors.length} issue(s):`);
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
  } else {
    console.log("Site validation passed.");
  }
}

main().catch(() => {
  console.error("Site validation could not complete.");
  process.exitCode = 1;
});
