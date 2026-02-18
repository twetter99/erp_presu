import { Router, Request, Response } from 'express';
import prisma from '../config/database';
import { authMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { z } from 'zod';

const router = Router();
router.use(authMiddleware);

const replanteoSchema = z.object({
  proyectoId: z.number().int().positive(),
  cocheraId: z.number().int().positive(),
  tipoAutobusId: z.number().int().positive(),
  numBuses: z.number().int().positive(),
  tecnicoResponsableId: z.number().int().positive(),
  fecha: z.string().datetime().optional(),
  canalizacionesExistentes: z.string().optional(),
  espaciosDisponibles: z.string().optional(),
  tipoInstalacionPrevia: z.string().optional(),
  senalesDisponibles: z.string().optional(),
  necesidadSelladoTecho: z.boolean().default(false),
  complejidadEspecial: z.string().optional(),
  observaciones: z.string().optional(),
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const { proyectoId, estado } = req.query;
    const where: any = {};
    if (proyectoId) where.proyectoId = Number(proyectoId);
    if (estado) where.estado = estado;
    const replanteos = await prisma.replanteo.findMany({
      where,
      include: {
        proyecto: { select: { id: true, codigo: true, nombre: true } },
        cochera: { select: { id: true, nombre: true } },
        tipoAutobus: { select: { id: true, marca: true, modelo: true } },
        tecnicoResponsable: { select: { id: true, nombre: true, apellidos: true } },
        _count: { select: { trabajos: true, materiales: true, fotos: true } },
      },
      orderBy: { fecha: 'desc' },
    });
    res.json(replanteos);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener replanteos' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const replanteo = await prisma.replanteo.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        proyecto: { select: { id: true, codigo: true, nombre: true } },
        cochera: true,
        tipoAutobus: {
          include: {
            plantillasTrabajos: { include: { trabajo: true } },
            plantillasMateriales: { include: { material: true } },
          },
        },
        tecnicoResponsable: { select: { id: true, nombre: true, apellidos: true } },
        trabajos: { include: { trabajo: true } },
        materiales: { include: { material: true } },
        fotos: true,
      },
    });
    if (!replanteo) { res.status(404).json({ error: 'Replanteo no encontrado' }); return; }
    res.json(replanteo);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener replanteo' });
  }
});

router.post('/', validate(replanteoSchema), async (req: Request, res: Response) => {
  try {
    const replanteo = await prisma.replanteo.create({
      data: req.body,
      include: {
        proyecto: { select: { id: true, codigo: true, nombre: true } },
        cochera: { select: { id: true, nombre: true } },
        tipoAutobus: { select: { id: true, marca: true, modelo: true } },
      },
    });
    res.status(201).json(replanteo);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear replanteo' });
  }
});

router.put('/:id', validate(replanteoSchema.partial()), async (req: Request, res: Response) => {
  try {
    const replanteo = await prisma.replanteo.update({
      where: { id: Number(req.params.id) },
      data: req.body,
    });
    res.json(replanteo);
  } catch (error: any) {
    if (error.code === 'P2025') { res.status(404).json({ error: 'No encontrado' }); return; }
    res.status(500).json({ error: 'Error al actualizar' });
  }
});

// Cambiar estado replanteo
router.patch('/:id/estado', async (req: Request, res: Response) => {
  try {
    const { estado } = req.body;
    const replanteo = await prisma.replanteo.update({
      where: { id: Number(req.params.id) },
      data: { estado },
    });
    res.json(replanteo);
  } catch (error) {
    res.status(500).json({ error: 'Error al cambiar estado' });
  }
});

// Cargar plantilla del tipo de bus al replanteo
router.post('/:id/cargar-plantilla', async (req: Request, res: Response) => {
  try {
    const replanteo = await prisma.replanteo.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        tipoAutobus: {
          include: {
            plantillasTrabajos: true,
            plantillasMateriales: true,
          },
        },
      },
    });

    if (!replanteo) { res.status(404).json({ error: 'Replanteo no encontrado' }); return; }

    // Insertar trabajos de la plantilla
    for (const pt of replanteo.tipoAutobus.plantillasTrabajos) {
      await prisma.replanteoTrabajo.upsert({
        where: { replanteoId_trabajoId: { replanteoId: replanteo.id, trabajoId: pt.trabajoId } },
        update: { cantidad: pt.cantidad },
        create: { replanteoId: replanteo.id, trabajoId: pt.trabajoId, cantidad: pt.cantidad },
      });
    }

    // Insertar materiales de la plantilla (multiplicados por nº buses)
    for (const pm of replanteo.tipoAutobus.plantillasMateriales) {
      await prisma.replanteoMaterial.upsert({
        where: { replanteoId_materialId: { replanteoId: replanteo.id, materialId: pm.materialId } },
        update: { cantidadEstimada: pm.cantidad * replanteo.numBuses },
        create: {
          replanteoId: replanteo.id,
          materialId: pm.materialId,
          cantidadEstimada: pm.cantidad * replanteo.numBuses,
        },
      });
    }

    // Recargar replanteo completo
    const updated = await prisma.replanteo.findUnique({
      where: { id: replanteo.id },
      include: {
        trabajos: { include: { trabajo: true } },
        materiales: { include: { material: true } },
      },
    });

    res.json({ message: 'Plantilla cargada', replanteo: updated });
  } catch (error) {
    res.status(500).json({ error: 'Error al cargar plantilla' });
  }
});

// --- Trabajos del replanteo ---
router.post('/:id/trabajos', async (req: Request, res: Response) => {
  try {
    const trabajo = await prisma.replanteoTrabajo.create({
      data: { ...req.body, replanteoId: Number(req.params.id) },
      include: { trabajo: true },
    });
    res.status(201).json(trabajo);
  } catch (error: any) {
    if (error.code === 'P2002') { res.status(409).json({ error: 'Trabajo ya añadido' }); return; }
    res.status(500).json({ error: 'Error al añadir trabajo' });
  }
});

router.delete('/:id/trabajos/:rtId', async (req: Request, res: Response) => {
  try {
    await prisma.replanteoTrabajo.delete({ where: { id: Number(req.params.rtId) } });
    res.json({ message: 'Trabajo eliminado del replanteo' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar' });
  }
});

// --- Materiales del replanteo ---
router.post('/:id/materiales', async (req: Request, res: Response) => {
  try {
    const material = await prisma.replanteoMaterial.create({
      data: { ...req.body, replanteoId: Number(req.params.id) },
      include: { material: true },
    });
    res.status(201).json(material);
  } catch (error: any) {
    if (error.code === 'P2002') { res.status(409).json({ error: 'Material ya añadido' }); return; }
    res.status(500).json({ error: 'Error al añadir material' });
  }
});

router.delete('/:id/materiales/:rmId', async (req: Request, res: Response) => {
  try {
    await prisma.replanteoMaterial.delete({ where: { id: Number(req.params.rmId) } });
    res.json({ message: 'Material eliminado del replanteo' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar' });
  }
});

export default router;
