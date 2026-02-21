import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApi, formatCurrency, formatDate } from '../../hooks/useApi';
import Card, { StatCard } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/Badge';
import { HiArrowLeft, HiCurrencyDollar, HiTrendingUp, HiCash, HiCalculator, HiDownload, HiEye, HiSave } from 'react-icons/hi';
import api from '../../api/client';
import toast from 'react-hot-toast';
import type { Presupuesto, PresupuestoLineaMotor, BloqueEconomico, EmisionValidacion, PresupuestoVersionesResponse, PresupuestoImpactoAceptacion } from '../../types';

type EditableLineaMotor = {
  bloque: BloqueEconomico;
  codigo: string;
  descripcion: string;
  unidad: string;
  cantidad: number;
  precioUnitario: number;
  costeUnitario: number;
};

type OfertaTemplateCatalog = {
  defaultCode: string;
  templates: Array<{
    codigo: string;
    version: string;
    etiquetas: {
      tituloOferta: string;
    };
  }>;
};

type OfertaModulo = {
  key: string;
  title: string;
  content: string;
  enabled: boolean;
  order: number;
};

type OfertaModulosResponse = {
  presupuestoId: number;
  templateCode: string;
  modules: OfertaModulo[];
};

const BLOQUE_LABELS: Record<BloqueEconomico, string> = {
  A_SUMINISTRO_EQUIPOS: 'A · Suministro de equipos',
  B_MATERIALES_INSTALACION: 'B · Materiales de instalación',
  C_MANO_OBRA: 'C · Mano de obra',
  D_MANTENIMIENTO_1_3: 'D · Mantenimiento (1-3)',
  E_OPCIONALES_4_5: 'E · Opcionales (4-5)',
};

export default function PresupuestoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [templateCode, setTemplateCode] = useState<string>('OFERTA_EMT_360_V2');
  const { data: presupuesto, loading, refetch } = useApi<Presupuesto>(`/presupuestos/${id}`);
  const { data: validacionEmision, refetch: refetchValidacion } = useApi<EmisionValidacion>(`/presupuestos/${id}/validacion-emision`);
  const { data: versionesData, refetch: refetchVersiones } = useApi<PresupuestoVersionesResponse>(`/presupuestos/${id}/versiones`);
  const { data: impactoAceptacion, refetch: refetchImpactoAceptacion } = useApi<PresupuestoImpactoAceptacion>(`/presupuestos/${id}/impacto-aceptacion`);
  const { data: templateCatalog } = useApi<OfertaTemplateCatalog>('/presupuestos/oferta-templates/catalogo');
  const {
    data: ofertaModulosData,
    loading: cargandoModulos,
    refetch: refetchOfertaModulos,
  } = useApi<OfertaModulosResponse>(`/presupuestos/${id}/oferta-modulos`, false);
  const [vista, setVista] = useState<'cliente' | 'interna'>('cliente');
  const [editandoLineaId, setEditandoLineaId] = useState<number | null>(null);
  const [editLinea, setEditLinea] = useState<EditableLineaMotor | null>(null);
  const [nuevaLinea, setNuevaLinea] = useState<EditableLineaMotor>({
    bloque: 'A_SUMINISTRO_EQUIPOS',
    codigo: '',
    descripcion: '',
    unidad: 'UD',
    cantidad: 1,
    precioUnitario: 0,
    costeUnitario: 0,
  });
  const [guardandoLinea, setGuardandoLinea] = useState(false);
  const [procesandoOferta, setProcesandoOferta] = useState(false);
  const [versionando, setVersionando] = useState(false);
  const [abriendoOferta, setAbriendoOferta] = useState(false);
  const [descargandoOferta, setDescargandoOferta] = useState(false);
  const [descargandoPdf, setDescargandoPdf] = useState(false);
  const [cambiandoEstado, setCambiandoEstado] = useState<string | null>(null);
  const [modulosEditables, setModulosEditables] = useState<OfertaModulo[]>([]);
  const [guardandoModulos, setGuardandoModulos] = useState(false);
  const presupuestoBloqueado = ['ACEPTADO', 'RECHAZADO', 'EXPIRADO'].includes(presupuesto?.estado || '');

  useEffect(() => {
    if (templateCatalog?.defaultCode) {
      setTemplateCode(templateCatalog.defaultCode);
    }
  }, [templateCatalog?.defaultCode]);

  useEffect(() => {
    if (!id || !templateCode) return;
    refetchOfertaModulos({ template: templateCode });
  }, [id, templateCode, refetchOfertaModulos]);

  useEffect(() => {
    if (!ofertaModulosData?.modules) return;
    setModulosEditables(ofertaModulosData.modules);
  }, [ofertaModulosData?.modules]);

  const templateParams = templateCode ? `template=${encodeURIComponent(templateCode)}` : '';

  const refetchDetalle = () => {
    refetch();
    refetchValidacion();
    refetchVersiones();
    refetchImpactoAceptacion();
  };

  const handleCambiarEstado = async (estado: string) => {
    try {
      setCambiandoEstado(estado);
      await api.patch(`/presupuestos/${id}/estado`, { estado });
      toast.success('Estado actualizado');
      refetchDetalle();
    } catch (err: any) {
      const apiError = err.response?.data;
      if (err.response?.status === 409 && Array.isArray(apiError?.permitidos)) {
        const permitidos = apiError.permitidos.length > 0 ? apiError.permitidos.join(', ') : 'ninguno';
        toast.error(`${apiError?.error || 'Transición no permitida'} (permitidos: ${permitidos})`);
      } else {
        toast.error(apiError?.error || 'Error al cambiar estado');
      }
    } finally {
      setCambiandoEstado(null);
    }
  };

  const iniciarEdicionLinea = (linea: PresupuestoLineaMotor) => {
    setEditandoLineaId(linea.id);
    setEditLinea({
      bloque: linea.bloque,
      codigo: linea.codigo,
      descripcion: linea.descripcion,
      unidad: linea.unidad,
      cantidad: linea.cantidad,
      precioUnitario: linea.precioUnitario,
      costeUnitario: linea.costeUnitario,
    });
  };

  const cancelarEdicionLinea = () => {
    setEditandoLineaId(null);
    setEditLinea(null);
  };

  const guardarEdicionLinea = async (lineaId: number) => {
    if (!editLinea) return;
    try {
      setGuardandoLinea(true);
      await api.patch(`/presupuestos/${id}/lineas-motor/${lineaId}`, editLinea);
      toast.success('Línea actualizada');
      cancelarEdicionLinea();
      refetchDetalle();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al actualizar línea');
    } finally {
      setGuardandoLinea(false);
    }
  };

  const crearLinea = async () => {
    if (!nuevaLinea.codigo.trim() || !nuevaLinea.descripcion.trim()) {
      toast.error('Código y descripción son obligatorios');
      return;
    }

    try {
      setGuardandoLinea(true);
      await api.post(`/presupuestos/${id}/lineas-motor`, nuevaLinea);
      toast.success('Línea añadida');
      setNuevaLinea({
        bloque: 'A_SUMINISTRO_EQUIPOS',
        codigo: '',
        descripcion: '',
        unidad: 'UD',
        cantidad: 1,
        precioUnitario: 0,
        costeUnitario: 0,
      });
      refetchDetalle();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al crear línea');
    } finally {
      setGuardandoLinea(false);
    }
  };

  const eliminarLinea = async (lineaId: number) => {
    const confirmado = window.confirm('¿Eliminar esta línea? Esta acción no se puede deshacer.');
    if (!confirmado) return;

    try {
      setGuardandoLinea(true);
      await api.delete(`/presupuestos/${id}/lineas-motor/${lineaId}`);
      toast.success('Línea eliminada');
      refetchDetalle();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al eliminar línea');
    } finally {
      setGuardandoLinea(false);
    }
  };

  const recalcularPresupuesto = async () => {
    if (presupuestoBloqueado) {
      toast.error(`El presupuesto está en estado ${presupuesto?.estado} y no permite recalcular.`);
      return;
    }

    try {
      setProcesandoOferta(true);
      await api.post(`/presupuestos/${id}/recalcular`, {});
      toast.success('Presupuesto recalculado');
      refetchDetalle();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al recalcular presupuesto');
    } finally {
      setProcesandoOferta(false);
    }
  };

  const emitirOferta = async () => {
    if (validacionEmision && !validacionEmision.ready) {
      toast.error('No se puede emitir: hay requisitos pendientes en la checklist');
      return;
    }

    const confirmado = window.confirm('¿Emitir oferta ahora? Se guardará snapshot y nueva versión si aplica.');
    if (!confirmado) return;

    try {
      setProcesandoOferta(true);
      await api.post(`/presupuestos/${id}/emitir`, { templateCode });
      toast.success('Oferta emitida correctamente');
      refetchDetalle();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al emitir oferta');
    } finally {
      setProcesandoOferta(false);
    }
  };

  const crearNuevaVersionEditable = async () => {
    const confirmado = window.confirm('Se creará una nueva versión en borrador para seguir editando. ¿Continuar?');
    if (!confirmado) return;

    try {
      setVersionando(true);
      const response = await api.post(`/presupuestos/${id}/versionar`, {});
      toast.success('Nueva versión creada');
      navigate(`/presupuestos/${response.data.id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al crear nueva versión');
    } finally {
      setVersionando(false);
    }
  };

  const abrirOfertaHtml = async () => {
    try {
      setAbriendoOferta(true);
      const response = await api.get(`/presupuestos/${id}/oferta-html${templateParams ? `?${templateParams}` : ''}`, { responseType: 'text' });
      const win = window.open('', '_blank');
      if (!win) {
        toast.error('No se pudo abrir la vista de oferta. Revisa el bloqueador de ventanas.');
        return;
      }
      win.document.open();
      win.document.write(response.data);
      win.document.close();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al generar vista de oferta');
    } finally {
      setAbriendoOferta(false);
    }
  };

  const descargarOfertaHtml = async () => {
    try {
      setDescargandoOferta(true);
      const query = new URLSearchParams({ download: '1' });
      if (templateCode) query.set('template', templateCode);
      const response = await api.get(`/presupuestos/${id}/oferta-html?${query.toString()}`, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const fileName = `${presupuesto?.codigoOferta || presupuesto?.codigo || 'oferta'}.html`;
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Oferta descargada');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al descargar oferta');
    } finally {
      setDescargandoOferta(false);
    }
  };

  const descargarOfertaPdf = async () => {
    try {
      setDescargandoPdf(true);
      const query = new URLSearchParams();
      if (templateCode) query.set('template', templateCode);
      const response = await api.get(`/presupuestos/${id}/oferta-pdf?${query.toString()}`, {
        responseType: 'arraybuffer',
        validateStatus: (status) => (status >= 200 && status < 300) || status === 501,
      });

      if (response.status === 501) {
        const payloadText = new TextDecoder('utf-8').decode(response.data);
        const fallbackPayload = JSON.parse(payloadText) as { fallbackHtml?: string };
        if (fallbackPayload.fallbackHtml) {
          toast('PDF no disponible en servidor. Descargando HTML de respaldo.', { icon: '⚠️' });
          const htmlResp = await api.get(fallbackPayload.fallbackHtml.replace('/api', ''), { responseType: 'blob' });
          const htmlBlob = new Blob([htmlResp.data], { type: 'text/html;charset=utf-8' });
          const url = URL.createObjectURL(htmlBlob);
          const link = document.createElement('a');
          const fileName = `${presupuesto?.codigoOferta || presupuesto?.codigo || 'oferta'}.html`;
          link.href = url;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          return;
        }

        throw new Error('No se recibió fallback HTML');
      }

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const fileName = `${presupuesto?.codigoOferta || presupuesto?.codigo || 'oferta'}.pdf`;
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('PDF descargado');
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || 'Error al descargar PDF');
    } finally {
      setDescargandoPdf(false);
    }
  };

  const actualizarModulo = (key: string, patch: Partial<OfertaModulo>) => {
    setModulosEditables((current) => current.map((module) => (module.key === key ? { ...module, ...patch } : module)));
  };

  const guardarModulosDocumento = async () => {
    if (!id) return;

    try {
      setGuardandoModulos(true);
      const payload = {
        overrides: modulosEditables.map((module) => ({
          key: module.key,
          title: module.title,
          content: module.content,
          enabled: module.enabled,
          order: module.order,
        })),
      };

      await api.put(`/presupuestos/${id}/oferta-modulos`, payload);
      toast.success('Módulos de oferta guardados');
      refetchOfertaModulos({ template: templateCode });
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al guardar módulos de oferta');
    } finally {
      setGuardandoModulos(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!presupuesto) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Presupuesto no encontrado</p>
        <Button className="mt-4" onClick={() => navigate('/presupuestos')}>Volver al listado</Button>
      </div>
    );
  }

  const marginTone = (margin: number) => {
    if (margin >= 20) return 'green';
    if (margin >= 10) return 'yellow';
    return 'red';
  };

  const marginClass = (margin: number) => {
    if (margin >= 20) return 'text-success';
    if (margin >= 10) return 'text-accent';
    return 'text-destructive';
  };

  const nextStates: Record<string, { label: string; estado: string; variant: 'primary' | 'success' | 'warning' | 'danger' }[]> = {
    BORRADOR: [{ label: 'Enviar', estado: 'ENVIADO', variant: 'primary' }],
    ENVIADO: [
      { label: 'Negociación', estado: 'NEGOCIACION', variant: 'warning' },
      { label: 'Aceptar', estado: 'ACEPTADO', variant: 'success' },
      { label: 'Rechazar', estado: 'RECHAZADO', variant: 'danger' },
      { label: 'Expirar', estado: 'EXPIRADO', variant: 'danger' },
    ],
    NEGOCIACION: [
      { label: 'Aceptar', estado: 'ACEPTADO', variant: 'success' },
      { label: 'Rechazar', estado: 'RECHAZADO', variant: 'danger' },
      { label: 'Expirar', estado: 'EXPIRADO', variant: 'danger' },
    ],
  };

  const lineasMotor = presupuesto.lineasMotor || [];
  const lineasTrabajo = presupuesto.lineasTrabajo || [];
  const lineasMaterial = presupuesto.lineasMaterial || [];
  const lineasDesplazamiento = presupuesto.lineasDesplazamiento || [];
  const fechaBase = new Date(presupuesto.fecha);
  const fechaCaducidad = new Date(fechaBase);
  fechaCaducidad.setDate(fechaCaducidad.getDate() + presupuesto.validezDias);
  const diasParaCaducar = Math.ceil((fechaCaducidad.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const hitosComerciales = [
    { key: 'creado', label: 'Creado', fecha: presupuesto.fecha, done: true },
    { key: 'enviado', label: 'Enviado', fecha: presupuesto.fechaEnvio, done: Boolean(presupuesto.fechaEnvio) },
    { key: 'emitido', label: 'Oferta emitida', fecha: presupuesto.snapshot?.fechaEmision, done: Boolean(presupuesto.snapshot?.fechaEmision) },
    { key: 'respuesta', label: 'Respuesta cliente', fecha: presupuesto.fechaRespuesta, done: Boolean(presupuesto.fechaRespuesta) },
  ];

  const totalPartidas = lineasMotor.length > 0
    ? lineasMotor.length
    : lineasTrabajo.length + lineasMaterial.length + lineasDesplazamiento.length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-4">
        <Button size="sm" variant="outline" onClick={() => navigate('/presupuestos')}>
          <HiArrowLeft className="w-4 h-4" /> Volver
        </Button>
        {!!presupuesto.proyecto?.id && (
          <Button size="sm" variant="outline" onClick={() => navigate(`/proyectos/${presupuesto.proyecto.id}`)}>
            Ver Proyecto
          </Button>
        )}
        <div className="flex-1 min-w-[220px]">
          <h1 className="page-title">{presupuesto.codigo}</h1>
          <p className="text-[14px] text-slate-500 mt-1">
            {presupuesto.proyecto?.nombre} · {presupuesto.proyecto?.cliente?.nombre || 'Sin cliente'} · {formatDate(presupuesto.fecha)}
          </p>
          {(presupuesto.codigoOferta || presupuesto.versionOferta) && (
            <p className="text-[13px] text-slate-500 mt-1">
              Oferta: {presupuesto.codigoOferta || '-'} {presupuesto.versionOferta ? `· v${presupuesto.versionOferta}` : ''}
            </p>
          )}
          <p className={`text-[13px] mt-1 ${diasParaCaducar < 0 ? 'text-red-600' : diasParaCaducar <= 5 ? 'text-amber-600' : 'text-slate-500'}`}>
            {diasParaCaducar < 0 ? `Caducado hace ${Math.abs(diasParaCaducar)} día(s)` : `Caduca en ${diasParaCaducar} día(s)`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-600">Plantilla</label>
          <select
            value={templateCode}
            onChange={(e) => setTemplateCode(e.target.value)}
            className="h-9 rounded-md border border-border bg-background px-2 text-sm"
          >
            {(!templateCatalog?.templates || templateCatalog.templates.length === 0) && (
              <option value="OFERTA_EMT_360_V2">Oferta Técnica-Económica · 2.0.0</option>
            )}
            {(templateCatalog?.templates || []).map((template) => (
              <option key={template.codigo} value={template.codigo}>
                {template.etiquetas.tituloOferta} · {template.version}
              </option>
            ))}
          </select>
          <Button size="sm" variant="outline" onClick={recalcularPresupuesto} disabled={procesandoOferta || presupuestoBloqueado}>
            {procesandoOferta ? 'Procesando...' : 'Recalcular'}
          </Button>
          <Button size="sm" variant="outline" onClick={abrirOfertaHtml} disabled={abriendoOferta}>
            {abriendoOferta ? 'Abriendo...' : 'Ver oferta'}
          </Button>
          <Button size="sm" variant="outline" onClick={descargarOfertaHtml} disabled={descargandoOferta}>
            <HiDownload className="w-4 h-4" /> {descargandoOferta ? 'Descargando...' : 'Descargar HTML'}
          </Button>
          <Button size="sm" variant="outline" onClick={descargarOfertaPdf} disabled={descargandoPdf}>
            <HiDownload className="w-4 h-4" /> {descargandoPdf ? 'Descargando...' : 'Descargar PDF'}
          </Button>
          <Button
            size="sm"
            variant="primary"
            onClick={emitirOferta}
            disabled={procesandoOferta || (validacionEmision ? !validacionEmision.ready : false)}
          >
            {procesandoOferta ? 'Procesando...' : 'Emitir oferta'}
          </Button>
        </div>
        <StatusBadge status={presupuesto.estado} />
      </div>

      {validacionEmision && (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-800">Checklist de emisión</h3>
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${validacionEmision.ready ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
              {validacionEmision.ready ? 'Lista para emitir' : `${validacionEmision.pendientes.length} pendiente(s)`}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {validacionEmision.checks.map((check) => (
              <div key={check.key} className="flex items-center gap-2 text-sm">
                <span className={`inline-block h-2.5 w-2.5 rounded-full ${check.ok ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                <span className={check.ok ? 'text-slate-700' : 'text-slate-800 font-medium'}>{check.label}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Módulos del documento cliente</h3>
            <p className="text-xs text-slate-500 mt-1">Estos módulos alimentan el PDF/HTML de la oferta para esta plantilla.</p>
          </div>
          <Button size="sm" variant="outline" onClick={guardarModulosDocumento} disabled={guardandoModulos || cargandoModulos || modulosEditables.length === 0}>
            <HiSave className="w-4 h-4" /> {guardandoModulos ? 'Guardando...' : 'Guardar módulos'}
          </Button>
        </div>

        {cargandoModulos ? (
          <p className="text-sm text-slate-500">Cargando módulos...</p>
        ) : modulosEditables.length === 0 ? (
          <p className="text-sm text-slate-500">No hay módulos configurados para esta plantilla.</p>
        ) : (
          <div className="space-y-3">
            {modulosEditables
              .slice()
              .sort((left, right) => left.order - right.order)
              .map((module) => (
                <div key={module.key} className="rounded-md border border-border p-3">
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <input
                      type="checkbox"
                      checked={module.enabled}
                      onChange={(e) => actualizarModulo(module.key, { enabled: e.target.checked })}
                    />
                    <input
                      value={module.title}
                      onChange={(e) => actualizarModulo(module.key, { title: e.target.value })}
                      className="flex-1 min-w-[240px] rounded-md border border-border px-2 py-1.5 text-sm"
                    />
                    <input
                      type="number"
                      value={module.order}
                      onChange={(e) => actualizarModulo(module.key, { order: Number(e.target.value) || module.order })}
                      className="w-24 rounded-md border border-border px-2 py-1.5 text-sm"
                    />
                  </div>
                  <textarea
                    value={module.content}
                    onChange={(e) => actualizarModulo(module.key, { content: e.target.value })}
                    rows={3}
                    className="w-full rounded-md border border-border px-2 py-1.5 text-sm"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Clave: {module.key}</p>
                </div>
              ))}
          </div>
        )}
      </Card>

      {presupuestoBloqueado && (
        <Card>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
              Este presupuesto está en estado <span className="font-semibold">{presupuesto.estado}</span> y queda bloqueado para edición.
              Para cambios, crea una nueva versión editable.
            </p>
            <Button size="sm" onClick={crearNuevaVersionEditable} disabled={versionando}>
              {versionando ? 'Creando versión...' : 'Crear nueva versión'}
            </Button>
          </div>
        </Card>
      )}

      {nextStates[presupuesto.estado] && (
        <Card>
          <div className="flex flex-wrap gap-2">
            {nextStates[presupuesto.estado].map((action) => (
              <Button key={action.estado} variant={action.variant} size="sm" className="min-w-[104px]" onClick={() => handleCambiarEstado(action.estado)} disabled={Boolean(cambiandoEstado)}>
                {cambiandoEstado === action.estado ? 'Actualizando...' : action.label}
              </Button>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-800">Trazabilidad comercial</h3>
          <span className="text-xs text-slate-500">{presupuesto.codigoOferta || 'Sin código de oferta'}</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
          {hitosComerciales.map((hito) => (
            <div key={hito.key} className="rounded-md border border-border px-3 py-2">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
                <span className={`inline-block h-2.5 w-2.5 rounded-full ${hito.done ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                {hito.label}
              </div>
              <p className="text-xs text-slate-500 mt-1">{hito.fecha ? formatDate(hito.fecha) : 'Pendiente'}</p>
            </div>
          ))}
        </div>
      </Card>

      {impactoAceptacion && (impactoAceptacion.resumen.totalCompras > 0 || impactoAceptacion.resumen.totalOrdenesTrabajo > 0) && (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-800">Impacto de aceptación</h3>
            <span className="text-xs text-slate-500">
              {impactoAceptacion.resumen.totalCompras} compras · {impactoAceptacion.resumen.totalOrdenesTrabajo} OT
            </span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div className="rounded-md border border-border p-3">
              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Compras generadas</p>
              {impactoAceptacion.compras.length === 0 ? (
                <p className="text-sm text-slate-500">Sin compras autogeneradas.</p>
              ) : (
                <div className="space-y-1.5">
                  {impactoAceptacion.compras.map((compra) => (
                    <div key={compra.id} className="rounded border border-border px-2.5 py-2">
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <span className="font-medium text-slate-800">{compra.codigo}</span>
                        <StatusBadge status={compra.estado} />
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-2 text-xs text-slate-500">
                        <span>{compra.proveedor} · {formatDate(compra.fechaSolicitud)}</span>
                        <Button size="sm" variant="outline" onClick={() => navigate(`/compras/${compra.id}`)}>
                          <HiEye className="w-4 h-4" /> Ver
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="rounded-md border border-border p-3">
              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Órdenes de trabajo generadas</p>
              {impactoAceptacion.ordenesTrabajo.length === 0 ? (
                <p className="text-sm text-slate-500">Sin OT autogeneradas.</p>
              ) : (
                <div className="space-y-1.5">
                  {impactoAceptacion.ordenesTrabajo.map((orden) => (
                    <div key={orden.id} className="rounded border border-border px-2.5 py-2">
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <span className="font-medium text-slate-800">{orden.codigo}</span>
                        <StatusBadge status={orden.estado} />
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-2 text-xs text-slate-500">
                        <span>{orden.fechaPlanificada ? formatDate(orden.fechaPlanificada) : `Creada ${formatDate(orden.createdAt)}`}</span>
                        <Button size="sm" variant="outline" onClick={() => navigate(`/ordenes-trabajo/${orden.id}`)}>
                          <HiEye className="w-4 h-4" /> Ver
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {versionesData && versionesData.versiones.length > 1 && (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-800">Histórico de versiones</h3>
            <span className="text-xs text-slate-500">{versionesData.totalVersiones} versiones</span>
          </div>
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="table-header">Versión</th>
                  <th className="table-header">Código</th>
                  <th className="table-header">Estado</th>
                  <th className="table-header">Fecha</th>
                  <th className="table-header">Emitida</th>
                  <th className="table-header">Total</th>
                  <th className="table-header text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {versionesData.versiones.map((version) => {
                  const isCurrent = version.id === presupuesto.id;
                  return (
                    <tr key={version.id} className={isCurrent ? 'bg-slate-50' : ''}>
                      <td className="table-cell font-medium">v{version.versionOferta || 1}</td>
                      <td className="table-cell">{version.codigo}</td>
                      <td className="table-cell"><StatusBadge status={version.estado} /></td>
                      <td className="table-cell">{formatDate(version.fecha)}</td>
                      <td className="table-cell">{version.snapshot?.fechaEmision ? formatDate(version.snapshot.fechaEmision) : '-'}</td>
                      <td className="table-cell font-medium">{formatCurrency(version.totalConIva ?? version.totalCliente)}</td>
                      <td className="table-cell text-right">
                        {isCurrent ? (
                          <span className="text-xs text-slate-500">Actual</span>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => navigate(`/presupuestos/${version.id}`)}>
                            Abrir
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Cliente" value={formatCurrency(presupuesto.totalCliente)} icon={<HiCurrencyDollar className="w-5 h-5" />} color="blue" />
        <StatCard title="Coste Total" value={formatCurrency(presupuesto.costeTotal)} icon={<HiCash className="w-5 h-5" />} color="red" />
        <StatCard title="Margen Bruto" value={formatCurrency(presupuesto.margenBruto)} icon={<HiTrendingUp className="w-5 h-5" />} color={marginTone(presupuesto.margenPorcentaje)} />
        <StatCard title="Margen %" value={`${presupuesto.margenPorcentaje.toFixed(1)}%`} icon={<HiCalculator className="w-5 h-5" />} color={marginTone(presupuesto.margenPorcentaje)} />
      </div>

      <Card>
        <div className="flex gap-2 border-b border-border pb-3 mb-4">
          <Button variant={vista === 'cliente' ? 'primary' : 'outline'} size="sm" onClick={() => setVista('cliente')}>Vista Cliente</Button>
          <Button variant={vista === 'interna' ? 'primary' : 'outline'} size="sm" onClick={() => setVista('interna')}>Vista Interna</Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-md border border-border p-3.5">
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Datos generales</p>
            <div className="space-y-1 text-sm">
              <p><span className="text-muted-foreground">Cliente:</span> {presupuesto.proyecto?.cliente?.nombre || '-'}</p>
              <p><span className="text-muted-foreground">Proyecto:</span> {presupuesto.proyecto?.nombre || '-'}</p>
              <p><span className="text-muted-foreground">Validez:</span> {presupuesto.validezDias} días</p>
              <p><span className="text-muted-foreground">Partidas:</span> {totalPartidas}</p>
            </div>
          </div>
          <div className="rounded-md border border-border p-3.5">
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Resumen económico</p>
            <div className="space-y-1 text-sm">
              <p className="flex justify-between"><span className="text-muted-foreground">Trabajos</span><span>{formatCurrency(presupuesto.totalTrabajos)}</span></p>
              <p className="flex justify-between"><span className="text-muted-foreground">Materiales</span><span>{formatCurrency(presupuesto.totalMateriales)}</span></p>
              <p className="flex justify-between"><span className="text-muted-foreground">Desplazamientos</span><span>{formatCurrency(presupuesto.totalDesplazamientos)}</span></p>
              <p className="flex justify-between border-t border-border pt-2 font-semibold"><span>Base imponible</span><span>{formatCurrency(presupuesto.baseImponible ?? presupuesto.totalCliente)}</span></p>
              <p className="flex justify-between"><span className="text-muted-foreground">IVA ({(presupuesto.ivaPorcentaje ?? 21).toFixed(0)}%)</span><span>{formatCurrency(presupuesto.ivaImporte ?? 0)}</span></p>
              <p className="flex justify-between font-semibold"><span>Total con IVA</span><span>{formatCurrency(presupuesto.totalConIva ?? presupuesto.totalCliente)}</span></p>
              {!!presupuesto.precioUnitarioVehiculo && (
                <p className="flex justify-between"><span className="text-muted-foreground">Precio por vehículo</span><span>{formatCurrency(presupuesto.precioUnitarioVehiculo)}</span></p>
              )}
              <p className={`flex justify-between font-semibold ${marginClass(presupuesto.margenPorcentaje)}`}><span>Margen</span><span>{presupuesto.margenPorcentaje.toFixed(1)}%</span></p>
            </div>
          </div>
        </div>
      </Card>

      <Card title={vista === 'cliente' ? 'Partidas para cliente' : 'Partidas internas'}>
        {lineasMotor.length > 0 && (
          <div className="mb-5 rounded-md border border-border p-3.5">
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Nueva línea motor</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
              <select
                className="px-3 py-2 rounded-md border border-input bg-background text-sm"
                value={nuevaLinea.bloque}
                onChange={(e) => setNuevaLinea((prev) => ({ ...prev, bloque: e.target.value as BloqueEconomico }))}
              >
                {Object.entries(BLOQUE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
              <input
                className="px-3 py-2 rounded-md border border-input bg-background text-sm"
                placeholder="Código"
                value={nuevaLinea.codigo}
                onChange={(e) => setNuevaLinea((prev) => ({ ...prev, codigo: e.target.value }))}
              />
              <input
                className="px-3 py-2 rounded-md border border-input bg-background text-sm lg:col-span-2"
                placeholder="Descripción"
                value={nuevaLinea.descripcion}
                onChange={(e) => setNuevaLinea((prev) => ({ ...prev, descripcion: e.target.value }))}
              />
              <input
                className="px-3 py-2 rounded-md border border-input bg-background text-sm"
                placeholder="Unidad"
                value={nuevaLinea.unidad}
                onChange={(e) => setNuevaLinea((prev) => ({ ...prev, unidad: e.target.value }))}
              />
              <input
                type="number"
                min={0}
                step="0.01"
                className="px-3 py-2 rounded-md border border-input bg-background text-sm"
                placeholder="Cantidad"
                value={nuevaLinea.cantidad}
                onChange={(e) => setNuevaLinea((prev) => ({ ...prev, cantidad: Number(e.target.value) }))}
              />
              <input
                type="number"
                min={0}
                step="0.01"
                className="px-3 py-2 rounded-md border border-input bg-background text-sm"
                placeholder="Precio unitario"
                value={nuevaLinea.precioUnitario}
                onChange={(e) => setNuevaLinea((prev) => ({ ...prev, precioUnitario: Number(e.target.value) }))}
              />
              <div className="flex items-center justify-end">
                <Button size="sm" onClick={crearLinea} disabled={guardandoLinea || presupuestoBloqueado}>Añadir línea</Button>
              </div>
            </div>
          </div>
        )}

        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="table-header">Tipo / Bloque</th>
                <th className="table-header">Código</th>
                <th className="table-header">Descripción</th>
                <th className="table-header">Cantidad</th>
                <th className="table-header">Precio</th>
                <th className="table-header">Total</th>
                {lineasMotor.length > 0 && <th className="table-header text-right">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {lineasMotor.map((linea) => {
                const enEdicion = editandoLineaId === linea.id && editLinea;
                const precioVista = vista === 'cliente'
                  ? (enEdicion ? editLinea.precioUnitario : linea.precioUnitario)
                  : (enEdicion ? editLinea.costeUnitario : linea.costeUnitario);
                const cantidadVista = enEdicion ? editLinea.cantidad : linea.cantidad;

                return (
                  <tr key={`motor-${linea.id}`}>
                    <td className="table-cell text-muted-foreground">{BLOQUE_LABELS[enEdicion ? editLinea.bloque : linea.bloque]}</td>
                    <td className="table-cell">
                      {enEdicion ? (
                        <input
                          className="px-2 py-1 rounded border border-input bg-background text-sm w-full"
                          value={editLinea.codigo}
                          onChange={(e) => setEditLinea((prev) => prev ? { ...prev, codigo: e.target.value } : prev)}
                        />
                      ) : linea.codigo}
                    </td>
                    <td className="table-cell font-medium">
                      {enEdicion ? (
                        <input
                          className="px-2 py-1 rounded border border-input bg-background text-sm w-full"
                          value={editLinea.descripcion}
                          onChange={(e) => setEditLinea((prev) => prev ? { ...prev, descripcion: e.target.value } : prev)}
                        />
                      ) : linea.descripcion}
                    </td>
                    <td className="table-cell">
                      {enEdicion ? (
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          className="px-2 py-1 rounded border border-input bg-background text-sm w-24"
                          value={editLinea.cantidad}
                          onChange={(e) => setEditLinea((prev) => prev ? { ...prev, cantidad: Number(e.target.value) } : prev)}
                        />
                      ) : cantidadVista}
                    </td>
                    <td className="table-cell">
                      {enEdicion ? (
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          className="px-2 py-1 rounded border border-input bg-background text-sm w-28"
                          value={vista === 'cliente' ? editLinea.precioUnitario : editLinea.costeUnitario}
                          onChange={(e) => {
                            const value = Number(e.target.value);
                            setEditLinea((prev) => prev ? {
                              ...prev,
                              ...(vista === 'cliente' ? { precioUnitario: value } : { costeUnitario: value }),
                            } : prev);
                          }}
                        />
                      ) : formatCurrency(precioVista)}
                    </td>
                    <td className="table-cell font-medium">{formatCurrency(precioVista * cantidadVista)}</td>
                    <td className="table-cell text-right whitespace-nowrap">
                      {enEdicion ? (
                        <div className="flex justify-end gap-2">
                          <Button size="sm" onClick={() => guardarEdicionLinea(linea.id)} disabled={guardandoLinea}>Guardar</Button>
                          <Button size="sm" variant="outline" onClick={cancelarEdicionLinea} disabled={guardandoLinea}>Cancelar</Button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => iniciarEdicionLinea(linea)} disabled={guardandoLinea || presupuestoBloqueado}>Editar</Button>
                          <Button size="sm" variant="danger" onClick={() => eliminarLinea(linea.id)} disabled={guardandoLinea || presupuestoBloqueado}>Eliminar</Button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}

              {lineasTrabajo.map((linea: any) => (
                <tr key={`trabajo-${linea.id}`}>
                  <td className="table-cell text-muted-foreground">Trabajo</td>
                  <td className="table-cell">-</td>
                  <td className="table-cell font-medium">{linea.descripcion || linea.trabajo?.nombreComercial || '-'}</td>
                  <td className="table-cell">{linea.cantidad || 1}</td>
                  <td className="table-cell">
                    {formatCurrency(vista === 'cliente' ? (linea.precioUnitarioCliente || linea.precioVenta || 0) : (linea.costeUnitario || linea.costeInterno || 0))}
                  </td>
                  <td className="table-cell font-medium">
                    {formatCurrency((vista === 'cliente' ? (linea.precioUnitarioCliente || linea.precioVenta || 0) : (linea.costeUnitario || linea.costeInterno || 0)) * (linea.cantidad || 1))}
                  </td>
                  {lineasMotor.length > 0 && <td className="table-cell" />}
                </tr>
              ))}
              {lineasMaterial.map((linea: any) => (
                <tr key={`material-${linea.id}`}>
                  <td className="table-cell text-muted-foreground">Material</td>
                  <td className="table-cell">-</td>
                  <td className="table-cell font-medium">{linea.descripcion || linea.material?.descripcion || '-'}</td>
                  <td className="table-cell">{linea.cantidad || 1}</td>
                  <td className="table-cell">
                    {formatCurrency(vista === 'cliente' ? (linea.precioUnitarioCliente || linea.precioEstandar || 0) : (linea.costeUnitario || linea.costeMedio || 0))}
                  </td>
                  <td className="table-cell font-medium">
                    {formatCurrency((vista === 'cliente' ? (linea.precioUnitarioCliente || linea.precioEstandar || 0) : (linea.costeUnitario || linea.costeMedio || 0)) * (linea.cantidad || 1))}
                  </td>
                  {lineasMotor.length > 0 && <td className="table-cell" />}
                </tr>
              ))}
              {lineasDesplazamiento.map((linea: any) => (
                <tr key={`desplazamiento-${linea.id}`}>
                  <td className="table-cell text-muted-foreground">Desplazamiento</td>
                  <td className="table-cell">-</td>
                  <td className="table-cell font-medium">{linea.descripcion || '-'}</td>
                  <td className="table-cell">{linea.cantidad || linea.numViajes || 1}</td>
                  <td className="table-cell">
                    {formatCurrency(vista === 'cliente' ? (linea.precioCliente || linea.costePorViaje || 0) : (linea.costeInterno || linea.costePorViaje || 0))}
                  </td>
                  <td className="table-cell font-medium">
                    {formatCurrency((vista === 'cliente' ? (linea.precioCliente || linea.costePorViaje || 0) : (linea.costeInterno || linea.costePorViaje || 0)) * (linea.cantidad || linea.numViajes || 1))}
                  </td>
                  {lineasMotor.length > 0 && <td className="table-cell" />}
                </tr>
              ))}
              {totalPartidas === 0 && (
                <tr>
                  <td colSpan={lineasMotor.length > 0 ? 7 : 6} className="table-cell text-center text-muted-foreground py-8">No hay partidas en este presupuesto</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
