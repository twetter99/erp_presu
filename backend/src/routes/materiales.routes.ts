import { Router, Request, Response } from 'express';
import prisma from '../config/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { z } from 'zod';
import { syncMaterialesFromFirestore } from '../services/materialSync.service';
import { Prisma } from '@prisma/client';

const router = Router();
router.use(authMiddleware);

const trimToUndefined = (value?: string) => {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
};

const queryToTrimmedString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
};

const resolveActivoWhere = (activo: unknown) => {
  const activoParam = String(activo || 'true').toLowerCase();
  if (activoParam === 'true') {
    return { where: { activo: true }, error: null as string | null };
  }
  if (activoParam === 'false') {
    return { where: { activo: false }, error: null as string | null };
  }
  if (activoParam === 'all') {
    return { where: {}, error: null as string | null };
  }
  return { where: {}, error: "Parámetro 'activo' inválido. Usa true, false o all" };
};

const parseMaterialId = (rawId: string): number | null => {
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }
  return id;
};

const materialSchema = z.object({
  sku: z.string().min(1),
  descripcion: z.string().min(1),
  categoria: z.string().optional(),
  unidad: z.enum(['UNIDAD', 'METRO', 'METRO_CUADRADO', 'KILOGRAMO', 'LITRO', 'ROLLO', 'CAJA', 'BOLSA']),
  proveedorHabitual: z.string().optional(),
  costeMedio: z.coerce.number().min(0).default(0),
  precioEstandar: z.coerce.number().min(0).default(0),
  precioVenta: z.coerce.number().min(0).optional(),
  stockMinimo: z.coerce.number().min(0).optional(),
  stockActual: z.coerce.number().min(0).optional(),
  notas: z.string().optional(),
});

const materialUpdateSchema = materialSchema.partial();

function normalizeCommonMaterialPayload(payload: Record<string, any>): Record<string, any> {
  const data: Record<string, any> = { ...payload };

  if (typeof data.sku === 'string') {
    data.sku = data.sku.trim().toUpperCase();
  }

  if (typeof data.descripcion === 'string') {
    data.descripcion = data.descripcion.trim();
  }

  if ('categoria' in data) {
    data.categoria = trimToUndefined(data.categoria);
  }

  if ('proveedorHabitual' in data) {
    data.proveedorHabitual = trimToUndefined(data.proveedorHabitual);
  }

  if ('notas' in data) {
    data.notas = trimToUndefined(data.notas);
  }

  if ('precioVenta' in data && data.precioVenta === undefined && 'precioEstandar' in data) {
    data.precioVenta = data.precioEstandar;
  }

  if (!('precioVenta' in data) && 'precioEstandar' in data) {
    data.precioVenta = data.precioEstandar;
  }

  return data;
}

function normalizeMaterialCreatePayload(payload: any): Prisma.MaterialCreateInput {
  const normalized = normalizeCommonMaterialPayload(payload);
  return normalized as Prisma.MaterialCreateInput;
}

function normalizeMaterialUpdatePayload(payload: any): Prisma.MaterialUpdateInput {
  const normalized = normalizeCommonMaterialPayload(payload);
  return normalized as Prisma.MaterialUpdateInput;
}

function getMaterialPayloadValidationError(payload: Record<string, any>, partial = false): string | null {
  if (!partial || 'sku' in payload) {
    if (!payload.sku || typeof payload.sku !== 'string' || payload.sku.trim().length === 0) {
      return 'El SKU es obligatorio y no puede estar vacío';
    }
  }

  if (!partial || 'descripcion' in payload) {
    if (!payload.descripcion || typeof payload.descripcion !== 'string' || payload.descripcion.trim().length === 0) {
      return 'La descripción es obligatoria y no puede estar vacía';
    }
  }

  return null;
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const { search, categoria, proveedor, activo } = req.query;
    const searchValue = queryToTrimmedString(search);
    const categoriaValue = queryToTrimmedString(categoria);
    const proveedorValue = queryToTrimmedString(proveedor);
    const { where: activoWhere, error: activoError } = resolveActivoWhere(activo);
    if (activoError) {
      res.status(400).json({ error: activoError });
      return;
    }

    const where: any = { ...activoWhere };

    if (categoriaValue) where.categoria = categoriaValue;
    if (proveedorValue) where.proveedorHabitual = { contains: proveedorValue, mode: 'insensitive' };
    if (searchValue) {
      where.OR = [
        { sku: { contains: searchValue, mode: 'insensitive' } },
        { descripcion: { contains: searchValue, mode: 'insensitive' } },
        { proveedorHabitual: { contains: searchValue, mode: 'insensitive' } },
        { codigoProveedor: { contains: searchValue, mode: 'insensitive' } },
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
    const { activo } = _req.query;
    const { where: activoWhere, error: activoError } = resolveActivoWhere(activo);
    if (activoError) {
      res.status(400).json({ error: activoError });
      return;
    }

    const categorias = await prisma.material.findMany({
      where: { ...activoWhere, categoria: { not: null } },
      select: { categoria: true },
      distinct: ['categoria'],
      orderBy: { categoria: 'asc' },
    });
    res.json(categorias.map((c) => c.categoria).filter(Boolean));
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener categorías' });
  }
});

router.get('/proveedores', async (req: Request, res: Response) => {
  try {
    const { activo } = req.query;
    const { where: activoWhere, error: activoError } = resolveActivoWhere(activo);
    if (activoError) {
      res.status(400).json({ error: activoError });
      return;
    }

    const proveedores = await prisma.material.findMany({
      where: { ...activoWhere, proveedorHabitual: { not: null } },
      select: { proveedorHabitual: true },
      distinct: ['proveedorHabitual'],
      orderBy: { proveedorHabitual: 'asc' },
    });

    res.json(proveedores.map((p) => p.proveedorHabitual).filter(Boolean));
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener proveedores' });
  }
});

router.get('/resumen', async (_req: Request, res: Response) => {
  try {
    const [totalActivos, totalInactivos, categorias, proveedores] = await Promise.all([
      prisma.material.count({ where: { activo: true } }),
      prisma.material.count({ where: { activo: false } }),
      prisma.material.findMany({
        where: { activo: true, categoria: { not: null } },
        select: { categoria: true },
        distinct: ['categoria'],
      }),
      prisma.material.findMany({
        where: { activo: true, proveedorHabitual: { not: null } },
        select: { proveedorHabitual: true },
        distinct: ['proveedorHabitual'],
      }),
    ]);

    res.json({
      totalActivos,
      totalInactivos,
      totalCategorias: categorias.length,
      totalProveedores: proveedores.length,
      totalMateriales: totalActivos + totalInactivos,
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener resumen de materiales' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseMaterialId(req.params.id);
    if (!id) {
      res.status(400).json({ error: 'ID de material inválido' });
      return;
    }

    const material = await prisma.material.findUnique({ where: { id } });
    if (!material) { res.status(404).json({ error: 'Material no encontrado' }); return; }
    res.json(material);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener material' });
  }
});

router.post('/', validate(materialSchema), async (req: Request, res: Response) => {
  try {
    const data = normalizeMaterialCreatePayload(req.body);
    const errorValidacion = getMaterialPayloadValidationError(data as Record<string, any>, false);
    if (errorValidacion) {
      res.status(400).json({ error: errorValidacion });
      return;
    }

    const material = await prisma.material.create({ data });
    res.status(201).json(material);
  } catch (error: any) {
    if (error.code === 'P2002') { res.status(409).json({ error: 'Ya existe un material con ese SKU' }); return; }
    res.status(500).json({ error: 'Error al crear material' });
  }
});

router.put('/:id', validate(materialUpdateSchema), async (req: Request, res: Response) => {
  try {
    const id = parseMaterialId(req.params.id);
    if (!id) {
      res.status(400).json({ error: 'ID de material inválido' });
      return;
    }

    if (!req.body || Object.keys(req.body).length === 0) {
      res.status(400).json({ error: 'No se enviaron campos para actualizar' });
      return;
    }

    const data = normalizeMaterialUpdatePayload(req.body);
    const errorValidacion = getMaterialPayloadValidationError(data as Record<string, any>, true);
    if (errorValidacion) {
      res.status(400).json({ error: errorValidacion });
      return;
    }

    const material = await prisma.material.update({
      where: { id },
      data,
    });
    res.json(material);
  } catch (error: any) {
    if (error.code === 'P2002') { res.status(409).json({ error: 'Ya existe un material con ese SKU' }); return; }
    if (error.code === 'P2025') { res.status(404).json({ error: 'No encontrado' }); return; }
    res.status(500).json({ error: 'Error al actualizar' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseMaterialId(req.params.id);
    if (!id) {
      res.status(400).json({ error: 'ID de material inválido' });
      return;
    }

    const material = await prisma.material.findUnique({ where: { id } });
    if (!material) {
      res.status(404).json({ error: 'Material no encontrado' });
      return;
    }

    if (!material.activo) {
      res.status(409).json({ error: 'El material ya está inactivo' });
      return;
    }

    await prisma.material.update({ where: { id }, data: { activo: false } });
    res.json({ message: 'Material desactivado' });
  } catch (error: any) {
    if (error.code === 'P2025') { res.status(404).json({ error: 'Material no encontrado' }); return; }
    res.status(500).json({ error: 'Error al desactivar' });
  }
});

router.post('/:id/reactivar', async (req: Request, res: Response) => {
  try {
    const id = parseMaterialId(req.params.id);
    if (!id) {
      res.status(400).json({ error: 'ID de material inválido' });
      return;
    }

    const material = await prisma.material.findUnique({ where: { id } });
    if (!material) {
      res.status(404).json({ error: 'Material no encontrado' });
      return;
    }

    if (material.activo) {
      res.status(409).json({ error: 'El material ya está activo' });
      return;
    }

    const reactivado = await prisma.material.update({
      where: { id },
      data: { activo: true },
    });

    res.json({ message: 'Material reactivado', material: reactivado });
  } catch (error) {
    res.status(500).json({ error: 'Error al reactivar material' });
  }
});

/**
 * @swagger
 * /api/materiales/sync:
 *   post:
 *     tags: [Materiales]
 *     summary: Sincronizar materiales desde Firestore (OrderFlow) - solo lectura
 */
router.post('/sync', async (req: AuthRequest, res: Response) => {
  try {
    // Solo administradores y compras pueden sincronizar
    if (!['ADMINISTRADOR', 'DIRECCION', 'COMPRAS'].includes(req.userPerfil || '')) {
      res.status(403).json({ error: 'Solo administradores o compras pueden sincronizar materiales' });
      return;
    }

    console.log(`🔄 Sincronización de materiales iniciada por usuario ${req.userId}`);
    const result = await syncMaterialesFromFirestore();

    res.json({
      message: `Sincronización completada: ${result.created} creados, ${result.updated} actualizados`,
      ...result,
    });
  } catch (error: any) {
    console.error('Error en sync materiales:', error);
    res.status(500).json({ error: 'Error al sincronizar materiales', detail: error.message });
  }
});

export default router;
