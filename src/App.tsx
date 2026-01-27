import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';

// Contexts
import { AdminAuthProvider } from './contexts/AdminAuthContext';
import { UserAuthProvider } from './contexts/UserAuthContext';

// Admin Pages
import UploadPage from './pages/Upload';
import { Login, Dashboard, Invoices, Reports, Settings, ApiKeys, Users, Projects } from './pages/admin';

// User Portal Pages
import { UserLogin, UserDashboard, UserInvoices, UserProfile, Onboarding } from './pages/user';

// Components
import { ProtectedRoute } from './components/admin';
import UserProtectedRoute from './components/user/UserProtectedRoute';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Upload Page */}
        <Route path="/" element={<UploadPage />} />
        
        {/* Admin Routes - wrapped in AuthProvider */}
        <Route
          path="/admin/*"
          element={
            <AdminAuthProvider>
              <Routes>
                <Route path="login" element={<Login />} />
                <Route
                  path="dashboard"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="invoices"
                  element={
                    <ProtectedRoute>
                      <Invoices />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="reports"
                  element={
                    <ProtectedRoute>
                      <Reports />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="users"
                  element={
                    <ProtectedRoute>
                      <Users />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="settings"
                  element={
                    <ProtectedRoute>
                      <Settings />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="api-keys"
                  element={
                    <ProtectedRoute>
                      <ApiKeys />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="projects"
                  element={
                    <ProtectedRoute>
                      <Projects />
                    </ProtectedRoute>
                  }
                />
                {/* Redirect /admin to /admin/login */}
                <Route path="" element={<Navigate to="/admin/login" replace />} />
              </Routes>
            </AdminAuthProvider>
          }
        />

        {/* User Portal Routes - wrapped in UserAuthProvider */}
        <Route
          path="/portal/*"
          element={
            <UserAuthProvider>
              <Routes>
                <Route path="login" element={<UserLogin />} />
                <Route
                  path="onboarding"
                  element={
                    <UserProtectedRoute>
                      <Onboarding />
                    </UserProtectedRoute>
                  }
                />
                <Route
                  path="dashboard"
                  element={
                    <UserProtectedRoute requiresOnboarding>
                      <UserDashboard />
                    </UserProtectedRoute>
                  }
                />
                <Route
                  path="invoices"
                  element={
                    <UserProtectedRoute requiresOnboarding>
                      <UserInvoices />
                    </UserProtectedRoute>
                  }
                />
                <Route
                  path="profile"
                  element={
                    <UserProtectedRoute requiresOnboarding>
                      <UserProfile />
                    </UserProtectedRoute>
                  }
                />
                {/* Redirect /portal to /portal/login */}
                <Route path="" element={<Navigate to="/portal/login" replace />} />
              </Routes>
            </UserAuthProvider>
          }
        />

        {/* Catch all - redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Analytics />
    </BrowserRouter>
  );
};

export default App;
