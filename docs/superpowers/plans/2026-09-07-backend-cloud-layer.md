# Budget Engineer + Africa ConTech Hub Django Backend (Optional Cloud Layer) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Co-locate the africacontechhub Django backend inside the budget-engineer repository and add a small, opt-in Supabase login + project/BOQ sync layer while keeping the offline-first core untouched.

**Architecture:** Copy `backend/` (verbatim) plus the backend deploy files into budget-engineer. Add a thin fetch client (`cloudApi`), a Supabase auth wrapper (`cloudAuth`), a small zustand store (`cloudStore`), a pure-mapper sync service (`cloudSync`), and two small UI components (`SyncIndicator`, `CloudLoginDialog`) mounted in the existing `CommandBar`. Vite dev-proxies `/api` to Django on `:8000`. Offline-first apps never require any of this.

**Tech Stack:** Django 4.2 + DRF (backend), React 18 + TypeScript strict + Vite 8 + Zustand + Vitest (frontend), `@supabase/supabase-js` (new runtime dep).

## Global Constraints

- Do NOT modify any existing budget-engineer store, Dexie schema, page, or test. Additive changes only.
- All monetary conversions between cents (local) and decimals (Django) go through named helpers only; round correctly.
- Cloud features must degrade gracefully when env vars are unset — never throw at import/startup.
- TypeScript strict: no `any`. Follow existing conventions (`@/` alias, `src/__tests__/*.test.ts`, `lib/api/types.ts` `ApiError`).
- NEVER copy secrets. The legacy compose hardcodes Supabase credentials — author the new compose from scratch (backend-only).
- Every task must keep the current tree green: `npm run typecheck`, `npm test` (targeted files per task), `npm run lint`.
- Commit after each task with a conventional message; the repo's `.git/index` is missing, so Task 0 establishes a baseline first.
- Windows (win32, bash shell). Python 3.14.5 present; backend deps may not be installed — treat Django verification as best-effort with a documented fallback.

---

### Task 0: Git baseline reconciliation + feature branch

The repo has no `.git/index`, so HEAD (1594 legacy files incl. `corpus/`, `brain/`, submodule pointer) shows as deleted and current files show as untracked. Fix this once.

- [ ] **Step 1: Stage the on-disk tree as the new baseline**

Run: `git add -A && git status --short | wc -l`
Expected: `git status` output shows a large, coherent change set (legacy deletions + current files added). No error.

- [ ] **Step 2: Commit the baseline**

```bash
git commit -m "chore: reconcile repository index with on-disk working tree"
```

- [ ] **Step 3: Create working branch**

```bash
git checkout -b feat/backend-cloud-layer
```

- [ ] **Step 4: Verify clean state**

Run: `git status --short | grep -v '^??' | head`
Expected: no staged/unstaged modifications remain (branch is clean).

---

### Task 1: Copy Django backend into budget-engineer

**Files:**
- Create: `backend/` (full copy of `C:/Users/THINKPAD/Documents/africacontechhub/backend/`)
- Create: `backend/.env.example`
- Create: `Dockerfile.backend` (copied)
- Create: `.dockerignore` (copied)
- Verify: `backend/manage.py`

**Interfaces:**
- Produces: `backend/config/settings.py` (requires `SECRET_KEY` env), `backend/manage.py runserver 0.0.0.0:8000`, `backend/requirements.txt`.

- [ ] **Step 1: Copy the backend directory verbatim**

```bash
cp -r "C:/Users/THINKPAD/Documents/africacontechhub/backend" backend && ls backend
```

Expected: `apps config manage.py openclaw-skills requirements.txt`.

- [ ] **Step 2: Copy the backend deploy files (do not copy compose — it contains secrets)**

```bash
cp "C:/Users/THINKPAD/Documents/africacontechhub/Dockerfile.backend" ./Dockerfile.backend
cp "C:/Users/THINKPAD/Documents/africacontechhub/.dockerignore" ./.dockerignore
```

Verify `Dockerfile.backend` uses `COPY backend/requirements.txt` and `COPY backend/ .` (context = repo root). Confirm `/.dockerignore` does not exclude `backend/`.

- [ ] **Step 3: Author `backend/.env.example`**

```bash
cat > backend/.env.example << 'EOF'
# Africa ConTech Hub Django backend — environment template (never commit real secrets)
SECRET_KEY=change-me-generate-a-long-random-string
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Optional managed PostgreSQL — omit to use backend/db.sqlite3
DATABASE_URL=

# Supabase Auth (JWT verification) — optional, required only for authenticated API use
SUPABASE_URL=
SUPABASE_KEY=

# Google Gemini (AI endpoints) — optional
GEMINI_API_KEY=

# CORS for the Vite dev server
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
EOF
```

- [ ] **Step 4: Best-effort backend sanity check**

Run (from `backend/`): `python manage.py check`
Expected: `System check identified no issues (0 silenced).`
If deps are missing, install them first:

```bash
pip install -r backend/requirements.txt
```

If installation fails on this machine (e.g. psycopg2 needs build tools), record the failure and continue — Django verification is not a gate for frontend tasks.

- [ ] **Step 5: Commit**

```bash
git add backend Dockerfile.backend .dockerignore
git commit -m "feat(backend): add Africa ConTech Hub Django backend with env template"
```

---

### Task 2: Frontend build config — Vite proxy, backend scripts, env template

**Files:**
- Modify: `vite.config.ts` (add `server.proxy`)
- Modify: `package.json` (add backend scripts)
- Modify: `env.example` (add `VITE_` cloud vars)

**Interfaces:**
- Produces: dev proxy `/api` → `http://localhost:8000`; npm scripts `dev:backend`, `backend:install`, `backend:migrate`, `backend:check`, `backend:test`.

- [ ] **Step 1: Add the `/api` dev proxy to `vite.config.ts`**

Edit `vite.config.ts` so the exported config includes:

```ts
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
```

Add it at the top level of the `defineConfig` object (a sibling of `plugins`).

- [ ] **Step 2: Add backend scripts to `package.json`**

In `"scripts"`, append:

```json
    "dev:backend": "cd backend && python manage.py runserver 0.0.0.0:8000",
    "backend:install": "pip install -r backend/requirements.txt",
    "backend:migrate": "cd backend && python manage.py migrate",
    "backend:check": "cd backend && python manage.py check",
    "backend:test": "cd backend && python manage.py test"
```

- [ ] **Step 3: Extend `env.example`**

Append:

```
# — Optional Africa ConTech Hub cloud backend (Vite exposes these to the browser) —
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_API_URL=
```

Replace the two existing legacy lines `SUPABASE_URL=` and `SUPABASE_ANON_KEY=` with the `VITE_`-prefixed names above (nothing in the app reads the un-prefixed names).

- [ ] **Step 4: Verify config parses**

Run: `npx vite --version`
Expected: prints a version (config loads). Then `npm run typecheck` — expected PASS (no code changed).

- [ ] **Step 5: Commit**

```bash
git add vite.config.ts package.json env.example
git commit -m "build(backend): proxy /api to Django and add backend npm scripts"
```

---

### Task 3: `src/services/cloudApi.ts` — thin fetch client

**Files:**
- Create: `src/services/cloudApi.ts`
- Test: `src/__tests__/cloudApi.test.ts`

**Interfaces:**
- Consumes: `ApiError` from `@/lib/api/types` (module already exists — do not modify).
- Produces:
  - `interface CloudApiConfig { apiBaseUrl: string; getAccessToken: () => Promise<string | null>; fetchImpl?: typeof fetch }`
  - `interface CloudApiClient { request<T>(path: string, init?: RequestInit): Promise<T> }`
  - `function createCloudApiClient(config: CloudApiConfig): CloudApiClient`
  - 401 handling: retries once after re-calling `getAccessToken()`; throws `ApiError` otherwise.
  - Non-2xx throws `ApiError(status, 'http_error', message-from-body-or-statusText)`.

- [ ] **Step 1: Write the failing test `src/__tests__/cloudApi.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { createCloudApiClient } from '@/services/cloudApi';

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: new Headers({ 'content-type': 'application/json', ...headers }),
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response;
}

describe('cloudApi', () => {
  it('injects an Authorization header when a token is present', async () => {
    const calls: RequestInit[] = [];
    const client = createCloudApiClient({
      apiBaseUrl: 'http://localhost:8000/api/v1',
      getAccessToken: async () => 'jwt-abc',
      fetchImpl: (async (_url: string, init?: RequestInit) => {
        calls.push(init ?? {});
        return jsonResponse({ ok: true });
      }) as typeof fetch,
    });
    await client.request('/projects/');
    const headers = new Headers(calls[0]?.headers as HeadersInit | undefined);
    expect(headers.get('Authorization')).toBe('Bearer jwt-abc');
  });

  it('omits the Authorization header when signed out', async () => {
    let call: RequestInit = {};
    const client = createCloudApiClient({
      apiBaseUrl: 'http://localhost:8000/api/v1',
      getAccessToken: async () => null,
      fetchImpl: (async (_url: string, init?: RequestInit) => {
        call = init ?? {};
        return jsonResponse({ ok: true });
      }) as typeof fetch,
    });
    await client.request('/projects/');
    const headers = new Headers(call.headers as HeadersInit | undefined);
    expect(headers.get('Authorization')).toBeNull();
  });

  it('parses JSON responses and prefixes the API base URL', async () => {
    let calledUrl = '';
    const client = createCloudApiClient({
      apiBaseUrl: 'http://localhost:8000/api/v1',
      getAccessToken: async () => null,
      fetchImpl: (async (url: string) => {
        calledUrl = url;
        return jsonResponse({ id: 7, title: 'House' });
      }) as typeof fetch,
    });
    const data = await client.request<{ id: number; title: string }>('/projects/');
    expect(data).toEqual({ id: 7, title: 'House' });
    expect(calledUrl).toBe('http://localhost:8000/api/v1/projects/');
  });

  it('retries once with a fresh token after a 401', async () => {
    let calls = 0;
    const client = createCloudApiClient({
      apiBaseUrl: 'http://localhost:8000/api/v1',
      getAccessToken: async () => (calls === 0 ? 'stale-token' : 'fresh-token'),
      fetchImpl: (async () => {
        calls += 1;
        if (calls === 1) return jsonResponse({}, 401);
        return jsonResponse({ fresh: true });
      }) as typeof fetch,
    });
    const data = await client.request<{ fresh: boolean }>('/projects/');
    expect(calls).toBe(2);
    expect(data).toEqual({ fresh: true });
  });

  it('throws ApiError with the server message on failure', async () => {
    const client = createCloudApiClient({
      apiBaseUrl: 'http://localhost:8000/api/v1',
      getAccessToken: async () => null,
      fetchImpl: (async () =>
        jsonResponse({ message: 'Account pending approval.' }, 403)) as typeof fetch,
    });
    await expect(client.request('/projects/')).rejects.toMatchObject({
      status: 403,
      message: 'Account pending approval.',
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/__tests__/cloudApi.test.ts`
Expected: FAIL — module `@/services/cloudApi` not found.

- [ ] **Step 3: Implement `src/services/cloudApi.ts`**

```ts
import { ApiError } from '@/lib/api/types';

export interface CloudApiConfig {
  apiBaseUrl: string;
  getAccessToken: () => Promise<string | null>;
  fetchImpl?: typeof fetch;
}

export interface CloudApiClient {
  request<T>(path: string, init?: RequestInit): Promise<T>;
}

export function createCloudApiClient(config: CloudApiConfig): CloudApiClient {
  const { apiBaseUrl, getAccessToken } = config;
  const fetchImpl = config.fetchImpl ?? fetch;

  async function doFetch<T>(path: string, init: RequestInit, token: string | null): Promise<T> {
    const headers = new Headers(init.headers);
    headers.set('Content-Type', 'application/json');
    if (token) headers.set('Authorization', `Bearer ${token}`);

    const response = await fetchImpl(`${apiBaseUrl}${path}`, { ...init, headers });
    if (!response.ok) {
      if (response.status === 401) {
        throw new ApiError(401, 'unauthorized', 'Session expired or invalid');
      }
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      throw new ApiError(response.status, 'http_error', payload?.message ?? response.statusText);
    }
    if (response.status === 204) return undefined as T;
    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json')) return (await response.text()) as unknown as T;
    return (await response.json()) as T;
  }

  return {
    async request<T>(path: string, init: RequestInit = {}): Promise<T> {
      const token = await getAccessToken();
      try {
        return await doFetch<T>(path, init, token);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          const freshToken = await getAccessToken();
          if (freshToken) return doFetch<T>(path, init, freshToken);
        }
        throw err;
      }
    },
  };
}
```

- [ ] **Step 4: Verify the test passes**

Run: `npx vitest run src/__tests__/cloudApi.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Typecheck + lint**

Run: `npm run typecheck` and `npx eslint src/services/cloudApi.ts src/__tests__/cloudApi.test.ts`
Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add src/services/cloudApi.ts src/__tests__/cloudApi.test.ts
git commit -m "feat(cloud): add thin fetch client with Bearer injection and 401 retry"
```

---

### Task 4: `src/services/cloudAuth.ts` + `src/stores/cloudStore.ts`

**Files:**
- Modify: `package.json` (+ `@supabase/supabase-js` dependency), `package-lock.json` (via install)
- Create: `src/services/cloudAuth.ts`
- Create: `src/stores/cloudStore.ts`
- Test: `src/__tests__/cloudStore.test.ts`

**Interfaces:**
- Consumes: `createSupabaseCloudAuth` returns `CloudAuthProvider` (below); `cloudApi` needs only a token getter.
- Produces:
  - `interface CloudSession { accessToken: string; email: string; expiresAt?: number }`
  - `interface CloudAuthProvider { getSession(): Promise<CloudSession | null>; signInWithPassword(email: string, password: string): Promise<CloudSession>; signInWithMagicLink(email: string, emailRedirectTo?: string): Promise<void>; signOut(): Promise<void>; onStateChange(listener: (s: CloudSession | null) => void): () => void }`
  - `function createSupabaseCloudAuth(config: { supabaseUrl: string; supabaseAnonKey: string }): CloudAuthProvider`
  - Store: `useCloudStore` with statuses `'unconfigured' | 'signed-out' | 'signing-in' | 'signed-in' | 'syncing' | 'pending-approval' | 'error'`, `email`, `lastSyncAt`, `lastError`, `projectLinks`, actions `setStatus`, `setSignedIn`, `markSignedOut`, `recordSync`, `recordError`, `clearError`, `linkProject`. Persisted via zustand `persist` as `budget-engineer-cloud` (email, lastSyncAt, projectLinks). Rehydrate resets `status` to `'signed-out'` without clearing email.

- [ ] **Step 1: Add the runtime dependency**

```bash
npm install @supabase/supabase-js@^2.95.3
```

Expected: `package.json` gains `"@supabase/supabase-js": "^2.95.3"`; `package-lock.json` updated.

- [ ] **Step 2: Implement `src/services/cloudAuth.ts`**

```ts
import { createClient } from '@supabase/supabase-js';
import type { Session } from '@supabase/supabase-js';
import { ApiError } from '@/lib/api/types';

export interface CloudSession {
  accessToken: string;
  email: string;
  expiresAt?: number;
}

export interface CloudAuthProvider {
  getSession(): Promise<CloudSession | null>;
  signInWithPassword(email: string, password: string): Promise<CloudSession>;
  signInWithMagicLink(email: string, emailRedirectTo?: string): Promise<void>;
  signOut(): Promise<void>;
  onStateChange(listener: (session: CloudSession | null) => void): () => void;
}

function toCloudSession(session: Session): CloudSession {
  return {
    accessToken: session.access_token,
    email: session.user?.email ?? '',
    expiresAt: session.expires_at ?? undefined,
  };
}

export function createSupabaseCloudAuth(config: {
  supabaseUrl: string;
  supabaseAnonKey: string;
}): CloudAuthProvider {
  const client = createClient(config.supabaseUrl, config.supabaseAnonKey);

  return {
    async getSession() {
      const { data, error } = await client.auth.getSession();
      if (error || !data.session) return null;
      return toCloudSession(data.session);
    },

    async signInWithPassword(email, password) {
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error || !data.session) {
        throw new ApiError(401, 'auth_error', error?.message ?? 'Sign-in failed');
      }
      return toCloudSession(data.session);
    },

    async signInWithMagicLink(email, emailRedirectTo) {
      const { error } = await client.auth.signInWithOtp({
        email,
        options: { emailRedirectTo },
      });
      if (error) throw new ApiError(401, 'auth_error', error.message);
    },

    async signOut() {
      await client.auth.signOut();
    },

    onStateChange(listener) {
      const { data } = client.auth.onAuthStateChange((_event, session) => {
        listener(session ? toCloudSession(session) : null);
      });
      return () => data.subscription.unsubscribe();
    },
  };
}
```

- [ ] **Step 3: Implement `src/stores/cloudStore.ts`**

```ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

export type CloudStatus =
  | 'unconfigured'
  | 'signed-out'
  | 'signing-in'
  | 'signed-in'
  | 'syncing'
  | 'pending-approval'
  | 'error';

export interface CloudProjectLink {
  localId: string;
  remoteId: number;
  syncedAt: string;
}

interface CloudStoreState {
  status: CloudStatus;
  email: string;
  lastSyncAt: string | null;
  lastError: string | null;
  projectLinks: CloudProjectLink[];
  setStatus: (status: CloudStatus) => void;
  setSignedIn: (email: string) => void;
  markSignedOut: () => void;
  recordSync: (at: string) => void;
  recordError: (message: string) => void;
  clearError: () => void;
  linkProject: (localId: string, remoteId: number) => void;
}

export const useCloudStore = create<CloudStoreState>()(
  immer(
    persist(
      (set) => ({
        status: 'unconfigured',
        email: '',
        lastSyncAt: null,
        lastError: null,
        projectLinks: [],

        setStatus: (status) =>
          set((s) => {
            s.status = status;
          }),

        setSignedIn: (email) =>
          set((s) => {
            s.status = 'signed-in';
            s.email = email;
            s.lastError = null;
          }),

        markSignedOut: () =>
          set((s) => {
            s.status = 'signed-out';
          }),

        recordSync: (at) =>
          set((s) => {
            s.status = 'signed-in';
            s.lastSyncAt = at;
            s.lastError = null;
          }),

        recordError: (message) =>
          set((s) => {
            s.status = 'error';
            s.lastError = message;
          }),

        clearError: () =>
          set((s) => {
            s.lastError = null;
          }),

        linkProject: (localId, remoteId) =>
          set((s) => {
            const existing = s.projectLinks.find((l) => l.localId === localId);
            if (existing) {
              existing.remoteId = remoteId;
              existing.syncedAt = new Date().toISOString();
            } else {
              s.projectLinks.push({ localId, remoteId, syncedAt: new Date().toISOString() });
            }
          }),
      }),
      {
        name: 'budget-engineer-cloud',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          email: state.email,
          lastSyncAt: state.lastSyncAt,
          projectLinks: state.projectLinks,
        }),
        onRehydrateStorage: () => (state) => {
          state?.markSignedOut();
        },
      },
    ),
  ),
);
```

- [ ] **Step 4: Write the failing test `src/__tests__/cloudStore.test.ts`**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useCloudStore } from '@/stores/cloudStore';

describe('cloudStore', () => {
  beforeEach(() => {
    useCloudStore.setState({
      status: 'unconfigured',
      email: '',
      lastSyncAt: null,
      lastError: null,
      projectLinks: [],
    });
  });

  it('starts unconfigured', () => {
    expect(useCloudStore.getState().status).toBe('unconfigured');
  });

  it('marks signed in with an email and clears errors', () => {
    useCloudStore.getState().recordError('boom');
    useCloudStore.getState().setSignedIn('builder@example.com');
    const s = useCloudStore.getState();
    expect(s.status).toBe('signed-in');
    expect(s.email).toBe('builder@example.com');
    expect(s.lastError).toBeNull();
  });

  it('marks signed out without clearing persisted email', () => {
    useCloudStore.getState().setSignedIn('builder@example.com');
    useCloudStore.getState().markSignedOut();
    const s = useCloudStore.getState();
    expect(s.status).toBe('signed-out');
    expect(s.email).toBe('builder@example.com');
  });

  it('records sync time and error state', () => {
    useCloudStore.getState().recordSync('2026-09-07T10:00:00Z');
    expect(useCloudStore.getState().status).toBe('signed-in');
    expect(useCloudStore.getState().lastSyncAt).toBe('2026-09-07T10:00:00Z');
    useCloudStore.getState().recordError('Account pending approval.');
    expect(useCloudStore.getState().status).toBe('error');
    expect(useCloudStore.getState().lastError).toBe('Account pending approval.');
  });

  it('links a local project to a remote id idempotently', () => {
    useCloudStore.getState().linkProject('p1', 10);
    useCloudStore.getState().linkProject('p1', 11);
    const links = useCloudStore.getState().projectLinks;
    expect(links).toHaveLength(1);
    expect(links[0]).toMatchObject({ localId: 'p1', remoteId: 11 });
  });
});
```

- [ ] **Step 5: Run the test to verify it fails**

Run: `npx vitest run src/__tests__/cloudStore.test.ts`
Expected: FAIL — `@/stores/cloudStore` not found.

- [ ] **Step 6: Verify tests pass**

Run: `npx vitest run src/__tests__/cloudStore.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 7: Typecheck + lint**

Run: `npm run typecheck` and `npx eslint src/services/cloudAuth.ts src/stores/cloudStore.ts src/__tests__/cloudStore.test.ts`
Expected: 0 errors. (If `npm run lint` flag sets a warning budget, ensure no new errors.)

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json src/services/cloudAuth.ts src/stores/cloudStore.ts src/__tests__/cloudStore.test.ts
git commit -m "feat(cloud): add Supabase auth wrapper and optional cloud store"
```

---

### Task 5: `src/services/cloudSync.ts` — mappers + sync actions

**Files:**
- Create: `src/services/cloudSync.ts`
- Test: `src/__tests__/cloudSync.test.ts`

**Interfaces:**
- Consumes: `CloudApiClient` from `@/services/cloudApi`; `Project`/`Region`/`ProjectStatus`/`BOQ` and `BOQItem`/`BOQSection` from `@/types`. Note local fields: `Project.name/.region/.status/.profile`; `BOQ.sections[]` each with `.id/.code/.items[]`; `BOQItem` has `.id/.description/.quantity/.unit/.rateCents/.totalCents/.source`.
- Produces:
  - `interface CloudProjectDto { id?: number; title: string; location?: string; budget?: string; status?: string; building_type?: string; created_at?: string; updated_at?: string }`
  - `interface CloudBoqLineDto { id?: number; description: string; specification?: string; unit: string; quantity: number; rate: number; bill_no?: string; is_ai_generated?: boolean }`
  - `interface RemotePaginated<T> { count: number; next: string | null; previous: string | null; results: T[] }`
  - `function centsToDecimal(cents: number): string`
  - `function localProjectToDto(project: Project): CloudProjectDto`
  - `function dtoToLocalProject(dto: CloudProjectDto): Partial<Project>`
  - `function boqToDtos(boq: BOQ): CloudBoqLineDto[]`
  - `interface LocalBoqLineSummary { description: string; unit: string; quantity: number; rateCents: number; totalCents: number }`
  - `function dtosToBoqLines(dtos: CloudBoqLineDto[]): LocalBoqLineSummary[]`
  - `function pushProject(client: CloudApiClient, project: Project, existingRemoteId?: number): Promise<CloudProjectDto>`
  - `function listRemoteProjects(client: CloudApiClient): Promise<CloudProjectDto[]>`
  - `function pushBoq(client: CloudApiClient, remoteProjectId: number, boq: BOQ): Promise<CloudBoqLineDto[]>`
  - `function pullBoq(client: CloudApiClient, remoteProjectId: number): Promise<CloudBoqLineDto[]>`
  - `interface SyncResult { links: { localId: string; remoteId: number }[]; projectsRemotely: number; boqLinesPushed: number }`
  - `function syncAll(client: CloudApiClient, projects: { local: Project; boq?: BOQ }[], existingLinks?: { localId: string; remoteId: number }[]): Promise<SyncResult>`
  - Status mapping: local `draft|concept|design|engineering` → `'PLANNING'`; `costing|tender` → `'IN_PROGRESS'`. Reverse: `PLANNING`→`'concept'`, `IN_PROGRESS`→`'engineering'`, `COMPLETED`→`'tender'`, `ON_HOLD`→`'draft'`. Region passthrough only if one of `zimbabwe|south-africa|zambia|botswana|other`, else `'other'`.

- [ ] **Step 1: Write the failing test `src/__tests__/cloudSync.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import type { Project, BOQ } from '@/types';
import type { CloudApiClient } from '@/services/cloudApi';
import {
  centsToDecimal,
  localProjectToDto,
  dtoToLocalProject,
  boqToDtos,
  dtosToBoqLines,
  syncAll,
} from '@/services/cloudSync';

const project: Project = {
  id: 'p1',
  slug: 'avondale-house',
  name: 'Avondale House',
  ownerId: 'local-user',
  profile: 'aspirational',
  region: 'zimbabwe',
  currency: 'USD',
  status: 'draft',
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-02T00:00:00Z',
  version: 1,
};

const boq: BOQ = {
  id: 'b1',
  projectId: 'p1',
  designId: 'd1',
  sections: [
    {
      id: 's1',
      code: 'SUBSTRUCTURE',
      title: 'Substructure',
      subtotalCents: 450000,
      items: [
        {
          id: 'i1',
          description: 'Strip footings',
          quantity: 30,
          unit: 'm',
          rateCents: 1500,
          totalCents: 45000,
          elementIds: [],
          source: 'auto',
          aiConfidence: 0,
        },
      ],
    },
  ],
  totalCents: 450000,
  contingencyCents: 0,
  currency: 'USD',
  generatedAt: '2026-09-02T00:00:00Z',
};

function recordCall(records: { path: string; init?: RequestInit }[], respond: (path: string, init?: RequestInit) => unknown): CloudApiClient {
  return {
    request: async (path: string, init: RequestInit = {}) => {
      const out = respond(path, init);
      records.push({ path, init });
      return out;
    },
  };
}

describe('cloudSync mappers', () => {
  it('converts cents to a 2-dp decimal', () => {
    expect(centsToDecimal(1500)).toBe('15.00');
    expect(centsToDecimal(5)).toBe('0.05');
  });

  it('maps a local project to a Django project DTO', () => {
    const dto = localProjectToDto(project);
    expect(dto).toMatchObject({
      title: 'Avondale House',
      location: 'zimbabwe',
      budget: '0.00',
      status: 'PLANNING',
      building_type: 'aspirational',
    });
  });

  it('maps tender status to IN_PROGRESS', () => {
    expect(localProjectToDto({ ...project, status: 'tender' }).status).toBe('IN_PROGRESS');
  });

  it('round-trips a remote DTO to a local project patch', () => {
    const local = dtoToLocalProject({ id: 5, title: 'Borrowdale Villa', location: 'south-africa', status: 'PLANNING' });
    expect(local).toMatchObject({ name: 'Borrowdale Villa', region: 'south-africa', status: 'concept' });
  });

  it('falls back to other for unknown regions', () => {
    expect(dtoToLocalProject({ id: 5, title: 'X', location: 'mars' }).region).toBe('other');
  });

  it('flattens BOQ sections to Django BOQ lines with decimal rates', () => {
    const lines = boqToDtos(boq);
    expect(lines).toEqual([
      {
        bill_no: 'i1',
        description: 'Strip footings',
        specification: 'SUBSTRUCTURE',
        unit: 'm',
        quantity: 30,
        rate: 15,
        is_ai_generated: false,
      },
    ]);
  });

  it('converts remote BOQ lines back to local cents', () => {
    const local = dtosToBoqLines([{ description: 'Walls', unit: 'm2', quantity: 20, rate: 25 }]);
    expect(local[0]).toMatchObject({ description: 'Walls', quantity: 20, rateCents: 2500, totalCents: 50000 });
  });
});

describe('cloudSync actions', () => {
  function fakeClient(respond: (path: string, init?: RequestInit) => unknown): {
    client: CloudApiClient;
    calls: { path: string; init?: RequestInit }[];
  } {
    const calls: { path: string; init?: RequestInit }[] = [];
    const client = recordCall(calls, respond);
    return { client, calls };
  }

  it('POSTs a project when no remote id exists', async () => {
    const { client, calls } = fakeClient((path, init) => {
      expect(path).toBe('/projects/');
      expect(init?.method).toBe('POST');
      return { id: 42, title: 'Avondale House' };
    });
    const result = await syncAll(client, [{ local: project }]);
    expect(result.links).toEqual([{ localId: 'p1', remoteId: 42 }]);
    expect(calls.length).toBe(2); // POST project + GET list
  });

  it('PATCHes when an existing remote id is provided and pushes BOQ', async () => {
    const methods: string[] = [];
    const { client } = fakeClient((path, init) => {
      methods.push(init?.method ?? 'GET');
      if (path === '/projects/1/') return { id: 1, title: 'Avondale House' };
      if (path === '/boq-building-items/') return { id: 9, description: 'Strip footings' };
      return { count: 2, next: null, previous: null, results: [{ id: 1 }, { id: 2 }] };
    });
    const res = await syncAll(client, [{ local: project, boq }], [{ localId: 'p1', remoteId: 1 }]);
    expect(methods).toEqual(['PATCH', 'POST', 'GET']);
    expect(res.links).toEqual([{ localId: 'p1', remoteId: 1 }]);
    expect(res.boqLinesPushed).toBe(1);
    expect(res.projectsRemotely).toBe(2);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/__tests__/cloudSync.test.ts`
Expected: FAIL — `@/services/cloudSync` not found.

- [ ] **Step 3: Implement `src/services/cloudSync.ts`**

```ts
import { ApiError } from '@/lib/api/types';
import type { Project, Region, ProjectStatus, BOQ } from '@/types';
import type { CloudApiClient } from './cloudApi';

export interface CloudProjectDto {
  id?: number;
  title: string;
  location?: string;
  budget?: string;
  status?: string;
  building_type?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CloudBoqLineDto {
  id?: number;
  description: string;
  specification?: string;
  unit: string;
  quantity: number;
  rate: number;
  bill_no?: string;
  is_ai_generated?: boolean;
}

export interface RemotePaginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

const DJANGO_STATUS: Record<ProjectStatus, string> = {
  draft: 'PLANNING',
  concept: 'PLANNING',
  design: 'PLANNING',
  engineering: 'PLANNING',
  costing: 'IN_PROGRESS',
  tender: 'IN_PROGRESS',
};

const LOCAL_STATUS: Record<string, ProjectStatus> = {
  PLANNING: 'concept',
  IN_PROGRESS: 'engineering',
  COMPLETED: 'tender',
  ON_HOLD: 'draft',
};

const KNOWN_REGIONS: Region[] = ['zimbabwe', 'south-africa', 'zambia', 'botswana', 'other'];

export function centsToDecimal(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function localProjectToDto(project: Project): CloudProjectDto {
  return {
    title: project.name,
    location: project.region,
    budget: '0.00',
    status: DJANGO_STATUS[project.status] ?? 'PLANNING',
    building_type: project.profile,
  };
}

export function dtoToLocalProject(dto: CloudProjectDto): Partial<Project> {
  const region: Region =
    dto.location && (KNOWN_REGIONS as string[]).includes(dto.location)
      ? (dto.location as Region)
      : 'other';
  return {
    name: dto.title,
    region,
    status: dto.status ? LOCAL_STATUS[dto.status.toUpperCase()] ?? 'concept' : 'concept',
  };
}

export function boqToDtos(boq: BOQ): CloudBoqLineDto[] {
  return boq.sections.flatMap((section) =>
    section.items.map((item) => ({
      bill_no: item.id,
      description: item.description,
      specification: section.code,
      unit: item.unit,
      quantity: item.quantity,
      rate: Number(centsToDecimal(item.rateCents)),
      is_ai_generated: item.source === 'ai-suggested',
    })),
  );
}

export interface LocalBoqLineSummary {
  description: string;
  unit: string;
  quantity: number;
  rateCents: number;
  totalCents: number;
}

export function dtosToBoqLines(dtos: CloudBoqLineDto[]): LocalBoqLineSummary[] {
  return dtos.map((dto) => {
    const rateCents = Math.round(dto.rate * 100);
    return {
      description: dto.description,
      unit: dto.unit,
      quantity: dto.quantity,
      rateCents,
      totalCents: Math.round(dto.quantity * dto.rate * 100),
    };
  });
}

export async function pushProject(
  client: CloudApiClient,
  project: Project,
  existingRemoteId?: number,
): Promise<CloudProjectDto> {
  const body = localProjectToDto(project);
  if (existingRemoteId) {
    return client.request<CloudProjectDto>(`/projects/${existingRemoteId}/`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }
  return client.request<CloudProjectDto>('/projects/', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function listRemoteProjects(client: CloudApiClient): Promise<CloudProjectDto[]> {
  const data = await client.request<RemotePaginated<CloudProjectDto>>('/projects/');
  return data.results;
}

export async function pushBoq(
  client: CloudApiClient,
  remoteProjectId: number,
  boq: BOQ,
): Promise<CloudBoqLineDto[]> {
  const created: CloudBoqLineDto[] = [];
  for (const line of boqToDtos(boq)) {
    const createdLine = await client.request<CloudBoqLineDto>('/boq-building-items/', {
      method: 'POST',
      body: JSON.stringify({ project: remoteProjectId, ...line }),
    });
    created.push(createdLine);
  }
  return created;
}

export async function pullBoq(
  client: CloudApiClient,
  remoteProjectId: number,
): Promise<CloudBoqLineDto[]> {
  const data = await client.request<RemotePaginated<CloudBoqLineDto>>(
    `/boq-building-items/?project=${remoteProjectId}&budget_kind=preliminary`,
  );
  return data.results;
}

export interface SyncResult {
  links: { localId: string; remoteId: number }[];
  projectsRemotely: number;
  boqLinesPushed: number;
}

export async function syncAll(
  client: CloudApiClient,
  projects: { local: Project; boq?: BOQ }[],
  existingLinks: { localId: string; remoteId: number }[] = [],
): Promise<SyncResult> {
  const remoteIdByLocal = new Map(existingLinks.map((l) => [l.localId, l.remoteId]));
  const links: { localId: string; remoteId: number }[] = [];
  let boqLinesPushed = 0;

  for (const { local, boq } of projects) {
    const dto = await pushProject(client, local, remoteIdByLocal.get(local.id));
    if (typeof dto.id !== 'number') {
      throw new ApiError(500, 'sync_error', `Remote project id missing for ${local.name}`);
    }
    links.push({ localId: local.id, remoteId: dto.id });
    if (boq) boqLinesPushed += (await pushBoq(client, dto.id, boq)).length;
  }

  const remote = await listRemoteProjects(client);
  return { links, projectsRemotely: remote.length, boqLinesPushed };
}
```

- [ ] **Step 4: Run the mapper tests**

Run: `npx vitest run src/__tests__/cloudSync.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 5: Typecheck + lint**

Run: `npm run typecheck` and `npx eslint src/services/cloudSync.ts src/__tests__/cloudSync.test.ts`
Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add src/services/cloudSync.ts src/__tests__/cloudSync.test.ts
git commit -m "feat(cloud): add project/BOQ mappers and sync actions with tests"
```

---

### Task 6: UI — `CloudLoginDialog` + `SyncIndicator` mounted in `CommandBar`

**Files:**
- Create: `src/components/cloud/CloudLoginDialog.tsx`
- Create: `src/components/layout/SyncIndicator.tsx`
- Modify: `src/components/layout/CommandBar.tsx` (mount `<SyncIndicator />` next to `<OfflineIndicator />`)

**Interfaces:**
- Consumes: `useCloudStore`, `createCloudApiClient`, `createSupabaseCloudAuth`, `syncAll`, `useProjectStore((s) => s.projects)`.
- Produces: `CloudLoginDialog({ open, onClose })`; `SyncIndicator()` chip.
- Reads env: `import.meta.env.VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL` (unset → `'unconfigured'` behavior).
- 403/approval handling: on sync error, set `status` to `'pending-approval'` when the message matches `/approval|role|permission/i`, else `'error'`.

- [ ] **Step 1: Implement `src/components/cloud/CloudLoginDialog.tsx`**

```tsx
import { useState } from 'react';
import { useCloudStore } from '@/stores/cloudStore';
import { createSupabaseCloudAuth } from '@/services/cloudAuth';

interface CloudLoginDialogProps {
  open: boolean;
  onClose: () => void;
}

export function CloudLoginDialog({ open, onClose }: CloudLoginDialogProps) {
  const store = useCloudStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'password' | 'magic-link'>('password');
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!supabaseUrl || !supabaseAnonKey) {
      store.recordError('Cloud sync is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
      return;
    }
    setBusy(true);
    store.clearError();
    try {
      const auth = createSupabaseCloudAuth({ supabaseUrl, supabaseAnonKey });
      store.setStatus('signing-in');
      if (mode === 'magic-link') {
        await auth.signInWithMagicLink(email);
        store.recordError('Check your inbox for the sign-in link.');
      } else {
        const session = await auth.signInWithPassword(email, password);
        store.setSignedIn(session.email);
        onClose();
      }
    } catch (err) {
      store.recordError(err instanceof Error ? err.message : 'Sign-in failed');
    } finally {
      setBusy(false);
    }
  }

  const inputClass =
    'w-full rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)]';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-sm rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="presentation"
      >
        <h2 className="mb-1 text-lg font-semibold">Africa ConTech Hub</h2>
        <p className="mb-4 text-sm text-[var(--text-muted)]">
          Optional cloud sync for projects &amp; BOQ. Your work stays local — sign in only when you
          want to back up to the hub.
        </p>
        {store.lastError && (
          <p className="mb-3 rounded-md bg-amber-500/10 px-3 py-2 text-sm text-amber-400">{store.lastError}</p>
        )}
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className={inputClass}
          />
          {mode === 'password' && (
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className={inputClass}
            />
          )}
          <div className="flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => setMode(mode === 'password' ? 'magic-link' : 'password')}
              className="text-[var(--brand-accent)] hover:underline"
            >
              {mode === 'password' ? 'Use magic link instead' : 'Use password instead'}
            </button>
            <span className="text-[var(--text-muted)]">Offline-first · optional</span>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy}
              className="rounded-md bg-[var(--brand-primary)] px-4 py-2 text-sm font-medium text-[var(--brand-accent)] disabled:opacity-60"
            >
              {busy ? 'Please wait…' : 'Sign in'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-4 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              Continue offline
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Implement `src/components/layout/SyncIndicator.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { useCloudStore } from '@/stores/cloudStore';
import { useProjectStore } from '@/stores/projectStore';
import { createCloudApiClient } from '@/services/cloudApi';
import { createSupabaseCloudAuth } from '@/services/cloudAuth';
import { syncAll } from '@/services/cloudSync';
import { CloudLoginDialog } from '@/components/cloud/CloudLoginDialog';

const CLOUD_CONFIGURED = Boolean(
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY,
);

const STATUS_LABEL: Record<string, string> = {
  unconfigured: 'Cloud off',
  'signed-out': 'Sign in to sync',
  'signing-in': 'Signing in…',
  'signed-in': 'Synced',
  syncing: 'Syncing…',
  'pending-approval': 'Approval pending',
  error: 'Sync error',
};

export function SyncIndicator() {
  const store = useCloudStore();
  const projects = useProjectStore((s) => s.projects);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    if (!CLOUD_CONFIGURED) return;
    const auth = createSupabaseCloudAuth({
      supabaseUrl: import.meta.env.VITE_SUPABASE_URL as string,
      supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
    });
    void auth.getSession().then((session) => {
      if (!active) return;
      if (session) store.setSignedIn(session.email);
      else store.markSignedOut();
    });
    return () => {
      active = false;
    };
  }, [store]);

  async function handleClick() {
    if (!CLOUD_CONFIGURED) {
      setDialogOpen(true);
      return;
    }
    const auth = createSupabaseCloudAuth({
      supabaseUrl: import.meta.env.VITE_SUPABASE_URL as string,
      supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
    });
    const session = await auth.getSession();
    if (!session) {
      setDialogOpen(true);
      return;
    }
    setBusy(true);
    store.setStatus('syncing');
    try {
      const client = createCloudApiClient({
        apiBaseUrl: (import.meta.env.VITE_API_URL as string | undefined) ?? '/api/v1',
        getAccessToken: async () => session.accessToken,
      });
      const result = await syncAll(
        client,
        projects.map((p) => ({ local: p })),
        store.projectLinks,
      );
      result.links.forEach((link) => store.linkProject(link.localId, link.remoteId));
      store.recordSync(new Date().toISOString());
    } catch (err) {
      if (err instanceof Error) {
        const pendingApproval = /approval|role|permission/i.test(err.message);
        store.setStatus(pendingApproval ? 'pending-approval' : 'error');
        store.recordError(
          pendingApproval
            ? 'Account pending approval — an admin must approve this user first.'
            : err.message,
        );
      } else {
        store.setStatus('error');
      }
    } finally {
      setBusy(false);
    }
  }

  const Icon =
    store.status === 'unconfigured' || store.status === 'signed-out' ? CloudOff
    : store.status === 'syncing' || busy ? RefreshCw
    : Cloud;

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        title={store.lastError ?? STATUS_LABEL[store.status]}
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full border border-[var(--border-default)] bg-[var(--bg-secondary)]/80 px-4 py-2 text-sm shadow-lg backdrop-blur-md hover:bg-[var(--bg-secondary)]"
      >
        <Icon size={16} className={store.status === 'syncing' || busy ? 'animate-spin' : ''} />
        <span>
          {STATUS_LABEL[store.status] ?? store.status}
          {store.lastSyncAt && store.status === 'signed-in'
            ? ` · ${new Date(store.lastSyncAt).toLocaleTimeString()}`
            : ''}
        </span>
      </button>
      <CloudLoginDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </>
  );
}
```

- [ ] **Step 3: Mount `SyncIndicator` in `CommandBar.tsx`**

Add the import next to the `OfflineIndicator` import:

```tsx
import { SyncIndicator } from './SyncIndicator';
```

Render it directly below `<OfflineIndicator />`:

```tsx
      <OfflineIndicator />
      <SyncIndicator />
```

- [ ] **Step 4: Verify no type/lint errors**

Run: `npm run typecheck` and `npx eslint src/components/cloud/CloudLoginDialog.tsx src/components/layout/SyncIndicator.tsx src/components/layout/CommandBar.tsx`
Expected: 0 errors.

- [ ] **Step 5: Build smoke test**

Run: `npm run build:only`
Expected: build succeeds (no TS errors; new chunks emitted).

- [ ] **Step 6: Commit**

```bash
git add src/components/cloud/CloudLoginDialog.tsx src/components/layout/SyncIndicator.tsx src/components/layout/CommandBar.tsx
git commit -m "feat(cloud): add optional login dialog and sync indicator to the app shell"
```

---

### Task 7: Backend-only Docker compose files

**Files:**
- Create: `docker-compose.yml`

**Interfaces:**
- Produces: `docker compose up --build` starts only the Django backend on `:8000`; expects `backend/.env`.

- [ ] **Step 1: Author `docker-compose.yml` (backend-only, NO secrets)**

```yaml
services:
  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    container_name: budget-engineer-backend
    restart: unless-stopped
    env_file:
      - backend/.env
    environment:
      - DJANGO_SETTINGS_MODULE=config.settings
      - ALLOWED_HOSTS=*
      - CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
      - CSRF_TRUSTED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
    volumes:
      - backend_media:/app/media
      - backend_static:/app/staticfiles
    ports:
      - "8000:8000"

volumes:
  backend_media:
  backend_static:
```

IMPORTANT: Do not copy the legacy compose — it embeds a real Supabase URL/anon key in build args.

- [ ] **Step 2: Sanity-check the compose file**

Run (from repo root): `docker compose config --quiet 2>/dev/null || npx --yes yaml-lint docker-compose.yml 2>/dev/null || echo "docker unavailable — skipping"`
Expected: no output or a yaml parse OK. If Docker is unavailable, the YAML is still reviewed for balance/indent manually.

- [ ] **Step 3: Commit**

```bash
git add docker-compose.yml
git commit -m "chore(backend): add backend-only docker compose without hardcoded secrets"
```

---

### Task 8: README documentation

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add an "Optional Backend / Cloud Sync" section to `README.md`**

Insert after the "Tech Stack" table and before "Project Structure" (or after the "Deploy" quick reference — choose a stable anchor; do not delete existing content):

```markdown
## Optional Backend & Cloud Sync (Africa ConTech Hub)

The frontend is fully local-first: everything works offline with no server. An optional Django
backend (co-located in `backend/`) mirrors projects and BOQ to the Africa ConTech Hub API so
teams can share data across devices.

### Local run

```bash
# 1. Backend env
cp backend/.env.example backend/.env   # then fill SECRET_KEY, Supabase, Gemini keys

# 2. Backend (terminal A)
npm run backend:install                # pip install -r backend/requirements.txt (or use a venv)
npm run backend:migrate
npm run dev:backend                    # Django on http://localhost:8000

# 3. Frontend (terminal B)
npm install
npm run dev                            # Vite on http://localhost:5173 (proxies /api to :8000)
```

### Signing in

The optional sync uses Supabase auth (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` in the root
`.env`). New sign-ins are created as `BUILDER` but must be **approved by an admin** before the
API accepts requests — approve via the Django admin (`/admin/`, `apps.authentication.Profile`)
or the admin dashboard. Until approved, the sync indicator shows "Approval pending".

### Sync scope (v1)

- Push local project metadata → `POST/PATCH /api/v1/projects/`
- Push budget as preliminary BOQ lines → `POST /api/v1/boq-building-items/`
- Pull remote project list → `GET /api/v1/projects/`
- Last-write-wins; no remote line deletion; no field-level conflict merge.
```

- [ ] **Step 2: Verify README renders**

Run: `git diff --stat README.md`
Expected: shows only an insertion block (no CSS/code regressions).

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: document optional backend and cloud sync setup"
```

---

### Task 9: Final validation + final commit

- [ ] **Step 1: Frontend gate**

Run: `npm run typecheck`
Expected: 0 errors.

Run: `npm test`
Expected: full suite passes (fast-path; ~2-3 min).

Run: `npm run lint`
Expected: within the existing warning budget, 0 errors.

- [ ] **Step 2: Backend gate (best-effort)**

Run (from `backend/`): `python manage.py check`
Expected: `System check identified no issues`.
If deps are missing, run `npm run backend:install` and retry. If this machine cannot build some
deps (e.g. psycopg2-binary offline), note it and continue — CI/Docker is the authoritative gate.

- [ ] **Step 3: Production build**

Run: `npm run build:only`
Expected: succeeds and emits `dist/`.

- [ ] **Step 4: Review the diff for secrets**

Run: `git diff --cached --stat | tail -3` then `git log --oneline -10`
Confirm no Supabase keys or tokens appear in any new file. Grep: `rg -n "sb_publishable|sb_secret|SECRET_KEY=change" -g '!node_modules' .` — should return no tracked secrets.

- [ ] **Step 5: Final commit (only if stray changes remain)**

```bash
git add -A
git commit -m "chore(cloud): finalize optional backend cloud layer"
```

Only run if Step 4 shows uncommitted changes.