# Task 01: Toolchain and first quality gate

> **For agentic workers:** REQUIRED SUB-SKILL: use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax. Read [00-overview.md](00-overview.md) and the Known traps and Guardrails in [CONTEXT.md](../../../../CONTEXT.md) first. Do only this task.

**Goal:** A project that installs, type checks and builds, with a `quality-gate` check on every pull request.

**Branch:** `task/01-toolchain`

**Files:**
- `.nvmrc`
- `package.json`
- `.gitignore`
- `tsconfig.json`
- `astro.config.mjs`
- `vitest.config.ts`
- `src/pages/index.astro`
- `.github/actions/quality-gate/action.yml`
- `.github/workflows/pr.yml`

**Interfaces:**
- Consumes: Nothing. This is the first task.
- Produces: npm scripts `dev`, `check`, `build`, `test:unit`. A CI job named `quality-gate`.

**Notes:**
- `passWithNoTests` exists only in this task. Task 02 removes it.
- After this PR has run once, the owner adds the `main` ruleset before merging. See Owner setup in `CONTEXT.md`.

- [ ] **Step 1: Start the branch**

````bash
git switch main && git pull && git switch -c task/01-toolchain
````

- [ ] **Step 2: Create the configuration**

`.nvmrc`

````text
24.22.3
````

`package.json`

````json
{
  "name": "portfolio-website",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "engines": { "node": ">=24.22.3" },
  "scripts": {
    "dev": "astro dev",
    "check": "astro check",
    "build": "astro build",
    "test:unit": "vitest run --coverage"
  },
  "dependencies": {
    "@astrojs/mdx": "8.1.6",
    "astro": "7.4.13",
    "sharp": "0.35.5"
  },
  "devDependencies": {
    "@astrojs/check": "0.9.12",
    "@axe-core/playwright": "4.14.0",
    "@playwright/test": "1.65.1",
    "@types/node": "24.19.2",
    "@vitest/coverage-v8": "5.1.1",
    "exifr": "7.1.3",
    "tsx": "4.23.15",
    "typescript": "6.0.3",
    "unpdf": "2.2.1",
    "vitest": "5.1.1",
    "wrangler": "4.166.0",
    "yaml": "2.9.1"
  }
}
````

`.gitignore`

````text
node_modules/
dist/
.astro/
.wrangler/
coverage/
playwright-report/
test-results/
src/data/github.json
.env*
.dev.vars
````

`tsconfig.json`

````json
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist", "coverage", "playwright-report", "test-results"],
  "compilerOptions": { "types": ["node"] }
}
````

`astro.config.mjs`

````js
import mdx from '@astrojs/mdx';
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: process.env.SITE_URL || 'https://example.invalid',
  trailingSlash: 'always',
  integrations: [mdx()],
  security: { csp: true },
  // Shiki writes inline styles, which the CSP blocks.
  markdown: { syntaxHighlight: false },
});
````

`vitest.config.ts`

````ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts'],
    passWithNoTests: true,
    coverage: { provider: 'v8', include: ['src/lib/**/*.ts'] },
  },
});
````

`src/pages/index.astro`

````astro
---
---
<html lang="en">
  <head><meta charset="utf-8" /><title>Nelson Raphael</title></head>
  <body><h1>Nelson Raphael</h1></body>
</html>
````

- [ ] **Step 3: Create the quality gate**

`.github/actions/quality-gate/action.yml`

````yaml
name: Quality gate
description: Every automated check. Pull requests and deploys both run this.
inputs:
  github-token:
    description: Token for the GitHub GraphQL API. Empty means fixture data.
    default: ''
  site-url:
    description: Public URL of the site. Empty means a placeholder.
    default: ''
runs:
  using: composite
  steps:
    - uses: actions/setup-node@v7.1.0
      with:
        node-version-file: .nvmrc
        cache: npm
    - name: G1 install
      shell: bash
      run: npm ci
    - name: Audit report (does not block)
      shell: bash
      run: npm audit --audit-level=high || echo "::warning::npm audit found high severity issues"
    - name: G2 type check
      shell: bash
      run: npm run check
    - name: G3 unit tests
      shell: bash
      run: npm run test:unit
````

`.github/workflows/pr.yml`

````yaml
name: PR
on:
  pull_request:
    branches: [main]
permissions:
  contents: read
jobs:
  quality-gate:
    runs-on: ubuntu-24.04
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v7.0.1
      - uses: ./.github/actions/quality-gate
````

- [ ] **Step 4: Install and create the lockfile. Commit `package-lock.json`**

````bash
npm install
````

- [ ] **Step 5: Run every gate**

````bash
npm run check
npm run test:unit
npm run build
````

Expected: every command exits 0, with 0 type errors and no failing or skipped test. If one fails, fix your own work. Never change a test, threshold or gate to make it pass.

- [ ] **Step 6: Commit, push and open the PR**

````bash
git add .github .gitignore .nvmrc astro.config.mjs package-lock.json package.json src tsconfig.json vitest.config.ts
git status --short
git commit -m "chore: add toolchain and quality gate"
git push -u origin task/01-toolchain
gh pr create --base main --title "chore: add toolchain and quality gate" --body-file - <<'EOF'
## Built

## Gate output

## Defaults relied on

## Open questions

EOF
````

Fill in every section of the PR body first. If `gh` is unavailable, report the compare URL.

- [ ] **Step 7: Stop**

Do not merge and do not start the next task. The owner runs the Opus review and merges.
