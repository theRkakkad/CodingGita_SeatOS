import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Components
import Sidebar from './components/Sidebar';
import InfoSidebar from './components/InfoSidebar';
import HijackLayout from './components/HijackLayout';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import StudentDashboard from './pages/StudentDashboard';
import ClassroomSelect from './pages/ClassroomSelect';
import ClassroomLayoutView from './pages/ClassroomLayoutView';
import MySeat from './pages/MySeat';
import Profile from './pages/Profile';
import AdminDashboard from './pages/AdminDashboard';
import AdminClassroomView from './pages/AdminClassroomView';
import AdminBookings from './pages/AdminBookings';
import AdminStudents from './pages/AdminStudents';
import AdminSearchStudent from './pages/AdminSearchStudent';
import NotFound from './pages/NotFound';
import StudentInfoLogin from './pages/StudentInfoLogin';
import StudentInfoDashboard from './pages/StudentInfoDashboard';
import StudentInfoBookings from './pages/StudentInfoBookings';
import StudentInfoProfile from './pages/StudentInfoProfile';
import SystemHijacking from './pages/SystemHijacking';
import HijackBookings from './pages/HijackBookings';

// Protected Route Guard
const ProtectedRoute = ({ children, adminOnly = false, infoAdminOnly = false }) => {
  const { isAuthenticated, isAdmin, isInfoAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f0f1a' }}>
        <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#f9ca3a', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  if (infoAdminOnly && !isInfoAdmin) {
    return <Navigate to="/studentinfo" replace />;
  }

  return children;
};

// Main Layout Wrapper (Sidebar + Page viewport)
const MainLayout = ({ children }) => {
  return (
    <div className="flex h-screen w-screen overflow-hidden" style={{ background: '#0f0f1a' }}>
      <Sidebar />
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {children}
      </div>
    </div>
  );
};

// Info Layout Wrapper (Info Sidebar + Page viewport)
const InfoLayout = ({ children }) => {
  return (
    <div className="flex h-screen w-screen overflow-hidden" style={{ background: '#0f0f1a' }}>
      <InfoSidebar />
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {children}
      </div>
    </div>
  );
};

const App = () => {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Navigate to="/login" replace />} />
          <Route path="/studentinfo" element={<StudentInfoLogin />} />

          {/* Student Dashboard Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <StudentDashboard />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/book-seat"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <ClassroomSelect />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/book-seat/:classroomId"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <ClassroomLayoutView />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-seat"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <MySeat />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <Profile />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          {/* Admin Dashboard Protected Routes */}
          <Route
            path="/master/dashboard"
            element={
              <ProtectedRoute adminOnly>
                <MainLayout>
                  <AdminDashboard />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/master/classroom/:classroomCode"
            element={
              <ProtectedRoute adminOnly>
                <MainLayout>
                  <AdminClassroomView />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/master/bookings"
            element={
              <ProtectedRoute adminOnly>
                <MainLayout>
                  <AdminBookings />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/master/students"
            element={
              <ProtectedRoute adminOnly>
                <MainLayout>
                  <AdminStudents />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/master/search"
            element={
              <ProtectedRoute adminOnly>
                <MainLayout>
                  <AdminSearchStudent />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          {/* Student Info Portal Protected Routes */}
          <Route
            path="/studentinfo/dashboard"
            element={
              <ProtectedRoute infoAdminOnly>
                <InfoLayout>
                  <StudentInfoDashboard />
                </InfoLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/studentinfo/booked-seats"
            element={
              <ProtectedRoute infoAdminOnly>
                <InfoLayout>
                  <StudentInfoBookings />
                </InfoLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/studentinfo/profile"
            element={
              <ProtectedRoute infoAdminOnly>
                <InfoLayout>
                  <StudentInfoProfile />
                </InfoLayout>
              </ProtectedRoute>
            }
          />

          {/* Secret Hijacked Routes */}
          <Route
            path="/systemhijacking/dashboard"
            element={
              <ProtectedRoute infoAdminOnly>
                <HijackLayout>
                  <StudentInfoDashboard />
                </HijackLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/systemhijacking/booked-seats"
            element={
              <ProtectedRoute infoAdminOnly>
                <HijackLayout>
                  <HijackBookings />
                </HijackLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/systemhijacking/profile"
            element={
              <ProtectedRoute infoAdminOnly>
                <HijackLayout>
                  <StudentInfoProfile />
                </HijackLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/systemhijacking/terminal"
            element={
              <ProtectedRoute infoAdminOnly>
                <HijackLayout>
                  <SystemHijacking />
                </HijackLayout>
              </ProtectedRoute>
            }
          />

          {/* Index Redirects */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* 404 Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
};

export default App;
