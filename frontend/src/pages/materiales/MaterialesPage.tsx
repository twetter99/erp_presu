import { useEffect, useState } from 'react';
import { useApi, useCrud, formatCurrency } from '../../hooks/useApi';
import { Material, UnidadMaterial } from '../../types';
import DataTable from '../../components/ui/DataTable';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { HiPlus, HiSearch, HiRefresh } from 'react-icons/hi';
import api from '../../api/client';
import toast from 'react-hot-toast';

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

type MaterialesResumen = {
  totalActivos: number;
  totalInactivos: number;
  totalCategorias: number;
  totalProveedores: number;
  totalMateriales: number;
};

export default function MaterialesPage() {
  const { items: materialesActivos, loading, create, update, remove, refetch } = useCrud<Material>('/materiales');
  const { data: materialesInactivosData, loading: loadingInactivos, refetch: refetchInactivos } = useApi<Material[]>('/materiales?activo=false');
  const { data: resumenData, refetch: refetchResumen } = useApi<MaterialesResumen>('/materiales/resumen');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Material | null>(null);
  const [search, setSearch] = useState('');
  const [vista, setVista] = useState<'ACTIVOS' | 'INACTIVOS' | 'TODOS'>('ACTIVOS');
  const { data: categoriasData } = useApi<string[]>(`/materiales/categorias?activo=${vista === 'ACTIVOS' ? 'true' : vista === 'INACTIVOS' ? 'false' : 'all'}`);
  const { data: proveedoresData } = useApi<string[]>(`/materiales/proveedores?activo=${vista === 'ACTIVOS' ? 'true' : vista === 'INACTIVOS' ? 'false' : 'all'}`);
  const [categoriaFiltro, setCategoriaFiltro] = useState('');
  const [proveedorFiltro, setProveedorFiltro] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [accionMaterialId, setAccionMaterialId] = useState<number | null>(null);
  const [accionMaterialTipo, setAccionMaterialTipo] = useState<'DESACTIVAR' | 'REACTIVAR' | null>(null);
  const [form, setForm] = useState({
    sku: '',
    descripcion: '',
    categoria: '',
    unidad: 'UNIDAD' as UnidadMaterial,
    proveedorHabitual: '',
    costeMedio: '',
    precioEstandar: '',
  });

  const materialesInactivos = materialesInactivosData || [];
  const materialesTodos = [...materialesActivos, ...materialesInactivos];

  const materialesSegunVista = vista === 'ACTIVOS'
    ? materialesActivos
    : vista === 'INACTIVOS'
      ? materialesInactivos
      : materialesTodos;

  const filteredItems = materialesSegunVista.filter(
    (m) =>
      m.sku.toLowerCase().includes(search.toLowerCase()) ||
      m.descripcion.toLowerCase().includes(search.toLowerCase()) ||
      (m.categoria && m.categoria.toLowerCase().includes(search.toLowerCase())) ||
      (m.proveedorHabitual && m.proveedorHabitual.toLowerCase().includes(search.toLowerCase()))
  ).filter((m) => !categoriaFiltro || m.categoria === categoriaFiltro)
   .filter((m) => !proveedorFiltro || m.proveedorHabitual === proveedorFiltro);

  const sortedFilteredItems = [...filteredItems].sort((a, b) => a.sku.localeCompare(b.sku));
  const categorias = categoriasData || [];
  const proveedores = proveedoresData || [];
  const resumen = resumenData || {
    totalActivos: materialesActivos.length,
    totalInactivos: materialesInactivos.length,
    totalCategorias: categorias.length,
    totalProveedores: proveedores.length,
    totalMateriales: materialesTodos.length,
  };
  const hayFiltrosActivos = search.trim().length > 0 || categoriaFiltro.length > 0 || proveedorFiltro.length > 0;

  useEffect(() => {
    if (categoriaFiltro && !categorias.includes(categoriaFiltro)) {
      setCategoriaFiltro('');
    }
  }, [categoriaFiltro, categorias]);

  useEffect(() => {
    if (proveedorFiltro && !proveedores.includes(proveedorFiltro)) {
      setProveedorFiltro('');
    }
  }, [proveedorFiltro, proveedores]);

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
    const sku = form.sku.trim().toUpperCase();
    const descripcion = form.descripcion.trim();
    const categoria = form.categoria.trim();
    const proveedorHabitual = form.proveedorHabitual.trim();

    if (!sku) {
      toast.error('El SKU es obligatorio');
      return;
    }

    if (!descripcion) {
      toast.error('La descripción es obligatoria');
      return;
    }

    const costeMedio = Number(form.costeMedio);
    const precioEstandar = Number(form.precioEstandar);

    if (!Number.isFinite(costeMedio) || costeMedio < 0) {
      toast.error('El coste medio debe ser un número válido mayor o igual a 0');
      return;
    }

    if (!Number.isFinite(precioEstandar) || precioEstandar < 0) {
      toast.error('El precio estándar debe ser un número válido mayor o igual a 0');
      return;
    }

    const payload = {
      sku,
      descripcion,
      categoria: categoria || undefined,
      unidad: form.unidad,
      proveedorHabitual: proveedorHabitual || undefined,
      costeMedio,
      precioEstandar,
    };

    let success = false;
    if (editing) {
      const updated = await update(editing.id, payload);
      success = Boolean(updated);
    } else {
      const created = await create(payload);
      success = Boolean(created);
    }

    if (success) {
      setShowForm(false);
      refetchInactivos();
      refetchResumen();
    }
  };

  const marginColor = (margin: number) => {
    if (margin >= 20) return 'text-green-600';
    if (margin >= 10) return 'text-amber-600';
    return 'text-red-600';
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const { data } = await api.post('/materiales/sync');
      setSyncResult(`✅ ${data.message} (${data.total} leídos, ${data.skipped} omitidos)`);
      refetch();
      refetchInactivos();
      refetchResumen();
    } catch (err: any) {
      setSyncResult(`❌ Error: ${err.response?.data?.detail || err.message}`);
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncResult(null), 8000);
    }
  };

  const handleDesactivar = async (material: Material) => {
    const confirmado = confirm(`¿Desactivar material ${material.sku}?`);
    if (!confirmado) return;

    try {
      setAccionMaterialId(material.id);
      setAccionMaterialTipo('DESACTIVAR');
      const ok = await remove(material.id);
      if (ok) {
        refetchInactivos();
        refetchResumen();
      }
    } finally {
      setAccionMaterialId(null);
      setAccionMaterialTipo(null);
    }
  };

  const handleReactivar = async (material: Material) => {
    try {
      setAccionMaterialId(material.id);
      setAccionMaterialTipo('REACTIVAR');
      await api.post(`/materiales/${material.id}/reactivar`);
      toast.success('Material reactivado');
      refetch();
      refetchInactivos();
      refetchResumen();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al reactivar material');
    } finally {
      setAccionMaterialId(null);
      setAccionMaterialTipo(null);
    }
  };

  const columns = [
    { key: 'sku', header: 'SKU', render: (m: Material) => <span className="font-medium font-mono">{m.sku}</span> },
    { key: 'descripcion', header: 'Descripción' },
    { key: 'categoria', header: 'Categoría', render: (m: Material) => m.categoria ? <Badge>{m.categoria}</Badge> : '-' },
    {
      key: 'estado',
      header: 'Estado',
      render: (m: Material) => m.activo ? <Badge variant="green">Activo</Badge> : <Badge variant="gray">Inactivo</Badge>,
    },
    { key: 'unidad', header: 'Unidad', render: (m: Material) => UNIDAD_OPTIONS.find((o) => o.value === m.unidad)?.label || m.unidad },
    { key: 'proveedorHabitual', header: 'Proveedor', render: (m: Material) => m.proveedorHabitual || '-' },
    { key: 'costeMedio', header: 'Coste', render: (m: Material) => formatCurrency(m.costeMedio) },
    { key: 'precioVenta', header: 'P. Venta', render: (m: Material) => m.precioVenta > 0 ? formatCurrency(m.precioVenta) : <span className="text-gray-400">—</span> },
    {
      key: 'margen', header: 'Margen', render: (m: Material) => {
        if (m.precioVenta === 0 || m.costeMedio === 0) return <span className="text-gray-400">—</span>;
        const margin = ((m.precioVenta - m.costeMedio) / m.costeMedio) * 100;
        const isCustom = m.margenPersonalizado !== null && m.margenPersonalizado !== undefined;
        return (
          <span className={`font-medium ${marginColor(margin)} ${isCustom ? 'underline decoration-dotted' : ''}`}
                title={isCustom ? 'Margen individual' : 'Margen de categoría o general'}>
            {margin.toFixed(1)}%
          </span>
        );
      },
    },
    {
      key: 'actions', header: 'Acciones', render: (m: Material) => (
        <div className="flex gap-2">
          {m.activo ? (
            <>
              <Button size="sm" variant="secondary" onClick={() => openEdit(m)} disabled={accionMaterialId === m.id}>Editar</Button>
              <Button size="sm" variant="danger" onClick={() => handleDesactivar(m)} disabled={accionMaterialId === m.id}>
                {accionMaterialId === m.id && accionMaterialTipo === 'DESACTIVAR' ? 'Desactivando...' : 'Desactivar'}
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={() => handleReactivar(m)} disabled={accionMaterialId === m.id}>
              {accionMaterialId === m.id && accionMaterialTipo === 'REACTIVAR' ? 'Reactivando...' : 'Reactivar'}
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title">Catálogo de Materiales</h1>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={handleSync} disabled={syncing}>
            <HiRefresh className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Sincronizando...' : 'Sync OrderFlow'}
          </Button>
          <Button onClick={openCreate}><HiPlus className="w-4 h-4" /> Nuevo Material</Button>
        </div>
      </div>

      {syncResult && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${syncResult.startsWith('✅') ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          {syncResult}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
        <Card>
          <p className="text-xs text-slate-500">Total materiales</p>
          <p className="text-xl font-semibold text-slate-900">{resumen.totalMateriales}</p>
        </Card>
        <Card>
          <p className="text-xs text-slate-500">Activos</p>
          <p className="text-xl font-semibold text-green-700">{resumen.totalActivos}</p>
        </Card>
        <Card>
          <p className="text-xs text-slate-500">Inactivos</p>
          <p className="text-xl font-semibold text-slate-700">{resumen.totalInactivos}</p>
        </Card>
        <Card>
          <p className="text-xs text-slate-500">Categorías</p>
          <p className="text-xl font-semibold text-indigo-700">{resumen.totalCategorias}</p>
        </Card>
        <Card>
          <p className="text-xs text-slate-500">Proveedores</p>
          <p className="text-xl font-semibold text-amber-700">{resumen.totalProveedores}</p>
        </Card>
      </div>

      <Card>
        <div className="mb-4">
          <div className="mb-3 flex flex-wrap gap-2">
            <Button size="sm" variant={vista === 'ACTIVOS' ? 'primary' : 'outline'} onClick={() => setVista('ACTIVOS')}>
              Activos ({materialesActivos.length})
            </Button>
            <Button size="sm" variant={vista === 'INACTIVOS' ? 'warning' : 'outline'} onClick={() => setVista('INACTIVOS')}>
              Inactivos ({materialesInactivos.length})
            </Button>
            <Button size="sm" variant={vista === 'TODOS' ? 'primary' : 'outline'} onClick={() => setVista('TODOS')}>
              Todos ({materialesTodos.length})
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <div className="relative md:col-span-2">
              <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar por SKU, descripción, categoría o proveedor..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field pl-10"
              />
            </div>
            <select
              className="input-field"
              value={categoriaFiltro}
              onChange={(e) => setCategoriaFiltro(e.target.value)}
            >
              <option value="">Todas las categorías</option>
              {categorias.map((categoria) => (
                <option key={categoria} value={categoria}>{categoria}</option>
              ))}
            </select>
            <select
              className="input-field"
              value={proveedorFiltro}
              onChange={(e) => setProveedorFiltro(e.target.value)}
            >
              <option value="">Todos los proveedores</option>
              {proveedores.map((proveedor) => (
                <option key={proveedor} value={proveedor}>{proveedor}</option>
              ))}
            </select>
          </div>
          {hayFiltrosActivos && (
            <div className="mt-2">
              <Button size="sm" variant="outline" onClick={() => { setSearch(''); setCategoriaFiltro(''); setProveedorFiltro(''); }}>
                Limpiar filtros
              </Button>
            </div>
          )}
          {sortedFilteredItems.length === 0 && hayFiltrosActivos && (
            <p className="text-xs text-slate-500 mt-2">No hay materiales para los filtros aplicados.</p>
          )}
        </div>
        <DataTable columns={columns} data={sortedFilteredItems} loading={loading || loadingInactivos} emptyMessage="No hay materiales registrados" />
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
