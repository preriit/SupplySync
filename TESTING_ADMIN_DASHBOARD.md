# Manual testing: Admin dashboard

Brief checklist to verify the admin portal after login. Use a **fresh DB** (e.g. after `python reset_db.py`) so counts and lists are predictable.

**Prerequisites:** Backend on `http://localhost:8001`, frontend on `http://localhost:3000`. Logged in as **admin** / **password**.

---

## 1. Login & layout

| Step | Action | Expected |
|------|--------|----------|
| 1.1 | Open http://localhost:3000/admin/login | Admin login page with username/password. |
| 1.2 | Enter **admin** / **password** → Login | Redirect to **Dashboard** (no error). |
| 1.3 | Check sidebar | Logo "Admin Portal", links: Dashboard, Users, Merchants, Reference Data, Analytics. |
| 1.4 | Check footer area | "Logged in as" **admin**, **super_admin**; **Logout** button. |
| 1.5 | Click **Logout** | Redirect to `/admin/login`; sidebar gone. Log in again for next steps. |

---

## 2. Dashboard (`/admin/dashboard`)

| Step | Action | Expected |
|------|--------|----------|
| 2.1 | After login, confirm URL | `http://localhost:3000/admin/dashboard`. |
| 2.2 | Check heading | "Dashboard Overview" and "Platform statistics and key metrics". |
| 2.3 | Wait for load | Spinner then **6 stat cards**: Total Users, Total Merchants, Total Products, Active Subscriptions, Trial Subscriptions, Suspended Users. |
| 2.4 | Check counts (fresh DB) | Total Users ≥ 1 (admin), Total Merchants = 0, Total Products = 0; others 0 or small numbers. No errors in console. |
| 2.5 | Check Quick Actions | Three cards: "Manage Users", "Manage Merchants", "Reference Data". |
| 2.6 | Click **Manage Users** | Navigate to `/admin/users`. |
| 2.7 | Click sidebar **Dashboard** | Back to dashboard; stats still visible. |

---

## 3. Users (`/admin/users`)

| Step | Action | Expected |
|------|--------|----------|
| 3.1 | Go to **Users** (sidebar or Quick Action) | Page "Manage Users"; URL `/admin/users`. |
| 3.2 | Wait for load | Table or list of users; at least one row (admin). |
| 3.3 | Check columns (if table) | e.g. Username, Email, Type, Role, Status, Actions. |
| 3.4 | Search (if present) | Type in search box; list filters (or stays same if no match). |
| 3.5 | Toggle status (if allowed) | For a non-admin user, use Activate/Suspend; toast "activated" or "suspended", list refreshes. *(Skip if only admin exists.)* |

---

## 4. Merchants (`/admin/merchants`)

| Step | Action | Expected |
|------|--------|----------|
| 4.1 | Go to **Merchants** (sidebar) | Page "Manage Merchants"; URL `/admin/merchants`. |
| 4.2 | Wait for load | Table or list (may be empty on fresh DB). No console/network error. |
| 4.3 | Check filters (if present) | e.g. search, status filter; changing them updates the list or shows empty. |

---

## 5. Reference data (`/admin/reference-data`)

| Step | Action | Expected |
|------|--------|----------|
| 5.1 | Go to **Reference Data** (sidebar) | Page loads; URL `/admin/reference-data`. |
| 5.2 | Check summary cards | Counts for Body Types, Make Types, Surface Types, etc. (numbers may be 0 or from seed). |
| 5.3 | Select a type (e.g. Body Types) | List of items loads below or in a panel. |
| 5.4 | Add item (if form present) | Enter name → Save; toast success, list refreshes with new item. |
| 5.5 | Delete item (if allowed) | Delete one item; list refreshes without it. |

---

## 6. Analytics

| Step | Action | Expected |
|------|--------|----------|
| 6.1 | Click **Analytics** in sidebar | Either an Analytics page or a blank/placeholder. *(Route may not be implemented yet.)* |

---

## 7. Navigation & auth

| Step | Action | Expected |
|------|--------|----------|
| 7.1 | Click each sidebar link in turn | Dashboard, Users, Merchants, Reference Data open correct pages; active link highlighted. |
| 7.2 | Refresh on `/admin/dashboard` | Still logged in; dashboard loads (no redirect to login). |
| 7.3 | Open new tab → http://localhost:3000/admin/users | If logged in, Users page; if not, redirect to `/admin/login`. |

---

## Quick smoke (minimal)

1. Login → see Dashboard with 6 stat cards.
2. Click **Users** → see at least admin user.
3. Click **Reference Data** → see summary and one type’s list.
4. **Logout** → back to login page.

---

## Notes

- **401 on a page:** Backend may have restarted or token expired; log in again.
- **Empty lists:** Normal on fresh DB; seed data may add reference rows.
- **Analytics:** If there is no route for `/admin/analytics`, the sidebar link may show a blank page until the feature is added.
