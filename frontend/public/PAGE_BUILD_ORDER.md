# SupplySync - Main Pages & Build Order Documentation

## Project Overview
**Platform:** B2B Tile Marketplace  
**Users:** Dealers (suppliers) & Sub-dealers (buyers)  
**Tech Stack:** FastAPI + React + PostgreSQL  
**Design System:** Tactile Clarity (Orange #EA580C primary)  

---

## Table of Contents
1. [Complete Page List](#complete-page-list)
2. [Page Specifications](#page-specifications)
3. [Recommended Build Orders](#recommended-build-orders)
4. [Dependencies & Flow](#dependencies--flow)
5. [Timeline Estimates](#timeline-estimates)

---

## Complete Page List

### 🔴 **CORE PAGES (Phase 1 MVP - Must Build)**

#### **Authentication Pages**
- [x] **Page 1:** Registration/Signup Page
- [x] **Page 2:** Login Page
- [x] **Page 3:** Email Verification Page
- [x] **Page 4:** Forgot Password Page

#### **Dealer Pages**
- [x] **Page 5:** Dealer Dashboard
- [x] **Page 6:** Inventory Management Page
- [x] **Page 7:** Add/Edit Product Page
- [x] **Page 8:** Sub-dealer Management Page
- [x] **Page 9:** Order Requests Page (Dealer View)
- [x] **Page 10:** Order Detail Page (Dealer View)

#### **Sub-dealer Pages**
- [x] **Page 11:** Sub-dealer Dashboard
- [x] **Page 12:** Multi-Dealer Search Page ⭐⭐⭐
- [x] **Page 13:** Product Detail Page
- [x] **Page 14:** Dealer Discovery Page
- [x] **Page 15:** Request Access Page
- [x] **Page 16:** Order Request Creation Page (Cart/Checkout)
- [x] **Page 17:** My Orders Page (Sub-dealer View)
- [x] **Page 18:** Order Detail Page (Sub-dealer View)

### 🟡 **SUPPORTING PAGES (Phase 1 - Nice to Have)**
- [ ] **Page 19:** Profile/Settings Page
- [ ] **Page 20:** Notifications Page
- [ ] **Page 21:** Help/FAQ Page
- [ ] **Page 22:** 404 Error Page
- [ ] **Page 23:** 500 Error Page

### 🟢 **ADVANCED PAGES (Phase 2 - Future)**
- [ ] **Page 24:** Analytics Dashboard (Dealer)
- [ ] **Page 25:** Reports Page (Dealer)
- [ ] **Page 26:** Bulk Product Upload Page
- [ ] **Page 27:** Admin Dashboard (Platform Owner)

**Total Core Pages:** 18  
**Total Supporting Pages:** 5  
**Total Advanced Pages:** 4  
**Grand Total:** 27 pages

---

## Page Specifications

### **PAGE 1: Registration/Signup Page**

**Purpose:** Allow new users to create accounts  
**User Types:** Both Dealer & Sub-dealer  
**URL:** `/register` or `/signup`

**Components:**
- User type selector (Radio buttons: "I'm a Dealer" / "I'm a Sub-dealer")
- Form fields:
  - **Common:** Name, Email, Phone, Password, Confirm Password
  - **Dealer-specific:** Business Name, GST Number, Address
  - **Sub-dealer-specific:** Business Name, Location
- Terms & Conditions checkbox
- Submit button (Orange)
- "Already have an account? Login" link

**Functionality:**
- Client-side validation
- Password strength indicator
- Email format validation
- Phone number format validation (Indian: +91)
- Conditional fields based on user type selection
- API: `POST /api/auth/register`

**Success State:** 
- Redirect to email verification page
- Show success message

**Error States:**
- Email already exists
- Phone already exists
- Weak password
- Server error

**Design Notes:**
- Clean, single-column form
- Left side: Form, Right side: Benefits/testimonials (optional)
- Mobile: Stack vertically

**Priority:** HIGH  
**Estimated Build Time:** 1-2 days  
**Dependencies:** None

---

### **PAGE 2: Login Page**

**Purpose:** Authenticate users  
**User Types:** Both Dealer & Sub-dealer  
**URL:** `/login`

**Components:**
- Email/Phone input field
- Password input field (with show/hide toggle)
- "Remember me" checkbox
- Login button (Orange)
- "Forgot Password?" link
- "Don't have an account? Sign up" link

**Functionality:**
- Form validation
- API: `POST /api/auth/login`
- Store JWT token in localStorage/cookies
- Redirect based on user type:
  - Dealer → `/dealer/dashboard`
  - Sub-dealer → `/subdealer/dashboard`

**Success State:**
- Redirect to appropriate dashboard
- Show welcome toast

**Error States:**
- Invalid credentials
- Account not verified
- Account suspended
- Server error

**Design Notes:**
- Minimal, centered design
- Optional: Background image or illustration
- Mobile-friendly

**Priority:** HIGH  
**Estimated Build Time:** 1 day  
**Dependencies:** None

---

### **PAGE 3: Email Verification Page**

**Purpose:** Verify user email after registration  
**User Types:** Both  
**URL:** `/verify-email/:token`

**Components:**
- Verification status message
- Success: "Email verified! Redirecting..."
- Pending: "Verifying your email..."
- Error: "Invalid or expired link"
- Resend verification email button

**Functionality:**
- Auto-verify on page load using token from URL
- API: `POST /api/auth/verify-email`
- Redirect to login after 3 seconds on success

**Priority:** HIGH  
**Estimated Build Time:** 0.5 day  
**Dependencies:** Registration Page

---

### **PAGE 4: Forgot Password Page**

**Purpose:** Reset forgotten password  
**User Types:** Both  
**URL:** `/forgot-password`

**Components:**
**Step 1:** Enter email
- Email input
- Submit button

**Step 2:** Check email message
- "We've sent a reset link to your email"
- Resend link button

**Step 3:** Reset password (separate page `/reset-password/:token`)
- New password input
- Confirm password input
- Submit button

**Functionality:**
- API: `POST /api/auth/forgot-password`
- API: `POST /api/auth/reset-password`

**Priority:** MEDIUM  
**Estimated Build Time:** 1 day  
**Dependencies:** None

---

### **PAGE 5: Dealer Dashboard** ⭐

**Purpose:** Overview of dealer's business  
**User Type:** Dealer only  
**URL:** `/dealer/dashboard`

**Layout:** Bento Grid (refer to mockup)

**Components:**
1. **Header:**
   - Logo + Navigation (Dashboard, Inventory, Sub-dealers, Orders, Analytics)
   - Notifications bell
   - User avatar/menu

2. **Hero Card (Top-Left):** Pending Orders
   - Count (large number)
   - List of 2-3 recent orders
   - Quick approve/reject buttons
   - "View All" link

3. **KPI Cards:**
   - Revenue This Month (with chart)
   - Active Sub-dealers (with count)
   - Total Products (with count)
   - Low Stock Alerts (with count)

4. **Chart:** Order Requests - Last 7 Days (bar chart)

5. **Activity Feed:** Recent activities
   - Order approved
   - New access request
   - Product added
   - etc.

**Functionality:**
- API: `GET /api/dealer/dashboard` (returns all stats)
- API: `GET /api/dealer/orders?status=pending&limit=3`
- Real-time updates (optional: websockets)
- Quick actions: Approve/Reject orders from dashboard

**Priority:** CRITICAL  
**Estimated Build Time:** 2-3 days  
**Dependencies:** Login Page, Order Requests API

---

### **PAGE 6: Inventory Management Page**

**Purpose:** Manage product inventory  
**User Type:** Dealer only  
**URL:** `/dealer/inventory`

**Layout:** Table view with filters

**Components:**
1. **Header Section:**
   - Page title: "Inventory Management"
   - "Add Product" button (Orange)
   - Search bar
   - Filters: Category, Brand, Stock status
   - Sort: Name, Price, Stock, Date added

2. **Product Table:**
   - Columns: Image, Name, Brand, Category, Price, Stock Level, Actions
   - Stock Level: Color-coded (Green/Amber/Red)
   - Actions: Edit, Delete (icon buttons)

3. **Pagination:** Bottom of table

4. **Empty State:** 
   - "No products yet"
   - "Add your first product" CTA

**Functionality:**
- API: `GET /api/products?merchant_id={id}`
- Search: Client-side or server-side
- Filter: Multiple filters
- Sort: Client-side
- Delete: Confirmation modal
- Edit: Opens edit product page

**Priority:** HIGH  
**Estimated Build Time:** 2 days  
**Dependencies:** Login, Add/Edit Product Page

---

### **PAGE 7: Add/Edit Product Page**

**Purpose:** Create or modify product details  
**User Type:** Dealer only  
**URL:** `/dealer/inventory/add` or `/dealer/inventory/edit/:id`

**Layout:** Form with sections

**Components:**
1. **Basic Information:**
   - Product Name
   - Brand
   - Category (dropdown)
   - SKU (optional)

2. **Specifications:**
   - Size (Height x Width)
   - Surface Type (Glossy, Matte, etc.)
   - Packing per box

3. **Pricing & Stock:**
   - Price per box
   - Current quantity

4. **Images:**
   - Upload multiple images
   - Set primary image
   - Drag to reorder

5. **Actions:**
   - Save button (Orange)
   - Cancel button

**Functionality:**
- API: `POST /api/products` (create)
- API: `PUT /api/products/:id` (update)
- API: `GET /api/products/:id` (get for edit)
- Image upload to S3
- Form validation
- Success: Redirect to inventory page

**Priority:** HIGH  
**Estimated Build Time:** 2 days  
**Dependencies:** Inventory Management Page, S3 setup

---

### **PAGE 8: Sub-dealer Management Page**

**Purpose:** Manage sub-dealer connections  
**User Type:** Dealer only  
**URL:** `/dealer/subdealers`

**Layout:** Tabs with cards

**Components:**
1. **Header:**
   - Page title: "Sub-dealer Management"
   - "Invite Sub-dealer" button

2. **Tabs:**
   - Pending Requests (count badge)
   - Active Sub-dealers (count badge)
   - Revoked (count badge)

3. **Sub-dealer Cards:**
   - Business name
   - Contact info
   - Total orders placed
   - Last order date
   - Actions: Approve, Reject, Revoke, View Profile

4. **Invite Modal:**
   - Generate invite code
   - Copy to clipboard
   - Share via email/WhatsApp

**Functionality:**
- API: `GET /api/dealer/subdealers?status={status}`
- API: `POST /api/dealer/subdealers/:id/approve`
- API: `POST /api/dealer/subdealers/:id/reject`
- API: `POST /api/dealer/subdealers/invite`

**Priority:** HIGH  
**Estimated Build Time:** 2 days  
**Dependencies:** Login

---

### **PAGE 9: Order Requests Page (Dealer View)**

**Purpose:** View and manage incoming orders  
**User Type:** Dealer only  
**URL:** `/dealer/orders`

**Layout:** List/Card view with filters

**Components:**
1. **Header:**
   - Page title: "Order Requests"
   - Filters: Status, Date range, Sub-dealer

2. **Order Cards:**
   - Order number
   - Sub-dealer name
   - Items count & total amount
   - Status badge (Pending, Approved, Rejected)
   - Time ago
   - Actions: View Details, Approve, Reject

3. **Tabs:**
   - All Orders
   - Pending (default)
   - Approved
   - Rejected

**Functionality:**
- API: `GET /api/dealer/order-requests?status={status}`
- API: `POST /api/dealer/order-requests/:id/approve`
- API: `POST /api/dealer/order-requests/:id/reject`
- Filters and search

**Priority:** HIGH  
**Estimated Build Time:** 2 days  
**Dependencies:** Order Detail Page

---

### **PAGE 10: Order Detail Page (Dealer View)**

**Purpose:** View complete order information  
**User Type:** Dealer only  
**URL:** `/dealer/orders/:id`

**Layout:** Detailed view

**Components:**
1. **Order Header:**
   - Order number
   - Status badge
   - Date & time
   - Sub-dealer info

2. **Customer Details:**
   - Name, Phone, Address (if provided)

3. **Items Table:**
   - Product image, name, brand
   - Quantity
   - Unit price
   - Total price

4. **Order Summary:**
   - Subtotal
   - Tax
   - Grand Total

5. **Actions:**
   - Approve button (if pending)
   - Reject button (if pending)
   - Notes/Comments section

**Functionality:**
- API: `GET /api/order-requests/:id`
- Approve/Reject actions
- Print order (optional)

**Priority:** HIGH  
**Estimated Build Time:** 1 day  
**Dependencies:** Order Requests Page

---

### **PAGE 11: Sub-dealer Dashboard** ⭐

**Purpose:** Overview for sub-dealers  
**User Type:** Sub-dealer only  
**URL:** `/subdealer/dashboard`

**Layout:** Grid layout (refer to mockup)

**Components:**
1. **Hero Section:** Quick Search
   - Large search bar with prominent styling
   - Quick search suggestions (buttons)
   - Search icon

2. **Connected Dealers Section:**
   - Grid of dealer cards (4 cards)
   - Dealer name, location, product count
   - Online status indicator
   - "Browse" button
   - "View All" link

3. **My Orders Widget:**
   - Pending: Count with amber badge
   - Approved: Count with green badge
   - Total: Count
   - "View All Orders" link

4. **Recent Order Requests:**
   - List of 3 recent orders
   - Order number, dealer, status, time ago

5. **Suggested Dealers:**
   - 2-3 dealer suggestions
   - "Request Access" button

**Functionality:**
- API: `GET /api/subdealer/dashboard`
- Quick search: Redirect to search page
- Connect to dealer: Request access

**Priority:** CRITICAL  
**Estimated Build Time:** 2 days  
**Dependencies:** Login, Search Page

---

### **PAGE 12: Multi-Dealer Search Page** ⭐⭐⭐ **MOST CRITICAL**

**Purpose:** Search products across multiple dealers  
**User Type:** Sub-dealer only  
**URL:** `/subdealer/search`

**Layout:** Split-screen (refer to mockup)

**Components:**
1. **Top Search Bar:**
   - Full-width, prominent
   - Autocomplete suggestions
   - Search icon

2. **Left Sidebar (Sticky):**
   - **Filters:**
     - Brand (checkboxes with counts)
     - Size (checkboxes with counts)
     - Price Range (slider)
     - Dealer (checkboxes with counts)
     - Stock Status (checkboxes)
   - Clear All button
   - Apply Filters button (Orange)

3. **Main Results Area:**
   - Results header: "X products found from Y dealers"
   - Sort dropdown: Relevance, Price, Stock
   - Grid/List toggle
   - **Product Grid (3 columns):**
     - Product card:
       - 16:9 image
       - Product name, brand, size
       - Price (bold)
       - Stock badge (color-coded)
       - Dealer name
       - "Add to Order Request" button (Orange)
   - Load More button

4. **Empty State:**
   - "No products found"
   - "Try adjusting filters"

**Functionality:**
- API: `GET /api/products/search?q={query}&filters={filters}`
- Real-time search (debounced)
- Filter by multiple criteria
- Add to cart/order request
- Sticky filters sidebar
- Infinite scroll or pagination

**Priority:** CRITICAL (Highest Priority!)  
**Estimated Build Time:** 3-4 days  
**Dependencies:** Product Detail Page, Cart functionality

---

### **PAGE 13: Product Detail Page**

**Purpose:** View complete product information  
**User Type:** Sub-dealer  
**URL:** `/products/:id`

**Layout:** Two-column

**Components:**
1. **Left Column:**
   - Image gallery
   - Main image (large)
   - Thumbnail images (carousel)
   - Zoom on hover

2. **Right Column:**
   - Product name (H1)
   - Brand
   - Price (large, bold)
   - Stock status badge
   - Dealer information
   - Specifications table:
     - Size
     - Surface type
     - Packing per box
     - Coverage
   - Quantity selector
   - "Add to Order Request" button (Orange)
   - "Back to Search" link

3. **Bottom Section:**
   - Related products (from same dealer)

**Functionality:**
- API: `GET /api/products/:id`
- Add to cart/order request
- Image gallery with lightbox

**Priority:** HIGH  
**Estimated Build Time:** 1-2 days  
**Dependencies:** Search Page

---

### **PAGE 14: Dealer Discovery Page**

**Purpose:** Find and connect with dealers  
**User Type:** Sub-dealer only  
**URL:** `/subdealer/dealers`

**Layout:** Grid of dealer cards

**Components:**
1. **Header:**
   - Page title: "Discover Dealers"
   - Search bar
   - Filters: Location, Product categories

2. **Dealer Cards:**
   - Dealer name
   - Location (city, state)
   - Product count
   - Rating (optional)
   - "Request Access" button (if not connected)
   - "Browse Products" button (if connected)

3. **Invite Code Section:**
   - "Have an invite code?"
   - Input field
   - "Submit" button

**Functionality:**
- API: `GET /api/dealers`
- API: `POST /api/subdealers/request-access`
- API: `POST /api/subdealers/redeem-invite`
- Search and filter dealers

**Priority:** MEDIUM  
**Estimated Build Time:** 1-2 days  
**Dependencies:** Request Access flow

---

### **PAGE 15: Request Access Page**

**Purpose:** Request access to a dealer's inventory  
**User Type:** Sub-dealer only  
**URL:** `/subdealer/dealers/:id/request-access`

**Layout:** Form

**Components:**
1. **Dealer Information:**
   - Name, location, product count

2. **Request Form:**
   - Message to dealer (textarea)
   - Business details (pre-filled from profile)
   - Submit button

3. **Success State:**
   - "Request sent!"
   - "The dealer will review your request"

**Functionality:**
- API: `POST /api/dealer-subdealer-permissions/request`
- Form validation

**Priority:** MEDIUM  
**Estimated Build Time:** 0.5 day  
**Dependencies:** Dealer Discovery Page

---

### **PAGE 16: Order Request Creation Page (Cart/Checkout)**

**Purpose:** Create and submit order request  
**User Type:** Sub-dealer only  
**URL:** `/subdealer/cart` or `/subdealer/checkout`

**Layout:** Two-column checkout

**Components:**
1. **Left Column - Cart Items:**
   - Products grouped by dealer
   - Each item:
     - Image, name, brand
     - Quantity selector
     - Price
     - Remove button
   - Subtotal per dealer

2. **Right Column - Order Details:**
   - Customer information (optional):
     - Name
     - Phone
     - Delivery address
   - Special instructions (textarea)
   - Order summary:
     - Subtotal
     - Tax (calculated)
     - Total
   - "Submit Order Request" button (Orange)

3. **Empty Cart State:**
   - "Your cart is empty"
   - "Start searching for products"

**Functionality:**
- API: `POST /api/order-requests`
- Cart management (localStorage or API)
- Form validation
- Success: Redirect to orders page

**Priority:** HIGH  
**Estimated Build Time:** 2 days  
**Dependencies:** Search Page, Product Detail Page

---

### **PAGE 17: My Orders Page (Sub-dealer View)**

**Purpose:** View all order requests  
**User Type:** Sub-dealer only  
**URL:** `/subdealer/orders`

**Layout:** List/Card view with filters

**Components:**
1. **Header:**
   - Page title: "My Orders"
   - Filters: Status, Date range, Dealer

2. **Tabs:**
   - All Orders
   - Pending
   - Approved
   - Rejected

3. **Order Cards:**
   - Order number
   - Dealer name
   - Items count & total
   - Status badge (color-coded)
   - Date
   - "View Details" button

**Functionality:**
- API: `GET /api/subdealer/order-requests?status={status}`
- Filter and search
- Click to view details

**Priority:** HIGH  
**Estimated Build Time:** 1-2 days  
**Dependencies:** Order Detail Page

---

### **PAGE 18: Order Detail Page (Sub-dealer View)**

**Purpose:** View order request details  
**User Type:** Sub-dealer only  
**URL:** `/subdealer/orders/:id`

**Layout:** Detailed view

**Components:**
1. **Order Header:**
   - Order number
   - Status badge
   - Date & time
   - Dealer name

2. **Items List:**
   - Product image, name, brand
   - Quantity
   - Price
   - Subtotal

3. **Order Summary:**
   - Subtotal
   - Tax
   - Total

4. **Status Timeline:**
   - Requested (date/time)
   - Approved/Rejected (date/time)
   - Fulfilled (future phase)

5. **Actions:**
   - Cancel order (if pending)
   - Contact dealer (optional)

**Functionality:**
- API: `GET /api/order-requests/:id`
- Cancel order (if pending)

**Priority:** HIGH  
**Estimated Build Time:** 1 day  
**Dependencies:** My Orders Page

---

### **PAGE 19: Profile/Settings Page**

**Purpose:** Manage user profile and settings  
**User Type:** Both  
**URL:** `/profile` or `/settings`

**Layout:** Tabs

**Components:**
1. **Profile Tab:**
   - Profile picture upload
   - Name, Email, Phone
   - Business details
   - Save button

2. **Security Tab:**
   - Change password
   - Two-factor authentication (future)

3. **Notifications Tab:**
   - Email notifications preferences
   - Push notifications preferences

4. **Account Tab:**
   - Delete account (danger zone)

**Functionality:**
- API: `GET /api/users/me`
- API: `PUT /api/users/me`
- API: `POST /api/users/change-password`

**Priority:** MEDIUM  
**Estimated Build Time:** 1-2 days  
**Dependencies:** None

---

### **PAGE 20: Notifications Page**

**Purpose:** View all notifications  
**User Type:** Both  
**URL:** `/notifications`

**Components:**
- List of notifications
- Mark as read/unread
- Filter by type
- Clear all

**Functionality:**
- API: `GET /api/notifications`
- API: `PUT /api/notifications/:id/read`

**Priority:** LOW  
**Estimated Build Time:** 1 day  
**Dependencies:** None

---

## Recommended Build Orders

### **🎯 OPTION A: Logical Flow (Start with Authentication)**

**Week 1: Foundation**
```
Day 1-2:   Page 2  - Login Page
Day 3-4:   Page 1  - Registration Page
Day 5:     Page 3  - Email Verification
```

**Week 2: Core Dashboards**
```
Day 1-3:   Page 5  - Dealer Dashboard
Day 4-5:   Page 11 - Sub-dealer Dashboard
```

**Week 3: The Star Feature**
```
Day 1-4:   Page 12 - Multi-Dealer Search ⭐⭐⭐
Day 5:     Page 13 - Product Detail Page
```

**Week 4: Orders Flow**
```
Day 1-2:   Page 16 - Order Request Creation
Day 3:     Page 9  - Order Requests (Dealer)
Day 4:     Page 17 - My Orders (Sub-dealer)
Day 5:     Page 10/18 - Order Detail Pages
```

**Week 5: Connections**
```
Day 1-2:   Page 8  - Sub-dealer Management
Day 3-4:   Page 14 - Dealer Discovery
Day 5:     Page 15 - Request Access
```

**Week 6: Inventory & Polish**
```
Day 1-2:   Page 6  - Inventory Management
Day 3-4:   Page 7  - Add/Edit Product
Day 5:     Polish, bug fixes, testing
```

---

### **🚀 OPTION B: "Wow Factor First" (Start with Search)**

**Week 1: The Star Feature (with mock data)**
```
Day 1-4:   Page 12 - Multi-Dealer Search ⭐⭐⭐
Day 5:     Page 13 - Product Detail Page
```

**Week 2: Core Dashboards**
```
Day 1-3:   Page 11 - Sub-dealer Dashboard
Day 4-5:   Page 5  - Dealer Dashboard
```

**Week 3: Authentication**
```
Day 1-2:   Page 2  - Login Page
Day 3-4:   Page 1  - Registration Page
Day 5:     Connect auth to dashboards
```

**Week 4: Orders Flow**
```
Day 1-2:   Page 16 - Order Request Creation
Day 3:     Page 9  - Order Requests (Dealer)
Day 4:     Page 17 - My Orders (Sub-dealer)
Day 5:     Page 10/18 - Order Detail Pages
```

**Week 5: Connections**
```
Day 1-2:   Page 8  - Sub-dealer Management
Day 3-4:   Page 14 - Dealer Discovery
Day 5:     Page 15 - Request Access
```

**Week 6: Inventory & Polish**
```
Day 1-2:   Page 6  - Inventory Management
Day 3-4:   Page 7  - Add/Edit Product
Day 5:     Polish, bug fixes, testing
```

---

### **⚡ OPTION C: Balanced Approach**

**Week 1: Quick Wins**
```
Day 1-2:   Page 2  - Login Page (simple)
Day 3-5:   Page 12 - Multi-Dealer Search (partial)
```

**Week 2: Complete Search + Dashboard**
```
Day 1-2:   Page 12 - Multi-Dealer Search (complete)
Day 3:     Page 13 - Product Detail
Day 4-5:   Page 11 - Sub-dealer Dashboard
```

**Week 3: Dealer Side**
```
Day 1-3:   Page 5  - Dealer Dashboard
Day 4-5:   Page 9  - Order Requests (Dealer)
```

**Week 4: Complete Orders**
```
Day 1-2:   Page 16 - Order Request Creation
Day 3:     Page 17 - My Orders (Sub-dealer)
Day 4-5:   Page 10/18 - Order Details
```

**Week 5: Connections**
```
Day 1-2:   Page 8  - Sub-dealer Management
Day 3-4:   Page 14 - Dealer Discovery
Day 5:     Page 1  - Registration (full)
```

**Week 6: Inventory & Complete**
```
Day 1-2:   Page 6  - Inventory Management
Day 3-4:   Page 7  - Add/Edit Product
Day 5:     Final polish & testing
```

---

## Dependencies & Flow

### **Critical Path (Must build in order):**
```
Login → Dashboard → Search → Product Detail → Order Creation → Order Management
```

### **Parallel Tracks (Can build simultaneously):**

**Track A: Dealer Flow**
```
Dealer Dashboard → Inventory Management → Add/Edit Product
                 ↓
                 Sub-dealer Management → Order Requests
```

**Track B: Sub-dealer Flow**
```
Sub-dealer Dashboard → Search → Product Detail
                     ↓
                     Order Creation → My Orders
```

**Track C: Connections**
```
Dealer Discovery → Request Access ↔ Sub-dealer Management
```

---

## Timeline Estimates

### **Minimum Viable Product (MVP):**
**Total Time:** 6 weeks (30 working days)

### **By Priority:**

**Critical Pages (Must Have):**
- 10 pages
- 18-22 days

**Important Pages (Should Have):**
- 8 pages
- 8-10 days

**Supporting Pages (Nice to Have):**
- 5 pages
- 4-5 days

### **By User Type:**

**Dealer Pages:**
- 6 core pages
- 10-12 days

**Sub-dealer Pages:**
- 8 core pages
- 12-15 days

**Shared Pages:**
- 4 pages
- 3-4 days

---

## Progress Tracking Template

Use this to track progress as pages are built:

```
[ ] Page 1:  Registration          | Priority: High    | Status: Not Started
[ ] Page 2:  Login                 | Priority: High    | Status: Not Started
[ ] Page 3:  Email Verification    | Priority: High    | Status: Not Started
[ ] Page 4:  Forgot Password       | Priority: Medium  | Status: Not Started
[ ] Page 5:  Dealer Dashboard      | Priority: Critical| Status: Not Started
[ ] Page 6:  Inventory Management  | Priority: High    | Status: Not Started
[ ] Page 7:  Add/Edit Product      | Priority: High    | Status: Not Started
[ ] Page 8:  Sub-dealer Management | Priority: High    | Status: Not Started
[ ] Page 9:  Order Requests (D)    | Priority: High    | Status: Not Started
[ ] Page 10: Order Detail (D)      | Priority: High    | Status: Not Started
[ ] Page 11: Sub-dealer Dashboard  | Priority: Critical| Status: Not Started
[ ] Page 12: Multi-Dealer Search   | Priority: CRITICAL| Status: Not Started
[ ] Page 13: Product Detail        | Priority: High    | Status: Not Started
[ ] Page 14: Dealer Discovery      | Priority: Medium  | Status: Not Started
[ ] Page 15: Request Access        | Priority: Medium  | Status: Not Started
[ ] Page 16: Order Creation        | Priority: High    | Status: Not Started
[ ] Page 17: My Orders (SD)        | Priority: High    | Status: Not Started
[ ] Page 18: Order Detail (SD)     | Priority: High    | Status: Not Started
[ ] Page 19: Profile/Settings      | Priority: Medium  | Status: Not Started
[ ] Page 20: Notifications         | Priority: Low     | Status: Not Started
```

---

## Decision Framework

### **Which page to build next?**

Ask these questions:
1. **Does it block other pages?** (Dependency)
2. **Does it add immediate value?** (Impact)
3. **Is it complex?** (Risk - build early to test)
4. **Does it excite you?** (Motivation)

**Example:**
- Search Page: ✅ Blocks orders, ✅ High value, ✅ Complex, ✅ Exciting → **Build early!**

---

## Quick Reference

**Most Critical:** Page 12 (Multi-Dealer Search)  
**Most Complex:** Page 12 (Multi-Dealer Search)  
**Quickest Win:** Page 2 (Login)  
**Highest Impact:** Page 12 (Search) + Page 5/11 (Dashboards)  

**Recommended First Page:** 
- **Option A:** Page 12 (Search) - Wow factor
- **Option B:** Page 2 (Login) - Foundation
- **Option C:** Page 5 or 11 (Dashboard) - Overview

---

**Document Version:** 1.0  
**Last Updated:** March 2026  
**Status:** Ready for Development

