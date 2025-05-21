import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/layouts/MainLayout';
import Loading from './components/Loading';
import { useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { AnnouncerProvider } from './components/common/Announcer';
import { AccessibilityProvider } from './components/common/AccessibilitySettings';
import './styles/accessibility.css';

// Lazy loading de páginas
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const NotFound = lazy(() => import('./pages/NotFound'));
const ComponentDemo = lazy(() => import('./pages/ComponentDemo'));

interface PrivateRouteProps {
  children: React.ReactNode;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const { signed, loading } = useAuth();

  if (loading) {
    return <Loading />;
  }

  if (!signed) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <AccessibilityProvider>
      <AnnouncerProvider>
        <ToastProvider>
          <Suspense fallback={<Loading />}>
            <Routes>
              {/* Rotas públicas */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              
              {/* Rotas protegidas */}
              <Route path="/" element={
                <PrivateRoute>
                  <MainLayout />
                </PrivateRoute>
              }>              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="components" element={<ComponentDemo />} />
              {/* Adicionar mais rotas protegidas aqui */}
              </Route>
              
              {/* Rota para páginas não encontradas */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </ToastProvider>
      </AnnouncerProvider>
    </AccessibilityProvider>
  );
};

export default App;
