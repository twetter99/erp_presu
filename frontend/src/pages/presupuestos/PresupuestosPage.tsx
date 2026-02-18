import { useNavigate } from 'react-router-dom';
import { useCrud, formatCurrency } from '../../hooks/useApi';
import { Presupuesto } from '../../types';
import DataTable from '../../components/ui/DataTable';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import { StatusBadge } from '../../components/ui/Badge';
import { HiSearch, HiEye } from 'react-icons/hi';
import { useState } from 'react';

export default function PresupuestosPage() {
  const navigate = useNavigate();
  const { items, loading } = useCrud<Presupuesto>('/presupuestos');
  const [search, setSearch] = useState('');

  const filteredItems = items.filter(
    (p) =>
      p.codigo.toLowerCase().includes(search.toLowerCase()) ||
      (p.proyecto?.cliente?.nombre && p.proyecto.cliente.nombre.toLowerCase().includes(search.toLowerCase()))
  );

  const marginColor = (margin: number) => {
    if (margin >= 20) return 'text-green-600 font-medium';
    if (margin >= 10) return 'text-amber-600 font-medium';
    return 'text-red-600 font-medium';
  };

  const columns = [
    { key: 'codigo', header: 'Código', render: (p: Presupuesto) => <span className="font-medium font-mono">{p.codigo}</span> },
    { key: 'cliente', header: 'Cliente', render: (p: Presupuesto) => p.proyecto?.cliente?.nombre || p.proyecto?.nombre || '-' },
    { key: 'totalCliente', header: 'Total Cliente', render: (p: Presupuesto) => formatCurrency(p.totalCliente) },
    { key: 'costeTotal', header: 'Coste Total', render: (p: Presupuesto) => formatCurrency(p.costeTotal) },
    {
      key: 'margenPorcentaje', header: 'Margen %', render: (p: Presupuesto) => (
        <span className={marginColor(p.margenPorcentaje)}>{p.margenPorcentaje.toFixed(1)}%</span>
      ),
    },
    { key: 'estado', header: 'Estado', render: (p: Presupuesto) => <StatusBadge status={p.estado} /> },
    {
      key: 'actions', header: 'Acciones', render: (p: Presupuesto) => (
        <Button size="sm" variant="primary" onClick={() => navigate(`/presupuestos/${p.id}`)}>
          <HiEye className="w-4 h-4" /> Ver
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title">Presupuestos</h1>
      </div>

      <Card>
        <div className="mb-4">
          <div className="relative">
            <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por código o cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-10"
            />
          </div>
        </div>
        <DataTable
          columns={columns}
          data={filteredItems}
          loading={loading}
          onRowClick={(p) => navigate(`/presupuestos/${p.id}`)}
          emptyMessage="No hay presupuestos registrados"
        />
      </Card>
    </div>
  );
}
