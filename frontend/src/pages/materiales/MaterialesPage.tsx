import { useState } from 'react';
import { useCrud, formatCurrency } from '../../hooks/useApi';
import { Material, UnidadMaterial } from '../../types';
import DataTable from '../../components/ui/DataTable';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { HiPlus, HiSearch } from 'react-icons/hi';

const UNIDAD_OPTIONS: { value: UnidadMaterial; label: string }[] = [
  { value: 'UNIDAD', label: 'Unidad' },
  { value: 'METRO', label: 'Metro' },
  { value: 'METRO_CUADRADO', label: 'Metro²' },
  { value: 'KILOGRAMO', label: 'Kilogramo' },
  { value: 'LITRO', label: 'Litro' },
  { value: 'ROLLO', label: 'Rollo' },
  { value: 'CAJA', label: 'Caja' },
  { value: 'BOLSA', label: 'Bolsa' },
];

export default function MaterialesPage() {
  const { items, loading, create, update, remove } = useCrud<Material>('/materiales');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Material | null>(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    sku: '',
    descripcion: '',
    categoria: '',
    unidad: 'UNIDAD' as UnidadMaterial,
    proveedorHabitual: '',
    costeMedio: '',
    precioEstandar: '',
  });

  const filteredItems = items.filter(
    (m) =>
      m.sku.toLowerCase().includes(search.toLowerCase()) ||
      m.descripcion.toLowerCase().includes(search.toLowerCase()) ||
      (m.categoria && m.categoria.toLowerCase().includes(search.toLowerCase()))
  );

  const openCreate = () => {
    setEditing(null);
    setForm({ sku: '', descripcion: '', categoria: '', unidad: 'UNIDAD', proveedorHabitual: '', costeMedio: '', precioEstandar: '' });
    setShowForm(true);
  };

  const openEdit = (material: Material) => {
    setEditing(material);
    setForm({
      sku: material.sku,
      descripcion: material.descripcion,
      categoria: material.categoria || '',
      unidad: material.unidad,
      proveedorHabitual: material.proveedorHabitual || '',
      costeMedio: String(material.costeMedio),
      precioEstandar: String(material.precioEstandar),
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...form,
      costeMedio: Number(form.costeMedio),
      precioEstandar: Number(form.precioEstandar),
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
    { key: 'sku', header: 'SKU', render: (m: Material) => <span className="font-medium font-mono">{m.sku}</span> },
    { key: 'descripcion', header: 'Descripción' },
    { key: 'categoria', header: 'Categoría', render: (m: Material) => m.categoria ? <Badge>{m.categoria}</Badge> : '-' },
    { key: 'unidad', header: 'Unidad', render: (m: Material) => UNIDAD_OPTIONS.find((o) => o.value === m.unidad)?.label || m.unidad },
    { key: 'proveedorHabitual', header: 'Proveedor', render: (m: Material) => m.proveedorHabitual || '-' },
    { key: 'costeMedio', header: 'Coste Medio', render: (m: Material) => formatCurrency(m.costeMedio) },
    { key: 'precioEstandar', header: 'Precio Estándar', render: (m: Material) => formatCurrency(m.precioEstandar) },
    {
      key: 'margen', header: 'Margen', render: (m: Material) => {
        const margin = calcMargin(m.precioEstandar, m.costeMedio);
        return <span className={`font-medium ${marginColor(margin)}`}>{margin.toFixed(1)}%</span>;
      },
    },
    {
      key: 'actions', header: 'Acciones', render: (m: Material) => (
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => openEdit(m)}>Editar</Button>
          <Button size="sm" variant="danger" onClick={() => { if (confirm('¿Desactivar material?')) remove(m.id); }}>Desactivar</Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title">Catálogo de Materiales</h1>
        <Button onClick={openCreate}><HiPlus className="w-4 h-4" /> Nuevo Material</Button>
      </div>

      <Card>
        <div className="mb-4">
          <div className="relative">
            <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por SKU, descripción o categoría..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-10"
            />
          </div>
        </div>
        <DataTable columns={columns} data={filteredItems} loading={loading} emptyMessage="No hay materiales registrados" />
      </Card>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editing ? 'Editar Material' : 'Nuevo Material'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-field">SKU *</label>
              <input className="input-field" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} required />
            </div>
            <div>
              <label className="label-field">Categoría</label>
              <input className="input-field" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label-field">Descripción *</label>
            <input className="input-field" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-field">Unidad *</label>
              <select className="input-field" value={form.unidad} onChange={(e) => setForm({ ...form, unidad: e.target.value as UnidadMaterial })} required>
                {UNIDAD_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-field">Proveedor Habitual</label>
              <input className="input-field" value={form.proveedorHabitual} onChange={(e) => setForm({ ...form, proveedorHabitual: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-field">Coste Medio (€) *</label>
              <input className="input-field" type="number" step="0.01" value={form.costeMedio} onChange={(e) => setForm({ ...form, costeMedio: e.target.value })} required />
            </div>
            <div>
              <label className="label-field">Precio Estándar (€) *</label>
              <input className="input-field" type="number" step="0.01" value={form.precioEstandar} onChange={(e) => setForm({ ...form, precioEstandar: e.target.value })} required />
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
