# Design: Budget Engineer + Africa ConTech Hub Django Backend (Optional Cloud Layer)

Date: 2026-09-07
Status: Approved
Owner: securequalitybuilders-art / budget-engineer

## Goal

Turn **budget-engineer** (offline-first frontend) into the single combined project by
co-locating the **Django backend** from the `africacontechhub` project inside the
budget-engineer repository, removing the dependency on africacontechhub's old React
frontend, and adding a small **optional cloud layer** (Supabase auth + project/BOQ sync)
that leaves budget-engineer's offline-first core fully intact.

Principles honored:

- budget-engineer remains local-first, offline-capable, and privacy-respecting.
- The cloud layer is **opt-in and non-blocking**: nothing breaks when env vars are unset,
  no login is required to use the app offline.
- The original `C:\Users\THINKPAD\Documents\africacontechhub` folder is left **untouched**
  (copy-only, no deletion).
- No existing budget-engineer store, Dexie schema, page, or test is rewritten.

## Decisions (from discovery)

- **Target folder:** budget-engineer's own folder (`C:\Users\THINKPAD\Documents\budget-engineer`).
- **Integration depth:** optional cloud layer (recommended option chosen).
- **Old project:** africacontechhub left fully intact; only the backend + backend deploy
  files are copied.

## Repository Layout (after change)

```
budget-engineer/
├── backend/                  # NEW — copied verbatim from africacontechhub/backend
│   ├── apps/
│   │   ├── core/
│   │   ├── authentication/
│   │   ├── admin_dashboard/
│   │   ├── ai_architecture/
│   │   ├── architectural_studio/
│   │   ├── billing/
│   │   ├── builder_dashboard/
│   │   ├── contractor_dashboard/
│   │   └── supplier_dashboard/
│   ├── config/               # settings.py, urls.py, wsgi.py, asgi.py, error_handlers.py
│   ├── manage.py
│   ├── requirements.txt
│   └── .env.example          # NEW — all backend env vars documented (no secrets committed)
├── Dockerfile.backend        # NEW — copied/adapted from africacontechhub
├── docker-compose.yml        # NEW — backend-only service (no frontend/nginx service)
├── docker-compose.prod.yml   # NEW — backend-only prod compose (adapted)
├── .dockerignore             # NEW — copied from africacontechhub
├── .env.example              # UPDATED — adds VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_API_URL
├── package.json              # UPDATED — adds backend scripts (dev:backend, backend:install, backend:migrate)
├── src/
│   ├── services/
│   │   ├── cloudApi.ts       # NEW — thin fetch client, baseURL /api/v1, injects Bearer JWT
│   │   ├── cloudAuth.ts      # NEW — @supabase/supabase-js wrapper (password / magic link / sign-out)
│   │   └── cloudSync.ts      # NEW — pure mappers + push/pull projects & BOQ lines
│   ├── stores/
│   │   └── cloudStore.ts     # NEW — zustand store (cloudStatus, user, lastSync, error)
│   └── components/
│       ├── layout/SyncIndicator.tsx    # NEW — status chip beside existing OfflineIndicator
│       └── cloud/CloudLoginDialog.tsx  # NEW — optional login dialog with "continue offline"
└── docs/superpowers/specs/   # NEW — this spec
```

NOT copied (old frontend stripped): africacontechhub `frontend/`, `src/`, root
`package.json`, `Dockerfile.frontend`, `nginx.conf`, `nginx.prod.conf`, `patch.diff`,
`check_jsx.js`, `deploy.sh`, `setup_droplet.sh`, root `.env` (none exists), README.

## Backend Copy

1. Copy `africacontechhub/backend/` → `budget-engineer/backend/` verbatim.
2. Copy `Dockerfile.backend` and `.dockerignore` from africacontechhub root; adapt paths
   so the Docker context is `./backend`.
3. Author `docker-compose.yml` / `docker-compose.prod.yml` with **only** the backend
   service (plus optional managed postgres), removing the frontend + nginx services.
   budget-engineer's frontend continues to deploy via its existing static-hosting story
   (Vercel / static host / PWA).
4. The backend keeps its Supabase-JWT auth (`apps/authentication/backend.py`) and all
   existing Django apps — no models/views are modified.

## Frontend Integration (Optional Cloud Layer)

### Dev proxy
Add to `vite.config.ts`:
`server.proxy['/api'] = { target: 'http://localhost:8000', changeOrigin: true }`
so `/api/v1/...` requests reach Django in dev without CORS friction.

### cloudApi.ts — thin fetch client
- No new HTTP dependency (budget-engineer has none; avoids axios).
- `apiFetch<T>(path, init?)` prefixes `/api/v1` (API base from `import.meta.env.VITE_API_URL`,
  falls back to `/api/v1`), sets JSON headers, and when a Supabase session exists injects
  `Authorization: Bearer <jwt>` (mirrors africacontechhub's `api.ts` auth strategy).
- Shareable access-token cache + refresh handling for 401 retry (subset of old api.ts logic).

### cloudAuth.ts — Supabase auth wrapper
- New runtime dependency: `@supabase/supabase-js`.
- Functions: `signInWithPassword`, `signInWithMagicLink`, `signOut`, `getSession`,
  `onAuthStateChange` hook wiring.
- Reads `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`; if unset, cloud features are
  disabled (no errors thrown at startup).

### cloudStore.ts — state
- Mirrors `authStore.ts` conventions (zustand + immer + persist).
- State: `status: 'offline' | 'signed-out' | 'signing-in' | 'signed-in' | 'syncing'`,
  `user` (email), `lastSyncAt`, `lastError`.
- Defaults to offline/signed-out. Existing RBAC `authStore.ts` is untouched.

### cloudSync.ts — sync service (v1)
Pure mapper functions with unit tests:

- `localProjectToDto(local)` → Django `Project` payload
  (title, building_type, status, budget, location) — best-effort mapping from the local
  project model; fields absent locally are omitted.
- `dtoToLocalProject(dto)` → importable local project shape (used to pull remote lists).
- `boqLinesToDtos(localBoq)` → `boq-building-items` lines (`budget_kind=preliminary`).
- `dtosToBoqLines(dtos)` → local BOQ shape for pull.

Sync actions (v1, last-write-wins, documented):

- **Push project metadata**: create/update Django `/projects/` from local project(s).
- **Pull remote projects**: list `/projects/`, map to local-side preview for import.
- **Push budget as BOQ lines**: upsert lines to `/boq-building-items/` for the matched
  project (preliminary budget). No delete of remote lines in v1.
- No change to local Dexie schemas; the cloud is an optional mirror.

### UI
- `SyncIndicator.tsx` (in layout, beside existing `OfflineIndicator`):
  "Offline" / "Sign in" / "Syncing…" / "Last synced <t>" chip; click → CloudLoginDialog.
- `CloudLoginDialog.tsx`: email+password or magic-link, inline error, "Continue offline"
  dismiss. Placed in the app shell without wrapping or blocking app routes.

## Environment Configuration

`backend/.env.example` (values never committed):

```
SECRET_KEY=<generate, required>
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
SUPABASE_URL=
SUPABASE_KEY=
DATABASE_URL=
GEMINI_API_KEY=
CORS_ALLOWED_ORIGINS=http://localhost:5173
```

Root `.env.example` additions:

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_API_URL=
```

`settings.py` requires `SECRET_KEY` (no fallback); developers must copy
`backend/.env.example` → `backend/.env` (or repo-root `.env`) and fill it. Offline-first
frontend does not require any of these vars.

## Scripts (package.json)

| Script | Command |
|---|---|
| `dev:backend` | `cd backend && python manage.py runserver 0.0.0.0:8000` |
| `backend:install` | `pip install -r backend/requirements.txt` (documented; Windows-friendly) |
| `backend:migrate` | `cd backend && python manage.py migrate` |
| `backend:check` | `cd backend && python manage.py check` |
| `backend:test` | `cd backend && python manage.py test` |

`npm run dev` remains the offline-first frontend dev server; `dev:backend` runs Django
separately (both needed for sync).

## Documentation

- README: new "Optional Backend / Cloud Sync" section — setup (backend install, .env,
  Supabase project, migrate, run both servers), how sync works, v1 scope/boundaries.
- The backend app README content is preserved via `backend/` files; no new backend docs
  authored beyond `.env.example`.

## Testing

Frontend (new):

- `cloudSync` mapper unit tests (pure functions, Vitest): field mapping, missing-field
  omission, roundtrip dto→local→dto.
- `cloudApi` header injection test (Bearer present when session, absent otherwise) + 401
  retry path with mocked fetch.
- Existing suites untouched — must keep passing: `npm run typecheck`, `npm test`,
  `npm run lint`.

Backend (new, on the copied code):

- `python manage.py check` — config sanity.
- `python manage.py test` — copied apps' existing tests pass.

## Boundaries / Risks

- Cloud sync is v1: last-write-wins, no remote line deletion, no field-level conflict
  merge. Conflict resolution is future work.
- Adding `@supabase/supabase-js` is the only new runtime dependency.
- Supabase must be provisioned by the user for auth to work. Without it the app behaves
  exactly as today (offline-first).
- The repo's `.git/index` is currently missing (git presents all HEAD files as deleted
  and live files as untracked). A baseline reconciliation commit (`git add -A`) is needed
  before/with the implementation commit so git reflects the on-disk tree.
- No deletion of africacontechhub; no rewrites of existing budget-engineer features.

## Success Criteria

1. `backend/` runs standalone (`dev:backend` + `backend:migrate` work; `manage.py check` clean).
2. `npm run dev` + `dev:backend` together: frontend proxies `/api/*` to Django; sync UI
   shows "Offline" when no session.
3. Signing in via Supabase injects a JWT; Django `api/v1` responds authenticated
   (verified with a dev account).
4. Project metadata and BOQ lines push/pull via mapper-tested functions.
5. Existing frontend validation (typecheck, tests, lint) all green.