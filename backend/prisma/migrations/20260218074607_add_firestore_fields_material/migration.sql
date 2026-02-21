/*
  Warnings:

  - A unique constraint covering the columns `[firestoreId]` on the table `materiales` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "materiales" ADD COLUMN     "codigoProveedor" TEXT,
ADD COLUMN     "firestoreId" TEXT,
ADD COLUMN     "origenExterno" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "materiales_firestoreId_key" ON "materiales"("firestoreId");
