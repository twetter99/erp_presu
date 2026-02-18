import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApi, formatDate } from '../../hooks/useApi';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/Badge';
import { HiArrowLeft, HiClipboardList, HiDocumentText, HiTruck, HiOfficeBuilding } from 'react-icons/hi';

export default function ProyectoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: proyecto, loading } = useApi<any>(`/proyectos/${id}`);
  const [activeTab, setActiveTab] = useState<'empresas' | 'replanteos' | 'presupuestos' | 'ordenes'>('replanteos');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!proyecto) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Proyecto no encontrado</p>
        <Button className="mt-4" onClick={() => navigate('/proyectos')}>Volver a proyectos</Button>
      </div>
    );
  }

  const tabs = [
    { key: 'empresas', label: 'Empresas', icon: HiOfficeBuilding },
    { key: 'replanteos', label: 'Replanteos', icon: HiClipboardList },
    { key: 'presupuestos', label: 'Presupuestos', icon: HiDocumentText },
    { key: 'ordenes', label: 'Órdenes de Trabajo', icon: HiTruck },
  ] as const;

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Button variant="secondary" onClick={() => navigate('/proyectos')}>
          <HiArrowLeft className="w-4 h-4" /> Volver
        </Button>
        <div>
          <h1 className="page-title">{proyecto.codigo} - {proyecto.nombre}</h1>
          <p className="text-gray-500">{proyecto.cliente?.nombre}</p>
        </div>
        <div className="ml-auto">
          <StatusBadge status={proyecto.estado} />
        </div>
      </div>

      {/* Info del proyecto */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card title="Información General">
          <div className="space-y-2 text-sm">
            <div><span className="text-gray-500">Código:</span> <span className="font-mono font-medium">{proyecto.codigo}</span></div>
            <div><span className="text-gray-500">Nombre:</span> {proyecto.nombre}</div>
            <div><span className="text-gray-500">Cliente:</span> {proyecto.cliente?.nombre || '-'}</div>
            <div><span className="text-gray-500">Comercial:</span> {proyecto.comercial ? `${proyecto.comercial.nombre} ${proyecto.comercial.apellidos}` : '-'}</div>
            {proyecto.descripcion && <div><span className="text-gray-500">Descripción:</span> {proyecto.descripcion}</div>}
          </div>
        </Card>
        <Card title="Fechas">
          <div className="space-y-2 text-sm">
            <div><span className="text-gray-500">Inicio:</span> {proyecto.fechaInicio ? formatDate(proyecto.fechaInicio) : 'Sin definir'}</div>
            <div><span className="text-gray-500">Fin Estimada:</span> {proyecto.fechaFinEstimada ? formatDate(proyecto.fechaFinEstimada) : 'Sin definir'}</div>
            <div><span className="text-gray-500">Fin Real:</span> {proyecto.fechaFinReal ? formatDate(proyecto.fechaFinReal) : '-'}</div>
          </div>
        </Card>
        <Card title="Resumen">
          <div className="space-y-2 text-sm">
            <div><span className="text-gray-500">Replanteos:</span> <span className="font-medium">{proyecto._count?.replanteos || 0}</span></div>
            <div><span className="text-gray-500">Presupuestos:</span> <span className="font-medium">{proyecto._count?.presupuestos || 0}</span></div>
            <div><span className="text-gray-500">Órdenes de Trabajo:</span> <span className="font-medium">{proyecto._count?.ordenesTrabajo || 0}</span></div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-4">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab: Empresas */}
      {activeTab === 'empresas' && (
        <Card title="Empresas Asociadas">
          {proyecto.empresas && proyecto.empresas.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="table-header">Empresa</th>
                    <th className="table-header">Rol</th>
                    <th className="table-header">Contacto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {proyecto.empresas.map((pe: any) => (
                    <tr key={pe.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/empresas`)}>
                      <td className="table-cell font-medium">{pe.empresa?.nombre || '-'}</td>
                      <td className="table-cell"><StatusBadge status={pe.rol} /></td>
                      <td className="table-cell">{pe.contacto ? `${pe.contacto.nombre} - ${pe.contacto.telefono || pe.contacto.email || ''}` : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-6">No hay empresas asociadas</p>
          )}
        </Card>
      )}

      {/* Tab: Replanteos */}
      {activeTab === 'replanteos' && (
        <Card title="Replanteos" actions={<Button size="sm" onClick={() => navigate('/replanteos')}>Ver todos</Button>}>
          {proyecto.replanteos && proyecto.replanteos.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="table-header">Cochera</th>
                    <th className="table-header">Tipo Autobús</th>
                    <th className="table-header">Nº Buses</th>
                    <th className="table-header">Estado</th>
                    <th className="table-header">Fecha</th>
                    <th className="table-header">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {proyecto.replanteos.map((r: any) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="table-cell">{r.cochera?.nombre || '-'}</td>
                      <td className="table-cell">{r.tipoAutobus ? `${r.tipoAutobus.marca} ${r.tipoAutobus.modelo}` : '-'}</td>
                      <td className="table-cell">{r.numBuses}</td>
                      <td className="table-cell"><StatusBadge status={r.estado} /></td>
                      <td className="table-cell">{formatDate(r.fecha)}</td>
                      <td className="table-cell">
                        <Button size="sm" variant="secondary" onClick={() => navigate(`/replanteos/${r.id}`)}>Ver</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-6">No hay replanteos</p>
          )}
        </Card>
      )}

      {/* Tab: Presupuestos */}
      {activeTab === 'presupuestos' && (
        <Card title="Presupuestos" actions={<Button size="sm" onClick={() => navigate('/presupuestos')}>Ver todos</Button>}>
          {proyecto.presupuestos && proyecto.presupuestos.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="table-header">Código</th>
                    <th className="table-header">Estado</th>
                    <th className="table-header">Fecha</th>
                    <th className="table-header">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {proyecto.presupuestos.map((p: any) => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="table-cell font-mono font-medium">{p.codigo}</td>
                      <td className="table-cell"><StatusBadge status={p.estado} /></td>
                      <td className="table-cell">{formatDate(p.fecha)}</td>
                      <td className="table-cell">
                        <Button size="sm" variant="secondary" onClick={() => navigate(`/presupuestos/${p.id}`)}>Ver</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-6">No hay presupuestos</p>
          )}
        </Card>
      )}

      {/* Tab: Órdenes de Trabajo */}
      {activeTab === 'ordenes' && (
        <Card title="Órdenes de Trabajo" actions={<Button size="sm" onClick={() => navigate('/ordenes')}>Ver todas</Button>}>
          {proyecto.ordenesTrabajo && proyecto.ordenesTrabajo.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="table-header">Código</th>
                    <th className="table-header">Cochera</th>
                    <th className="table-header">Estado</th>
                    <th className="table-header">Fecha Planificada</th>
                    <th className="table-header">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {proyecto.ordenesTrabajo.map((ot: any) => (
                    <tr key={ot.id} className="hover:bg-gray-50">
                      <td className="table-cell font-mono font-medium">{ot.codigo}</td>
                      <td className="table-cell">{ot.cochera?.nombre || '-'}</td>
                      <td className="table-cell"><StatusBadge status={ot.estado} /></td>
                      <td className="table-cell">{ot.fechaPlanificada ? formatDate(ot.fechaPlanificada) : '-'}</td>
                      <td className="table-cell">
                        <Button size="sm" variant="secondary" onClick={() => navigate(`/ordenes/${ot.id}`)}>Ver</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-6">No hay órdenes de trabajo</p>
          )}
        </Card>
      )}
    </div>
  );
}
