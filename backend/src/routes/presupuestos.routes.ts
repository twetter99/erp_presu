import { Router, Request, Response } from 'express';
import prisma from '../config/database';
import { authMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { z } from 'zod';

const router = Router();
router.use(authMiddleware);

function generarCodigoPresupuesto(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `PRE-${year}-${rand}`;
}

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
      ];
    }
    const presupuestos = await prisma.presupuesto.findMany({
      where,
      include: {
        proyecto: { select: { id: true, codigo: true, nombre: true, cliente: { select: { id: true, nombre: true } } } },
      },
      orderBy: { fecha: 'desc' },
    });
    res.json(presupuestos);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener presupuestos' });
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
      },
    });
    if (!presupuesto) { res.status(404).json({ error: 'Presupuesto no encontrado' }); return; }
    res.json(presupuesto);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener presupuesto' });
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

router.patch('/:id/estado', async (req: Request, res: Response) => {
  try {
    const { estado } = req.body;
    const id = Number(req.params.id);

    const presupuesto = await prisma.presupuesto.update({
      where: { id },
      data: {
        estado,
        ...(estado === 'ENVIADO' && { fechaEnvio: new Date() }),
        ...(estado === 'ACEPTADO' || estado === 'RECHAZADO' ? { fechaRespuesta: new Date() } : {}),
      },
    });

    // Al ACEPTAR: generar automáticamente compras y órdenes de trabajo (7.2)
    if (estado === 'ACEPTADO') {
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

        for (const [proveedor, lineas] of materialesPorProveedor) {
          const codigoCompra = `COM-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000) + 1000}`;
          await prisma.solicitudCompra.create({
            data: {
              codigo: codigoCompra,
              proyectoId: full.proyectoId,
              proveedor,
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
          const codigoOT = `OT-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000) + 1000}`;
          await prisma.ordenTrabajo.create({
            data: {
              codigo: codigoOT,
              proyectoId: full.proyectoId,
              cocheraId: full.replanteo.cocheraId,
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

router.post('/:id/recalcular', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const presupuesto = await prisma.presupuesto.findUnique({
      where: { id },
      include: {
        lineasTrabajo: true,
        lineasMaterial: true,
        lineasDesplazamiento: true,
      },
    });

    if (!presupuesto) { res.status(404).json({ error: 'No encontrado' }); return; }

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
