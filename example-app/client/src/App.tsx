import { BrowserRouter, Routes, Route } from 'react-router-dom';
import '@downpat/ui-components/styles';
import '@downpat/admin-ui/styles';
import { DownpatRoutes } from '@downpat/react';

import { AuthProvider, useAuth } from './components/AuthProvider';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';

// Pages (app-specific only)
import { Home } from './pages/Home';
import { Login } from './pages/Login';

/**
 * Inner app component that can use auth context.
 * DownpatRoutes is rendered as a catch-all route element.
 */
function AppRoutes() {
  const { token } = useAuth();

  return (
    <Routes>
      <Route element={<Layout />}>
        {/* Public routes (app-specific) */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />

        {/* DownPat routes - catch-all under /downpat namespace */}
        <Route
          path="/downpat/*"
          element={
            <DownpatRoutes
              authWrapper={ProtectedRoute}
              adminAuthWrapper={({ children }) => (
                <ProtectedRoute requireAdmin>{children}</ProtectedRoute>
              )}
              basePath="/downpat"
              getAuthToken={async () => token}
            />
          }
        />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
