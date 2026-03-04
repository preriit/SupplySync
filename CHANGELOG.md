# SupplySync Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.1.0] - 2026-03-04

### Added - Universal Search Feature
- **Global search bar** in navigation (DealerNav component)
- Real-time search across sub-categories and products
- Categorized results dropdown with icons and metadata
- Backend endpoint: `GET /api/dealer/search?q={query}`
- 300ms debounce for performance optimization
- Click-to-navigate from search results
- Loading spinner during search

### Changed - Search UX
- Removed individual search bars from SubCategoriesList page
- Removed individual search bars from ProductsList page
- Unified all search into single global search
- Enhanced search to include: brand, name, size, make type, surface type, quality, SKU

### Improved
- Better user experience with always-accessible search
- Faster navigation to any product or category
- Professional dropdown design with visual indicators

---

## [1.0.0] - 2026-03-04

### Added - P0: Quantity Transactions
- Product transaction system with +/- buttons
- `product_transactions` database table for audit trail
- Backend endpoints:
  - `POST /api/dealer/products/{id}/transactions` - Create transaction
  - `GET /api/dealer/products/{id}/transactions` - View history
- Transaction history dialog in frontend
- Add/Subtract quantity operations
- Negative quantity support with confirmation dialog
- Inline validation error messages (red text)
- Integer validation (rejects decimals)
- Toast notifications for success/error
- Transaction logging: type, quantity, before/after values, user, timestamp

### Added - Core Features
- JWT-based authentication system
  - Dealer registration (`POST /api/auth/register/dealer`)
  - Login (`POST /api/auth/login`)
  - Token-based authorization
- PostgreSQL database setup and schema
- Inventory management system
  - Categories (Tiles)
  - Sub-categories (shared across merchants)
  - Products (merchant-specific)
- Sub-category management
  - List sub-categories with product counts
  - Smart sub-category creation (prevents duplicates)
  - Unique constraint on size + make_type
- Product management
  - Add products with detailed attributes
  - View products by sub-category
  - Product cards with all details
- Reference data system
  - Sizes, make types, surface types
  - Application types, body types, qualities
  - Admin-managed master data
- Multi-language support (i18n)
  - English and Hindi translations
  - i18next configuration
- Dealer dashboard
  - Statistics cards (products, low stock, out of stock, inventory value)
  - Quick action buttons
  - Recent activity section

### Database Schema
- Created normalized PostgreSQL schema
- Tables: users, merchants, categories, sub_categories, products, product_transactions
- Reference tables: sizes, make_types, surface_types, application_types, body_types, qualities
- Proper foreign keys and constraints
- Indexes for performance
- UUID primary keys
- Timestamps on all tables

### Frontend Pages
- LoginPage.js - JWT authentication
- DealerDashboard.js - Overview and stats
- SubCategoriesList.js - Browse categories
- AddSubCategory.js - Create new categories
- ProductsList.js - View products with transactions UI
- AddProduct.js - Add new products

### Frontend Components
- DealerNav.js - Navigation with global search
- StatCard.js - Dashboard statistics display
- shadcn/ui components (Button, Input, Card, Dialog, AlertDialog, etc.)

### Documentation
- API_DOCUMENTATION.md - Complete API reference
- DATABASE.md - Database schema documentation
- README.md - Setup and usage guide
- CHANGELOG.md - Version history (this file)

### Technical Stack
- Backend: FastAPI, SQLAlchemy, PostgreSQL, JWT
- Frontend: React 18, React Router, Tailwind CSS, Axios
- Infrastructure: Supervisor, Hot reload

---

## Architecture Decisions

### Shared Sub-Categories
Sub-categories (e.g., "12X12 DOUBLE CHARGE") are shared across all merchants. This design:
- Prevents duplicate categories
- Ensures consistency
- Simplifies multi-dealer search (future)
- Uses unique constraint: (size + make_type)

### Transaction Logging
All quantity changes are logged in `product_transactions` table:
- Immutable records (never updated/deleted)
- Enables complete audit trail
- Supports future analytics and reporting
- Records: before/after quantity, user, timestamp

### No Hardcoding
All text, URLs, credentials use:
- Environment variables (.env files)
- i18n translation files
- Database-driven reference data
- Never hardcoded in source code

### JWT Authentication
- 30-day token expiration
- Stateless authentication
- Bearer token in Authorization header
- Secure password hashing (bcrypt)

---

## Breaking Changes

### None
This is the initial release.

---

## Known Issues

### Minor
- Python linting warnings (E712): Use `is True` instead of `== True`
  - Not critical, cosmetic only
  - 15 occurrences in server.py
  - Safe to ignore or fix with `--unsafe-fixes`

### Future Improvements
- Add pagination for large datasets
- Add rate limiting to APIs
- Add data export functionality
- Add bulk operations

---

## Security

### Implemented
- Password hashing with bcrypt
- JWT token authentication
- Environment variable usage
- SQL injection prevention (SQLAlchemy ORM)
- Role-based access control

### Future
- Add HTTPS enforcement
- Add rate limiting
- Add account lockout after failed attempts
- Add 2FA support

---

## Performance

### Optimizations
- Database indexes on foreign keys and frequently queried columns
- Search debounce (300ms)
- Efficient JOIN queries
- Limited result sets (10 per category in search)

### Future
- Add caching layer (Redis)
- Add CDN for static assets
- Optimize image delivery
- Add database connection pooling

---

## Roadmap

See README.md for full roadmap.

**Next Version (1.2.0):**
- P2: Product detail & edit page
- P3: Image upload
- P4: Dynamic dashboard

---

**Maintained by:** SupplySync Development Team  
**Contact:** support@supplysync.in
