import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, matchPath } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import DealerDashboard from './pages/DealerDashboard';
import SubCategoriesList from './pages/SubCategoriesList';
import AddSubCategory from './pages/AddSubCategory';
import ProductsList from './pages/ProductsList';
import AddProduct from './pages/AddProduct';
import ProductDetail from './pages/ProductDetail';
import TeamMembersPage from './pages/TeamMembersPage';
import DealerProfile from './pages/DealerProfile';
import StockAlertsPage from './pages/StockAlertsPage';
import DealerComingSoon from './pages/DealerComingSoon';

// Admin Pages
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import AdminUsers from './pages/AdminUsers';
import AdminMerchants from './pages/AdminMerchants';
import AdminReferenceData from './pages/AdminReferenceData';
import AdminAnalytics from './pages/AdminAnalytics';

import './App.css';

// Protected Route component for merchant user flows
const ProtectedRoute = ({ children, allowedTypes = [] }) => {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (allowedTypes.length > 0 && !allowedTypes.includes(user.user_type)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

// Protected Route component for admin
const AdminProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('admin_token');
  const admin = JSON.parse(localStorage.getItem('admin_user') || '{}');

  if (!token || admin.user_type !== 'admin') {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
};

const PAGE_TITLE_BY_ROUTE = [
  { path: '/login', title: 'Login' },
  { path: '/signup', title: 'Sign Up' },
  { path: '/forgot-password', title: 'Forgot Password' },
  { path: '/reset-password/:token', title: 'Reset Password' },
  { path: '/reset-password', title: 'Reset Password' },
  { path: '/admin/login', title: 'Admin Login' },
  { path: '/admin/dashboard', title: 'Admin Dashboard' },
  { path: '/admin/users', title: 'Admin Users' },
  { path: '/admin/merchants', title: 'Admin Merchants' },
  { path: '/admin/reference-data', title: 'Admin Reference Data' },
  { path: '/admin/analytics', title: 'Admin Analytics' },
  { path: '/dealer/dashboard', title: 'Dashboard' },
  { path: '/dealer/inventory', title: 'Inventory' },
  { path: '/dealer/inventory/add-category', title: 'Add Category' },
  { path: '/dealer/inventory/:subcategoryId/products', title: 'Products' },
  { path: '/dealer/inventory/:subcategoryId/products/add', title: 'Add Product' },
  { path: '/dealer/inventory/:subcategoryId/products/:productId', title: 'Product Details' },
  { path: '/dealer/stock-alerts', title: 'Stock Alerts' },
  { path: '/dealer/team-members', title: 'Team Members' },
  { path: '/dealer/profile', title: 'Profile' },
  { path: '/dealer/analytics', title: 'Analytics' },
];

const getDocumentTitleForPath = (pathname) => {
  const matched = PAGE_TITLE_BY_ROUTE.find((route) =>
    matchPath({ path: route.path, end: true }, pathname)
  );
  return `Supply Sync | ${matched?.title || 'App'}`;
};

const DocumentTitleManager = () => {
  const location = useLocation();

  useEffect(() => {
    document.title = getDocumentTitleForPath(location.pathname);
  }, [location.pathname]);

  return null;
};

function App() {
  return (
    <Router>
      <DocumentTitleManager />
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Admin Routes */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route 
          path="/admin/dashboard" 
          element={
            <AdminProtectedRoute>
              <AdminDashboard />
            </AdminProtectedRoute>
          } 
        />
        <Route 
          path="/admin/users" 
          element={
            <AdminProtectedRoute>
              <AdminUsers />
            </AdminProtectedRoute>
          } 
        />
        <Route 
          path="/admin/merchants" 
          element={
            <AdminProtectedRoute>
              <AdminMerchants />
            </AdminProtectedRoute>
          } 
        />
        <Route 
          path="/admin/reference-data" 
          element={
            <AdminProtectedRoute>
              <AdminReferenceData />
            </AdminProtectedRoute>
          } 
        />
        <Route 
          path="/admin/analytics" 
          element={
            <AdminProtectedRoute>
              <AdminAnalytics />
            </AdminProtectedRoute>
          } 
        />
        
        {/* Dealer Routes */}
        <Route 
          path="/dealer/dashboard" 
          element={
            <ProtectedRoute allowedTypes={['dealer', 'manager', 'staff']}>
              <DealerDashboard />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/dealer/inventory" 
          element={
            <ProtectedRoute allowedTypes={['dealer', 'manager', 'staff']}>
              <SubCategoriesList />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/dealer/inventory/add-category" 
          element={
            <ProtectedRoute allowedTypes={['dealer', 'manager']}>
              <AddSubCategory />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/dealer/inventory/:subcategoryId/products" 
          element={
            <ProtectedRoute allowedTypes={['dealer', 'manager', 'staff']}>
              <ProductsList />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/dealer/inventory/:subcategoryId/products/add" 
          element={
            <ProtectedRoute allowedTypes={['dealer', 'manager']}>
              <AddProduct />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/dealer/inventory/:subcategoryId/products/:productId" 
          element={
            <ProtectedRoute allowedTypes={['dealer', 'manager', 'staff']}>
              <ProductDetail />
            </ProtectedRoute>
          } 
        />

        <Route
          path="/dealer/stock-alerts"
          element={
            <ProtectedRoute allowedTypes={['dealer', 'manager', 'staff']}>
              <StockAlertsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dealer/team-members"
          element={
            <ProtectedRoute allowedTypes={['dealer']}>
              <TeamMembersPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dealer/profile"
          element={
            <ProtectedRoute allowedTypes={['dealer', 'manager', 'staff']}>
              <DealerProfile />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dealer/analytics"
          element={
            <ProtectedRoute allowedTypes={['dealer', 'manager', 'staff']}>
              <DealerComingSoon
                title="Analytics Is Brewing"
                blurb="Your numbers are in the lab. Dashboards are coming soon."
              />
            </ProtectedRoute>
          }
        />
        
        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;