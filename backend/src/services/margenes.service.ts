import prisma from '../config/database';

const CLAVE_MARGEN_GENERAL = 'margen_general_materiales';
const MARGEN_GENERAL_DEFAULT = 30; // 30% por defecto

// ============================================================================
// MARGEN GENERAL
// ============================================================================

/**
 * Obtiene el margen general para materiales (%).
 */
export async function getMargenGeneral(): Promise<number> {
  const config = await prisma.configuracion.findUnique({
    where: { clave: CLAVE_MARGEN_GENERAL },
  });
  return config ? parseFloat(config.valor) : MARGEN_GENERAL_DEFAULT;
}

/**
 * Establece el margen general para materiales (%).
 */
export async function setMargenGeneral(margen: number): Promise<number> {
  await prisma.configuracion.upsert({
    where: { clave: CLAVE_MARGEN_GENERAL },
    update: { valor: String(margen) },
    create: {
      clave: CLAVE_MARGEN_GENERAL,
      valor: String(margen),
      descripcion: 'Margen general aplicado a todos los materiales (%)',
    },
  });
  return margen;
}

// ============================================================================
// MÁRGENES POR CATEGORÍA
// ============================================================================

/**
 * Obtiene todos los márgenes por categoría.
 */
export async function getMargenesCategoria() {
  return prisma.margenCategoria.findMany({ orderBy: { categoria: 'asc' } });
}

/**
 * Establece el margen para una categoría (upsert).
 */
export async function setMargenCategoria(categoria: string, margen: number) {
  return prisma.margenCategoria.upsert({
    where: { categoria },
    update: { margen },
    create: { categoria, margen },
  });
}

/**
 * Elimina el margen personalizado de una categoría (volverá al general).
 */
export async function deleteMargenCategoria(categoria: string) {
  return prisma.margenCategoria.delete({ where: { categoria } });
}

// ============================================================================
// RESOLUCIÓN DE MARGEN (cascada)
// ============================================================================

/**
 * Resuelve el margen efectivo para un material:
 *   1. margenPersonalizado del material (si existe)
 *   2. margen de su categoría (si existe)
 *   3. margen general
 */
export async function resolveMargen(material: {
  margenPersonalizado: number | null;
  categoria: string | null;
}): Promise<number> {
  // Nivel 1: margen individual
  if (material.margenPersonalizado !== null && material.margenPersonalizado !== undefined) {
    return material.margenPersonalizado;
  }

  // Nivel 2: margen por categoría
  if (material.categoria) {
    const margenCat = await prisma.margenCategoria.findUnique({
      where: { categoria: material.categoria },
    });
    if (margenCat) return margenCat.margen;
  }

  // Nivel 3: margen general
  return getMargenGeneral();
}

/**
 * Calcula el precio de venta a partir del coste y el margen.
 * precioVenta = costeMedio × (1 + margen / 100)
 */
export function calcularPrecioVenta(costeMedio: number, margen: number): number {
  return Math.round(costeMedio * (1 + margen / 100) * 10000) / 10000; // 4 decimales
}

// ============================================================================
// RECÁLCULO MASIVO
// ============================================================================

/**
 * Recalcula precioVenta para TODOS los materiales activos.
 * Usa la cascada de márgenes (individual → categoría → general).
 * Devuelve cuántos materiales se actualizaron.
 */
export async function recalcularTodosLosPrecios(): Promise<{
  actualizados: number;
  resumen: { categoria: string; margen: number; count: number }[];
}> {
  // Cargar configuración de márgenes
  const margenGeneral = await getMargenGeneral();
  const margenesCat = await getMargenesCategoria();
  const mapaCat = new Map(margenesCat.map((mc) => [mc.categoria, mc.margen]));

  // Cargar todos los materiales activos
  const materiales = await prisma.material.findMany({
    where: { activo: true },
    select: {
      id: true,
      costeMedio: true,
      categoria: true,
      margenPersonalizado: true,
    },
  });

  const resumenMap = new Map<string, { margen: number; count: number }>();
  let actualizados = 0;

  // Se procesan en batch con transacción
  const updates = materiales.map((mat) => {
    let margenEfectivo: number;
    let label: string;

    if (mat.margenPersonalizado !== null) {
      margenEfectivo = mat.margenPersonalizado;
      label = `Individual (${margenEfectivo}%)`;
    } else if (mat.categoria && mapaCat.has(mat.categoria)) {
      margenEfectivo = mapaCat.get(mat.categoria)!;
      label = mat.categoria;
    } else {
      margenEfectivo = margenGeneral;
      label = 'General';
    }

    const precioVenta = calcularPrecioVenta(mat.costeMedio, margenEfectivo);

    // Contabilizar resumen
    const entry = resumenMap.get(label) || { margen: margenEfectivo, count: 0 };
    entry.count++;
    resumenMap.set(label, entry);

    return prisma.material.update({
      where: { id: mat.id },
      data: { precioVenta },
    });
  });

  // Ejecutar en transacción
  await prisma.$transaction(updates);
  actualizados = updates.length;

  const resumen = Array.from(resumenMap.entries()).map(([categoria, data]) => ({
    categoria,
    margen: data.margen,
    count: data.count,
  }));

  console.log(`💰 Precios recalculados: ${actualizados} materiales`);
  return { actualizados, resumen };
}

/**
 * Recalcula el precioVenta de un solo material.
 */
export async function recalcularPrecioMaterial(materialId: number) {
  const material = await prisma.material.findUnique({
    where: { id: materialId },
    select: {
      id: true,
      costeMedio: true,
      categoria: true,
      margenPersonalizado: true,
    },
  });

  if (!material) throw new Error('Material no encontrado');

  const margen = await resolveMargen(material);
  const precioVenta = calcularPrecioVenta(material.costeMedio, margen);

  return prisma.material.update({
    where: { id: materialId },
    data: { precioVenta },
  });
}
