# Migration Step 2 - Architecture Setup

## Objective
Establish a safe, incremental workspace structure for a single codebase strategy without disrupting the current production web app.

## What was created
- Root workspace manifest: `package.json`
- Mobile app workspace scaffold: `apps/mobile/`
- Shared logic package scaffold: `packages/core/`
- Shared UI package scaffold: `packages/ui/`

## Workspace layout
```txt
SupplySync/
├── frontend/            # Existing web app (kept intact)
├── apps/
│   └── mobile/          # New Expo app target
└── packages/
    ├── core/            # Shared business logic/api/auth/contracts
    └── ui/              # Shared cross-platform UI primitives
```

## Why this is safe
- No existing frontend files were moved.
- No backend behavior changed.
- Migration can proceed feature-by-feature with side-by-side validation.

## Step 2 Execution Plan (Next actions)

### 1) Install workspace dependencies from root
Run from repo root:
```bash
npm install
```

### 2) Initialize Expo mobile app files
In `apps/mobile`, add:
- `app.json`
- `babel.config.js`
- `app/(auth)/login.tsx` and basic route shell

### 3) Extract shared logic first (Step 3 handoff)
Move from `frontend/src/utils/api.js` into `packages/core/src/api/`:
- API base client
- token helpers
- auth interceptors

### 4) Add compatibility adapters
Create browser/native storage adapters:
- `packages/core/src/storage/webStorage.js`
- `packages/core/src/storage/nativeStorage.js`

### 5) Validate first cross-platform flow
Implement login in:
- `frontend` (using shared core module)
- `apps/mobile` (using shared core module)

## Definition of Done for Step 2
- [x] Workspace skeleton committed
- [ ] Root install succeeds
- [ ] Expo app boots (`npm run mobile:start`)
- [ ] Existing web app still boots (`npm run web:start`)
- [ ] Shared core package consumed by at least one app
