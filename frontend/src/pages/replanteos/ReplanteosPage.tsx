import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCrud, useApi, formatDate } from '../../hooks/useApi';
import { Replanteo, Proyecto, Cochera, TipoAutobus, Usuario } from '../../types';
import DataTable from '../../components/ui/DataTable';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Card from '../../components/ui/Card';
import { StatusBadge } from '../../components/ui/Badge';
import { HiPlus, HiSearch, HiEye, HiClipboardList } from 'react-icons/hi';
import api from '../../api/client';
import toast from 'react-hot-toast';

export default function ReplanteosPage() {
  const navigate = useNavigate();
  const { items, loading, create, refetch } = useCrud<Replanteo>('/replanteos');
  const { data: proyectos } = useApi<Proyecto[]>('/proyectos');
  const { data: cocheras } = useApi<Cochera[]>('/cocheras');
  const { data: tiposAutobus } = useApi<TipoAutobus[]>('/autobuses');
  const { data: usuarios } = useApi<Usuario[]>('/auth/usuarios');
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    proyectoId: '',
    cocheraId: '',
    tipoAutobusId: '',
    numBuses: '',
    tecnicoResponsableId: '',
    fecha: new Date().toISOString().split('T')[0],
    canalizacionesExistentes: '',
    espaciosDisponibles: '',
    tipoInstalacionPrevia: '',
    senalesDisponibles: '',
    necesidadSelladoTecho: false,
    complejidadEspecial: '',
    observaciones: '',
  });

  const filteredItems = items.filter(
    (r) =>
      (r.proyecto?.nombre && r.proyecto.nombre.toLowerCase().includes(search.toLowerCase())) ||
      (r.cochera?.nombre && r.cochera.nombre.toLowerCase().includes(search.toLowerCase()))
  );

  const openCreate = () => {
    setForm({
      proyectoId: '', cocheraId: '', tipoAutobusId: '', numBuses: '', tecnicoResponsableId: '',
      fecha: new Date().toISOString().split('T')[0], canalizacionesExistentes: '', espaciosDisponibles: '',
      tipoInstalacionPrevia: '', senalesDisponibles: '', necesidadSelladoTecho: false, complejidadEspecial: '', observaciones: '',
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...form,
      proyectoId: Number(form.proyectoId),
      cocheraId: Number(form.cocheraId),
      tipoAutobusId: Number(form.tipoAutobusId),
      numBuses: Number(form.numBuses),
      tecnicoResponsableId: Number(form.tecnicoResponsableId),
    };
    await create(payload);
    setShowForm(false);
  };

  const handleCargarPlantilla = async (id: number) => {
    try {
      await api.post(`/replanteos/${id}/cargar-plantilla`);
      toast.success('Plantilla cargada correctamente');
      refetch();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al cargar plantilla');
    }
  };

  const handleCambiarEstado = async (id: number, estado: string) => {
    try {
      await api.put(`/replanteos/${id}`, { estado });
      toast.success('Estado actualizado');
      refetch();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al cambiar estado');
    }
  };

  const columns = [
    { key: 'proyecto', header: 'Proyecto', render: (r: Replanteo) => r.proyecto?.nombre || '-' },
    { key: 'cochera', header: 'Cochera', render: (r: Replanteo) => r.cochera?.nombre || '-' },
    { key: 'tipoAutobus', header: 'Tipo Autobús', render: (r: Replanteo) => r.tipoAutobus ? `${r.tipoAutobus.marca} ${r.tipoAutobus.modelo}` : '-' },
    { key: 'numBuses', header: 'Nº Buses' },
    { key: 'estado', header: 'Estado', render: (r: Replanteo) => <StatusBadge status={r.estado} /> },
    { key: 'fecha', header: 'Fecha', render: (r: Replanteo) => formatDate(r.fecha) },
    {
      key: 'actions', header: 'Acciones', render: (r: Replanteo) => (
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="primary" onClick={() => navigate(`/replanteos/${r.id}`)}><HiEye className="w-3 h-3" /></Button>
          {r.estado === 'PENDIENTE' && (
            <>
              <Button size="sm" variant="warning" onClick={() => handleCambiarEstado(r.id, 'REVISADO')}>Revisar</Button>
              <Button size="sm" variant="secondary" onClick={() => handleCargarPlantilla(r.id)}>
                <HiClipboardList className="w-3 h-3" /> Plantilla
              </Button>
            </>
          )}
          {r.estado === 'REVISADO' && (
            <Button size="sm" variant="success" onClick={() => handleCambiarEstado(r.id, 'VALIDADO')}>Validar</Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title">Replanteos</h1>
        <Button onClick={openCreate}><HiPlus className="w-4 h-4" /> Nuevo Replanteo</Button>
      </div>

      <Card>
        <div className="mb-4">
          <div className="relative">
            <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por proyecto o cochera..."
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
          onRowClick={(r) => navigate(`/replanteos/${r.id}`)}
          emptyMessage="No hay replanteos registrados"
        />
      </Card>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Nuevo Replanteo" size="xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-field">Proyecto *</label>
              <select className="input-field" value={form.proyectoId} onChange={(e) => setForm({ ...form, proyectoId: e.target.value })} required>
                <option value="">Seleccionar proyecto</option>
                {(proyectos || []).map((p) => (
                  <option key={p.id} value={p.id}>{p.codigo} - {p.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-field">Cochera *</label>
              <select className="input-field" value={form.cocheraId} onChange={(e) => setForm({ ...form, cocheraId: e.target.value })} required>
                <option value="">Seleccionar cochera</option>
                {(cocheras || []).map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre} ({c.empresa?.nombre || ''})</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label-field">Tipo de Autobús *</label>
              <select className="input-field" value={form.tipoAutobusId} onChange={(e) => setForm({ ...form, tipoAutobusId: e.target.value })} required>
                <option value="">Seleccionar tipo</option>
                {(tiposAutobus || []).map((t) => (
                  <option key={t.id} value={t.id}>{t.marca} {t.modelo}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-field">Nº de Buses *</label>
              <input className="input-field" type="number" min="1" value={form.numBuses} onChange={(e) => setForm({ ...form, numBuses: e.target.value })} required />
            </div>
            <div>
              <label className="label-field">Técnico Responsable *</label>
              <select className="input-field" value={form.tecnicoResponsableId} onChange={(e) => setForm({ ...form, tecnicoResponsableId: e.target.value })} required>
                <option value="">Seleccionar técnico</option>
                {(usuarios || []).map((u) => (
                  <option key={u.id} value={u.id}>{u.nombre} {u.apellidos}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="label-field">Fecha *</label>
            <input className="input-field" type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-field">Canalizaciones Existentes</label>
              <input className="input-field" value={form.canalizacionesExistentes} onChange={(e) => setForm({ ...form, canalizacionesExistentes: e.target.value })} />
            </div>
            <div>
              <label className="label-field">Espacios Disponibles</label>
              <input className="input-field" value={form.espaciosDisponibles} onChange={(e) => setForm({ ...form, espaciosDisponibles: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-field">Tipo Instalación Previa</label>
              <input className="input-field" value={form.tipoInstalacionPrevia} onChange={(e) => setForm({ ...form, tipoInstalacionPrevia: e.target.value })} />
            </div>
            <div>
              <label className="label-field">Señales Disponibles</label>
              <input className="input-field" value={form.senalesDisponibles} onChange={(e) => setForm({ ...form, senalesDisponibles: e.target.value })} />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="necesidadSelladoTecho"
              checked={form.necesidadSelladoTecho}
              onChange={(e) => setForm({ ...form, necesidadSelladoTecho: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <label htmlFor="necesidadSelladoTecho" className="label-field">Necesidad de sellado de techo</label>
          </div>
          <div>
            <label className="label-field">Complejidad Especial</label>
            <input className="input-field" value={form.complejidadEspecial} onChange={(e) => setForm({ ...form, complejidadEspecial: e.target.value })} />
          </div>
          <div>
            <label className="label-field">Observaciones</label>
            <textarea className="input-field" rows={3} value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button type="submit">Crear Replanteo</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
