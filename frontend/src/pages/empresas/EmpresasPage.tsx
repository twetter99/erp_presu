import { useState } from 'react';
import { useCrud } from '../../hooks/useApi';
import { Empresa } from '../../types';
import DataTable from '../../components/ui/DataTable';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Card from '../../components/ui/Card';
import { HiPlus, HiSearch } from 'react-icons/hi';

export default function EmpresasPage() {
  const { items, loading, create, update, remove } = useCrud<Empresa>('/empresas');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Empresa | null>(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ nombre: '', cif: '', direccion: '', ciudad: '', provincia: '', cp: '', telefono: '', email: '', web: '', notas: '' });

  const filteredItems = items.filter(
    (e) => e.nombre.toLowerCase().includes(search.toLowerCase()) || e.cif.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setEditing(null);
    setForm({ nombre: '', cif: '', direccion: '', ciudad: '', provincia: '', cp: '', telefono: '', email: '', web: '', notas: '' });
    setShowForm(true);
  };

  const openEdit = (empresa: Empresa) => {
    setEditing(empresa);
    setForm({
      nombre: empresa.nombre, cif: empresa.cif, direccion: empresa.direccion || '',
      ciudad: empresa.ciudad || '', provincia: empresa.provincia || '', cp: empresa.cp || '',
      telefono: empresa.telefono || '', email: empresa.email || '', web: empresa.web || '', notas: empresa.notas || '',
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) {
      await update(editing.id, form);
    } else {
      await create(form);
    }
    setShowForm(false);
  };

  const columns = [
    { key: 'nombre', header: 'Nombre', render: (e: Empresa) => <span className="font-medium">{e.nombre}</span> },
    { key: 'cif', header: 'CIF' },
    { key: 'ciudad', header: 'Ciudad', render: (e: Empresa) => e.ciudad || '-' },
    { key: 'telefono', header: 'Teléfono', render: (e: Empresa) => e.telefono || '-' },
    { key: 'email', header: 'Email', render: (e: Empresa) => e.email || '-' },
    { key: '_count', header: 'Cocheras', render: (e: Empresa) => e._count?.cocheras || 0 },
    {
      key: 'actions', header: 'Acciones', render: (e: Empresa) => (
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => openEdit(e)}>Editar</Button>
          <Button size="sm" variant="danger" onClick={() => { if (confirm('¿Desactivar empresa?')) remove(e.id); }}>Desactivar</Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title">Empresas</h1>
        <Button onClick={openCreate}><HiPlus className="w-4 h-4" /> Nueva Empresa</Button>
      </div>

      <Card>
        <div className="mb-4">
          <div className="relative">
            <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por nombre o CIF..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-10"
            />
          </div>
        </div>
        <DataTable columns={columns} data={filteredItems} loading={loading} emptyMessage="No hay empresas registradas" />
      </Card>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editing ? 'Editar Empresa' : 'Nueva Empresa'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-field">Nombre *</label>
              <input className="input-field" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
            </div>
            <div>
              <label className="label-field">CIF *</label>
              <input className="input-field" value={form.cif} onChange={(e) => setForm({ ...form, cif: e.target.value })} required />
            </div>
          </div>
          <div>
            <label className="label-field">Dirección</label>
            <input className="input-field" value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label-field">Ciudad</label>
              <input className="input-field" value={form.ciudad} onChange={(e) => setForm({ ...form, ciudad: e.target.value })} />
            </div>
            <div>
              <label className="label-field">Provincia</label>
              <input className="input-field" value={form.provincia} onChange={(e) => setForm({ ...form, provincia: e.target.value })} />
            </div>
            <div>
              <label className="label-field">C.P.</label>
              <input className="input-field" value={form.cp} onChange={(e) => setForm({ ...form, cp: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label-field">Teléfono</label>
              <input className="input-field" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
            </div>
            <div>
              <label className="label-field">Email</label>
              <input className="input-field" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="label-field">Web</label>
              <input className="input-field" value={form.web} onChange={(e) => setForm({ ...form, web: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label-field">Notas</label>
            <textarea className="input-field" rows={3} value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} />
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
