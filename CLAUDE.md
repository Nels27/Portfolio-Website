# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Source of truth

- [CONTEXT.md](CONTEXT.md) is the authoritative spec: schemas, library contracts, integrity rules, the GitHub failure table, pages, gates, guardrails. When this file and CONTEXT.md disagree, CONTEXT.md wins.
- The build is delivered as 12 sequential tasks in [docs/superpowers/plans/2026-11-22-portfolio-skeleton/](docs/superpowers/plans/2026-11-22-portfolio-skeleton/00-overview.md). Each task file contains the exact code to write; it was run against the pinned versions, so copy it verbatim. Check which tasks are merged (`git log origin/main`) before assuming a file or script exists.
- If a step fails as written, contradicts CONTEXT.md, or needs a value nobody has given: stop and put the question in the PR description. Never work around it.

## Environment

- WSL, Node 24.22.3 via nvm (`.nvmrc`). Non-interactive shells don't load nvm, so prefix commands with `source ~/.nvm/nvm.sh && nvm use >/dev/null && …`. The `npm` on the default WSL path is a broken Windows shim.
- Every dependency is pinned exactly (no `^`/`~`). Never upgrade one as part of a task. TypeScript stays on 6.x: `@astrojs/check` rejects 7.

## Commands

```bash
npm ci                                  # G1: install from the lockfile
npm run check                           # G2: astro check, must report 0 errors
npm run test:unit                       # G3+G4: vitest with coverage; fails under 90% lines/branches on src/lib/
npx vitest run tests/unit/dates.test.ts # one file (skip --coverage: a partial run fails the threshold)
npx vitest run -t 'formats periods'     # one test by name
npm run build                           # astro build
```

Later tasks add `check:content`, `fetch:github`, `pdf`, `test:e2e`, `test:smoke` and `test` (see "npm scripts" in CONTEXT.md). Gates G5–G8 come with them.

Never start `astro dev` or `astro preview` yourself or from code: under an AI agent Astro 7 backgrounds them and exits at once. Code uses `import { preview } from 'astro'`; for a manual run set `ASTRO_DEV_BACKGROUND=0` / `ASTRO_PREVIEW_BACKGROUND=0`.

## Architecture

A static Astro 7 site. GitHub Actions does all the updating; the Cloudflare Worker only serves `dist/` (static assets, no Worker script, no adapter, no SSR, no client-side JavaScript).

Data flow:

1. **Content** lives in `src/content/`: one MDX file per project (frontmatter is the record, body is the case study), one YAML file per experience role, plus `skills.yaml`, `milestones.yaml`, `tracks.yaml` and `site.yaml`.
2. **Field rules** are plain Zod objects in `src/lib/schemas.ts` (Zod from `astro/zod`). References are id strings there. `content.config.ts` extends the same schemas with `reference()` and `image()` for Astro's collections.
3. **Cross-field rules** (12 numbered integrity rules) live only in `src/lib/integrity.ts`. `scripts/check-content.ts` reads the raw files through `scripts/lib/content.ts`, runs them, and exits 1 before `astro build`. This matters because Astro logs a broken `reference()` but still exits 0.
4. **GitHub data**: `scripts/fetch-github.ts` writes `src/data/github.json` (gitignored), falling back to cache, then to `tests/fixtures/github.json`, per the failure table in CONTEXT.md. Without a token it uses the fixture, so local builds need no secrets.
5. **Pages** map Astro entries to plain shapes via `src/lib/adapt.ts`, then use the pure helpers (`rank`, `evidence`, `dates`). Tracks, their order and the default track are always read from `tracks.yaml`, never hardcoded.
6. **PDFs**: `scripts/render-pdfs.ts` serves the built site with `preview()`, prints `/resume/<track>/` and `/cv/` in Chromium, and writes them into `dist/`.

`src/lib/` is pure: no Astro imports other than `astro/zod`, no filesystem, no network. That's what makes the 90% coverage gate achievable.

CI: one composite action, `.github/actions/quality-gate/action.yml`, holds every automated gate. `pr.yml` uses it now; `main.yml` (deploy) and `nightly.yml` will use the same action, so a PR and a deploy can't run different checks. The job is named `quality-gate`, which is the required status check in the `main` ruleset. Never rename it.

## Traps verified against the pinned versions

- No `.refine()`/`.superRefine()` on object schemas in `schemas.ts`: `content.config.ts` extends them, and Zod 4 throws on `.extend()` of a refined object.
- Dates are `YYYY-MM` strings or a string starting `TODO(owner)`. Never construct a `Date`: `new Date('2026-03')` is UTC and can render as February.
- Placeholders are always quoted in YAML (`"TODO(owner): …"`). Unquoted, it's invalid YAML. Never put `<`, `>`, `{` or `}` in MDX body placeholder text: MDX parses them as JSX.
- `file()` loaders need the `parser` and `glob()` needs the `generateId` shown under "Collections" in CONTEXT.md.
- Vitest's `include` is limited to `tests/unit/**/*.test.ts`. Playwright specs end in `.spec.ts` and run against `wrangler dev`, not `astro preview`, because only wrangler matches Cloudflare's redirects and 404s.
- `SITE_URL` affects only the build; `SMOKE_BASE_URL` affects only the test target. Never use one for the other.
- `exifr` throws on WebP and SVG, so source images are `.png`, `.jpg`, `.jpeg` or `.svg` only.
- Astro 7 removes whitespace between inline elements across lines. Add `{' '}` in `.astro` templates where a space is needed.
- CSP is on (`security: { csp: true }`), so `markdown.syntaxHighlight` is off: Shiki's inline styles would be blocked.

## Workflow

- One branch and one PR per task, cut from an up-to-date `main`. Tests come first. Conventional Commits.
- Run every gate that exists so far locally before pushing.
- The PR body has four sections: Built, Gate output, Defaults relied on, Open questions.
- **Never merge, never push to `main`, never start the next task.** The owner runs an Opus review (G9) and squash-merges (G10). The ruleset requires `quality-gate` to pass on an up-to-date branch.
- Never weaken a gate: no skipped or deleted tests, lowered thresholds, `continue-on-error`, `@ts-ignore` or disabled axe rules.

## Content guardrails

- No invented facts about the owner, employer, metrics or dates. The only known facts are under "Seed content" in CONTEXT.md; everything else is a quoted `TODO(owner)` placeholder.
- Confidential work stays generic: the employer may be named, but no proprietary systems, code, data, hostnames or tooling.
- No homelab links, no GPS metadata in images, no committed video, no phone number or address. The email appears only on résumé and CV pages.
- `Questions.md` and `site.yaml` at the repo root are the owner's untracked notes. Don't commit, move or edit them.
