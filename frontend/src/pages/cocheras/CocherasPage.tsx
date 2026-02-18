import { useState, useEffect } from 'react';
import { useCrud, useApi } from '../../hooks/useApi';
import { Cochera, Empresa } from '../../types';
import DataTable from '../../components/ui/DataTable';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Card from '../../components/ui/Card';
import { HiPlus, HiSearch } from 'react-icons/hi';

export default function CocherasPage() {
  const { items, loading, create, update, remove } = useCrud<Cochera>('/cocheras');
  const { data: empresas } = useApi<Empresa[]>('/empresas');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Cochera | null>(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    nombre: '',
    direccion: '',
    ciudad: '',
    provincia: '',
    responsable: '',
    telefonoResponsable: '',
    horarioAcceso: '',
    observacionesTecnicas: '',
    empresaId: '',
  });

  const filteredItems = items.filter(
    (c) =>
      c.nombre.toLowerCase().includes(search.toLowerCase()) ||
      (c.direccion && c.direccion.toLowerCase().includes(search.toLowerCase()))
  );

  const openCreate = () => {
    setEditing(null);
    setForm({ nombre: '', direccion: '', ciudad: '', provincia: '', responsable: '', telefonoResponsable: '', horarioAcceso: '', observacionesTecnicas: '', empresaId: '' });
    setShowForm(true);
  };

  const openEdit = (cochera: Cochera) => {
    setEditing(cochera);
    setForm({
      nombre: cochera.nombre,
      direccion: cochera.direccion || '',
      ciudad: cochera.ciudad || '',
      provincia: cochera.provincia || '',
      responsable: cochera.responsable || '',
      telefonoResponsable: cochera.telefonoResponsable || '',
      horarioAcceso: cochera.horarioAcceso || '',
      observacionesTecnicas: cochera.observacionesTecnicas || '',
      empresaId: String(cochera.empresaId),
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...form, empresaId: Number(form.empresaId) };
    if (editing) {
      await update(editing.id, payload);
    } else {
      await create(payload);
    }
    setShowForm(false);
  };

  const columns = [
    { key: 'nombre', header: 'Nombre', render: (c: Cochera) => <span className="font-medium">{c.nombre}</span> },
    { key: 'direccion', header: 'Dirección', render: (c: Cochera) => c.direccion || '-' },
    { key: 'ciudad', header: 'Ciudad', render: (c: Cochera) => c.ciudad || '-' },
    { key: 'empresa', header: 'Empresa', render: (c: Cochera) => c.empresa?.nombre || '-' },
    { key: 'responsable', header: 'Responsable', render: (c: Cochera) => c.responsable || '-' },
    { key: 'horarioAcceso', header: 'Horario Acceso', render: (c: Cochera) => c.horarioAcceso || '-' },
    {
      key: 'actions', header: 'Acciones', render: (c: Cochera) => (
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => openEdit(c)}>Editar</Button>
          <Button size="sm" variant="danger" onClick={() => { if (confirm('¿Eliminar cochera?')) remove(c.id); }}>Eliminar</Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title">Cocheras</h1>
        <Button onClick={openCreate}><HiPlus className="w-4 h-4" /> Nueva Cochera</Button>
      </div>

      <Card>
        <div className="mb-4">
          <div className="relative">
            <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por nombre o dirección..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-10"
            />
          </div>
        </div>
        <DataTable columns={columns} data={filteredItems} loading={loading} emptyMessage="No hay cocheras registradas" />
      </Card>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editing ? 'Editar Cochera' : 'Nueva Cochera'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-field">Nombre *</label>
              <input className="input-field" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
            </div>
            <div>
              <label className="label-field">Empresa *</label>
              <select className="input-field" value={form.empresaId} onChange={(e) => setForm({ ...form, empresaId: e.target.value })} required>
                <option value="">Seleccionar empresa</option>
                {(empresas || []).map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.nombre}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="label-field">Dirección *</label>
            <input className="input-field" value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-field">Ciudad</label>
              <input className="input-field" value={form.ciudad} onChange={(e) => setForm({ ...form, ciudad: e.target.value })} />
            </div>
            <div>
              <label className="label-field">Provincia</label>
              <input className="input-field" value={form.provincia} onChange={(e) => setForm({ ...form, provincia: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-field">Responsable</label>
              <input className="input-field" value={form.responsable} onChange={(e) => setForm({ ...form, responsable: e.target.value })} />
            </div>
            <div>
              <label className="label-field">Teléfono Responsable</label>
              <input className="input-field" value={form.telefonoResponsable} onChange={(e) => setForm({ ...form, telefonoResponsable: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label-field">Horario de Acceso</label>
            <input className="input-field" value={form.horarioAcceso} onChange={(e) => setForm({ ...form, horarioAcceso: e.target.value })} />
          </div>
          <div>
            <label className="label-field">Observaciones Técnicas</label>
            <textarea className="input-field" rows={3} value={form.observacionesTecnicas} onChange={(e) => setForm({ ...form, observacionesTecnicas: e.target.value })} />
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
