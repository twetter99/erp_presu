-- CreateTable
CREATE TABLE "producto_fichas_tecnicas" (
  "id" SERIAL NOT NULL,
  "itemCatalogoId" INTEGER NOT NULL,
  "codigo" TEXT NOT NULL,
  "titulo" TEXT NOT NULL,
  "descripcion" TEXT,
  "contenido" TEXT,
  "url" TEXT,
  "orden" INTEGER NOT NULL DEFAULT 0,
  "activa" BOOLEAN NOT NULL DEFAULT true,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "producto_fichas_tecnicas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "producto_fichas_tecnicas_itemCatalogoId_codigo_key" ON "producto_fichas_tecnicas"("itemCatalogoId", "codigo");

-- AddForeignKey
ALTER TABLE "producto_fichas_tecnicas"
ADD CONSTRAINT "producto_fichas_tecnicas_itemCatalogoId_fkey" FOREIGN KEY ("itemCatalogoId") REFERENCES "items_catalogo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
