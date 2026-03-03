# SupplySync - Internationalization (i18n) Strategy

## Overview

**Goal:** Multi-language support with NO hardcoded text  
**Approach:** react-i18next + Database-driven dynamic content  
**Default Language:** English  
**Supported Languages (Phase 1):**
- English (en)
- Hindi (hi)
- Marathi (mr)
- (Easy to add more)

---

## Architecture

### **1. Frontend UI Text (Static)**
**Method:** JSON translation files + react-i18next

**Example:**
Instead of:
```jsx
<button>Login</button>  ❌ HARDCODED!
```

Use:
```jsx
import { useTranslation } from 'react-i18next';

function LoginButton() {
  const { t } = useTranslation();
  return <button>{t('auth.login')}</button>;  ✅ TRANSLATABLE!
}
```

**Translation Files:**
```
/app/frontend/src/locales/
├── en/
│   ├── common.json      (Login, Submit, Cancel, etc.)
│   ├── auth.json        (Authentication related)
│   ├── dashboard.json   (Dashboard text)
│   ├── products.json    (Product related)
│   └── orders.json      (Order related)
├── hi/
│   ├── common.json
│   ├── auth.json
│   └── ...
└── mr/
    ├── common.json
    └── ...
```

---

### **2. Dynamic Content (Database)**
**Method:** Multiple language columns OR separate translations table

**Option A: Multiple Columns (Simpler)**
```sql
CREATE TABLE products (
    id UUID PRIMARY KEY,
    name_en VARCHAR(255),      -- "Kajaria Beige Glossy"
    name_hi VARCHAR(255),      -- "काजरिया बेज चमकदार"
    name_mr VARCHAR(255),      -- "काजारिया बेज चमकदार"
    description_en TEXT,
    description_hi TEXT,
    description_mr TEXT,
    -- ... other fields
);
```

**Option B: Translations Table (More Flexible)** ⭐ RECOMMENDED
```sql
CREATE TABLE products (
    id UUID PRIMARY KEY,
    brand VARCHAR(100),
    price DECIMAL(10,2),
    -- ... language-independent fields
);

CREATE TABLE product_translations (
    id UUID PRIMARY KEY,
    product_id UUID REFERENCES products(id),
    language_code VARCHAR(5),    -- 'en', 'hi', 'mr'
    name VARCHAR(255),           -- Translated name
    description TEXT,            -- Translated description
    UNIQUE(product_id, language_code)
);

-- Example data:
-- product_id | language_code | name
-- uuid-123   | en           | "Kajaria Beige Glossy"
-- uuid-123   | hi           | "काजरिया बेज चमकदार"
-- uuid-123   | mr           | "काजारिया बेज चमकदार"
```

---

## Implementation Plan

### **Phase 1: Setup i18n Infrastructure**

#### **Step 1: Install Dependencies**
```bash
# Frontend
cd /app/frontend
yarn add react-i18next i18next i18next-browser-languagedetector i18next-http-backend
```

#### **Step 2: Configure i18next**

**File:** `/app/frontend/src/i18n.js`
```javascript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

i18n
  .use(Backend) // Load translations from JSON files
  .use(LanguageDetector) // Detect user language
  .use(initReactI18next) // Pass to react-i18next
  .init({
    fallbackLng: 'en', // Default language
    supportedLngs: ['en', 'hi', 'mr'], // Supported languages
    debug: process.env.NODE_ENV === 'development',
    
    interpolation: {
      escapeValue: false, // React already escapes
    },
    
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json', // Translation file path
    },
    
    detection: {
      order: ['localStorage', 'cookie', 'navigator'],
      caches: ['localStorage', 'cookie'],
    },
  });

export default i18n;
```

#### **Step 3: Initialize in App**

**File:** `/app/frontend/src/index.js`
```javascript
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import './i18n'; // ← Import i18n config

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

---

### **Phase 2: Create Translation Files**

#### **English Translations**

**File:** `/app/frontend/public/locales/en/common.json`
```json
{
  "app_name": "SupplySync",
  "welcome": "Welcome",
  "search": "Search",
  "submit": "Submit",
  "cancel": "Cancel",
  "save": "Save",
  "delete": "Delete",
  "edit": "Edit",
  "view": "View",
  "add": "Add",
  "remove": "Remove",
  "yes": "Yes",
  "no": "No",
  "loading": "Loading...",
  "error": "Error",
  "success": "Success"
}
```

**File:** `/app/frontend/public/locales/en/auth.json`
```json
{
  "login": "Login",
  "logout": "Logout",
  "register": "Register",
  "email": "Email",
  "password": "Password",
  "confirm_password": "Confirm Password",
  "forgot_password": "Forgot Password?",
  "reset_password": "Reset Password",
  "user_type": {
    "dealer": "Dealer",
    "subdealer": "Sub-dealer",
    "select": "I'm a"
  },
  "errors": {
    "invalid_credentials": "Invalid email or password",
    "email_exists": "Email already registered",
    "weak_password": "Password is too weak"
  }
}
```

**File:** `/app/frontend/public/locales/en/dashboard.json`
```json
{
  "title": "Dashboard",
  "welcome_back": "Welcome back",
  "pending_orders": "Pending Orders",
  "revenue_this_month": "Revenue This Month",
  "active_subdealers": "Active Sub-dealers",
  "total_products": "Total Products",
  "low_stock_alerts": "Low Stock Alerts",
  "recent_activity": "Recent Activity",
  "view_all": "View All",
  "quick_search": "Quick Search"
}
```

**File:** `/app/frontend/public/locales/en/products.json`
```json
{
  "product": "Product",
  "products": "Products",
  "add_product": "Add Product",
  "edit_product": "Edit Product",
  "delete_product": "Delete Product",
  "product_name": "Product Name",
  "brand": "Brand",
  "category": "Category",
  "price": "Price",
  "price_per_box": "Price per Box",
  "stock": "Stock",
  "stock_level": "Stock Level",
  "in_stock": "In Stock",
  "limited_stock": "Limited Stock",
  "low_stock": "Low Stock",
  "out_of_stock": "Out of Stock",
  "size": "Size",
  "surface_type": "Surface Type",
  "glossy": "Glossy",
  "matte": "Matte",
  "rough": "Rough",
  "add_to_order": "Add to Order Request"
}
```

**File:** `/app/frontend/public/locales/en/orders.json`
```json
{
  "order": "Order",
  "orders": "Orders",
  "order_requests": "Order Requests",
  "order_number": "Order Number",
  "order_date": "Order Date",
  "order_status": "Order Status",
  "pending": "Pending",
  "approved": "Approved",
  "rejected": "Rejected",
  "cancelled": "Cancelled",
  "fulfilled": "Fulfilled",
  "approve": "Approve",
  "reject": "Reject",
  "view_details": "View Details",
  "items": "Items",
  "total_amount": "Total Amount",
  "subtotal": "Subtotal",
  "tax": "Tax",
  "from_dealer": "From",
  "to_dealer": "To"
}
```

#### **Hindi Translations**

**File:** `/app/frontend/public/locales/hi/common.json`
```json
{
  "app_name": "सप्लायसिंक",
  "welcome": "स्वागत है",
  "search": "खोजें",
  "submit": "जमा करें",
  "cancel": "रद्द करें",
  "save": "सहेजें",
  "delete": "हटाएं",
  "edit": "संपादित करें",
  "view": "देखें",
  "add": "जोड़ें",
  "remove": "हटाएं",
  "yes": "हाँ",
  "no": "नहीं",
  "loading": "लोड हो रहा है...",
  "error": "त्रुटि",
  "success": "सफलता"
}
```

**File:** `/app/frontend/public/locales/hi/auth.json`
```json
{
  "login": "लॉगिन",
  "logout": "लॉगआउट",
  "register": "पंजीकरण",
  "email": "ईमेल",
  "password": "पासवर्ड",
  "confirm_password": "पासवर्ड की पुष्टि करें",
  "forgot_password": "पासवर्ड भूल गए?",
  "reset_password": "पासवर्ड रीसेट करें",
  "user_type": {
    "dealer": "डीलर",
    "subdealer": "सब-डीलर",
    "select": "मैं हूँ"
  },
  "errors": {
    "invalid_credentials": "अमान्य ईमेल या पासवर्ड",
    "email_exists": "ईमेल पहले से पंजीकृत है",
    "weak_password": "पासवर्ड बहुत कमजोर है"
  }
}
```

#### **Marathi Translations**

**File:** `/app/frontend/public/locales/mr/common.json`
```json
{
  "app_name": "सप्लायसिंक",
  "welcome": "स्वागत आहे",
  "search": "शोधा",
  "submit": "सबमिट करा",
  "cancel": "रद्द करा",
  "save": "जतन करा",
  "delete": "हटवा",
  "edit": "संपादित करा",
  "view": "पहा",
  "add": "जोडा",
  "remove": "काढा",
  "yes": "होय",
  "no": "नाही",
  "loading": "लोड होत आहे...",
  "error": "त्रुटी",
  "success": "यश"
}
```

---

### **Phase 3: Usage in Components**

#### **Example 1: Login Page**

**Before (Hardcoded):**
```jsx
function LoginPage() {
  return (
    <div>
      <h1>Login</h1>
      <input placeholder="Email" />
      <input placeholder="Password" type="password" />
      <button>Submit</button>
      <a href="/forgot-password">Forgot Password?</a>
    </div>
  );
}
```

**After (Translatable):**
```jsx
import { useTranslation } from 'react-i18next';

function LoginPage() {
  const { t } = useTranslation(['auth', 'common']);
  
  return (
    <div>
      <h1>{t('auth:login')}</h1>
      <input placeholder={t('auth:email')} />
      <input placeholder={t('auth:password')} type="password" />
      <button>{t('common:submit')}</button>
      <a href="/forgot-password">{t('auth:forgot_password')}</a>
    </div>
  );
}
```

#### **Example 2: Dashboard with Variables**

```jsx
function DealerDashboard() {
  const { t } = useTranslation('dashboard');
  const dealerName = "ABC Tiles"; // From API/database
  
  return (
    <div>
      {/* Interpolation: "Welcome back, ABC Tiles!" */}
      <h1>{t('dashboard:welcome_back')}, {dealerName}! 👋</h1>
      
      <div>
        <h2>{t('dashboard:pending_orders')}</h2>
        <span>5</span>
      </div>
      
      <div>
        <h2>{t('dashboard:revenue_this_month')}</h2>
        <span>₹5.2L</span>
      </div>
    </div>
  );
}
```

#### **Example 3: Dynamic Product Names (From Database)**

```jsx
function ProductCard({ product }) {
  const { i18n } = useTranslation();
  const currentLang = i18n.language; // 'en', 'hi', or 'mr'
  
  // Backend returns product with translations
  // product = {
  //   id: "123",
  //   price: 480,
  //   translations: {
  //     en: { name: "Kajaria Beige Glossy", description: "..." },
  //     hi: { name: "काजरिया बेज चमकदार", description: "..." },
  //     mr: { name: "काजारिया बेज चमकदार", description: "..." }
  //   }
  // }
  
  const productName = product.translations[currentLang]?.name || product.translations['en'].name;
  
  return (
    <div>
      <h3>{productName}</h3>
      <p>₹{product.price}</p>
    </div>
  );
}
```

---

### **Phase 4: Language Switcher Component**

**Create a language selector that users can use:**

```jsx
import { useTranslation } from 'react-i18next';

function LanguageSwitcher() {
  const { i18n } = useTranslation();
  
  const languages = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
    { code: 'mr', name: 'मराठी', flag: '🇮🇳' }
  ];
  
  const changeLanguage = (langCode) => {
    i18n.changeLanguage(langCode);
    // Optionally: Save to backend user preferences
    // API: PUT /api/users/me { language: langCode }
  };
  
  return (
    <select 
      value={i18n.language} 
      onChange={(e) => changeLanguage(e.target.value)}
      className="px-4 py-2 border rounded"
    >
      {languages.map(lang => (
        <option key={lang.code} value={lang.code}>
          {lang.flag} {lang.name}
        </option>
      ))}
    </select>
  );
}
```

**Add to header:**
```jsx
<header>
  <h1>SupplySync</h1>
  <nav>...</nav>
  <LanguageSwitcher />  {/* ← Add language selector */}
  <UserMenu />
</header>
```

---

### **Phase 5: Backend API Changes**

#### **1. Store User's Language Preference**

**Add to users table:**
```sql
ALTER TABLE users ADD COLUMN preferred_language VARCHAR(5) DEFAULT 'en';
```

**API Endpoint:**
```python
# PUT /api/users/me
@router.put("/me")
async def update_user_profile(
    language: str = Body(None),
    current_user: User = Depends(get_current_user)
):
    if language:
        current_user.preferred_language = language
        db.commit()
    return {"success": True}
```

#### **2. Return Product with Translations**

**Backend serializer:**
```python
# GET /api/products/{id}
@router.get("/products/{id}")
async def get_product(product_id: str, lang: str = 'en'):
    product = db.query(Product).filter(Product.id == product_id).first()
    translations = db.query(ProductTranslation).filter(
        ProductTranslation.product_id == product_id
    ).all()
    
    return {
        "id": product.id,
        "price": product.price,
        "brand": product.brand,
        "translations": {
            t.language_code: {
                "name": t.name,
                "description": t.description
            } for t in translations
        },
        # Or return only current language:
        "name": get_translation(translations, lang, 'name'),
        "description": get_translation(translations, lang, 'description')
    }
```

---

## Database Schema for Translations

### **Option 1: Separate Translation Table** ⭐ RECOMMENDED

```sql
-- Products (Language-independent data)
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID REFERENCES merchants(id),
    brand VARCHAR(100),                    -- Brand names usually not translated
    sku VARCHAR(100),
    price DECIMAL(10, 2),
    current_quantity INT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Product Translations (Language-specific data)
CREATE TABLE product_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    language_code VARCHAR(5) NOT NULL,     -- 'en', 'hi', 'mr'
    name VARCHAR(255) NOT NULL,            -- "Kajaria Beige Glossy"
    description TEXT,
    surface_type VARCHAR(50),              -- "Glossy" / "चमकदार" / "चमकदार"
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(product_id, language_code)
);

-- Category Translations
CREATE TABLE category_translations (
    id UUID PRIMARY KEY,
    category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    language_code VARCHAR(5),
    name VARCHAR(255),
    description TEXT,
    UNIQUE(category_id, language_code)
);

-- Create indexes
CREATE INDEX idx_product_translations_product ON product_translations(product_id);
CREATE INDEX idx_product_translations_lang ON product_translations(language_code);
```

---

## Best Practices

### **1. Translation Keys Naming Convention**

Use namespaces:
```
namespace:key
auth:login
dashboard:welcome_back
products:add_to_order
```

### **2. Pluralization**

Use i18next pluralization:
```json
{
  "product": "Product",
  "product_plural": "Products",
  "items_count": "{{count}} item",
  "items_count_plural": "{{count}} items"
}
```

Usage:
```jsx
{t('products:items_count', { count: 5 })}  // "5 items"
{t('products:items_count', { count: 1 })}  // "1 item"
```

### **3. Date & Number Formatting**

Use i18next formatting:
```jsx
import { useTranslation } from 'react-i18next';

function Component() {
  const { t, i18n } = useTranslation();
  
  const price = 480;
  const date = new Date();
  
  return (
    <div>
      {/* Format number based on locale */}
      <p>{new Intl.NumberFormat(i18n.language, {
        style: 'currency',
        currency: 'INR'
      }).format(price)}</p>
      
      {/* Format date based on locale */}
      <p>{new Intl.DateTimeFormat(i18n.language).format(date)}</p>
    </div>
  );
}
```

### **4. Fallback Strategy**

Always provide English as fallback:
```javascript
const productName = 
  product.translations[currentLang]?.name ||  // Try current language
  product.translations['en']?.name ||         // Fallback to English
  product.brand;                              // Last resort: brand name
```

---

## Implementation Checklist

### **Setup Phase:**
- [ ] Install react-i18next
- [ ] Create i18n configuration
- [ ] Create translation file structure
- [ ] Add English translations (all pages)
- [ ] Add Hindi translations
- [ ] Add Marathi translations

### **Component Updates:**
- [ ] Remove all hardcoded text
- [ ] Replace with t() function calls
- [ ] Test language switching
- [ ] Add LanguageSwitcher component to header

### **Backend Updates:**
- [ ] Add product_translations table
- [ ] Add category_translations table
- [ ] Add user language preference field
- [ ] Update APIs to return translations
- [ ] Add endpoint to update language preference

### **Testing:**
- [ ] Test all pages in English
- [ ] Test all pages in Hindi
- [ ] Test all pages in Marathi
- [ ] Test dynamic content translations
- [ ] Test language persistence (after refresh)

---

## Example Translation Coverage

### **Pages & Their Translation Keys:**

**Login Page:**
- auth:login, auth:email, auth:password, auth:forgot_password, common:submit

**Dashboard:**
- dashboard:welcome_back, dashboard:pending_orders, dashboard:revenue_this_month, etc.

**Search Page:**
- products:search, products:filters, products:brand, products:size, products:price_range, etc.

**Orders:**
- orders:order_requests, orders:approve, orders:reject, orders:pending, etc.

---

## File Structure

```
/app/frontend/
├── public/
│   └── locales/
│       ├── en/
│       │   ├── common.json
│       │   ├── auth.json
│       │   ├── dashboard.json
│       │   ├── products.json
│       │   └── orders.json
│       ├── hi/
│       │   ├── common.json
│       │   ├── auth.json
│       │   └── ...
│       └── mr/
│           ├── common.json
│           └── ...
├── src/
│   ├── i18n.js              (i18n configuration)
│   ├── components/
│   │   └── LanguageSwitcher.jsx
│   └── ...
```

---

## Summary

**DO:**
- ✅ Use `t('namespace:key')` for ALL text
- ✅ Store translations in JSON files
- ✅ Store dynamic content translations in database
- ✅ Provide English as fallback
- ✅ Format dates/numbers based on locale

**DON'T:**
- ❌ Hardcode ANY text: "Login", "Submit", "Dealer", etc.
- ❌ Hardcode numbers/dates format
- ❌ Assume English-only users

**Result:**
- Complete multi-language support
- Easy to add new languages (just add JSON files)
- User-friendly language switching
- Professional localization

---

**This approach ensures SupplySync can serve users in any language! 🌍**

