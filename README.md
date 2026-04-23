# SupplySync.in - B2B Tile/Flooring Marketplace

A modern B2B marketplace platform for tile and flooring dealers to manage inventory, track transactions, and connect with sub-dealers.

## 🎯 Features

### ✅ Implemented (Phase 1)

**Authentication & Authorization**
- JWT-based dealer registration and login
- Role-based access control (Dealer role)

**Inventory Management**
- Database-driven product categorization (Category → Sub-Category → Product)
- Shared sub-categories across merchants
- Smart sub-category creation (prevents duplicates)
- Product CRUD with detailed attributes
- Multi-language support (i18n ready - English/Hindi)

**Quantity Transactions**
- Add/Subtract inventory with +/- buttons
- Integer validation with inline error messages
- Negative quantity confirmation dialog
- Complete transaction history logging
- Audit trail for all quantity changes

**Universal Search**
- Global search bar accessible from anywhere
- Real-time search across sub-categories and products
- Searches: brand, name, size, make type, surface type, quality, SKU
- Categorized results dropdown with quick navigation
- 300ms debounce for performance

**Dashboard**
- Overview statistics (products, low stock, out of stock)
- Quick action buttons

### 🔜 Upcoming Features

- **P2:** Product detail & edit page
- **P3:** Image upload for products
- **P4:** Dynamic dashboard with real stats
- **Future:** Pricing, sub-dealer role, order requests, predictive analytics

---

## 🏗️ Tech Stack

**Backend:**
- FastAPI (Python)
- PostgreSQL
- SQLAlchemy ORM
- JWT Authentication
- Uvicorn server

**Frontend:**
- React 18
- React Router v6
- Tailwind CSS
- shadcn/ui components
- i18next (internationalization)
- Axios

**Infrastructure:**
- Supervisor (process management)
- Hot reload enabled (development)

---

## 📁 Project Structure

```
/app/
├── backend/
│   ├── server.py           # Main FastAPI application
│   ├── models.py           # SQLAlchemy ORM models
│   ├── database.py         # Database connection
│   ├── auth.py             # JWT & password utilities
│   ├── schema_v2.sql       # Database schema
│   ├── seed_data.sql       # Reference data
│   ├── init_db.sql         # Initial setup
│   ├── requirements.txt    # Python dependencies
│   └── .env                # Environment variables
│
├── frontend/
│   ├── src/
│   │   ├── pages/          # Page components
│   │   │   ├── LoginPage.js
│   │   │   ├── DealerDashboard.js
│   │   │   ├── SubCategoriesList.js
│   │   │   ├── AddSubCategory.js
│   │   │   ├── ProductsList.js
│   │   │   └── AddProduct.js
│   │   ├── components/     # Reusable components
│   │   │   ├── DealerNav.js      # UNIVERSAL SEARCH implemented here
│   │   │   ├── StatCard.js
│   │   │   └── ui/               # shadcn components
│   │   ├── utils/
│   │   │   └── api.js            # Axios instance with JWT
│   │   ├── i18n.js               # i18n configuration
│   │   ├── App.js
│   │   └── index.js
│   ├── public/
│   │   └── locales/              # Translation files (en/hi)
│   ├── package.json
│   └── .env
│
├── API_DOCUMENTATION.md    # Full API reference
├── DATABASE.md             # Database schema docs
└── README.md               # This file
```

---

## 🚀 Setup & Installation

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL 15+
- Yarn package manager

### Backend Setup

1. **Install PostgreSQL** (if not already running):
```bash
apt-get update && apt-get install -y postgresql postgresql-contrib
service postgresql start
```

2. **Create Database**:
```bash
sudo -u postgres psql -c "CREATE DATABASE supplysync;"
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';"
```

3. **Apply Database Schema**:
```bash
cd /app/backend
sudo -u postgres psql -d supplysync -f init_db.sql
sudo -u postgres psql -d supplysync -f schema_v2.sql
sudo -u postgres psql -d supplysync -f seed_data.sql
sudo -u postgres psql -d supplysync -f add_sizes_table.sql
```

4. **Install Python Dependencies**:
```bash
pip install -r requirements.txt
```

5. **Configure Environment Variables**:

Edit `/app/backend/.env`:
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/supplysync
SECRET_KEY=your-secret-key-here
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=43200
APP_ENV=development
ENABLE_API_DOCS=true
```

Production hardening guide:
- `docs/PRODUCTION_SECURITY.md`

6. **Start Backend** (via Supervisor):
```bash
sudo supervisorctl restart backend
```

Or manually:
```bash
cd /app/backend
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

### Frontend Setup

1. **Install Dependencies**:
```bash
cd /app/frontend
yarn install
```

2. **Configure Environment Variables**:

Edit `/app/frontend/.env`:
```env
REACT_APP_BACKEND_URL=http://localhost:8001
```

For production, use your actual backend URL.

3. **Start Frontend** (via Supervisor):
```bash
sudo supervisorctl restart frontend
```

Or manually:
```bash
yarn start
```

Frontend runs on `http://localhost:3000`

---

## 🧪 Testing

### Test Credentials

Create a test dealer account:
```bash
curl -X POST "http://localhost:8001/api/auth/register/dealer" \
  -H "Content-Type: application/json" \
  -d '{
    "username":"dealer1",
    "email":"dealer1@supplysync.com",
    "phone":"9876543210",
    "password":"password123",
    "merchant_name":"Test Dealer Shop"
  }'
```

Login:
- Email: `dealer1@supplysync.com`
- Password: `password123`

### API Testing

Get JWT token:
```bash
TOKEN=$(curl -s -X POST "http://localhost:8001/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"dealer1@supplysync.com","password":"password123"}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['access_token'])")
```

Test search:
```bash
curl -s "http://localhost:8001/api/dealer/search?q=kajaria" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📊 Database Schema

### Key Tables

**users** - User accounts (dealers, sub-dealers)  
**merchants** - Business entities  
**categories** - Top-level categories (Tiles, Sanitary, etc.)  
**sub_categories** - Shared sub-categories (12x12 GVT, etc.)  
**products** - Merchant-specific products  
**product_transactions** - Quantity change audit log

### Reference Tables (Admin-managed)
- sizes
- make_types
- surface_types
- application_types
- body_types
- qualities

See [DATABASE.md](DATABASE.md) for full schema documentation.

---

## 🔑 Environment Variables

### Backend (.env)
```env
DATABASE_URL=postgresql://user:pass@host:port/dbname
SECRET_KEY=your-secret-key
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=43200
```

### Frontend (.env)
```env
REACT_APP_BACKEND_URL=https://your-backend-url.com
```

**⚠️ IMPORTANT:** Never hardcode URLs, ports, or credentials in code. Always use environment variables.

---

## 🎨 Code Style

### Python (Backend)
- Follow PEP 8
- Use type hints where applicable
- Docstrings for all API endpoints
- Async/await for database operations

### JavaScript/React (Frontend)
- Functional components with hooks
- Tailwind CSS for styling
- Component-based architecture
- i18next for all user-facing text

---

## 🐛 Debugging

### Check Backend Logs
```bash
tail -f /var/log/supervisor/backend.err.log
tail -f /var/log/supervisor/backend.out.log
```

### Check Frontend Logs
```bash
tail -f /var/log/supervisor/frontend.err.log
```

### Restart Services
```bash
sudo supervisorctl restart backend
sudo supervisorctl restart frontend
```

### Check Database Connection
```bash
sudo -u postgres psql -d supplysync -c "SELECT COUNT(*) FROM users;"
```

---

## 🚢 Deployment

### Environment Setup
1. Set `REACT_APP_BACKEND_URL` to production backend URL
2. Set `DATABASE_URL` to production PostgreSQL
3. Change `SECRET_KEY` to a strong random value
4. Enable HTTPS for production

### Database Migration
Apply all SQL files in order:
1. init_db.sql
2. schema_v2.sql
3. seed_data.sql
4. add_sizes_table.sql

---

## 📝 API Documentation

Full API documentation available at [API_DOCUMENTATION.md](API_DOCUMENTATION.md)

Quick links:
- Authentication: `/api/auth/*`
- Search: `/api/dealer/search`
- Products: `/api/dealer/products/*`
- Transactions: `/api/dealer/products/{id}/transactions`

---

## 🛣️ Roadmap

### Phase 1 (Current) ✅
- Dealer authentication
- Inventory management
- Quantity transactions
- Universal search

### Phase 2 🔜
- Product pricing
- Product images
- Edit & delete products
- Dynamic dashboard

### Phase 3 🔮
- Sub-dealer role
- Multi-dealer search
- Order requests
- Analytics dashboard

### Phase 4 🌟
- Predictive analytics
- Category expansion (Sanitary, Plywood)
- Mobile app
- Integrations

---

## 🤝 Contributing

1. Create feature branch
2. Make changes with proper documentation
3. Test thoroughly
4. Submit pull request

---

## 📄 License

Proprietary - SupplySync.in

---

## 📞 Support

For technical issues or questions:
- Email: support@supplysync.in
- Docs: [API_DOCUMENTATION.md](API_DOCUMENTATION.md)

---

**Built with ❤️ for the Tile & Flooring Industry**
