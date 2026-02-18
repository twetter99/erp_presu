import { useState, useEffect } from 'react';
import { useApi, formatCurrency, formatPercent } from '../../hooks/useApi';
import { Proyecto } from '../../types';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { HiCurrencyDollar, HiTrendingUp, HiOfficeBuilding, HiTruck, HiUserGroup, HiHome } from 'react-icons/hi';
import api from '../../api/client';

type TabKey = 'proyecto' | 'cliente' | 'autobus' | 'tecnico' | 'cochera';

export default function ControlEconomicoPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('proyecto');
  const { data: proyectos } = useApi<Proyecto[]>('/proyectos');
  const [selectedProyectoId, setSelectedProyectoId] = useState<string>('');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const tabs: { key: TabKey; label: string; icon: any }[] = [
    { key: 'proyecto', label: 'Por Proyecto', icon: HiCurrencyDollar },
    { key: 'cliente', label: 'Por Cliente', icon: HiOfficeBuilding },
    { key: 'autobus', label: 'Por Autobús', icon: HiTruck },
    { key: 'tecnico', label: 'Por Técnico', icon: HiUserGroup },
    { key: 'cochera', label: 'Por Cochera', icon: HiHome },
  ];

  const endpoints: Record<TabKey, string> = {
    proyecto: '/control/proyecto',
    cliente: '/control/rentabilidad/clientes',
    autobus: '/control/rentabilidad/autobuses',
    tecnico: '/control/rentabilidad/tecnicos',
    cochera: '/control/rentabilidad/cocheras',
  };

  useEffect(() => {
    if (activeTab === 'proyecto') {
      setData(null);
      return;
    }
    fetchData(endpoints[activeTab]);
  }, [activeTab]);

  const fetchData = async (url: string) => {
    setLoading(true);
    try {
      const res = await api.get(url);
      setData(res.data);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchProyecto = async () => {
    if (!selectedProyectoId) return;
    setLoading(true);
    try {
      const res = await api.get(`${endpoints.proyecto}/${selectedProyectoId}`);
      setData(res.data);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const marginColor = (margin: number) => {
    if (margin >= 20) return 'text-green-600';
    if (margin >= 10) return 'text-amber-600';
    return 'text-red-600';
  };

  const marginBgColor = (margin: number) => {
    if (margin >= 20) return 'bg-green-50';
    if (margin >= 10) return 'bg-amber-50';
    return 'bg-red-50';
  };

  const renderFinancialTable = (rows: any[], columns: { key: string; header: string; format?: 'currency' | 'percent' | 'text' }[]) => {
    if (!rows || rows.length === 0) {
      return <p className="text-gray-500 text-center py-6">No hay datos disponibles</p>;
    }
    return (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              {columns.map((col) => (
                <th key={col.key} className="table-header">{col.header}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row: any, idx: number) => (
              <tr key={idx} className="hover:bg-gray-50">
                {columns.map((col) => {
                  const value = row[col.key];
                  let display: React.ReactNode = value ?? '-';
                  let className = 'table-cell';

                  if (col.format === 'currency' && typeof value === 'number') {
                    display = formatCurrency(value);
                  } else if (col.format === 'percent' && typeof value === 'number') {
                    display = formatPercent(value);
                    className += ` font-medium ${marginColor(value)}`;
                  } else if (col.key === 'margen' || col.key === 'margenPorcentaje' || col.key === 'margenMedio') {
                    if (typeof value === 'number') {
                      display = formatPercent(value);
                      className += ` font-medium ${marginColor(value)}`;
                    }
                  }

                  return <td key={col.key} className={className}>{display}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderProyectoDetail = () => {
    if (!data) return null;
    return (
      <div className="space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className={`rounded-xl border p-4 ${marginBgColor(data.margenPorcentaje || 0)}`}>
            <p className="text-sm text-gray-500">Facturación</p>
            <p className="text-xl font-bold">{formatCurrency(data.facturacion || data.totalCliente || 0)}</p>
          </div>
          <div className="rounded-xl border bg-gray-50 p-4">
            <p className="text-sm text-gray-500">Coste Total</p>
            <p className="text-xl font-bold">{formatCurrency(data.costeTotal || 0)}</p>
          </div>
          <div className={`rounded-xl border p-4 ${marginBgColor(data.margenPorcentaje || 0)}`}>
            <p className="text-sm text-gray-500">Margen Bruto</p>
            <p className="text-xl font-bold">{formatCurrency(data.margenBruto || 0)}</p>
          </div>
          <div className={`rounded-xl border p-4 ${marginBgColor(data.margenPorcentaje || 0)}`}>
            <p className="text-sm text-gray-500">Margen %</p>
            <p className={`text-xl font-bold ${marginColor(data.margenPorcentaje || 0)}`}>{formatPercent(data.margenPorcentaje || 0)}</p>
          </div>
        </div>

        {/* Desglose */}
        {data.desglose && (
          <Card title="Desglose por Concepto">
            {renderFinancialTable(
              Array.isArray(data.desglose) ? data.desglose : [],
              [
                { key: 'concepto', header: 'Concepto', format: 'text' },
                { key: 'facturacion', header: 'Facturación', format: 'currency' },
                { key: 'coste', header: 'Coste', format: 'currency' },
                { key: 'margen', header: 'Margen', format: 'currency' },
                { key: 'margenPorcentaje', header: 'Margen %', format: 'percent' },
              ]
            )}
          </Card>
        )}

        {/* Presupuestos */}
        {data.presupuestos && (
          <Card title="Presupuestos">
            {renderFinancialTable(
              data.presupuestos,
              [
                { key: 'codigo', header: 'Código', format: 'text' },
                { key: 'estado', header: 'Estado', format: 'text' },
                { key: 'totalCliente', header: 'Total Cliente', format: 'currency' },
                { key: 'costeTotal', header: 'Coste Total', format: 'currency' },
                { key: 'margenPorcentaje', header: 'Margen %', format: 'percent' },
              ]
            )}
          </Card>
        )}

        {/* Compras */}
        {data.compras && (
          <Card title="Compras">
            {renderFinancialTable(
              data.compras,
              [
                { key: 'codigo', header: 'Código', format: 'text' },
                { key: 'proveedor', header: 'Proveedor', format: 'text' },
                { key: 'estimado', header: 'Estimado', format: 'currency' },
                { key: 'real', header: 'Real', format: 'currency' },
                { key: 'desviacion', header: 'Desviación', format: 'currency' },
              ]
            )}
          </Card>
        )}
      </div>
    );
  };

  const renderGenericTab = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      );
    }

    if (!data) return <p className="text-gray-500 text-center py-12">No hay datos disponibles</p>;

    const rows = Array.isArray(data) ? data : data.items || data.data || [];

    const columnsByTab: Record<TabKey, { key: string; header: string; format?: 'currency' | 'percent' | 'text' }[]> = {
      proyecto: [],
      cliente: [
        { key: 'nombre', header: 'Cliente', format: 'text' },
        { key: 'numProyectos', header: 'Proyectos', format: 'text' },
        { key: 'facturacion', header: 'Facturación', format: 'currency' },
        { key: 'coste', header: 'Coste', format: 'currency' },
        { key: 'margenBruto', header: 'Margen Bruto', format: 'currency' },
        { key: 'margenPorcentaje', header: 'Margen %', format: 'percent' },
      ],
      autobus: [
        { key: 'tipo', header: 'Tipo Autobús', format: 'text' },
        { key: 'marca', header: 'Marca', format: 'text' },
        { key: 'modelo', header: 'Modelo', format: 'text' },
        { key: 'numInstalaciones', header: 'Instalaciones', format: 'text' },
        { key: 'facturacion', header: 'Facturación', format: 'currency' },
        { key: 'coste', header: 'Coste', format: 'currency' },
        { key: 'margenMedio', header: 'Margen Medio %', format: 'percent' },
      ],
      tecnico: [
        { key: 'nombre', header: 'Técnico', format: 'text' },
        { key: 'horasEstimadas', header: 'Horas Estimadas', format: 'text' },
        { key: 'horasReales', header: 'Horas Reales', format: 'text' },
        { key: 'eficiencia', header: 'Eficiencia %', format: 'percent' },
        { key: 'numOrdenes', header: 'Órdenes', format: 'text' },
        { key: 'costeTotalHoras', header: 'Coste Horas', format: 'currency' },
      ],
      cochera: [
        { key: 'nombre', header: 'Cochera', format: 'text' },
        { key: 'empresa', header: 'Empresa', format: 'text' },
        { key: 'numInstalaciones', header: 'Instalaciones', format: 'text' },
        { key: 'facturacion', header: 'Facturación', format: 'currency' },
        { key: 'coste', header: 'Coste', format: 'currency' },
        { key: 'margenPorcentaje', header: 'Margen %', format: 'percent' },
      ],
    };

    return (
      <Card>
        {renderFinancialTable(rows, columnsByTab[activeTab] || [])}
      </Card>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title">Control Económico</h1>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-4">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setData(null); }}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Por Proyecto - with selector */}
      {activeTab === 'proyecto' && (
        <div className="space-y-6">
          <Card title="Seleccionar Proyecto">
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="label-field">Proyecto</label>
                <select
                  className="input-field"
                  value={selectedProyectoId}
                  onChange={(e) => setSelectedProyectoId(e.target.value)}
                >
                  <option value="">Seleccionar proyecto...</option>
                  {(proyectos || []).map((p) => (
                    <option key={p.id} value={p.id}>{p.codigo} - {p.nombre}</option>
                  ))}
                </select>
              </div>
              <Button onClick={fetchProyecto} disabled={!selectedProyectoId || loading}>
                {loading ? 'Cargando...' : 'Analizar'}
              </Button>
            </div>
          </Card>
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
            </div>
          )}
          {!loading && data && renderProyectoDetail()}
        </div>
      )}

      {/* Other tabs */}
      {activeTab !== 'proyecto' && renderGenericTab()}
    </div>
  );
}
