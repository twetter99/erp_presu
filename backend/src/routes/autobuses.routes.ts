import { Router, Request, Response } from 'express';
import prisma from '../config/database';
import { authMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { z } from 'zod';

const router = Router();
router.use(authMiddleware);

const autobusSchema = z.object({
  marca: z.string().min(1),
  modelo: z.string().min(1),
  longitud: z.number().positive().optional(),
  tipoCombustible: z.enum(['DIESEL', 'HIBRIDO', 'ELECTRICO', 'GAS_NATURAL', 'HIDROGENO']),
  configuracionEspecial: z.string().optional(),
  numPlazas: z.number().int().positive().optional(),
  notas: z.string().optional(),
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const { search, tipo } = req.query;
    const where: any = { activo: true };
    if (tipo) where.tipoCombustible = tipo;
    if (search) {
      where.OR = [
        { marca: { contains: search as string, mode: 'insensitive' } },
        { modelo: { contains: search as string, mode: 'insensitive' } },
      ];
    }
    const autobuses = await prisma.tipoAutobus.findMany({
      where,
      include: {
        _count: { select: { plantillasTrabajos: true, plantillasMateriales: true } },
      },
      orderBy: [{ marca: 'asc' }, { modelo: 'asc' }],
    });
    res.json(autobuses);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener tipos de autobús' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const autobus = await prisma.tipoAutobus.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        plantillasTrabajos: { include: { trabajo: true } },
        plantillasMateriales: { include: { material: true } },
      },
    });
    if (!autobus) { res.status(404).json({ error: 'Tipo de autobús no encontrado' }); return; }
    res.json(autobus);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener tipo de autobús' });
  }
});

router.post('/', validate(autobusSchema), async (req: Request, res: Response) => {
  try {
    const autobus = await prisma.tipoAutobus.create({ data: req.body });
    res.status(201).json(autobus);
  } catch (error: any) {
    if (error.code === 'P2002') { res.status(409).json({ error: 'Ya existe ese marca/modelo' }); return; }
    res.status(500).json({ error: 'Error al crear tipo de autobús' });
  }
});

router.put('/:id', validate(autobusSchema.partial()), async (req: Request, res: Response) => {
  try {
    const autobus = await prisma.tipoAutobus.update({
      where: { id: Number(req.params.id) },
      data: req.body,
    });
    res.json(autobus);
  } catch (error: any) {
    if (error.code === 'P2025') { res.status(404).json({ error: 'No encontrado' }); return; }
    res.status(500).json({ error: 'Error al actualizar' });
  }
});

// --- Plantillas ---
router.post('/:id/plantilla-trabajos', async (req: Request, res: Response) => {
  try {
    const plantilla = await prisma.plantillaTrabajo.create({
      data: { ...req.body, tipoAutobusId: Number(req.params.id) },
      include: { trabajo: true },
    });
    res.status(201).json(plantilla);
  } catch (error: any) {
    if (error.code === 'P2002') { res.status(409).json({ error: 'Trabajo ya en plantilla' }); return; }
    res.status(500).json({ error: 'Error al añadir a plantilla' });
  }
});

router.delete('/:id/plantilla-trabajos/:ptId', async (req: Request, res: Response) => {
  try {
    await prisma.plantillaTrabajo.delete({ where: { id: Number(req.params.ptId) } });
    res.json({ message: 'Eliminado de plantilla' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar de plantilla' });
  }
});

router.post('/:id/plantilla-materiales', async (req: Request, res: Response) => {
  try {
    const plantilla = await prisma.plantillaMaterial.create({
      data: { ...req.body, tipoAutobusId: Number(req.params.id) },
      include: { material: true },
    });
    res.status(201).json(plantilla);
  } catch (error: any) {
    if (error.code === 'P2002') { res.status(409).json({ error: 'Material ya en plantilla' }); return; }
    res.status(500).json({ error: 'Error al añadir a plantilla' });
  }
});

router.delete('/:id/plantilla-materiales/:pmId', async (req: Request, res: Response) => {
  try {
    await prisma.plantillaMaterial.delete({ where: { id: Number(req.params.pmId) } });
    res.json({ message: 'Eliminado de plantilla' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar de plantilla' });
  }
});

export default router;
