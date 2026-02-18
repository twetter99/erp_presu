import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCrud, formatDate } from '../../hooks/useApi';
import { SolicitudCompra } from '../../types';
import DataTable from '../../components/ui/DataTable';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import { StatusBadge } from '../../components/ui/Badge';
import { HiSearch, HiEye } from 'react-icons/hi';

export default function ComprasPage() {
  const navigate = useNavigate();
  const { items, loading } = useCrud<SolicitudCompra>('/compras');
  const [search, setSearch] = useState('');

  const filteredItems = items.filter(
    (c) =>
      c.codigo.toLowerCase().includes(search.toLowerCase()) ||
      c.proveedor.toLowerCase().includes(search.toLowerCase()) ||
      (c.proyecto?.nombre && c.proyecto.nombre.toLowerCase().includes(search.toLowerCase()))
  );

  const columns = [
    { key: 'codigo', header: 'Código', render: (c: SolicitudCompra) => <span className="font-medium font-mono">{c.codigo}</span> },
    { key: 'proveedor', header: 'Proveedor', render: (c: SolicitudCompra) => <span className="font-medium">{c.proveedor}</span> },
    { key: 'proyecto', header: 'Proyecto', render: (c: SolicitudCompra) => c.proyecto?.nombre || '-' },
    { key: 'estado', header: 'Estado', render: (c: SolicitudCompra) => <StatusBadge status={c.estado} /> },
    { key: 'lineas', header: 'Líneas', render: (c: SolicitudCompra) => c._count?.lineas || 0 },
    { key: 'fecha', header: 'Fecha Solicitud', render: (c: SolicitudCompra) => formatDate(c.fechaSolicitud) },
    {
      key: 'actions', header: 'Acciones', render: (c: SolicitudCompra) => (
        <Button size="sm" variant="primary" onClick={() => navigate(`/compras/${c.id}`)}>
          <HiEye className="w-4 h-4" /> Ver
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title">Solicitudes de Compra</h1>
      </div>

      <Card>
        <div className="mb-4">
          <div className="relative">
            <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por código, proveedor o proyecto..."
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
          onRowClick={(c) => navigate(`/compras/${c.id}`)}
          emptyMessage="No hay solicitudes de compra"
        />
      </Card>
    </div>
  );
}
