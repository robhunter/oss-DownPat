import { BrowserRouter, Routes, Route } from 'react-router-dom';
import '@downpat/ui-components/styles';
import '@downpat/admin-ui/styles';

import { AuthProvider } from './components/AuthProvider';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';

// Pages
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { ExerciseBrowser } from './pages/ExerciseBrowser';
import { Conversation } from './pages/Conversation';
import { AdminDashboard } from './pages/admin/Dashboard';
import { ExerciseListPage } from './pages/admin/ExerciseListPage';
import { ExerciseEditor } from './pages/admin/ExerciseEditor';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<Layout />}>
            {/* Public routes */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />

            {/* Protected routes - Subscribers */}
            <Route
              path="/exercises"
              element={
                <ProtectedRoute>
                  <ExerciseBrowser />
                </ProtectedRoute>
              }
            />
            <Route
              path="/exercises/:slug"
              element={
                <ProtectedRoute>
                  <Conversation />
                </ProtectedRoute>
              }
            />

            {/* Protected routes - Admin only */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/exercises"
              element={
                <ProtectedRoute requireAdmin>
                  <ExerciseListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/exercises/new"
              element={
                <ProtectedRoute requireAdmin>
                  <ExerciseEditor />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/exercises/:slug/edit"
              element={
                <ProtectedRoute requireAdmin>
                  <ExerciseEditor />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/test/:slug"
              element={
                <ProtectedRoute requireAdmin>
                  <Conversation isAdminTest />
                </ProtectedRoute>
              }
            />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
