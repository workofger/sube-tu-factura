import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Contexts
import { AdminAuthProvider } from './contexts/AdminAuthContext';

// Pages
import UploadPage from './pages/Upload';
import { Login, Dashboard, Invoices, Reports } from './pages/admin';

// Components
import { ProtectedRoute } from './components/admin';

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
                {/* Redirect /admin to /admin/login */}
                <Route path="" element={<Navigate to="/admin/login" replace />} />
              </Routes>
            </AdminAuthProvider>
          }
        />

        {/* Catch all - redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
