import { getOrderFlowFirestore } from '../config/orderflow-firestore';
import prisma from '../config/database';
import { recalcularTodosLosPrecios } from './margenes.service';

/**
 * Mapeo de campos Firestore (OrderFlow inventory) → PostgreSQL (Material)
 *
 * Estructura REAL del documento Firestore (campos en raíz, NO en components):
 *   sku                   → sku
 *   name                  → descripcion
 *   family                → categoria
 *   unit                  → (mapeo a UnidadMaterial)
 *   unitCost              → costeMedio
 *   observations          → notas
 *   minThreshold          → stockMinimo
 *   supplierProductCode   → codigoProveedor
 *   suppliers[]           → se resuelve contra colección suppliers → proveedorHabitual
 *   type                  → "simple" | "kit"
 *   components[]          → sub-componentes (solo para kits)
 *   docId                 → firestoreId
 */

interface FirestoreInventoryDoc {
  sku?: string;
  name?: string;
  family?: string;
  unit?: string;
  unitCost?: number;
  observations?: string;
  minThreshold?: number;
  supplierProductCode?: string;
  isImport?: boolean;
  suppliers?: string[];
  components?: any[];
  type?: string;
}

interface SyncResult {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
}

/**
 * Mapea la unidad de OrderFlow a UnidadMaterial de Prisma.
 */
function mapUnit(unit?: string): 'UNIDAD' | 'METRO' | 'METRO_CUADRADO' | 'KILOGRAMO' | 'LITRO' | 'ROLLO' | 'CAJA' | 'BOLSA' {
  if (!unit) return 'UNIDAD';
  const u = unit.toLowerCase().trim();
  if (u === 'm' || u === 'metro' || u === 'metros') return 'METRO';
  if (u === 'm2' || u === 'm²') return 'METRO_CUADRADO';
  if (u === 'kg' || u === 'kilogramo') return 'KILOGRAMO';
  if (u === 'l' || u === 'litro') return 'LITRO';
  if (u === 'rollo') return 'ROLLO';
  if (u === 'caja') return 'CAJA';
  if (u === 'bolsa') return 'BOLSA';
  return 'UNIDAD'; // ud, unidad, pcs, etc.
}

/**
 * Lee la colección 'suppliers' de OrderFlow y devuelve un mapa id → nombre.
 */
async function loadSupplierNames(): Promise<Map<string, string>> {
  const db = getOrderFlowFirestore();
  const map = new Map<string, string>();

  try {
    const snapshot = await db.collection('suppliers').get();
    snapshot.forEach((doc) => {
      const data = doc.data();
      const name = data.name || data.companyName || data.empresa || data.nombre || doc.id;
      map.set(doc.id, name);
    });
    console.log(`📦 ${map.size} proveedores cargados de OrderFlow`);
  } catch (err) {
    console.warn('⚠️  No se pudieron cargar proveedores de OrderFlow:', err);
  }

  return map;
}

/**
 * Sincroniza materiales desde Firestore (OrderFlow) → PostgreSQL.
 * SOLO LECTURA de Firestore. Hace upsert en PostgreSQL por SKU.
 */
export async function syncMaterialesFromFirestore(): Promise<SyncResult> {
  const db = getOrderFlowFirestore();
  const result: SyncResult = { total: 0, created: 0, updated: 0, skipped: 0, errors: [] };

  // 1. Cargar mapa de proveedores
  const supplierMap = await loadSupplierNames();

  // 2. Leer todos los documentos de la colección 'inventory'
  const snapshot = await db.collection('inventory').get();
  result.total = snapshot.size;
  console.log(`📥 Leyendo ${result.total} materiales de Firestore OrderFlow...`);

  // 3. Procesar cada documento
  for (const doc of snapshot.docs) {
    const data = doc.data() as FirestoreInventoryDoc;

    // Los campos están en la raíz del documento (no dentro de components)
    if (!data.sku) {
      result.skipped++;
      continue;
    }

    // Resolver nombre del primer proveedor
    let proveedorNombre: string | null = null;
    if (data.suppliers && data.suppliers.length > 0) {
      proveedorNombre = supplierMap.get(data.suppliers[0]) || null;
    }

    try {
      // Upsert por firestoreId (o por SKU si ya existe)
      const existing = await prisma.material.findFirst({
        where: {
          OR: [
            { firestoreId: doc.id },
            { sku: data.sku },
          ],
        },
      });

      const materialData = {
        sku: data.sku,
        descripcion: data.name || data.sku,
        categoria: data.family || null,
        unidad: mapUnit(data.unit),
        proveedorHabitual: proveedorNombre,
        codigoProveedor: data.supplierProductCode || null,
        costeMedio: data.unitCost ?? 0,
        stockMinimo: data.minThreshold ?? null,
        notas: data.observations || null,
        firestoreId: doc.id,
        origenExterno: true,
        activo: true,
      };

      if (existing) {
        // Actualizar — preservar precioEstandar y stockActual (datos locales del ERP)
        await prisma.material.update({
          where: { id: existing.id },
          data: {
            sku: materialData.sku,
            descripcion: materialData.descripcion,
            categoria: materialData.categoria,
            unidad: materialData.unidad,
            proveedorHabitual: materialData.proveedorHabitual,
            codigoProveedor: materialData.codigoProveedor,
            costeMedio: materialData.costeMedio,
            stockMinimo: materialData.stockMinimo,
            notas: materialData.notas,
            firestoreId: materialData.firestoreId,
            origenExterno: true,
          },
        });
        result.updated++;
      } else {
        await prisma.material.create({ data: materialData });
        result.created++;
      }
    } catch (err: any) {
      result.errors.push(`Doc ${doc.id} (SKU: ${data.sku}): ${err.message}`);
    }
  }

  console.log(
    `✅ Sync completado: ${result.created} creados, ${result.updated} actualizados, ${result.skipped} omitidos, ${result.errors.length} errores`
  );

  // Recalcular precios de venta con márgenes tras la sincronización
  if (result.created > 0 || result.updated > 0) {
    console.log('💰 Recalculando precios de venta con márgenes...');
    await recalcularTodosLosPrecios();
  }

  return result;
}
