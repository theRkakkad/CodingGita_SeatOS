let apiURL = import.meta.env.VITE_API_URL || 
  (import.meta.env.DEV ? 'http://localhost:5000' : 'https://seat-booking-website.onrender.com');

if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && apiURL.includes('localhost')) {
  apiURL = 'https://seat-booking-website.onrender.com';
}
import axios from 'axios';

const api = axios.create({
  baseURL: `${apiURL}`,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor to add CSRF token
api.interceptors.request.use(
  (config) => {
    const csrfToken = localStorage.getItem('csrfToken');
    if (csrfToken && ['post', 'put', 'delete', 'patch'].includes(config.method?.toLowerCase())) {
      config.headers['x-csrf-token'] = csrfToken;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Exclude paths where a 401 is expected (e.g., wrong password, invalid google token)
    const excludedPaths = ['/api/auth/login', '/api/auth/refresh', '/api/auth/google', '/api/auth/dev-login', '/api/auth/register', '/api/auth/studentinfo-google'];
    
    // If error is 401 (Unauthorized) and we haven't retried yet
    if (error.response && error.response.status === 401 && !originalRequest._retry && !excludedPaths.includes(originalRequest.url)) {
      originalRequest._retry = true;
      
      try {
        // Attempt to refresh token
        const res = await api.post('/api/auth/refresh');
        
        if (res.status === 200) {
          // Update CSRF token if returned
          if (res.data.csrfToken) {
            localStorage.setItem('csrfToken', res.data.csrfToken);
            originalRequest.headers['x-csrf-token'] = res.data.csrfToken;
          }
          // Retry original request
          return api(originalRequest);
        }
      } catch (refreshError) {
        // If refresh fails, it means session is truly dead. Clear local state.
        localStorage.removeItem('csrfToken');
        // Optionally redirect to login page here, or let AuthContext handle it
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
