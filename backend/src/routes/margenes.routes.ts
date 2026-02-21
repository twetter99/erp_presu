import { Router, Request, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import {
  getMargenGeneral,
  setMargenGeneral,
  getMargenesCategoria,
  setMargenCategoria,
  deleteMargenCategoria,
  recalcularTodosLosPrecios,
  recalcularPrecioMaterial,
} from '../services/margenes.service';
import prisma from '../config/database';

const router = Router();
router.use(authMiddleware);

// ── Solo ADMINISTRADOR, DIRECCIÓN y COMPRAS pueden gestionar márgenes ──
function checkPermisos(req: AuthRequest, res: Response): boolean {
  if (!['ADMINISTRADOR', 'DIRECCION', 'COMPRAS'].includes(req.userPerfil || '')) {
    res.status(403).json({ error: 'Sin permisos para gestionar márgenes' });
    return false;
  }
  return true;
}

// ============================================================================
// GET /api/margenes — Resumen completo (general + categorías + stats)
// ============================================================================
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const [margenGeneral, categorias] = await Promise.all([
      getMargenGeneral(),
      getMargenesCategoria(),
    ]);

    // Obtener categorías existentes en materiales (para mostrar las que faltan)
    const categoriasExistentes = await prisma.material.findMany({
      where: { activo: true, categoria: { not: null } },
      select: { categoria: true },
      distinct: ['categoria'],
      orderBy: { categoria: 'asc' },
    });

    const todasCategorias = categoriasExistentes
      .map((c) => c.categoria!)
      .filter(Boolean);

    res.json({
      margenGeneral,
      categorias,
      categoriasDisponibles: todasCategorias,
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener márgenes' });
  }
});

// ============================================================================
// PUT /api/margenes/general — Actualizar margen general
// ============================================================================
router.put('/general', async (req: AuthRequest, res: Response) => {
  if (!checkPermisos(req, res)) return;
  try {
    const { margen } = req.body;
    if (typeof margen !== 'number' || margen < 0) {
      res.status(400).json({ error: 'Margen debe ser un número >= 0' });
      return;
    }
    const result = await setMargenGeneral(margen);

    // Recalcular precios de todos los materiales afectados
    const recalculo = await recalcularTodosLosPrecios();
    res.json({
      margenGeneral: result,
      recalculo: `${recalculo.actualizados} materiales actualizados`,
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar margen general' });
  }
});

// ============================================================================
// PUT /api/margenes/categorias/:categoria — Crear/actualizar margen categoría
// ============================================================================
router.put('/categorias/:categoria', async (req: AuthRequest, res: Response) => {
  if (!checkPermisos(req, res)) return;
  try {
    const { margen } = req.body;
    if (typeof margen !== 'number' || margen < 0) {
      res.status(400).json({ error: 'Margen debe ser un número >= 0' });
      return;
    }
    const result = await setMargenCategoria(decodeURIComponent(req.params.categoria), margen);

    // Recalcular precios de todos los materiales afectados
    const recalculo = await recalcularTodosLosPrecios();
    res.json({ ...result, recalculo: `${recalculo.actualizados} materiales actualizados` });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar margen de categoría' });
  }
});

// ============================================================================
// DELETE /api/margenes/categorias/:categoria — Eliminar margen categoría
// ============================================================================
router.delete('/categorias/:categoria', async (req: AuthRequest, res: Response) => {
  if (!checkPermisos(req, res)) return;
  try {
    await deleteMargenCategoria(decodeURIComponent(req.params.categoria));

    // Recalcular precios — los materiales de esa categoría caen al margen general
    const recalculo = await recalcularTodosLosPrecios();
    res.json({
      message: 'Margen de categoría eliminado (volverá al general)',
      recalculo: `${recalculo.actualizados} materiales actualizados`,
    });
  } catch (error: any) {
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Categoría no encontrada' });
      return;
    }
    res.status(500).json({ error: 'Error al eliminar margen de categoría' });
  }
});

// ============================================================================
// PATCH /api/margenes/material/:id — Margen personalizado de un material
// ============================================================================
router.patch('/material/:id', async (req: AuthRequest, res: Response) => {
  if (!checkPermisos(req, res)) return;
  try {
    const { margen } = req.body;
    // margen = null → quitar personalización (vuelve a categoría/general)
    if (margen !== null && (typeof margen !== 'number' || margen < 0)) {
      res.status(400).json({ error: 'Margen debe ser un número >= 0 o null para eliminar' });
      return;
    }

    await prisma.material.update({
      where: { id: Number(req.params.id) },
      data: { margenPersonalizado: margen },
    });

    // Recalcular precio del material
    const updated = await recalcularPrecioMaterial(Number(req.params.id));
    res.json(updated);
  } catch (error: any) {
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Material no encontrado' });
      return;
    }
    res.status(500).json({ error: 'Error al actualizar margen del material' });
  }
});

// ============================================================================
// POST /api/margenes/recalcular — Recalcular TODOS los precios de venta
// ============================================================================
router.post('/recalcular', async (req: AuthRequest, res: Response) => {
  if (!checkPermisos(req, res)) return;
  try {
    const result = await recalcularTodosLosPrecios();
    res.json({
      message: `Precios recalculados: ${result.actualizados} materiales`,
      ...result,
    });
  } catch (error) {
    console.error('Error recalculando precios:', error);
    res.status(500).json({ error: 'Error al recalcular precios' });
  }
});

export default router;
