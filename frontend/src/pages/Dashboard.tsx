import { useApi, formatCurrency, formatPercent } from '../hooks/useApi';
import { StatCard } from '../components/ui/Card';
import Card from '../components/ui/Card';
import DataTable from '../components/ui/DataTable';
import GaugeChart from '../components/ui/GaugeChart';
import MiniChart from '../components/ui/MiniChart';
import ProgressBar from '../components/ui/ProgressBar';
import { DashboardData, Presupuesto } from '../types';
import {
  DollarSign,
  FolderKanban,
  FileText,
  TrendingUp,
} from 'lucide-react';
import { StatusBadge } from '../components/ui/Badge';
import { useNavigate } from 'react-router-dom';

// Synthetic sparkline data for demo
const sparkRevenue = Array.from({ length: 12 }, (_, i) => ({ value: 30000 + Math.random() * 50000 + i * 5000 }));
const sparkProjects = Array.from({ length: 12 }, (_, i) => ({ value: 3 + Math.floor(Math.random() * 5) + Math.floor(i / 3) }));

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

  // Compute a "commercial health" score (0-100) from margin and acceptance rate
  const margen = data.financiero.margenMedioPorcentaje || 0;
  const aceptados = data.presupuestos.aceptados || 0;
  const totalPresupuestos = (data.presupuestos.pendientes || 0) + aceptados;
  const acceptanceRate = totalPresupuestos > 0 ? (aceptados / totalPresupuestos) * 100 : 0;
  const healthScore = Math.round(margen * 0.6 + acceptanceRate * 0.4);

  return (
    <div className="flex flex-col gap-6">
      {/* ── KPI Row ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        <StatCard
          title="Valor de Presupuestos"
          value={formatCurrency(data.financiero.facturacionTotal)}
          subtitle="Importe total estimado"
          icon={<DollarSign className="w-5 h-5" />}
          color="green"
          trend={{ value: 12.5, positive: true }}
        />
        <StatCard
          title="Proyectos Activos"
          value={data.proyectos.activos}
          subtitle={`${data.proyectos.total} en cartera`}
          icon={<FolderKanban className="w-5 h-5" />}
          color="blue"
          trend={{ value: 8.3, positive: true }}
        />
        <StatCard
          title="Presupuestos Pendientes"
          value={data.presupuestos.pendientes}
          subtitle={`${data.presupuestos.aceptados} aceptados`}
          icon={<FileText className="w-5 h-5" />}
          color="yellow"
        />
        <StatCard
          title="Margen Medio"
          value={formatPercent(data.financiero.margenMedioPorcentaje)}
          subtitle={formatCurrency(data.financiero.margenBrutoTotal)}
          icon={<TrendingUp className="w-5 h-5" />}
          color="purple"
          trend={{ value: 3.2, positive: margen >= 15 }}
        />
      </div>

      {/* ── Second Row: Gauge + Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Gauge Card */}
        <Card className="flex flex-col items-center justify-center py-8">
          <p className="text-[12px] font-medium text-muted-foreground uppercase tracking-wide mb-4">Salud Comercial</p>
          <GaugeChart
            value={healthScore}
            color={healthScore >= 60 ? '#00D68F' : healthScore >= 40 ? '#FFB800' : '#FF4757'}
            size={200}
          />
          <div className="flex items-center gap-6 mt-5">
            <div className="text-center">
              <p className="text-[20px] font-bold text-foreground">{formatPercent(margen)}</p>
              <p className="text-[11px] text-muted-foreground">Margen</p>
            </div>
            <div className="h-8 w-px bg-white/[0.06]" />
            <div className="text-center">
              <p className="text-[20px] font-bold text-foreground">{Math.round(acceptanceRate)}%</p>
              <p className="text-[11px] text-muted-foreground">Aceptación</p>
            </div>
          </div>
        </Card>

        {/* Revenue trend */}
        <Card title="Tendencia de Facturación">
          <div className="mt-2">
            <MiniChart data={sparkRevenue} color="#6C5CE7" height={100} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <ProgressBar label="Presupuestado" value={75} color="primary" showValue />
            <ProgressBar label="Ejecutado" value={42} color="success" showValue />
          </div>
        </Card>

        {/* Projects summary */}
        <Card title="Actividad de Proyectos">
          <div className="mt-2">
            <MiniChart data={sparkProjects} color="#00D68F" height={100} />
          </div>
          <div className="mt-4 space-y-3">
            <ProgressBar label="En ejecución" value={(data.proyectos.activos / Math.max(data.proyectos.total, 1)) * 100} color="primary" showValue />
            <ProgressBar label="Completados" value={((data.proyectos.total - data.proyectos.activos) / Math.max(data.proyectos.total, 1)) * 100} color="success" showValue />
          </div>
        </Card>
      </div>

      {/* ── Recent Presupuestos ── */}
      <Card title="Presupuestos recientes">
        <DataTable
          loading={loadingPresupuestos}
          data={(presupuestosRecientes || []).slice(0, 8)}
          emptyMessage="No hay presupuestos recientes"
          onRowClick={(item) => navigate(`/presupuestos/${item.id}`)}
          columns={[
            { key: 'codigo', header: 'Código', render: (p: Presupuesto) => <span className="font-medium text-foreground/70">{p.codigo}</span> },
            { key: 'cliente', header: 'Cliente', render: (p: Presupuesto) => <span className="font-medium text-foreground">{p.proyecto?.cliente?.nombre || p.proyecto?.nombre || '-'}</span> },
            { key: 'totalCliente', header: 'Total', className: 'text-right', render: (p: Presupuesto) => <span className="font-semibold text-foreground">{formatCurrency(p.totalCliente)}</span> },
            { key: 'margen', header: 'Margen', className: 'text-right', render: (p: Presupuesto) => (
              <span className={p.margenPorcentaje >= 20 ? 'text-success font-medium' : p.margenPorcentaje >= 10 ? 'text-warning font-medium' : 'text-destructive font-medium'}>
                {formatPercent(p.margenPorcentaje)}
              </span>
            )},
            { key: 'estado', header: 'Estado', className: 'text-right', render: (p: Presupuesto) => <StatusBadge status={p.estado} /> },
          ]}
        />
      </Card>
    </div>
  );
}
