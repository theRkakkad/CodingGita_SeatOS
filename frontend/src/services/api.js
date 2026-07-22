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

// Request interceptor to add authorization token dynamically
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
