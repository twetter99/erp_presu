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
  proyectoId: number;
  replanteoId?: number;
  fecha: string;
  validezDias: number;
  estado: EstadoPresupuesto;
  totalTrabajos: number;
  totalMateriales: number;
  totalDesplazamientos: number;
  descuentoPorcentaje: number;
  totalCliente: number;
  costeTrabajos: number;
  costeMateriales: number;
  costeDesplazamientos: number;
  costeTotal: number;
  margenBruto: number;
  margenPorcentaje: number;
  observacionesCliente?: string;
  observacionesInternas?: string;
  proyecto?: any;
  replanteo?: any;
  lineasTrabajo?: any[];
  lineasMaterial?: any[];
  lineasDesplazamiento?: any[];
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
