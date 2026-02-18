import { Router, Request, Response } from 'express';
import prisma from '../config/database';
import { authMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { z } from 'zod';

const router = Router();
router.use(authMiddleware);

const trabajoSchema = z.object({
  codigo: z.string().min(1),
  nombreComercial: z.string().min(1),
  descripcionTecnica: z.string().optional(),
  unidad: z.enum(['POR_BUS', 'POR_HORA', 'POR_VISITA', 'POR_UNIDAD']),
  tiempoEstandarHoras: z.number().min(0).default(0),
  numTecnicosRequeridos: z.number().int().min(1).default(1),
  precioVentaEstandar: z.number().min(0).default(0),
  costeInternoEstandar: z.number().min(0).default(0),
  categoria: z.string().optional(),
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const { search, categoria } = req.query;
    const where: any = { activo: true };
    if (categoria) where.categoria = categoria;
    if (search) {
      where.OR = [
        { codigo: { contains: search as string, mode: 'insensitive' } },
        { nombreComercial: { contains: search as string, mode: 'insensitive' } },
      ];
    }
    const trabajos = await prisma.trabajo.findMany({
      where,
      include: { _count: { select: { checklistItems: true } } },
      orderBy: { codigo: 'asc' },
    });
    res.json(trabajos);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener trabajos' });
  }
});

router.get('/categorias', async (_req: Request, res: Response) => {
  try {
    const categorias = await prisma.trabajo.findMany({
      where: { activo: true, categoria: { not: null } },
      select: { categoria: true },
      distinct: ['categoria'],
      orderBy: { categoria: 'asc' },
    });
    res.json(categorias.map((c) => c.categoria).filter(Boolean));
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener categorías' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const trabajo = await prisma.trabajo.findUnique({
      where: { id: Number(req.params.id) },
      include: { checklistItems: { orderBy: { orden: 'asc' } } },
    });
    if (!trabajo) { res.status(404).json({ error: 'Trabajo no encontrado' }); return; }
    res.json(trabajo);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener trabajo' });
  }
});

router.post('/', validate(trabajoSchema), async (req: Request, res: Response) => {
  try {
    const trabajo = await prisma.trabajo.create({ data: req.body });
    res.status(201).json(trabajo);
  } catch (error: any) {
    if (error.code === 'P2002') { res.status(409).json({ error: 'Ya existe un trabajo con ese código' }); return; }
    res.status(500).json({ error: 'Error al crear trabajo' });
  }
});

router.put('/:id', validate(trabajoSchema.partial()), async (req: Request, res: Response) => {
  try {
    const trabajo = await prisma.trabajo.update({
      where: { id: Number(req.params.id) },
      data: req.body,
    });
    res.json(trabajo);
  } catch (error: any) {
    if (error.code === 'P2025') { res.status(404).json({ error: 'No encontrado' }); return; }
    res.status(500).json({ error: 'Error al actualizar' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await prisma.trabajo.update({ where: { id: Number(req.params.id) }, data: { activo: false } });
    res.json({ message: 'Trabajo desactivado' });
  } catch (error) {
    res.status(500).json({ error: 'Error al desactivar' });
  }
});

// --- Checklist ---
router.post('/:id/checklist', async (req: Request, res: Response) => {
  try {
    const item = await prisma.checklistItem.create({
      data: { ...req.body, trabajoId: Number(req.params.id) },
    });
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear item checklist' });
  }
});

router.put('/:id/checklist/:itemId', async (req: Request, res: Response) => {
  try {
    const item = await prisma.checklistItem.update({
      where: { id: Number(req.params.itemId) },
      data: req.body,
    });
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar item' });
  }
});

router.delete('/:id/checklist/:itemId', async (req: Request, res: Response) => {
  try {
    await prisma.checklistItem.delete({ where: { id: Number(req.params.itemId) } });
    res.json({ message: 'Item eliminado' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar item' });
  }
});

export default router;
