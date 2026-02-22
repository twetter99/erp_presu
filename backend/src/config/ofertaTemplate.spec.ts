export type OfertaTemplateSectionKey =
  | 'PORTADA'
  | 'CONFIDENCIALIDAD'
  | 'RESUMEN_EJECUTIVO'
  | 'ALCANCE_TECNICO'
  | 'ARQUITECTURA_FUNCIONAL'
  | 'METODOLOGIA'
  | 'PLANIFICACION_METRICAS'
  | 'EXPERIENCIA_RELEVANTE'
  | 'ECONOMICA'
  | 'SUPUESTOS'
  | 'EXCLUSIONES'
  | 'FIRMA'
  | 'ANEXOS';

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
  | 'ARQUITECTURA_FUNCIONAL'
  | 'METODOLOGIA_PLAN'
  | 'METRICAS_PLANIFICACION'
  | 'EXPERIENCIA_RELEVANTE'
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
    'PORTADA',
    'CONFIDENCIALIDAD',
    'RESUMEN_EJECUTIVO',
    'ALCANCE_TECNICO',
    'ARQUITECTURA_FUNCIONAL',
    'METODOLOGIA',
    'PLANIFICACION_METRICAS',
    'EXPERIENCIA_RELEVANTE',
    'ECONOMICA',
    'SUPUESTOS',
    'EXCLUSIONES',
    'FIRMA',
    'ANEXOS',
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
    'PORTADA',
    'CONFIDENCIALIDAD',
    'RESUMEN_EJECUTIVO',
    'ALCANCE_TECNICO',
    'ARQUITECTURA_FUNCIONAL',
    'METODOLOGIA',
    'PLANIFICACION_METRICAS',
    'EXPERIENCIA_RELEVANTE',
    'ECONOMICA',
    'SUPUESTOS',
    'EXCLUSIONES',
    'FIRMA',
    'ANEXOS',
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
    key: 'ARQUITECTURA_FUNCIONAL',
    title: '4. Arquitectura funcional',
    content: 'La arquitectura funcional propuesta contempla subsistemas de captura, comunicaciones, supervisión y explotación operativa. Se define una topología modular orientada a escalabilidad, mantenibilidad y continuidad de servicio, con trazabilidad integral de eventos y actuaciones.',
    enabled: true,
    order: 35,
  },
  {
    key: 'METRICAS_PLANIFICACION',
    title: '5. Métricas de instalación y planificación',
    content: 'Se establecen métricas de ejecución vinculadas a volumen de activos, productividad por fase, hitos de aceptación y cumplimiento de ventanas operativas. El seguimiento se realizará mediante actas de avance y control de riesgos.',
    enabled: true,
    order: 45,
  },
  {
    key: 'EXPERIENCIA_RELEVANTE',
    title: '6. Experiencia relevante',
    content: 'EMT 360 acredita experiencia en despliegues de soluciones técnicas embarcadas, integración operativa y ejecución en entornos de alta exigencia de disponibilidad. La metodología propuesta incorpora lecciones aprendidas y estándares de calidad en proyectos comparables.',
    enabled: true,
    order: 55,
  },
  {
    key: 'SUPUESTOS',
    title: '7. Supuestos',
    content: 'Acceso operativo a instalaciones y activos según planificación acordada | Revisión conjunta de hitos ante restricciones de acceso\nDisponibilidad de interlocutor técnico designado por el Cliente | Validación semanal de avances y dependencias\nCondiciones de seguridad y energía conforme normativa vigente | Ajustes documentados mediante control de cambios',
    enabled: true,
    order: 70,
  },
  {
    key: 'EXCLUSIONES',
    title: '8. Exclusiones',
    content: 'Obra civil, adecuaciones estructurales y legalizaciones no incluidas en partidas | Se tramitarán mediante anexo económico específico\nActuaciones por patologías preexistentes o elementos no inventariados | Requieren aprobación previa por variación de alcance\nIntervenciones de terceros no autorizados durante periodo de garantía | Fuera de cobertura contractual',
    enabled: true,
    order: 80,
  },
  {
    key: 'CONDICIONES_COMERCIALES',
    title: '9. Condiciones comerciales',
    content: 'La validez de la oferta, los hitos de facturación y las condiciones de ejecución serán las establecidas en la propuesta comercial y en su aceptación por el Cliente.\n\nLos plazos indicados se consideran estimados y quedarán condicionados a la disponibilidad de materiales, accesos y planificación conjunta de los trabajos.',
    enabled: true,
    order: 90,
  },
  {
    key: 'CONDICIONES_ECONOMICAS',
    title: '10. Condiciones económicas',
    content: 'Los importes económicos incluidos en este documento corresponden exclusivamente a los conceptos descritos en partidas.\n\nLos elementos opcionales, cuando existan, no forman parte del total base de adjudicación y se activarán únicamente mediante aceptación expresa por parte del Cliente.',
    enabled: true,
    order: 100,
  },
  {
    key: 'GARANTIAS',
    title: '11. Garantías',
    content: 'Se aplicarán las garantías estándar de fabricante sobre suministros y la garantía de instalación conforme a normativa vigente y alcance contratado.\n\nQuedan excluidas de garantía las incidencias derivadas de uso inadecuado, manipulación por terceros no autorizados o condiciones operativas fuera de especificación.',
    enabled: true,
    order: 110,
  },
  {
    key: 'CONFIDENCIALIDAD',
    title: '2. Confidencialidad',
    content: 'La presente oferta, así como su contenido técnico y económico, tiene carácter confidencial.\n\nNinguna de las partes podrá divulgarla total o parcialmente sin autorización previa y por escrito de la otra parte, salvo obligación legal o requerimiento administrativo aplicable.',
    enabled: true,
    order: 20,
  },
  {
    key: 'ACEPTACION_FIRMA',
    title: '12. Aceptación de oferta',
    content: 'La firma del presente documento implica la aceptación del alcance, importes y condiciones aquí recogidos, así como de los anexos que, en su caso, formen parte integrante de la propuesta.\n\nCualquier modificación posterior deberá formalizarse por escrito y con aceptación de ambas partes.',
    enabled: true,
    order: 120,
  },
];

const OFERTA_TEMPLATE_MODULES_V1: OfertaTemplateModule[] = [
  {
    key: 'RESUMEN_EJECUTIVO',
    title: '1. Resumen ejecutivo',
    content: 'Resumen ejecutivo de alcance, valor y plazo de la propuesta técnico-económica.',
    enabled: true,
    order: 10,
  },
  {
    key: 'CONFIDENCIALIDAD',
    title: '2. Confidencialidad',
    content: 'Documento confidencial para uso exclusivo del proceso de evaluación y licitación.',
    enabled: true,
    order: 20,
  },
  {
    key: 'ALCANCE_TECNICO',
    title: '3. Alcance técnico',
    content: 'Definición del alcance técnico de suministro, implantación y validación.',
    enabled: true,
    order: 30,
  },
  {
    key: 'ARQUITECTURA_FUNCIONAL',
    title: '4. Arquitectura funcional',
    content: 'Descripción funcional de la solución propuesta y su integración operativa.',
    enabled: true,
    order: 40,
  },
  {
    key: 'METODOLOGIA_PLAN',
    title: '5. Metodología',
    content: 'Metodología de ejecución por fases con control de hitos y calidad.',
    enabled: true,
    order: 50,
  },
  {
    key: 'METRICAS_PLANIFICACION',
    title: '6. Planificación y métricas',
    content: 'Métricas de instalación y planificación del despliegue.',
    enabled: true,
    order: 60,
  },
  {
    key: 'EXPERIENCIA_RELEVANTE',
    title: '7. Experiencia relevante',
    content: 'Referencias y experiencia en proyectos comparables.',
    enabled: true,
    order: 70,
  },
  {
    key: 'SUPUESTOS',
    title: '8. Supuestos',
    content: 'Supuesto operativo principal | Tratamiento asociado',
    enabled: true,
    order: 80,
  },
  {
    key: 'EXCLUSIONES',
    title: '9. Exclusiones',
    content: 'Exclusión principal | Tratamiento asociado',
    enabled: true,
    order: 90,
  },
  {
    key: 'CONDICIONES_COMERCIALES',
    title: '10. Condiciones comerciales',
    content: 'Condiciones generales de validez y contratación.',
    enabled: true,
    order: 100,
  },
  {
    key: 'CONDICIONES_ECONOMICAS',
    title: '11. Condiciones económicas',
    content: 'Condiciones económicas de aplicación sobre base adjudicación y opcionales.',
    enabled: true,
    order: 110,
  },
  {
    key: 'ACEPTACION_FIRMA',
    title: '12. Aceptación de oferta',
    content: 'La aceptación formal de la propuesta requiere firma de ambas partes.',
    enabled: true,
    order: 120,
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
