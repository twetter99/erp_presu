import { useNavigate } from 'react-router-dom';
import { useApi, useCrud, formatCurrency, formatDate } from '../../hooks/useApi';
import { Presupuesto, Proyecto, EstadoPresupuesto } from '../../types';
import DataTable from '../../components/ui/DataTable';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Badge, { StatusBadge } from '../../components/ui/Badge';
import { HiSearch, HiOutlinePlus } from 'react-icons/hi';
import { useEffect, useState } from 'react';
import api from '../../api/client';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';

type SolucionCatalogo = {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
};

type MotorCatalogoResponse = {
  soluciones: SolucionCatalogo[];
  defaults: {
    ivaPorcentaje: number;
    validezDias: number;
  };
};

type FiltroCaducidad = 'TODOS' | 'POR_VENCER' | 'CADUCADOS';
type FiltroPrioridad = 'TODAS' | 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAJA';
type PrioridadCalculada = 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAJA' | 'CERRADO';
type TipoAccionRapida = 'SEGUIMIENTO' | 'ENVIAR' | 'ACEPTAR' | 'RECHAZAR';

const FILTROS_STORAGE_KEY = 'presupuestos:listado:filtros:v1';
const PREFERENCIAS_STORAGE_KEY = 'presupuestos:listado:preferencias:v1';

export default function PresupuestosPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { items, loading, refetch } = useCrud<Presupuesto>('/presupuestos');
  const { data: proyectosData } = useApi<Proyecto[]>('/proyectos');
  const { data: motorCatalogo } = useApi<MotorCatalogoResponse>('/presupuestos/motor/catalogo');
  const [search, setSearch] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState<'TODOS' | EstadoPresupuesto>('TODOS');
  const [focoCaducidad, setFocoCaducidad] = useState<FiltroCaducidad>('TODOS');
  const [prioridadFiltro, setPrioridadFiltro] = useState<FiltroPrioridad>('TODAS');
  const [colaHoy, setColaHoy] = useState(false);
  const [colaHoyPorDefecto, setColaHoyPorDefecto] = useState(false);
  const [mostrarMetricasComerciales, setMostrarMetricasComerciales] = useState(false);
  const [mostrarFiltrosAvanzados, setMostrarFiltrosAvanzados] = useState(false);
  const [modalMotorOpen, setModalMotorOpen] = useState(false);
  const [creandoMotor, setCreandoMotor] = useState(false);
  const [accionRapidaLoading, setAccionRapidaLoading] = useState<{ id: number; tipo: TipoAccionRapida } | null>(null);
  const [motorForm, setMotorForm] = useState({
    proyectoId: 0,
    solucionId: 0,
    numVehiculos: 1,
    tipologiaVehiculo: '12m',
    piloto: false,
    horarioIntervencion: 'diurno',
    nocturnidad: false,
    integraciones: false,
    ivaPorcentaje: 21,
    validezDias: 30,
  });

  useEffect(() => {
    try {
      const prefRaw = localStorage.getItem(PREFERENCIAS_STORAGE_KEY);
      if (prefRaw) {
        const prefParsed = JSON.parse(prefRaw) as { colaHoyPorDefecto?: boolean };
        if (typeof prefParsed.colaHoyPorDefecto === 'boolean') {
          setColaHoyPorDefecto(prefParsed.colaHoyPorDefecto);
          if (prefParsed.colaHoyPorDefecto) setColaHoy(true);
        }
      }

      const raw = localStorage.getItem(FILTROS_STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw) as {
        search?: string;
        estadoFiltro?: 'TODOS' | EstadoPresupuesto;
        focoCaducidad?: FiltroCaducidad;
        prioridadFiltro?: FiltroPrioridad;
        colaHoy?: boolean;
      };

      const estadosValidos: Array<'TODOS' | EstadoPresupuesto> = ['TODOS', 'BORRADOR', 'ENVIADO', 'NEGOCIACION', 'ACEPTADO', 'RECHAZADO', 'EXPIRADO'];
      const focosValidos: FiltroCaducidad[] = ['TODOS', 'POR_VENCER', 'CADUCADOS'];
      const prioridadesValidas: FiltroPrioridad[] = ['TODAS', 'CRITICA', 'ALTA', 'MEDIA', 'BAJA'];

      if (typeof parsed.search === 'string') setSearch(parsed.search);
      if (parsed.estadoFiltro && estadosValidos.includes(parsed.estadoFiltro)) setEstadoFiltro(parsed.estadoFiltro);
      if (parsed.focoCaducidad && focosValidos.includes(parsed.focoCaducidad)) setFocoCaducidad(parsed.focoCaducidad);
      if (parsed.prioridadFiltro && prioridadesValidas.includes(parsed.prioridadFiltro)) setPrioridadFiltro(parsed.prioridadFiltro);
      if (typeof parsed.colaHoy === 'boolean') setColaHoy(parsed.colaHoy);
    } catch {
      localStorage.removeItem(FILTROS_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      PREFERENCIAS_STORAGE_KEY,
      JSON.stringify({ colaHoyPorDefecto })
    );
  }, [colaHoyPorDefecto]);

  useEffect(() => {
    localStorage.setItem(
      FILTROS_STORAGE_KEY,
      JSON.stringify({
        search,
        estadoFiltro,
        focoCaducidad,
        prioridadFiltro,
        colaHoy,
      })
    );
  }, [search, estadoFiltro, focoCaducidad, prioridadFiltro, colaHoy]);

  const calcularPrioridad = (presupuesto: Presupuesto): PrioridadCalculada => {
    const esComercialActivo = ['BORRADOR', 'ENVIADO', 'NEGOCIACION'].includes(presupuesto.estado);
    if (!esComercialActivo) return 'CERRADO';

    const fechaCaducidad = new Date(presupuesto.fecha);
    fechaCaducidad.setDate(fechaCaducidad.getDate() + presupuesto.validezDias);
    const dias = Math.ceil((fechaCaducidad.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    if (dias < 0) return 'CRITICA';
    if (dias <= 2) return 'ALTA';
    if (dias <= 5) return 'MEDIA';
    return 'BAJA';
  };

  const filteredItems = items.filter(
    (p) => {
      const searchValue = search.toLowerCase();
      const searchMatch =
        p.codigo.toLowerCase().includes(searchValue)
        || (p.codigoOferta && p.codigoOferta.toLowerCase().includes(searchValue))
        || (p.proyecto?.nombre && p.proyecto.nombre.toLowerCase().includes(searchValue))
        || (p.proyecto?.codigo && p.proyecto.codigo.toLowerCase().includes(searchValue))
        || (p.proyecto?.cliente?.nombre && p.proyecto.cliente.nombre.toLowerCase().includes(searchValue));

      const estadoMatch = estadoFiltro === 'TODOS' || p.estado === estadoFiltro;

      const esComercialActivo = ['BORRADOR', 'ENVIADO', 'NEGOCIACION'].includes(p.estado);
      const fechaBase = new Date(p.fecha);
      const fechaCaducidad = new Date(fechaBase);
      fechaCaducidad.setDate(fechaCaducidad.getDate() + p.validezDias);
      const diasParaCaducar = Math.ceil((fechaCaducidad.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

      const focoCaducidadMatch = focoCaducidad === 'TODOS'
        ? true
        : focoCaducidad === 'POR_VENCER'
          ? esComercialActivo && diasParaCaducar >= 0 && diasParaCaducar <= 5
          : esComercialActivo && diasParaCaducar < 0;

      const prioridad = calcularPrioridad(p);

      const prioridadMatch = prioridadFiltro === 'TODAS' || prioridad === prioridadFiltro;
      const colaHoyMatch = !colaHoy || (esComercialActivo && (prioridad === 'CRITICA' || (diasParaCaducar >= 0 && diasParaCaducar <= 5)));

      return searchMatch && estadoMatch && focoCaducidadMatch && prioridadMatch && colaHoyMatch;
    }
  );

  const estadoOptions: Array<{ key: 'TODOS' | EstadoPresupuesto; label: string }> = [
    { key: 'TODOS', label: 'Todos' },
    { key: 'BORRADOR', label: 'Borrador' },
    { key: 'ENVIADO', label: 'Enviado' },
    { key: 'NEGOCIACION', label: 'Negociación' },
    { key: 'ACEPTADO', label: 'Aceptado' },
    { key: 'RECHAZADO', label: 'Rechazado' },
    { key: 'EXPIRADO', label: 'Expirado' },
  ];

  const totalPresupuestos = items.length;
  const totalBorradores = items.filter((p) => p.estado === 'BORRADOR').length;
  const totalEnviados = items.filter((p) => p.estado === 'ENVIADO' || p.estado === 'NEGOCIACION').length;
  const totalAceptados = items.filter((p) => p.estado === 'ACEPTADO').length;
  const tasaExito = totalPresupuestos > 0 ? (totalAceptados / totalPresupuestos) * 100 : 0;
  const enRangoDias = (fechaIso: string, dias: number) => {
    const fecha = new Date(fechaIso).getTime();
    return Date.now() - fecha <= dias * 24 * 60 * 60 * 1000;
  };
  const total30 = items.filter((p) => enRangoDias(p.fecha, 30)).length;
  const total90 = items.filter((p) => enRangoDias(p.fecha, 90)).length;
  const aceptados30 = items.filter((p) => p.estado === 'ACEPTADO' && enRangoDias(p.fecha, 30)).length;
  const aceptados90 = items.filter((p) => p.estado === 'ACEPTADO' && enRangoDias(p.fecha, 90)).length;
  const conversion30 = total30 > 0 ? (aceptados30 / total30) * 100 : 0;
  const conversion90 = total90 > 0 ? (aceptados90 / total90) * 100 : 0;

  const totalConEnvio = items.filter((p) => Boolean(p.fechaEnvio)).length;
  const totalQueAvanzaronDesdeEnviado = items.filter(
    (p) => Boolean(p.fechaEnvio) && ['NEGOCIACION', 'ACEPTADO', 'RECHAZADO', 'EXPIRADO'].includes(p.estado)
  ).length;
  const conversionEnviadoANegociacion = totalConEnvio > 0 ? (totalQueAvanzaronDesdeEnviado / totalConEnvio) * 100 : 0;

  const totalCierresComerciales = items.filter((p) => ['ACEPTADO', 'RECHAZADO', 'EXPIRADO'].includes(p.estado)).length;
  const conversionNegociacionAAceptado = totalCierresComerciales > 0 ? (totalAceptados / totalCierresComerciales) * 100 : 0;

  const respuestasConTiempo = items
    .filter((p) => p.fechaRespuesta)
    .map((p) => {
      const inicio = new Date(p.fecha).getTime();
      const fin = new Date(p.fechaRespuesta as string).getTime();
      return Math.max(0, (fin - inicio) / (1000 * 60 * 60 * 24));
    });
  const tiempoMedioRespuestaDias = respuestasConTiempo.length > 0
    ? respuestasConTiempo.reduce((sum, value) => sum + value, 0) / respuestasConTiempo.length
    : 0;
  const respuestaMedianaDias = respuestasConTiempo.length > 0
    ? [...respuestasConTiempo].sort((a, b) => a - b)[Math.floor(respuestasConTiempo.length / 2)]
    : 0;
  const totalPorVencer = items.filter((p) => {
    const esComercialActivo = ['BORRADOR', 'ENVIADO', 'NEGOCIACION'].includes(p.estado);
    if (!esComercialActivo) return false;
    const fechaCaducidad = new Date(p.fecha);
    fechaCaducidad.setDate(fechaCaducidad.getDate() + p.validezDias);
    const dias = Math.ceil((fechaCaducidad.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return dias >= 0 && dias <= 5;
  }).length;
  const totalCaducados = items.filter((p) => {
    const esComercialActivo = ['BORRADOR', 'ENVIADO', 'NEGOCIACION'].includes(p.estado);
    if (!esComercialActivo) return false;
    const fechaCaducidad = new Date(p.fecha);
    fechaCaducidad.setDate(fechaCaducidad.getDate() + p.validezDias);
    const dias = Math.ceil((fechaCaducidad.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return dias < 0;
  }).length;
  const totalCriticos = items.filter((p) => calcularPrioridad(p) === 'CRITICA').length;

  const getUltimaActividad = (presupuesto: Presupuesto) => {
    const fecha = presupuesto.ultimaActividadFecha
      || presupuesto.fechaRespuesta
      || presupuesto.snapshot?.fechaEmision
      || presupuesto.fechaEnvio
      || presupuesto.fecha;

    const label = presupuesto.ultimaActividadTipo === 'ACEPTADO'
      ? 'Aceptado'
      : presupuesto.ultimaActividadTipo === 'RECHAZADO'
        ? 'Rechazado'
        : presupuesto.ultimaActividadTipo === 'OFERTA_EMITIDA'
          ? 'Oferta emitida'
          : presupuesto.ultimaActividadTipo === 'ENVIADO'
            ? 'Enviado'
            : presupuesto.ultimaActividadTipo === 'RESPUESTA'
              ? 'Respuesta'
              : 'Creado';

    return { label, fecha };
  };

  const getResumenTrazabilidad = (presupuesto: Presupuesto) => {
    const hitos = [
      `Creado: ${formatDate(presupuesto.fecha)}`,
      presupuesto.fechaEnvio ? `Enviado: ${formatDate(presupuesto.fechaEnvio)}` : null,
      presupuesto.snapshot?.fechaEmision ? `Oferta emitida: ${formatDate(presupuesto.snapshot.fechaEmision)}` : null,
      presupuesto.fechaRespuesta ? `Respuesta: ${formatDate(presupuesto.fechaRespuesta)}` : null,
    ].filter(Boolean);

    return hitos.join(' · ');
  };

  const getCaducidad = (presupuesto: Presupuesto) => {
    const esComercialActivo = ['BORRADOR', 'ENVIADO', 'NEGOCIACION'].includes(presupuesto.estado);
    if (!esComercialActivo) {
      return { label: 'Cerrado', className: 'text-slate-400' };
    }

    const fechaBase = new Date(presupuesto.fecha);
    const fechaCaducidad = new Date(fechaBase);
    fechaCaducidad.setDate(fechaCaducidad.getDate() + presupuesto.validezDias);
    const dias = Math.ceil((fechaCaducidad.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    if (dias < 0) return { label: `Caducado ${Math.abs(dias)}d`, className: 'text-red-600 font-medium' };
    if (dias <= 5) return { label: `Vence en ${dias}d`, className: 'text-amber-600 font-medium' };
    return { label: `${dias}d`, className: 'text-slate-600' };
  };

  const getPrioridad = (presupuesto: Presupuesto): { label: string; variant: 'red' | 'yellow' | 'blue' | 'gray'; rank: number } => {
    const prioridad = calcularPrioridad(presupuesto);
    if (prioridad === 'CRITICA') return { label: 'Crítica', variant: 'red', rank: 4 };
    if (prioridad === 'ALTA') return { label: 'Alta', variant: 'red', rank: 3 };
    if (prioridad === 'MEDIA') return { label: 'Media', variant: 'yellow', rank: 2 };
    if (prioridad === 'BAJA') return { label: 'Baja', variant: 'blue', rank: 1 };
    return { label: 'Cerrado', variant: 'gray', rank: 0 };
  };

  const sortedFilteredItems = [...filteredItems].sort((a, b) => {
    const prioridadA = getPrioridad(a).rank;
    const prioridadB = getPrioridad(b).rank;
    if (prioridadA !== prioridadB) {
      return prioridadB - prioridadA;
    }
    const fechaA = new Date(a.ultimaActividadFecha || a.fecha).getTime();
    const fechaB = new Date(b.ultimaActividadFecha || b.fecha).getTime();
    return fechaB - fechaA;
  });
  const totalCriticosFiltrados = sortedFilteredItems.filter((p) => calcularPrioridad(p) === 'CRITICA').length;

  const hayFiltrosActivos =
    search.trim().length > 0
    || estadoFiltro !== 'TODOS'
    || focoCaducidad !== 'TODOS'
    || prioridadFiltro !== 'TODAS'
    || colaHoy;

  const limpiarFiltros = () => {
    setSearch('');
    setEstadoFiltro('TODOS');
    setFocoCaducidad('TODOS');
    setPrioridadFiltro('TODAS');
    setColaHoy(false);
  };

  const labelPrioridad: Record<FiltroPrioridad, string> = {
    TODAS: 'Todas',
    CRITICA: 'Crítica',
    ALTA: 'Alta',
    MEDIA: 'Media',
    BAJA: 'Baja',
  };

  const labelCaducidad: Record<FiltroCaducidad, string> = {
    TODOS: 'Todos',
    POR_VENCER: 'Por vencer',
    CADUCADOS: 'Caducados',
  };

  const filtrosActivosTexto = [
    search.trim().length > 0 ? `Búsqueda: "${search.trim()}"` : null,
    colaHoy ? 'Vista: Mi cola hoy' : null,
    estadoFiltro !== 'TODOS' ? `Estado: ${estadoOptions.find((e) => e.key === estadoFiltro)?.label || estadoFiltro}` : null,
    focoCaducidad !== 'TODOS' ? `Caducidad: ${labelCaducidad[focoCaducidad]}` : null,
    prioridadFiltro !== 'TODAS' ? `Prioridad: ${labelPrioridad[prioridadFiltro]}` : null,
  ].filter(Boolean).join(' · ');

  const mensajeVacio = focoCaducidad === 'POR_VENCER'
    ? 'No hay presupuestos por vencer en los próximos 5 días con los filtros actuales.'
    : focoCaducidad === 'CADUCADOS'
      ? 'No hay presupuestos caducados con los filtros actuales.'
      : prioridadFiltro !== 'TODAS'
        ? `No hay presupuestos con prioridad ${labelPrioridad[prioridadFiltro].toLowerCase()} para los filtros actuales.`
        : 'No hay presupuestos para los filtros actuales';

  const columns = [
    { key: 'codigo', header: 'Código', render: (p: Presupuesto) => <span className="font-medium text-slate-600">{p.codigo}</span> },
    {
      key: 'oferta',
      header: 'Oferta',
      render: (p: Presupuesto) => (
        <span className="text-slate-700">{p.codigoOferta ? `${p.codigoOferta}${p.versionOferta ? ` · v${p.versionOferta}` : ''}` : '-'}</span>
      ),
    },
    { key: 'cliente', header: 'Cliente', render: (p: Presupuesto) => <span className="font-medium text-slate-800">{p.proyecto?.cliente?.nombre || p.proyecto?.nombre || '-'}</span> },
    { key: 'totalCliente', header: 'Total Cliente', className: 'text-right', render: (p: Presupuesto) => <span className="font-semibold text-slate-900">{formatCurrency(p.totalCliente)}</span> },
    { key: 'costeTotal', header: 'Coste Total', className: 'text-right', render: (p: Presupuesto) => <span className="font-medium text-slate-600">{formatCurrency(p.costeTotal)}</span> },
    {
      key: 'margenPorcentaje', header: 'Margen %', className: 'text-right', render: (p: Presupuesto) => (
        <span className={p.margenPorcentaje >= 20 ? 'text-emerald-600 font-medium' : p.margenPorcentaje >= 10 ? 'text-amber-600 font-medium' : 'text-red-600 font-medium'}>
          {p.margenPorcentaje.toFixed(1)}%
        </span>
      ),
    },
    {
      key: 'ultimaActividad',
      header: 'Última actividad',
      render: (p: Presupuesto) => {
        const actividad = getUltimaActividad(p);
        return (
          <div className="leading-tight" title={getResumenTrazabilidad(p)}>
            <p className="text-sm font-medium text-slate-800">{actividad.label}</p>
            <p className="text-xs text-slate-500">{formatDate(actividad.fecha)}</p>
          </div>
        );
      },
    },
    {
      key: 'prioridad',
      header: 'Prioridad',
      render: (p: Presupuesto) => {
        const prioridad = getPrioridad(p);
        return <Badge variant={prioridad.variant}>{prioridad.label}</Badge>;
      },
    },
    {
      key: 'caducidad',
      header: 'Caducidad',
      className: 'text-right',
      render: (p: Presupuesto) => {
        const caducidad = getCaducidad(p);
        return <span className={caducidad.className}>{caducidad.label}</span>;
      },
    },
    { key: 'estado', header: 'Estado', className: 'text-right', render: (p: Presupuesto) => <StatusBadge status={p.estado} /> },
    {
      key: 'actions', header: '', className: 'text-right', render: (p: Presupuesto) => (
        <div className="flex items-center justify-end gap-2">
          {p.estado === 'ENVIADO' && (
            <Button
              size="sm"
              variant="warning"
              disabled={accionRapidaLoading?.id === p.id}
              onClick={(e) => {
                e.stopPropagation();
                marcarSeguimiento(p);
              }}
            >
              {accionRapidaLoading?.id === p.id && accionRapidaLoading.tipo === 'SEGUIMIENTO' ? 'Marcando...' : 'Seguimiento'}
            </Button>
          )}
          {p.estado === 'BORRADOR' && (
            <Button
              size="sm"
              variant="secondary"
              disabled={accionRapidaLoading?.id === p.id}
              onClick={(e) => {
                e.stopPropagation();
                marcarEnviado(p);
              }}
            >
              {accionRapidaLoading?.id === p.id && accionRapidaLoading.tipo === 'ENVIAR' ? 'Enviando...' : 'Enviar'}
            </Button>
          )}
          {p.estado === 'NEGOCIACION' && (
            <>
              <Button
                size="sm"
                variant="success"
                disabled={accionRapidaLoading?.id === p.id || !p.snapshot?.fechaEmision}
                title={!p.snapshot?.fechaEmision ? 'Debes emitir oferta antes de aceptar' : undefined}
                onClick={(e) => {
                  e.stopPropagation();
                  marcarAceptado(p);
                }}
              >
                {accionRapidaLoading?.id === p.id && accionRapidaLoading.tipo === 'ACEPTAR' ? 'Aceptando...' : 'Aceptar'}
              </Button>
              <Button
                size="sm"
                variant="danger"
                disabled={accionRapidaLoading?.id === p.id}
                onClick={(e) => {
                  e.stopPropagation();
                  marcarRechazado(p);
                }}
              >
                {accionRapidaLoading?.id === p.id && accionRapidaLoading.tipo === 'RECHAZAR' ? 'Rechazando...' : 'Rechazar'}
              </Button>
            </>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/presupuestos/${p.id}`);
            }}
          >
            Abrir
          </Button>
        </div>
      ),
    },
  ];

  const abrirModalMotor = () => {
    const defaults = motorCatalogo?.defaults;
    setMotorForm((prev) => ({
      ...prev,
      proyectoId: proyectosData?.[0]?.id || 0,
      solucionId: motorCatalogo?.soluciones?.[0]?.id || 0,
      ivaPorcentaje: defaults?.ivaPorcentaje ?? 21,
      validezDias: defaults?.validezDias ?? 30,
    }));
    setModalMotorOpen(true);
  };

  const formularioMotorValido =
    motorForm.proyectoId > 0
    && motorForm.solucionId > 0
    && motorForm.numVehiculos > 0
    && motorForm.tipologiaVehiculo.trim().length > 0
    && motorForm.ivaPorcentaje >= 0
    && motorForm.ivaPorcentaje <= 100
    && motorForm.validezDias > 0;

  const crearPresupuestoMotor = async () => {
    if (!motorForm.proyectoId || !motorForm.solucionId || motorForm.numVehiculos <= 0) {
      toast.error('Completa proyecto, solución y nº de vehículos');
      return;
    }

    try {
      setCreandoMotor(true);
      const response = await api.post('/presupuestos/motor', {
        ...motorForm,
      });
      toast.success('Presupuesto motor creado');
      setModalMotorOpen(false);
      refetch();
      navigate(`/presupuestos/${response.data.id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al crear presupuesto motor');
    } finally {
      setCreandoMotor(false);
    }
  };

  const cambiarEstadoRapido = async (
    presupuesto: Presupuesto,
    estadoDestino: EstadoPresupuesto,
    tipo: TipoAccionRapida,
    mensajeExito: string
  ) => {
    const errorAccionRapida = (err: any) => {
      const status = err?.response?.status;
      const message = String(err?.response?.data?.error || err?.response?.data?.message || '');

      if (status === 409 && message.toLowerCase().includes('oferta')) {
        return 'No se puede aceptar sin oferta emitida. Emite la oferta primero.';
      }
      if (status === 409 && message.toLowerCase().includes('transición inválida')) {
        return 'El estado cambió mientras operabas. Recarga y vuelve a intentarlo.';
      }
      if (status === 404) {
        return 'El presupuesto ya no existe o no está disponible.';
      }

      return message || 'No se pudo actualizar el estado. Reintenta.';
    };

    try {
      setAccionRapidaLoading({ id: presupuesto.id, tipo });
      await api.patch(`/presupuestos/${presupuesto.id}/estado`, { estado: estadoDestino });
      toast.success(mensajeExito);
      refetch();
    } catch (err: any) {
      toast.error(errorAccionRapida(err));
    } finally {
      setAccionRapidaLoading(null);
    }
  };

  const marcarSeguimiento = async (presupuesto: Presupuesto) => {
    if (presupuesto.estado !== 'ENVIADO') return;
    const confirmado = confirm(`¿Pasar ${presupuesto.codigo} a negociación?`);
    if (!confirmado) return;
    await cambiarEstadoRapido(presupuesto, 'NEGOCIACION', 'SEGUIMIENTO', 'Presupuesto pasado a negociación');
  };

  const marcarEnviado = async (presupuesto: Presupuesto) => {
    if (presupuesto.estado !== 'BORRADOR') return;
    const confirmado = confirm(`¿Marcar ${presupuesto.codigo} como enviado?`);
    if (!confirmado) return;
    await cambiarEstadoRapido(presupuesto, 'ENVIADO', 'ENVIAR', 'Presupuesto marcado como enviado');
  };

  const marcarAceptado = async (presupuesto: Presupuesto) => {
    if (presupuesto.estado !== 'NEGOCIACION') return;
    if (!presupuesto.snapshot?.fechaEmision) {
      toast.error('Debes emitir oferta antes de aceptar');
      return;
    }
    const confirmado = confirm(`¿Aceptar ${presupuesto.codigo}? Esta acción disparará automatizaciones.`);
    if (!confirmado) return;
    await cambiarEstadoRapido(presupuesto, 'ACEPTADO', 'ACEPTAR', 'Presupuesto aceptado');
  };

  const marcarRechazado = async (presupuesto: Presupuesto) => {
    if (presupuesto.estado !== 'NEGOCIACION') return;
    const confirmado = confirm(`¿Marcar ${presupuesto.codigo} como rechazado?`);
    if (!confirmado) return;
    await cambiarEstadoRapido(presupuesto, 'RECHAZADO', 'RECHAZAR', 'Presupuesto rechazado');
  };

  const canManageTemplateModules = ['ADMINISTRADOR', 'DIRECCION'].includes(user?.perfil || '');

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Presupuestos</h1>
          <p className="text-[14px] text-slate-500 mt-1">Gestiona propuestas comerciales y su rentabilidad interna.</p>
        </div>
        <div className="flex items-center gap-2">
          {canManageTemplateModules && (
            <Button size="sm" variant="outline" onClick={() => navigate('/presupuestos/plantillas')}>
              Plantillas
            </Button>
          )}
          <Button size="sm" variant={mostrarMetricasComerciales ? 'secondary' : 'outline'} onClick={() => setMostrarMetricasComerciales((prev) => !prev)}>
            {mostrarMetricasComerciales ? 'Ocultar panel comercial' : 'Ver panel comercial'}
          </Button>
          <Button size="sm" variant="primary" onClick={abrirModalMotor}>
            <HiOutlinePlus className="w-4 h-4" />
            Nuevo Presupuesto
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <p className="text-xs text-slate-500 uppercase tracking-wide">Total presupuestos</p>
          <p className="text-2xl font-semibold mt-1 text-slate-900">{totalPresupuestos}</p>
        </Card>
        <Card>
          <p className="text-xs text-slate-500 uppercase tracking-wide">Borradores</p>
          <p className="text-2xl font-semibold mt-1 text-slate-900">{totalBorradores}</p>
        </Card>
        <Card>
          <p className="text-xs text-slate-500 uppercase tracking-wide">En curso</p>
          <p className="text-2xl font-semibold mt-1 text-slate-900">{totalEnviados}</p>
        </Card>
        <Card>
          <p className="text-xs text-slate-500 uppercase tracking-wide">Tasa éxito</p>
          <p className="text-2xl font-semibold mt-1 text-slate-900">{tasaExito.toFixed(1)}%</p>
        </Card>
        <Card>
          <p className="text-xs text-slate-500 uppercase tracking-wide">Críticos</p>
          <p className="text-2xl font-semibold mt-1 text-red-600">{totalCriticos}</p>
        </Card>
      </div>

      {mostrarMetricasComerciales && (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <p className="text-xs text-slate-500 uppercase tracking-wide">Conversión 30d</p>
          <p className="text-2xl font-semibold mt-1 text-slate-900">{conversion30.toFixed(1)}%</p>
        </Card>
        <Card>
          <p className="text-xs text-slate-500 uppercase tracking-wide">Conversión 90d</p>
          <p className="text-2xl font-semibold mt-1 text-slate-900">{conversion90.toFixed(1)}%</p>
        </Card>
        <Card>
          <p className="text-xs text-slate-500 uppercase tracking-wide">Enviado → Negociación</p>
          <p className="text-2xl font-semibold mt-1 text-slate-900">{conversionEnviadoANegociacion.toFixed(1)}%</p>
        </Card>
        <Card>
          <p className="text-xs text-slate-500 uppercase tracking-wide">Cierre ganado</p>
          <p className="text-2xl font-semibold mt-1 text-slate-900">{conversionNegociacionAAceptado.toFixed(1)}%</p>
        </Card>
        <Card>
          <p className="text-xs text-slate-500 uppercase tracking-wide">Resp. media</p>
          <p className="text-2xl font-semibold mt-1 text-slate-900">{tiempoMedioRespuestaDias.toFixed(1)}d</p>
          <p className="text-xs text-slate-500 mt-1">Mediana: {respuestaMedianaDias.toFixed(1)}d</p>
        </Card>
      </div>
      )}

      <Card>
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative max-w-md w-full">
            <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="Buscar por código, oferta, proyecto o cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-slate-50/50 border-slate-200 focus:bg-white"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={colaHoy ? 'primary' : 'outline'}
              onClick={() => setColaHoy((prev) => !prev)}
            >
              Trabajo de hoy
            </Button>
            <Button
              size="sm"
              variant={focoCaducidad === 'POR_VENCER' ? 'warning' : 'outline'}
              onClick={() => setFocoCaducidad((prev) => (prev === 'POR_VENCER' ? 'TODOS' : 'POR_VENCER'))}
            >
              Vence pronto (≤5d) · {totalPorVencer}
            </Button>
            <Button
              size="sm"
              variant={focoCaducidad === 'CADUCADOS' ? 'danger' : 'outline'}
              onClick={() => setFocoCaducidad((prev) => (prev === 'CADUCADOS' ? 'TODOS' : 'CADUCADOS'))}
            >
              Vencidos · {totalCaducados}
            </Button>
            {hayFiltrosActivos && (
              <Button size="sm" variant="outline" onClick={limpiarFiltros}>
                Limpiar
              </Button>
            )}
            <Button
              size="sm"
              variant={mostrarFiltrosAvanzados ? 'secondary' : 'outline'}
              onClick={() => setMostrarFiltrosAvanzados((prev) => !prev)}
            >
              {mostrarFiltrosAvanzados ? 'Ocultar avanzados' : 'Filtros avanzados'}
            </Button>
            <Button
              size="sm"
              variant={colaHoyPorDefecto ? 'secondary' : 'outline'}
              onClick={() => setColaHoyPorDefecto((prev) => !prev)}
            >
              {colaHoyPorDefecto ? 'Abrir en trabajo de hoy: Sí' : 'Abrir en trabajo de hoy: No'}
            </Button>
          </div>
        </div>

        <p className="mb-4 text-xs text-slate-500">Atajo recomendado: Trabajo de hoy → Vence pronto → Vencidos.</p>

        {mostrarFiltrosAvanzados && (
          <div className="mb-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
            <Button
              size="sm"
              variant={prioridadFiltro === 'CRITICA' ? 'danger' : 'outline'}
              onClick={() => setPrioridadFiltro((prev) => (prev === 'CRITICA' ? 'TODAS' : 'CRITICA'))}
            >
              Prioridad crítica
            </Button>
            <Button
              size="sm"
              variant={prioridadFiltro === 'ALTA' ? 'danger' : 'outline'}
              onClick={() => setPrioridadFiltro((prev) => (prev === 'ALTA' ? 'TODAS' : 'ALTA'))}
            >
              Prioridad alta
            </Button>
            <Button
              size="sm"
              variant={prioridadFiltro === 'MEDIA' ? 'warning' : 'outline'}
              onClick={() => setPrioridadFiltro((prev) => (prev === 'MEDIA' ? 'TODAS' : 'MEDIA'))}
            >
              Prioridad media
            </Button>
            <Button
              size="sm"
              variant={prioridadFiltro === 'BAJA' ? 'primary' : 'outline'}
              onClick={() => setPrioridadFiltro((prev) => (prev === 'BAJA' ? 'TODAS' : 'BAJA'))}
            >
              Prioridad baja
            </Button>
            {estadoOptions.map((estado) => (
              <Button
                key={estado.key}
                size="sm"
                variant={estadoFiltro === estado.key ? 'primary' : 'outline'}
                onClick={() => setEstadoFiltro(estado.key)}
              >
                {estado.label}
              </Button>
            ))}
          </div>
        )}

        <p className="mb-3 text-xs text-slate-500">
          Mostrando {sortedFilteredItems.length} de {items.length} presupuestos · Críticos: {totalCriticosFiltrados}
        </p>
        {hayFiltrosActivos && filtrosActivosTexto && (
          <p className="mb-3 text-xs text-slate-500">Filtros activos: {filtrosActivosTexto}</p>
        )}

        {!loading && filteredItems.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 p-10 text-center">
            <p className="text-sm font-medium text-slate-700">{mensajeVacio}</p>
            <p className="text-sm text-slate-500 mt-1">Ajusta búsqueda/estado o crea un nuevo presupuesto motor.</p>
            <div className="mt-4">
              <div className="flex items-center justify-center gap-2">
                {hayFiltrosActivos && <Button size="sm" variant="outline" onClick={limpiarFiltros}>Restablecer filtros</Button>}
                <Button size="sm" onClick={abrirModalMotor}>Crear presupuesto motor</Button>
              </div>
            </div>
          </div>
        ) : (
        <DataTable
          columns={columns}
          data={sortedFilteredItems}
          loading={loading}
          onRowClick={(p) => navigate(`/presupuestos/${p.id}`)}
          emptyMessage="No hay presupuestos registrados"
        />
        )}
      </Card>

      <Modal isOpen={modalMotorOpen} onClose={() => setModalMotorOpen(false)} title="Nuevo presupuesto motor" size="lg">
        <p className="text-sm text-slate-500 mb-4">Completa los datos mínimos para generar una oferta inicial automáticamente.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Proyecto</label>
            <select
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              value={motorForm.proyectoId}
              onChange={(e) => setMotorForm((prev) => ({ ...prev, proyectoId: Number(e.target.value) }))}
            >
              <option value={0}>Selecciona proyecto</option>
              {(proyectosData || []).map((p) => (
                <option key={p.id} value={p.id}>{p.codigo} · {p.nombre}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Solución</label>
            <select
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              value={motorForm.solucionId}
              onChange={(e) => setMotorForm((prev) => ({ ...prev, solucionId: Number(e.target.value) }))}
            >
              <option value={0}>Selecciona solución</option>
              {(motorCatalogo?.soluciones || []).map((s) => (
                <option key={s.id} value={s.id}>{s.nombre}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Nº vehículos</label>
            <Input
              type="number"
              min={1}
              value={motorForm.numVehiculos}
              onChange={(e) => setMotorForm((prev) => ({ ...prev, numVehiculos: Number(e.target.value) }))}
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Tipología</label>
            <Input
              value={motorForm.tipologiaVehiculo}
              onChange={(e) => setMotorForm((prev) => ({ ...prev, tipologiaVehiculo: e.target.value }))}
              className="mt-1"
              placeholder="12m / articulado / minibús..."
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Horario intervención</label>
            <select
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              value={motorForm.horarioIntervencion}
              onChange={(e) => setMotorForm((prev) => ({ ...prev, horarioIntervencion: e.target.value }))}
            >
              <option value="diurno">Diurno</option>
              <option value="nocturno">Nocturno</option>
              <option value="mixto">Mixto</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">IVA %</label>
            <Input
              type="number"
              min={0}
              max={100}
              value={motorForm.ivaPorcentaje}
              onChange={(e) => setMotorForm((prev) => ({ ...prev, ivaPorcentaje: Number(e.target.value) }))}
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Validez (días)</label>
            <Input
              type="number"
              min={1}
              value={motorForm.validezDias}
              onChange={(e) => setMotorForm((prev) => ({ ...prev, validezDias: Number(e.target.value) }))}
              className="mt-1"
            />
          </div>

          <div className="flex flex-col gap-2 pt-5">
            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={motorForm.piloto}
                onChange={(e) => setMotorForm((prev) => ({ ...prev, piloto: e.target.checked }))}
              />
              Incluye piloto
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={motorForm.nocturnidad}
                onChange={(e) => setMotorForm((prev) => ({ ...prev, nocturnidad: e.target.checked }))}
              />
              Nocturnidad
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={motorForm.integraciones}
                onChange={(e) => setMotorForm((prev) => ({ ...prev, integraciones: e.target.checked }))}
              />
              Integraciones
            </label>
          </div>
        </div>

        {!formularioMotorValido && (
          <p className="mt-4 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
            Revisa los campos obligatorios: proyecto, solución, nº vehículos, tipología, IVA y validez.
          </p>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setModalMotorOpen(false)} disabled={creandoMotor}>Cancelar</Button>
          <Button onClick={crearPresupuestoMotor} disabled={creandoMotor || !formularioMotorValido}>
            {creandoMotor ? 'Creando...' : 'Crear presupuesto'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
