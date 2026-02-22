import { resolveOfertaTemplateSpec } from '../config/ofertaTemplate.spec';

type OfertaLinea = {
  bloque: string;
  codigo: string;
  descripcion: string;
  unidad: string;
  cantidad: number;
  precio: number;
  subtotal: number;
};

type BuildOfertaPayloadArgs = {
  presupuesto: any;
  codigoOferta: string;
  versionOferta: number;
  fechaEmisionIso: string;
  templateCode?: string | null;
  anexosTecnicos?: Array<{ titulo: string; url: string; orden: number }>;
  modulosDocumento?: Array<{ key: string; title: string; content: string; enabled: boolean; order: number }>;
};

type BuildOfertaHtmlArgs = {
  presupuesto: any;
  templateCode?: string | null;
  anexosTecnicos?: Array<{ titulo: string; url: string; orden: number }>;
  modulosDocumento?: Array<{ key: string; title: string; content: string; enabled: boolean; order: number }>;
};

type OfertaEconomico = {
  baseImponible: number;
  ivaPorcentaje: number;
  ivaImporte: number;
  totalConIva: number;
  precioUnitarioVehiculo: number;
  baseAdjudicacion: number;
  opcionalTotal: number;
  totalPropuesta: number;
  totalesBloque: {
    A: number;
    B: number;
    C: number;
    D: number;
    E: number;
  };
  porcentajesBloque: {
    A: number;
    B: number;
    C: number;
    D: number;
    E: number;
  };
  precioUnitarioDetalle: {
    baseAdjudicacion: number;
    opcional: number;
    totalSinIva: number;
    iva: number;
    totalConIva: number;
    numeroVehiculos: number;
  };
  totalDesplazamientos: number;
  totalOpcionales: number;
};

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeHtmlWithBreaks(value: unknown): string {
  return escapeHtml(value).replace(/\r?\n/g, '<br/>');
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value || 0);
}

function roundCurrency(value: number): number {
  return Math.round((value || 0) * 100) / 100;
}

function formatPercent(value: number): string {
  return `${new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value || 0)}%`;
}

function buildOfertaLineas(presupuesto: any): OfertaLinea[] {
  if (presupuesto.lineasMotor.length > 0) {
    return presupuesto.lineasMotor.map((l: any) => ({
      bloque: l.bloque,
      codigo: l.codigo,
      descripcion: l.descripcion,
      unidad: l.unidad,
      cantidad: l.cantidad,
      precio: l.precioUnitario,
      subtotal: l.subtotal,
    }));
  }

  return [
    ...presupuesto.lineasTrabajo.map((l: any) => ({
      bloque: 'C_MANO_OBRA',
      codigo: `TRB-${l.trabajoId}`,
      descripcion: l.descripcionCliente || 'Trabajo',
      unidad: 'UD',
      cantidad: l.cantidad,
      precio: l.precioUnitarioCliente,
      subtotal: l.totalCliente,
    })),
    ...presupuesto.lineasMaterial.map((l: any) => ({
      bloque: 'B_MATERIALES_INSTALACION',
      codigo: `MAT-${l.materialId}`,
      descripcion: l.descripcionCliente || 'Material',
      unidad: 'UD',
      cantidad: l.cantidad,
      precio: l.precioUnitarioCliente,
      subtotal: l.totalCliente,
    })),
    ...presupuesto.lineasDesplazamiento.map((l: any) => ({
      bloque: 'DESPLAZAMIENTO',
      codigo: 'DSP',
      descripcion: l.descripcion || 'Desplazamiento',
      unidad: 'UD',
      cantidad: 1,
      precio: l.precioCliente,
      subtotal: l.precioCliente,
    })),
  ];
}

function sumBloque(lineas: OfertaLinea[], bloque: string): number {
  return roundCurrency(
    lineas
      .filter((linea) => linea.bloque === bloque)
      .reduce((sum, linea) => sum + (linea.subtotal || 0), 0)
  );
}

function resolveOfertaEconomico(presupuesto: any, lineas: OfertaLinea[]): OfertaEconomico {
  const totalA = presupuesto.totalBloqueA > 0 ? presupuesto.totalBloqueA : sumBloque(lineas, 'A_SUMINISTRO_EQUIPOS');
  const totalB = presupuesto.totalBloqueB > 0 ? presupuesto.totalBloqueB : sumBloque(lineas, 'B_MATERIALES_INSTALACION');
  const totalC = presupuesto.totalBloqueC > 0 ? presupuesto.totalBloqueC : sumBloque(lineas, 'C_MANO_OBRA');
  const totalD = presupuesto.totalBloqueD > 0 ? presupuesto.totalBloqueD : sumBloque(lineas, 'D_MANTENIMIENTO_1_3');
  const totalE = presupuesto.totalBloqueE > 0 ? presupuesto.totalBloqueE : sumBloque(lineas, 'E_OPCIONALES_4_5');
  const totalDesplazamientos = sumBloque(lineas, 'DESPLAZAMIENTO');

  const baseAdjudicacion = roundCurrency(totalA + totalB + totalC + totalD + totalDesplazamientos);
  const opcionalTotal = roundCurrency(totalE);
  const totalPropuesta = roundCurrency(baseAdjudicacion + opcionalTotal);

  const baseImponible = roundCurrency(
    presupuesto.baseImponible > 0
      ? presupuesto.baseImponible
      : (presupuesto.totalCliente > 0
          ? presupuesto.totalCliente
          : baseAdjudicacion)
  );

  const ivaPorcentaje = typeof presupuesto.ivaPorcentaje === 'number' ? presupuesto.ivaPorcentaje : 21;
  const ivaImporte = roundCurrency(
    presupuesto.ivaImporte > 0
      ? presupuesto.ivaImporte
      : (baseImponible * ivaPorcentaje) / 100
  );

  const totalConIva = roundCurrency(
    presupuesto.totalConIva > 0
      ? presupuesto.totalConIva
      : baseImponible + ivaImporte
  );

  const numVehiculos = presupuesto.contexto?.numVehiculos || 0;
  const divisorVehiculos = numVehiculos > 0 ? numVehiculos : 1;

  const precioUnitarioDetalle = {
    baseAdjudicacion: roundCurrency(baseAdjudicacion / divisorVehiculos),
    opcional: roundCurrency(opcionalTotal / divisorVehiculos),
    totalSinIva: roundCurrency(totalPropuesta / divisorVehiculos),
    iva: roundCurrency(((totalPropuesta * ivaPorcentaje) / 100) / divisorVehiculos),
    totalConIva: roundCurrency(((totalPropuesta * (1 + ivaPorcentaje / 100))) / divisorVehiculos),
    numeroVehiculos: numVehiculos,
  };

  const precioUnitarioVehiculo = roundCurrency(
    presupuesto.precioUnitarioVehiculo > 0
      ? presupuesto.precioUnitarioVehiculo
      : precioUnitarioDetalle.totalSinIva
  );

  const porcentajeSobreBase = (importe: number) => roundCurrency(baseImponible > 0 ? (importe / baseImponible) * 100 : 0);

  return {
    baseImponible,
    ivaPorcentaje,
    ivaImporte,
    totalConIva,
    precioUnitarioVehiculo,
    baseAdjudicacion,
    opcionalTotal,
    totalPropuesta,
    totalesBloque: {
      A: roundCurrency(totalA),
      B: roundCurrency(totalB),
      C: roundCurrency(totalC),
      D: roundCurrency(totalD),
      E: roundCurrency(totalE),
    },
    porcentajesBloque: {
      A: porcentajeSobreBase(totalA),
      B: porcentajeSobreBase(totalB),
      C: porcentajeSobreBase(totalC),
      D: porcentajeSobreBase(totalD),
      E: porcentajeSobreBase(totalE),
    },
    precioUnitarioDetalle,
    totalDesplazamientos,
    totalOpcionales: opcionalTotal,
  };
}

function parseModuleTableRows(content: string | undefined, codePrefix: string, fallbackRows: string[]) {
  const sourceRows = (content || '')
    .split(/\r?\n/)
    .map((row) => row.trim())
    .filter(Boolean);

  const rows = sourceRows.length > 0 ? sourceRows : fallbackRows;

  return rows.map((row, index) => {
    const [descripcionRaw, condicionRaw] = row.split('|').map((part) => part.trim());
    return {
      code: `${codePrefix}-${String(index + 1).padStart(2, '0')}`,
      descripcion: descripcionRaw || row,
      condicion: condicionRaw || '-',
    };
  });
}

function buildResumenEjecutivo(presupuesto: any, economico: OfertaEconomico, moduleContent?: string) {
  const alcance = presupuesto.contexto?.objetivoProyecto
    || presupuesto.contexto?.tipologiaVehiculo
    || presupuesto.proyecto?.nombre
    || 'Implantación integral de la solución técnico-funcional definida en alcance.';

  const valor = `Base adjudicación ${formatCurrency(economico.baseAdjudicacion)}${economico.opcionalTotal > 0 ? ` + opcionales ${formatCurrency(economico.opcionalTotal)}` : ''}.`;

  const plazoMeses = presupuesto.contexto?.plazoMeses || presupuesto.contexto?.plazo || 'A definir en planificación conjunta';
  const plazo = `Ejecución prevista: ${plazoMeses}${typeof plazoMeses === 'number' ? ' meses' : ''}.`;

  return {
    alcance,
    valor,
    plazo,
    narrativa: moduleContent || 'La presente propuesta técnico-económica se formula para licitación pública, con alcance, metodología, planificación, experiencia y estructura económica auditables conforme al estándar corporativo.',
  };
}

function resolveModule(modules: Array<{ key: string; title: string; content: string; enabled: boolean; order: number }>, key: string) {
  return modules.find((module) => module.key === key && module.enabled);
}

function renderLineasTable(lineas: OfertaLinea[]) {
  if (lineas.length === 0) {
    return '<p class="muted">No hay partidas en este bloque.</p>';
  }

  return `<table>
    <thead>
      <tr>
        <th style="width:15%;">Código</th>
        <th style="width:41%;">Descripción</th>
        <th style="width:8%;">Unidad</th>
        <th style="width:12%;" class="right">Cantidad</th>
        <th style="width:12%;" class="right">Precio</th>
        <th style="width:12%;" class="right">Subtotal</th>
      </tr>
    </thead>
    <tbody>
      ${lineas.map((linea) => `<tr><td>${escapeHtml(linea.codigo)}</td><td>${escapeHtml(linea.descripcion)}</td><td>${escapeHtml(linea.unidad)}</td><td class="right">${escapeHtml(linea.cantidad)}</td><td class="right">${escapeHtml(formatCurrency(linea.precio))}</td><td class="right">${escapeHtml(formatCurrency(linea.subtotal))}</td></tr>`).join('')}
    </tbody>
  </table>`;
}

function renderSupExcTable(title: string, rows: Array<{ code: string; descripcion: string; condicion: string }>) {
  return `<section class="section">
    <h2 class="section-title">${escapeHtml(title)}</h2>
    <table>
      <thead>
        <tr><th style="width:16%;">Código</th><th style="width:54%;">Descripción</th><th style="width:30%;">Condición / tratamiento</th></tr>
      </thead>
      <tbody>
        ${rows.map((row) => `<tr><td><strong>${escapeHtml(row.code)}</strong></td><td>${escapeHtml(row.descripcion)}</td><td>${escapeHtml(row.condicion)}</td></tr>`).join('')}
      </tbody>
    </table>
  </section>`;
}

export function buildOfertaPayload({ presupuesto, codigoOferta, versionOferta, fechaEmisionIso, templateCode, anexosTecnicos = [], modulosDocumento = [] }: BuildOfertaPayloadArgs) {
  const templateSpec = resolveOfertaTemplateSpec(templateCode);
  const lineas = buildOfertaLineas(presupuesto);
  const economico = resolveOfertaEconomico(presupuesto, lineas);
  const lineasOpcionales = lineas.filter((linea) => linea.bloque === 'E_OPCIONALES_4_5');

  return {
    template: {
      codigo: templateSpec.codigo,
      version: templateSpec.version,
      secciones: templateSpec.secciones,
    },
    cabecera: {
      presupuestoId: presupuesto.id,
      codigo: presupuesto.codigo,
      codigoOferta,
      versionOferta,
      fechaEmision: fechaEmisionIso,
      templateCode: templateSpec.codigo,
      cliente: presupuesto.proyecto?.cliente?.nombre || null,
      proyecto: presupuesto.proyecto?.nombre || null,
      validezDias: presupuesto.validezDias,
    },
    contexto: presupuesto.contexto,
    economico,
    documento: {
      tipo: 'OFERTA_TEC_ECON_LICITACION',
      estructura: [
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
      versionEstructura: '3.0.0',
    },
    lineas: {
      motor: presupuesto.lineasMotor,
      trabajo: presupuesto.lineasTrabajo,
      material: presupuesto.lineasMaterial,
      desplazamiento: presupuesto.lineasDesplazamiento,
      opcionales: lineasOpcionales,
      bloques: {
        A: lineas.filter((linea) => linea.bloque === 'A_SUMINISTRO_EQUIPOS'),
        B: lineas.filter((linea) => linea.bloque === 'B_MATERIALES_INSTALACION'),
        C: lineas.filter((linea) => linea.bloque === 'C_MANO_OBRA'),
        D: lineas.filter((linea) => linea.bloque === 'D_MANTENIMIENTO_1_3'),
        E: lineas.filter((linea) => linea.bloque === 'E_OPCIONALES_4_5'),
      },
    },
    opcionales: {
      totalOpcionales: economico.totalOpcionales,
      incluidosEnTotal: false,
    },
    modulosDocumento: modulosDocumento.filter((module) => module.enabled),
    anexosTecnicos,
  };
}

export function buildOfertaHtmlDocument({ presupuesto, templateCode, anexosTecnicos = [], modulosDocumento = [] }: BuildOfertaHtmlArgs): string {
  const lineas = buildOfertaLineas(presupuesto);
  const economico = resolveOfertaEconomico(presupuesto, lineas);
  const templateSpec = resolveOfertaTemplateSpec(templateCode);
  const labels = templateSpec.etiquetas;
  const modulosVisibles = modulosDocumento
    .filter((module) => module.enabled)
    .sort((left, right) => left.order - right.order);
  const moduloResumen = resolveModule(modulosVisibles, 'RESUMEN_EJECUTIVO');
  const moduloAlcance = resolveModule(modulosVisibles, 'ALCANCE_TECNICO');
  const moduloArquitectura = resolveModule(modulosVisibles, 'ARQUITECTURA_FUNCIONAL');
  const moduloMetodologia = resolveModule(modulosVisibles, 'METODOLOGIA_PLAN');
  const moduloMetricas = resolveModule(modulosVisibles, 'METRICAS_PLANIFICACION');
  const moduloExperiencia = resolveModule(modulosVisibles, 'EXPERIENCIA_RELEVANTE');
  const moduloSupuestos = resolveModule(modulosVisibles, 'SUPUESTOS');
  const moduloExclusiones = resolveModule(modulosVisibles, 'EXCLUSIONES');
  const moduloAceptacion = resolveModule(modulosVisibles, 'ACEPTACION_FIRMA');
  const moduloConfidencialidad = resolveModule(modulosVisibles, 'CONFIDENCIALIDAD');
  const moduloCondicionesEconomicas = resolveModule(modulosVisibles, 'CONDICIONES_ECONOMICAS');
  const fechaDocumento = presupuesto.snapshot?.fechaEmision || presupuesto.fecha;
  const fechaDocumentoFmt = new Date(fechaDocumento).toLocaleDateString('es-ES');

  const lineasA = lineas.filter((linea) => linea.bloque === 'A_SUMINISTRO_EQUIPOS');
  const lineasB = lineas.filter((linea) => linea.bloque === 'B_MATERIALES_INSTALACION');
  const lineasC = lineas.filter((linea) => linea.bloque === 'C_MANO_OBRA');
  const lineasD = lineas.filter((linea) => linea.bloque === 'D_MANTENIMIENTO_1_3');
  const lineasE = lineas.filter((linea) => linea.bloque === 'E_OPCIONALES_4_5');

  const resumenEjecutivo = buildResumenEjecutivo(presupuesto, economico, moduloResumen?.content);

  const metricas = {
    vehiculos: presupuesto.contexto?.numVehiculos || 0,
    lineasInstalacion: lineasA.length + lineasB.length + lineasC.length,
    totalPartidas: lineas.length,
    plazo: presupuesto.contexto?.plazoMeses || presupuesto.contexto?.plazo || 'A definir en planificación de arranque',
    hitos: presupuesto.contexto?.hitos || 'Ingeniería de detalle · Implantación · Pruebas de aceptación · Cierre documental',
  };

  const supuestosRows = parseModuleTableRows(moduloSupuestos?.content, 'SUP', [
    'Disponibilidad de vehículos e instalaciones en ventanas acordadas|Coordinación semanal con interlocutor del Cliente',
    'Acceso eléctrico y condiciones de seguridad según normativa vigente|Cualquier desviación se tramitará como incidencia de alcance',
    'Interlocutor técnico designado para validaciones parciales y finales|Actas de avance por hito',
  ]);

  const exclusionesRows = parseModuleTableRows(moduloExclusiones?.content, 'EXC', [
    'Obra civil, adecuaciones estructurales y legalizaciones no incluidas en partidas|Se presupuestará mediante anexo específico',
    'Corrección de patologías preexistentes y actuaciones no identificadas|Requiere aprobación previa por cambio de alcance',
    'Intervenciones por terceros no autorizados durante garantía|Fuera de cobertura contractual',
  ]);

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escapeHtml(labels.tituloOferta)} ${escapeHtml(presupuesto.codigoOferta || presupuesto.codigo)}</title>
  <style>
    @page { size: A4; margin: 20mm 12mm 18mm 12mm; }
    body { font-family: "Segoe UI", Inter, Arial, sans-serif; color: #0f172a; margin: 0; font-size: 11.2px; line-height: 1.45; letter-spacing: .001em; background: #fff; }
    h1,h2,h3,h4 { margin: 0; }
    .page { page-break-after: always; min-height: calc(297mm - 38mm); position: relative; }
    .page:last-child { page-break-after: auto; }
    .sheet { width: 100%; }
    .page-header-fixed { position: fixed; top: -16mm; left: 0; right: 0; border-bottom: 1px solid #d1d5db; padding: 3mm 0 2mm; font-size: 9.5px; color: #334155; display: flex; justify-content: space-between; text-transform: uppercase; letter-spacing: .04em; }
    .page-footer-fixed { position: fixed; bottom: -13mm; left: 0; right: 0; border-top: 1px solid #d1d5db; padding: 2mm 0 0; font-size: 9.5px; color: #475569; display: flex; justify-content: space-between; }
    .page-counter::after { content: "Página " counter(page); }
    .portada { display: flex; flex-direction: column; justify-content: space-between; border: 1px solid #d1d5db; padding: 18mm 14mm; }
    .portada-band { border-top: 10px solid #0f172a; padding-top: 10mm; }
    .portada-kicker { font-size: 11px; color: #475569; text-transform: uppercase; letter-spacing: .08em; font-weight: 700; }
    .portada-title { margin-top: 9mm; font-size: 34px; line-height: 1.12; letter-spacing: -.01em; text-transform: uppercase; font-weight: 800; color: #0f172a; max-width: 85%; }
    .portada-sub { margin-top: 5mm; font-size: 13px; color: #334155; max-width: 80%; }
    .portada-grid { margin-top: 14mm; display: grid; grid-template-columns: 1fr 1fr; gap: 8mm; }
    .portada-card { border: 1px solid #cbd5e1; padding: 4mm; min-height: 22mm; }
    .portada-card h4 { font-size: 10px; text-transform: uppercase; color: #64748b; margin-bottom: 2mm; letter-spacing: .05em; }
    .portada-card p { margin: 0; font-size: 13px; color: #0f172a; }
    .confid-page { border: 1px solid #d1d5db; padding: 14mm 12mm; }
    .confid-badge { display: inline-block; border: 1px solid #94a3b8; padding: 2mm 3mm; font-size: 10px; text-transform: uppercase; letter-spacing: .05em; color: #334155; margin-bottom: 5mm; }
    .confid-title { font-size: 24px; font-weight: 800; margin-bottom: 4mm; text-transform: uppercase; }
    .confid-text { font-size: 12px; color: #334155; max-width: 95%; }
    .header { border-bottom: 2px solid #1e293b; padding-bottom: 8px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: flex-start; gap: 14px; }
    .title-wrap { flex: 1; }
    .title { font-size: 25px; font-weight: 800; letter-spacing: -0.01em; margin-bottom: 4px; text-transform: uppercase; }
    .sub { color: #475569; font-size: 11px; }
    .docbox { min-width: 190px; border: 1px solid #cbd5e1; border-radius: 4px; overflow: hidden; }
    .docbox-head { background: #f1f5f9; font-size: 9.5px; font-weight: 700; padding: 4px 8px; text-transform: uppercase; color: #334155; letter-spacing: .04em; }
    .docbox-row { display: flex; justify-content: space-between; gap: 8px; font-size: 10px; padding: 4px 8px; border-top: 1px solid #e2e8f0; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 10px 0 14px; }
    .card { border: 1px solid #cbd5e1; border-radius: 4px; padding: 9px 10px; }
    .card h3 { font-size: 11px; font-weight: 700; margin-bottom: 5px; text-transform: uppercase; letter-spacing: .05em; color: #334155; }
    .card p { margin: 0 0 2px; font-size: 11px; }
    .section { margin-top: 14px; page-break-inside: avoid; }
    .section-title { font-size: 13px; font-weight: 800; margin-bottom: 6px; text-transform: uppercase; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; letter-spacing: .03em; }
    .subsection-title { font-size: 11px; font-weight: 700; margin: 9px 0 4px; color: #334155; text-transform: uppercase; letter-spacing: .04em; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    th, td { border: 1px solid #cbd5e1; padding: 5px 6px; text-align: left; font-size: 10px; vertical-align: top; }
    th { background: #f1f5f9; font-weight: 700; text-transform: uppercase; letter-spacing: .03em; font-size: 9.3px; color: #334155; }
    .right { text-align: right; }
    .muted { color: #64748b; font-size: 10px; }
    .resumen-economico { margin-top: 8px; }
    .resumen-economico td:first-child { font-weight: 600; }
    .totals-wrap { display: flex; justify-content: flex-end; margin-top: 8px; }
    .totals { width: 350px; border: 1px solid #cbd5e1; border-radius: 4px; padding: 9px 10px; }
    .totals-row { display: flex; justify-content: space-between; padding: 2px 0; font-size: 10.8px; }
    .totals-main { font-weight: 800; border-top: 1px solid #cbd5e1; margin-top: 5px; padding-top: 6px; font-size: 12px; }
    .lic-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
    .metric-card { border: 1px solid #cbd5e1; border-radius: 4px; padding: 8px; }
    .metric-card .label { font-size: 9px; text-transform: uppercase; color: #64748b; letter-spacing: .04em; }
    .metric-card .value { margin-top: 3px; font-size: 14px; font-weight: 700; color: #0f172a; }
    .signature-section { page-break-inside: avoid; margin-top: 16px; }
    .signature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 10px; }
    .signature-box { border: 1px solid #cbd5e1; border-radius: 4px; min-height: 110px; padding: 10px 12px; }
    .signature-box h4 { font-size: 10px; text-transform: uppercase; margin-bottom: 8px; letter-spacing: .04em; color: #334155; }
    .signature-box p { font-size: 10px; margin: 0; }
    .signature-line { border-bottom: 1px dashed #94a3b8; margin-top: 14px; height: 16px; }
    .footer-note { margin-top: 16px; border-top: 1px solid #cbd5e1; padding-top: 7px; color: #64748b; font-size: 9px; text-transform: uppercase; letter-spacing: .04em; }
    .page-break { page-break-before: always; }
  </style>
</head>
<body>
  <div class="page-header-fixed">
    <span>EMT 360 · Propuesta técnico-económica de licitación</span>
    <span>${escapeHtml(presupuesto.codigoOferta || presupuesto.codigo)} · v${escapeHtml(presupuesto.versionOferta || 1)}</span>
  </div>
  <div class="page-footer-fixed">
    <span>EMT 360 · Documento corporativo confidencial · Uso exclusivo de licitación</span>
    <span class="page-counter"></span>
  </div>

  <section class="page portada">
    <div class="portada-band">
      <div class="portada-kicker">Propuesta técnico-económica · Licitación</div>
      <h1 class="portada-title">${escapeHtml(labels.tituloOferta)}</h1>
      <p class="portada-sub">${escapeHtml(presupuesto.proyecto?.nombre || 'Proyecto técnico de instalación')} · Documento estándar OFERTA-TÉC-EC-EMT-360</p>
      <div class="portada-grid">
        <article class="portada-card">
          <h4>Cliente licitador</h4>
          <p>${escapeHtml(presupuesto.proyecto?.cliente?.nombre || '-')}</p>
        </article>
        <article class="portada-card">
          <h4>Referencia oferta</h4>
          <p>${escapeHtml(presupuesto.codigoOferta || presupuesto.codigo)}</p>
        </article>
        <article class="portada-card">
          <h4>Versión</h4>
          <p>${escapeHtml(presupuesto.versionOferta || 1)}</p>
        </article>
        <article class="portada-card">
          <h4>Fecha de emisión</h4>
          <p>${escapeHtml(fechaDocumentoFmt)}</p>
        </article>
      </div>
    </div>
    <p class="footer-note">EMT 360 · Dirección Técnica y Económica · Oferta corporativa normalizada</p>
  </section>

  <section class="page confid-page">
    <span class="confid-badge">Confidencial</span>
    <h2 class="confid-title">Declaración de confidencialidad</h2>
    <p class="confid-text">${escapeHtmlWithBreaks(moduloConfidencialidad?.content || 'La presente propuesta técnico-económica es propiedad de EMT 360 y se entrega exclusivamente para fines de evaluación en el proceso de licitación indicado. Queda prohibida su reproducción, cesión o difusión total o parcial sin autorización previa y por escrito. La información técnica, económica y metodológica contenida en este documento tiene carácter reservado.')}</p>
    <p class="confid-text" style="margin-top:5mm;">El receptor se compromete a custodiar la documentación conforme a los principios de confidencialidad, seguridad de la información y uso restringido al equipo evaluador autorizado.</p>
  </section>

  <div class="sheet page-break">
    <div class="header">
      <div class="title-wrap">
        <h1 class="title">${escapeHtml(labels.tituloOferta)}</h1>
        <p class="sub">Propuesta tipo licitación pública · ${escapeHtml(presupuesto.proyecto?.nombre || 'Sin proyecto')}</p>
      </div>
      <div class="docbox">
        <div class="docbox-head">Control de documento</div>
        <div class="docbox-row"><span>Oferta</span><strong>${escapeHtml(presupuesto.codigoOferta || presupuesto.codigo)}</strong></div>
        <div class="docbox-row"><span>Versión</span><strong>${escapeHtml(presupuesto.versionOferta || 1)}</strong></div>
        <div class="docbox-row"><span>Fecha</span><strong>${escapeHtml(fechaDocumentoFmt)}</strong></div>
      </div>
    </div>

    <div class="grid">
      <div class="card">
        <h3>${escapeHtml(labels.cliente)}</h3>
        <p>${escapeHtml(presupuesto.proyecto?.cliente?.nombre || '-')}</p>
        <p class="muted">${escapeHtml(labels.proyecto)}: ${escapeHtml(presupuesto.proyecto?.nombre || '-')}</p>
      </div>
      <div class="card">
        <h3>${escapeHtml(labels.alcance)}</h3>
        <p>${escapeHtml(presupuesto.contexto?.tipologiaVehiculo || presupuesto.contexto?.objetivoProyecto || '-')}</p>
        <p class="muted">${escapeHtml(labels.vehiculos)}: ${escapeHtml(presupuesto.contexto?.numVehiculos || '-')}</p>
      </div>
    </div>

    <section class="section">
      <h2 class="section-title">Resumen ejecutivo</h2>
      <div class="card">
        <p><strong>Alcance:</strong> ${escapeHtml(resumenEjecutivo.alcance)}</p>
        <p><strong>Valor:</strong> ${escapeHtml(resumenEjecutivo.valor)}</p>
        <p><strong>Plazo:</strong> ${escapeHtml(resumenEjecutivo.plazo)}</p>
        <p class="muted" style="margin-top:4px;">${escapeHtmlWithBreaks(resumenEjecutivo.narrativa)}</p>
      </div>
    </section>

    <section class="section">
      <h2 class="section-title">Alcance técnico</h2>
      <p>${escapeHtmlWithBreaks(moduloAlcance?.content || 'El alcance técnico cubre ingeniería de detalle, suministro, implantación, pruebas de aceptación y cierre documental, conforme a los requisitos funcionales y operativos del Cliente.')}</p>
    </section>

    <section class="section">
      <h2 class="section-title">Arquitectura funcional</h2>
      <p>${escapeHtmlWithBreaks(moduloArquitectura?.content || 'La arquitectura funcional se articula en capas de captura de datos, procesamiento, comunicaciones y explotación operativa, con trazabilidad extremo a extremo de eventos, activos y evidencias de servicio.')}</p>
    </section>

    <section class="section">
      <h2 class="section-title">Metodología de ejecución</h2>
      <p>${escapeHtmlWithBreaks(moduloMetodologia?.content || 'La metodología de ejecución contempla fases de preparación, despliegue controlado, validación en campo y aceptación final, con gestión de riesgos, control de cambios y gobierno de hitos.')}</p>
    </section>

    <section class="section">
      <h2 class="section-title">Planificación y métricas de instalación</h2>
      <div class="lic-grid-3">
        <article class="metric-card"><span class="label">Vehículos objetivo</span><div class="value">${escapeHtml(metricas.vehiculos || '-')}</div></article>
        <article class="metric-card"><span class="label">Partidas de instalación</span><div class="value">${escapeHtml(metricas.lineasInstalacion)}</div></article>
        <article class="metric-card"><span class="label">Partidas totales</span><div class="value">${escapeHtml(metricas.totalPartidas)}</div></article>
      </div>
      <p style="margin-top:8px;"><strong>Plazo planificado:</strong> ${escapeHtml(metricas.plazo)}</p>
      <p class="muted"><strong>Hitos:</strong> ${escapeHtml(metricas.hitos)}</p>
      ${moduloMetricas ? `<p class="muted" style="margin-top:4px;">${escapeHtmlWithBreaks(moduloMetricas.content)}</p>` : ''}
    </section>

    <section class="section">
      <h2 class="section-title">Experiencia relevante</h2>
      <p>${escapeHtmlWithBreaks(moduloExperiencia?.content || 'EMT 360 aporta experiencia acreditada en despliegues de soluciones embarcadas, integración operativa en flota y ejecución en entornos de alta exigencia de servicio público.')}</p>
    </section>

    <section class="section">
      <h2 class="section-title">Resumen económico (Base + Opcional)</h2>
      <table class="resumen-economico">
        <thead>
          <tr><th>Concepto</th><th class="right">Importe</th><th class="right">% sobre base</th></tr>
        </thead>
        <tbody>
          <tr><td>A · Suministro de equipos</td><td class="right">${escapeHtml(formatCurrency(economico.totalesBloque.A))}</td><td class="right">${escapeHtml(formatPercent(economico.porcentajesBloque.A))}</td></tr>
          <tr><td>B · Materiales de instalación</td><td class="right">${escapeHtml(formatCurrency(economico.totalesBloque.B))}</td><td class="right">${escapeHtml(formatPercent(economico.porcentajesBloque.B))}</td></tr>
          <tr><td>C · Mano de obra</td><td class="right">${escapeHtml(formatCurrency(economico.totalesBloque.C))}</td><td class="right">${escapeHtml(formatPercent(economico.porcentajesBloque.C))}</td></tr>
          <tr><td>D · Mantenimiento (1-3)</td><td class="right">${escapeHtml(formatCurrency(economico.totalesBloque.D))}</td><td class="right">${escapeHtml(formatPercent(economico.porcentajesBloque.D))}</td></tr>
          <tr><td>E · Opcionales</td><td class="right">${escapeHtml(formatCurrency(economico.totalesBloque.E))}</td><td class="right">${escapeHtml(formatPercent(economico.porcentajesBloque.E))}</td></tr>
          <tr><td><strong>Base adjudicación</strong></td><td class="right"><strong>${escapeHtml(formatCurrency(economico.baseAdjudicacion))}</strong></td><td class="right">100,00%</td></tr>
          <tr><td>Opcional total</td><td class="right">${escapeHtml(formatCurrency(economico.opcionalTotal))}</td><td class="right">${escapeHtml(formatPercent(economico.baseImponible > 0 ? (economico.opcionalTotal / economico.baseImponible) * 100 : 0))}</td></tr>
        </tbody>
      </table>
    </section>

    <section class="section">
      <h2 class="section-title">Partidas económicas detalladas</h2>

      <h3 class="subsection-title">Partida A · Suministro de equipos</h3>
      ${renderLineasTable(lineasA)}

      <h3 class="subsection-title">Partida B · Materiales de instalación</h3>
      ${renderLineasTable(lineasB)}

      <h3 class="subsection-title">Partida C · Mano de obra</h3>
      ${renderLineasTable(lineasC)}

      <h3 class="subsection-title">Partida D · Mantenimiento</h3>
      ${renderLineasTable(lineasD)}

      <h3 class="subsection-title">Partida E · Opcionales</h3>
      ${renderLineasTable(lineasE)}
    </section>

    <div class="totals-wrap">
      <div class="totals">
        <div class="totals-row"><span>Base adjudicación (A+B+C+D)</span><span>${escapeHtml(formatCurrency(economico.baseAdjudicacion))}</span></div>
        <div class="totals-row"><span>Opcional total (E)</span><span>${escapeHtml(formatCurrency(economico.opcionalTotal))}</span></div>
        <div class="totals-row"><span>Total propuesta sin IVA</span><span>${escapeHtml(formatCurrency(economico.totalPropuesta))}</span></div>
        <div class="totals-row"><span>${escapeHtml(labels.baseImponible)}</span><span>${escapeHtml(formatCurrency(economico.baseImponible))}</span></div>
        <div class="totals-row"><span>${escapeHtml(labels.iva)} (${escapeHtml(economico.ivaPorcentaje.toFixed(0))}%)</span><span>${escapeHtml(formatCurrency(economico.ivaImporte))}</span></div>
        <div class="totals-row totals-main"><span>${escapeHtml(labels.totalConIva)}</span><span>${escapeHtml(formatCurrency(economico.totalConIva))}</span></div>
      </div>
    </div>

    <section class="section">
      <h2 class="section-title">Precio unitario por vehículo</h2>
      <table>
        <thead>
          <tr><th>Concepto unitario</th><th class="right">Importe</th></tr>
        </thead>
        <tbody>
          <tr><td>Base adjudicación / vehículo</td><td class="right">${escapeHtml(formatCurrency(economico.precioUnitarioDetalle.baseAdjudicacion))}</td></tr>
          <tr><td>Opcional / vehículo</td><td class="right">${escapeHtml(formatCurrency(economico.precioUnitarioDetalle.opcional))}</td></tr>
          <tr><td>Total sin IVA / vehículo</td><td class="right">${escapeHtml(formatCurrency(economico.precioUnitarioDetalle.totalSinIva))}</td></tr>
          <tr><td>IVA / vehículo</td><td class="right">${escapeHtml(formatCurrency(economico.precioUnitarioDetalle.iva))}</td></tr>
          <tr><td><strong>Total con IVA / vehículo</strong></td><td class="right"><strong>${escapeHtml(formatCurrency(economico.precioUnitarioDetalle.totalConIva))}</strong></td></tr>
        </tbody>
      </table>
      <p class="muted" style="margin-top:4px;">Cálculo sobre ${escapeHtml(economico.precioUnitarioDetalle.numeroVehiculos || 1)} vehículo(s).</p>
      ${moduloCondicionesEconomicas ? `<p class="muted">${escapeHtmlWithBreaks(moduloCondicionesEconomicas.content)}</p>` : ''}
    </section>

    ${renderSupExcTable('Supuestos técnicos y operativos', supuestosRows)}
    ${renderSupExcTable('Exclusiones de alcance', exclusionesRows)}

    ${moduloAceptacion ? `<section class="section signature-section"><h2 class="section-title">${escapeHtml(moduloAceptacion.title)}</h2><p class="muted">${escapeHtmlWithBreaks(moduloAceptacion.content)}</p><div class="signature-grid"><article class="signature-box"><h4>Cliente</h4><p>Nombre y cargo:</p><div class="signature-line"></div><p>Fecha:</p><div class="signature-line"></div><p>Firma:</p><div class="signature-line"></div></article><article class="signature-box"><h4>EMT 360</h4><p>Responsable comercial:</p><div class="signature-line"></div><p>Fecha:</p><div class="signature-line"></div><p>Firma y sello:</p><div class="signature-line"></div></article></div></section>` : ''}
    ${anexosTecnicos.length > 0 ? `<section class="section"><h2 class="section-title">Anexos técnicos</h2><ul>${anexosTecnicos.map((anexo) => `<li><strong>${escapeHtml(anexo.titulo)}</strong>${anexo.url ? ` · ${escapeHtml(anexo.url)}` : ''}</li>`).join('')}</ul></section>` : ''}

    <p class="footer-note">EMT 360 · Propuesta técnica pública · ${escapeHtml(templateSpec.codigo)} · ${escapeHtml(templateSpec.version)}</p>
  </div>
</body>
</html>`;
}
