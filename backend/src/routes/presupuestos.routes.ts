import { Router, Request, Response } from 'express';
import { createHash } from 'crypto';
import prisma from '../config/database';
import { authMiddleware, requirePerfil } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { z } from 'zod';
import { OFERTA_TEMPLATE_CATALOG, OFERTA_TEMPLATE_DEFAULT_CODE } from '../config/ofertaTemplate.spec';
import { buildOfertaHtmlDocument, buildOfertaPayload } from '../services/ofertaDocument.service';
import {
  getGlobalTemplateModuleOverrides,
  resolvePresupuestoModules,
  resolveTemplateModules,
  saveGlobalTemplateModuleOverrides,
  savePresupuestoModuleOverrides,
} from '../services/ofertaModules.service';
import { renderOfertaPdf } from '../services/pdfRenderer.service';

const router = Router();
router.use(authMiddleware);

function generarCodigoPresupuesto(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(Math.random() * 900000) + 100000;
  return `PRE-${year}-${rand}`;
}

function generarCodigoOferta(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(Math.random() * 900000) + 100000;
  return `OF-CLI-${year}-${rand}`;
}

type BloqueMotor =
  | 'A_SUMINISTRO_EQUIPOS'
  | 'B_MATERIALES_INSTALACION'
  | 'C_MANO_OBRA'
  | 'D_MANTENIMIENTO_1_3'
  | 'E_OPCIONALES_4_5';

type ReglaLineaMotor = {
  sku: string;
  bloque: BloqueMotor;
  cantidad: {
    tipo: 'POR_VEHICULO' | 'FIJO';
    valor: number;
  };
  soloSiPiloto?: boolean;
  descripcionOverride?: string;
};

type ReglasSolucion = {
  lineas: ReglaLineaMotor[];
  ajustes?: {
    nocturnidadMultiplicador?: number;
    integracionesMultiplicador?: number;
    pilotoMultiplicador?: number;
  };
};

const ESTADOS_BLOQUEADOS_EDICION = ['ACEPTADO', 'RECHAZADO', 'EXPIRADO'] as const;

function presupuestoBloqueadoParaEdicion(estado: string): boolean {
  return ESTADOS_BLOQUEADOS_EDICION.includes(estado as (typeof ESTADOS_BLOQUEADOS_EDICION)[number]);
}

type EmisionCheck = {
  key: string;
  label: string;
  ok: boolean;
  required: boolean;
};

function construirValidacionEmision(presupuesto: any) {
  const tieneLineasEconomicas = presupuesto.lineasMotor.length > 0
    || presupuesto.lineasTrabajo.length > 0
    || presupuesto.lineasMaterial.length > 0;

  const checks: EmisionCheck[] = [
    {
      key: 'cliente',
      label: 'Cliente del proyecto informado',
      ok: Boolean(presupuesto.proyecto?.cliente?.nombre),
      required: true,
    },
    {
      key: 'lineas',
      label: 'Partidas económicas disponibles',
      ok: tieneLineasEconomicas,
      required: true,
    },
    {
      key: 'totales',
      label: 'Totales económicos calculados',
      ok: (presupuesto.totalConIva ?? 0) > 0 && (presupuesto.baseImponible ?? 0) > 0,
      required: true,
    },
    {
      key: 'contexto',
      label: 'Contexto técnico completo (motor)',
      ok: !presupuesto.contexto
        || (Boolean(presupuesto.contexto.solucionId)
          && presupuesto.contexto.numVehiculos > 0
          && Boolean(presupuesto.contexto.tipologiaVehiculo)),
      required: true,
    },
    {
      key: 'textos',
      label: 'Textos comerciales listos',
      ok: !presupuesto.contexto || presupuesto.textos.length > 0,
      required: true,
    },
    {
      key: 'estado',
      label: 'Estado permite emisión',
      ok: !['RECHAZADO', 'EXPIRADO'].includes(presupuesto.estado),
      required: true,
    },
  ];

  const pendientes = checks.filter((c) => c.required && !c.ok);

  return {
    ready: pendientes.length === 0,
    checks,
    pendientes,
  };
}

const crearPresupuestoMotorSchema = z.object({
  proyectoId: z.number().int().positive(),
  clienteOperativoId: z.number().int().positive().optional(),
  solucionId: z.number().int().positive(),
  numVehiculos: z.number().int().positive(),
  tipologiaVehiculo: z.string().min(1).optional(),
  fabricantesModelos: z.string().optional(),
  piloto: z.boolean().default(false),
  objetivoProyecto: z.string().optional(),
  horarioIntervencion: z.string().optional(),
  nocturnidad: z.boolean().default(false),
  integraciones: z.boolean().default(false),
  extras: z.record(z.any()).optional(),
  validezDias: z.number().int().positive().default(30),
  ivaPorcentaje: z.number().min(0).max(100).default(21),
  confidencial: z.boolean().default(false),
  textoConfidencialidad: z.string().optional(),
});

const recalcularPresupuestoSchema = z.object({
  clienteOperativoId: z.number().int().positive().optional(),
  solucionId: z.number().int().positive().optional(),
  numVehiculos: z.number().int().positive().optional(),
  tipologiaVehiculo: z.string().min(1).optional(),
  fabricantesModelos: z.string().optional(),
  piloto: z.boolean().optional(),
  objetivoProyecto: z.string().optional(),
  horarioIntervencion: z.string().optional(),
  nocturnidad: z.boolean().optional(),
  integraciones: z.boolean().optional(),
  extras: z.record(z.any()).optional(),
  ivaPorcentaje: z.number().min(0).max(100).optional(),
  validezDias: z.number().int().positive().optional(),
  confidencial: z.boolean().optional(),
  textoConfidencialidad: z.string().optional(),
});

const actualizarLineaMotorSchema = z.object({
  codigo: z.string().min(1).optional(),
  descripcion: z.string().min(1).optional(),
  unidad: z.string().min(1).optional(),
  cantidad: z.number().positive().optional(),
  precioUnitario: z.number().min(0).optional(),
  costeUnitario: z.number().min(0).optional(),
  bloque: z.enum([
    'A_SUMINISTRO_EQUIPOS',
    'B_MATERIALES_INSTALACION',
    'C_MANO_OBRA',
    'D_MANTENIMIENTO_1_3',
    'E_OPCIONALES_4_5',
  ]).optional(),
});

const crearLineaMotorSchema = z.object({
  bloque: z.enum([
    'A_SUMINISTRO_EQUIPOS',
    'B_MATERIALES_INSTALACION',
    'C_MANO_OBRA',
    'D_MANTENIMIENTO_1_3',
    'E_OPCIONALES_4_5',
  ]),
  codigo: z.string().min(1),
  descripcion: z.string().min(1),
  unidad: z.string().min(1),
  cantidad: z.number().positive(),
  precioUnitario: z.number().min(0),
  costeUnitario: z.number().min(0).default(0),
  itemCatalogoId: z.number().int().positive().optional(),
});

const cambiarEstadoSchema = z.object({
  estado: z.enum(['BORRADOR', 'ENVIADO', 'NEGOCIACION', 'ACEPTADO', 'RECHAZADO', 'EXPIRADO']),
});

const ofertaModuloOverrideSchema = z.object({
  key: z.string().min(1),
  title: z.string().min(1).optional(),
  content: z.string().optional(),
  enabled: z.boolean().optional(),
  order: z.number().int().min(0).optional(),
});

const ofertaModulosPayloadSchema = z.object({
  overrides: z.array(ofertaModuloOverrideSchema),
});

const TRANSICIONES_ESTADO_PERMITIDAS: Record<string, string[]> = {
  BORRADOR: ['ENVIADO'],
  ENVIADO: ['NEGOCIACION', 'ACEPTADO', 'RECHAZADO', 'EXPIRADO'],
  NEGOCIACION: ['ACEPTADO', 'RECHAZADO', 'EXPIRADO'],
  ACEPTADO: [],
  RECHAZADO: [],
  EXPIRADO: [],
};

// ============================================================================
// CRUD PRESUPUESTOS
// ============================================================================

router.get('/', async (req: Request, res: Response) => {
  try {
    const { proyectoId, estado, search } = req.query;
    const where: any = {};
    if (proyectoId) where.proyectoId = Number(proyectoId);
    if (estado) where.estado = estado;
    if (search) {
      where.OR = [
        { codigo: { contains: search as string, mode: 'insensitive' } },
        { codigoOferta: { contains: search as string, mode: 'insensitive' } },
        { proyecto: { nombre: { contains: search as string, mode: 'insensitive' } } },
        { proyecto: { codigo: { contains: search as string, mode: 'insensitive' } } },
        { proyecto: { cliente: { nombre: { contains: search as string, mode: 'insensitive' } } } },
      ];
    }
    const presupuestosRaw = await prisma.presupuesto.findMany({
      where,
      include: {
        proyecto: { select: { id: true, codigo: true, nombre: true, cliente: { select: { id: true, nombre: true } } } },
        snapshot: { select: { fechaEmision: true } },
      },
      orderBy: { fecha: 'desc' },
    });

    const presupuestos = presupuestosRaw.map((presupuesto) => {
      const estadoActual = presupuesto.estado;

      if (presupuesto.fechaRespuesta) {
        return {
          ...presupuesto,
          estado: estadoActual,
          ultimaActividadTipo: estadoActual === 'ACEPTADO'
            ? 'ACEPTADO'
            : estadoActual === 'RECHAZADO'
              ? 'RECHAZADO'
              : 'RESPUESTA',
          ultimaActividadFecha: presupuesto.fechaRespuesta,
        };
      }

      if (presupuesto.snapshot?.fechaEmision) {
        return {
          ...presupuesto,
          estado: estadoActual,
          ultimaActividadTipo: 'OFERTA_EMITIDA',
          ultimaActividadFecha: presupuesto.snapshot.fechaEmision,
        };
      }

      if (presupuesto.fechaEnvio) {
        return {
          ...presupuesto,
          estado: estadoActual,
          ultimaActividadTipo: 'ENVIADO',
          ultimaActividadFecha: presupuesto.fechaEnvio,
        };
      }

      return {
        ...presupuesto,
        estado: estadoActual,
        ultimaActividadTipo: 'CREADO',
        ultimaActividadFecha: presupuesto.fecha,
      };
    });

    res.json(presupuestos);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener presupuestos' });
  }
});

router.get('/motor/catalogo', async (_req: Request, res: Response) => {
  try {
    const soluciones = await prisma.solucionCatalogo.findMany({
      where: { activa: true },
      select: {
        id: true,
        codigo: true,
        nombre: true,
        descripcion: true,
      },
      orderBy: { nombre: 'asc' },
    });

    res.json({
      soluciones,
      defaults: {
        ivaPorcentaje: 21,
        validezDias: 30,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener catálogo del motor' });
  }
});

router.post('/motor', validate(crearPresupuestoMotorSchema), async (req: Request, res: Response) => {
  try {
    const {
      proyectoId,
      clienteOperativoId,
      solucionId,
      numVehiculos,
      tipologiaVehiculo,
      fabricantesModelos,
      piloto,
      objetivoProyecto,
      horarioIntervencion,
      nocturnidad,
      integraciones,
      extras,
      validezDias,
      ivaPorcentaje,
      confidencial,
      textoConfidencialidad,
    } = req.body;

    const proyecto = await prisma.proyecto.findUnique({
      where: { id: proyectoId },
      include: { cliente: { select: { nombre: true } } },
    });

    if (!proyecto) {
      res.status(404).json({ error: 'Proyecto no encontrado' });
      return;
    }

    if (proyecto.estado === 'CANCELADO') {
      res.status(400).json({ error: 'No se puede crear presupuesto sobre un proyecto cancelado' });
      return;
    }

    const solucion = await prisma.solucionCatalogo.findUnique({
      where: { id: solucionId },
      include: {
        plantillas: { include: { plantilla: true } },
      },
    });

    if (!solucion || !solucion.activa) {
      res.status(404).json({ error: 'Solución no encontrada o inactiva' });
      return;
    }

    const reglas = solucion.reglasJson as unknown as ReglasSolucion;
    if (!reglas?.lineas?.length) {
      res.status(400).json({ error: 'La solución no tiene reglas de cálculo configuradas' });
      return;
    }

    const skus = [...new Set(reglas.lineas.map((linea) => linea.sku))];
    const ahora = new Date();
    const itemsCatalogo = await prisma.itemCatalogo.findMany({
      where: {
        sku: { in: skus },
        activo: true,
        vigenciaDesde: { lte: ahora },
        OR: [{ vigenciaHasta: null }, { vigenciaHasta: { gte: ahora } }],
      },
    });

    const itemBySku = new Map(itemsCatalogo.map((item) => [item.sku, item]));
    const skusNoEncontrados = skus.filter((sku) => !itemBySku.has(sku));
    if (skusNoEncontrados.length > 0) {
      res.status(400).json({
        error: 'Hay SKUs sin precio vigente en catálogo',
        skusNoEncontrados,
      });
      return;
    }

    let multiplicador = 1;
    if (nocturnidad && reglas.ajustes?.nocturnidadMultiplicador) {
      multiplicador *= reglas.ajustes.nocturnidadMultiplicador;
    }
    if (integraciones && reglas.ajustes?.integracionesMultiplicador) {
      multiplicador *= reglas.ajustes.integracionesMultiplicador;
    }
    if (piloto && reglas.ajustes?.pilotoMultiplicador) {
      multiplicador *= reglas.ajustes.pilotoMultiplicador;
    }

    const lineasMotor = reglas.lineas
      .filter((regla) => (regla.soloSiPiloto ? piloto : true))
      .map((regla, index) => {
        const item = itemBySku.get(regla.sku)!;
        const cantidadBase = regla.cantidad.tipo === 'POR_VEHICULO'
          ? regla.cantidad.valor * numVehiculos
          : regla.cantidad.valor;
        const cantidad = Math.round(cantidadBase * 1000) / 1000;
        const precioUnitario = Math.round(item.precioBase * multiplicador * 10000) / 10000;
        const costeUnitario = Math.round(item.costeBase * multiplicador * 10000) / 10000;
        const subtotal = Math.round(cantidad * precioUnitario * 100) / 100;
        const costeSubtotal = Math.round(cantidad * costeUnitario * 100) / 100;

        return {
          bloque: regla.bloque,
          itemCatalogoId: item.id,
          codigo: item.sku,
          descripcion: regla.descripcionOverride || item.descripcion,
          unidad: item.unidad,
          cantidad,
          precioUnitario,
          subtotal,
          costeUnitario,
          costeSubtotal,
          origen: 'AUTO',
          orden: index + 1,
        };
      });

    if (lineasMotor.length === 0) {
      res.status(400).json({ error: 'No se han generado líneas económicas con los parámetros recibidos' });
      return;
    }

    const totalBloqueA = lineasMotor.filter((l) => l.bloque === 'A_SUMINISTRO_EQUIPOS').reduce((sum, l) => sum + l.subtotal, 0);
    const totalBloqueB = lineasMotor.filter((l) => l.bloque === 'B_MATERIALES_INSTALACION').reduce((sum, l) => sum + l.subtotal, 0);
    const totalBloqueC = lineasMotor.filter((l) => l.bloque === 'C_MANO_OBRA').reduce((sum, l) => sum + l.subtotal, 0);
    const totalBloqueD = lineasMotor.filter((l) => l.bloque === 'D_MANTENIMIENTO_1_3').reduce((sum, l) => sum + l.subtotal, 0);
    const totalBloqueE = lineasMotor.filter((l) => l.bloque === 'E_OPCIONALES_4_5').reduce((sum, l) => sum + l.subtotal, 0);

    const costeBloqueA = lineasMotor.filter((l) => l.bloque === 'A_SUMINISTRO_EQUIPOS').reduce((sum, l) => sum + l.costeSubtotal, 0);
    const costeBloqueB = lineasMotor.filter((l) => l.bloque === 'B_MATERIALES_INSTALACION').reduce((sum, l) => sum + l.costeSubtotal, 0);
    const costeBloqueC = lineasMotor.filter((l) => l.bloque === 'C_MANO_OBRA').reduce((sum, l) => sum + l.costeSubtotal, 0);
    const costeBloqueD = lineasMotor.filter((l) => l.bloque === 'D_MANTENIMIENTO_1_3').reduce((sum, l) => sum + l.costeSubtotal, 0);
    const costeBloqueE = lineasMotor.filter((l) => l.bloque === 'E_OPCIONALES_4_5').reduce((sum, l) => sum + l.costeSubtotal, 0);

    const baseImponible = Math.round((totalBloqueA + totalBloqueB + totalBloqueC + totalBloqueD + totalBloqueE) * 100) / 100;
    const ivaImporte = Math.round(baseImponible * (ivaPorcentaje / 100) * 100) / 100;
    const totalConIva = Math.round((baseImponible + ivaImporte) * 100) / 100;
    const precioUnitarioVehiculo = Math.round((totalConIva / numVehiculos) * 100) / 100;

    const costeTotal = Math.round((costeBloqueA + costeBloqueB + costeBloqueC + costeBloqueD + costeBloqueE) * 100) / 100;
    const margenBruto = Math.round((baseImponible - costeTotal) * 100) / 100;
    const margenPorcentaje = baseImponible > 0
      ? Math.round(((margenBruto / baseImponible) * 100) * 100) / 100
      : 0;

    const variablesTexto: Record<string, string | number> = {
      codigoOferta: generarCodigoOferta(),
      fecha: new Date().toLocaleDateString('es-ES'),
      clienteContratante: proyecto.cliente.nombre,
      clienteOperativo: proyecto.cliente.nombre,
      proyecto: proyecto.nombre,
      solucion: solucion.nombre,
      numVehiculos,
      totalConIva,
    };

    const renderizarPlantilla = (contenido: string) =>
      contenido.replace(/\{\{(.*?)\}\}/g, (_, key: string) => String(variablesTexto[key.trim()] ?? ''));

    const codigo = generarCodigoPresupuesto();
    const codigoOferta = String(variablesTexto.codigoOferta);

    const presupuesto = await prisma.presupuesto.create({
      data: {
        codigo,
        codigoOferta,
        versionOferta: 1,
        proyectoId,
        validezDias,
        confidencial,
        textoConfidencialidad,
        clienteOperativoNombre: proyecto.cliente.nombre,
        totalTrabajos: totalBloqueC,
        totalMateriales: totalBloqueA + totalBloqueB,
        totalDesplazamientos: 0,
        totalCliente: baseImponible,
        baseImponible,
        ivaPorcentaje,
        ivaImporte,
        totalConIva,
        precioUnitarioVehiculo,
        totalBloqueA,
        totalBloqueB,
        totalBloqueC,
        totalBloqueD,
        totalBloqueE,
        costeTrabajos: costeBloqueC,
        costeMateriales: costeBloqueA + costeBloqueB,
        costeDesplazamientos: 0,
        costeTotal,
        margenBruto,
        margenPorcentaje,
        contexto: {
          create: {
            clienteOperativoId,
            solucionId,
            numVehiculos,
            tipologiaVehiculo,
            fabricantesModelos,
            piloto,
            horarioIntervencion,
            nocturnidad,
            integraciones,
            extrasJson: extras,
            objetivoProyecto,
          },
        },
        lineasMotor: {
          create: lineasMotor,
        },
        textos: {
          create: solucion.plantillas
            .filter((sp) => sp.plantilla.activa)
            .map((sp, index) => ({
              tipo: sp.plantilla.tipo,
              titulo: sp.plantilla.nombre,
              contenido: renderizarPlantilla(sp.plantilla.contenido),
              plantillaId: sp.plantilla.id,
              versionPlantilla: sp.plantilla.version,
              orden: index + 1,
            })),
        },
      },
      include: {
        proyecto: { select: { id: true, codigo: true, nombre: true, cliente: { select: { id: true, nombre: true } } } },
        contexto: true,
        lineasMotor: { orderBy: { orden: 'asc' } },
        textos: { orderBy: { orden: 'asc' } },
      },
    });

    res.status(201).json(presupuesto);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al generar presupuesto por motor' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const presupuesto = await prisma.presupuesto.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        proyecto: {
          include: { cliente: true },
        },
        replanteo: {
          include: { cochera: true, tipoAutobus: true },
        },
        lineasTrabajo: {
          include: { trabajo: { select: { id: true, codigo: true, nombreComercial: true, unidad: true } } },
          orderBy: { orden: 'asc' },
        },
        lineasMaterial: {
          include: { material: { select: { id: true, sku: true, descripcion: true, unidad: true } } },
          orderBy: { orden: 'asc' },
        },
        lineasDesplazamiento: { orderBy: { orden: 'asc' } },
        contexto: true,
        lineasMotor: { orderBy: { orden: 'asc' } },
        textos: { orderBy: { orden: 'asc' } },
        snapshot: true,
      },
    });
    if (!presupuesto) { res.status(404).json({ error: 'Presupuesto no encontrado' }); return; }
    res.json(presupuesto);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener presupuesto' });
  }
});

router.get('/:id/versiones', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const presupuesto = await prisma.presupuesto.findUnique({
      where: { id },
      select: {
        id: true,
        codigo: true,
        codigoOferta: true,
        proyectoId: true,
      },
    });

    if (!presupuesto) {
      res.status(404).json({ error: 'Presupuesto no encontrado' });
      return;
    }

    const versiones = presupuesto.codigoOferta
      ? await prisma.presupuesto.findMany({
          where: {
            proyectoId: presupuesto.proyectoId,
            codigoOferta: presupuesto.codigoOferta,
          },
          select: {
            id: true,
            codigo: true,
            codigoOferta: true,
            versionOferta: true,
            estado: true,
            fecha: true,
            totalCliente: true,
            totalConIva: true,
            snapshot: {
              select: {
                fechaEmision: true,
                versionOferta: true,
              },
            },
          },
          orderBy: [
            { versionOferta: 'desc' },
            { fecha: 'desc' },
          ],
        })
      : await prisma.presupuesto.findMany({
          where: {
            id: presupuesto.id,
          },
          select: {
            id: true,
            codigo: true,
            codigoOferta: true,
            versionOferta: true,
            estado: true,
            fecha: true,
            totalCliente: true,
            totalConIva: true,
            snapshot: {
              select: {
                fechaEmision: true,
                versionOferta: true,
              },
            },
          },
        });

    res.json({
      familiaCodigoOferta: presupuesto.codigoOferta || null,
      totalVersiones: versiones.length,
      versiones,
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener historial de versiones' });
  }
});

// ============================================================================
// GENERAR PRESUPUESTO DESDE REPLANTEO (Automatización clave 7.1)
// ============================================================================

router.post('/generar-desde-replanteo/:replanteoId', async (req: Request, res: Response) => {
  try {
    const replanteoId = Number(req.params.replanteoId);

    // Obtener replanteo con todos los datos
    const replanteo = await prisma.replanteo.findUnique({
      where: { id: replanteoId },
      include: {
        proyecto: true,
        trabajos: { include: { trabajo: true } },
        materiales: { include: { material: true } },
      },
    });

    if (!replanteo) { res.status(404).json({ error: 'Replanteo no encontrado' }); return; }
    if (replanteo.estado !== 'VALIDADO') {
      res.status(400).json({ error: 'El replanteo debe estar VALIDADO para generar presupuesto' });
      return;
    }

    const codigo = generarCodigoPresupuesto();

    // Calcular líneas de trabajo
    const lineasTrabajo = replanteo.trabajos.map((rt, idx) => {
      const cantidadTotal = rt.trabajo.unidad === 'POR_BUS'
        ? rt.cantidad * replanteo.numBuses
        : rt.cantidad;
      const totalCliente = cantidadTotal * rt.trabajo.precioVentaEstandar;
      const totalInterno = cantidadTotal * rt.trabajo.costeInternoEstandar;

      return {
        trabajoId: rt.trabajoId,
        descripcionCliente: rt.trabajo.nombreComercial,
        cantidad: cantidadTotal,
        precioUnitarioCliente: rt.trabajo.precioVentaEstandar,
        totalCliente,
        costeUnitarioInterno: rt.trabajo.costeInternoEstandar,
        totalInterno,
        margen: totalCliente - totalInterno,
        orden: idx + 1,
      };
    });

    // Calcular líneas de material
    const lineasMaterial = replanteo.materiales.map((rm, idx) => {
      const totalCliente = rm.cantidadEstimada * rm.material.precioEstandar;
      const totalInterno = rm.cantidadEstimada * rm.material.costeMedio;

      return {
        materialId: rm.materialId,
        descripcionCliente: rm.material.descripcion,
        cantidad: rm.cantidadEstimada,
        precioUnitarioCliente: rm.material.precioEstandar,
        totalCliente,
        costeUnitarioInterno: rm.material.costeMedio,
        totalInterno,
        margen: totalCliente - totalInterno,
        orden: idx + 1,
      };
    });

    // Totales
    const totalTrabajos = lineasTrabajo.reduce((s, l) => s + l.totalCliente, 0);
    const totalMateriales = lineasMaterial.reduce((s, l) => s + l.totalCliente, 0);
    const costeTrabajos = lineasTrabajo.reduce((s, l) => s + l.totalInterno, 0);
    const costeMateriales = lineasMaterial.reduce((s, l) => s + l.totalInterno, 0);
    const totalCliente = totalTrabajos + totalMateriales;
    const costeTotal = costeTrabajos + costeMateriales;
    const margenBruto = totalCliente - costeTotal;
    const margenPorcentaje = totalCliente > 0 ? (margenBruto / totalCliente) * 100 : 0;

    // Crear presupuesto con todas las líneas
    const presupuesto = await prisma.presupuesto.create({
      data: {
        codigo,
        proyectoId: replanteo.proyectoId,
        replanteoId: replanteo.id,
        totalTrabajos,
        totalMateriales,
        totalCliente,
        costeTrabajos,
        costeMateriales,
        costeTotal,
        margenBruto,
        margenPorcentaje: Math.round(margenPorcentaje * 100) / 100,
        lineasTrabajo: { create: lineasTrabajo },
        lineasMaterial: { create: lineasMaterial },
      },
      include: {
        lineasTrabajo: { include: { trabajo: true } },
        lineasMaterial: { include: { material: true } },
      },
    });

    res.status(201).json(presupuesto);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al generar presupuesto' });
  }
});

// ============================================================================
// CREAR PRESUPUESTO MANUAL
// ============================================================================

const presupuestoSchema = z.object({
  proyectoId: z.number().int().positive(),
  replanteoId: z.number().int().positive().optional(),
  validezDias: z.number().int().positive().default(30),
  observacionesCliente: z.string().optional(),
  observacionesInternas: z.string().optional(),
  descuentoPorcentaje: z.number().min(0).max(100).default(0),
});

router.post('/', validate(presupuestoSchema), async (req: Request, res: Response) => {
  try {
    const codigo = generarCodigoPresupuesto();
    const presupuesto = await prisma.presupuesto.create({
      data: { ...req.body, codigo },
    });
    res.status(201).json(presupuesto);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear presupuesto' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const presupuesto = await prisma.presupuesto.update({
      where: { id: Number(req.params.id) },
      data: req.body,
    });
    res.json(presupuesto);
  } catch (error: any) {
    if (error.code === 'P2025') { res.status(404).json({ error: 'No encontrado' }); return; }
    res.status(500).json({ error: 'Error al actualizar' });
  }
});

// ============================================================================
// CAMBIAR ESTADO (con automatizaciones al aceptar - 7.2)
// ============================================================================

router.patch('/:id/estado', validate(cambiarEstadoSchema), async (req: Request, res: Response) => {
  try {
    const { estado } = req.body;
    const id = Number(req.params.id);

    const actual = await prisma.presupuesto.findUnique({
      where: { id },
      select: { id: true, estado: true, fechaEnvio: true, fechaRespuesta: true },
    });

    if (!actual) {
      res.status(404).json({ error: 'Presupuesto no encontrado' });
      return;
    }

    if (actual.estado === estado) {
      res.json({ message: 'Estado sin cambios', estado: actual.estado });
      return;
    }

    const permitidos = TRANSICIONES_ESTADO_PERMITIDAS[actual.estado] || [];
    if (!permitidos.includes(estado)) {
      res.status(409).json({
        error: `Transición inválida: ${actual.estado} → ${estado}`,
        estadoActual: actual.estado,
        permitidos,
      });
      return;
    }

    if (estado === 'ACEPTADO') {
      const snapshot = await prisma.presupuestoSnapshot.findUnique({
        where: { presupuestoId: id },
        select: { id: true },
      });

      if (!snapshot) {
        res.status(409).json({
          error: 'No se puede aceptar sin oferta emitida. Emite la oferta antes de aceptar.',
          estadoActual: actual.estado,
          permitidos,
        });
        return;
      }
    }

    const presupuesto = await prisma.presupuesto.update({
      where: { id },
      data: {
        estado,
        ...(estado === 'ENVIADO' && !actual.fechaEnvio ? { fechaEnvio: new Date() } : {}),
        ...((estado === 'ACEPTADO' || estado === 'RECHAZADO') && !actual.fechaRespuesta ? { fechaRespuesta: new Date() } : {}),
      },
    });

    // Al ACEPTAR: generar automáticamente compras y órdenes de trabajo (7.2)
    if (estado === 'ACEPTADO' && actual.estado !== 'ACEPTADO') {
      const full = await prisma.presupuesto.findUnique({
        where: { id },
        include: {
          proyecto: true,
          replanteo: { include: { cochera: true } },
          lineasMaterial: { include: { material: true } },
          lineasTrabajo: { include: { trabajo: true } },
        },
      });

      if (full) {
        const marcaAuto = `AUTO_PRESUPUESTO:${full.id}`;

        // Actualizar estado del proyecto
        await prisma.proyecto.update({
          where: { id: full.proyectoId },
          data: { estado: 'ACEPTADO' },
        });

        // Generar solicitudes de compra agrupadas por proveedor
        const materialesPorProveedor = new Map<string, typeof full.lineasMaterial>();
        for (const linea of full.lineasMaterial) {
          const proveedor = linea.material.proveedorHabitual || 'Sin proveedor';
          if (!materialesPorProveedor.has(proveedor)) {
            materialesPorProveedor.set(proveedor, []);
          }
          materialesPorProveedor.get(proveedor)!.push(linea);
        }

        const proveedoresOrdenados = [...materialesPorProveedor.entries()].sort((a, b) => a[0].localeCompare(b[0]));
        for (const [index, [proveedor, lineas]] of proveedoresOrdenados.entries()) {
          const codigoCompra = `COM-AUTO-PRE-${full.id}-${index + 1}`;
          await prisma.solicitudCompra.upsert({
            where: { codigo: codigoCompra },
            update: {
              proyectoId: full.proyectoId,
              proveedor,
              observaciones: marcaAuto,
              lineas: {
                deleteMany: {},
                create: lineas.map((l) => ({
                  materialId: l.materialId,
                  cantidad: l.cantidad,
                  costeEstimado: l.totalInterno,
                })),
              },
            },
            create: {
              codigo: codigoCompra,
              proyectoId: full.proyectoId,
              proveedor,
              observaciones: marcaAuto,
              lineas: {
                create: lineas.map((l) => ({
                  materialId: l.materialId,
                  cantidad: l.cantidad,
                  costeEstimado: l.totalInterno,
                })),
              },
            },
          });
        }

        // Generar orden de trabajo
        if (full.replanteo) {
          const codigoOT = `OT-AUTO-PRE-${full.id}`;
          await prisma.ordenTrabajo.upsert({
            where: { codigo: codigoOT },
            update: {
              proyectoId: full.proyectoId,
              cocheraId: full.replanteo.cocheraId,
              observaciones: marcaAuto,
              lineas: {
                deleteMany: {},
                create: full.lineasTrabajo.map((l) => ({
                  trabajoId: l.trabajoId,
                  cantidad: l.cantidad,
                  horasEstimadas: l.trabajo.tiempoEstandarHoras * l.cantidad,
                })),
              },
              materiales: {
                deleteMany: {},
                create: full.lineasMaterial.map((l) => ({
                  materialId: l.materialId,
                  cantidadEstimada: l.cantidad,
                })),
              },
            },
            create: {
              codigo: codigoOT,
              proyectoId: full.proyectoId,
              cocheraId: full.replanteo.cocheraId,
              observaciones: marcaAuto,
              lineas: {
                create: full.lineasTrabajo.map((l) => ({
                  trabajoId: l.trabajoId,
                  cantidad: l.cantidad,
                  horasEstimadas: l.trabajo.tiempoEstandarHoras * l.cantidad,
                })),
              },
              materiales: {
                create: full.lineasMaterial.map((l) => ({
                  materialId: l.materialId,
                  cantidadEstimada: l.cantidad,
                })),
              },
            },
          });
        }
      }
    }

    res.json(presupuesto);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al cambiar estado' });
  }
});

// ============================================================================
// RECALCULAR TOTALES
// ============================================================================

router.post('/:id/recalcular', validate(recalcularPresupuestoSchema), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const presupuesto = await prisma.presupuesto.findUnique({
      where: { id },
      include: {
        contexto: true,
        lineasMotor: true,
        lineasTrabajo: true,
        lineasMaterial: true,
        lineasDesplazamiento: true,
      },
    });

    if (!presupuesto) { res.status(404).json({ error: 'No encontrado' }); return; }

    if (presupuestoBloqueadoParaEdicion(presupuesto.estado)) {
      res.status(409).json({
        error: `El presupuesto está en estado ${presupuesto.estado} y no permite recalcular. Crea una nueva versión para modificarlo.`,
      });
      return;
    }

    // Recalcular por motor (nueva vía)
    if (presupuesto.contexto) {
      const solucionId = req.body.solucionId ?? presupuesto.contexto.solucionId;
      if (!solucionId) {
        res.status(400).json({ error: 'El presupuesto motor no tiene solución asociada' });
        return;
      }

      const solucion = await prisma.solucionCatalogo.findUnique({ where: { id: solucionId } });
      if (!solucion || !solucion.activa) {
        res.status(404).json({ error: 'Solución no encontrada o inactiva' });
        return;
      }

      const reglas = solucion.reglasJson as unknown as ReglasSolucion;
      if (!reglas?.lineas?.length) {
        res.status(400).json({ error: 'La solución no tiene reglas de cálculo configuradas' });
        return;
      }

      const numVehiculos = req.body.numVehiculos ?? presupuesto.contexto.numVehiculos;
      const piloto = req.body.piloto ?? presupuesto.contexto.piloto;
      const nocturnidad = req.body.nocturnidad ?? presupuesto.contexto.nocturnidad;
      const integraciones = req.body.integraciones ?? presupuesto.contexto.integraciones;
      const ivaPorcentaje = req.body.ivaPorcentaje ?? presupuesto.ivaPorcentaje;

      const skus = [...new Set(reglas.lineas.map((linea) => linea.sku))];
      const ahora = new Date();
      const itemsCatalogo = await prisma.itemCatalogo.findMany({
        where: {
          sku: { in: skus },
          activo: true,
          vigenciaDesde: { lte: ahora },
          OR: [{ vigenciaHasta: null }, { vigenciaHasta: { gte: ahora } }],
        },
      });

      const itemBySku = new Map(itemsCatalogo.map((item) => [item.sku, item]));
      const skusNoEncontrados = skus.filter((sku) => !itemBySku.has(sku));
      if (skusNoEncontrados.length > 0) {
        res.status(400).json({
          error: 'Hay SKUs sin precio vigente en catálogo',
          skusNoEncontrados,
        });
        return;
      }

      let multiplicador = 1;
      if (nocturnidad && reglas.ajustes?.nocturnidadMultiplicador) {
        multiplicador *= reglas.ajustes.nocturnidadMultiplicador;
      }
      if (integraciones && reglas.ajustes?.integracionesMultiplicador) {
        multiplicador *= reglas.ajustes.integracionesMultiplicador;
      }
      if (piloto && reglas.ajustes?.pilotoMultiplicador) {
        multiplicador *= reglas.ajustes.pilotoMultiplicador;
      }

      const lineasAuto = reglas.lineas
        .filter((regla) => (regla.soloSiPiloto ? piloto : true))
        .map((regla, index) => {
          const item = itemBySku.get(regla.sku)!;
          const cantidadBase = regla.cantidad.tipo === 'POR_VEHICULO'
            ? regla.cantidad.valor * numVehiculos
            : regla.cantidad.valor;
          const cantidad = Math.round(cantidadBase * 1000) / 1000;
          const precioUnitario = Math.round(item.precioBase * multiplicador * 10000) / 10000;
          const costeUnitario = Math.round(item.costeBase * multiplicador * 10000) / 10000;
          const subtotal = Math.round(cantidad * precioUnitario * 100) / 100;
          const costeSubtotal = Math.round(cantidad * costeUnitario * 100) / 100;

          return {
            presupuestoId: id,
            bloque: regla.bloque,
            itemCatalogoId: item.id,
            codigo: item.sku,
            descripcion: regla.descripcionOverride || item.descripcion,
            unidad: item.unidad,
            cantidad,
            precioUnitario,
            subtotal,
            costeUnitario,
            costeSubtotal,
            origen: 'AUTO',
            orden: index + 1,
          };
        });

      const lineasManuales = presupuesto.lineasMotor.filter((linea) => linea.origen === 'MANUAL');
      const lineasConsolidadas = [
        ...lineasAuto,
        ...lineasManuales.map((linea, idx) => ({
          ...linea,
          orden: lineasAuto.length + idx + 1,
        })),
      ];

      const totalBloqueA = lineasConsolidadas.filter((l) => l.bloque === 'A_SUMINISTRO_EQUIPOS').reduce((sum, l) => sum + l.subtotal, 0);
      const totalBloqueB = lineasConsolidadas.filter((l) => l.bloque === 'B_MATERIALES_INSTALACION').reduce((sum, l) => sum + l.subtotal, 0);
      const totalBloqueC = lineasConsolidadas.filter((l) => l.bloque === 'C_MANO_OBRA').reduce((sum, l) => sum + l.subtotal, 0);
      const totalBloqueD = lineasConsolidadas.filter((l) => l.bloque === 'D_MANTENIMIENTO_1_3').reduce((sum, l) => sum + l.subtotal, 0);
      const totalBloqueE = lineasConsolidadas.filter((l) => l.bloque === 'E_OPCIONALES_4_5').reduce((sum, l) => sum + l.subtotal, 0);

      const costeBloqueA = lineasConsolidadas.filter((l) => l.bloque === 'A_SUMINISTRO_EQUIPOS').reduce((sum, l) => sum + l.costeSubtotal, 0);
      const costeBloqueB = lineasConsolidadas.filter((l) => l.bloque === 'B_MATERIALES_INSTALACION').reduce((sum, l) => sum + l.costeSubtotal, 0);
      const costeBloqueC = lineasConsolidadas.filter((l) => l.bloque === 'C_MANO_OBRA').reduce((sum, l) => sum + l.costeSubtotal, 0);
      const costeBloqueD = lineasConsolidadas.filter((l) => l.bloque === 'D_MANTENIMIENTO_1_3').reduce((sum, l) => sum + l.costeSubtotal, 0);
      const costeBloqueE = lineasConsolidadas.filter((l) => l.bloque === 'E_OPCIONALES_4_5').reduce((sum, l) => sum + l.costeSubtotal, 0);

      const baseImponible = Math.round((totalBloqueA + totalBloqueB + totalBloqueC + totalBloqueD + totalBloqueE) * 100) / 100;
      const ivaImporte = Math.round(baseImponible * (ivaPorcentaje / 100) * 100) / 100;
      const totalConIva = Math.round((baseImponible + ivaImporte) * 100) / 100;
      const precioUnitarioVehiculo = numVehiculos > 0
        ? Math.round((totalConIva / numVehiculos) * 100) / 100
        : 0;

      const costeTotal = Math.round((costeBloqueA + costeBloqueB + costeBloqueC + costeBloqueD + costeBloqueE) * 100) / 100;
      const margenBruto = Math.round((baseImponible - costeTotal) * 100) / 100;
      const margenPorcentaje = baseImponible > 0
        ? Math.round(((margenBruto / baseImponible) * 100) * 100) / 100
        : 0;

      const updated = await prisma.$transaction(async (tx) => {
        await tx.presupuestoLineaMotor.deleteMany({
          where: { presupuestoId: id, OR: [{ origen: 'AUTO' }, { origen: null }] },
        });

        if (lineasAuto.length > 0) {
          await tx.presupuestoLineaMotor.createMany({ data: lineasAuto });
        }

        for (const [idx, lineaManual] of lineasManuales.entries()) {
          await tx.presupuestoLineaMotor.update({
            where: { id: lineaManual.id },
            data: { orden: lineasAuto.length + idx + 1 },
          });
        }

        await tx.presupuestoContexto.update({
          where: { presupuestoId: id },
          data: {
            clienteOperativoId: req.body.clienteOperativoId ?? presupuesto.contexto!.clienteOperativoId,
            solucionId,
            numVehiculos,
            tipologiaVehiculo: req.body.tipologiaVehiculo ?? presupuesto.contexto!.tipologiaVehiculo,
            fabricantesModelos: req.body.fabricantesModelos ?? presupuesto.contexto!.fabricantesModelos,
            piloto,
            horarioIntervencion: req.body.horarioIntervencion ?? presupuesto.contexto!.horarioIntervencion,
            nocturnidad,
            integraciones,
            extrasJson: req.body.extras ?? presupuesto.contexto!.extrasJson,
            objetivoProyecto: req.body.objetivoProyecto ?? presupuesto.contexto!.objetivoProyecto,
          },
        });

        await tx.presupuesto.update({
          where: { id },
          data: {
            ivaPorcentaje,
            validezDias: req.body.validezDias ?? presupuesto.validezDias,
            confidencial: req.body.confidencial ?? presupuesto.confidencial,
            textoConfidencialidad: req.body.textoConfidencialidad ?? presupuesto.textoConfidencialidad,
            totalTrabajos: totalBloqueC,
            totalMateriales: totalBloqueA + totalBloqueB,
            totalDesplazamientos: 0,
            totalCliente: baseImponible,
            baseImponible,
            ivaImporte,
            totalConIva,
            precioUnitarioVehiculo,
            totalBloqueA,
            totalBloqueB,
            totalBloqueC,
            totalBloqueD,
            totalBloqueE,
            costeTrabajos: costeBloqueC,
            costeMateriales: costeBloqueA + costeBloqueB,
            costeDesplazamientos: 0,
            costeTotal,
            margenBruto,
            margenPorcentaje,
          },
        });

        return tx.presupuesto.findUnique({
          where: { id },
          include: {
            contexto: true,
            lineasMotor: { orderBy: { orden: 'asc' } },
            textos: { orderBy: { orden: 'asc' } },
          },
        });
      });

      res.json(updated);
      return;
    }

    const totalTrabajos = presupuesto.lineasTrabajo.reduce((s, l) => s + l.totalCliente, 0);
    const totalMateriales = presupuesto.lineasMaterial.reduce((s, l) => s + l.totalCliente, 0);
    const totalDesplazamientos = presupuesto.lineasDesplazamiento.reduce((s, l) => s + l.precioCliente, 0);
    const costeTrabajos = presupuesto.lineasTrabajo.reduce((s, l) => s + l.totalInterno, 0);
    const costeMateriales = presupuesto.lineasMaterial.reduce((s, l) => s + l.totalInterno, 0);
    const costeDesplazamientos = presupuesto.lineasDesplazamiento.reduce((s, l) => s + l.costeInterno, 0);

    const subtotalCliente = totalTrabajos + totalMateriales + totalDesplazamientos;
    const descuento = subtotalCliente * (presupuesto.descuentoPorcentaje / 100);
    const totalCliente = subtotalCliente - descuento;
    const costeTotal = costeTrabajos + costeMateriales + costeDesplazamientos;
    const margenBruto = totalCliente - costeTotal;
    const margenPorcentaje = totalCliente > 0 ? (margenBruto / totalCliente) * 100 : 0;

    const updated = await prisma.presupuesto.update({
      where: { id },
      data: {
        totalTrabajos,
        totalMateriales,
        totalDesplazamientos,
        costeTrabajos,
        costeMateriales,
        costeDesplazamientos,
        totalCliente,
        costeTotal,
        margenBruto,
        margenPorcentaje: Math.round(margenPorcentaje * 100) / 100,
      },
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Error al recalcular' });
  }
});

// ============================================================================
// VERSIONADO MANUAL (crear nueva versión editable)
// ============================================================================

router.post('/:id/versionar', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const origen = await prisma.presupuesto.findUnique({
      where: { id },
      include: {
        contexto: true,
        lineasMotor: { orderBy: { orden: 'asc' } },
        textos: { orderBy: { orden: 'asc' } },
        lineasTrabajo: { orderBy: { orden: 'asc' } },
        lineasMaterial: { orderBy: { orden: 'asc' } },
        lineasDesplazamiento: { orderBy: { orden: 'asc' } },
      },
    });

    if (!origen) {
      res.status(404).json({ error: 'Presupuesto no encontrado' });
      return;
    }

    if (!presupuestoBloqueadoParaEdicion(origen.estado)) {
      res.status(409).json({
        error: `Solo se puede versionar manualmente un presupuesto bloqueado (estado actual: ${origen.estado})`,
      });
      return;
    }

    const nuevoCodigo = generarCodigoPresupuesto();
    const codigoOfertaFamilia = origen.codigoOferta || generarCodigoOferta();
    const nuevaVersion = origen.codigoOferta
      ? ((await prisma.presupuesto.aggregate({
          where: {
            proyectoId: origen.proyectoId,
            codigoOferta: codigoOfertaFamilia,
          },
          _max: {
            versionOferta: true,
          },
        }))._max.versionOferta || 0) + 1
      : 1;

    const nuevo = await prisma.$transaction(async (tx) => {
      const creado = await tx.presupuesto.create({
        data: {
          codigo: nuevoCodigo,
          codigoOferta: codigoOfertaFamilia,
          versionOferta: nuevaVersion,
          proyectoId: origen.proyectoId,
          replanteoId: origen.replanteoId,
          validezDias: origen.validezDias,
          estado: 'BORRADOR',
          confidencial: origen.confidencial,
          textoConfidencialidad: origen.textoConfidencialidad,
          clienteOperativoNombre: origen.clienteOperativoNombre,
          totalTrabajos: origen.totalTrabajos,
          totalMateriales: origen.totalMateriales,
          totalDesplazamientos: origen.totalDesplazamientos,
          descuentoPorcentaje: origen.descuentoPorcentaje,
          totalCliente: origen.totalCliente,
          baseImponible: origen.baseImponible,
          ivaPorcentaje: origen.ivaPorcentaje,
          ivaImporte: origen.ivaImporte,
          totalConIva: origen.totalConIva,
          precioUnitarioVehiculo: origen.precioUnitarioVehiculo,
          totalBloqueA: origen.totalBloqueA,
          totalBloqueB: origen.totalBloqueB,
          totalBloqueC: origen.totalBloqueC,
          totalBloqueD: origen.totalBloqueD,
          totalBloqueE: origen.totalBloqueE,
          costeTrabajos: origen.costeTrabajos,
          costeMateriales: origen.costeMateriales,
          costeDesplazamientos: origen.costeDesplazamientos,
          costeTotal: origen.costeTotal,
          margenBruto: origen.margenBruto,
          margenPorcentaje: origen.margenPorcentaje,
          observacionesCliente: origen.observacionesCliente,
          observacionesInternas: origen.observacionesInternas,
          fechaEnvio: null,
          fechaRespuesta: null,
        },
      });

      if (origen.contexto) {
        await tx.presupuestoContexto.create({
          data: {
            presupuestoId: creado.id,
            clienteOperativoId: origen.contexto.clienteOperativoId,
            solucionId: origen.contexto.solucionId,
            numVehiculos: origen.contexto.numVehiculos,
            tipologiaVehiculo: origen.contexto.tipologiaVehiculo,
            fabricantesModelos: origen.contexto.fabricantesModelos,
            piloto: origen.contexto.piloto,
            horarioIntervencion: origen.contexto.horarioIntervencion,
            nocturnidad: origen.contexto.nocturnidad,
            integraciones: origen.contexto.integraciones,
            extrasJson: origen.contexto.extrasJson ?? undefined,
            objetivoProyecto: origen.contexto.objetivoProyecto,
            ubicacionesJson: origen.contexto.ubicacionesJson ?? undefined,
            ventanaIntervencion: origen.contexto.ventanaIntervencion,
          },
        });
      }

      if (origen.lineasMotor.length > 0) {
        await tx.presupuestoLineaMotor.createMany({
          data: origen.lineasMotor.map((linea) => ({
            presupuestoId: creado.id,
            bloque: linea.bloque,
            itemCatalogoId: linea.itemCatalogoId,
            codigo: linea.codigo,
            descripcion: linea.descripcion,
            unidad: linea.unidad,
            cantidad: linea.cantidad,
            precioUnitario: linea.precioUnitario,
            subtotal: linea.subtotal,
            costeUnitario: linea.costeUnitario,
            costeSubtotal: linea.costeSubtotal,
            origen: linea.origen,
            orden: linea.orden,
          })),
        });
      }

      if (origen.textos.length > 0) {
        await tx.presupuestoTexto.createMany({
          data: origen.textos.map((texto) => ({
            presupuestoId: creado.id,
            tipo: texto.tipo,
            titulo: texto.titulo,
            contenido: texto.contenido,
            plantillaId: texto.plantillaId,
            versionPlantilla: texto.versionPlantilla,
            orden: texto.orden,
          })),
        });
      }

      if (origen.lineasTrabajo.length > 0) {
        await tx.presupuestoLineaTrabajo.createMany({
          data: origen.lineasTrabajo.map((linea) => ({
            presupuestoId: creado.id,
            trabajoId: linea.trabajoId,
            descripcionCliente: linea.descripcionCliente,
            cantidad: linea.cantidad,
            precioUnitarioCliente: linea.precioUnitarioCliente,
            totalCliente: linea.totalCliente,
            costeUnitarioInterno: linea.costeUnitarioInterno,
            totalInterno: linea.totalInterno,
            margen: linea.margen,
            orden: linea.orden,
          })),
        });
      }

      if (origen.lineasMaterial.length > 0) {
        await tx.presupuestoLineaMaterial.createMany({
          data: origen.lineasMaterial.map((linea) => ({
            presupuestoId: creado.id,
            materialId: linea.materialId,
            descripcionCliente: linea.descripcionCliente,
            cantidad: linea.cantidad,
            precioUnitarioCliente: linea.precioUnitarioCliente,
            totalCliente: linea.totalCliente,
            costeUnitarioInterno: linea.costeUnitarioInterno,
            totalInterno: linea.totalInterno,
            margen: linea.margen,
            orden: linea.orden,
          })),
        });
      }

      if (origen.lineasDesplazamiento.length > 0) {
        await tx.presupuestoLineaDesplazamiento.createMany({
          data: origen.lineasDesplazamiento.map((linea) => ({
            presupuestoId: creado.id,
            descripcion: linea.descripcion,
            precioCliente: linea.precioCliente,
            costeInterno: linea.costeInterno,
            margen: linea.margen,
            orden: linea.orden,
          })),
        });
      }

      return creado;
    });

    res.status(201).json({
      message: 'Nueva versión editable creada',
      id: nuevo.id,
      codigo: nuevo.codigo,
      codigoOferta: codigoOfertaFamilia,
      versionOferta: nuevaVersion,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear nueva versión' });
  }
});

// ============================================================================
// LÍNEAS MOTOR
// ============================================================================

router.patch('/:id/lineas-motor/:lineaId', validate(actualizarLineaMotorSchema), async (req: Request, res: Response) => {
  try {
    const presupuestoId = Number(req.params.id);
    const lineaId = Number(req.params.lineaId);

    const presupuesto = await prisma.presupuesto.findUnique({
      where: { id: presupuestoId },
      include: {
        contexto: true,
      },
    });

    if (!presupuesto) {
      res.status(404).json({ error: 'Presupuesto no encontrado' });
      return;
    }

    if (!presupuesto.contexto) {
      res.status(400).json({ error: 'Este presupuesto no pertenece al motor de presupuestos' });
      return;
    }

    if (presupuestoBloqueadoParaEdicion(presupuesto.estado)) {
      res.status(409).json({
        error: `El presupuesto está en estado ${presupuesto.estado} y no permite editar líneas. Crea una nueva versión para modificarlo.`,
      });
      return;
    }

    const lineaActual = await prisma.presupuestoLineaMotor.findFirst({
      where: { id: lineaId, presupuestoId },
    });

    if (!lineaActual) {
      res.status(404).json({ error: 'Línea motor no encontrada' });
      return;
    }

    const cantidad = req.body.cantidad ?? lineaActual.cantidad;
    const precioUnitario = req.body.precioUnitario ?? lineaActual.precioUnitario;
    const costeUnitario = req.body.costeUnitario ?? lineaActual.costeUnitario;
    const subtotal = Math.round(cantidad * precioUnitario * 100) / 100;
    const costeSubtotal = Math.round(cantidad * costeUnitario * 100) / 100;

    const lineaActualizada = await prisma.$transaction(async (tx) => {
      const linea = await tx.presupuestoLineaMotor.update({
        where: { id: lineaId },
        data: {
          codigo: req.body.codigo ?? lineaActual.codigo,
          descripcion: req.body.descripcion ?? lineaActual.descripcion,
          unidad: req.body.unidad ?? lineaActual.unidad,
          cantidad,
          precioUnitario,
          costeUnitario,
          subtotal,
          costeSubtotal,
          bloque: req.body.bloque ?? lineaActual.bloque,
          origen: 'MANUAL',
        },
      });

      const lineasMotor = await tx.presupuestoLineaMotor.findMany({
        where: { presupuestoId },
      });

      const totalBloqueA = lineasMotor.filter((l) => l.bloque === 'A_SUMINISTRO_EQUIPOS').reduce((sum, l) => sum + l.subtotal, 0);
      const totalBloqueB = lineasMotor.filter((l) => l.bloque === 'B_MATERIALES_INSTALACION').reduce((sum, l) => sum + l.subtotal, 0);
      const totalBloqueC = lineasMotor.filter((l) => l.bloque === 'C_MANO_OBRA').reduce((sum, l) => sum + l.subtotal, 0);
      const totalBloqueD = lineasMotor.filter((l) => l.bloque === 'D_MANTENIMIENTO_1_3').reduce((sum, l) => sum + l.subtotal, 0);
      const totalBloqueE = lineasMotor.filter((l) => l.bloque === 'E_OPCIONALES_4_5').reduce((sum, l) => sum + l.subtotal, 0);

      const costeBloqueA = lineasMotor.filter((l) => l.bloque === 'A_SUMINISTRO_EQUIPOS').reduce((sum, l) => sum + l.costeSubtotal, 0);
      const costeBloqueB = lineasMotor.filter((l) => l.bloque === 'B_MATERIALES_INSTALACION').reduce((sum, l) => sum + l.costeSubtotal, 0);
      const costeBloqueC = lineasMotor.filter((l) => l.bloque === 'C_MANO_OBRA').reduce((sum, l) => sum + l.costeSubtotal, 0);
      const costeBloqueD = lineasMotor.filter((l) => l.bloque === 'D_MANTENIMIENTO_1_3').reduce((sum, l) => sum + l.costeSubtotal, 0);
      const costeBloqueE = lineasMotor.filter((l) => l.bloque === 'E_OPCIONALES_4_5').reduce((sum, l) => sum + l.costeSubtotal, 0);

      const baseImponible = Math.round((totalBloqueA + totalBloqueB + totalBloqueC + totalBloqueD + totalBloqueE) * 100) / 100;
      const ivaImporte = Math.round(baseImponible * (presupuesto.ivaPorcentaje / 100) * 100) / 100;
      const totalConIva = Math.round((baseImponible + ivaImporte) * 100) / 100;
      const precioUnitarioVehiculo = presupuesto.contexto!.numVehiculos > 0
        ? Math.round((totalConIva / presupuesto.contexto!.numVehiculos) * 100) / 100
        : 0;

      const costeTotal = Math.round((costeBloqueA + costeBloqueB + costeBloqueC + costeBloqueD + costeBloqueE) * 100) / 100;
      const margenBruto = Math.round((baseImponible - costeTotal) * 100) / 100;
      const margenPorcentaje = baseImponible > 0
        ? Math.round(((margenBruto / baseImponible) * 100) * 100) / 100
        : 0;

      await tx.presupuesto.update({
        where: { id: presupuestoId },
        data: {
          totalTrabajos: totalBloqueC,
          totalMateriales: totalBloqueA + totalBloqueB,
          totalCliente: baseImponible,
          baseImponible,
          ivaImporte,
          totalConIva,
          precioUnitarioVehiculo,
          totalBloqueA,
          totalBloqueB,
          totalBloqueC,
          totalBloqueD,
          totalBloqueE,
          costeTrabajos: costeBloqueC,
          costeMateriales: costeBloqueA + costeBloqueB,
          costeTotal,
          margenBruto,
          margenPorcentaje,
        },
      });

      return linea;
    });

    res.json(lineaActualizada);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar línea de motor' });
  }
});

router.post('/:id/lineas-motor', validate(crearLineaMotorSchema), async (req: Request, res: Response) => {
  try {
    const presupuestoId = Number(req.params.id);

    const presupuesto = await prisma.presupuesto.findUnique({
      where: { id: presupuestoId },
      include: { contexto: true },
    });

    if (!presupuesto) {
      res.status(404).json({ error: 'Presupuesto no encontrado' });
      return;
    }

    if (!presupuesto.contexto) {
      res.status(400).json({ error: 'Este presupuesto no pertenece al motor de presupuestos' });
      return;
    }

    if (presupuestoBloqueadoParaEdicion(presupuesto.estado)) {
      res.status(409).json({
        error: `El presupuesto está en estado ${presupuesto.estado} y no permite añadir líneas. Crea una nueva versión para modificarlo.`,
      });
      return;
    }

    const subtotal = Math.round(req.body.cantidad * req.body.precioUnitario * 100) / 100;
    const costeSubtotal = Math.round(req.body.cantidad * req.body.costeUnitario * 100) / 100;

    const lineaCreada = await prisma.$transaction(async (tx) => {
      const ordenSiguiente = await tx.presupuestoLineaMotor.count({
        where: { presupuestoId },
      });

      const linea = await tx.presupuestoLineaMotor.create({
        data: {
          presupuestoId,
          bloque: req.body.bloque,
          itemCatalogoId: req.body.itemCatalogoId,
          codigo: req.body.codigo,
          descripcion: req.body.descripcion,
          unidad: req.body.unidad,
          cantidad: req.body.cantidad,
          precioUnitario: req.body.precioUnitario,
          subtotal,
          costeUnitario: req.body.costeUnitario,
          costeSubtotal,
          origen: 'MANUAL',
          orden: ordenSiguiente + 1,
        },
      });

      const lineasMotor = await tx.presupuestoLineaMotor.findMany({
        where: { presupuestoId },
      });

      const totalBloqueA = lineasMotor.filter((l) => l.bloque === 'A_SUMINISTRO_EQUIPOS').reduce((sum, l) => sum + l.subtotal, 0);
      const totalBloqueB = lineasMotor.filter((l) => l.bloque === 'B_MATERIALES_INSTALACION').reduce((sum, l) => sum + l.subtotal, 0);
      const totalBloqueC = lineasMotor.filter((l) => l.bloque === 'C_MANO_OBRA').reduce((sum, l) => sum + l.subtotal, 0);
      const totalBloqueD = lineasMotor.filter((l) => l.bloque === 'D_MANTENIMIENTO_1_3').reduce((sum, l) => sum + l.subtotal, 0);
      const totalBloqueE = lineasMotor.filter((l) => l.bloque === 'E_OPCIONALES_4_5').reduce((sum, l) => sum + l.subtotal, 0);

      const costeBloqueA = lineasMotor.filter((l) => l.bloque === 'A_SUMINISTRO_EQUIPOS').reduce((sum, l) => sum + l.costeSubtotal, 0);
      const costeBloqueB = lineasMotor.filter((l) => l.bloque === 'B_MATERIALES_INSTALACION').reduce((sum, l) => sum + l.costeSubtotal, 0);
      const costeBloqueC = lineasMotor.filter((l) => l.bloque === 'C_MANO_OBRA').reduce((sum, l) => sum + l.costeSubtotal, 0);
      const costeBloqueD = lineasMotor.filter((l) => l.bloque === 'D_MANTENIMIENTO_1_3').reduce((sum, l) => sum + l.costeSubtotal, 0);
      const costeBloqueE = lineasMotor.filter((l) => l.bloque === 'E_OPCIONALES_4_5').reduce((sum, l) => sum + l.costeSubtotal, 0);

      const baseImponible = Math.round((totalBloqueA + totalBloqueB + totalBloqueC + totalBloqueD + totalBloqueE) * 100) / 100;
      const ivaImporte = Math.round(baseImponible * (presupuesto.ivaPorcentaje / 100) * 100) / 100;
      const totalConIva = Math.round((baseImponible + ivaImporte) * 100) / 100;
      const precioUnitarioVehiculo = presupuesto.contexto!.numVehiculos > 0
        ? Math.round((totalConIva / presupuesto.contexto!.numVehiculos) * 100) / 100
        : 0;

      const costeTotal = Math.round((costeBloqueA + costeBloqueB + costeBloqueC + costeBloqueD + costeBloqueE) * 100) / 100;
      const margenBruto = Math.round((baseImponible - costeTotal) * 100) / 100;
      const margenPorcentaje = baseImponible > 0
        ? Math.round(((margenBruto / baseImponible) * 100) * 100) / 100
        : 0;

      await tx.presupuesto.update({
        where: { id: presupuestoId },
        data: {
          totalTrabajos: totalBloqueC,
          totalMateriales: totalBloqueA + totalBloqueB,
          totalCliente: baseImponible,
          baseImponible,
          ivaImporte,
          totalConIva,
          precioUnitarioVehiculo,
          totalBloqueA,
          totalBloqueB,
          totalBloqueC,
          totalBloqueD,
          totalBloqueE,
          costeTrabajos: costeBloqueC,
          costeMateriales: costeBloqueA + costeBloqueB,
          costeTotal,
          margenBruto,
          margenPorcentaje,
        },
      });

      return linea;
    });

    res.status(201).json(lineaCreada);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear línea de motor' });
  }
});

router.delete('/:id/lineas-motor/:lineaId', async (req: Request, res: Response) => {
  try {
    const presupuestoId = Number(req.params.id);
    const lineaId = Number(req.params.lineaId);

    const presupuesto = await prisma.presupuesto.findUnique({
      where: { id: presupuestoId },
      include: { contexto: true },
    });

    if (!presupuesto) {
      res.status(404).json({ error: 'Presupuesto no encontrado' });
      return;
    }

    if (!presupuesto.contexto) {
      res.status(400).json({ error: 'Este presupuesto no pertenece al motor de presupuestos' });
      return;
    }

    if (presupuestoBloqueadoParaEdicion(presupuesto.estado)) {
      res.status(409).json({
        error: `El presupuesto está en estado ${presupuesto.estado} y no permite eliminar líneas. Crea una nueva versión para modificarlo.`,
      });
      return;
    }

    const linea = await prisma.presupuestoLineaMotor.findFirst({
      where: { id: lineaId, presupuestoId },
    });

    if (!linea) {
      res.status(404).json({ error: 'Línea motor no encontrada' });
      return;
    }

    await prisma.$transaction(async (tx) => {
      await tx.presupuestoLineaMotor.delete({ where: { id: lineaId } });

      const lineasMotor = await tx.presupuestoLineaMotor.findMany({
        where: { presupuestoId },
        orderBy: { orden: 'asc' },
      });

      for (const [idx, lineaMotor] of lineasMotor.entries()) {
        await tx.presupuestoLineaMotor.update({
          where: { id: lineaMotor.id },
          data: { orden: idx + 1 },
        });
      }

      const totalBloqueA = lineasMotor.filter((l) => l.bloque === 'A_SUMINISTRO_EQUIPOS').reduce((sum, l) => sum + l.subtotal, 0);
      const totalBloqueB = lineasMotor.filter((l) => l.bloque === 'B_MATERIALES_INSTALACION').reduce((sum, l) => sum + l.subtotal, 0);
      const totalBloqueC = lineasMotor.filter((l) => l.bloque === 'C_MANO_OBRA').reduce((sum, l) => sum + l.subtotal, 0);
      const totalBloqueD = lineasMotor.filter((l) => l.bloque === 'D_MANTENIMIENTO_1_3').reduce((sum, l) => sum + l.subtotal, 0);
      const totalBloqueE = lineasMotor.filter((l) => l.bloque === 'E_OPCIONALES_4_5').reduce((sum, l) => sum + l.subtotal, 0);

      const costeBloqueA = lineasMotor.filter((l) => l.bloque === 'A_SUMINISTRO_EQUIPOS').reduce((sum, l) => sum + l.costeSubtotal, 0);
      const costeBloqueB = lineasMotor.filter((l) => l.bloque === 'B_MATERIALES_INSTALACION').reduce((sum, l) => sum + l.costeSubtotal, 0);
      const costeBloqueC = lineasMotor.filter((l) => l.bloque === 'C_MANO_OBRA').reduce((sum, l) => sum + l.costeSubtotal, 0);
      const costeBloqueD = lineasMotor.filter((l) => l.bloque === 'D_MANTENIMIENTO_1_3').reduce((sum, l) => sum + l.costeSubtotal, 0);
      const costeBloqueE = lineasMotor.filter((l) => l.bloque === 'E_OPCIONALES_4_5').reduce((sum, l) => sum + l.costeSubtotal, 0);

      const baseImponible = Math.round((totalBloqueA + totalBloqueB + totalBloqueC + totalBloqueD + totalBloqueE) * 100) / 100;
      const ivaImporte = Math.round(baseImponible * (presupuesto.ivaPorcentaje / 100) * 100) / 100;
      const totalConIva = Math.round((baseImponible + ivaImporte) * 100) / 100;
      const precioUnitarioVehiculo = presupuesto.contexto!.numVehiculos > 0
        ? Math.round((totalConIva / presupuesto.contexto!.numVehiculos) * 100) / 100
        : 0;

      const costeTotal = Math.round((costeBloqueA + costeBloqueB + costeBloqueC + costeBloqueD + costeBloqueE) * 100) / 100;
      const margenBruto = Math.round((baseImponible - costeTotal) * 100) / 100;
      const margenPorcentaje = baseImponible > 0
        ? Math.round(((margenBruto / baseImponible) * 100) * 100) / 100
        : 0;

      await tx.presupuesto.update({
        where: { id: presupuestoId },
        data: {
          totalTrabajos: totalBloqueC,
          totalMateriales: totalBloqueA + totalBloqueB,
          totalCliente: baseImponible,
          baseImponible,
          ivaImporte,
          totalConIva,
          precioUnitarioVehiculo,
          totalBloqueA,
          totalBloqueB,
          totalBloqueC,
          totalBloqueD,
          totalBloqueE,
          costeTrabajos: costeBloqueC,
          costeMateriales: costeBloqueA + costeBloqueB,
          costeTotal,
          margenBruto,
          margenPorcentaje,
        },
      });
    });

    res.json({ message: 'Línea motor eliminada y presupuesto recalculado' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar línea de motor' });
  }
});

// ============================================================================
// EMITIR OFERTA (SNAPSHOT + VERSIONADO)
// ============================================================================

router.get('/:id/validacion-emision', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const presupuesto = await prisma.presupuesto.findUnique({
      where: { id },
      include: {
        proyecto: { include: { cliente: true } },
        contexto: true,
        lineasMotor: true,
        lineasTrabajo: true,
        lineasMaterial: true,
        textos: true,
      },
    });

    if (!presupuesto) {
      res.status(404).json({ error: 'Presupuesto no encontrado' });
      return;
    }

    res.json(construirValidacionEmision(presupuesto));
  } catch (error) {
    res.status(500).json({ error: 'Error al validar emisión' });
  }
});

router.get('/:id/impacto-aceptacion', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const presupuesto = await prisma.presupuesto.findUnique({
      where: { id },
      select: { id: true, proyectoId: true, estado: true },
    });

    if (!presupuesto) {
      res.status(404).json({ error: 'Presupuesto no encontrado' });
      return;
    }

    const marcaAuto = `AUTO_PRESUPUESTO:${presupuesto.id}`;

    const compras = await prisma.solicitudCompra.findMany({
      where: {
        proyectoId: presupuesto.proyectoId,
        observaciones: { contains: marcaAuto },
      },
      select: {
        id: true,
        codigo: true,
        proveedor: true,
        estado: true,
        fechaSolicitud: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const ordenesTrabajo = await prisma.ordenTrabajo.findMany({
      where: {
        proyectoId: presupuesto.proyectoId,
        observaciones: { contains: marcaAuto },
      },
      select: {
        id: true,
        codigo: true,
        estado: true,
        fechaPlanificada: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      presupuestoId: presupuesto.id,
      estado: presupuesto.estado,
      compras,
      ordenesTrabajo,
      resumen: {
        totalCompras: compras.length,
        totalOrdenesTrabajo: ordenesTrabajo.length,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener impacto de aceptación' });
  }
});

router.get('/:id/oferta-html', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const templateCode = typeof req.query.template === 'string' ? req.query.template : undefined;
    const presupuesto = await prisma.presupuesto.findUnique({
      where: { id },
      include: {
        proyecto: { include: { cliente: true } },
        contexto: true,
        lineasMotor: { orderBy: { orden: 'asc' } },
        lineasTrabajo: { orderBy: { orden: 'asc' } },
        lineasMaterial: { orderBy: { orden: 'asc' } },
        lineasDesplazamiento: { orderBy: { orden: 'asc' } },
        textos: { orderBy: { orden: 'asc' } },
      },
    });

    if (!presupuesto) {
      res.status(404).send('Presupuesto no encontrado');
      return;
    }

    const anexosTecnicos = presupuesto.contexto?.solucionId
      ? await prisma.solucionAnexoTecnico.findMany({
          where: { solucionId: presupuesto.contexto.solucionId },
          select: { titulo: true, url: true, orden: true },
          orderBy: { orden: 'asc' },
        })
      : [];

    const modulosDocumento = await resolvePresupuestoModules(presupuesto, templateCode);

    const html = buildOfertaHtmlDocument({
      presupuesto,
      templateCode,
      anexosTecnicos,
      modulosDocumento,
    });

    const download = String(req.query.download || '0') === '1';
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    if (download) {
      const fileBase = (presupuesto.codigoOferta || presupuesto.codigo || 'oferta').replace(/[^a-zA-Z0-9-_]/g, '_');
      res.setHeader('Content-Disposition', `attachment; filename="${fileBase}.html"`);
    }
    res.send(html);
  } catch (error) {
    res.status(500).send('Error al generar oferta HTML');
  }
});

router.get('/oferta-templates/catalogo', (_req: Request, res: Response) => {
  res.json({
    defaultCode: OFERTA_TEMPLATE_DEFAULT_CODE,
    templates: OFERTA_TEMPLATE_CATALOG,
  });
});

router.get('/oferta-templates/:code/modulos', requirePerfil('ADMINISTRADOR', 'DIRECCION'), async (req: Request, res: Response) => {
  try {
    const templateCode = req.params.code;
    const defaults = await resolveTemplateModules(templateCode);
    const overrides = await getGlobalTemplateModuleOverrides(templateCode);

    res.json({
      templateCode,
      defaults,
      overrides,
      modules: defaults,
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener módulos de plantilla' });
  }
});

router.put('/oferta-templates/:code/modulos', requirePerfil('ADMINISTRADOR', 'DIRECCION'), validate(ofertaModulosPayloadSchema), async (req: Request, res: Response) => {
  try {
    const templateCode = req.params.code;
    const { overrides } = req.body;

    await saveGlobalTemplateModuleOverrides(templateCode, overrides);
    const modules = await resolveTemplateModules(templateCode);

    res.json({
      message: 'Módulos globales de plantilla actualizados',
      templateCode,
      modules,
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al guardar módulos de plantilla' });
  }
});

router.get('/:id/oferta-modulos', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const templateCode = typeof req.query.template === 'string' ? req.query.template : undefined;

    const presupuesto = await prisma.presupuesto.findUnique({
      where: { id },
      include: {
        contexto: true,
      },
    });

    if (!presupuesto) {
      res.status(404).json({ error: 'Presupuesto no encontrado' });
      return;
    }

    const modules = await resolvePresupuestoModules(presupuesto, templateCode);
    res.json({
      presupuestoId: id,
      templateCode: templateCode || OFERTA_TEMPLATE_DEFAULT_CODE,
      modules,
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener módulos del presupuesto' });
  }
});

router.put('/:id/oferta-modulos', validate(ofertaModulosPayloadSchema), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { overrides } = req.body;

    const presupuesto = await prisma.presupuesto.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!presupuesto) {
      res.status(404).json({ error: 'Presupuesto no encontrado' });
      return;
    }

    await savePresupuestoModuleOverrides(id, overrides);

    const presupuestoActualizado = await prisma.presupuesto.findUnique({
      where: { id },
      include: { contexto: true },
    });

    if (!presupuestoActualizado) {
      res.status(404).json({ error: 'Presupuesto no encontrado tras actualización' });
      return;
    }

    const modules = await resolvePresupuestoModules(presupuestoActualizado);
    res.json({
      message: 'Módulos del presupuesto actualizados',
      presupuestoId: id,
      modules,
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al guardar módulos del presupuesto' });
  }
});

router.get('/:id/oferta-pdf', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const templateCode = typeof req.query.template === 'string' ? req.query.template : undefined;

    const presupuesto = await prisma.presupuesto.findUnique({
      where: { id },
      include: {
        proyecto: { include: { cliente: true } },
        contexto: true,
        lineasMotor: { orderBy: { orden: 'asc' } },
        lineasTrabajo: { orderBy: { orden: 'asc' } },
        lineasMaterial: { orderBy: { orden: 'asc' } },
        lineasDesplazamiento: { orderBy: { orden: 'asc' } },
        textos: { orderBy: { orden: 'asc' } },
      },
    });

    if (!presupuesto) {
      res.status(404).json({ error: 'Presupuesto no encontrado' });
      return;
    }

    const anexosTecnicos = presupuesto.contexto?.solucionId
      ? await prisma.solucionAnexoTecnico.findMany({
          where: { solucionId: presupuesto.contexto.solucionId },
          select: { titulo: true, url: true, orden: true },
          orderBy: { orden: 'asc' },
        })
      : [];

    const modulosDocumento = await resolvePresupuestoModules(presupuesto, templateCode);

    const html = buildOfertaHtmlDocument({
      presupuesto,
      templateCode,
      anexosTecnicos,
      modulosDocumento,
    });

    const fileBase = (presupuesto.codigoOferta || presupuesto.codigo || 'oferta').replace(/[^a-zA-Z0-9-_]/g, '_');

    try {
      const pdf = await renderOfertaPdf({ html, fileNameBase: fileBase });
      res.setHeader('Content-Type', pdf.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${pdf.fileName}"`);
      res.send(pdf.content);
    } catch (pdfError: any) {
      res.status(501).json({
        error: 'Generación PDF no disponible',
        detail: pdfError?.message || 'Configura proveedor PDF',
        fallbackHtml: `/api/presupuestos/${id}/oferta-html?download=1${templateCode ? `&template=${encodeURIComponent(templateCode)}` : ''}`,
      });
    }
  } catch (error) {
    res.status(500).json({ error: 'Error al generar oferta PDF' });
  }
});

router.post('/:id/emitir', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const templateCode = typeof req.body?.templateCode === 'string' ? req.body.templateCode : undefined;
    const presupuesto = await prisma.presupuesto.findUnique({
      where: { id },
      include: {
        proyecto: { include: { cliente: true } },
        contexto: true,
        lineasMotor: { orderBy: { orden: 'asc' } },
        lineasTrabajo: { orderBy: { orden: 'asc' } },
        lineasMaterial: { orderBy: { orden: 'asc' } },
        lineasDesplazamiento: { orderBy: { orden: 'asc' } },
        textos: { orderBy: { orden: 'asc' } },
        snapshot: true,
      },
    });

    if (!presupuesto) {
      res.status(404).json({ error: 'Presupuesto no encontrado' });
      return;
    }

    const validacionEmision = construirValidacionEmision(presupuesto);
    if (!validacionEmision.ready) {
      res.status(409).json({
        error: 'No se puede emitir: faltan requisitos de emisión',
        pendientes: validacionEmision.pendientes,
      });
      return;
    }

    const versionOferta = presupuesto.snapshot
      ? presupuesto.snapshot.versionOferta + 1
      : (presupuesto.versionOferta || 1);
    const codigoOferta = presupuesto.codigoOferta || generarCodigoOferta();
    const anexosTecnicos = presupuesto.contexto?.solucionId
      ? await prisma.solucionAnexoTecnico.findMany({
          where: { solucionId: presupuesto.contexto.solucionId },
          select: { titulo: true, url: true, orden: true },
          orderBy: { orden: 'asc' },
        })
      : [];

    const modulosDocumento = await resolvePresupuestoModules(presupuesto, templateCode);

    const payloadOferta = buildOfertaPayload({
      presupuesto,
      codigoOferta,
      versionOferta,
      fechaEmisionIso: new Date().toISOString(),
      templateCode,
      anexosTecnicos,
      modulosDocumento,
    });
    const hashContenido = createHash('sha256').update(JSON.stringify(payloadOferta)).digest('hex');

    const snapshot = await prisma.$transaction(async (tx) => {
      const snapshotGuardado = presupuesto.snapshot
        ? await tx.presupuestoSnapshot.update({
            where: { presupuestoId: presupuesto.id },
            data: {
              fechaEmision: new Date(),
              versionOferta,
              reglasJson: presupuesto.contexto ? { solucionId: presupuesto.contexto.solucionId } : { legacy: true },
              preciosJson: {
                lineasMotor: presupuesto.lineasMotor.map((l) => ({
                  codigo: l.codigo,
                  precioUnitario: l.precioUnitario,
                  costeUnitario: l.costeUnitario,
                })),
              },
              payloadOfertaJson: payloadOferta,
              hashContenido,
            },
          })
        : await tx.presupuestoSnapshot.create({
            data: {
              presupuestoId: presupuesto.id,
              versionOferta,
              reglasJson: presupuesto.contexto ? { solucionId: presupuesto.contexto.solucionId } : { legacy: true },
              preciosJson: {
                lineasMotor: presupuesto.lineasMotor.map((l) => ({
                  codigo: l.codigo,
                  precioUnitario: l.precioUnitario,
                  costeUnitario: l.costeUnitario,
                })),
              },
              payloadOfertaJson: payloadOferta,
              hashContenido,
            },
          });

      await tx.presupuesto.update({
        where: { id: presupuesto.id },
        data: {
          codigoOferta,
          versionOferta,
          estado: presupuesto.estado === 'BORRADOR' ? 'ENVIADO' : presupuesto.estado,
          fechaEnvio: presupuesto.estado === 'BORRADOR' ? new Date() : presupuesto.fechaEnvio,
        },
      });

      return snapshotGuardado;
    });

    res.json({
      message: 'Oferta emitida correctamente',
      presupuestoId: presupuesto.id,
      codigoOferta,
      versionOferta,
      snapshotId: snapshot.id,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al emitir oferta' });
  }
});

// ============================================================================
// LÍNEAS DE TRABAJO
// ============================================================================

router.post('/:id/lineas-trabajo', async (req: Request, res: Response) => {
  try {
    const presupuestoId = Number(req.params.id);
    const { trabajoId, cantidad, precioUnitarioCliente, costeUnitarioInterno, descripcionCliente } = req.body;

    const totalCliente = cantidad * precioUnitarioCliente;
    const totalInterno = cantidad * costeUnitarioInterno;

    const linea = await prisma.presupuestoLineaTrabajo.create({
      data: {
        presupuestoId,
        trabajoId,
        cantidad,
        precioUnitarioCliente,
        totalCliente,
        costeUnitarioInterno,
        totalInterno,
        margen: totalCliente - totalInterno,
        descripcionCliente,
      },
      include: { trabajo: true },
    });
    res.status(201).json(linea);
  } catch (error) {
    res.status(500).json({ error: 'Error al añadir línea de trabajo' });
  }
});

router.put('/:id/lineas-trabajo/:lineaId', async (req: Request, res: Response) => {
  try {
    const { cantidad, precioUnitarioCliente, costeUnitarioInterno, descripcionCliente } = req.body;
    const totalCliente = cantidad * precioUnitarioCliente;
    const totalInterno = cantidad * costeUnitarioInterno;

    const linea = await prisma.presupuestoLineaTrabajo.update({
      where: { id: Number(req.params.lineaId) },
      data: {
        cantidad,
        precioUnitarioCliente,
        totalCliente,
        costeUnitarioInterno,
        totalInterno,
        margen: totalCliente - totalInterno,
        descripcionCliente,
      },
    });
    res.json(linea);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar línea' });
  }
});

router.delete('/:id/lineas-trabajo/:lineaId', async (req: Request, res: Response) => {
  try {
    await prisma.presupuestoLineaTrabajo.delete({ where: { id: Number(req.params.lineaId) } });
    res.json({ message: 'Línea eliminada' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar' });
  }
});

// ============================================================================
// LÍNEAS DE MATERIAL
// ============================================================================

router.post('/:id/lineas-material', async (req: Request, res: Response) => {
  try {
    const presupuestoId = Number(req.params.id);
    const { materialId, cantidad, precioUnitarioCliente, costeUnitarioInterno, descripcionCliente } = req.body;

    const totalCliente = cantidad * precioUnitarioCliente;
    const totalInterno = cantidad * costeUnitarioInterno;

    const linea = await prisma.presupuestoLineaMaterial.create({
      data: {
        presupuestoId,
        materialId,
        cantidad,
        precioUnitarioCliente,
        totalCliente,
        costeUnitarioInterno,
        totalInterno,
        margen: totalCliente - totalInterno,
        descripcionCliente,
      },
      include: { material: true },
    });
    res.status(201).json(linea);
  } catch (error) {
    res.status(500).json({ error: 'Error al añadir línea de material' });
  }
});

router.put('/:id/lineas-material/:lineaId', async (req: Request, res: Response) => {
  try {
    const { cantidad, precioUnitarioCliente, costeUnitarioInterno, descripcionCliente } = req.body;
    const totalCliente = cantidad * precioUnitarioCliente;
    const totalInterno = cantidad * costeUnitarioInterno;

    const linea = await prisma.presupuestoLineaMaterial.update({
      where: { id: Number(req.params.lineaId) },
      data: {
        cantidad,
        precioUnitarioCliente,
        totalCliente,
        costeUnitarioInterno,
        totalInterno,
        margen: totalCliente - totalInterno,
        descripcionCliente,
      },
    });
    res.json(linea);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar línea' });
  }
});

router.delete('/:id/lineas-material/:lineaId', async (req: Request, res: Response) => {
  try {
    await prisma.presupuestoLineaMaterial.delete({ where: { id: Number(req.params.lineaId) } });
    res.json({ message: 'Línea eliminada' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar' });
  }
});

// ============================================================================
// LÍNEAS DE DESPLAZAMIENTO
// ============================================================================

router.post('/:id/lineas-desplazamiento', async (req: Request, res: Response) => {
  try {
    const linea = await prisma.presupuestoLineaDesplazamiento.create({
      data: {
        ...req.body,
        presupuestoId: Number(req.params.id),
        margen: (req.body.precioCliente || 0) - (req.body.costeInterno || 0),
      },
    });
    res.status(201).json(linea);
  } catch (error) {
    res.status(500).json({ error: 'Error al añadir desplazamiento' });
  }
});

router.delete('/:id/lineas-desplazamiento/:lineaId', async (req: Request, res: Response) => {
  try {
    await prisma.presupuestoLineaDesplazamiento.delete({ where: { id: Number(req.params.lineaId) } });
    res.json({ message: 'Línea eliminada' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar' });
  }
});

// ============================================================================
// VISTA DOBLE CARA
// ============================================================================

router.get('/:id/vista-cliente', async (req: Request, res: Response) => {
  try {
    const presupuesto = await prisma.presupuesto.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        proyecto: { include: { cliente: true } },
        replanteo: { include: { cochera: true, tipoAutobus: true } },
        lineasTrabajo: {
          select: { id: true, descripcionCliente: true, cantidad: true, precioUnitarioCliente: true, totalCliente: true, orden: true },
          orderBy: { orden: 'asc' },
        },
        lineasMaterial: {
          select: { id: true, descripcionCliente: true, cantidad: true, precioUnitarioCliente: true, totalCliente: true, orden: true },
          orderBy: { orden: 'asc' },
        },
        lineasDesplazamiento: {
          select: { id: true, descripcion: true, precioCliente: true, orden: true },
          orderBy: { orden: 'asc' },
        },
      },
    });
    if (!presupuesto) { res.status(404).json({ error: 'No encontrado' }); return; }

    res.json({
      ...presupuesto,
      // Ocultar datos internos
      costeTrabajos: undefined,
      costeMateriales: undefined,
      costeDesplazamientos: undefined,
      costeTotal: undefined,
      margenBruto: undefined,
      margenPorcentaje: undefined,
      observacionesInternas: undefined,
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener vista cliente' });
  }
});

export default router;
