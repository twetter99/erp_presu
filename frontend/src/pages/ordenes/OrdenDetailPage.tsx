import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApi, formatDate, formatCurrency } from '../../hooks/useApi';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/Badge';
import { HiArrowLeft, HiCheckCircle, HiPhotograph, HiClipboardCheck } from 'react-icons/hi';
import api from '../../api/client';
import toast from 'react-hot-toast';

export default function OrdenDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: orden, loading, refetch } = useApi<any>(`/ordenes-trabajo/${id}`);
  const [activeTab, setActiveTab] = useState<'info' | 'trabajos' | 'materiales' | 'checklist' | 'fotos'>('info');

  const handleCambiarEstado = async (estado: string) => {
    try {
      await api.patch(`/ordenes-trabajo/${id}/estado`, { estado });
      toast.success('Estado actualizado');
      refetch();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al cambiar estado');
    }
  };

  const handleCargarChecklist = async () => {
    try {
      await api.post(`/ordenes-trabajo/${id}/cargar-checklist`);
      toast.success('Checklist cargado correctamente');
      refetch();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al cargar checklist');
    }
  };

  const handleToggleCheckItem = async (checkId: number, completado: boolean) => {
    try {
      await api.put(`/ordenes-trabajo/${id}/checklist/${checkId}`, { completado });
      refetch();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al actualizar checklist');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!orden) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Orden de trabajo no encontrada</p>
        <Button className="mt-4" onClick={() => navigate('/ordenes-trabajo')}>Volver a órdenes</Button>
      </div>
    );
  }

  const nextStates: Record<string, { label: string; estado: string; variant: 'primary' | 'success' | 'warning' | 'danger' }[]> = {
    PLANIFICADA: [{ label: 'Iniciar', estado: 'EN_CURSO', variant: 'primary' }],
    EN_CURSO: [
      { label: 'Pausar', estado: 'PAUSADA', variant: 'warning' },
      { label: 'Completar', estado: 'COMPLETADA', variant: 'success' },
    ],
    PAUSADA: [{ label: 'Reanudar', estado: 'EN_CURSO', variant: 'primary' }],
  };

  const tabs = [
    { key: 'info', label: 'Información' },
    { key: 'trabajos', label: 'Trabajos' },
    { key: 'materiales', label: 'Materiales' },
    { key: 'checklist', label: 'Checklist' },
    { key: 'fotos', label: 'Fotos' },
  ] as const;

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Button variant="secondary" onClick={() => navigate('/ordenes-trabajo')}>
          <HiArrowLeft className="w-4 h-4" /> Volver
        </Button>
        <div className="flex-1">
          <h1 className="page-title">{orden.codigo}</h1>
          <p className="text-gray-500">{orden.proyecto?.nombre || ''} | {orden.cochera?.nombre || ''}</p>
        </div>
        <StatusBadge status={orden.estado} />
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 mb-6">
        {nextStates[orden.estado]?.map((action) => (
          <Button key={action.estado} variant={action.variant} onClick={() => handleCambiarEstado(action.estado)}>
            {action.label}
          </Button>
        ))}
        {(orden.estado === 'PLANIFICADA' || orden.estado === 'EN_CURSO') && (
          <Button variant="secondary" onClick={handleCargarChecklist}>
            <HiClipboardCheck className="w-4 h-4" /> Cargar Checklist
          </Button>
        )}
        {orden.estado !== 'CANCELADA' && orden.estado !== 'COMPLETADA' && (
          <Button variant="danger" onClick={() => handleCambiarEstado('CANCELADA')}>Cancelar</Button>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-4">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-3 border-b-2 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab: Info */}
      {activeTab === 'info' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card title="Información General">
            <div className="space-y-2 text-sm">
              <div><span className="text-gray-500">Código:</span> <span className="font-mono font-medium">{orden.codigo}</span></div>
              <div><span className="text-gray-500">Proyecto:</span> {orden.proyecto?.codigo} - {orden.proyecto?.nombre}</div>
              <div><span className="text-gray-500">Cochera:</span> {orden.cochera?.nombre || '-'}</div>
              <div><span className="text-gray-500">Acta Firmada:</span> {orden.actaFirmada ? 'Sí' : 'No'}</div>
              {orden.observaciones && <div><span className="text-gray-500">Observaciones:</span> {orden.observaciones}</div>}
            </div>
          </Card>
          <Card title="Fechas">
            <div className="space-y-2 text-sm">
              <div><span className="text-gray-500">Planificada:</span> {orden.fechaPlanificada ? formatDate(orden.fechaPlanificada) : '-'}</div>
              <div><span className="text-gray-500">Inicio:</span> {orden.fechaInicio ? formatDate(orden.fechaInicio) : '-'}</div>
              <div><span className="text-gray-500">Fin:</span> {orden.fechaFin ? formatDate(orden.fechaFin) : '-'}</div>
            </div>
          </Card>

          {/* Técnicos */}
          <Card title="Técnicos Asignados" className="md:col-span-2">
            {orden.tecnicos && orden.tecnicos.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="table-header">Técnico</th>
                      <th className="table-header">Horas Estimadas</th>
                      <th className="table-header">Horas Reales</th>
                      <th className="table-header">Desviación</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {orden.tecnicos.map((t: any) => {
                      const desviacion = (t.horasReales || 0) - (t.horasEstimadas || 0);
                      return (
                        <tr key={t.id}>
                          <td className="table-cell font-medium">{t.tecnico ? `${t.tecnico.nombre} ${t.tecnico.apellidos}` : t.nombre || '-'}</td>
                          <td className="table-cell">{t.horasEstimadas || 0}h</td>
                          <td className="table-cell">{t.horasReales || 0}h</td>
                          <td className={`table-cell font-medium ${desviacion > 0 ? 'text-red-600' : desviacion < 0 ? 'text-green-600' : ''}`}>
                            {desviacion > 0 ? '+' : ''}{desviacion}h
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-6">No hay técnicos asignados</p>
            )}
          </Card>
        </div>
      )}

      {/* Tab: Trabajos */}
      {activeTab === 'trabajos' && (
        <Card title="Líneas de Trabajo">
          {orden.lineas && orden.lineas.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="table-header">Trabajo</th>
                    <th className="table-header">Cantidad</th>
                    <th className="table-header">Horas Estimadas</th>
                    <th className="table-header">Horas Reales</th>
                    <th className="table-header">Completado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {orden.lineas.map((l: any) => (
                    <tr key={l.id}>
                      <td className="table-cell font-medium">{l.trabajo?.nombreComercial || l.descripcion || '-'}</td>
                      <td className="table-cell">{l.cantidad}</td>
                      <td className="table-cell">{l.horasEstimadas || 0}h</td>
                      <td className="table-cell">{l.horasReales || 0}h</td>
                      <td className="table-cell">
                        {l.completado ? (
                          <HiCheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <span className="text-gray-400">Pendiente</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-6">No hay líneas de trabajo</p>
          )}
        </Card>
      )}

      {/* Tab: Materiales */}
      {activeTab === 'materiales' && (
        <Card title="Materiales">
          {orden.materiales && orden.materiales.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="table-header">Material</th>
                    <th className="table-header">Cantidad Estimada</th>
                    <th className="table-header">Cantidad Real</th>
                    <th className="table-header">Coste Estimado</th>
                    <th className="table-header">Coste Real</th>
                    <th className="table-header">Desviación</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {orden.materiales.map((m: any) => {
                    const costEst = (m.cantidadEstimada || 0) * (m.costeUnitario || 0);
                    const costReal = (m.cantidadReal || 0) * (m.costeUnitarioReal || m.costeUnitario || 0);
                    const desviacion = costReal - costEst;
                    return (
                      <tr key={m.id}>
                        <td className="table-cell font-medium">{m.material?.descripcion || m.descripcion || '-'}</td>
                        <td className="table-cell">{m.cantidadEstimada || 0}</td>
                        <td className="table-cell">{m.cantidadReal || 0}</td>
                        <td className="table-cell">{formatCurrency(costEst)}</td>
                        <td className="table-cell">{formatCurrency(costReal)}</td>
                        <td className={`table-cell font-medium ${desviacion > 0 ? 'text-red-600' : desviacion < 0 ? 'text-green-600' : ''}`}>
                          {formatCurrency(desviacion)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-6">No hay materiales registrados</p>
          )}
        </Card>
      )}

      {/* Tab: Checklist */}
      {activeTab === 'checklist' && (
        <Card title="Checklist de Trabajo">
          {orden.checklist && orden.checklist.length > 0 ? (
            <div className="space-y-2">
              {orden.checklist.map((item: any) => (
                <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={item.completado || false}
                    onChange={(e) => handleToggleCheckItem(item.id, e.target.checked)}
                    className="h-5 w-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    disabled={orden.estado === 'COMPLETADA' || orden.estado === 'CANCELADA'}
                  />
                  <div className="flex-1">
                    <span className={`text-sm ${item.completado ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                      {item.descripcion}
                    </span>
                    {item.obligatorio && <span className="ml-2 text-xs text-red-500 font-medium">*Obligatorio</span>}
                  </div>
                  {item.completadoPor && (
                    <span className="text-xs text-gray-400">
                      {item.completadoPor.nombre} - {item.fechaCompletado ? formatDate(item.fechaCompletado) : ''}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-gray-500 mb-3">No hay checklist cargado</p>
              <Button variant="secondary" onClick={handleCargarChecklist}>
                <HiClipboardCheck className="w-4 h-4" /> Cargar Checklist
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* Tab: Fotos */}
      {activeTab === 'fotos' && (
        <Card title="Fotos">
          {orden.fotos && orden.fotos.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {orden.fotos.map((f: any) => (
                <div key={f.id} className="relative group">
                  <img
                    src={f.url}
                    alt={f.descripcion || 'Foto'}
                    className="w-full h-40 object-cover rounded-lg border border-gray-200"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-end p-2">
                    <div className="text-white text-xs">
                      <p className="font-medium">{f.descripcion || 'Sin descripción'}</p>
                      {f.tipo && <p>{f.tipo}</p>}
                      {f.fechaCaptura && <p>{formatDate(f.fechaCaptura)}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <HiPhotograph className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500">No hay fotos registradas</p>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
