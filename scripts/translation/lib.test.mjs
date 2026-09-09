import assert from "node:assert/strict";
import test from "node:test";
import {
  isTranslationLabelEvent,
  mapEnglishPath,
  parseFrontMatter,
  parseModelTranslation,
  renderEnglishDraft,
  requestTranslation,
} from "./lib.mjs";

const source = `---
title: "中文标题"
date: 2026-09-10
description: "中文摘要"
tags: ["写作"]
categories: ["生活"]
draft: false
translationKey: "source-post"
featured: true
slug: "source-post"
---

正文中的 [链接](https://example.com)。`;

const modelOutput = JSON.stringify({
  title: "English title",
  description: "English description",
  tags: ["writing"],
  categories: ["life"],
  body: "Translated body with a [link](https://example.com).",
});

test("only a translate label event is eligible", () => {
  assert.equal(isTranslationLabelEvent({ action: "labeled", label: { name: "translate" }, pull_request: { number: 4 } }), true);
  assert.equal(isTranslationLabelEvent({ action: "opened", label: { name: "translate" }, pull_request: { number: 4 } }), false);
  assert.equal(isTranslationLabelEvent({ action: "labeled", label: { name: "other" }, pull_request: { number: 4 } }), false);
});

test("English paths are derived only from Chinese post paths", () => {
  assert.equal(mapEnglishPath("content/zh/posts/source-post.md"), "content/en/posts/source-post.md");
  assert.throws(() => mapEnglishPath("content/zh/about.md"));
  assert.throws(() => mapEnglishPath("content/zh/posts/../private.md"));
});

test("draft rendering protects routing and factual metadata", () => {
  const output = renderEnglishDraft(source, modelOutput);
  const parsed = parseFrontMatter(output);

  assert.equal(parsed.fields.date, "2026-09-10");
  assert.equal(parsed.fields.translationKey, '"source-post"');
  assert.equal(parsed.fields.featured, "true");
  assert.equal(parsed.fields.slug, '"source-post"');
  assert.equal(parsed.fields.draft, "true");
  assert.equal(parsed.fields.translationSource, '"ai-generated"');
  assert.match(parsed.body, /Translated body/);
  assert.doesNotMatch(output, /中文标题/);
});

test("draft rendering replaces multiline translated metadata cleanly", () => {
  const multilineSource = source.replace(
    'tags: ["写作"]\ncategories: ["生活"]',
    "tags:\n  - 写作\ncategories:\n  - 生活",
  );
  const output = renderEnglishDraft(multilineSource, modelOutput);

  assert.ok(output.includes('tags: ["writing"]'));
  assert.ok(output.includes('categories: ["life"]'));
  assert.doesNotMatch(output, /  - 写作|  - 生活/);
});

test("malformed model output cannot produce a draft", () => {
  assert.throws(() => parseModelTranslation("not JSON"), /valid JSON/);
  assert.throws(() => parseModelTranslation(JSON.stringify({ title: "x" })), /description/);
});

test("API failures do not expose an API key", async () => {
  const secret = "super-secret-api-key";
  await assert.rejects(
    requestTranslation(source, secret, async () => ({ ok: false })),
    (error) => !error.message.includes(secret) && error.message === "DeepSeek request failed",
  );
});
