-- CreateEnum
CREATE TYPE "BloqueEconomico" AS ENUM ('A_SUMINISTRO_EQUIPOS', 'B_MATERIALES_INSTALACION', 'C_MANO_OBRA', 'D_MANTENIMIENTO_1_3', 'E_OPCIONALES_4_5');

-- CreateEnum
CREATE TYPE "TipoPlantillaTexto" AS ENUM ('RESUMEN_EJECUTIVO', 'METODOLOGIA', 'SUPUESTOS', 'EXCLUSIONES', 'CONDICIONES_COMERCIALES', 'CONFIDENCIALIDAD');

-- CreateEnum
CREATE TYPE "TipoAjuste" AS ENUM ('MULTIPLICADOR', 'IMPORTE_FIJO');

-- AlterTable
ALTER TABLE "presupuestos"
ADD COLUMN "baseImponible" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "clienteOperativoNombre" TEXT,
ADD COLUMN "codigoOferta" TEXT,
ADD COLUMN "confidencial" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "ivaImporte" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "ivaPorcentaje" DOUBLE PRECISION NOT NULL DEFAULT 21,
ADD COLUMN "precioUnitarioVehiculo" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "textoConfidencialidad" TEXT,
ADD COLUMN "totalBloqueA" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "totalBloqueB" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "totalBloqueC" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "totalBloqueD" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "totalBloqueE" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "totalConIva" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "versionOferta" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "soluciones_catalogo" (
  "id" SERIAL NOT NULL,
  "codigo" TEXT NOT NULL,
  "nombre" TEXT NOT NULL,
  "descripcion" TEXT,
  "activa" BOOLEAN NOT NULL DEFAULT true,
  "reglasJson" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "soluciones_catalogo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "items_catalogo" (
  "id" SERIAL NOT NULL,
  "sku" TEXT NOT NULL,
  "descripcion" TEXT NOT NULL,
  "familia" TEXT NOT NULL,
  "unidad" TEXT NOT NULL,
  "precioBase" DOUBLE PRECISION NOT NULL,
  "costeBase" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "tipoAjuste" "TipoAjuste" NOT NULL DEFAULT 'MULTIPLICADOR',
  "activo" BOOLEAN NOT NULL DEFAULT true,
  "vigenciaDesde" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "vigenciaHasta" TIMESTAMP(3),
  "metadatos" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "items_catalogo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plantillas_texto" (
  "id" SERIAL NOT NULL,
  "codigo" TEXT NOT NULL,
  "nombre" TEXT NOT NULL,
  "tipo" "TipoPlantillaTexto" NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "contenido" TEXT NOT NULL,
  "activa" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "plantillas_texto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solucion_plantillas_texto" (
  "id" SERIAL NOT NULL,
  "solucionId" INTEGER NOT NULL,
  "plantillaId" INTEGER NOT NULL,
  CONSTRAINT "solucion_plantillas_texto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solucion_anexos_tecnicos" (
  "id" SERIAL NOT NULL,
  "solucionId" INTEGER NOT NULL,
  "titulo" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "orden" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "solucion_anexos_tecnicos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "presupuesto_contexto" (
  "id" SERIAL NOT NULL,
  "presupuestoId" INTEGER NOT NULL,
  "clienteOperativoId" INTEGER,
  "solucionId" INTEGER,
  "numVehiculos" INTEGER NOT NULL DEFAULT 1,
  "tipologiaVehiculo" TEXT,
  "fabricantesModelos" TEXT,
  "piloto" BOOLEAN NOT NULL DEFAULT false,
  "horarioIntervencion" TEXT,
  "nocturnidad" BOOLEAN NOT NULL DEFAULT false,
  "integraciones" BOOLEAN NOT NULL DEFAULT false,
  "extrasJson" JSONB,
  "objetivoProyecto" TEXT,
  "ubicacionesJson" JSONB,
  "ventanaIntervencion" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "presupuesto_contexto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "presupuesto_lineas_motor" (
  "id" SERIAL NOT NULL,
  "presupuestoId" INTEGER NOT NULL,
  "bloque" "BloqueEconomico" NOT NULL,
  "itemCatalogoId" INTEGER,
  "codigo" TEXT NOT NULL,
  "descripcion" TEXT NOT NULL,
  "unidad" TEXT NOT NULL,
  "cantidad" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "precioUnitario" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "costeUnitario" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "costeSubtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "origen" TEXT,
  "orden" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "presupuesto_lineas_motor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "presupuesto_textos" (
  "id" SERIAL NOT NULL,
  "presupuestoId" INTEGER NOT NULL,
  "tipo" "TipoPlantillaTexto" NOT NULL,
  "titulo" TEXT NOT NULL,
  "contenido" TEXT NOT NULL,
  "plantillaId" INTEGER,
  "versionPlantilla" INTEGER,
  "orden" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "presupuesto_textos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "presupuesto_snapshots" (
  "id" SERIAL NOT NULL,
  "presupuestoId" INTEGER NOT NULL,
  "fechaEmision" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "versionOferta" INTEGER NOT NULL DEFAULT 1,
  "reglasJson" JSONB NOT NULL,
  "preciosJson" JSONB NOT NULL,
  "payloadOfertaJson" JSONB NOT NULL,
  "hashContenido" TEXT,
  CONSTRAINT "presupuesto_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "presupuestos_codigoOferta_key" ON "presupuestos"("codigoOferta");

-- CreateIndex
CREATE UNIQUE INDEX "soluciones_catalogo_codigo_key" ON "soluciones_catalogo"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "items_catalogo_sku_key" ON "items_catalogo"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "plantillas_texto_codigo_key" ON "plantillas_texto"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "solucion_plantillas_texto_solucionId_plantillaId_key" ON "solucion_plantillas_texto"("solucionId", "plantillaId");

-- CreateIndex
CREATE UNIQUE INDEX "solucion_anexos_tecnicos_solucionId_titulo_key" ON "solucion_anexos_tecnicos"("solucionId", "titulo");

-- CreateIndex
CREATE UNIQUE INDEX "presupuesto_contexto_presupuestoId_key" ON "presupuesto_contexto"("presupuestoId");

-- CreateIndex
CREATE INDEX "presupuesto_lineas_motor_presupuestoId_bloque_idx" ON "presupuesto_lineas_motor"("presupuestoId", "bloque");

-- CreateIndex
CREATE INDEX "presupuesto_textos_presupuestoId_tipo_idx" ON "presupuesto_textos"("presupuestoId", "tipo");

-- CreateIndex
CREATE UNIQUE INDEX "presupuesto_snapshots_presupuestoId_key" ON "presupuesto_snapshots"("presupuestoId");

-- AddForeignKey
ALTER TABLE "solucion_plantillas_texto"
ADD CONSTRAINT "solucion_plantillas_texto_solucionId_fkey" FOREIGN KEY ("solucionId") REFERENCES "soluciones_catalogo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solucion_plantillas_texto"
ADD CONSTRAINT "solucion_plantillas_texto_plantillaId_fkey" FOREIGN KEY ("plantillaId") REFERENCES "plantillas_texto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solucion_anexos_tecnicos"
ADD CONSTRAINT "solucion_anexos_tecnicos_solucionId_fkey" FOREIGN KEY ("solucionId") REFERENCES "soluciones_catalogo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presupuesto_contexto"
ADD CONSTRAINT "presupuesto_contexto_presupuestoId_fkey" FOREIGN KEY ("presupuestoId") REFERENCES "presupuestos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presupuesto_contexto"
ADD CONSTRAINT "presupuesto_contexto_solucionId_fkey" FOREIGN KEY ("solucionId") REFERENCES "soluciones_catalogo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presupuesto_lineas_motor"
ADD CONSTRAINT "presupuesto_lineas_motor_presupuestoId_fkey" FOREIGN KEY ("presupuestoId") REFERENCES "presupuestos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presupuesto_lineas_motor"
ADD CONSTRAINT "presupuesto_lineas_motor_itemCatalogoId_fkey" FOREIGN KEY ("itemCatalogoId") REFERENCES "items_catalogo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presupuesto_textos"
ADD CONSTRAINT "presupuesto_textos_presupuestoId_fkey" FOREIGN KEY ("presupuestoId") REFERENCES "presupuestos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presupuesto_textos"
ADD CONSTRAINT "presupuesto_textos_plantillaId_fkey" FOREIGN KEY ("plantillaId") REFERENCES "plantillas_texto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presupuesto_snapshots"
ADD CONSTRAINT "presupuesto_snapshots_presupuestoId_fkey" FOREIGN KEY ("presupuestoId") REFERENCES "presupuestos"("id") ON DELETE CASCADE ON UPDATE CASCADE;