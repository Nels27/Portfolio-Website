# Portfolio Skeleton Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: use superpowers:executing-plans, one task file per session. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the walking skeleton of a tested, nightly-updated portfolio website.

**Architecture:** Astro builds static pages from validated MDX and YAML. Pure functions in `src/lib/` hold the rules, scripts fetch GitHub data and render PDFs, and Cloudflare Workers serves the files. One composite GitHub Action is the quality gate for both pull requests and deploys.

**Tech Stack:** Astro 7, TypeScript 6, Zod 4, Vitest 5, Playwright, axe, Wrangler 4, GitHub Actions, Node 24.

**Spec:** [CONTEXT.md](../../../../CONTEXT.md)

## Global Constraints

- Node 24.22.3 and the exact package versions in Task 01. No `^` or `~`, and no upgrades.
- Copy the code in each task exactly. It was run against these versions, task by task, before being written here.
- No invented facts. Unknown values stay as quoted `"TODO(owner): ..."` placeholders.
- No client-side JavaScript, Worker script, adapter, SSR, `routes` or custom domain.
- No secrets in the repository. Deploys run only from CI.
- Never skip or delete a test, lower a threshold, add `@ts-ignore`, or disable an axe rule.
- Never spawn `astro dev` or `astro preview` from code. Astro runs them in the background when an AI agent starts them.
- If a step fails as written or contradicts `CONTEXT.md`, stop and put the question in the PR. Do not work around it.
- One branch and one PR per task. The agent never merges and never pushes to `main`.

## Tasks

Strictly in order. Start a task only after the previous PR is merged.

| # | Task | Branch | Gates to run locally |
|---|---|---|---|
| 01 | [Toolchain and first quality gate](01-toolchain.md) | `task/01-toolchain` | `npm run check`; `npm run test:unit`; `npm run build` |
| 02 | [Schemas and dates](02-schemas-dates.md) | `task/02-schemas-dates` | `npm run check`; `npm run test:unit` |
| 03 | [Integrity rules and check-content](03-integrity.md) | `task/03-integrity` | `npm run check`; `npm run test:unit` |
| 04 | [Ranking and evidence](04-rank-evidence.md) | `task/04-rank-evidence` | `npm run check`; `npm run test:unit` |
| 05 | [Seed content and collections](05-seed-content.md) | `task/05-seed-content` | `npm run check`; `npm run test:unit`; `npm run build` |
| 06 | [GitHub data](06-github-fetch.md) | `task/06-github-fetch` | `npm run check`; `npm run test:unit`; `npm run build` |
| 07 | [Pages and route tests](07-pages.md) | `task/07-pages` | `npm run check`; `npm run test:unit`; `npm run build`; `npm run test:e2e` |
| 08 | [Images, headers and no-JavaScript checks](08-images-headers.md) | `task/08-images-headers` | `npm run check`; `npm run test:unit`; `npm run build`; `npm run test:e2e` |
| 09 | [Résumé and CV PDFs](09-pdfs.md) | `task/09-pdfs` | `npm run check`; `npm run test:unit`; `npm run build`; `npm run pdf`; `npm run test:e2e` |
| 10 | [Accessibility gate](10-a11y.md) | `task/10-a11y` | `npm run check`; `npm run test:unit`; `npm run build`; `npm run pdf`; `npm run test:e2e` |
| 11 | [Deploy and nightly workflows](11-deploy.md) | `task/11-deploy` | `npm run check`; `npm run test:unit`; `npm run build`; `npm run pdf`; `npm run test:e2e`; `npm run test:smoke`; `npx wrangler deploy --dry-run` |
| 12 | [Documentation and final check](12-docs.md) | `task/12-docs` | `npm run check`; `npm run test:unit`; `npm run build`; `npm run pdf`; `npm run test:e2e` |

## Starting a Sonnet session

Open a new session in the repository, choose Sonnet, and send the following with the task number filled in:

> Execute docs/superpowers/plans/2026-11-22-portfolio-skeleton/NN-name.md using superpowers:executing-plans. Do only that task, then stop.

When its PR is green, review it with Opus (`/code-review high <PR number>`), resolve the findings, and squash-merge.
