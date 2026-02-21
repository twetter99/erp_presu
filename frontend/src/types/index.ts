// =====================================================
// TIPOS COMPARTIDOS - ERP Presu Frontend
// =====================================================

// --- Enums ---
export type PerfilUsuario = 'DIRECCION' | 'COMERCIAL' | 'OFICINA_TECNICA' | 'COMPRAS' | 'TECNICO_INSTALADOR' | 'ADMINISTRADOR';
export type RolEmpresa = 'CONTRATANTE' | 'PROPIETARIO_FLOTA' | 'OPERADOR' | 'PROPIETARIO_COCHERA';
export type TipoCombustible = 'DIESEL' | 'HIBRIDO' | 'ELECTRICO' | 'GAS_NATURAL' | 'HIDROGENO';
export type UnidadTrabajo = 'POR_BUS' | 'POR_HORA' | 'POR_VISITA' | 'POR_UNIDAD';
export type UnidadMaterial = 'UNIDAD' | 'METRO' | 'METRO_CUADRADO' | 'KILOGRAMO' | 'LITRO' | 'ROLLO' | 'CAJA' | 'BOLSA';
export type EstadoReplanteo = 'PENDIENTE' | 'REVISADO' | 'VALIDADO' | 'CANCELADO';
export type EstadoPresupuesto = 'BORRADOR' | 'ENVIADO' | 'NEGOCIACION' | 'ACEPTADO' | 'RECHAZADO' | 'EXPIRADO';
export type EstadoCompra = 'PENDIENTE' | 'PEDIDO' | 'RECIBIDO_PARCIAL' | 'RECIBIDO' | 'FACTURADO' | 'CANCELADO';
export type EstadoOrdenTrabajo = 'PLANIFICADA' | 'EN_CURSO' | 'PAUSADA' | 'COMPLETADA' | 'CANCELADA';
export type EstadoProyecto = 'REPLANTEO' | 'PRESUPUESTO' | 'ACEPTADO' | 'EN_EJECUCION' | 'COMPLETADO' | 'CANCELADO';
export type BloqueEconomico = 'A_SUMINISTRO_EQUIPOS' | 'B_MATERIALES_INSTALACION' | 'C_MANO_OBRA' | 'D_MANTENIMIENTO_1_3' | 'E_OPCIONALES_4_5';

// --- Entidades ---
export interface Usuario {
  id: number;
  firebaseUid?: string;
  nombre: string;
  apellidos: string;
  email: string;
  perfil: PerfilUsuario;
  telefono?: string;
  activo: boolean;
}

export interface Empresa {
  id: number;
  nombre: string;
  cif: string;
  direccion?: string;
  ciudad?: string;
  provincia?: string;
  cp?: string;
  telefono?: string;
  email?: string;
  web?: string;
  notas?: string;
  activa: boolean;
  contactos?: ContactoEmpresa[];
  cocheras?: Cochera[];
  _count?: { cocheras: number; contactos: number };
}

export interface ContactoEmpresa {
  id: number;
  empresaId: number;
  nombre: string;
  cargo?: string;
  telefono?: string;
  email?: string;
  principal: boolean;
}

export interface Cochera {
  id: number;
  nombre: string;
  direccion: string;
  ciudad?: string;
  provincia?: string;
  responsable?: string;
  telefonoResponsable?: string;
  horarioAcceso?: string;
  observacionesTecnicas?: string;
  empresaId: number;
  empresa?: { id: number; nombre: string };
}

export interface TipoAutobus {
  id: number;
  marca: string;
  modelo: string;
  longitud?: number;
  tipoCombustible: TipoCombustible;
  configuracionEspecial?: string;
  numPlazas?: number;
  notas?: string;
  activo: boolean;
  _count?: { plantillasTrabajos: number; plantillasMateriales: number };
}

export interface Trabajo {
  id: number;
  codigo: string;
  nombreComercial: string;
  descripcionTecnica?: string;
  unidad: UnidadTrabajo;
  tiempoEstandarHoras: number;
  numTecnicosRequeridos: number;
  precioVentaEstandar: number;
  costeInternoEstandar: number;
  categoria?: string;
  activo: boolean;
  checklistItems?: ChecklistItem[];
  _count?: { checklistItems: number };
}

export interface ChecklistItem {
  id: number;
  trabajoId: number;
  descripcion: string;
  orden: number;
  obligatorio: boolean;
}

export interface Material {
  id: number;
  sku: string;
  descripcion: string;
  categoria?: string;
  unidad: UnidadMaterial;
  proveedorHabitual?: string;
  costeMedio: number;
  precioEstandar: number;
  precioVenta: number;
  margenPersonalizado?: number | null;
  stockMinimo?: number;
  stockActual?: number;
  notas?: string;
  activo: boolean;
}

export interface Proyecto {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
  clienteId: number;
  comercialId?: number;
  estado: EstadoProyecto;
  fechaInicio?: string;
  fechaFinEstimada?: string;
  fechaFinReal?: string;
  notas?: string;
  cliente?: Empresa;
  comercial?: { id: number; nombre: string; apellidos: string };
  _count?: { replanteos: number; presupuestos: number; ordenesTrabajo: number };
}

export interface Replanteo {
  id: number;
  proyectoId: number;
  cocheraId: number;
  tipoAutobusId: number;
  numBuses: number;
  tecnicoResponsableId: number;
  fecha: string;
  estado: EstadoReplanteo;
  canalizacionesExistentes?: string;
  espaciosDisponibles?: string;
  tipoInstalacionPrevia?: string;
  senalesDisponibles?: string;
  necesidadSelladoTecho: boolean;
  complejidadEspecial?: string;
  observaciones?: string;
  proyecto?: { id: number; codigo: string; nombre: string };
  cochera?: Cochera;
  tipoAutobus?: TipoAutobus;
  tecnicoResponsable?: { id: number; nombre: string; apellidos: string };
  trabajos?: any[];
  materiales?: any[];
  fotos?: any[];
  _count?: { trabajos: number; materiales: number; fotos: number };
}

export interface Presupuesto {
  id: number;
  codigo: string;
  codigoOferta?: string;
  versionOferta?: number;
  proyectoId: number;
  replanteoId?: number;
  fecha: string;
  validezDias: number;
  estado: EstadoPresupuesto;
  confidencial?: boolean;
  textoConfidencialidad?: string;
  totalTrabajos: number;
  totalMateriales: number;
  totalDesplazamientos: number;
  descuentoPorcentaje: number;
  totalCliente: number;
  baseImponible?: number;
  ivaPorcentaje?: number;
  ivaImporte?: number;
  totalConIva?: number;
  precioUnitarioVehiculo?: number;
  totalBloqueA?: number;
  totalBloqueB?: number;
  totalBloqueC?: number;
  totalBloqueD?: number;
  totalBloqueE?: number;
  costeTrabajos: number;
  costeMateriales: number;
  costeDesplazamientos: number;
  costeTotal: number;
  margenBruto: number;
  margenPorcentaje: number;
  observacionesCliente?: string;
  observacionesInternas?: string;
  fechaEnvio?: string;
  fechaRespuesta?: string;
  ultimaActividadTipo?: 'ACEPTADO' | 'RECHAZADO' | 'RESPUESTA' | 'OFERTA_EMITIDA' | 'ENVIADO' | 'CREADO';
  ultimaActividadFecha?: string;
  proyecto?: any;
  replanteo?: any;
  contexto?: PresupuestoContexto;
  lineasMotor?: PresupuestoLineaMotor[];
  textos?: PresupuestoTexto[];
  snapshot?: PresupuestoSnapshot;
  lineasTrabajo?: any[];
  lineasMaterial?: any[];
  lineasDesplazamiento?: any[];
}

export interface PresupuestoContexto {
  id: number;
  presupuestoId: number;
  clienteOperativoId?: number;
  solucionId?: number;
  numVehiculos: number;
  tipologiaVehiculo?: string;
  fabricantesModelos?: string;
  piloto: boolean;
  horarioIntervencion?: string;
  nocturnidad: boolean;
  integraciones: boolean;
}

export interface PresupuestoLineaMotor {
  id: number;
  presupuestoId: number;
  bloque: BloqueEconomico;
  itemCatalogoId?: number;
  codigo: string;
  descripcion: string;
  unidad: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  costeUnitario: number;
  costeSubtotal: number;
  origen?: string;
  orden: number;
}

export interface PresupuestoTexto {
  id: number;
  presupuestoId: number;
  tipo: string;
  titulo: string;
  contenido: string;
  orden: number;
}

export interface PresupuestoSnapshot {
  id: number;
  presupuestoId: number;
  fechaEmision: string;
  versionOferta: number;
}

export interface PresupuestoVersionItem {
  id: number;
  codigo: string;
  codigoOferta?: string | null;
  versionOferta?: number | null;
  estado: EstadoPresupuesto;
  fecha: string;
  totalCliente: number;
  totalConIva?: number | null;
  snapshot?: {
    fechaEmision: string;
    versionOferta: number;
  } | null;
}

export interface PresupuestoVersionesResponse {
  familiaCodigoOferta: string | null;
  totalVersiones: number;
  versiones: PresupuestoVersionItem[];
}

export interface PresupuestoImpactoAceptacion {
  presupuestoId: number;
  estado: EstadoPresupuesto;
  compras: Array<{
    id: number;
    codigo: string;
    proveedor: string;
    estado: EstadoCompra;
    fechaSolicitud: string;
  }>;
  ordenesTrabajo: Array<{
    id: number;
    codigo: string;
    estado: EstadoOrdenTrabajo;
    fechaPlanificada?: string | null;
    createdAt: string;
  }>;
  resumen: {
    totalCompras: number;
    totalOrdenesTrabajo: number;
  };
}

export interface EmisionCheck {
  key: string;
  label: string;
  ok: boolean;
  required: boolean;
}

export interface EmisionValidacion {
  ready: boolean;
  checks: EmisionCheck[];
  pendientes: EmisionCheck[];
}

export interface SolicitudCompra {
  id: number;
  codigo: string;
  proyectoId: number;
  proveedor: string;
  estado: EstadoCompra;
  fechaSolicitud: string;
  fechaPedido?: string;
  fechaRecepcion?: string;
  numPedido?: string;
  numFactura?: string;
  observaciones?: string;
  proyecto?: { id: number; codigo: string; nombre: string };
  lineas?: any[];
  _count?: { lineas: number };
}

export interface OrdenTrabajo {
  id: number;
  codigo: string;
  proyectoId: number;
  cocheraId: number;
  estado: EstadoOrdenTrabajo;
  fechaPlanificada?: string;
  fechaInicio?: string;
  fechaFin?: string;
  observaciones?: string;
  actaFirmada: boolean;
  proyecto?: any;
  cochera?: Cochera;
  tecnicos?: any[];
  lineas?: any[];
  materiales?: any[];
  checklist?: any[];
  fotos?: any[];
  _count?: { tecnicos: number; lineas: number; materiales: number };
}

// --- Dashboard ---
export interface DashboardData {
  proyectos: { total: number; activos: number };
  presupuestos: { pendientes: number; aceptados: number };
  ordenesTrabajo: { activas: number };
  compras: { pendientes: number };
  financiero: {
    facturacionTotal: number;
    costeTotal: number;
    margenBrutoTotal: number;
    margenMedioPorcentaje: number;
  };
}
