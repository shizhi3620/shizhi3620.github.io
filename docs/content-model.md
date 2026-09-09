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
| `featured` | optional | Set to `true` for homepage highlights. |

English translations should additionally record that they were AI translated and reviewed by the author in the page metadata used by the theme. Translation automation must preserve all factual metadata and links.
