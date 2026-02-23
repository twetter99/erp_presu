import { useState } from 'react';
import { useCrud } from '../../hooks/useApi';
import { TipoAutobus, TipoCombustible } from '../../types';
import DataTable from '../../components/ui/DataTable';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { HiPlus, HiSearch } from 'react-icons/hi';

const COMBUSTIBLE_OPTIONS: { value: TipoCombustible; label: string }[] = [
  { value: 'DIESEL', label: 'Diésel' },
  { value: 'HIBRIDO', label: 'Híbrido' },
  { value: 'ELECTRICO', label: 'Eléctrico' },
  { value: 'GAS_NATURAL', label: 'Gas Natural' },
  { value: 'HIDROGENO', label: 'Hidrógeno' },
];

export default function AutobusesPage() {
  const { items, loading, create, update, remove } = useCrud<TipoAutobus>('/autobuses');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<TipoAutobus | null>(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    marca: '',
    modelo: '',
    longitud: '',
    tipoCombustible: 'DIESEL' as TipoCombustible,
    configuracionEspecial: '',
    numPlazas: '',
    notas: '',
  });

  const filteredItems = items.filter(
    (a) =>
      a.marca.toLowerCase().includes(search.toLowerCase()) ||
      a.modelo.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setEditing(null);
    setForm({ marca: '', modelo: '', longitud: '', tipoCombustible: 'DIESEL', configuracionEspecial: '', numPlazas: '', notas: '' });
    setShowForm(true);
  };

  const openEdit = (autobus: TipoAutobus) => {
    setEditing(autobus);
    setForm({
      marca: autobus.marca,
      modelo: autobus.modelo,
      longitud: autobus.longitud ? String(autobus.longitud) : '',
      tipoCombustible: autobus.tipoCombustible,
      configuracionEspecial: autobus.configuracionEspecial || '',
      numPlazas: autobus.numPlazas ? String(autobus.numPlazas) : '',
      notas: autobus.notas || '',
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...form,
      longitud: form.longitud ? Number(form.longitud) : null,
      numPlazas: form.numPlazas ? Number(form.numPlazas) : null,
    };
    if (editing) {
      await update(editing.id, payload);
    } else {
      await create(payload);
    }
    setShowForm(false);
  };

  const combustibleLabel = (tipo: TipoCombustible) =>
    COMBUSTIBLE_OPTIONS.find((o) => o.value === tipo)?.label || tipo;

  const combustibleColor = (tipo: TipoCombustible) => {
    const map: Record<string, 'blue' | 'green' | 'yellow' | 'purple' | 'indigo'> = {
      DIESEL: 'blue',
      HIBRIDO: 'yellow',
      ELECTRICO: 'green',
      GAS_NATURAL: 'purple',
      HIDROGENO: 'indigo',
    };
    return map[tipo] || 'blue';
  };

  const columns = [
    { key: 'marca', header: 'Marca', render: (a: TipoAutobus) => <span className="font-medium">{a.marca}</span> },
    { key: 'modelo', header: 'Modelo' },
    { key: 'longitud', header: 'Longitud (m)', render: (a: TipoAutobus) => a.longitud ? `${a.longitud} m` : '-' },
    { key: 'tipoCombustible', header: 'Combustible', render: (a: TipoAutobus) => <Badge variant={combustibleColor(a.tipoCombustible)}>{combustibleLabel(a.tipoCombustible)}</Badge> },
    { key: 'numPlazas', header: 'Plazas', render: (a: TipoAutobus) => a.numPlazas || '-' },
    { key: 'plantillas', header: 'Plantillas', render: (a: TipoAutobus) => (a._count?.plantillasTrabajos || 0) + (a._count?.plantillasMateriales || 0) },
    {
      key: 'actions', header: 'Acciones', render: (a: TipoAutobus) => (
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => openEdit(a)}>Editar</Button>
          <Button size="sm" variant="danger" onClick={() => { if (confirm('¿Desactivar tipo de autobús?')) remove(a.id); }}>Desactivar</Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title">Tipos de Autobús</h1>
        <Button onClick={openCreate}><HiPlus className="w-4 h-4" /> Nuevo Tipo</Button>
      </div>

      <Card>
        <div className="mb-4">
          <div className="relative">
            <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por marca o modelo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-10"
            />
          </div>
        </div>
        <DataTable columns={columns} data={filteredItems} loading={loading} emptyMessage="No hay tipos de autobús registrados" />
      </Card>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editing ? 'Editar Tipo de Autobús' : 'Nuevo Tipo de Autobús'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-field">Marca *</label>
              <input className="input-field" value={form.marca} onChange={(e) => setForm({ ...form, marca: e.target.value })} required />
            </div>
            <div>
              <label className="label-field">Modelo *</label>
              <input className="input-field" value={form.modelo} onChange={(e) => setForm({ ...form, modelo: e.target.value })} required />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label-field">Longitud (m)</label>
              <input className="input-field" type="number" step="0.1" value={form.longitud} onChange={(e) => setForm({ ...form, longitud: e.target.value })} />
            </div>
            <div>
              <label className="label-field">Combustible *</label>
              <select className="input-field" value={form.tipoCombustible} onChange={(e) => setForm({ ...form, tipoCombustible: e.target.value as TipoCombustible })} required>
                {COMBUSTIBLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-field">Nº Plazas</label>
              <input className="input-field" type="number" value={form.numPlazas} onChange={(e) => setForm({ ...form, numPlazas: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label-field">Configuración Especial</label>
            <input className="input-field" value={form.configuracionEspecial} onChange={(e) => setForm({ ...form, configuracionEspecial: e.target.value })} />
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
