import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCrud, useApi } from '../../hooks/useApi';
import { Proyecto, Empresa } from '../../types';
import DataTable from '../../components/ui/DataTable';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Card from '../../components/ui/Card';
import { StatusBadge } from '../../components/ui/Badge';
import { HiPlus, HiSearch, HiEye } from 'react-icons/hi';

export default function ProyectosPage() {
  const navigate = useNavigate();
  const { items, loading, create, update, remove } = useCrud<Proyecto>('/proyectos');
  const { data: empresas } = useApi<Empresa[]>('/empresas');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Proyecto | null>(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    nombre: '',
    descripcion: '',
    clienteId: '',
  });

  const filteredItems = items.filter(
    (p) =>
      p.codigo.toLowerCase().includes(search.toLowerCase()) ||
      p.nombre.toLowerCase().includes(search.toLowerCase()) ||
      (p.cliente?.nombre && p.cliente.nombre.toLowerCase().includes(search.toLowerCase()))
  );

  const openCreate = () => {
    setEditing(null);
    setForm({ nombre: '', descripcion: '', clienteId: '' });
    setShowForm(true);
  };

  const openEdit = (proyecto: Proyecto) => {
    setEditing(proyecto);
    setForm({
      nombre: proyecto.nombre,
      descripcion: proyecto.descripcion || '',
      clienteId: String(proyecto.clienteId),
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...form, clienteId: Number(form.clienteId) };
    if (editing) {
      await update(editing.id, payload);
    } else {
      await create(payload);
    }
    setShowForm(false);
  };

  const columns = [
    { key: 'codigo', header: 'Código', render: (p: Proyecto) => <span className="font-medium font-mono">{p.codigo}</span> },
    { key: 'nombre', header: 'Nombre', render: (p: Proyecto) => <span className="font-medium">{p.nombre}</span> },
    { key: 'cliente', header: 'Cliente', render: (p: Proyecto) => p.cliente?.nombre || '-' },
    { key: 'estado', header: 'Estado', render: (p: Proyecto) => <StatusBadge status={p.estado} /> },
    { key: 'replanteos', header: 'Replanteos', render: (p: Proyecto) => p._count?.replanteos || 0 },
    { key: 'presupuestos', header: 'Presupuestos', render: (p: Proyecto) => p._count?.presupuestos || 0 },
    {
      key: 'actions', header: 'Acciones', render: (p: Proyecto) => (
        <div className="flex gap-2">
          <Button size="sm" variant="primary" onClick={() => navigate(`/proyectos/${p.id}`)}><HiEye className="w-4 h-4" /> Ver</Button>
          <Button size="sm" variant="secondary" onClick={() => openEdit(p)}>Editar</Button>
          <Button size="sm" variant="danger" onClick={() => { if (confirm('¿Cancelar proyecto?')) remove(p.id); }}>Cancelar</Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title">Proyectos</h1>
        <Button onClick={openCreate}><HiPlus className="w-4 h-4" /> Nuevo Proyecto</Button>
      </div>

      <Card>
        <div className="mb-4">
          <div className="relative">
            <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por código, nombre o cliente..."
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
          onRowClick={(p) => navigate(`/proyectos/${p.id}`)}
          emptyMessage="No hay proyectos registrados"
        />
      </Card>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editing ? 'Editar Proyecto' : 'Nuevo Proyecto'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-field">Nombre *</label>
              <input className="input-field" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
            </div>
            <div>
              <label className="label-field">Cliente *</label>
              <select className="input-field" value={form.clienteId} onChange={(e) => setForm({ ...form, clienteId: e.target.value })} required>
                <option value="">Seleccionar cliente</option>
                {(empresas || []).map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.nombre}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="label-field">Descripción</label>
            <textarea className="input-field" rows={3} value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button type="submit">{editing ? 'Guardar' : 'Crear'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
