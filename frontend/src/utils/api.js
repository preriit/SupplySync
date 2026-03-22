import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests: use admin_token for admin paths, else token
api.interceptors.request.use((config) => {
  const url = (config.url || '').toString();
  const isAdminRequest = url.includes('/admin/') || url.startsWith('admin');
  const token = isAdminRequest
    ? localStorage.getItem('admin_token')
    : localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses: redirect to login when session expired (do NOT redirect on login endpoint failure)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const requestUrl = (error.config?.url || '').toString();
      const isLoginRequest = requestUrl.includes('auth/login');
      // Don't redirect on failed login — let the login page show "Invalid credentials"
      if (isLoginRequest) {
        return Promise.reject(error);
      }
      const isAdminRequest = requestUrl.includes('/admin/') || requestUrl.startsWith('admin');
      if (isAdminRequest) {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');
        window.location.href = '/admin/login';
      } else {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
