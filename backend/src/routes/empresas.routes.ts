import { Router, Request, Response } from 'express';
import prisma from '../config/database';
import { authMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { z } from 'zod';

const router = Router();
router.use(authMiddleware);

const empresaSchema = z.object({
  nombre: z.string().min(1, 'Nombre requerido'),
  cif: z.string().min(1, 'CIF requerido'),
  direccion: z.string().optional(),
  ciudad: z.string().optional(),
  provincia: z.string().optional(),
  cp: z.string().optional(),
  telefono: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  web: z.string().optional(),
  notas: z.string().optional(),
});

/**
 * @swagger
 * /api/empresas:
 *   get:
 *     tags: [Empresas]
 *     summary: Listar empresas
 *     security:
 *       - bearerAuth: []
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { search, activa } = req.query;
    const where: any = {};
    if (activa !== undefined) where.activa = activa === 'true';
    if (search) {
      where.OR = [
        { nombre: { contains: search as string, mode: 'insensitive' } },
        { cif: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const empresas = await prisma.empresa.findMany({
      where,
      include: { _count: { select: { cocheras: true, contactos: true } } },
      orderBy: { nombre: 'asc' },
    });
    res.json(empresas);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener empresas' });
  }
});

/**
 * @swagger
 * /api/empresas/{id}:
 *   get:
 *     tags: [Empresas]
 *     summary: Obtener empresa por ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const empresa = await prisma.empresa.findUnique({
      where: { id: Number(req.params.id) },
      include: { contactos: true, cocheras: true },
    });
    if (!empresa) { res.status(404).json({ error: 'Empresa no encontrada' }); return; }
    res.json(empresa);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener empresa' });
  }
});

router.post('/', validate(empresaSchema), async (req: Request, res: Response) => {
  try {
    const empresa = await prisma.empresa.create({ data: req.body });
    res.status(201).json(empresa);
  } catch (error: any) {
    if (error.code === 'P2002') { res.status(409).json({ error: 'Ya existe una empresa con ese CIF' }); return; }
    res.status(500).json({ error: 'Error al crear empresa' });
  }
});

router.put('/:id', validate(empresaSchema.partial()), async (req: Request, res: Response) => {
  try {
    const empresa = await prisma.empresa.update({
      where: { id: Number(req.params.id) },
      data: req.body,
    });
    res.json(empresa);
  } catch (error: any) {
    if (error.code === 'P2025') { res.status(404).json({ error: 'Empresa no encontrada' }); return; }
    res.status(500).json({ error: 'Error al actualizar empresa' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await prisma.empresa.update({
      where: { id: Number(req.params.id) },
      data: { activa: false },
    });
    res.json({ message: 'Empresa desactivada' });
  } catch (error) {
    res.status(500).json({ error: 'Error al desactivar empresa' });
  }
});

// --- Contactos de empresa ---
router.post('/:id/contactos', async (req: Request, res: Response) => {
  try {
    const contacto = await prisma.contactoEmpresa.create({
      data: { ...req.body, empresaId: Number(req.params.id) },
    });
    res.status(201).json(contacto);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear contacto' });
  }
});

router.put('/:id/contactos/:contactoId', async (req: Request, res: Response) => {
  try {
    const contacto = await prisma.contactoEmpresa.update({
      where: { id: Number(req.params.contactoId) },
      data: req.body,
    });
    res.json(contacto);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar contacto' });
  }
});

router.delete('/:id/contactos/:contactoId', async (req: Request, res: Response) => {
  try {
    await prisma.contactoEmpresa.delete({ where: { id: Number(req.params.contactoId) } });
    res.json({ message: 'Contacto eliminado' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar contacto' });
  }
});

export default router;
