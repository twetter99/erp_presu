-- CreateEnum
CREATE TYPE "RolEmpresa" AS ENUM ('CONTRATANTE', 'PROPIETARIO_FLOTA', 'OPERADOR', 'PROPIETARIO_COCHERA');

-- CreateEnum
CREATE TYPE "TipoCombustible" AS ENUM ('DIESEL', 'HIBRIDO', 'ELECTRICO', 'GAS_NATURAL', 'HIDROGENO');

-- CreateEnum
CREATE TYPE "UnidadTrabajo" AS ENUM ('POR_BUS', 'POR_HORA', 'POR_VISITA', 'POR_UNIDAD');

-- CreateEnum
CREATE TYPE "UnidadMaterial" AS ENUM ('UNIDAD', 'METRO', 'METRO_CUADRADO', 'KILOGRAMO', 'LITRO', 'ROLLO', 'CAJA', 'BOLSA');

-- CreateEnum
CREATE TYPE "EstadoReplanteo" AS ENUM ('PENDIENTE', 'REVISADO', 'VALIDADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "EstadoPresupuesto" AS ENUM ('BORRADOR', 'ENVIADO', 'NEGOCIACION', 'ACEPTADO', 'RECHAZADO', 'EXPIRADO');

-- CreateEnum
CREATE TYPE "EstadoCompra" AS ENUM ('PENDIENTE', 'PEDIDO', 'RECIBIDO_PARCIAL', 'RECIBIDO', 'FACTURADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "EstadoOrdenTrabajo" AS ENUM ('PLANIFICADA', 'EN_CURSO', 'PAUSADA', 'COMPLETADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "EstadoProyecto" AS ENUM ('REPLANTEO', 'PRESUPUESTO', 'ACEPTADO', 'EN_EJECUCION', 'COMPLETADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "PerfilUsuario" AS ENUM ('DIRECCION', 'COMERCIAL', 'OFICINA_TECNICA', 'COMPRAS', 'TECNICO_INSTALADOR', 'ADMINISTRADOR');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" SERIAL NOT NULL,
    "firebase_uid" TEXT,
    "nombre" TEXT NOT NULL,
    "apellidos" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL DEFAULT '',
    "perfil" "PerfilUsuario" NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "telefono" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "empresas" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "cif" TEXT NOT NULL,
    "direccion" TEXT,
    "ciudad" TEXT,
    "provincia" TEXT,
    "cp" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "web" TEXT,
    "notas" TEXT,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "empresas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contactos_empresa" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "cargo" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "principal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contactos_empresa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cocheras" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "direccion" TEXT NOT NULL,
    "ciudad" TEXT,
    "provincia" TEXT,
    "cp" TEXT,
    "responsable" TEXT,
    "telefonoResponsable" TEXT,
    "horarioAcceso" TEXT,
    "observacionesTecnicas" TEXT,
    "latitud" DOUBLE PRECISION,
    "longitud" DOUBLE PRECISION,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "empresaId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cocheras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tipos_autobus" (
    "id" SERIAL NOT NULL,
    "marca" TEXT NOT NULL,
    "modelo" TEXT NOT NULL,
    "longitud" DOUBLE PRECISION,
    "tipoCombustible" "TipoCombustible" NOT NULL,
    "configuracionEspecial" TEXT,
    "numPlazas" INTEGER,
    "notas" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tipos_autobus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plantillas_trabajos" (
    "id" SERIAL NOT NULL,
    "tipoAutobusId" INTEGER NOT NULL,
    "trabajoId" INTEGER NOT NULL,
    "cantidad" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "notas" TEXT,

    CONSTRAINT "plantillas_trabajos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plantillas_materiales" (
    "id" SERIAL NOT NULL,
    "tipoAutobusId" INTEGER NOT NULL,
    "materialId" INTEGER NOT NULL,
    "cantidad" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "notas" TEXT,

    CONSTRAINT "plantillas_materiales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trabajos" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombreComercial" TEXT NOT NULL,
    "descripcionTecnica" TEXT,
    "unidad" "UnidadTrabajo" NOT NULL,
    "tiempoEstandarHoras" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "numTecnicosRequeridos" INTEGER NOT NULL DEFAULT 1,
    "precioVentaEstandar" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "costeInternoEstandar" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "categoria" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trabajos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklist_items" (
    "id" SERIAL NOT NULL,
    "trabajoId" INTEGER NOT NULL,
    "descripcion" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "obligatorio" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "checklist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "materiales" (
    "id" SERIAL NOT NULL,
    "sku" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "categoria" TEXT,
    "unidad" "UnidadMaterial" NOT NULL,
    "proveedorHabitual" TEXT,
    "costeMedio" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "precioEstandar" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "stockMinimo" DOUBLE PRECISION,
    "stockActual" DOUBLE PRECISION,
    "notas" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "materiales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proyectos" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "clienteId" INTEGER NOT NULL,
    "comercialId" INTEGER,
    "estado" "EstadoProyecto" NOT NULL DEFAULT 'REPLANTEO',
    "fechaInicio" TIMESTAMP(3),
    "fechaFinEstimada" TIMESTAMP(3),
    "fechaFinReal" TIMESTAMP(3),
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proyectos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "empresas_proyectos" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "proyectoId" INTEGER NOT NULL,
    "rol" "RolEmpresa" NOT NULL,

    CONSTRAINT "empresas_proyectos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "replanteos" (
    "id" SERIAL NOT NULL,
    "proyectoId" INTEGER NOT NULL,
    "cocheraId" INTEGER NOT NULL,
    "tipoAutobusId" INTEGER NOT NULL,
    "numBuses" INTEGER NOT NULL,
    "tecnicoResponsableId" INTEGER NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" "EstadoReplanteo" NOT NULL DEFAULT 'PENDIENTE',
    "canalizacionesExistentes" TEXT,
    "espaciosDisponibles" TEXT,
    "tipoInstalacionPrevia" TEXT,
    "senalesDisponibles" TEXT,
    "necesidadSelladoTecho" BOOLEAN NOT NULL DEFAULT false,
    "complejidadEspecial" TEXT,
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "replanteos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "replanteo_trabajos" (
    "id" SERIAL NOT NULL,
    "replanteoId" INTEGER NOT NULL,
    "trabajoId" INTEGER NOT NULL,
    "cantidad" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "observaciones" TEXT,

    CONSTRAINT "replanteo_trabajos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "replanteo_materiales" (
    "id" SERIAL NOT NULL,
    "replanteoId" INTEGER NOT NULL,
    "materialId" INTEGER NOT NULL,
    "cantidadEstimada" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "observaciones" TEXT,

    CONSTRAINT "replanteo_materiales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "replanteo_fotos" (
    "id" SERIAL NOT NULL,
    "replanteoId" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "descripcion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "replanteo_fotos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "presupuestos" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "proyectoId" INTEGER NOT NULL,
    "replanteoId" INTEGER,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validezDias" INTEGER NOT NULL DEFAULT 30,
    "estado" "EstadoPresupuesto" NOT NULL DEFAULT 'BORRADOR',
    "totalTrabajos" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalMateriales" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalDesplazamientos" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "descuentoPorcentaje" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCliente" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "costeTrabajos" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "costeMateriales" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "costeDesplazamientos" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "costeTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "margenBruto" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "margenPorcentaje" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "observacionesCliente" TEXT,
    "observacionesInternas" TEXT,
    "fechaEnvio" TIMESTAMP(3),
    "fechaRespuesta" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "presupuestos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "presupuesto_lineas_trabajo" (
    "id" SERIAL NOT NULL,
    "presupuestoId" INTEGER NOT NULL,
    "trabajoId" INTEGER NOT NULL,
    "descripcionCliente" TEXT,
    "cantidad" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "precioUnitarioCliente" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCliente" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "costeUnitarioInterno" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalInterno" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "margen" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "presupuesto_lineas_trabajo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "presupuesto_lineas_material" (
    "id" SERIAL NOT NULL,
    "presupuestoId" INTEGER NOT NULL,
    "materialId" INTEGER NOT NULL,
    "descripcionCliente" TEXT,
    "cantidad" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "precioUnitarioCliente" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCliente" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "costeUnitarioInterno" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalInterno" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "margen" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "presupuesto_lineas_material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "presupuesto_lineas_desplazamiento" (
    "id" SERIAL NOT NULL,
    "presupuestoId" INTEGER NOT NULL,
    "descripcion" TEXT NOT NULL,
    "precioCliente" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "costeInterno" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "margen" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "presupuesto_lineas_desplazamiento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solicitudes_compra" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "proyectoId" INTEGER NOT NULL,
    "proveedor" TEXT NOT NULL,
    "estado" "EstadoCompra" NOT NULL DEFAULT 'PENDIENTE',
    "fechaSolicitud" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaPedido" TIMESTAMP(3),
    "fechaRecepcion" TIMESTAMP(3),
    "fechaFactura" TIMESTAMP(3),
    "numPedido" TEXT,
    "numFactura" TEXT,
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "solicitudes_compra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compra_lineas" (
    "id" SERIAL NOT NULL,
    "solicitudCompraId" INTEGER NOT NULL,
    "materialId" INTEGER NOT NULL,
    "cantidad" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "costeEstimado" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "costeReal" DOUBLE PRECISION,
    "cantidadRecibida" DOUBLE PRECISION,
    "observaciones" TEXT,

    CONSTRAINT "compra_lineas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ordenes_trabajo" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "proyectoId" INTEGER NOT NULL,
    "cocheraId" INTEGER NOT NULL,
    "estado" "EstadoOrdenTrabajo" NOT NULL DEFAULT 'PLANIFICADA',
    "fechaPlanificada" TIMESTAMP(3),
    "fechaInicio" TIMESTAMP(3),
    "fechaFin" TIMESTAMP(3),
    "observaciones" TEXT,
    "actaFirmada" BOOLEAN NOT NULL DEFAULT false,
    "actaUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ordenes_trabajo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orden_trabajo_tecnicos" (
    "id" SERIAL NOT NULL,
    "ordenTrabajoId" INTEGER NOT NULL,
    "tecnicoId" INTEGER NOT NULL,
    "horasEstimadas" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "horasReales" DOUBLE PRECISION,
    "observaciones" TEXT,

    CONSTRAINT "orden_trabajo_tecnicos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orden_trabajo_lineas" (
    "id" SERIAL NOT NULL,
    "ordenTrabajoId" INTEGER NOT NULL,
    "trabajoId" INTEGER NOT NULL,
    "cantidad" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "horasEstimadas" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "horasReales" DOUBLE PRECISION,
    "completado" BOOLEAN NOT NULL DEFAULT false,
    "observaciones" TEXT,

    CONSTRAINT "orden_trabajo_lineas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orden_trabajo_materiales" (
    "id" SERIAL NOT NULL,
    "ordenTrabajoId" INTEGER NOT NULL,
    "materialId" INTEGER NOT NULL,
    "cantidadEstimada" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cantidadReal" DOUBLE PRECISION,
    "observaciones" TEXT,

    CONSTRAINT "orden_trabajo_materiales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orden_trabajo_checks" (
    "id" SERIAL NOT NULL,
    "ordenTrabajoId" INTEGER NOT NULL,
    "checklistItemId" INTEGER NOT NULL,
    "completado" BOOLEAN NOT NULL DEFAULT false,
    "observaciones" TEXT,
    "fechaCheck" TIMESTAMP(3),

    CONSTRAINT "orden_trabajo_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orden_trabajo_fotos" (
    "id" SERIAL NOT NULL,
    "ordenTrabajoId" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "descripcion" TEXT,
    "tipo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orden_trabajo_fotos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_firebase_uid_key" ON "usuarios"("firebase_uid");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "empresas_cif_key" ON "empresas"("cif");

-- CreateIndex
CREATE UNIQUE INDEX "tipos_autobus_marca_modelo_key" ON "tipos_autobus"("marca", "modelo");

-- CreateIndex
CREATE UNIQUE INDEX "plantillas_trabajos_tipoAutobusId_trabajoId_key" ON "plantillas_trabajos"("tipoAutobusId", "trabajoId");

-- CreateIndex
CREATE UNIQUE INDEX "plantillas_materiales_tipoAutobusId_materialId_key" ON "plantillas_materiales"("tipoAutobusId", "materialId");

-- CreateIndex
CREATE UNIQUE INDEX "trabajos_codigo_key" ON "trabajos"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "materiales_sku_key" ON "materiales"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "proyectos_codigo_key" ON "proyectos"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "empresas_proyectos_empresaId_proyectoId_rol_key" ON "empresas_proyectos"("empresaId", "proyectoId", "rol");

-- CreateIndex
CREATE UNIQUE INDEX "replanteo_trabajos_replanteoId_trabajoId_key" ON "replanteo_trabajos"("replanteoId", "trabajoId");

-- CreateIndex
CREATE UNIQUE INDEX "replanteo_materiales_replanteoId_materialId_key" ON "replanteo_materiales"("replanteoId", "materialId");

-- CreateIndex
CREATE UNIQUE INDEX "presupuestos_codigo_key" ON "presupuestos"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "solicitudes_compra_codigo_key" ON "solicitudes_compra"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "ordenes_trabajo_codigo_key" ON "ordenes_trabajo"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "orden_trabajo_tecnicos_ordenTrabajoId_tecnicoId_key" ON "orden_trabajo_tecnicos"("ordenTrabajoId", "tecnicoId");

-- CreateIndex
CREATE UNIQUE INDEX "orden_trabajo_checks_ordenTrabajoId_checklistItemId_key" ON "orden_trabajo_checks"("ordenTrabajoId", "checklistItemId");

-- AddForeignKey
ALTER TABLE "contactos_empresa" ADD CONSTRAINT "contactos_empresa_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cocheras" ADD CONSTRAINT "cocheras_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plantillas_trabajos" ADD CONSTRAINT "plantillas_trabajos_tipoAutobusId_fkey" FOREIGN KEY ("tipoAutobusId") REFERENCES "tipos_autobus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plantillas_trabajos" ADD CONSTRAINT "plantillas_trabajos_trabajoId_fkey" FOREIGN KEY ("trabajoId") REFERENCES "trabajos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plantillas_materiales" ADD CONSTRAINT "plantillas_materiales_tipoAutobusId_fkey" FOREIGN KEY ("tipoAutobusId") REFERENCES "tipos_autobus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plantillas_materiales" ADD CONSTRAINT "plantillas_materiales_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "materiales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_items" ADD CONSTRAINT "checklist_items_trabajoId_fkey" FOREIGN KEY ("trabajoId") REFERENCES "trabajos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proyectos" ADD CONSTRAINT "proyectos_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proyectos" ADD CONSTRAINT "proyectos_comercialId_fkey" FOREIGN KEY ("comercialId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empresas_proyectos" ADD CONSTRAINT "empresas_proyectos_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empresas_proyectos" ADD CONSTRAINT "empresas_proyectos_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "proyectos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "replanteos" ADD CONSTRAINT "replanteos_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "proyectos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "replanteos" ADD CONSTRAINT "replanteos_cocheraId_fkey" FOREIGN KEY ("cocheraId") REFERENCES "cocheras"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "replanteos" ADD CONSTRAINT "replanteos_tipoAutobusId_fkey" FOREIGN KEY ("tipoAutobusId") REFERENCES "tipos_autobus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "replanteos" ADD CONSTRAINT "replanteos_tecnicoResponsableId_fkey" FOREIGN KEY ("tecnicoResponsableId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "replanteo_trabajos" ADD CONSTRAINT "replanteo_trabajos_replanteoId_fkey" FOREIGN KEY ("replanteoId") REFERENCES "replanteos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "replanteo_trabajos" ADD CONSTRAINT "replanteo_trabajos_trabajoId_fkey" FOREIGN KEY ("trabajoId") REFERENCES "trabajos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "replanteo_materiales" ADD CONSTRAINT "replanteo_materiales_replanteoId_fkey" FOREIGN KEY ("replanteoId") REFERENCES "replanteos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "replanteo_materiales" ADD CONSTRAINT "replanteo_materiales_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "materiales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "replanteo_fotos" ADD CONSTRAINT "replanteo_fotos_replanteoId_fkey" FOREIGN KEY ("replanteoId") REFERENCES "replanteos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presupuestos" ADD CONSTRAINT "presupuestos_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "proyectos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presupuestos" ADD CONSTRAINT "presupuestos_replanteoId_fkey" FOREIGN KEY ("replanteoId") REFERENCES "replanteos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presupuesto_lineas_trabajo" ADD CONSTRAINT "presupuesto_lineas_trabajo_presupuestoId_fkey" FOREIGN KEY ("presupuestoId") REFERENCES "presupuestos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presupuesto_lineas_trabajo" ADD CONSTRAINT "presupuesto_lineas_trabajo_trabajoId_fkey" FOREIGN KEY ("trabajoId") REFERENCES "trabajos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presupuesto_lineas_material" ADD CONSTRAINT "presupuesto_lineas_material_presupuestoId_fkey" FOREIGN KEY ("presupuestoId") REFERENCES "presupuestos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presupuesto_lineas_material" ADD CONSTRAINT "presupuesto_lineas_material_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "materiales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presupuesto_lineas_desplazamiento" ADD CONSTRAINT "presupuesto_lineas_desplazamiento_presupuestoId_fkey" FOREIGN KEY ("presupuestoId") REFERENCES "presupuestos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_compra" ADD CONSTRAINT "solicitudes_compra_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "proyectos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compra_lineas" ADD CONSTRAINT "compra_lineas_solicitudCompraId_fkey" FOREIGN KEY ("solicitudCompraId") REFERENCES "solicitudes_compra"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compra_lineas" ADD CONSTRAINT "compra_lineas_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "materiales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_trabajo" ADD CONSTRAINT "ordenes_trabajo_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "proyectos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_trabajo" ADD CONSTRAINT "ordenes_trabajo_cocheraId_fkey" FOREIGN KEY ("cocheraId") REFERENCES "cocheras"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orden_trabajo_tecnicos" ADD CONSTRAINT "orden_trabajo_tecnicos_ordenTrabajoId_fkey" FOREIGN KEY ("ordenTrabajoId") REFERENCES "ordenes_trabajo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orden_trabajo_tecnicos" ADD CONSTRAINT "orden_trabajo_tecnicos_tecnicoId_fkey" FOREIGN KEY ("tecnicoId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orden_trabajo_lineas" ADD CONSTRAINT "orden_trabajo_lineas_ordenTrabajoId_fkey" FOREIGN KEY ("ordenTrabajoId") REFERENCES "ordenes_trabajo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orden_trabajo_lineas" ADD CONSTRAINT "orden_trabajo_lineas_trabajoId_fkey" FOREIGN KEY ("trabajoId") REFERENCES "trabajos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orden_trabajo_materiales" ADD CONSTRAINT "orden_trabajo_materiales_ordenTrabajoId_fkey" FOREIGN KEY ("ordenTrabajoId") REFERENCES "ordenes_trabajo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orden_trabajo_materiales" ADD CONSTRAINT "orden_trabajo_materiales_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "materiales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orden_trabajo_checks" ADD CONSTRAINT "orden_trabajo_checks_ordenTrabajoId_fkey" FOREIGN KEY ("ordenTrabajoId") REFERENCES "ordenes_trabajo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orden_trabajo_checks" ADD CONSTRAINT "orden_trabajo_checks_checklistItemId_fkey" FOREIGN KEY ("checklistItemId") REFERENCES "checklist_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orden_trabajo_fotos" ADD CONSTRAINT "orden_trabajo_fotos_ordenTrabajoId_fkey" FOREIGN KEY ("ordenTrabajoId") REFERENCES "ordenes_trabajo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
