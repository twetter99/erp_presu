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
  totalesBloque: {
    A: number;
    B: number;
    C: number;
    D: number;
    E: number;
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

  const baseImponible = roundCurrency(
    presupuesto.baseImponible > 0
      ? presupuesto.baseImponible
      : (presupuesto.totalCliente > 0
          ? presupuesto.totalCliente
          : totalA + totalB + totalC + totalD + totalDesplazamientos)
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
  const precioUnitarioVehiculo = roundCurrency(
    presupuesto.precioUnitarioVehiculo > 0
      ? presupuesto.precioUnitarioVehiculo
      : (numVehiculos > 0 ? baseImponible / numVehiculos : 0)
  );

  return {
    baseImponible,
    ivaPorcentaje,
    ivaImporte,
    totalConIva,
    precioUnitarioVehiculo,
    totalesBloque: {
      A: roundCurrency(totalA),
      B: roundCurrency(totalB),
      C: roundCurrency(totalC),
      D: roundCurrency(totalD),
      E: roundCurrency(totalE),
    },
    totalDesplazamientos,
    totalOpcionales: roundCurrency(totalE),
  };
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
    lineas: {
      motor: presupuesto.lineasMotor,
      trabajo: presupuesto.lineasTrabajo,
      material: presupuesto.lineasMaterial,
      desplazamiento: presupuesto.lineasDesplazamiento,
      opcionales: lineasOpcionales,
    },
    opcionales: {
      totalOpcionales: economico.totalOpcionales,
      incluidosEnTotal: false,
    },
    modulosDocumento: modulosDocumento.filter((module) => module.enabled),
    anexosTecnicos,
    textos: presupuesto.textos,
  };
}

export function buildOfertaHtmlDocument({ presupuesto, templateCode, anexosTecnicos = [], modulosDocumento = [] }: BuildOfertaHtmlArgs): string {
  const lineas = buildOfertaLineas(presupuesto);
  const economico = resolveOfertaEconomico(presupuesto, lineas);
  const templateSpec = resolveOfertaTemplateSpec(templateCode);
  const labels = templateSpec.etiquetas;
  const lineasOpcionales = lineas.filter((l) => l.bloque === 'E_OPCIONALES_4_5');
  const modulosVisibles = modulosDocumento
    .filter((module) => module.enabled)
    .sort((left, right) => left.order - right.order);
  const moduloAceptacion = modulosVisibles.find((module) => module.key === 'ACEPTACION_FIRMA');
  const modulosGenerales = modulosVisibles.filter((module) => module.key !== 'ACEPTACION_FIRMA');
  const fechaDocumento = presupuesto.snapshot?.fechaEmision || presupuesto.fecha;
  const bloquesLabel: Record<string, string> = {
    A_SUMINISTRO_EQUIPOS: 'A · Suministro de equipos',
    B_MATERIALES_INSTALACION: 'B · Materiales de instalación',
    C_MANO_OBRA: 'C · Mano de obra',
    D_MANTENIMIENTO_1_3: 'D · Mantenimiento (1-3)',
    E_OPCIONALES_4_5: 'E · Opcionales (4-5)',
    DESPLAZAMIENTO: 'Desplazamientos',
  };

  const lineasByBloque = lineas.reduce<Record<string, OfertaLinea[]>>((accumulator, current) => {
    if (!accumulator[current.bloque]) accumulator[current.bloque] = [];
    accumulator[current.bloque].push(current);
    return accumulator;
  }, {});

  const bloquesOrden = [
    'A_SUMINISTRO_EQUIPOS',
    'B_MATERIALES_INSTALACION',
    'C_MANO_OBRA',
    'D_MANTENIMIENTO_1_3',
    'DESPLAZAMIENTO',
  ];

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escapeHtml(labels.tituloOferta)} ${escapeHtml(presupuesto.codigoOferta || presupuesto.codigo)}</title>
  <style>
    @page { size: A4; margin: 26mm 12mm 20mm 12mm; }
    body { font-family: Inter, "Segoe UI", Arial, sans-serif; color: #0f172a; margin: 0; font-size: 11.5px; line-height: 1.42; letter-spacing: .001em; }
    h1,h2,h3,h4 { margin: 0; }
    .sheet { width: 100%; }
    .page-header-fixed { position: fixed; top: -22mm; left: 0; right: 0; border-bottom: 1px solid #cbd5e1; padding: 4mm 0 2mm; font-size: 10px; color: #334155; display: flex; justify-content: space-between; }
    .page-footer-fixed { position: fixed; bottom: -16mm; left: 0; right: 0; border-top: 1px solid #cbd5e1; padding: 2mm 0 0; font-size: 10px; color: #64748b; display: flex; justify-content: space-between; }
    .page-counter::after { content: "Página " counter(page); }
    .header { border-bottom: 2px solid #1e293b; padding-bottom: 10px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
    .title-wrap { flex: 1; }
    .title { font-size: 27px; font-weight: 800; letter-spacing: -0.015em; margin-bottom: 5px; text-transform: uppercase; }
    .sub { color: #475569; font-size: 11px; }
    .docbox { min-width: 180px; border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden; }
    .docbox-head { background: #e2e8f0; font-size: 10px; font-weight: 700; padding: 4px 8px; text-transform: uppercase; color: #334155; }
    .docbox-row { display: flex; justify-content: space-between; gap: 8px; font-size: 10.5px; padding: 4px 8px; border-top: 1px solid #e2e8f0; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 12px 0 18px; }
    .card { border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 12px; }
    .card h3 { font-size: 13px; font-weight: 700; margin-bottom: 7px; text-transform: uppercase; letter-spacing: .02em; }
    .card p { margin: 0 0 3px; font-size: 11.5px; }
    .section { margin-top: 14px; page-break-inside: avoid; }
    .section-title { font-size: 14px; font-weight: 800; margin-bottom: 7px; text-transform: uppercase; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; letter-spacing: .012em; }
    .block-title { font-size: 12px; font-weight: 700; margin: 10px 0 5px; color: #1e293b; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    th, td { border: 1px solid #cbd5e1; padding: 6px 7px; text-align: left; font-size: 10.5px; vertical-align: top; }
    th { background: #e2e8f0; font-weight: 700; }
    .right { text-align: right; }
    .muted { color: #64748b; font-size: 10.5px; }
    .resumen-economico { margin-top: 10px; }
    .resumen-economico td:first-child { font-weight: 600; }
    .totals-wrap { display: flex; justify-content: flex-end; margin-top: 10px; }
    .totals { width: 340px; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 12px; }
    .totals-row { display: flex; justify-content: space-between; padding: 3px 0; font-size: 11.5px; }
    .totals-main { font-weight: 800; border-top: 1px solid #cbd5e1; margin-top: 6px; padding-top: 7px; font-size: 12.5px; }
    .module { margin-top: 10px; page-break-inside: avoid; }
    .module h4 { font-size: 12px; font-weight: 700; margin-bottom: 3px; }
    .module p { margin: 0; line-height: 1.4; color: #1e293b; font-size: 11px; }
    .signature-section { page-break-inside: avoid; }
    .signature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 10px; }
    .signature-box { border: 1px solid #cbd5e1; border-radius: 8px; min-height: 115px; padding: 10px 12px; }
    .signature-box h4 { font-size: 11px; text-transform: uppercase; margin-bottom: 8px; letter-spacing: .02em; }
    .signature-box p { font-size: 10.5px; margin: 0; }
    .signature-line { border-bottom: 1px dashed #94a3b8; margin-top: 14px; height: 16px; }
    .footer-note { margin-top: 16px; border-top: 1px solid #cbd5e1; padding-top: 7px; color: #64748b; font-size: 9.5px; }
  </style>
</head>
<body>
  <div class="page-header-fixed">
    <span>EMT 360 · Oferta técnica-económica</span>
    <span>${escapeHtml(presupuesto.codigoOferta || presupuesto.codigo)} · v${escapeHtml(presupuesto.versionOferta || 1)}</span>
  </div>
  <div class="page-footer-fixed">
    <span>Documento confidencial para ${escapeHtml(presupuesto.proyecto?.cliente?.nombre || 'cliente')}</span>
    <span class="page-counter"></span>
  </div>
  <div class="sheet">
    <div class="header">
      <div class="title-wrap">
        <h1 class="title">${escapeHtml(labels.tituloOferta)}</h1>
        <p class="sub">Documento comercial EMT 360 · ${escapeHtml(presupuesto.proyecto?.nombre || 'Sin proyecto')}</p>
      </div>
      <div class="docbox">
        <div class="docbox-head">Control de documento</div>
        <div class="docbox-row"><span>Oferta</span><strong>${escapeHtml(presupuesto.codigoOferta || presupuesto.codigo)}</strong></div>
        <div class="docbox-row"><span>Versión</span><strong>${escapeHtml(presupuesto.versionOferta || 1)}</strong></div>
        <div class="docbox-row"><span>Fecha</span><strong>${escapeHtml(new Date(fechaDocumento).toLocaleDateString('es-ES'))}</strong></div>
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
      <h2 class="section-title">Resumen económico</h2>
      <table class="resumen-economico">
        <thead>
          <tr><th>Bloque</th><th class="right">Importe</th></tr>
        </thead>
        <tbody>
          <tr><td>A · Suministro de equipos</td><td class="right">${escapeHtml(formatCurrency(economico.totalesBloque.A))}</td></tr>
          <tr><td>B · Materiales de instalación</td><td class="right">${escapeHtml(formatCurrency(economico.totalesBloque.B))}</td></tr>
          <tr><td>C · Mano de obra</td><td class="right">${escapeHtml(formatCurrency(economico.totalesBloque.C))}</td></tr>
          <tr><td>D · Mantenimiento (1-3)</td><td class="right">${escapeHtml(formatCurrency(economico.totalesBloque.D))}</td></tr>
          <tr><td>Desplazamientos</td><td class="right">${escapeHtml(formatCurrency(economico.totalDesplazamientos))}</td></tr>
          <tr><td>Precio unitario por vehículo</td><td class="right">${escapeHtml(formatCurrency(economico.precioUnitarioVehiculo))}</td></tr>
        </tbody>
      </table>
    </section>

    <section class="section">
      <h2 class="section-title">${escapeHtml(labels.partidas)}</h2>
      ${bloquesOrden
        .filter((bloque) => (lineasByBloque[bloque] || []).length > 0)
        .map((bloque) => {
          const bloqueLineas = lineasByBloque[bloque] || [];
          return `
            <h3 class="block-title">${escapeHtml(bloquesLabel[bloque] || bloque)}</h3>
            <table>
              <thead>
                <tr><th style="width:17%;">Código</th><th style="width:45%;">Descripción</th><th style="width:8%;">Unidad</th><th style="width:10%;" class="right">Cantidad</th><th style="width:10%;" class="right">Precio</th><th style="width:10%;" class="right">Subtotal</th></tr>
              </thead>
              <tbody>
                ${bloqueLineas.map((linea) => `<tr><td>${escapeHtml(linea.codigo)}</td><td>${escapeHtml(linea.descripcion)}</td><td>${escapeHtml(linea.unidad)}</td><td class="right">${escapeHtml(linea.cantidad)}</td><td class="right">${escapeHtml(formatCurrency(linea.precio))}</td><td class="right">${escapeHtml(formatCurrency(linea.subtotal))}</td></tr>`).join('')}
              </tbody>
            </table>
          `;
        })
        .join('')}
    </section>

    <div class="totals-wrap">
      <div class="totals">
        <div class="totals-row"><span>${escapeHtml(labels.baseImponible)}</span><span>${escapeHtml(formatCurrency(economico.baseImponible))}</span></div>
        <div class="totals-row"><span>${escapeHtml(labels.iva)} (${escapeHtml(economico.ivaPorcentaje.toFixed(0))}%)</span><span>${escapeHtml(formatCurrency(economico.ivaImporte))}</span></div>
        <div class="totals-row totals-main"><span>${escapeHtml(labels.totalConIva)}</span><span>${escapeHtml(formatCurrency(economico.totalConIva))}</span></div>
      </div>
    </div>

    ${modulosGenerales.length > 0 ? `<section class="section"><h2 class="section-title">${escapeHtml(labels.condicionesNotas)}</h2>${modulosGenerales.map((module) => `<article class="module"><h4>${escapeHtml(module.title)}</h4><p>${escapeHtmlWithBreaks(module.content)}</p></article>`).join('')}</section>` : ''}
    ${moduloAceptacion ? `<section class="section signature-section"><h2 class="section-title">${escapeHtml(moduloAceptacion.title)}</h2><p class="muted">${escapeHtmlWithBreaks(moduloAceptacion.content)}</p><div class="signature-grid"><article class="signature-box"><h4>Cliente</h4><p>Nombre y cargo:</p><div class="signature-line"></div><p>Fecha:</p><div class="signature-line"></div><p>Firma:</p><div class="signature-line"></div></article><article class="signature-box"><h4>EMT 360</h4><p>Responsable comercial:</p><div class="signature-line"></div><p>Fecha:</p><div class="signature-line"></div><p>Firma y sello:</p><div class="signature-line"></div></article></div></section>` : ''}
    ${lineasOpcionales.length > 0 ? `<section class="section"><h2 class="section-title">Opcionales</h2><table><thead><tr><th style="width:17%;">Código</th><th style="width:45%;">Descripción</th><th style="width:8%;">Unidad</th><th style="width:10%;" class="right">Cantidad</th><th style="width:10%;" class="right">Precio</th><th style="width:10%;" class="right">Subtotal</th></tr></thead><tbody>${lineasOpcionales.map((linea) => `<tr><td>${escapeHtml(linea.codigo)}</td><td>${escapeHtml(linea.descripcion)}</td><td>${escapeHtml(linea.unidad)}</td><td class="right">${escapeHtml(linea.cantidad)}</td><td class="right">${escapeHtml(formatCurrency(linea.precio))}</td><td class="right">${escapeHtml(formatCurrency(linea.subtotal))}</td></tr>`).join('')}</tbody></table></section>` : ''}
    ${anexosTecnicos.length > 0 ? `<section class="section"><h2 class="section-title">Anexos técnicos</h2><ul>${anexosTecnicos.map((anexo) => `<li><strong>${escapeHtml(anexo.titulo)}</strong>${anexo.url ? ` · ${escapeHtml(anexo.url)}` : ''}</li>`).join('')}</ul></section>` : ''}
    ${presupuesto.textos.length > 0 ? `<section class="section"><h2 class="section-title">Textos adicionales</h2>${presupuesto.textos.map((texto: any) => `<article class="module"><h4>${escapeHtml(texto.titulo)}</h4><p>${escapeHtmlWithBreaks(texto.contenido)}</p></article>`).join('')}</section>` : ''}

    <p class="footer-note">Documento generado automáticamente por ERP Presu · ${escapeHtml(templateSpec.codigo)} · ${escapeHtml(templateSpec.version)}</p>
  </div>
</body>
</html>`;
}
