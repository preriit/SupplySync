import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DealerDashboard from './pages/DealerDashboard';
import SubCategoriesList from './pages/SubCategoriesList';
import './App.css';

// Protected Route component
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

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        
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
        
        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
