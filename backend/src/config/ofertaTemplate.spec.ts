export type OfertaTemplateSectionKey =
  | 'CABECERA'
  | 'CLIENTE_ALCANCE'
  | 'PARTIDAS_ECONOMICAS'
  | 'TOTALES'
  | 'CONDICIONES_NOTAS';

export type OfertaTemplateSpec = {
  codigo: string;
  version: string;
  idioma: 'es-ES';
  secciones: OfertaTemplateSectionKey[];
  etiquetas: {
    tituloOferta: string;
    cliente: string;
    alcance: string;
    partidas: string;
    baseImponible: string;
    iva: string;
    totalConIva: string;
    condicionesNotas: string;
    proyecto: string;
    vehiculos: string;
  };
};

export type OfertaTemplateModuleKey =
  | 'RESUMEN_EJECUTIVO'
  | 'ALCANCE_TECNICO'
  | 'METODOLOGIA_PLAN'
  | 'SUPUESTOS'
  | 'EXCLUSIONES'
  | 'CONDICIONES_COMERCIALES'
  | 'CONDICIONES_ECONOMICAS'
  | 'GARANTIAS'
  | 'CONFIDENCIALIDAD'
  | 'ACEPTACION_FIRMA';

export type OfertaTemplateModule = {
  key: OfertaTemplateModuleKey;
  title: string;
  content: string;
  enabled: boolean;
  order: number;
};

export const OFERTA_TEMPLATE_SPEC_EMT_360_V2: OfertaTemplateSpec = {
  codigo: 'OFERTA_EMT_360_V2',
  version: '2.0.0',
  idioma: 'es-ES',
  secciones: [
    'CABECERA',
    'CLIENTE_ALCANCE',
    'PARTIDAS_ECONOMICAS',
    'TOTALES',
    'CONDICIONES_NOTAS',
  ],
  etiquetas: {
    tituloOferta: 'Oferta Técnica-Económica',
    cliente: 'Cliente',
    alcance: 'Alcance',
    partidas: 'Partidas económicas',
    baseImponible: 'Base imponible',
    iva: 'IVA',
    totalConIva: 'Total con IVA',
    condicionesNotas: 'Supuestos, exclusiones y notas',
    proyecto: 'Proyecto',
    vehiculos: 'Vehículos',
  },
};

export const OFERTA_TEMPLATE_SPEC_V1: OfertaTemplateSpec = {
  codigo: 'OFERTA_STD_V1',
  version: '1.0.0',
  idioma: 'es-ES',
  secciones: [
    'CABECERA',
    'CLIENTE_ALCANCE',
    'PARTIDAS_ECONOMICAS',
    'TOTALES',
    'CONDICIONES_NOTAS',
  ],
  etiquetas: {
    tituloOferta: 'Oferta',
    cliente: 'Cliente',
    alcance: 'Alcance',
    partidas: 'Partidas económicas',
    baseImponible: 'Base imponible',
    iva: 'IVA',
    totalConIva: 'Total con IVA',
    condicionesNotas: 'Condiciones y notas',
    proyecto: 'Proyecto',
    vehiculos: 'Vehículos',
  },
};

const OFERTA_TEMPLATE_MODULES_EMT_360_V2: OfertaTemplateModule[] = [
  {
    key: 'RESUMEN_EJECUTIVO',
    title: '1. Resumen ejecutivo',
    content: 'La presente oferta técnico-económica recoge el alcance de suministro, implantación y soporte inicial de la solución EMT 360 para la flota y centros operativos definidos por el Cliente.\n\nLos importes y condiciones incluidos en este documento constituyen una propuesta cerrada para los conceptos expresamente descritos en partidas y módulos documentales.',
    enabled: true,
    order: 10,
  },
  {
    key: 'ALCANCE_TECNICO',
    title: '2. Alcance técnico',
    content: 'El alcance técnico incluye, en los términos indicados en la oferta: suministro de equipamiento, materiales de instalación, mano de obra de implantación, parametrización, pruebas funcionales y entrega de documentación técnica de cierre.\n\nCualquier prestación no indicada de forma expresa en el presente documento se considerará fuera de alcance y requerirá valoración adicional.',
    enabled: true,
    order: 20,
  },
  {
    key: 'METODOLOGIA_PLAN',
    title: '3. Metodología y plan de ejecución',
    content: 'La ejecución se organizará en fases: (i) preparación y coordinación, (ii) despliegue en campo, (iii) validación funcional y (iv) cierre documental.\n\nLa planificación definitiva, hitos y ventanas de intervención se acordarán con el Cliente antes del inicio operativo, en coherencia con la disponibilidad de vehículos, cocheras y personal autorizado.',
    enabled: true,
    order: 30,
  },
  {
    key: 'SUPUESTOS',
    title: '4. Supuestos',
    content: 'La presente oferta se formula bajo los siguientes supuestos: acceso operativo a vehículos e instalaciones, disponibilidad de ventanas de trabajo acordadas, suministro eléctrico y condiciones de seguridad adecuadas, y designación de interlocutores técnicos por parte del Cliente.\n\nLa alteración sustancial de estos supuestos podrá implicar revisión de plazos y/o costes.',
    enabled: true,
    order: 40,
  },
  {
    key: 'EXCLUSIONES',
    title: '5. Exclusiones',
    content: 'Quedan excluidos del alcance: obras civiles, adecuaciones estructurales, legalizaciones administrativas no previstas, correcciones por patologías preexistentes y cualquier trabajo no identificado de forma explícita en las partidas económicas.\n\nLas actuaciones adicionales derivadas de cambios de alcance se presupuestarán y aprobarán por separado.',
    enabled: true,
    order: 50,
  },
  {
    key: 'CONDICIONES_COMERCIALES',
    title: '6. Condiciones comerciales',
    content: 'La validez de la oferta, los hitos de facturación y las condiciones de ejecución serán las establecidas en la propuesta comercial y en su aceptación por el Cliente.\n\nLos plazos indicados se consideran estimados y quedarán condicionados a la disponibilidad de materiales, accesos y planificación conjunta de los trabajos.',
    enabled: true,
    order: 60,
  },
  {
    key: 'CONDICIONES_ECONOMICAS',
    title: '7. Condiciones económicas',
    content: 'Los importes económicos incluidos en este documento corresponden exclusivamente a los conceptos descritos en partidas.\n\nLos elementos opcionales, cuando existan, no forman parte del total base de adjudicación y se activarán únicamente mediante aceptación expresa por parte del Cliente.',
    enabled: true,
    order: 70,
  },
  {
    key: 'GARANTIAS',
    title: '8. Garantías',
    content: 'Se aplicarán las garantías estándar de fabricante sobre suministros y la garantía de instalación conforme a normativa vigente y alcance contratado.\n\nQuedan excluidas de garantía las incidencias derivadas de uso inadecuado, manipulación por terceros no autorizados o condiciones operativas fuera de especificación.',
    enabled: true,
    order: 80,
  },
  {
    key: 'CONFIDENCIALIDAD',
    title: '9. Confidencialidad',
    content: 'La presente oferta, así como su contenido técnico y económico, tiene carácter confidencial.\n\nNinguna de las partes podrá divulgarla total o parcialmente sin autorización previa y por escrito de la otra parte, salvo obligación legal o requerimiento administrativo aplicable.',
    enabled: true,
    order: 90,
  },
  {
    key: 'ACEPTACION_FIRMA',
    title: '10. Aceptación de oferta',
    content: 'La firma del presente documento implica la aceptación del alcance, importes y condiciones aquí recogidos, así como de los anexos que, en su caso, formen parte integrante de la propuesta.\n\nCualquier modificación posterior deberá formalizarse por escrito y con aceptación de ambas partes.',
    enabled: true,
    order: 100,
  },
];

const OFERTA_TEMPLATE_MODULES_V1: OfertaTemplateModule[] = [
  {
    key: 'SUPUESTOS',
    title: 'Supuestos',
    content: 'Supuestos de ejecución y alcance del servicio.',
    enabled: true,
    order: 10,
  },
  {
    key: 'EXCLUSIONES',
    title: 'Exclusiones',
    content: 'Exclusiones y límites de la oferta.',
    enabled: true,
    order: 20,
  },
  {
    key: 'CONDICIONES_COMERCIALES',
    title: 'Condiciones comerciales',
    content: 'Condiciones generales de validez y contratación.',
    enabled: true,
    order: 30,
  },
];

const specsByCode: Record<string, OfertaTemplateSpec> = {
  [OFERTA_TEMPLATE_SPEC_V1.codigo]: OFERTA_TEMPLATE_SPEC_V1,
  [OFERTA_TEMPLATE_SPEC_EMT_360_V2.codigo]: OFERTA_TEMPLATE_SPEC_EMT_360_V2,
};

const modulesByCode: Record<string, OfertaTemplateModule[]> = {
  [OFERTA_TEMPLATE_SPEC_EMT_360_V2.codigo]: OFERTA_TEMPLATE_MODULES_EMT_360_V2,
  [OFERTA_TEMPLATE_SPEC_V1.codigo]: OFERTA_TEMPLATE_MODULES_V1,
};

export const OFERTA_TEMPLATE_CATALOG: OfertaTemplateSpec[] = [
  OFERTA_TEMPLATE_SPEC_EMT_360_V2,
  OFERTA_TEMPLATE_SPEC_V1,
];

export const OFERTA_TEMPLATE_DEFAULT_CODE = OFERTA_TEMPLATE_SPEC_EMT_360_V2.codigo;

export function resolveOfertaTemplateSpec(code?: string | null): OfertaTemplateSpec {
  if (!code) return OFERTA_TEMPLATE_SPEC_EMT_360_V2;
  return specsByCode[code] || OFERTA_TEMPLATE_SPEC_EMT_360_V2;
}

export function resolveOfertaTemplateModules(code?: string | null): OfertaTemplateModule[] {
  const resolvedCode = resolveOfertaTemplateSpec(code).codigo;
  const modules = modulesByCode[resolvedCode] || modulesByCode[OFERTA_TEMPLATE_DEFAULT_CODE] || [];
  return modules
    .map((module) => ({ ...module }))
    .sort((left, right) => left.order - right.order);
}
