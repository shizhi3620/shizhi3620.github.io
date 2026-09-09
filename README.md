# Shizhi's Notes

This repository contains the source for [shizhi3620.github.io](https://shizhi3620.github.io), a bilingual personal publication about life, work, projects, and job searching.

## Local development

Install Hugo Extended (the version used by CI is `0.165.0`), then run:

```sh
hugo server --buildDrafts --navigateToChanged
```

Open the local URL printed by Hugo. Draft content is included only by the explicit `--buildDrafts` flag.

## Production validation

Run the same command used by the pull-request check:

```sh
hugo --minify --gc
```

The generated `public/` directory is disposable and is not committed. Pull requests targeting `main` must pass this build before merge. A merge to `main` builds and deploys the site using the GitHub Pages Actions workflow; pull requests never publish the production site.

## GitHub configuration

In the repository's Pages settings, set the deployment source to **GitHub Actions**. The deployment workflow publishes the generated Hugo artifact after a merge to `main`; no custom domain, database, CMS, analytics service, or server is required.

For translation automation, create a repository Actions secret named `DEEPSEEK_API_KEY`. Do not put its value in a workflow file, issue, pull request, commit, or log. Add the `translate` label to a pull request only after the Chinese source content and its metadata are ready. The workflow creates or updates a separate English **draft** pull request for author review; it cannot deploy or merge content.

## Content and translation

Use standard Markdown and the front matter contract in [`docs/content-model.md`](docs/content-model.md). Chinese is the factual source. English translations are created by the DeepSeek workflow only when a pull request is explicitly labeled `translate`; generated translations remain drafts until the author reviews and merges them.

## Privacy

Publish only facts and media that you are authorized to share. Remove or anonymize internal company details, identifiable people, confidential project information, and unpublished interview material. Never commit API keys, private messages, captured logs, or other sensitive configuration. The public contact address is `shizhi3620@gmail.com`.
