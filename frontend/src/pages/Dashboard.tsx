import { useApi, formatCurrency, formatPercent } from '../hooks/useApi';
import { StatCard } from '../components/ui/Card';
import { DashboardData } from '../types';
import {
  HiOutlineClipboardList,
  HiOutlineDocumentText,
  HiOutlineAdjustments,
  HiOutlineShoppingCart,
  HiOutlineCurrencyEuro,
  HiOutlineTrendingUp,
} from 'react-icons/hi';

export default function Dashboard() {
  const { data, loading } = useApi<DashboardData>('/control/dashboard');

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="page-title mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Proyectos Activos"
          value={data.proyectos.activos}
          subtitle={`${data.proyectos.total} totales`}
          icon={<HiOutlineClipboardList className="w-6 h-6" />}
          color="blue"
        />
        <StatCard
          title="Presupuestos Pendientes"
          value={data.presupuestos.pendientes}
          subtitle={`${data.presupuestos.aceptados} aceptados`}
          icon={<HiOutlineDocumentText className="w-6 h-6" />}
          color="yellow"
        />
        <StatCard
          title="Órdenes Activas"
          value={data.ordenesTrabajo.activas}
          icon={<HiOutlineAdjustments className="w-6 h-6" />}
          color="purple"
        />
        <StatCard
          title="Compras Pendientes"
          value={data.compras.pendientes}
          icon={<HiOutlineShoppingCart className="w-6 h-6" />}
          color="red"
        />
      </div>

      <h2 className="text-lg font-semibold mb-4">Resumen Financiero</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Facturación Total"
          value={formatCurrency(data.financiero.facturacionTotal)}
          icon={<HiOutlineCurrencyEuro className="w-6 h-6" />}
          color="green"
        />
        <StatCard
          title="Coste Total"
          value={formatCurrency(data.financiero.costeTotal)}
          icon={<HiOutlineCurrencyEuro className="w-6 h-6" />}
          color="red"
        />
        <StatCard
          title="Margen Bruto"
          value={formatCurrency(data.financiero.margenBrutoTotal)}
          icon={<HiOutlineTrendingUp className="w-6 h-6" />}
          color="green"
        />
        <StatCard
          title="Margen Medio"
          value={formatPercent(data.financiero.margenMedioPorcentaje)}
          icon={<HiOutlineTrendingUp className="w-6 h-6" />}
          color="blue"
        />
      </div>
    </div>
  );
}
