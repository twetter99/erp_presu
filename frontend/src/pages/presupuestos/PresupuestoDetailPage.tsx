import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApi, formatCurrency, formatDate } from '../../hooks/useApi';
import Card, { StatCard } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/Badge';
import { HiArrowLeft, HiCurrencyDollar, HiTrendingUp, HiCash, HiCalculator } from 'react-icons/hi';
import api from '../../api/client';
import toast from 'react-hot-toast';

export default function PresupuestoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: presupuesto, loading, refetch } = useApi<any>(`/presupuestos/${id}`);
  const [vista, setVista] = useState<'cliente' | 'interna'>('cliente');

  const handleCambiarEstado = async (estado: string) => {
    try {
      await api.patch(`/presupuestos/${id}/estado`, { estado });
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

  if (!presupuesto) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Presupuesto no encontrado</p>
        <Button className="mt-4" onClick={() => navigate('/presupuestos')}>Volver a presupuestos</Button>
      </div>
    );
  }

  const marginColor = (margin: number) => {
    if (margin >= 20) return 'green';
    if (margin >= 10) return 'yellow';
    return 'red';
  };

  const marginTextColor = (margin: number) => {
    if (margin >= 20) return 'text-green-600';
    if (margin >= 10) return 'text-amber-600';
    return 'text-red-600';
  };

  const nextStates: Record<string, { label: string; estado: string; variant: 'primary' | 'success' | 'warning' | 'danger' }[]> = {
    BORRADOR: [{ label: 'Enviar', estado: 'ENVIADO', variant: 'primary' }],
    ENVIADO: [
      { label: 'En Negociación', estado: 'NEGOCIACION', variant: 'warning' },
      { label: 'Aceptar', estado: 'ACEPTADO', variant: 'success' },
      { label: 'Rechazar', estado: 'RECHAZADO', variant: 'danger' },
    ],
    NEGOCIACION: [
      { label: 'Aceptar', estado: 'ACEPTADO', variant: 'success' },
      { label: 'Rechazar', estado: 'RECHAZADO', variant: 'danger' },
    ],
  };

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Button variant="secondary" onClick={() => navigate('/presupuestos')}>
          <HiArrowLeft className="w-4 h-4" /> Volver
        </Button>
        <div className="flex-1">
          <h1 className="page-title">{presupuesto.codigo}</h1>
          <p className="text-gray-500">
            {presupuesto.proyecto?.nombre} | {presupuesto.proyecto?.cliente?.nombre || ''} | {formatDate(presupuesto.fecha)}
          </p>
        </div>
        <StatusBadge status={presupuesto.estado} />
      </div>

      {/* Estado actions */}
      {nextStates[presupuesto.estado] && (
        <div className="flex gap-3 mb-6">
          {nextStates[presupuesto.estado].map((action) => (
            <Button key={action.estado} variant={action.variant} onClick={() => handleCambiarEstado(action.estado)}>
              {action.label}
            </Button>
          ))}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Cliente" value={formatCurrency(presupuesto.totalCliente)} icon={<HiCurrencyDollar className="w-6 h-6" />} color="blue" />
        <StatCard title="Coste Total" value={formatCurrency(presupuesto.costeTotal)} icon={<HiCash className="w-6 h-6" />} color="red" />
        <StatCard title="Margen Bruto" value={formatCurrency(presupuesto.margenBruto)} icon={<HiTrendingUp className="w-6 h-6" />} color={marginColor(presupuesto.margenPorcentaje)} />
        <StatCard title="Margen %" value={`${presupuesto.margenPorcentaje.toFixed(1)}%`} icon={<HiCalculator className="w-6 h-6" />} color={marginColor(presupuesto.margenPorcentaje)} />
      </div>

      {/* Tab toggle */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-4">
          <button
            onClick={() => setVista('cliente')}
            className={`px-4 py-3 border-b-2 text-sm font-medium transition-colors ${
              vista === 'cliente' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Vista Cliente
          </button>
          <button
            onClick={() => setVista('interna')}
            className={`px-4 py-3 border-b-2 text-sm font-medium transition-colors ${
              vista === 'interna' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Vista Interna
          </button>
        </nav>
      </div>

      {/* Vista Cliente */}
      {vista === 'cliente' && (
        <div className="space-y-6">
          {/* Líneas de Trabajo */}
          <Card title="Trabajos">
            {presupuesto.lineasTrabajo && presupuesto.lineasTrabajo.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="table-header">Descripción</th>
                      <th className="table-header">Cantidad</th>
                      <th className="table-header">Precio Unitario</th>
                      <th className="table-header">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {presupuesto.lineasTrabajo.map((l: any) => (
                      <tr key={l.id}>
                        <td className="table-cell font-medium">{l.descripcion || l.trabajo?.nombreComercial || '-'}</td>
                        <td className="table-cell">{l.cantidad}</td>
                        <td className="table-cell">{formatCurrency(l.precioUnitarioCliente || l.precioVenta || 0)}</td>
                        <td className="table-cell font-medium">{formatCurrency((l.precioUnitarioCliente || l.precioVenta || 0) * (l.cantidad || 1))}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-300">
                      <td colSpan={3} className="table-cell font-semibold text-right">Total Trabajos:</td>
                      <td className="table-cell font-semibold">{formatCurrency(presupuesto.totalTrabajos)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-6">No hay líneas de trabajo</p>
            )}
          </Card>

          {/* Líneas de Material */}
          <Card title="Materiales">
            {presupuesto.lineasMaterial && presupuesto.lineasMaterial.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="table-header">Descripción</th>
                      <th className="table-header">Cantidad</th>
                      <th className="table-header">Precio Unitario</th>
                      <th className="table-header">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {presupuesto.lineasMaterial.map((l: any) => (
                      <tr key={l.id}>
                        <td className="table-cell font-medium">{l.descripcion || l.material?.descripcion || '-'}</td>
                        <td className="table-cell">{l.cantidad}</td>
                        <td className="table-cell">{formatCurrency(l.precioUnitarioCliente || l.precioEstandar || 0)}</td>
                        <td className="table-cell font-medium">{formatCurrency((l.precioUnitarioCliente || l.precioEstandar || 0) * (l.cantidad || 1))}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-300">
                      <td colSpan={3} className="table-cell font-semibold text-right">Total Materiales:</td>
                      <td className="table-cell font-semibold">{formatCurrency(presupuesto.totalMateriales)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-6">No hay líneas de material</p>
            )}
          </Card>

          {/* Desplazamientos */}
          <Card title="Desplazamientos">
            {presupuesto.lineasDesplazamiento && presupuesto.lineasDesplazamiento.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="table-header">Descripción</th>
                      <th className="table-header">Cantidad</th>
                      <th className="table-header">Precio Unitario</th>
                      <th className="table-header">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {presupuesto.lineasDesplazamiento.map((l: any) => (
                      <tr key={l.id}>
                        <td className="table-cell font-medium">{l.descripcion || '-'}</td>
                        <td className="table-cell">{l.cantidad || l.numViajes || 1}</td>
                        <td className="table-cell">{formatCurrency(l.precioCliente || l.costePorViaje || 0)}</td>
                        <td className="table-cell font-medium">{formatCurrency(l.totalCliente || (l.costePorViaje || 0) * (l.numViajes || 1))}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-300">
                      <td colSpan={3} className="table-cell font-semibold text-right">Total Desplazamientos:</td>
                      <td className="table-cell font-semibold">{formatCurrency(presupuesto.totalDesplazamientos)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-6">No hay desplazamientos</p>
            )}
          </Card>

          {/* Totales */}
          <Card title="Resumen Cliente">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span>Total Trabajos:</span> <span className="font-medium">{formatCurrency(presupuesto.totalTrabajos)}</span></div>
              <div className="flex justify-between"><span>Total Materiales:</span> <span className="font-medium">{formatCurrency(presupuesto.totalMateriales)}</span></div>
              <div className="flex justify-between"><span>Total Desplazamientos:</span> <span className="font-medium">{formatCurrency(presupuesto.totalDesplazamientos)}</span></div>
              {presupuesto.descuentoPorcentaje > 0 && (
                <div className="flex justify-between text-red-600"><span>Descuento ({presupuesto.descuentoPorcentaje}%):</span> <span className="font-medium">-{formatCurrency((presupuesto.totalTrabajos + presupuesto.totalMateriales + presupuesto.totalDesplazamientos) * presupuesto.descuentoPorcentaje / 100)}</span></div>
              )}
              <div className="flex justify-between border-t pt-2 text-lg font-bold"><span>TOTAL:</span> <span>{formatCurrency(presupuesto.totalCliente)}</span></div>
            </div>
          </Card>

          {presupuesto.observacionesCliente && (
            <Card title="Observaciones">
              <p className="text-sm text-gray-700">{presupuesto.observacionesCliente}</p>
            </Card>
          )}
        </div>
      )}

      {/* Vista Interna */}
      {vista === 'interna' && (
        <div className="space-y-6">
          {/* Trabajos con costes */}
          <Card title="Trabajos - Detalle Interno">
            {presupuesto.lineasTrabajo && presupuesto.lineasTrabajo.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="table-header">Descripción</th>
                      <th className="table-header">Cantidad</th>
                      <th className="table-header">Precio Cliente</th>
                      <th className="table-header">Coste Interno</th>
                      <th className="table-header">Total Cliente</th>
                      <th className="table-header">Total Coste</th>
                      <th className="table-header">Margen</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {presupuesto.lineasTrabajo.map((l: any) => {
                      const totalCliente = (l.precioUnitarioCliente || l.precioVenta || 0) * (l.cantidad || 1);
                      const totalCoste = (l.costeUnitario || l.costeInterno || 0) * (l.cantidad || 1);
                      const margin = totalCliente > 0 ? ((totalCliente - totalCoste) / totalCliente * 100) : 0;
                      return (
                        <tr key={l.id}>
                          <td className="table-cell font-medium">{l.descripcion || l.trabajo?.nombreComercial || '-'}</td>
                          <td className="table-cell">{l.cantidad}</td>
                          <td className="table-cell">{formatCurrency(l.precioUnitarioCliente || l.precioVenta || 0)}</td>
                          <td className="table-cell">{formatCurrency(l.costeUnitario || l.costeInterno || 0)}</td>
                          <td className="table-cell">{formatCurrency(totalCliente)}</td>
                          <td className="table-cell">{formatCurrency(totalCoste)}</td>
                          <td className={`table-cell font-medium ${marginTextColor(margin)}`}>{margin.toFixed(1)}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-300">
                      <td colSpan={4} className="table-cell font-semibold text-right">Total Trabajos:</td>
                      <td className="table-cell font-semibold">{formatCurrency(presupuesto.totalTrabajos)}</td>
                      <td className="table-cell font-semibold">{formatCurrency(presupuesto.costeTrabajos)}</td>
                      <td className="table-cell"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-6">No hay líneas de trabajo</p>
            )}
          </Card>

          {/* Materiales con costes */}
          <Card title="Materiales - Detalle Interno">
            {presupuesto.lineasMaterial && presupuesto.lineasMaterial.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="table-header">Descripción</th>
                      <th className="table-header">Cantidad</th>
                      <th className="table-header">Precio Cliente</th>
                      <th className="table-header">Coste Interno</th>
                      <th className="table-header">Total Cliente</th>
                      <th className="table-header">Total Coste</th>
                      <th className="table-header">Margen</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {presupuesto.lineasMaterial.map((l: any) => {
                      const totalCliente = (l.precioUnitarioCliente || l.precioEstandar || 0) * (l.cantidad || 1);
                      const totalCoste = (l.costeUnitario || l.costeMedio || 0) * (l.cantidad || 1);
                      const margin = totalCliente > 0 ? ((totalCliente - totalCoste) / totalCliente * 100) : 0;
                      return (
                        <tr key={l.id}>
                          <td className="table-cell font-medium">{l.descripcion || l.material?.descripcion || '-'}</td>
                          <td className="table-cell">{l.cantidad}</td>
                          <td className="table-cell">{formatCurrency(l.precioUnitarioCliente || l.precioEstandar || 0)}</td>
                          <td className="table-cell">{formatCurrency(l.costeUnitario || l.costeMedio || 0)}</td>
                          <td className="table-cell">{formatCurrency(totalCliente)}</td>
                          <td className="table-cell">{formatCurrency(totalCoste)}</td>
                          <td className={`table-cell font-medium ${marginTextColor(margin)}`}>{margin.toFixed(1)}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-300">
                      <td colSpan={4} className="table-cell font-semibold text-right">Total Materiales:</td>
                      <td className="table-cell font-semibold">{formatCurrency(presupuesto.totalMateriales)}</td>
                      <td className="table-cell font-semibold">{formatCurrency(presupuesto.costeMateriales)}</td>
                      <td className="table-cell"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-6">No hay líneas de material</p>
            )}
          </Card>

          {/* Desplazamientos con costes */}
          <Card title="Desplazamientos - Detalle Interno">
            {presupuesto.lineasDesplazamiento && presupuesto.lineasDesplazamiento.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="table-header">Descripción</th>
                      <th className="table-header">Cantidad</th>
                      <th className="table-header">Precio Cliente</th>
                      <th className="table-header">Coste Interno</th>
                      <th className="table-header">Total Cliente</th>
                      <th className="table-header">Total Coste</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {presupuesto.lineasDesplazamiento.map((l: any) => (
                      <tr key={l.id}>
                        <td className="table-cell font-medium">{l.descripcion || '-'}</td>
                        <td className="table-cell">{l.cantidad || l.numViajes || 1}</td>
                        <td className="table-cell">{formatCurrency(l.precioCliente || l.costePorViaje || 0)}</td>
                        <td className="table-cell">{formatCurrency(l.costeInterno || l.costePorViaje || 0)}</td>
                        <td className="table-cell">{formatCurrency(l.totalCliente || 0)}</td>
                        <td className="table-cell">{formatCurrency(l.totalCoste || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-300">
                      <td colSpan={4} className="table-cell font-semibold text-right">Total Desplazamientos:</td>
                      <td className="table-cell font-semibold">{formatCurrency(presupuesto.totalDesplazamientos)}</td>
                      <td className="table-cell font-semibold">{formatCurrency(presupuesto.costeDesplazamientos)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-6">No hay desplazamientos</p>
            )}
          </Card>

          {/* Resumen interno */}
          <Card title="Resumen Económico Interno">
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-3 gap-4 border-b pb-2">
                <span className="font-medium">Concepto</span>
                <span className="font-medium text-right">Cliente</span>
                <span className="font-medium text-right">Coste</span>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <span>Trabajos</span>
                <span className="text-right">{formatCurrency(presupuesto.totalTrabajos)}</span>
                <span className="text-right">{formatCurrency(presupuesto.costeTrabajos)}</span>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <span>Materiales</span>
                <span className="text-right">{formatCurrency(presupuesto.totalMateriales)}</span>
                <span className="text-right">{formatCurrency(presupuesto.costeMateriales)}</span>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <span>Desplazamientos</span>
                <span className="text-right">{formatCurrency(presupuesto.totalDesplazamientos)}</span>
                <span className="text-right">{formatCurrency(presupuesto.costeDesplazamientos)}</span>
              </div>
              <div className="grid grid-cols-3 gap-4 border-t pt-2 font-bold text-lg">
                <span>TOTAL</span>
                <span className="text-right">{formatCurrency(presupuesto.totalCliente)}</span>
                <span className="text-right">{formatCurrency(presupuesto.costeTotal)}</span>
              </div>
              <div className="grid grid-cols-3 gap-4 border-t pt-2">
                <span className="font-semibold">Margen Bruto</span>
                <span className={`text-right font-bold ${marginTextColor(presupuesto.margenPorcentaje)}`}>{formatCurrency(presupuesto.margenBruto)}</span>
                <span className={`text-right font-bold ${marginTextColor(presupuesto.margenPorcentaje)}`}>{presupuesto.margenPorcentaje.toFixed(1)}%</span>
              </div>
            </div>
          </Card>

          {presupuesto.observacionesInternas && (
            <Card title="Observaciones Internas">
              <p className="text-sm text-gray-700">{presupuesto.observacionesInternas}</p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
