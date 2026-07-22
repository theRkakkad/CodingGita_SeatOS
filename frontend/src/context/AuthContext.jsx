import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if user is logged in on refresh
  useEffect(() => {
    const checkLoggedIn = async () => {
      try {
        const res = await api.get('/api/auth/me');
        if (res.data.success) {
          setUser(res.data.user);
          connectSocket(); // Connect socket upon successful session restore
        }
      } catch (err) {
        console.log('No active session.');
      } finally {
        setLoading(false);
      }
    };

    checkLoggedIn();
  }, []);

  // Login handler
  const login = async (email, password) => {
    try {
      const res = await api.post('/api/auth/login', { email, password });
      if (res.data.success) {
        if (res.data.csrfToken) {
          localStorage.setItem('csrfToken', res.data.csrfToken);
        }
        setUser(res.data.user);
        connectSocket(); // Connect socket on login
        return { success: true, user: res.data.user };
      }
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || 'Login failed. Please check your credentials.',
      };
    }
  };

  // Google Login handler
  const googleLogin = async (idToken) => {
    try {
      const res = await api.post('/api/auth/google', { idToken });
      if (res.data.success) {
        if (res.data.csrfToken) {
          localStorage.setItem('csrfToken', res.data.csrfToken);
        }
        setUser(res.data.user);
        connectSocket();
        return { success: true, user: res.data.user };
      }
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || 'Google login failed.',
      };
    }
  };

  // Info Admin Google Login handler
  const infoAdminGoogleLogin = async (idToken) => {
    try {
      const res = await api.post('/api/auth/studentinfo-google', { idToken });
      if (res.data.success) {
        if (res.data.csrfToken) {
          localStorage.setItem('csrfToken', res.data.csrfToken);
        }
        setUser(res.data.user);
        connectSocket();
        return { success: true, user: res.data.user };
      }
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || 'Info Admin Google login failed.',
      };
    }
  };

  // Developer Bypass Login
  const devLogin = async (email, role) => {
    try {
      const res = await api.post('/api/auth/dev-login', { email, role });
      if (res.data.success) {
        if (res.data.csrfToken) {
          localStorage.setItem('csrfToken', res.data.csrfToken);
        }
        setUser(res.data.user);
        connectSocket();
        return { success: true, user: res.data.user };
      }
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || 'Dev login failed.',
      };
    }
  };

  // Register handler
  const register = async (name, enrollmentNo, email, password) => {
    try {
      const res = await api.post('/api/auth/register', {
        name,
        enrollmentNo,
        email,
        password,
      });
      if (res.data.success) {
        if (res.data.csrfToken) {
          localStorage.setItem('csrfToken', res.data.csrfToken);
        }
        setUser(res.data.user);
        connectSocket(); // Connect socket on register
        return { success: true };
      }
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || 'Registration failed.',
      };
    }
  };

  // Logout handler
  const logout = async () => {
    try {
      await api.post('/api/auth/logout');
    } catch (err) {
      console.error('Logout error on server:', err.message);
    }
    localStorage.removeItem('csrfToken');
    setUser(null);
    disconnectSocket(); // Disconnect socket on logout
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        googleLogin,
        infoAdminGoogleLogin,
        devLogin,
        register,
        logout,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin',
        isInfoAdmin: user?.role === 'info_admin',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
