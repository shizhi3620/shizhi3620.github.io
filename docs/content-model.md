# Content model

Blog entries are Markdown files under the language-specific content directories (`content/zh` and `content/en`). Chinese is the authoritative source; an English translation must use the same `translationKey`.

Every article should define these front matter fields:

| Field | Required | Meaning |
| --- | --- | --- |
| `title` | yes | Human-readable title. |
| `date` | yes | Publication date in ISO-8601 format. |
| `description` | yes | Short summary used by listings and metadata. |
| `tags` | yes | Fine-grained topics. |
| `categories` | yes | Broad content areas such as work, projects, job-search, or life. |
| `draft` | yes | `true` keeps content out of production builds; use `false` to publish. |
| `translationKey` | yes for pairs | Stable identifier shared by Chinese and English versions. |
| `translationPending` | required for an intentional exception | Chinese-only published posts must set this to `true` until their English counterpart exists. |
| `featured` | optional | Set to `true` for homepage highlights. |

English translations should additionally record `translationSource: "ai-reviewed"` after the author has reviewed them. Translation automation must preserve all factual metadata and links.

Hugo treats matching `translationKey` values as the sole pairing mechanism. Do not infer pairs from titles, slugs, dates, or directories. A published article without a counterpart must retain its normal article URL and show that the other language is not available yet.

## DeepSeek draft translation

The repository workflow runs only when a maintainer adds the `translate` label to a pull request targeting `main`. It reads changed `content/zh/posts/*.md` files through the GitHub API at the pull request commit; it never checks out or executes the pull request's code. It sends article data to DeepSeek's `deepseek-chat` endpoint and creates or updates a separate draft pull request on an `automation/deepseek-translation-pr-<source-number>` branch.

Before enabling the workflow, add `DEEPSEEK_API_KEY` as a repository Actions secret. Never put that key in a Markdown file, workflow variable, issue, or pull request. The workflow deliberately prints only status messages, not article text, API responses, command output, or credentials.

The generated English files preserve source routing and factual metadata such as `date`, `translationKey`, `slug`, `aliases`, and `featured`. They are always written with `draft: true` and `translationSource: "ai-generated"`. A human must check factual accuracy, links, and naturalness, then change those fields to `draft: false` and `translationSource: "ai-reviewed"` before merging the draft translation pull request.
