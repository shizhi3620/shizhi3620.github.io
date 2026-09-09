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
