import { Router, Request, Response } from 'express';
import prisma from '../config/database';
import { authMiddleware } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req: Request, res: Response) => {
  try {
    const { proyectoId, estado } = req.query;
    const where: any = {};
    if (proyectoId) where.proyectoId = Number(proyectoId);
    if (estado) where.estado = estado;
    const ordenes = await prisma.ordenTrabajo.findMany({
      where,
      include: {
        proyecto: { select: { id: true, codigo: true, nombre: true } },
        cochera: { select: { id: true, nombre: true } },
        _count: { select: { tecnicos: true, lineas: true, materiales: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(ordenes);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener órdenes de trabajo' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const orden = await prisma.ordenTrabajo.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        proyecto: { include: { cliente: true } },
        cochera: true,
        tecnicos: { include: { tecnico: { select: { id: true, nombre: true, apellidos: true } } } },
        lineas: { include: { trabajo: true } },
        materiales: { include: { material: true } },
        checklist: { include: { checklistItem: true } },
        fotos: true,
      },
    });
    if (!orden) { res.status(404).json({ error: 'Orden no encontrada' }); return; }
    res.json(orden);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener orden' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const codigo = `OT-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000) + 1000}`;
    const orden = await prisma.ordenTrabajo.create({
      data: { ...req.body, codigo },
    });
    res.status(201).json(orden);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear orden' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const orden = await prisma.ordenTrabajo.update({
      where: { id: Number(req.params.id) },
      data: req.body,
    });
    res.json(orden);
  } catch (error: any) {
    if (error.code === 'P2025') { res.status(404).json({ error: 'No encontrada' }); return; }
    res.status(500).json({ error: 'Error al actualizar' });
  }
});

// Cambiar estado
router.patch('/:id/estado', async (req: Request, res: Response) => {
  try {
    const { estado } = req.body;
    const data: any = { estado };
    if (estado === 'EN_CURSO') data.fechaInicio = new Date();
    if (estado === 'COMPLETADA') data.fechaFin = new Date();

    const orden = await prisma.ordenTrabajo.update({
      where: { id: Number(req.params.id) },
      data,
    });

    // Si se completa, actualizar proyecto
    if (estado === 'COMPLETADA') {
      await prisma.proyecto.update({
        where: { id: orden.proyectoId },
        data: { estado: 'COMPLETADO', fechaFinReal: new Date() },
      });
    }

    res.json(orden);
  } catch (error) {
    res.status(500).json({ error: 'Error al cambiar estado' });
  }
});

// --- Técnicos ---
router.post('/:id/tecnicos', async (req: Request, res: Response) => {
  try {
    const tecnico = await prisma.ordenTrabajoTecnico.create({
      data: { ...req.body, ordenTrabajoId: Number(req.params.id) },
      include: { tecnico: { select: { id: true, nombre: true, apellidos: true } } },
    });
    res.status(201).json(tecnico);
  } catch (error: any) {
    if (error.code === 'P2002') { res.status(409).json({ error: 'Técnico ya asignado' }); return; }
    res.status(500).json({ error: 'Error al asignar técnico' });
  }
});

router.put('/:id/tecnicos/:ttId', async (req: Request, res: Response) => {
  try {
    const tecnico = await prisma.ordenTrabajoTecnico.update({
      where: { id: Number(req.params.ttId) },
      data: req.body,
    });
    res.json(tecnico);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar' });
  }
});

// --- Líneas de trabajo ---
router.post('/:id/lineas', async (req: Request, res: Response) => {
  try {
    const linea = await prisma.ordenTrabajoLinea.create({
      data: { ...req.body, ordenTrabajoId: Number(req.params.id) },
      include: { trabajo: true },
    });
    res.status(201).json(linea);
  } catch (error) {
    res.status(500).json({ error: 'Error al añadir línea' });
  }
});

router.put('/:id/lineas/:lineaId', async (req: Request, res: Response) => {
  try {
    const linea = await prisma.ordenTrabajoLinea.update({
      where: { id: Number(req.params.lineaId) },
      data: req.body,
    });
    res.json(linea);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar' });
  }
});

// --- Materiales reales ---
router.post('/:id/materiales', async (req: Request, res: Response) => {
  try {
    const mat = await prisma.ordenTrabajoMaterial.create({
      data: { ...req.body, ordenTrabajoId: Number(req.params.id) },
      include: { material: true },
    });
    res.status(201).json(mat);
  } catch (error) {
    res.status(500).json({ error: 'Error al añadir material' });
  }
});

router.put('/:id/materiales/:matId', async (req: Request, res: Response) => {
  try {
    const mat = await prisma.ordenTrabajoMaterial.update({
      where: { id: Number(req.params.matId) },
      data: req.body,
    });
    res.json(mat);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar' });
  }
});

// --- Checklist ---
router.post('/:id/cargar-checklist', async (req: Request, res: Response) => {
  try {
    const orden = await prisma.ordenTrabajo.findUnique({
      where: { id: Number(req.params.id) },
      include: { lineas: { include: { trabajo: { include: { checklistItems: true } } } } },
    });

    if (!orden) { res.status(404).json({ error: 'Orden no encontrada' }); return; }

    const checks: { ordenTrabajoId: number; checklistItemId: number }[] = [];
    for (const linea of orden.lineas) {
      for (const item of linea.trabajo.checklistItems) {
        checks.push({ ordenTrabajoId: orden.id, checklistItemId: item.id });
      }
    }

    // Upsert para evitar duplicados
    for (const check of checks) {
      await prisma.ordenTrabajoCheck.upsert({
        where: {
          ordenTrabajoId_checklistItemId: {
            ordenTrabajoId: check.ordenTrabajoId,
            checklistItemId: check.checklistItemId,
          },
        },
        update: {},
        create: check,
      });
    }

    const checklist = await prisma.ordenTrabajoCheck.findMany({
      where: { ordenTrabajoId: orden.id },
      include: { checklistItem: true },
    });

    res.json(checklist);
  } catch (error) {
    res.status(500).json({ error: 'Error al cargar checklist' });
  }
});

router.put('/:id/checklist/:checkId', async (req: Request, res: Response) => {
  try {
    const check = await prisma.ordenTrabajoCheck.update({
      where: { id: Number(req.params.checkId) },
      data: { ...req.body, fechaCheck: req.body.completado ? new Date() : null },
    });
    res.json(check);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar check' });
  }
});

export default router;
