import { useState } from 'react';
import { useCrud, formatCurrency } from '../../hooks/useApi';
import { Trabajo, UnidadTrabajo } from '../../types';
import DataTable from '../../components/ui/DataTable';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { HiPlus, HiSearch } from 'react-icons/hi';

const UNIDAD_OPTIONS: { value: UnidadTrabajo; label: string }[] = [
  { value: 'POR_BUS', label: 'Por bus' },
  { value: 'POR_HORA', label: 'Por hora' },
  { value: 'POR_VISITA', label: 'Por visita' },
  { value: 'POR_UNIDAD', label: 'Por unidad' },
];

export default function TrabajosPage() {
  const { items, loading, create, update, remove } = useCrud<Trabajo>('/trabajos');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Trabajo | null>(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    codigo: '',
    nombreComercial: '',
    descripcionTecnica: '',
    unidad: 'POR_BUS' as UnidadTrabajo,
    tiempoEstandarHoras: '',
    numTecnicosRequeridos: '',
    precioVentaEstandar: '',
    costeInternoEstandar: '',
    categoria: '',
  });

  const filteredItems = items.filter(
    (t) =>
      t.codigo.toLowerCase().includes(search.toLowerCase()) ||
      t.nombreComercial.toLowerCase().includes(search.toLowerCase()) ||
      (t.categoria && t.categoria.toLowerCase().includes(search.toLowerCase()))
  );

  const openCreate = () => {
    setEditing(null);
    setForm({ codigo: '', nombreComercial: '', descripcionTecnica: '', unidad: 'POR_BUS', tiempoEstandarHoras: '', numTecnicosRequeridos: '', precioVentaEstandar: '', costeInternoEstandar: '', categoria: '' });
    setShowForm(true);
  };

  const openEdit = (trabajo: Trabajo) => {
    setEditing(trabajo);
    setForm({
      codigo: trabajo.codigo,
      nombreComercial: trabajo.nombreComercial,
      descripcionTecnica: trabajo.descripcionTecnica || '',
      unidad: trabajo.unidad,
      tiempoEstandarHoras: String(trabajo.tiempoEstandarHoras),
      numTecnicosRequeridos: String(trabajo.numTecnicosRequeridos),
      precioVentaEstandar: String(trabajo.precioVentaEstandar),
      costeInternoEstandar: String(trabajo.costeInternoEstandar),
      categoria: trabajo.categoria || '',
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...form,
      tiempoEstandarHoras: Number(form.tiempoEstandarHoras),
      numTecnicosRequeridos: Number(form.numTecnicosRequeridos),
      precioVentaEstandar: Number(form.precioVentaEstandar),
      costeInternoEstandar: Number(form.costeInternoEstandar),
    };
    if (editing) {
      await update(editing.id, payload);
    } else {
      await create(payload);
    }
    setShowForm(false);
  };

  const calcMargin = (precio: number, coste: number) => {
    if (precio === 0) return 0;
    return ((precio - coste) / precio) * 100;
  };

  const marginColor = (margin: number) => {
    if (margin >= 20) return 'text-green-600';
    if (margin >= 10) return 'text-amber-600';
    return 'text-red-600';
  };

  const columns = [
    { key: 'codigo', header: 'Código', render: (t: Trabajo) => <span className="font-medium font-mono">{t.codigo}</span> },
    { key: 'nombreComercial', header: 'Nombre Comercial' },
    { key: 'categoria', header: 'Categoría', render: (t: Trabajo) => t.categoria ? <Badge>{t.categoria}</Badge> : '-' },
    { key: 'unidad', header: 'Unidad', render: (t: Trabajo) => UNIDAD_OPTIONS.find((o) => o.value === t.unidad)?.label || t.unidad },
    { key: 'precioVentaEstandar', header: 'Precio Venta', render: (t: Trabajo) => formatCurrency(t.precioVentaEstandar) },
    { key: 'costeInternoEstandar', header: 'Coste Interno', render: (t: Trabajo) => formatCurrency(t.costeInternoEstandar) },
    {
      key: 'margen', header: 'Margen', render: (t: Trabajo) => {
        const m = calcMargin(t.precioVentaEstandar, t.costeInternoEstandar);
        return <span className={`font-medium ${marginColor(m)}`}>{m.toFixed(1)}%</span>;
      },
    },
    { key: 'tiempoEstandarHoras', header: 'Horas', render: (t: Trabajo) => `${t.tiempoEstandarHoras}h` },
    {
      key: 'actions', header: 'Acciones', render: (t: Trabajo) => (
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => openEdit(t)}>Editar</Button>
          <Button size="sm" variant="danger" onClick={() => { if (confirm('¿Desactivar trabajo?')) remove(t.id); }}>Desactivar</Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title">Catálogo de Trabajos</h1>
        <Button onClick={openCreate}><HiPlus className="w-4 h-4" /> Nuevo Trabajo</Button>
      </div>

      <Card>
        <div className="mb-4">
          <div className="relative">
            <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por código, nombre o categoría..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-10"
            />
          </div>
        </div>
        <DataTable columns={columns} data={filteredItems} loading={loading} emptyMessage="No hay trabajos registrados" />
      </Card>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editing ? 'Editar Trabajo' : 'Nuevo Trabajo'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-field">Código *</label>
              <input className="input-field" value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} required />
            </div>
            <div>
              <label className="label-field">Categoría</label>
              <input className="input-field" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label-field">Nombre Comercial *</label>
            <input className="input-field" value={form.nombreComercial} onChange={(e) => setForm({ ...form, nombreComercial: e.target.value })} required />
          </div>
          <div>
            <label className="label-field">Descripción Técnica</label>
            <textarea className="input-field" rows={3} value={form.descripcionTecnica} onChange={(e) => setForm({ ...form, descripcionTecnica: e.target.value })} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label-field">Unidad *</label>
              <select className="input-field" value={form.unidad} onChange={(e) => setForm({ ...form, unidad: e.target.value as UnidadTrabajo })} required>
                {UNIDAD_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-field">Tiempo Estándar (horas) *</label>
              <input className="input-field" type="number" step="0.5" value={form.tiempoEstandarHoras} onChange={(e) => setForm({ ...form, tiempoEstandarHoras: e.target.value })} required />
            </div>
            <div>
              <label className="label-field">Nº Técnicos *</label>
              <input className="input-field" type="number" value={form.numTecnicosRequeridos} onChange={(e) => setForm({ ...form, numTecnicosRequeridos: e.target.value })} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-field">Precio Venta Estándar (€) *</label>
              <input className="input-field" type="number" step="0.01" value={form.precioVentaEstandar} onChange={(e) => setForm({ ...form, precioVentaEstandar: e.target.value })} required />
            </div>
            <div>
              <label className="label-field">Coste Interno Estándar (€) *</label>
              <input className="input-field" type="number" step="0.01" value={form.costeInternoEstandar} onChange={(e) => setForm({ ...form, costeInternoEstandar: e.target.value })} required />
            </div>
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
