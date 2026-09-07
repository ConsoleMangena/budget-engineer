# Reorganize into `backend/` + `frontend/` Monorepo Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize the project from a flat layout (frontend at root, backend nested) into a clean monorepo with `backend/` + `frontend/` top-level folders.

**Architecture:** Move all frontend files (source, config, tests, build) into `frontend/`. Keep `backend/` as-is. Update all path references (tsconfig, vite, vitest, gitignore, CI workflows). Add a root-level `package.json` with npm workspaces for easy `npm install` from the root.

**Tech Stack:** npm workspaces, Vite (with `root` config), Vitest, GitHub Actions

---

## Target Layout

```
budget-engineer/
├── .github/workflows/        ← stays
├── .gitignore                ← updated (frontend paths)
├── .npmrc                    ← stays
├── backend/                  ← stays (unchanged)
├── docs/                     ← stays
├── env.example               ← stays (both)
├── LICENSE                   ← stays
├── README.md                 ← stays (update backend scripts refs)
├── package.json              ← NEW: root workspace package
└── frontend/
    ├── package.json          ← moved (current root)
    ├── package-lock.json     ← moved
    ├── vite.config.ts        ← moved
    ├── vitest.config.ts      ← moved
    ├── vitest.integration.config.ts ← moved
    ├── tsconfig.json         ← moved
    ├── tsconfig.node.json    ← moved
    ├── eslint.config.js      ← moved
    ├── postcss.config.js     ← moved
    ├── tailwind.config.js    ← moved
    ├── index.html            ← moved
    ├── vercel.json           ← moved
    ├── lighthouserc.json     ← moved
    ├── playwright.config.ts  ← moved
    ├── src/                  ← moved
    ├── public/               ← moved
    ├── eval/                 ← moved
    ├── scripts/              ← moved
    ├── brain/                ← moved
    └── .env                  ← stays (gitignored)
```

---

## Files Modified/Created

| File | Action | Reason |
|------|--------|--------|
| `package.json` (root) | **Replace** | New workspace root |
| `frontend/package.json` | **Create** | Moved from root, backend scripts updated |
| `frontend/vite.config.ts` | **Move** | Unchanged (uses `import.meta.dirname`) |
| `frontend/vitest.config.ts` | **Move** | Unchanged |
| `frontend/tsconfig.json` | **Move** | Unchanged |
| `frontend/eslint.config.js` | **Move** | Unchanged |
| `frontend/vercel.json` | **Move + Edit** | Add `installCommand`/`buildCommand` |
| `.gitignore` | **Edit** | Update `node_modules`/`dist` to `frontend/` prefixed |
| `.github/workflows/ci.yml` | **Edit** | Add `working-directory: frontend` |
| `.github/workflows/deploy.yml` | **Edit** | Add `working-directory: frontend` |
| `.github/workflows/eval.yml` | **Edit** | Add `working-directory: frontend`, update `paths` |
| `.github/workflows/kpi3-gate.yml` | **Edit** | Add `working-directory: frontend` |

---

## Global Constraints

- No source code changes — pure structural reorganization.
- All existing tests must pass after the move (run from `frontend/`).
- The `@/` alias must continue to resolve to `frontend/src/`.
- The `backend/` directory must not be touched or moved.
- CI must continue to work after the move (update `working-directory`).
- npm workspaces allow `npm install` from root to install both frontend (and later backend) deps.

---

### Task 1: Create root workspace `package.json`

**Files:**
- Replace: `package.json` (root)

- [ ] **Step 1: Back up current root `package.json` content**

Read and save the current `package.json` to `frontend/package.json` path.

```bash
cp package.json frontend/package.json
```

- [ ] **Step 2: Create root workspace `package.json`**

```json
{
  "name": "budget-engineer-monorepo",
  "private": true,
  "workspaces": [
    "frontend"
  ],
  "scripts": {
    "frontend:dev": "npm run dev --workspace=frontend",
    "frontend:build": "npm run build --workspace=frontend",
    "frontend:test": "npm run test --workspace=frontend",
    "frontend:typecheck": "npm run typecheck --workspace=frontend",
    "frontend:lint": "npm run lint --workspace=frontend",
    "backend:check": "cd backend && python manage.py check",
    "backend:migrate": "cd backend && python manage.py migrate"
  }
}
```

Write this to `package.json` (root).

- [ ] **Step 3: Verify workspace resolves**

Run: `npm ls --all --depth=0 2>&1 | head -5`
Expected: shows `budget-engineer-monorepo` with `frontend` workspace listed.

---

### Task 2: Move all frontend files into `frontend/`

**Files:**
- Move all frontend-specific files and directories from root into `frontend/`

- [ ] **Step 1: Create `frontend/` directory**

```bash
mkdir -p frontend
```

- [ ] **Step 2: Move config files into `frontend/`**

```bash
mv vite.config.ts frontend/
mv vitest.config.ts frontend/
mv vitest.integration.config.ts frontend/
mv tsconfig.json frontend/
mv tsconfig.node.json frontend/
mv eslint.config.js frontend/
mv postcss.config.js frontend/
mv tailwind.config.js frontend/
mv index.html frontend/
mv vercel.json frontend/
mv lighthouserc.json frontend/
mv playwright.config.ts frontend/
mv package-lock.json frontend/
```

- [ ] **Step 3: Move source and asset directories into `frontend/`**

```bash
mv src frontend/
mv public frontend/
mv eval frontend/
mv scripts frontend/
mv brain frontend/
mv dist frontend/ 2>/dev/null || true   # may not exist
```

- [ ] **Step 4: Verify `frontend/` has all expected files**

Run: `ls frontend/`
Expected output includes: `package.json vite.config.ts tsconfig.json src/ public/ eval/ scripts/ brain/ index.html`

- [ ] **Step 5: Verify root only has expected monorepo files**

Run: `ls`
Expected: `.git .github backend docs env.example LICENSE README.md package.json .npmrc .gitignore frontend`

IMPORTANT — `node_modules` handling: With npm workspaces, `npm install` from the root **hoists** all frontend dependencies into the root `node_modules` (shared across workspaces). The existing root `node_modules` stays put; do NOT move it. After creating the workspace in Task 1 and moving files in this task, run `npm install` once from the root to reconcile the workspace links:
```bash
npm install
```
Expected: resolves quickly (deps already installed), links `frontend` into workspace graph.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: move all frontend files into frontend/ subdirectory"
```

---

### Task 3: Update frontend `package.json` — backend scripts paths

**Files:**
- Modify: `frontend/package.json` (backend scripts still use `cd backend`)

- [ ] **Step 1: Verify backend scripts in `frontend/package.json`**

The `dev:backend`, `backend:install`, `backend:migrate`, `backend:check`, `backend:test` scripts use `cd backend && ...`. These paths are relative to the CWD. From `frontend/`, `cd backend` would fail since `backend/` is at the repo root, not inside `frontend/`.

Update these 5 scripts to use the repo root:

```json
"dev:backend": "cd .. && cd backend && python manage.py runserver 0.0.0.0:8000",
"backend:install": "pip install -r ../backend/requirements.txt",
"backend:migrate": "cd .. && cd backend && python manage.py migrate",
"backend:check": "cd .. && cd backend && python manage.py check",
"backend:test": "cd .. && cd backend && python manage.py test"
```

Or simpler, use absolute paths via `npm --prefix`:

```json
"dev:backend": "cd .. && cd backend && python manage.py runserver 0.0.0.0:8000",
"backend:install": "cd .. && pip install -r backend/requirements.txt",
"backend:migrate": "cd .. && cd backend && python manage.py migrate",
"backend:check": "cd .. && cd backend && python manage.py check",
"backend:test": "cd .. && cd backend && python manage.py test"
```

- [ ] **Step 2: Verify `dev:backend` works**

Run (from `frontend/`): `cd .. && cd backend && python manage.py check 2>&1 | tail -2`
Expected: Django check passes or "No issues" / env not configured (acceptable).

- [ ] **Step 3: Commit**

```bash
git add frontend/package.json
git commit -m "fix(frontend): update backend script paths for nested layout"
```

---

### Task 4: Update `.gitignore` for new paths

**Files:**
- Modify: `.gitignore` (root)

- [ ] **Step 1: Update root `.gitignore`**

npm workspaces hoist dependencies into the root `node_modules`, so keep the root `node_modules` ignore in place and add `frontend/`-prefixed patterns.

Replace current contents with:

```gitignore
# Hoisted dependencies (npm workspaces) + frontend build output
node_modules
frontend/dist
frontend/.cache
frontend/.vite
frontend/coverage
frontend/.lighthouseci
frontend/lighthouse-report

# Backend (already in backend/)
backend/__pycache__
backend/*.pyc
backend/db.sqlite3
backend/.env
backend/media/
backend/staticfiles/

# Monorepo shared
.env
.env.local
.DS_Store
.vercel
corpus/*.json
build
Sources
```

- [ ] **Step 2: Verify `git status` is clean for gitignored files**

Run: `git status --short | grep node_modules || echo "node_modules correctly ignored"`
Expected: "node_modules correctly ignored" (nothing shows).

- [ ] **Step 3: Commit**

```bash
git add .gitignore
git commit -m "chore: update .gitignore for frontend/ nested layout"
```

---

### Task 5: Update GitHub Actions workflows — add `working-directory: frontend`

**Files:**
- Modify: `.github/workflows/ci.yml`
- Modify: `.github/workflows/deploy.yml`
- Modify: `.github/workflows/eval.yml`
- Modify: `.github/workflows/kpi3-gate.yml`

- [ ] **Step 1: Update `ci.yml` — add `working-directory` to all npm steps**

For every `run: npm ...` step in every job, add `working-directory: frontend`.

Current pattern:
```yaml
- run: npm ci --ignore-scripts
- run: npm run typecheck
```

Updated:
```yaml
- run: npm ci --ignore-scripts
  working-directory: frontend
- run: npm run typecheck
  working-directory: frontend
```

Apply this to ALL steps with `run: npm ...` in `ci.yml`: `typecheck`, `lint`, `shard-1`, `shard-2`, `shard-3`, `integration`, `build`, `release-gate`.

- [ ] **Step 2: Update `deploy.yml` — add `working-directory` to npm steps**

Same pattern — add `working-directory: frontend` to all `run: npm ...` and `run: npx ...` steps:
- `validate-build`: `npm ci`, `npm run build:only`
- `smoke-test`: `npm ci`, `npx playwright install`, `npm run test:smoke`

- [ ] **Step 3: Update `eval.yml` — add `working-directory` and update `paths`**

Change the `paths:` filter from:
```yaml
paths:
  - 'eval/**'
  - 'src/lib/ai/**'
  - 'src/engine/tools/**'
  - 'src/engine/estimation/**'
  - 'src/engine/rag/**'
  - 'src/lib/observability/**'
  - 'src/__tests__/kpi3Golden.test.ts'
  - 'src/__tests__/integration/kpi3Promptfoo.test.ts'
  - 'package.json'
  - 'package-lock.json'
```

To:
```yaml
paths:
  - 'frontend/eval/**'
  - 'frontend/src/lib/ai/**'
  - 'frontend/src/engine/tools/**'
  - 'frontend/src/engine/estimation/**'
  - 'frontend/src/engine/rag/**'
  - 'frontend/src/lib/observability/**'
  - 'frontend/src/__tests__/kpi3Golden.test.ts'
  - 'frontend/src/__tests__/integration/kpi3Promptfoo.test.ts'
  - 'frontend/package.json'
  - 'frontend/package-lock.json'
```

Also add `working-directory: frontend` to all `npm`/`npx` steps.

- [ ] **Step 4: Update `kpi3-gate.yml` — add `working-directory`**

Same as above — add `working-directory: frontend` to all `npm`/`npx` steps.

- [ ] **Step 5: Verify workflow syntax**

Run (from repo root): `python -c "import yaml; [yaml.safe_load(open(f'.github/workflows/{f}')) for f in ['ci.yml','deploy.yml','eval.yml','kpi3-gate.yml']]; print('all valid')"`
Expected: `all valid`

- [ ] **Step 6: Commit**

```bash
git add .github/workflows/
git commit -m "ci: update workflows for frontend/ nested layout"
```

---

### Task 6: Update `frontend/vercel.json` for correct build output

**Files:**
- Modify: `frontend/vercel.json`

- [ ] **Step 1: Check if `vercel.json` exists in `frontend/` and what it contains**

```bash
cat frontend/vercel.json 2>/dev/null || echo "vercel.json not in frontend/"
```

If it doesn't exist or is empty/defaults, create `frontend/vercel.json`:

```json
{
  "buildCommand": "npm run build:only",
  "outputDirectory": "dist",
  "installCommand": "npm install",
  "framework": "vite"
}
```

Note: Vercel with a monorepo auto-detects the `frontend/` root if the project root setting is configured. The `outputDirectory: "dist"` is relative to the Vercel project root (which should be set to `frontend/` in the Vercel dashboard). No code change needed in `vercel.json` itself — the Vercel project settings must be updated manually to set **Root Directory** to `frontend`.

- [ ] **Step 2: Commit (if vercel.json was changed)**

```bash
git add frontend/vercel.json
git commit -m "chore(frontend): set Vercel build config for nested layout" || echo "no changes"
```

---

### Task 7: Validate — typecheck, lint, tests, build

- [ ] **Step 1: Typecheck from `frontend/`**

Run (from repo root):
```bash
npm run typecheck --workspace=frontend 2>&1 | tail -5
```
Expected: 228 pre-existing errors (unchanged), no new errors.

- [ ] **Step 2: Lint from `frontend/`**

Run:
```bash
npm run lint --workspace=frontend 2>&1 | tail -5
```
Expected: 0 new errors.

- [ ] **Step 3: Run cloud tests**

Run:
```bash
npm run test:fast --workspace=frontend 2>&1 | tail -10
```
Expected: all tests pass.

- [ ] **Step 4: Production build**

Run:
```bash
npm run build:only --workspace=frontend 2>&1 | tail -5
```
Expected: build succeeds, `frontend/dist/` is populated.

- [ ] **Step 5: Verify no secrets in tracked files**

Run:
```bash
rg -n "sb_publishable|sb_secret|SECRET_KEY=change|anon_key" --glob '!node_modules' --glob '!backend/.env*' --glob '!frontend/dist' .
```
Expected: no output (no secrets found).

- [ ] **Step 6: Commit any straggler changes (if any)**

```bash
git add -A
git commit -m "chore: validate reorganization" || echo "clean tree"
```

---

### Task 8: Update `README.md` — document new layout

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update the "Quick Start" section to show new paths**

Find the `## Quick Start` section and update the commands to reflect `frontend/` paths.

Current (example):
```bash
npm install
npm run dev
```

Updated:
```bash
# Install from root (installs frontend workspace)
npm install

# Frontend
cd frontend && npm run dev

# Backend (separate terminal)
cd backend && python manage.py runserver
```

- [ ] **Step 2: Update the "Commands" table to show `npm run <cmd> --workspace=frontend`**

Add a note that all frontend commands run from `frontend/` or use `--workspace=frontend` from root.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: update README for frontend/ nested layout"
```
