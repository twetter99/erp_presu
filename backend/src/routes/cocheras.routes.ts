import { Router, Request, Response } from 'express';
import prisma from '../config/database';
import { authMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { z } from 'zod';

const router = Router();
router.use(authMiddleware);

const cocheraSchema = z.object({
  nombre: z.string().min(1),
  direccion: z.string().min(1),
  ciudad: z.string().optional(),
  provincia: z.string().optional(),
  cp: z.string().optional(),
  responsable: z.string().optional(),
  telefonoResponsable: z.string().optional(),
  horarioAcceso: z.string().optional(),
  observacionesTecnicas: z.string().optional(),
  latitud: z.number().optional(),
  longitud: z.number().optional(),
  empresaId: z.number().int().positive(),
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const { empresaId, search } = req.query;
    const where: any = { activa: true };
    if (empresaId) where.empresaId = Number(empresaId);
    if (search) {
      where.OR = [
        { nombre: { contains: search as string, mode: 'insensitive' } },
        { direccion: { contains: search as string, mode: 'insensitive' } },
      ];
    }
    const cocheras = await prisma.cochera.findMany({
      where,
      include: { empresa: { select: { id: true, nombre: true } } },
      orderBy: { nombre: 'asc' },
    });
    res.json(cocheras);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener cocheras' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const cochera = await prisma.cochera.findUnique({
      where: { id: Number(req.params.id) },
      include: { empresa: true },
    });
    if (!cochera) { res.status(404).json({ error: 'Cochera no encontrada' }); return; }
    res.json(cochera);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener cochera' });
  }
});

router.post('/', validate(cocheraSchema), async (req: Request, res: Response) => {
  try {
    const cochera = await prisma.cochera.create({
      data: req.body,
      include: { empresa: { select: { id: true, nombre: true } } },
    });
    res.status(201).json(cochera);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear cochera' });
  }
});

router.put('/:id', validate(cocheraSchema.partial()), async (req: Request, res: Response) => {
  try {
    const cochera = await prisma.cochera.update({
      where: { id: Number(req.params.id) },
      data: req.body,
    });
    res.json(cochera);
  } catch (error: any) {
    if (error.code === 'P2025') { res.status(404).json({ error: 'Cochera no encontrada' }); return; }
    res.status(500).json({ error: 'Error al actualizar cochera' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await prisma.cochera.update({
      where: { id: Number(req.params.id) },
      data: { activa: false },
    });
    res.json({ message: 'Cochera desactivada' });
  } catch (error) {
    res.status(500).json({ error: 'Error al desactivar cochera' });
  }
});

export default router;
