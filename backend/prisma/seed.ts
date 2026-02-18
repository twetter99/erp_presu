import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ====== USUARIOS ======
  // Las contraseñas se gestionan en Firebase Auth.
  // El seed crea los usuarios en BD. Para vincularlos con Firebase, usar POST /api/auth/setup.

  const admin = await prisma.usuario.upsert({
    where: { email: 'admin@erppresu.com' },
    update: {},
    create: {
      nombre: 'Admin',
      apellidos: 'Sistema',
      email: 'admin@erppresu.com',
      perfil: 'ADMINISTRADOR',
    },
  });

  const comercial = await prisma.usuario.upsert({
    where: { email: 'carlos.garcia@erppresu.com' },
    update: {},
    create: {
      nombre: 'Carlos',
      apellidos: 'García López',
      email: 'carlos.garcia@erppresu.com',
      perfil: 'COMERCIAL',
      telefono: '611222333',
    },
  });

  const tecnico1 = await prisma.usuario.upsert({
    where: { email: 'miguel.fernandez@erppresu.com' },
    update: {},
    create: {
      nombre: 'Miguel',
      apellidos: 'Fernández Ruiz',
      email: 'miguel.fernandez@erppresu.com',
      perfil: 'TECNICO_INSTALADOR',
      telefono: '622333444',
    },
  });

  const tecnico2 = await prisma.usuario.upsert({
    where: { email: 'laura.martinez@erppresu.com' },
    update: {},
    create: {
      nombre: 'Laura',
      apellidos: 'Martínez Sanz',
      email: 'laura.martinez@erppresu.com',
      perfil: 'TECNICO_INSTALADOR',
      telefono: '633444555',
    },
  });

  const oficinaTecnica = await prisma.usuario.upsert({
    where: { email: 'ana.lopez@erppresu.com' },
    update: {},
    create: {
      nombre: 'Ana',
      apellidos: 'López Díaz',
      email: 'ana.lopez@erppresu.com',
      perfil: 'OFICINA_TECNICA',
      telefono: '644555666',
    },
  });

  const compras = await prisma.usuario.upsert({
    where: { email: 'pedro.sanchez@erppresu.com' },
    update: {},
    create: {
      nombre: 'Pedro',
      apellidos: 'Sánchez Moreno',
      email: 'pedro.sanchez@erppresu.com',
      perfil: 'COMPRAS',
      telefono: '655666777',
    },
  });

  console.log('  ✅ Usuarios creados');

  // ====== EMPRESAS ======
  const empresa1 = await prisma.empresa.upsert({
    where: { cif: 'A12345678' },
    update: {},
    create: {
      nombre: 'Transportes Metropolitanos de Madrid',
      cif: 'A12345678',
      direccion: 'Calle Gran Vía, 28',
      ciudad: 'Madrid',
      provincia: 'Madrid',
      cp: '28013',
      telefono: '915551234',
      email: 'contacto@tmm.es',
    },
  });

  const empresa2 = await prisma.empresa.upsert({
    where: { cif: 'B87654321' },
    update: {},
    create: {
      nombre: 'Autobuses Urbanos de Barcelona',
      cif: 'B87654321',
      direccion: 'Av. Diagonal, 500',
      ciudad: 'Barcelona',
      provincia: 'Barcelona',
      cp: '08006',
      telefono: '932221234',
      email: 'info@aub.cat',
    },
  });

  const empresa3 = await prisma.empresa.upsert({
    where: { cif: 'C11223344' },
    update: {},
    create: {
      nombre: 'TUSSAM - Sevilla',
      cif: 'C11223344',
      direccion: 'C/ José Luis de Casso, 1',
      ciudad: 'Sevilla',
      provincia: 'Sevilla',
      cp: '41004',
      telefono: '955471111',
      email: 'info@tussam.es',
    },
  });

  // Contactos
  await prisma.contactoEmpresa.createMany({
    data: [
      { empresaId: empresa1.id, nombre: 'Juan Pérez', cargo: 'Director Técnico', telefono: '611001001', email: 'jperez@tmm.es', principal: true },
      { empresaId: empresa1.id, nombre: 'María Gómez', cargo: 'Jefa de Mantenimiento', telefono: '611001002', email: 'mgomez@tmm.es' },
      { empresaId: empresa2.id, nombre: 'Pere Puig', cargo: 'Responsable Flota', telefono: '622002001', email: 'ppuig@aub.cat', principal: true },
    ],
    skipDuplicates: true,
  });

  console.log('  ✅ Empresas y contactos creados');

  // ====== COCHERAS ======
  const cochera1 = await prisma.cochera.create({
    data: {
      nombre: 'Cochera Carabanchel',
      direccion: 'Calle Industria, 45',
      ciudad: 'Madrid',
      provincia: 'Madrid',
      cp: '28047',
      responsable: 'Antonio López',
      telefonoResponsable: '611003001',
      horarioAcceso: 'L-V: 06:00 - 22:00, S: 07:00 - 14:00',
      observacionesTecnicas: 'Acceso por puerta trasera. Grúa disponible hasta 3T.',
      empresaId: empresa1.id,
    },
  });

  const cochera2 = await prisma.cochera.create({
    data: {
      nombre: 'Cochera Zona Franca',
      direccion: 'Passeig de la Zona Franca, 200',
      ciudad: 'Barcelona',
      provincia: 'Barcelona',
      cp: '08038',
      responsable: 'Jordi Font',
      telefonoResponsable: '622004001',
      horarioAcceso: 'L-S: 05:00 - 23:00',
      observacionesTecnicas: 'Nave amplia. Toma de corriente trifásica en zona 3.',
      empresaId: empresa2.id,
    },
  });

  console.log('  ✅ Cocheras creadas');

  // ====== TIPOS DE AUTOBÚS ======
  const bus1 = await prisma.tipoAutobus.upsert({
    where: { marca_modelo: { marca: 'Mercedes-Benz', modelo: 'Citaro C2' } },
    update: {},
    create: {
      marca: 'Mercedes-Benz',
      modelo: 'Citaro C2',
      longitud: 12.135,
      tipoCombustible: 'DIESEL',
      numPlazas: 100,
    },
  });

  const bus2 = await prisma.tipoAutobus.upsert({
    where: { marca_modelo: { marca: 'MAN', modelo: 'Lion\'s City 12E' } },
    update: {},
    create: {
      marca: 'MAN',
      modelo: 'Lion\'s City 12E',
      longitud: 12.0,
      tipoCombustible: 'ELECTRICO',
      numPlazas: 88,
      configuracionEspecial: 'Batería bajo suelo. Cuidado zona posterior.',
    },
  });

  const bus3 = await prisma.tipoAutobus.upsert({
    where: { marca_modelo: { marca: 'Solaris', modelo: 'Urbino 18 Hybrid' } },
    update: {},
    create: {
      marca: 'Solaris',
      modelo: 'Urbino 18 Hybrid',
      longitud: 18.0,
      tipoCombustible: 'HIBRIDO',
      numPlazas: 150,
      configuracionEspecial: 'Articulado. Doble zona de trabajo.',
    },
  });

  console.log('  ✅ Tipos de autobús creados');

  // ====== CATÁLOGO DE TRABAJOS ======
  const trabajos = await Promise.all([
    prisma.trabajo.upsert({
      where: { codigo: 'INST-CAM' },
      update: {},
      create: {
        codigo: 'INST-CAM',
        nombreComercial: 'Instalación de cámaras de videovigilancia',
        descripcionTecnica: 'Instalación completa de sistema de CCTV: cámaras IP domo, cableado CAT6, NVR y configuración',
        unidad: 'POR_BUS',
        tiempoEstandarHoras: 6,
        numTecnicosRequeridos: 2,
        precioVentaEstandar: 1800,
        costeInternoEstandar: 950,
        categoria: 'Videovigilancia',
      },
    }),
    prisma.trabajo.upsert({
      where: { codigo: 'INST-SAE' },
      update: {},
      create: {
        codigo: 'INST-SAE',
        nombreComercial: 'Instalación SAE (Sistema de Ayuda a la Explotación)',
        descripcionTecnica: 'Instalación de equipo SAE completo: antena GPS, modem 4G, display conductor, consola SAE',
        unidad: 'POR_BUS',
        tiempoEstandarHoras: 8,
        numTecnicosRequeridos: 2,
        precioVentaEstandar: 2500,
        costeInternoEstandar: 1300,
        categoria: 'SAE',
      },
    }),
    prisma.trabajo.upsert({
      where: { codigo: 'INST-WIFI' },
      update: {},
      create: {
        codigo: 'INST-WIFI',
        nombreComercial: 'Instalación WiFi pasajeros',
        descripcionTecnica: 'Router 4G/5G para pasajeros, antenas MIMO, configuración portal cautivo',
        unidad: 'POR_BUS',
        tiempoEstandarHoras: 3,
        numTecnicosRequeridos: 1,
        precioVentaEstandar: 850,
        costeInternoEstandar: 420,
        categoria: 'Conectividad',
      },
    }),
    prisma.trabajo.upsert({
      where: { codigo: 'INST-CONT' },
      update: {},
      create: {
        codigo: 'INST-CONT',
        nombreComercial: 'Instalación contador de pasajeros',
        descripcionTecnica: 'Sensores de conteo en puertas, unidad central, calibración',
        unidad: 'POR_BUS',
        tiempoEstandarHoras: 4,
        numTecnicosRequeridos: 2,
        precioVentaEstandar: 1200,
        costeInternoEstandar: 650,
        categoria: 'Pasajeros',
      },
    }),
    prisma.trabajo.upsert({
      where: { codigo: 'INST-PANT' },
      update: {},
      create: {
        codigo: 'INST-PANT',
        nombreComercial: 'Instalación pantallas información pasajeros',
        descripcionTecnica: 'Pantallas TFT interiores para próxima parada, publicidad dinámica',
        unidad: 'POR_BUS',
        tiempoEstandarHoras: 5,
        numTecnicosRequeridos: 2,
        precioVentaEstandar: 1500,
        costeInternoEstandar: 800,
        categoria: 'Información',
      },
    }),
    prisma.trabajo.upsert({
      where: { codigo: 'REV-MANT' },
      update: {},
      create: {
        codigo: 'REV-MANT',
        nombreComercial: 'Revisión y mantenimiento preventivo',
        descripcionTecnica: 'Revisión completa de equipos instalados, firmware updates, limpieza',
        unidad: 'POR_VISITA',
        tiempoEstandarHoras: 2,
        numTecnicosRequeridos: 1,
        precioVentaEstandar: 350,
        costeInternoEstandar: 180,
        categoria: 'Mantenimiento',
      },
    }),
    prisma.trabajo.upsert({
      where: { codigo: 'DESPL-PROV' },
      update: {},
      create: {
        codigo: 'DESPL-PROV',
        nombreComercial: 'Desplazamiento a provincia',
        descripcionTecnica: 'Desplazamiento equipo técnico a cochera fuera de comunidad',
        unidad: 'POR_VISITA',
        tiempoEstandarHoras: 0,
        numTecnicosRequeridos: 0,
        precioVentaEstandar: 450,
        costeInternoEstandar: 280,
        categoria: 'Desplazamiento',
      },
    }),
  ]);

  // Checklist items para cámaras
  await prisma.checklistItem.createMany({
    data: [
      { trabajoId: trabajos[0].id, descripcion: 'Verificar alimentación 12V/24V', orden: 1, obligatorio: true },
      { trabajoId: trabajos[0].id, descripcion: 'Instalar soporte de cámaras', orden: 2, obligatorio: true },
      { trabajoId: trabajos[0].id, descripcion: 'Tender cableado CAT6', orden: 3, obligatorio: true },
      { trabajoId: trabajos[0].id, descripcion: 'Conectar y configurar NVR', orden: 4, obligatorio: true },
      { trabajoId: trabajos[0].id, descripcion: 'Test de grabación 24h', orden: 5, obligatorio: true },
      { trabajoId: trabajos[0].id, descripcion: 'Sellar pasos de cable', orden: 6, obligatorio: true },
    ],
    skipDuplicates: true,
  });

  // Checklist SAE
  await prisma.checklistItem.createMany({
    data: [
      { trabajoId: trabajos[1].id, descripcion: 'Instalar antena GPS en techo', orden: 1, obligatorio: true },
      { trabajoId: trabajos[1].id, descripcion: 'Conectar modem 4G', orden: 2, obligatorio: true },
      { trabajoId: trabajos[1].id, descripcion: 'Instalar display conductor', orden: 3, obligatorio: true },
      { trabajoId: trabajos[1].id, descripcion: 'Configurar consola SAE', orden: 4, obligatorio: true },
      { trabajoId: trabajos[1].id, descripcion: 'Test de comunicación con central', orden: 5, obligatorio: true },
    ],
    skipDuplicates: true,
  });

  console.log('  ✅ Catálogo de trabajos y checklists creados');

  // ====== CATÁLOGO DE MATERIALES ======
  const materiales = await Promise.all([
    prisma.material.upsert({
      where: { sku: 'CAM-DOMO-IP' },
      update: {},
      create: {
        sku: 'CAM-DOMO-IP',
        descripcion: 'Cámara domo IP 2MP antivandálica',
        categoria: 'Videovigilancia',
        unidad: 'UNIDAD',
        proveedorHabitual: 'Hikvision España',
        costeMedio: 85,
        precioEstandar: 145,
      },
    }),
    prisma.material.upsert({
      where: { sku: 'NVR-8CH' },
      update: {},
      create: {
        sku: 'NVR-8CH',
        descripcion: 'NVR 8 canales embarcado con SSD 1TB',
        categoria: 'Videovigilancia',
        unidad: 'UNIDAD',
        proveedorHabitual: 'Hikvision España',
        costeMedio: 320,
        precioEstandar: 520,
      },
    }),
    prisma.material.upsert({
      where: { sku: 'CABLE-CAT6-M' },
      update: {},
      create: {
        sku: 'CABLE-CAT6-M',
        descripcion: 'Cable CAT6 apantallado por metro',
        categoria: 'Cableado',
        unidad: 'METRO',
        proveedorHabitual: 'Redes y Cables S.L.',
        costeMedio: 0.85,
        precioEstandar: 1.50,
      },
    }),
    prisma.material.upsert({
      where: { sku: 'GPS-ANT-4G' },
      update: {},
      create: {
        sku: 'GPS-ANT-4G',
        descripcion: 'Antena combinada GPS/4G para techo',
        categoria: 'SAE',
        unidad: 'UNIDAD',
        proveedorHabitual: 'Teltonika',
        costeMedio: 65,
        precioEstandar: 110,
      },
    }),
    prisma.material.upsert({
      where: { sku: 'MODEM-4G-IND' },
      update: {},
      create: {
        sku: 'MODEM-4G-IND',
        descripcion: 'Modem 4G industrial router embarcado',
        categoria: 'Conectividad',
        unidad: 'UNIDAD',
        proveedorHabitual: 'Teltonika',
        costeMedio: 180,
        precioEstandar: 295,
      },
    }),
    prisma.material.upsert({
      where: { sku: 'PANT-TFT-10' },
      update: {},
      create: {
        sku: 'PANT-TFT-10',
        descripcion: 'Pantalla TFT 10" para info pasajeros',
        categoria: 'Información',
        unidad: 'UNIDAD',
        proveedorHabitual: 'Display Solutions',
        costeMedio: 150,
        precioEstandar: 260,
      },
    }),
    prisma.material.upsert({
      where: { sku: 'SENSOR-CONT-IR' },
      update: {},
      create: {
        sku: 'SENSOR-CONT-IR',
        descripcion: 'Sensor infrarrojo conteo pasajeros',
        categoria: 'Pasajeros',
        unidad: 'UNIDAD',
        proveedorHabitual: 'IRMA Solutions',
        costeMedio: 220,
        precioEstandar: 380,
      },
    }),
    prisma.material.upsert({
      where: { sku: 'CANALETA-30' },
      update: {},
      create: {
        sku: 'CANALETA-30',
        descripcion: 'Canaleta adhesiva 30x15mm por metro',
        categoria: 'Cableado',
        unidad: 'METRO',
        proveedorHabitual: 'Canaletas S.A.',
        costeMedio: 1.20,
        precioEstandar: 2.50,
      },
    }),
    prisma.material.upsert({
      where: { sku: 'CONEX-RJ45' },
      update: {},
      create: {
        sku: 'CONEX-RJ45',
        descripcion: 'Conector RJ45 blindado Cat6',
        categoria: 'Cableado',
        unidad: 'UNIDAD',
        proveedorHabitual: 'Redes y Cables S.L.',
        costeMedio: 0.45,
        precioEstandar: 0.90,
      },
    }),
    prisma.material.upsert({
      where: { sku: 'SELLADOR-POLI' },
      update: {},
      create: {
        sku: 'SELLADOR-POLI',
        descripcion: 'Sellador poliuretano para techo bus',
        categoria: 'Consumibles',
        unidad: 'UNIDAD',
        proveedorHabitual: 'Sika España',
        costeMedio: 8.50,
        precioEstandar: 15,
      },
    }),
  ]);

  console.log('  ✅ Catálogo de materiales creado');

  // ====== PLANTILLAS POR TIPO BUS ======
  // Plantilla para Mercedes Citaro: cámaras + SAE
  await prisma.plantillaTrabajo.createMany({
    data: [
      { tipoAutobusId: bus1.id, trabajoId: trabajos[0].id, cantidad: 1 }, // Cámaras
      { tipoAutobusId: bus1.id, trabajoId: trabajos[1].id, cantidad: 1 }, // SAE
      { tipoAutobusId: bus1.id, trabajoId: trabajos[2].id, cantidad: 1 }, // WiFi
    ],
    skipDuplicates: true,
  });

  await prisma.plantillaMaterial.createMany({
    data: [
      { tipoAutobusId: bus1.id, materialId: materiales[0].id, cantidad: 6 },  // 6 cámaras
      { tipoAutobusId: bus1.id, materialId: materiales[1].id, cantidad: 1 },  // 1 NVR
      { tipoAutobusId: bus1.id, materialId: materiales[2].id, cantidad: 30 }, // 30m cable
      { tipoAutobusId: bus1.id, materialId: materiales[3].id, cantidad: 1 },  // 1 antena GPS
      { tipoAutobusId: bus1.id, materialId: materiales[4].id, cantidad: 1 },  // 1 modem
      { tipoAutobusId: bus1.id, materialId: materiales[7].id, cantidad: 15 }, // 15m canaleta
      { tipoAutobusId: bus1.id, materialId: materiales[8].id, cantidad: 12 }, // 12 conectores
      { tipoAutobusId: bus1.id, materialId: materiales[9].id, cantidad: 2 },  // 2 selladores
    ],
    skipDuplicates: true,
  });

  console.log('  ✅ Plantillas por tipo de bus creadas');

  // ====== PROYECTO DE EJEMPLO ======
  const proyecto = await prisma.proyecto.create({
    data: {
      codigo: 'PRY-2026-0001',
      nombre: 'Videovigilancia + SAE flota Carabanchel',
      descripcion: 'Instalación de sistema CCTV y SAE en 25 buses Mercedes Citaro de la cochera de Carabanchel',
      clienteId: empresa1.id,
      comercialId: comercial.id,
      estado: 'REPLANTEO',
    },
  });

  // Roles empresa en proyecto
  await prisma.empresaProyecto.createMany({
    data: [
      { proyectoId: proyecto.id, empresaId: empresa1.id, rol: 'CONTRATANTE' },
      { proyectoId: proyecto.id, empresaId: empresa1.id, rol: 'PROPIETARIO_FLOTA' },
    ],
    skipDuplicates: true,
  });

  // Replanteo
  const replanteo = await prisma.replanteo.create({
    data: {
      proyectoId: proyecto.id,
      cocheraId: cochera1.id,
      tipoAutobusId: bus1.id,
      numBuses: 25,
      tecnicoResponsableId: tecnico1.id,
      estado: 'VALIDADO',
      canalizacionesExistentes: 'Canalización parcial en techo, hay que completar zona trasera',
      espaciosDisponibles: 'Espacio bajo asiento conductor para NVR. Hueco en techo para antenas.',
      tipoInstalacionPrevia: 'Sin instalación previa',
      senalesDisponibles: 'Alimentación 24V disponible en cuadro eléctrico',
      necesidadSelladoTecho: true,
      complejidadEspecial: 'Algunos buses tienen techo reforzado - necesaria broca especial',
      observaciones: 'Cliente requiere grabación mínima 72h por bus. SAE compatible con su central existente.',
    },
  });

  // Trabajos del replanteo (cargados de plantilla)
  await prisma.replanteoTrabajo.createMany({
    data: [
      { replanteoId: replanteo.id, trabajoId: trabajos[0].id, cantidad: 1 },
      { replanteoId: replanteo.id, trabajoId: trabajos[1].id, cantidad: 1 },
      { replanteoId: replanteo.id, trabajoId: trabajos[2].id, cantidad: 1 },
    ],
  });

  // Materiales del replanteo (multiplicados x 25 buses)
  await prisma.replanteoMaterial.createMany({
    data: [
      { replanteoId: replanteo.id, materialId: materiales[0].id, cantidadEstimada: 150 }, // 6 * 25
      { replanteoId: replanteo.id, materialId: materiales[1].id, cantidadEstimada: 25 },  // 1 * 25
      { replanteoId: replanteo.id, materialId: materiales[2].id, cantidadEstimada: 750 }, // 30 * 25
      { replanteoId: replanteo.id, materialId: materiales[3].id, cantidadEstimada: 25 },
      { replanteoId: replanteo.id, materialId: materiales[4].id, cantidadEstimada: 25 },
      { replanteoId: replanteo.id, materialId: materiales[7].id, cantidadEstimada: 375 },
      { replanteoId: replanteo.id, materialId: materiales[8].id, cantidadEstimada: 300 },
      { replanteoId: replanteo.id, materialId: materiales[9].id, cantidadEstimada: 50 },
    ],
  });

  console.log('  ✅ Proyecto de ejemplo con replanteo creado');
  console.log('');
  console.log('🎉 Seed completado!');
  console.log('');
  console.log('Siguiente paso: vincular usuarios con Firebase Auth');
  console.log('  POST /api/auth/setup  { "email": "admin@erppresu.com", "password": "admin123" }');
  console.log('');
  console.log('Usuarios creados en BD (sin firebaseUid aún):');
  console.log('  admin@erppresu.com (ADMINISTRADOR)');
  console.log('  carlos.garcia@erppresu.com (COMERCIAL)');
  console.log('  miguel.fernandez@erppresu.com (TECNICO_INSTALADOR)');
  console.log('  laura.martinez@erppresu.com (TECNICO_INSTALADOR)');
  console.log('  ana.lopez@erppresu.com (OFICINA_TECNICA)');
  console.log('  pedro.sanchez@erppresu.com (COMPRAS)');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
