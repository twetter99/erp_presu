import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApi, formatCurrency, formatDate } from '../../hooks/useApi';
import Card, { StatCard } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/Badge';
import { HiArrowLeft, HiCurrencyDollar, HiScale } from 'react-icons/hi';
import api from '../../api/client';
import toast from 'react-hot-toast';

export default function CompraDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: compra, loading, refetch } = useApi<any>(`/compras/${id}`);
  const [comparacion, setComparacion] = useState<any>(null);

  useEffect(() => {
    const fetchComparacion = async () => {
      try {
        const res = await api.get(`/compras/${id}/comparacion`);
        setComparacion(res.data);
      } catch {
        // Comparación no disponible
      }
    };
    if (id) fetchComparacion();
  }, [id]);

  const handleCambiarEstado = async (estado: string) => {
    try {
      await api.patch(`/compras/${id}/estado`, { estado });
      toast.success('Estado actualizado');
      refetch();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al cambiar estado');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!compra) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Solicitud de compra no encontrada</p>
        <Button className="mt-4" onClick={() => navigate('/compras')}>Volver a compras</Button>
      </div>
    );
  }

  const nextStates: Record<string, { label: string; estado: string; variant: 'primary' | 'success' | 'warning' | 'danger' }[]> = {
    PENDIENTE: [{ label: 'Marcar como Pedido', estado: 'PEDIDO', variant: 'primary' }],
    PEDIDO: [
      { label: 'Recibido Parcial', estado: 'RECIBIDO_PARCIAL', variant: 'warning' },
      { label: 'Recibido', estado: 'RECIBIDO', variant: 'success' },
    ],
    RECIBIDO_PARCIAL: [{ label: 'Recibido Completo', estado: 'RECIBIDO', variant: 'success' }],
    RECIBIDO: [{ label: 'Facturado', estado: 'FACTURADO', variant: 'primary' }],
  };

  const totalEstimado = compra.lineas?.reduce((sum: number, l: any) => sum + (l.costeEstimado || 0) * (l.cantidad || 1), 0) || 0;
  const totalReal = compra.lineas?.reduce((sum: number, l: any) => sum + (l.costeReal || 0) * (l.cantidad || 1), 0) || 0;

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Button variant="secondary" onClick={() => navigate('/compras')}>
          <HiArrowLeft className="w-4 h-4" /> Volver
        </Button>
        <div className="flex-1">
          <h1 className="page-title">{compra.codigo}</h1>
          <p className="text-gray-500">
            {compra.proveedor} | {compra.proyecto?.nombre || ''} | {formatDate(compra.fechaSolicitud)}
          </p>
        </div>
        <StatusBadge status={compra.estado} />
      </div>

      {/* Estado actions */}
      {nextStates[compra.estado] && (
        <div className="flex gap-3 mb-6">
          {nextStates[compra.estado].map((action) => (
            <Button key={action.estado} variant={action.variant} onClick={() => handleCambiarEstado(action.estado)}>
              {action.label}
            </Button>
          ))}
          {compra.estado !== 'CANCELADO' && compra.estado !== 'FACTURADO' && (
            <Button variant="danger" onClick={() => handleCambiarEstado('CANCELADO')}>Cancelar</Button>
          )}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard title="Coste Estimado" value={formatCurrency(totalEstimado)} icon={<HiCurrencyDollar className="w-6 h-6" />} color="blue" />
        <StatCard title="Coste Real" value={formatCurrency(totalReal)} icon={<HiCurrencyDollar className="w-6 h-6" />} color={totalReal > totalEstimado ? 'red' : 'green'} />
        <StatCard
          title="Desviación"
          value={formatCurrency(totalReal - totalEstimado)}
          subtitle={totalEstimado > 0 ? `${(((totalReal - totalEstimado) / totalEstimado) * 100).toFixed(1)}%` : '-'}
          icon={<HiScale className="w-6 h-6" />}
          color={totalReal > totalEstimado ? 'red' : 'green'}
        />
      </div>

      {/* Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card title="Información General">
          <div className="space-y-2 text-sm">
            <div><span className="text-gray-500">Código:</span> <span className="font-mono font-medium">{compra.codigo}</span></div>
            <div><span className="text-gray-500">Proveedor:</span> {compra.proveedor}</div>
            <div><span className="text-gray-500">Proyecto:</span> {compra.proyecto?.codigo} - {compra.proyecto?.nombre}</div>
            <div><span className="text-gray-500">Nº Pedido:</span> {compra.numPedido || '-'}</div>
            <div><span className="text-gray-500">Nº Factura:</span> {compra.numFactura || '-'}</div>
          </div>
        </Card>
        <Card title="Fechas">
          <div className="space-y-2 text-sm">
            <div><span className="text-gray-500">Fecha Solicitud:</span> {formatDate(compra.fechaSolicitud)}</div>
            <div><span className="text-gray-500">Fecha Pedido:</span> {compra.fechaPedido ? formatDate(compra.fechaPedido) : '-'}</div>
            <div><span className="text-gray-500">Fecha Recepción:</span> {compra.fechaRecepcion ? formatDate(compra.fechaRecepcion) : '-'}</div>
          </div>
        </Card>
      </div>

      {/* Líneas */}
      <Card title="Líneas de Compra" className="mb-6">
        {compra.lineas && compra.lineas.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="table-header">Material</th>
                  <th className="table-header">Cantidad</th>
                  <th className="table-header">Coste Estimado</th>
                  <th className="table-header">Coste Real</th>
                  <th className="table-header">Total Estimado</th>
                  <th className="table-header">Total Real</th>
                  <th className="table-header">Desviación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {compra.lineas.map((l: any) => {
                  const tEstimado = (l.costeEstimado || 0) * (l.cantidad || 1);
                  const tReal = (l.costeReal || 0) * (l.cantidad || 1);
                  const desviacion = tReal - tEstimado;
                  return (
                    <tr key={l.id}>
                      <td className="table-cell font-medium">{l.material?.descripcion || l.descripcion || '-'}</td>
                      <td className="table-cell">{l.cantidad}</td>
                      <td className="table-cell">{formatCurrency(l.costeEstimado || 0)}</td>
                      <td className="table-cell">{formatCurrency(l.costeReal || 0)}</td>
                      <td className="table-cell">{formatCurrency(tEstimado)}</td>
                      <td className="table-cell">{formatCurrency(tReal)}</td>
                      <td className={`table-cell font-medium ${desviacion > 0 ? 'text-red-600' : desviacion < 0 ? 'text-green-600' : ''}`}>
                        {formatCurrency(desviacion)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-300">
                  <td colSpan={4} className="table-cell font-semibold text-right">Totales:</td>
                  <td className="table-cell font-semibold">{formatCurrency(totalEstimado)}</td>
                  <td className="table-cell font-semibold">{formatCurrency(totalReal)}</td>
                  <td className={`table-cell font-semibold ${totalReal - totalEstimado > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(totalReal - totalEstimado)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-6">No hay líneas de compra</p>
        )}
      </Card>

      {/* Comparación */}
      {comparacion && (
        <Card title="Comparación Presupuesto vs Real" className="mb-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="table-header">Concepto</th>
                  <th className="table-header">Presupuestado</th>
                  <th className="table-header">Real</th>
                  <th className="table-header">Desviación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {comparacion.lineas?.map((l: any, i: number) => (
                  <tr key={i}>
                    <td className="table-cell font-medium">{l.concepto || l.descripcion || '-'}</td>
                    <td className="table-cell">{formatCurrency(l.presupuestado || 0)}</td>
                    <td className="table-cell">{formatCurrency(l.real || 0)}</td>
                    <td className={`table-cell font-medium ${(l.real || 0) - (l.presupuestado || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {formatCurrency((l.real || 0) - (l.presupuestado || 0))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {compra.observaciones && (
        <Card title="Observaciones">
          <p className="text-sm text-gray-700">{compra.observaciones}</p>
        </Card>
      )}
    </div>
  );
}
