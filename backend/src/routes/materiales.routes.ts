import { Router, Request, Response } from 'express';
import prisma from '../config/database';
import { authMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { z } from 'zod';

const router = Router();
router.use(authMiddleware);

const materialSchema = z.object({
  sku: z.string().min(1),
  descripcion: z.string().min(1),
  categoria: z.string().optional(),
  unidad: z.enum(['UNIDAD', 'METRO', 'METRO_CUADRADO', 'KILOGRAMO', 'LITRO', 'ROLLO', 'CAJA', 'BOLSA']),
  proveedorHabitual: z.string().optional(),
  costeMedio: z.number().min(0).default(0),
  precioEstandar: z.number().min(0).default(0),
  stockMinimo: z.number().min(0).optional(),
  stockActual: z.number().min(0).optional(),
  notas: z.string().optional(),
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const { search, categoria, proveedor } = req.query;
    const where: any = { activo: true };
    if (categoria) where.categoria = categoria;
    if (proveedor) where.proveedorHabitual = { contains: proveedor as string, mode: 'insensitive' };
    if (search) {
      where.OR = [
        { sku: { contains: search as string, mode: 'insensitive' } },
        { descripcion: { contains: search as string, mode: 'insensitive' } },
      ];
    }
    const materiales = await prisma.material.findMany({ where, orderBy: { sku: 'asc' } });
    res.json(materiales);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener materiales' });
  }
});

router.get('/categorias', async (_req: Request, res: Response) => {
  try {
    const categorias = await prisma.material.findMany({
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
    const material = await prisma.material.findUnique({ where: { id: Number(req.params.id) } });
    if (!material) { res.status(404).json({ error: 'Material no encontrado' }); return; }
    res.json(material);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener material' });
  }
});

router.post('/', validate(materialSchema), async (req: Request, res: Response) => {
  try {
    const material = await prisma.material.create({ data: req.body });
    res.status(201).json(material);
  } catch (error: any) {
    if (error.code === 'P2002') { res.status(409).json({ error: 'Ya existe un material con ese SKU' }); return; }
    res.status(500).json({ error: 'Error al crear material' });
  }
});

router.put('/:id', validate(materialSchema.partial()), async (req: Request, res: Response) => {
  try {
    const material = await prisma.material.update({
      where: { id: Number(req.params.id) },
      data: req.body,
    });
    res.json(material);
  } catch (error: any) {
    if (error.code === 'P2025') { res.status(404).json({ error: 'No encontrado' }); return; }
    res.status(500).json({ error: 'Error al actualizar' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await prisma.material.update({ where: { id: Number(req.params.id) }, data: { activo: false } });
    res.json({ message: 'Material desactivado' });
  } catch (error) {
    res.status(500).json({ error: 'Error al desactivar' });
  }
});

export default router;
