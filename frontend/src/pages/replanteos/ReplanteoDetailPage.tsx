import { useParams, useNavigate } from 'react-router-dom';
import { useApi, formatDate, formatCurrency } from '../../hooks/useApi';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/Badge';
import { HiArrowLeft, HiClipboardList, HiDocumentText } from 'react-icons/hi';
import api from '../../api/client';
import toast from 'react-hot-toast';

export default function ReplanteoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: replanteo, loading, refetch } = useApi<any>(`/replanteos/${id}`);

  const handleCargarPlantilla = async () => {
    try {
      await api.post(`/replanteos/${id}/cargar-plantilla`);
      toast.success('Plantilla cargada correctamente');
      refetch();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al cargar plantilla');
    }
  };

  const handleCambiarEstado = async (estado: string) => {
    try {
      await api.put(`/replanteos/${id}`, { estado });
      toast.success('Estado actualizado');
      refetch();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al cambiar estado');
    }
  };

  const handleGenerarPresupuesto = async () => {
    try {
      const res = await api.post(`/presupuestos/generar-desde-replanteo/${id}`);
      toast.success('Presupuesto generado correctamente');
      navigate(`/presupuestos/${res.data.id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al generar presupuesto');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!replanteo) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Replanteo no encontrado</p>
        <Button className="mt-4" onClick={() => navigate('/replanteos')}>Volver a replanteos</Button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Button variant="secondary" onClick={() => navigate('/replanteos')}>
          <HiArrowLeft className="w-4 h-4" /> Volver
        </Button>
        <div className="flex-1">
          <h1 className="page-title">Replanteo - {replanteo.proyecto?.nombre || ''}</h1>
          <p className="text-gray-500">{replanteo.cochera?.nombre} | {replanteo.tipoAutobus ? `${replanteo.tipoAutobus.marca} ${replanteo.tipoAutobus.modelo}` : ''}</p>
        </div>
        <StatusBadge status={replanteo.estado} />
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 mb-6">
        {replanteo.estado === 'PENDIENTE' && (
          <>
            <Button onClick={handleCargarPlantilla}>
              <HiClipboardList className="w-4 h-4" /> Cargar Plantilla
            </Button>
            <Button variant="warning" onClick={() => handleCambiarEstado('REVISADO')}>Marcar como Revisado</Button>
          </>
        )}
        {replanteo.estado === 'REVISADO' && (
          <Button variant="success" onClick={() => handleCambiarEstado('VALIDADO')}>Validar Replanteo</Button>
        )}
        {replanteo.estado === 'VALIDADO' && (
          <Button variant="success" onClick={handleGenerarPresupuesto}>
            <HiDocumentText className="w-4 h-4" /> Generar Presupuesto
          </Button>
        )}
        {(replanteo.estado === 'PENDIENTE' || replanteo.estado === 'REVISADO') && (
          <Button variant="danger" onClick={() => handleCambiarEstado('CANCELADO')}>Cancelar</Button>
        )}
      </div>

      {/* Info general */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card title="Información General">
          <div className="space-y-2 text-sm">
            <div><span className="text-gray-500">Proyecto:</span> {replanteo.proyecto?.codigo} - {replanteo.proyecto?.nombre}</div>
            <div><span className="text-gray-500">Cochera:</span> {replanteo.cochera?.nombre}</div>
            <div><span className="text-gray-500">Tipo Autobús:</span> {replanteo.tipoAutobus ? `${replanteo.tipoAutobus.marca} ${replanteo.tipoAutobus.modelo}` : '-'}</div>
            <div><span className="text-gray-500">Nº Buses:</span> {replanteo.numBuses}</div>
            <div><span className="text-gray-500">Fecha:</span> {formatDate(replanteo.fecha)}</div>
            <div><span className="text-gray-500">Técnico:</span> {replanteo.tecnicoResponsable ? `${replanteo.tecnicoResponsable.nombre} ${replanteo.tecnicoResponsable.apellidos}` : '-'}</div>
          </div>
        </Card>
        <Card title="Datos Técnicos">
          <div className="space-y-2 text-sm">
            <div><span className="text-gray-500">Canalizaciones:</span> {replanteo.canalizacionesExistentes || '-'}</div>
            <div><span className="text-gray-500">Espacios:</span> {replanteo.espaciosDisponibles || '-'}</div>
            <div><span className="text-gray-500">Instalación previa:</span> {replanteo.tipoInstalacionPrevia || '-'}</div>
            <div><span className="text-gray-500">Señales:</span> {replanteo.senalesDisponibles || '-'}</div>
            <div><span className="text-gray-500">Sellado techo:</span> {replanteo.necesidadSelladoTecho ? 'Sí' : 'No'}</div>
            <div><span className="text-gray-500">Complejidad:</span> {replanteo.complejidadEspecial || '-'}</div>
          </div>
        </Card>
        <Card title="Observaciones">
          <p className="text-sm text-gray-700">{replanteo.observaciones || 'Sin observaciones'}</p>
        </Card>
      </div>

      {/* Trabajos */}
      <Card title="Trabajos" className="mb-6">
        {replanteo.trabajos && replanteo.trabajos.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="table-header">Trabajo</th>
                  <th className="table-header">Cantidad</th>
                  <th className="table-header">Precio Unit.</th>
                  <th className="table-header">Coste Unit.</th>
                  <th className="table-header">Total Precio</th>
                  <th className="table-header">Total Coste</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {replanteo.trabajos.map((t: any) => (
                  <tr key={t.id}>
                    <td className="table-cell font-medium">{t.trabajo?.nombreComercial || t.nombreComercial || '-'}</td>
                    <td className="table-cell">{t.cantidad}</td>
                    <td className="table-cell">{formatCurrency(t.trabajo?.precioVentaEstandar || 0)}</td>
                    <td className="table-cell">{formatCurrency(t.trabajo?.costeInternoEstandar || 0)}</td>
                    <td className="table-cell">{formatCurrency((t.trabajo?.precioVentaEstandar || 0) * (t.cantidad || 1))}</td>
                    <td className="table-cell">{formatCurrency((t.trabajo?.costeInternoEstandar || 0) * (t.cantidad || 1))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-6">No hay trabajos asignados. Use &quot;Cargar Plantilla&quot; para agregar.</p>
        )}
      </Card>

      {/* Materiales */}
      <Card title="Materiales" className="mb-6">
        {replanteo.materiales && replanteo.materiales.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="table-header">Material</th>
                  <th className="table-header">Cantidad</th>
                  <th className="table-header">Coste Unit.</th>
                  <th className="table-header">Precio Unit.</th>
                  <th className="table-header">Total Coste</th>
                  <th className="table-header">Total Precio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {replanteo.materiales.map((m: any) => (
                  <tr key={m.id}>
                    <td className="table-cell font-medium">{m.material?.descripcion || m.descripcion || '-'}</td>
                    <td className="table-cell">{m.cantidad}</td>
                    <td className="table-cell">{formatCurrency(m.costeUnitario || 0)}</td>
                    <td className="table-cell">{formatCurrency(m.precioUnitario || 0)}</td>
                    <td className="table-cell">{formatCurrency((m.costeUnitario || 0) * (m.cantidad || 1))}</td>
                    <td className="table-cell">{formatCurrency((m.precioUnitario || 0) * (m.cantidad || 1))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-6">No hay materiales asignados.</p>
        )}
      </Card>
    </div>
  );
}
