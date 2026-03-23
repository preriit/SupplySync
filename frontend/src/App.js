import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import DealerDashboard from './pages/DealerDashboard';
import SubCategoriesList from './pages/SubCategoriesList';
import AddSubCategory from './pages/AddSubCategory';
import ProductsList from './pages/ProductsList';
import AddProduct from './pages/AddProduct';
import ProductDetail from './pages/ProductDetail';
import DealerComingSoon from './pages/DealerComingSoon';
import DealerProfile from './pages/DealerProfile';

// Admin Pages
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import AdminUsers from './pages/AdminUsers';
import AdminMerchants from './pages/AdminMerchants';
import AdminReferenceData from './pages/AdminReferenceData';
import AdminAnalytics from './pages/AdminAnalytics';

import './App.css';

// Protected Route component for dealers
const ProtectedRoute = ({ children, requiredType }) => {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (requiredType && user.user_type !== requiredType) {
    return <Navigate to="/" replace />;
  }

  return children;
};

// Protected Route component for admin (having admin_token is enough; admin_user is for display)
const AdminProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('admin_token');

  if (!token) {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />

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
            <ProtectedRoute requiredType="dealer">
              <DealerDashboard />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/dealer/inventory" 
          element={
            <ProtectedRoute requiredType="dealer">
              <SubCategoriesList />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/dealer/inventory/add-category" 
          element={
            <ProtectedRoute requiredType="dealer">
              <AddSubCategory />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/dealer/inventory/:subcategoryId/products" 
          element={
            <ProtectedRoute requiredType="dealer">
              <ProductsList />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/dealer/inventory/:subcategoryId/products/add" 
          element={
            <ProtectedRoute requiredType="dealer">
              <AddProduct />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/dealer/inventory/:subcategoryId/products/:productId" 
          element={
            <ProtectedRoute requiredType="dealer">
              <ProductDetail />
            </ProtectedRoute>
          } 
        />
        <Route
          path="/dealer/subdealers"
          element={
            <ProtectedRoute requiredType="dealer">
              <DealerComingSoon
                title="Sub-Dealers"
                blurb="Invite sub-dealers, define permissions, and keep channel relationships neatly organized."
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dealer/analytics"
          element={
            <ProtectedRoute requiredType="dealer">
              <DealerComingSoon
                title="Analytics"
                blurb="Track sell-through, stock movement, and top-performing categories with actionable insights."
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dealer/profile"
          element={
            <ProtectedRoute requiredType="dealer">
              <DealerProfile />
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