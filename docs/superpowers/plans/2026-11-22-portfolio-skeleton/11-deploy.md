# Task 11: Deploy and nightly workflows

> **For agentic workers:** REQUIRED SUB-SKILL: use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax. Read [00-overview.md](00-overview.md) and the Known traps and Guardrails in [CONTEXT.md](../../../../CONTEXT.md) first. Do only this task.

**Goal:** Deploys from `main` and every night, using the same gate as pull requests.

**Branch:** `task/11-deploy`

**Files:**
- `tests/e2e/smoke.spec.ts`
- `.github/workflows/main.yml`
- `.github/workflows/nightly.yml`
- `package.json` (scripts)

**Interfaces:**
- Consumes: The quality gate action. `SMOKE_BASE_URL` support in `playwright.config.ts` from Task 07.
- Produces: `main.yml`, `nightly.yml`, `test:smoke`.

**Notes:**
- Never run `npx wrangler deploy` without `--dry-run`. Deploys run only from CI.
- The owner adds the secrets before merging, then works through the owner checklist in `CONTEXT.md`. The agent cannot verify a real deploy.

- [ ] **Step 1: Start the branch**

````bash
git switch main && git pull && git switch -c task/11-deploy
npm ci
````

- [ ] **Step 2: Write the smoke tests**

`tests/e2e/smoke.spec.ts`

````ts
import { expect, test } from '@playwright/test';

test('home page is live @smoke', async ({ page }) => {
  expect((await page.goto('/'))?.status()).toBe(200);
  await expect(page).toHaveTitle(/Nelson Raphael/);
});

test('unknown paths return 404 @smoke', async ({ page }) => {
  expect((await page.goto('/this-page-does-not-exist/'))?.status()).toBe(404);
  await expect(page.locator('h1')).toHaveText('Page not found');
});

test('the CV is live @smoke', async ({ request }) => {
  expect((await request.get('/cv.pdf')).status()).toBe(200);
});
````

````bash
npm pkg set scripts.test:smoke="playwright test --grep @smoke"
````

- [ ] **Step 3: Create the workflows**

`.github/workflows/main.yml`

````yaml
name: Deploy
on:
  push:
    branches: [main]
  workflow_dispatch:
  workflow_call:
permissions:
  contents: read
jobs:
  deploy:
    runs-on: ubuntu-24.04
    timeout-minutes: 25
    # Only here: adding this to nightly.yml too would deadlock.
    concurrency:
      group: production-deploy
      cancel-in-progress: false
    steps:
      - uses: actions/checkout@v7.0.1
      - name: Restore GitHub data
        uses: actions/cache/restore@v6.1.0
        with:
          path: src/data/github.json
          key: github-json-${{ github.run_id }}-${{ github.run_attempt }}
          restore-keys: github-json-
      - uses: ./.github/actions/quality-gate
        with:
          github-token: ${{ secrets.GH_GRAPHQL_TOKEN }}
          site-url: ${{ vars.SITE_URL }}
      - name: Deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
        run: npx wrangler deploy
      - name: Smoke tests
        if: vars.SITE_URL != ''
        env:
          SMOKE_BASE_URL: ${{ vars.SITE_URL }}
        run: npm run test:smoke
      - name: Smoke tests skipped
        if: vars.SITE_URL == ''
        run: echo "::warning::SITE_URL is not set, so smoke tests were skipped"
      - name: Read the data source
        id: data
        run: echo "source=$(node -p "JSON.parse(require('fs').readFileSync('src/data/github.json','utf8')).source")" >> "$GITHUB_OUTPUT"
      - name: Save GitHub data
        if: steps.data.outputs.source == 'live'
        uses: actions/cache/save@v6.1.0
        with:
          path: src/data/github.json
          key: github-json-${{ github.run_id }}-${{ github.run_attempt }}
````

`.github/workflows/nightly.yml`

````yaml
name: Nightly
on:
  schedule:
    # Off the hour, because GitHub delays schedules at busy times.
    - cron: '17 8 * * *'
  workflow_dispatch:
permissions:
  contents: read
jobs:
  deploy:
    uses: ./.github/workflows/main.yml
    secrets: inherit
````

- [ ] **Step 4: Run every gate**

````bash
npm run check
npm run test:unit
npm run build
npm run pdf
npm run test:e2e
npm run test:smoke
npx wrangler deploy --dry-run
````

Expected: every command exits 0, with 0 type errors and no failing or skipped test. If one fails, fix your own work. Never change a test, threshold or gate to make it pass.

- [ ] **Step 5: Commit, push and open the PR**

````bash
git add .github package-lock.json package.json tests
git status --short
git commit -m "ci: add deploy and nightly workflows"
git push -u origin task/11-deploy
gh pr create --base main --title "ci: add deploy and nightly workflows" --body-file - <<'EOF'
## Built

## Gate output

## Defaults relied on

## Open questions

EOF
````

Fill in every section of the PR body first. If `gh` is unavailable, report the compare URL.

- [ ] **Step 6: Stop**

Do not merge and do not start the next task. The owner runs the Opus review and merges.
