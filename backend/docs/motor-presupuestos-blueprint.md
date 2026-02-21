# Motor de Presupuestos B2B (Blueprint técnico)

## 1) Objetivo
Convertir el módulo actual de presupuestos en un motor tipo oferta industrial (estilo WINFIN), manteniendo compatibilidad con el esquema actual (`Presupuesto`, `PresupuestoLineaTrabajo`, `PresupuestoLineaMaterial`, `PresupuestoLineaDesplazamiento`) y habilitando:

- Partidas por bloques A/B/C/D/E.
- Cálculo automático desde 6 inputs mínimos.
- Textos parametrizados por plantilla.
- Snapshot auditable al emitir oferta/PDF.

---

## 2) Estado actual (base ya existente)
En el esquema actual ya tenemos:

- `Presupuesto` con totales cliente e internos, estado, validez y observaciones.
- Líneas separadas por trabajo/material/desplazamiento.
- Generación desde replanteo (`POST /presupuestos/generar-desde-replanteo/:replanteoId`).

Esto es una base sólida para evolucionar sin rehacer.

---

## 3) Extensión de datos propuesta (compatible)

## 3.1 Nuevos enums

```prisma
enum BloqueEconomico {
  A_SUMINISTRO_EQUIPOS
  B_MATERIALES_INSTALACION
  C_MANO_OBRA
  D_MANTENIMIENTO_1_3
  E_OPCIONALES_4_5
}

enum TipoPlantillaTexto {
  RESUMEN_EJECUTIVO
  METODOLOGIA
  SUPUESTOS
  EXCLUSIONES
  CONDICIONES_COMERCIALES
  CONFIDENCIALIDAD
}

enum TipoAjuste {
  MULTIPLICADOR
  IMPORTE_FIJO
}
```

## 3.2 Nuevos catálogos

```prisma
model SolucionCatalogo {
  id          Int      @id @default(autoincrement())
  codigo      String   @unique
  nombre      String
  descripcion String?
  activa      Boolean  @default(true)
  reglasJson  Json     // Fórmulas/cantidades por bloque y tipología
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  plantillas  SolucionPlantillaTexto[]
  anexos      SolucionAnexoTecnico[]

  @@map("soluciones_catalogo")
}

model ItemCatalogo {
  id            Int      @id @default(autoincrement())
  sku           String   @unique
  descripcion   String
  familia       String   // EQUIPOS | MATERIALES | MANO_OBRA | MANTENIMIENTO | OPCIONAL
  unidad        String   // VEHICULO | UD | JORNADA | HORA | LOTE
  precioBase    Float
  costeBase     Float    @default(0)
  activo        Boolean  @default(true)
  vigenciaDesde DateTime @default(now())
  vigenciaHasta DateTime?
  metadatos     Json?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@map("items_catalogo")
}

model PlantillaTexto {
  id        Int      @id @default(autoincrement())
  codigo    String   @unique
  nombre    String
  tipo      TipoPlantillaTexto
  version   Int      @default(1)
  contenido String   // placeholders {{cliente}}, {{numVehiculos}}, etc.
  activa    Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  soluciones SolucionPlantillaTexto[]

  @@map("plantillas_texto")
}

model SolucionPlantillaTexto {
  id             Int @id @default(autoincrement())
  solucionId     Int
  plantillaId    Int

  solucion  SolucionCatalogo @relation(fields: [solucionId], references: [id], onDelete: Cascade)
  plantilla PlantillaTexto   @relation(fields: [plantillaId], references: [id], onDelete: Cascade)

  @@unique([solucionId, plantillaId])
  @@map("solucion_plantillas_texto")
}

model SolucionAnexoTecnico {
  id          Int      @id @default(autoincrement())
  solucionId  Int
  titulo      String
  url         String
  orden       Int      @default(0)
  createdAt   DateTime @default(now())

  solucion SolucionCatalogo @relation(fields: [solucionId], references: [id], onDelete: Cascade)

  @@map("solucion_anexos_tecnicos")
}
```

## 3.3 Extensión de presupuesto

```prisma
model PresupuestoContexto {
  id                     Int      @id @default(autoincrement())
  presupuestoId          Int      @unique

  // Inputs mínimos
  clienteOperativoId     Int?
  solucionId             Int?
  numVehiculos           Int      @default(1)
  tipologiaVehiculo      String?
  fabricantesModelos     String?
  piloto                 Boolean  @default(false)

  // Condiciones
  horarioIntervencion    String?
  nocturnidad            Boolean  @default(false)
  integraciones          Boolean  @default(false)
  extrasJson             Json?

  // Alcance adicional
  objetivoProyecto       String?
  ubicacionesJson        Json?
  ventanaIntervencion    String?

  createdAt              DateTime @default(now())
  updatedAt              DateTime @updatedAt

  presupuesto Presupuesto @relation(fields: [presupuestoId], references: [id], onDelete: Cascade)
  solucion    SolucionCatalogo? @relation(fields: [solucionId], references: [id])

  @@map("presupuesto_contexto")
}

model PresupuestoLineaMotor {
  id                 Int             @id @default(autoincrement())
  presupuestoId      Int
  bloque             BloqueEconomico
  itemCatalogoId     Int?
  codigo             String          // SKU o código interno
  descripcion        String
  unidad             String
  cantidad           Float           @default(1)
  precioUnitario     Float           @default(0)
  subtotal           Float           @default(0)
  costeUnitario      Float           @default(0)
  costeSubtotal      Float           @default(0)
  origen             String?         // AUTO | MANUAL
  orden              Int             @default(0)

  presupuesto        Presupuesto     @relation(fields: [presupuestoId], references: [id], onDelete: Cascade)
  itemCatalogo       ItemCatalogo?   @relation(fields: [itemCatalogoId], references: [id])

  @@index([presupuestoId, bloque])
  @@map("presupuesto_lineas_motor")
}

model PresupuestoTexto {
  id              Int      @id @default(autoincrement())
  presupuestoId   Int
  tipo            TipoPlantillaTexto
  titulo          String
  contenido       String
  plantillaId     Int?
  versionPlantilla Int?
  orden           Int      @default(0)

  presupuesto Presupuesto  @relation(fields: [presupuestoId], references: [id], onDelete: Cascade)
  plantilla   PlantillaTexto? @relation(fields: [plantillaId], references: [id])

  @@index([presupuestoId, tipo])
  @@map("presupuesto_textos")
}

model PresupuestoSnapshot {
  id              Int      @id @default(autoincrement())
  presupuestoId   Int      @unique
  fechaEmision    DateTime @default(now())
  versionOferta   Int      @default(1)
  reglasJson      Json
  preciosJson     Json
  payloadOfertaJson Json
  hashContenido   String?

  presupuesto Presupuesto @relation(fields: [presupuestoId], references: [id], onDelete: Cascade)

  @@map("presupuesto_snapshots")
}
```

## 3.4 Campos a añadir en `Presupuesto`

```prisma
model Presupuesto {
  // ...actual
  codigoOferta           String?   @unique // OF-CLI-AAAA-###
  versionOferta          Int       @default(1)
  confidencial           Boolean   @default(false)
  textoConfidencialidad  String?
  clienteOperativoNombre String?

  // Totales fiscales
  baseImponible          Float     @default(0)
  ivaPorcentaje          Float     @default(21)
  ivaImporte             Float     @default(0)
  totalConIva            Float     @default(0)
  precioUnitarioVehiculo Float     @default(0)

  // Resumen por bloque
  totalBloqueA           Float     @default(0)
  totalBloqueB           Float     @default(0)
  totalBloqueC           Float     @default(0)
  totalBloqueD           Float     @default(0)
  totalBloqueE           Float     @default(0)

  // Relaciones nuevas
  contexto               PresupuestoContexto?
  lineasMotor            PresupuestoLineaMotor[]
  textos                 PresupuestoTexto[]
  snapshot               PresupuestoSnapshot?
}
```

---

## 4) Motor de cálculo

## 4.1 Inputs mínimos
1. Cliente + cochera/ubicación.
2. Nº de vehículos.
3. Tipología de vehículo.
4. Solución seleccionada.
5. Piloto sí/no.
6. Condiciones (horario/nocturno/integraciones/extras).

## 4.2 Flujo de cálculo
1. Cargar reglas de `SolucionCatalogo.reglasJson`.
2. Resolver cantidades por bloque (A-E):
   - por vehículo,
   - por lote,
   - por jornada,
   - por fase piloto.
3. Aplicar ajustes (`MULTIPLICADOR` o `IMPORTE_FIJO`).
4. Construir `PresupuestoLineaMotor`.
5. Calcular totales:
   - `baseImponible = sum(subtotal)`
   - `ivaImporte = baseImponible * ivaPorcentaje / 100`
   - `totalConIva = baseImponible + ivaImporte`
   - `precioUnitarioVehiculo = totalConIva / numVehiculos`
6. Derivar `% coste por bloque`.

## 4.3 Regla de oro de auditoría
Al emitir oferta/PDF:
- Guardar `PresupuestoSnapshot` con reglas y precios exactos usados.
- Incrementar `versionOferta` si se vuelve a emitir.
- No recalcular retrospectivamente snapshots antiguos.

---

## 5) Contratos API (v1)

Base sugerida: `/api/presupuestos` (sobre rutas actuales)

## 5.1 Crear presupuesto por motor
`POST /api/presupuestos/motor`

Body mínimo:

```json
{
  "proyectoId": 12,
  "clienteOperativoId": 33,
  "solucionId": 4,
  "numVehiculos": 47,
  "tipologiaVehiculo": "12m",
  "piloto": true,
  "condiciones": {
    "horarioIntervencion": "nocturno",
    "nocturnidad": true,
    "integraciones": false,
    "extras": {
      "cms": true
    }
  }
}
```

Respuesta:
- Presupuesto creado.
- Líneas A-E generadas.
- Totales fiscales listos.

## 5.2 Recalcular presupuesto
`POST /api/presupuestos/:id/recalcular`

Body opcional: overrides de contexto o líneas manuales.

## 5.3 Editar línea de bloque
`PATCH /api/presupuestos/:id/lineas/:lineaId`

Body:

```json
{
  "cantidad": 52,
  "precioUnitario": 137.5,
  "descripcion": "Cámara lateral reforzada"
}
```

Efecto:
- Marca `origen = "MANUAL"`.
- Recalcula totales bloque/globales.

## 5.4 Gestionar textos
- `POST /api/presupuestos/:id/textos/render` (render automático desde plantillas)
- `PATCH /api/presupuestos/:id/textos/:textoId` (ajuste manual)

## 5.5 Emitir oferta (snapshot + PDF)
`POST /api/presupuestos/:id/emitir`

Efecto:
- Congela snapshot.
- Incrementa versión si aplica.
- Devuelve URL/stream del PDF final.

---

## 6) Plantillas de texto (variables)
Placeholders estándar:

- `{{codigoOferta}}`
- `{{fecha}}`
- `{{clienteContratante}}`
- `{{clienteOperativo}}`
- `{{proyecto}}`
- `{{solucion}}`
- `{{numVehiculos}}`
- `{{garantia}}`
- `{{plazoSemanas}}`
- `{{valorDiferencial}}`
- `{{totalConIva}}`

Motor recomendado: render simple por reemplazo seguro + fallback vacío.

---

## 7) Roadmap de implementación (sin romper producción)

## Fase 1 (MVP económico)
- Migraciones Prisma: catálogos + contexto + líneas motor.
- Endpoint `POST /presupuestos/motor`.
- Cálculo bloques A/B/C + totales fiscales.
- UI: wizard mínimo (cabecera → contexto → oferta económica).

## Fase 2 (comercial completo)
- Bloques D/E.
- Textos renderizados + checklist supuestos/exclusiones.
- Condiciones comerciales parametrizadas.

## Fase 3 (industrialización)
- Snapshot + emisión PDF versionada.
- Anexos técnicos automáticos por solución.
- Trazabilidad completa y métricas de margen por bloque.

---

## 8) Compatibilidad con datos actuales
- Mantener rutas actuales de `presupuestos` para continuidad.
- Añadir rutas nuevas (`/motor`, `/recalcular`, `/emitir`) sin retirar las existentes.
- Durante transición, sincronizar totales legacy (`totalTrabajos`, `totalMateriales`, etc.) con los nuevos bloques.

---

## 9) Reglas de validación críticas
- `numVehiculos > 0`.
- No permitir emisión si faltan cliente, solución o líneas económicas.
- `ivaPorcentaje` configurable, por defecto 21.
- Si hay edición manual de línea, registrar usuario/fecha (auditoría).
- Si `estado = ENVIADO/ACEPTADO`, bloquear cambios salvo crear nueva versión.

---

## 10) Riesgos y mitigación
- Riesgo: sobrecarga de reglas en JSON difícil de mantener.
  - Mitigación: validar schema JSON con Zod antes de guardar.
- Riesgo: desfase entre precios vigentes y presupuestos antiguos.
  - Mitigación: snapshot de precios por emisión.
- Riesgo: mezcla de flujo legacy y flujo motor.
  - Mitigación: bandera `origenPresupuesto = LEGACY | MOTOR`.

---

## 11) Siguiente paso técnico recomendado
Implementar una **primera migración Prisma solo de estructura** (sin lógica), seguida de un seed mínimo:
- 2 soluciones (`Vision360`, `Afluencia`),
- 20 SKUs,
- 5 plantillas de texto,
y después construir `POST /presupuestos/motor` con cálculo A/B/C.