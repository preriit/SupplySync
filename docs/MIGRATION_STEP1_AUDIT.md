# Migration Step 1 - Current State Audit

## Goal
Create a clear baseline of what exists today before migrating to a single codebase for web, Android, and iOS.

## Current Stack Snapshot
- Frontend: React (CRA/CRACO), React Router, Axios, Tailwind, i18next
- Backend: FastAPI, SQLAlchemy, JWT auth
- Infra/data hints: PostgreSQL-style models, Cloudinary image handling

## Existing User-Facing Features

### Authentication
- Login (dealer/admin)
- Signup
- Forgot/reset password
- OTP-based login flows

### Dealer Inventory
- Subcategory list/create/delete
- Product list/detail/create/update/delete
- Bulk delete/search
- Image upload and product metadata editing

### Stock and Activity
- Low stock / out of stock alerts
- Quantity add/subtract transactions
- Transaction history / activity logs

### Team Members
- Team member list/create/update
- OTP-related confirmation flow for team members

### Admin
- Admin dashboard
- User and merchant management
- Reference data management
- Analytics view

## Shared Logic Candidates (Move First)
- API client + token handling (`frontend/src/utils/api.js`)
- Domain rules/services (coverage calculations, defaults) (`backend/services/*`)
- Data contracts/schemas (`backend/schemas/*`)
- Product/transaction/activity domain models (`backend/models/*`)

## Migration Risks to Track Early
- Web-only routing (`react-router-dom` with browser assumptions)
- Browser APIs in app logic (`window`, `document`, `localStorage`, `navigator`)
- Web-only file input/drag-drop flows in image upload UI
- DOM-centric UI component dependencies (Radix/shadcn-style components)
- Auth/session flow coupled to browser redirects and local storage

## Must-Have vs Nice-to-Have (Initial Draft)

### Must-Have for v1 Mobile
- Login/logout and session handling
- Product list/detail and stock quantity updates
- Subcategory browsing and core CRUD needed for daily operations
- Stock alerts (low/out of stock)
- Team member basic management
- Image upload from device (camera/gallery parity acceptable in phased rollout)

### Nice-to-Have for v1 Mobile
- Full admin suite in mobile app (can remain web-first initially)
- Advanced analytics dashboards
- Non-critical UI polish parity with current web design system
- Secondary flows that do not block inventory operations

## Unknowns to Resolve Before Step 2
- Exact mobile user roles for v1 (dealer only vs dealer + admin)
- Offline requirement (none/basic/full sync)
- Push notification scope for stock alerts
- Minimum OS targets (Android and iOS versions)
- App store rollout plan (internal/testflight/production)

## Step 1 Exit Criteria
- [ ] Feature inventory validated by product/ops stakeholders
- [ ] Must-have vs nice-to-have finalized
- [ ] Platform-specific unknowns resolved
- [ ] Approved migration scope for Step 2 architecture setup
