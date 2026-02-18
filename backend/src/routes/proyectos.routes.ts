import { Router, Request, Response } from 'express';
import prisma from '../config/database';
import { authMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { z } from 'zod';

const router = Router();
router.use(authMiddleware);

const proyectoSchema = z.object({
  nombre: z.string().min(1),
  descripcion: z.string().optional(),
  clienteId: z.number().int().positive(),
  comercialId: z.number().int().positive().optional(),
  fechaInicio: z.string().datetime().optional(),
  fechaFinEstimada: z.string().datetime().optional(),
  notas: z.string().optional(),
});

function generarCodigo(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `PRY-${year}-${rand}`;
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const { search, estado, clienteId } = req.query;
    const where: any = {};
    if (estado) where.estado = estado;
    if (clienteId) where.clienteId = Number(clienteId);
    if (search) {
      where.OR = [
        { codigo: { contains: search as string, mode: 'insensitive' } },
        { nombre: { contains: search as string, mode: 'insensitive' } },
      ];
    }
    const proyectos = await prisma.proyecto.findMany({
      where,
      include: {
        cliente: { select: { id: true, nombre: true } },
        comercial: { select: { id: true, nombre: true, apellidos: true } },
        _count: { select: { replanteos: true, presupuestos: true, ordenesTrabajo: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(proyectos);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener proyectos' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const proyecto = await prisma.proyecto.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        cliente: true,
        comercial: { select: { id: true, nombre: true, apellidos: true, email: true } },
        empresasRoles: { include: { empresa: { select: { id: true, nombre: true } } } },
        replanteos: { include: { cochera: true, tipoAutobus: true } },
        presupuestos: { select: { id: true, codigo: true, estado: true, totalCliente: true, margenPorcentaje: true, fecha: true } },
        ordenesTrabajo: { select: { id: true, codigo: true, estado: true } },
        compras: { select: { id: true, codigo: true, estado: true } },
      },
    });
    if (!proyecto) { res.status(404).json({ error: 'Proyecto no encontrado' }); return; }
    res.json(proyecto);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener proyecto' });
  }
});

router.post('/', validate(proyectoSchema), async (req: Request, res: Response) => {
  try {
    const codigo = generarCodigo();
    const proyecto = await prisma.proyecto.create({
      data: { ...req.body, codigo },
      include: { cliente: { select: { id: true, nombre: true } } },
    });
    res.status(201).json(proyecto);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear proyecto' });
  }
});

router.put('/:id', validate(proyectoSchema.partial()), async (req: Request, res: Response) => {
  try {
    const proyecto = await prisma.proyecto.update({
      where: { id: Number(req.params.id) },
      data: req.body,
    });
    res.json(proyecto);
  } catch (error: any) {
    if (error.code === 'P2025') { res.status(404).json({ error: 'No encontrado' }); return; }
    res.status(500).json({ error: 'Error al actualizar' });
  }
});

// Asignar roles empresa al proyecto
router.post('/:id/empresas', async (req: Request, res: Response) => {
  try {
    const { empresaId, rol } = req.body;
    const ep = await prisma.empresaProyecto.create({
      data: { proyectoId: Number(req.params.id), empresaId, rol },
      include: { empresa: { select: { id: true, nombre: true } } },
    });
    res.status(201).json(ep);
  } catch (error: any) {
    if (error.code === 'P2002') { res.status(409).json({ error: 'Rol ya asignado' }); return; }
    res.status(500).json({ error: 'Error al asignar empresa' });
  }
});

router.delete('/:id/empresas/:epId', async (req: Request, res: Response) => {
  try {
    await prisma.empresaProyecto.delete({ where: { id: Number(req.params.epId) } });
    res.json({ message: 'Rol eliminado' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar rol' });
  }
});

export default router;
