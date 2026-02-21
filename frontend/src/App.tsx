import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, lazy, Suspense } from 'react';
import { useAuthStore } from './store/authStore';

const Layout = lazy(() => import('./components/layout/Layout'));
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const EmpresasPage = lazy(() => import('./pages/empresas/EmpresasPage'));
const CocherasPage = lazy(() => import('./pages/cocheras/CocherasPage'));
const AutobusesPage = lazy(() => import('./pages/autobuses/AutobusesPage'));
const TrabajosPage = lazy(() => import('./pages/trabajos/TrabajosPage'));
const MaterialesPage = lazy(() => import('./pages/materiales/MaterialesPage'));
const ProyectosPage = lazy(() => import('./pages/proyectos/ProyectosPage'));
const ProyectoDetailPage = lazy(() => import('./pages/proyectos/ProyectoDetailPage'));
const ReplanteosPage = lazy(() => import('./pages/replanteos/ReplanteosPage'));
const ReplanteoDetailPage = lazy(() => import('./pages/replanteos/ReplanteoDetailPage'));
const PresupuestosPage = lazy(() => import('./pages/presupuestos/PresupuestosPage'));
const PresupuestoDetailPage = lazy(() => import('./pages/presupuestos/PresupuestoDetailPage'));
const PlantillasOfertaPage = lazy(() => import('./pages/presupuestos/PlantillasOfertaPage'));
const ComprasPage = lazy(() => import('./pages/compras/ComprasPage'));
const CompraDetailPage = lazy(() => import('./pages/compras/CompraDetailPage'));
const OrdenesPage = lazy(() => import('./pages/ordenes/OrdenesPage'));
const OrdenDetailPage = lazy(() => import('./pages/ordenes/OrdenDetailPage'));
const ControlEconomicoPage = lazy(() => import('./pages/control/ControlEconomicoPage'));
const MárgenesPage = lazy(() => import('./pages/margenes/MárgenesPage'));
const AccessDeniedPage = lazy(() => import('./pages/auth/AccessDeniedPage'));

function AppLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
    </div>
  );
}

function ProtectedRoute({ children, allowedProfiles }: { children: React.ReactNode; allowedProfiles?: string[] }) {
  const { isAuthenticated, loading, user } = useAuthStore();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (allowedProfiles && allowedProfiles.length > 0) {
    const profile = user?.perfil;
    if (!profile || !allowedProfiles.includes(profile)) {
      return <Navigate to="/acceso-denegado" replace />;
    }
  }
  return <>{children}</>;
}

export default function App() {
  const { initAuth } = useAuthStore();

  useEffect(() => {
    const unsubscribe = initAuth();
    return unsubscribe;
  }, [initAuth]);

  return (
    <Suspense fallback={<AppLoader />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/acceso-denegado"
          element={
            <ProtectedRoute>
              <AccessDeniedPage />
            </ProtectedRoute>
          }
        />
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
          <Route
            path="presupuestos/plantillas"
            element={
              <ProtectedRoute allowedProfiles={['ADMINISTRADOR', 'DIRECCION']}>
                <PlantillasOfertaPage />
              </ProtectedRoute>
            }
          />
          <Route path="presupuestos/:id" element={<PresupuestoDetailPage />} />
          <Route path="compras" element={<ComprasPage />} />
          <Route path="compras/:id" element={<CompraDetailPage />} />
          <Route path="ordenes-trabajo" element={<OrdenesPage />} />
          <Route path="ordenes-trabajo/:id" element={<OrdenDetailPage />} />
          <Route path="control" element={<ControlEconomicoPage />} />
          <Route path="margenes" element={<MárgenesPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
