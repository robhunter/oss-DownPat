import { BrowserRouter, Routes, Route } from 'react-router-dom';
import '@downpat/ui-components/styles';
import '@downpat/admin-ui/styles';
import { DownpatRoutes } from '@downpat/react';

import { AuthProvider, TOKEN_KEY } from './components/AuthProvider';
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
              // Read from localStorage directly to avoid race condition with React state.
              // localStorage is populated immediately on login, while React state
              // requires effect execution which may lag behind initial API requests.
              getAuthToken={() => localStorage.getItem(TOKEN_KEY)}
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
