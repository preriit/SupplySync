import axios from 'axios';

const rawBaseUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
const normalizedBaseUrl = rawBaseUrl.replace(/\/+$/, '');
const API_BASE_URL = normalizedBaseUrl.endsWith('/api')
  ? normalizedBaseUrl
  : `${normalizedBaseUrl}/api`;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  // Preserve explicitly provided auth headers per-request.
  if (config.headers?.Authorization) {
    return config;
  }

  const isAdminRoute = window.location.pathname.startsWith('/admin');
  const token = isAdminRoute
    ? localStorage.getItem('admin_token')
    : localStorage.getItem('token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Check if it's an admin route
      const isAdminRoute = window.location.pathname.startsWith('/admin');
      
      if (isAdminRoute) {
        // Only redirect if user is authenticated but token expired
        // Don't redirect on login failures
        const hasAdminToken = localStorage.getItem('admin_token');
        if (hasAdminToken && !error.config.url.includes('/login')) {
          localStorage.removeItem('admin_token');
          localStorage.removeItem('admin_user');
          window.location.href = '/admin/login';
        }
      } else {
        // Regular dealer routes
        const hasToken = localStorage.getItem('token');
        if (hasToken && !error.config.url.includes('/login')) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
