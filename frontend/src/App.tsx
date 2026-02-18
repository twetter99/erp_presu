import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from './store/authStore';
import Layout from './components/layout/Layout';
import LoginPage from './pages/auth/LoginPage';
import Dashboard from './pages/Dashboard';
import EmpresasPage from './pages/empresas/EmpresasPage';
import CocherasPage from './pages/cocheras/CocherasPage';
import AutobusesPage from './pages/autobuses/AutobusesPage';
import TrabajosPage from './pages/trabajos/TrabajosPage';
import MaterialesPage from './pages/materiales/MaterialesPage';
import ProyectosPage from './pages/proyectos/ProyectosPage';
import ProyectoDetailPage from './pages/proyectos/ProyectoDetailPage';
import ReplanteosPage from './pages/replanteos/ReplanteosPage';
import ReplanteoDetailPage from './pages/replanteos/ReplanteoDetailPage';
import PresupuestosPage from './pages/presupuestos/PresupuestosPage';
import PresupuestoDetailPage from './pages/presupuestos/PresupuestoDetailPage';
import ComprasPage from './pages/compras/ComprasPage';
import CompraDetailPage from './pages/compras/CompraDetailPage';
import OrdenesPage from './pages/ordenes/OrdenesPage';
import OrdenDetailPage from './pages/ordenes/OrdenDetailPage';
import ControlEconomicoPage from './pages/control/ControlEconomicoPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuthStore();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const { initAuth } = useAuthStore();

  useEffect(() => {
    const unsubscribe = initAuth();
    return unsubscribe;
  }, [initAuth]);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="empresas" element={<EmpresasPage />} />
        <Route path="cocheras" element={<CocherasPage />} />
        <Route path="autobuses" element={<AutobusesPage />} />
        <Route path="trabajos" element={<TrabajosPage />} />
        <Route path="materiales" element={<MaterialesPage />} />
        <Route path="proyectos" element={<ProyectosPage />} />
        <Route path="proyectos/:id" element={<ProyectoDetailPage />} />
        <Route path="replanteos" element={<ReplanteosPage />} />
        <Route path="replanteos/:id" element={<ReplanteoDetailPage />} />
        <Route path="presupuestos" element={<PresupuestosPage />} />
        <Route path="presupuestos/:id" element={<PresupuestoDetailPage />} />
        <Route path="compras" element={<ComprasPage />} />
        <Route path="compras/:id" element={<CompraDetailPage />} />
        <Route path="ordenes-trabajo" element={<OrdenesPage />} />
        <Route path="ordenes-trabajo/:id" element={<OrdenDetailPage />} />
        <Route path="control" element={<ControlEconomicoPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
