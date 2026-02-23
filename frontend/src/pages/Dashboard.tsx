import { useApi, formatCurrency, formatPercent } from '../hooks/useApi';
import { StatCard } from '../components/ui/Card';
import Card from '../components/ui/Card';
import DataTable from '../components/ui/DataTable';
import { DashboardData, Presupuesto } from '../types';
import {
  HiOutlineDocumentText,
  HiOutlineOfficeBuilding,
  HiOutlineCurrencyDollar,
  HiOutlineExclamation,
} from 'react-icons/hi';
import { StatusBadge } from '../components/ui/Badge';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const navigate = useNavigate();
  const { data, loading } = useApi<DashboardData>('/control/dashboard');
  const { data: presupuestosRecientes, loading: loadingPresupuestos } = useApi<Presupuesto[]>('/presupuestos');

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="page-title">Panel de Control</h1>
        <p className="text-[14px] text-slate-500 mt-1">Una vista general de las operaciones de presupuestos.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Valor de Presupuestos"
          value={formatCurrency(data.financiero.facturacionTotal)}
          subtitle="Importe total estimado"
          icon={<HiOutlineCurrencyDollar className="w-5 h-5" />}
          color="green"
        />
        <StatCard
          title="Proyectos Activos"
          value={data.proyectos.activos}
          subtitle={`${data.proyectos.total} en cartera`}
          icon={<HiOutlineOfficeBuilding className="w-5 h-5" />}
          color="blue"
        />
        <StatCard
          title="Presupuestos Pendientes"
          value={data.presupuestos.pendientes}
          subtitle={`${data.presupuestos.aceptados} aceptados`}
          icon={<HiOutlineDocumentText className="w-5 h-5" />}
          color="yellow"
        />
        <StatCard
          title="Margen Medio"
          value={formatPercent(data.financiero.margenMedioPorcentaje)}
          subtitle={formatCurrency(data.financiero.margenBrutoTotal)}
          icon={<HiOutlineExclamation className="w-5 h-5" />}
          color="red"
        />
      </div>

      <Card title="Presupuestos recientes">
        <DataTable
          loading={loadingPresupuestos}
          data={(presupuestosRecientes || []).slice(0, 8)}
          emptyMessage="No hay presupuestos recientes"
          onRowClick={(item) => navigate(`/presupuestos/${item.id}`)}
          columns={[
            { key: 'codigo', header: 'Código', render: (p: Presupuesto) => <span className="font-medium text-slate-600">{p.codigo}</span> },
            { key: 'cliente', header: 'Cliente', render: (p: Presupuesto) => <span className="font-medium text-slate-800">{p.proyecto?.cliente?.nombre || p.proyecto?.nombre || '-'}</span> },
            { key: 'totalCliente', header: 'Total', className: 'text-right', render: (p: Presupuesto) => <span className="font-semibold text-slate-900">{formatCurrency(p.totalCliente)}</span> },
            { key: 'margen', header: 'Margen', className: 'text-right', render: (p: Presupuesto) => (
              <span className={p.margenPorcentaje >= 20 ? 'text-emerald-600 font-medium' : p.margenPorcentaje >= 10 ? 'text-amber-600 font-medium' : 'text-red-600 font-medium'}>
                {formatPercent(p.margenPorcentaje)}
              </span>
            )},
            { key: 'estado', header: 'Estado', className: 'text-right', render: (p: Presupuesto) => <StatusBadge status={p.estado} /> },
            { key: 'actions', header: '', className: 'text-right w-10', render: () => <span className="text-slate-400 hover:text-slate-600">...</span> }
          ]}
        />
      </Card>
    </div>
  );
}
