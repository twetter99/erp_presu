const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Asegurar que existe el margen general en configuracion
  await prisma.configuracion.upsert({
    where: { clave: 'margen_general_materiales' },
    update: {},
    create: {
      clave: 'margen_general_materiales',
      valor: '30',
      descripcion: 'Margen general aplicado a todos los materiales (%)',
    },
  });

  // Cargar márgenes por categoría
  const margenesCat = await prisma.margenCategoria.findMany();
  const mapaCat = new Map(margenesCat.map((mc) => [mc.categoria, mc.margen]));
  const margenGeneral = 30;

  // Cargar todos los materiales activos
  const materiales = await prisma.material.findMany({
    where: { activo: true },
    select: { id: true, costeMedio: true, categoria: true, margenPersonalizado: true },
  });

  let count = 0;
  for (const mat of materiales) {
    let margen;
    if (mat.margenPersonalizado !== null) {
      margen = mat.margenPersonalizado;
    } else if (mat.categoria && mapaCat.has(mat.categoria)) {
      margen = mapaCat.get(mat.categoria);
    } else {
      margen = margenGeneral;
    }

    const precioVenta = Math.round(mat.costeMedio * (1 + margen / 100) * 10000) / 10000;
    await prisma.material.update({
      where: { id: mat.id },
      data: { precioVenta },
    });
    count++;
  }

  console.log(`${count} materiales actualizados con margen general ${margenGeneral}%`);
  await prisma.$disconnect();
}

main().catch(console.error);
