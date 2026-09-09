import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { promisify } from "node:util";
import {
  isTranslationLabelEvent,
  mapEnglishPath,
  renderEnglishDraft,
  requestTranslation,
} from "./lib.mjs";

const execFileAsync = promisify(execFile);
const log = (message) => process.stdout.write(`${message}\n`);

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}`);
  }
  return value;
}

function assertRepository(value) {
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(value)) {
    throw new Error("Invalid repository");
  }
  return value;
}

function assertSha(value) {
  if (!/^[a-f0-9]{40,64}$/i.test(value)) {
    throw new Error("Invalid commit SHA");
  }
  return value;
}

async function githubApi(path, { method = "GET", body } = {}) {
  const response = await fetch(`https://api.github.com${path}`, {
    method,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${requiredEnv("GITHUB_TOKEN")}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    throw new Error("GitHub API request failed");
  }

  return response.json();
}

async function pullRequestFiles(repository, number) {
  const files = [];
  for (let page = 1; page <= 10; page += 1) {
    const result = await githubApi(`/repos/${repository}/pulls/${number}/files?per_page=100&page=${page}`);
    files.push(...result);
    if (result.length < 100) {
      break;
    }
  }

  return files
    .filter((file) => file.status !== "removed")
    .map((file) => file.filename)
    .filter((filename) => {
      try {
        mapEnglishPath(filename);
        return true;
      } catch {
        return false;
      }
    });
}

async function sourceFile(repository, path, sha) {
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  const payload = await githubApi(`/repos/${repository}/contents/${encodedPath}?ref=${sha}`);
  if (payload.encoding !== "base64" || typeof payload.content !== "string") {
    throw new Error("GitHub content response was malformed");
  }

  return Buffer.from(payload.content.replace(/\n/g, ""), "base64").toString("utf8");
}

async function git(args) {
  try {
    await execFileAsync("git", args);
  } catch {
    throw new Error("Git operation failed");
  }
}

async function createOrUpdateDraft(repository, sourceNumber, branch, base) {
  const [owner] = repository.split("/");
  const existing = await githubApi(`/repos/${repository}/pulls?state=open&head=${encodeURIComponent(`${owner}:${branch}`)}`);
  const title = `Draft English translation for #${sourceNumber}`;
  const body = [
    `Automated DeepSeek translation draft for #${sourceNumber}.`,
    "This pull request does not publish content. Review factual accuracy, then set each article's `draft` field to `false` and `translationSource` to `ai-reviewed` before merging.",
  ].join("\n\n");

  if (existing.length > 0) {
    await githubApi(`/repos/${repository}/pulls/${existing[0].number}`, {
      method: "PATCH",
      body: { title, body },
    });
    return;
  }

  await githubApi(`/repos/${repository}/pulls`, {
    method: "POST",
    body: { title, body, head: branch, base, draft: true },
  });
}

async function main() {
  const event = JSON.parse(await readFile(requiredEnv("GITHUB_EVENT_PATH"), "utf8"));
  if (!isTranslationLabelEvent(event)) {
    log("Translation skipped: this is not a translate-label event.");
    return;
  }

  const repository = assertRepository(requiredEnv("GITHUB_REPOSITORY"));
  const sourceNumber = event.pull_request.number;
  const sourceSha = assertSha(event.pull_request.head.sha);
  const base = event.pull_request.base.ref;
  const paths = await pullRequestFiles(repository, sourceNumber);
  if (paths.length === 0) {
    log("Translation skipped: no Chinese article Markdown files changed.");
    return;
  }

  const branch = `automation/deepseek-translation-pr-${sourceNumber}`;
  await git(["checkout", "-B", branch]);

  for (const path of paths) {
    const markdown = await sourceFile(repository, path, sourceSha);
    const translation = await requestTranslation(markdown, requiredEnv("DEEPSEEK_API_KEY"));
    const outputPath = resolve(mapEnglishPath(path));
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, renderEnglishDraft(markdown, translation), "utf8");
  }

  await git(["add", "--", ...paths.map(mapEnglishPath)]);
  const unchanged = await execFileAsync("git", ["diff", "--cached", "--quiet"]).then(
    () => true,
    () => false,
  );
  if (unchanged) {
    log("Translation draft already matches the generated content.");
    return;
  }

  await git(["config", "user.name", "github-actions[bot]"]);
  await git(["config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com"]);
  await git(["commit", "-m", `Draft English translation for #${sourceNumber}`]);
  await git(["push", "--force-with-lease", "origin", `HEAD:${branch}`]);
  await createOrUpdateDraft(repository, sourceNumber, branch, base);
  log(`Translation draft updated for pull request #${sourceNumber}.`);
}

main().catch(() => {
  // Do not expose secrets, source content, HTTP response bodies, or command output in Actions logs.
  log("Translation failed. No source pull request content was changed.");
  process.exitCode = 1;
});
