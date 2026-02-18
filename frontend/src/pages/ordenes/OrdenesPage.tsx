import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCrud, formatDate } from '../../hooks/useApi';
import { OrdenTrabajo } from '../../types';
import DataTable from '../../components/ui/DataTable';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import { StatusBadge } from '../../components/ui/Badge';
import { HiSearch, HiEye } from 'react-icons/hi';

export default function OrdenesPage() {
  const navigate = useNavigate();
  const { items, loading } = useCrud<OrdenTrabajo>('/ordenes-trabajo');
  const [search, setSearch] = useState('');

  const filteredItems = items.filter(
    (o) =>
      o.codigo.toLowerCase().includes(search.toLowerCase()) ||
      (o.proyecto?.nombre && o.proyecto.nombre.toLowerCase().includes(search.toLowerCase())) ||
      (o.cochera?.nombre && o.cochera.nombre.toLowerCase().includes(search.toLowerCase()))
  );

  const columns = [
    { key: 'codigo', header: 'Código', render: (o: OrdenTrabajo) => <span className="font-medium font-mono">{o.codigo}</span> },
    { key: 'proyecto', header: 'Proyecto', render: (o: OrdenTrabajo) => o.proyecto?.nombre || '-' },
    { key: 'cochera', header: 'Cochera', render: (o: OrdenTrabajo) => o.cochera?.nombre || '-' },
    { key: 'estado', header: 'Estado', render: (o: OrdenTrabajo) => <StatusBadge status={o.estado} /> },
    { key: 'tecnicos', header: 'Técnicos', render: (o: OrdenTrabajo) => o._count?.tecnicos || 0 },
    { key: 'fechaPlanificada', header: 'Fecha Planificada', render: (o: OrdenTrabajo) => o.fechaPlanificada ? formatDate(o.fechaPlanificada) : '-' },
    {
      key: 'actions', header: 'Acciones', render: (o: OrdenTrabajo) => (
        <Button size="sm" variant="primary" onClick={() => navigate(`/ordenes-trabajo/${o.id}`)}>
          <HiEye className="w-4 h-4" /> Ver
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title">Órdenes de Trabajo</h1>
      </div>

      <Card>
        <div className="mb-4">
          <div className="relative">
            <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por código, proyecto o cochera..."
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
          onRowClick={(o) => navigate(`/ordenes-trabajo/${o.id}`)}
          emptyMessage="No hay órdenes de trabajo"
        />
      </Card>
    </div>
  );
}
