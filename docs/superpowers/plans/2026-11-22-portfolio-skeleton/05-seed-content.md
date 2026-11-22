# Task 05: Seed content and collections

> **For agentic workers:** REQUIRED SUB-SKILL: use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax. Read [00-overview.md](00-overview.md) and the Known traps and Guardrails in [CONTEXT.md](../../../../CONTEXT.md) first. Do only this task.

**Goal:** Real, validated content files loaded by Astro, with content integrity in the gate.

**Branch:** `task/05-seed-content`

**Files:**
- `src/content/site.yaml`
- `src/content/tracks.yaml`
- `src/content/skills.yaml`
- `src/content/milestones.yaml`
- `src/content/experience/test-architect.yaml`
- `src/content/experience/test-engineer.yaml`
- `src/content/experience/embedded-software-engineer.yaml`
- `src/content/experience/early-career-program.yaml`
- `src/content/projects/agentsofolympus.mdx`
- `src/content/projects/meridian-sigma.mdx`
- `src/content/projects/portfolio-website.mdx`
- `src/content/projects/charger-firmware-test-automation.mdx`
- `src/content/projects/emerging-100-event-branding.mdx`
- `src/content.config.ts`
- `.github/actions/quality-gate/action.yml`
- `package.json` (scripts)

**Interfaces:**
- Consumes: Schemas from Task 02. `check:content` from Task 03.
- Produces: Collections `projects`, `experience`, `skills`, `milestones`, `tracks`, `site`. The site entry id is `site`.

**Notes:**
- Every `TODO(owner)` in YAML or frontmatter stays quoted.
- The untracked `site.yaml` and `Questions.md` in the repository root belong to the owner. Do not commit, move or delete them.

- [ ] **Step 1: Start the branch**

````bash
git switch main && git pull && git switch -c task/05-seed-content
npm ci
````

- [ ] **Step 2: Create the content. Copy it exactly and invent nothing**

`src/content/site.yaml`

````yaml
name: Nelson Raphael
headline: "TODO(owner): site headline"
email: NelsonRaphael24@outlook.com
github: https://github.com/Nels27
linkedin: https://www.linkedin.com/in/nelsonraphael278/
````

`src/content/tracks.yaml`

````yaml
- id: nonprofit
  title: Non-profit work
  headline: "TODO(owner): non-profit headline"
  description: "TODO(owner): non-profit description"
  order: 1
- id: professional
  title: Day to day role
  headline: "TODO(owner): professional headline"
  description: "TODO(owner): professional description"
  order: 2
- id: side-projects
  title: Technical side projects
  headline: "TODO(owner): side projects headline"
  description: "TODO(owner): side projects description"
  order: 3
  default: true
````

`src/content/skills.yaml`

````yaml
- id: seed-testing
  name: "TODO(owner): testing skill"
  category: testing
  evidence: [charger-firmware-test-automation]
- id: seed-infrastructure
  name: "TODO(owner): infrastructure skill"
  category: infrastructure
  evidence: [portfolio-website]
- id: seed-leadership
  name: "TODO(owner): leadership skill"
  category: leadership
  evidence: [emerging-100-event-branding]
````

`src/content/milestones.yaml`

````yaml
- id: bs-electrical-engineering
  date: "2019-05"
  title: BS, Electrical Engineering
  kind: education
- id: ms-computer-science
  date: "TODO(owner): degree date"
  title: MS, Computer Science, Computational Perception and Robotics
  kind: education
  detail: Georgia Institute of Technology, in progress
````

`src/content/experience/test-architect.yaml`

````yaml
organization: Heliox, A Siemens Business (Test Team)
title: Test Architect
tracks: [professional]
start: "2026-01"
highlights:
  - "TODO(owner): a Test Architect achievement"
projects: [charger-firmware-test-automation]
````

`src/content/experience/test-engineer.yaml`

````yaml
organization: Heliox, A Siemens Business (Test Team)
title: Test Engineer
tracks: [professional]
start: "2024-01"
end: "2026-03"
highlights:
  - Software development engineer in test (SDET) focus
  - "TODO(owner): a Test Engineer achievement"
````

`src/content/experience/embedded-software-engineer.yaml`

````yaml
organization: Siemens eMobility, now Heliox, A Siemens Business (Firmware Development Team)
title: Embedded Software Engineer
tracks: [professional]
start: "2023-11"
end: "2024-02"
highlights:
  - "TODO(owner): an Embedded Software Engineer achievement"
````

`src/content/experience/early-career-program.yaml`

````yaml
organization: Siemens eMobility, now Heliox, A Siemens Business
title: eMobility Early Career Experience Program
tracks: [professional]
start: "2022-01"
end: "2023-11"
highlights:
  - "Roles held: Software Developer, Software Engineer, Automation Engineer and Systems Engineer"
  - "TODO(owner): a program achievement"
````

`src/content/projects/agentsofolympus.mdx`

````mdx
---
title: AgentsOfOlympus
summary: An AI agent orchestration server implementation
tracks: [side-projects]
role: "TODO(owner): role"
period:
  start: "TODO(owner): start date"
stack: [Shell, Docker, SOPS]
outcomes:
  - "TODO(owner): an outcome"
repo: Nels27/AgentsOfOlympus
featured: true
---

TODO(owner): write the case study.
````

`src/content/projects/meridian-sigma.mdx`

````mdx
---
title: Meridian-Sigma
summary: Microservices algorithmic trading platform
tracks: [side-projects]
role: "TODO(owner): role"
period:
  start: "TODO(owner): start date"
stack: [FastAPI, React, Redis, Docker, Prometheus, Grafana]
outcomes:
  - "TODO(owner): an outcome"
cover: ../../assets/projects/meridian-sigma/cover.png
coverAlt: "TODO(owner): describe the image"
---

TODO(owner): write the case study.
````

`src/content/projects/portfolio-website.mdx`

````mdx
---
title: Portfolio Website
summary: Statically generated portfolio with tested content, nightly data refresh and generated résumés
tracks: [side-projects]
role: "TODO(owner): role"
period:
  start: "2026-11"
stack: [Astro, TypeScript, Cloudflare Workers, GitHub Actions, Vitest, Playwright]
outcomes:
  - "TODO(owner): an outcome"
repo: Nels27/Portfolio-Website
featured: true
---

TODO(owner): write the case study.
````

`src/content/projects/charger-firmware-test-automation.mdx`

````mdx
---
title: Charger Firmware Test Automation
summary: Automated integration test suites for EV charger firmware
tracks: [professional]
role: "TODO(owner): role"
period:
  start: "TODO(owner): start date"
stack:
  - "TODO(owner): stack"
outcomes:
  - "TODO(owner): an outcome"
confidential: true
---

TODO(owner): write the case study. Describe approach and outcomes only.
````

`src/content/projects/emerging-100-event-branding.mdx`

````mdx
---
title: Emerging 100 Event Branding
summary: Branded event materials for Emerging 100 North Metro ATL
tracks: [nonprofit]
role: "TODO(owner): role"
period:
  start: "TODO(owner): start date"
stack:
  - "TODO(owner): tools"
outcomes:
  - "TODO(owner): an outcome"
---

TODO(owner): write the case study.
````

- [ ] **Step 3: Generate the placeholder cover**

````bash
mkdir -p src/assets/projects/meridian-sigma
node -e "require('sharp')({create:{width:1200,height:675,channels:3,background:'#8a8a8a'}}).png().toFile('src/assets/projects/meridian-sigma/cover.png')"
````

- [ ] **Step 4: Create the collections**

`src/content.config.ts`

````ts
import { file, glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { defineCollection, reference } from 'astro:content';
import { parse } from 'yaml';
import {
  experienceSchema,
  milestoneSchema,
  projectSchema,
  siteSchema,
  skillSchema,
  trackSchema,
} from './lib/schemas';

const tracks = z.array(reference('tracks')).min(1);

export const collections = {
  projects: defineCollection({
    loader: glob({
      pattern: '*.mdx',
      base: 'src/content/projects',
      // The default id generator strips dots, which would break rule 4.
      generateId: ({ entry }) => entry.replace(/\.mdx$/, '').toLowerCase(),
    }),
    schema: ({ image }) =>
      projectSchema.extend({
        tracks,
        cover: image().optional(),
        gallery: z
          .array(z.object({ src: image(), alt: z.string(), caption: z.string().optional() }))
          .default([]),
      }),
  }),
  experience: defineCollection({
    loader: glob({ pattern: '*.yaml', base: 'src/content/experience' }),
    schema: experienceSchema.extend({ tracks, projects: z.array(reference('projects')).default([]) }),
  }),
  skills: defineCollection({
    loader: file('src/content/skills.yaml'),
    schema: skillSchema.extend({ evidence: z.array(reference('projects')).min(1) }),
  }),
  milestones: defineCollection({ loader: file('src/content/milestones.yaml'), schema: milestoneSchema }),
  tracks: defineCollection({ loader: file('src/content/tracks.yaml'), schema: trackSchema }),
  site: defineCollection({
    loader: file('src/content/site.yaml', { parser: (text) => [{ id: 'site', ...parse(text) }] }),
    schema: siteSchema,
  }),
};
````

- [ ] **Step 5: Add content integrity to the build and the gate (gate G5)**

````bash
npm pkg set scripts.build="npm run check:content && astro build"
````

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
    - name: G3 and G4 unit tests and coverage
      shell: bash
      run: npm run test:unit
    - name: G5 content integrity and build
      shell: bash
      env:
        GH_GRAPHQL_TOKEN: ${{ inputs.github-token }}
        SITE_URL: ${{ inputs.site-url }}
      run: npm run build
````

- [ ] **Step 6: Confirm the integrity check blocks a build. Expect `[rule 1]` and a non-zero exit, then restore the file**

````bash
sed -i 's/\[portfolio-website\]/[ghost]/' src/content/skills.yaml
npm run build; echo "exit $?"
sed -i 's/\[ghost\]/[portfolio-website]/' src/content/skills.yaml
````

- [ ] **Step 7: Run every gate**

````bash
npm run check
npm run test:unit
npm run build
````

Expected: every command exits 0, with 0 type errors and no failing or skipped test. If one fails, fix your own work. Never change a test, threshold or gate to make it pass.

- [ ] **Step 8: Commit, push and open the PR**

````bash
git add .github package-lock.json package.json src
git status --short
git commit -m "feat: add seed content and collections"
git push -u origin task/05-seed-content
gh pr create --base main --title "feat: add seed content and collections" --body-file - <<'EOF'
## Built

## Gate output

## Defaults relied on

## Open questions

EOF
````

Fill in every section of the PR body first. If `gh` is unavailable, report the compare URL.

- [ ] **Step 9: Stop**

Do not merge and do not start the next task. The owner runs the Opus review and merges.
