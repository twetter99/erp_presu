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
    const compras = await prisma.solicitudCompra.findMany({
      where,
      include: {
        proyecto: { select: { id: true, codigo: true, nombre: true } },
        _count: { select: { lineas: true } },
      },
      orderBy: { fechaSolicitud: 'desc' },
    });
    res.json(compras);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener solicitudes de compra' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const compra = await prisma.solicitudCompra.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        proyecto: { select: { id: true, codigo: true, nombre: true } },
        lineas: { include: { material: true } },
      },
    });
    if (!compra) { res.status(404).json({ error: 'Solicitud no encontrada' }); return; }
    res.json(compra);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener solicitud' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const codigo = `COM-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000) + 1000}`;
    const compra = await prisma.solicitudCompra.create({
      data: { ...req.body, codigo },
    });
    res.status(201).json(compra);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear solicitud' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const compra = await prisma.solicitudCompra.update({
      where: { id: Number(req.params.id) },
      data: req.body,
    });
    res.json(compra);
  } catch (error: any) {
    if (error.code === 'P2025') { res.status(404).json({ error: 'No encontrada' }); return; }
    res.status(500).json({ error: 'Error al actualizar' });
  }
});

// Cambiar estado compra
router.patch('/:id/estado', async (req: Request, res: Response) => {
  try {
    const { estado } = req.body;
    const data: any = { estado };
    if (estado === 'PEDIDO') data.fechaPedido = new Date();
    if (estado === 'RECIBIDO') data.fechaRecepcion = new Date();
    if (estado === 'FACTURADO') data.fechaFactura = new Date();

    const compra = await prisma.solicitudCompra.update({
      where: { id: Number(req.params.id) },
      data,
    });
    res.json(compra);
  } catch (error) {
    res.status(500).json({ error: 'Error al cambiar estado' });
  }
});

// Líneas de compra
router.post('/:id/lineas', async (req: Request, res: Response) => {
  try {
    const linea = await prisma.compraLinea.create({
      data: { ...req.body, solicitudCompraId: Number(req.params.id) },
      include: { material: true },
    });
    res.status(201).json(linea);
  } catch (error) {
    res.status(500).json({ error: 'Error al añadir línea' });
  }
});

router.put('/:id/lineas/:lineaId', async (req: Request, res: Response) => {
  try {
    const linea = await prisma.compraLinea.update({
      where: { id: Number(req.params.lineaId) },
      data: req.body,
    });
    res.json(linea);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar línea' });
  }
});

router.delete('/:id/lineas/:lineaId', async (req: Request, res: Response) => {
  try {
    await prisma.compraLinea.delete({ where: { id: Number(req.params.lineaId) } });
    res.json({ message: 'Línea eliminada' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar' });
  }
});

// Comparación coste estimado vs real
router.get('/:id/comparacion', async (req: Request, res: Response) => {
  try {
    const compra = await prisma.solicitudCompra.findUnique({
      where: { id: Number(req.params.id) },
      include: { lineas: { include: { material: true } } },
    });
    if (!compra) { res.status(404).json({ error: 'No encontrada' }); return; }

    const comparacion = compra.lineas.map((l) => ({
      material: l.material.descripcion,
      sku: l.material.sku,
      cantidad: l.cantidad,
      cantidadRecibida: l.cantidadRecibida,
      costeEstimado: l.costeEstimado,
      costeReal: l.costeReal,
      desviacion: l.costeReal ? l.costeReal - l.costeEstimado : null,
      desviacionPorcentaje: l.costeReal && l.costeEstimado > 0
        ? ((l.costeReal - l.costeEstimado) / l.costeEstimado) * 100
        : null,
    }));

    const totalEstimado = compra.lineas.reduce((s, l) => s + l.costeEstimado, 0);
    const totalReal = compra.lineas.reduce((s, l) => s + (l.costeReal || 0), 0);

    res.json({
      lineas: comparacion,
      totalEstimado,
      totalReal,
      desviacionTotal: totalReal - totalEstimado,
      desviacionPorcentaje: totalEstimado > 0 ? ((totalReal - totalEstimado) / totalEstimado) * 100 : 0,
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener comparación' });
  }
});

export default router;
