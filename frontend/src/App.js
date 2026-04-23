import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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

function App() {
  return (
    <Router>
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
          path="/dealer/team-members"
          element={
            <ProtectedRoute allowedTypes={['dealer']}>
              <TeamMembersPage />
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