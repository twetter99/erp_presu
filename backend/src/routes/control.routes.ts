import { Router, Request, Response } from 'express';
import prisma from '../config/database';
import { authMiddleware } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

// ============================================================================
// DASHBOARD GENERAL
// ============================================================================

router.get('/dashboard', async (_req: Request, res: Response) => {
  try {
    const [
      totalProyectos,
      proyectosActivos,
      presupuestosPendientes,
      presupuestosAceptados,
      ordenesActivas,
      comprasPendientes,
    ] = await Promise.all([
      prisma.proyecto.count(),
      prisma.proyecto.count({ where: { estado: { in: ['REPLANTEO', 'PRESUPUESTO', 'ACEPTADO', 'EN_EJECUCION'] } } }),
      prisma.presupuesto.count({ where: { estado: { in: ['BORRADOR', 'ENVIADO', 'NEGOCIACION'] } } }),
      prisma.presupuesto.count({ where: { estado: 'ACEPTADO' } }),
      prisma.ordenTrabajo.count({ where: { estado: { in: ['PLANIFICADA', 'EN_CURSO'] } } }),
      prisma.solicitudCompra.count({ where: { estado: { in: ['PENDIENTE', 'PEDIDO'] } } }),
    ]);

    // Totales financieros de presupuestos aceptados
    const financiero = await prisma.presupuesto.aggregate({
      where: { estado: 'ACEPTADO' },
      _sum: {
        totalCliente: true,
        costeTotal: true,
        margenBruto: true,
      },
      _avg: {
        margenPorcentaje: true,
      },
    });

    res.json({
      proyectos: { total: totalProyectos, activos: proyectosActivos },
      presupuestos: { pendientes: presupuestosPendientes, aceptados: presupuestosAceptados },
      ordenesTrabajo: { activas: ordenesActivas },
      compras: { pendientes: comprasPendientes },
      financiero: {
        facturacionTotal: financiero._sum.totalCliente || 0,
        costeTotal: financiero._sum.costeTotal || 0,
        margenBrutoTotal: financiero._sum.margenBruto || 0,
        margenMedioPorcentaje: Math.round((financiero._avg.margenPorcentaje || 0) * 100) / 100,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener dashboard' });
  }
});

// ============================================================================
// CONTROL ECONÓMICO POR PROYECTO
// ============================================================================

router.get('/proyecto/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    const proyecto = await prisma.proyecto.findUnique({
      where: { id },
      include: {
        cliente: { select: { nombre: true } },
        presupuestos: {
          where: { estado: 'ACEPTADO' },
          include: {
            lineasTrabajo: true,
            lineasMaterial: true,
            lineasDesplazamiento: true,
          },
        },
        ordenesTrabajo: {
          include: {
            tecnicos: true,
            lineas: true,
            materiales: { include: { material: true } },
          },
        },
        compras: {
          include: { lineas: true },
        },
      },
    });

    if (!proyecto) { res.status(404).json({ error: 'Proyecto no encontrado' }); return; }

    // Estimado (del presupuesto aceptado)
    const presupuestoAceptado = proyecto.presupuestos[0];
    const estimado = {
      ingresoCliente: presupuestoAceptado?.totalCliente || 0,
      costeTrabajos: presupuestoAceptado?.costeTrabajos || 0,
      costeMateriales: presupuestoAceptado?.costeMateriales || 0,
      costeDesplazamientos: presupuestoAceptado?.costeDesplazamientos || 0,
      costeTotal: presupuestoAceptado?.costeTotal || 0,
      margenBruto: presupuestoAceptado?.margenBruto || 0,
      margenPorcentaje: presupuestoAceptado?.margenPorcentaje || 0,
    };

    // Real (de compras y órdenes de trabajo)
    const costeRealMateriales = proyecto.compras.reduce((s, c) =>
      s + c.lineas.reduce((s2, l) => s2 + (l.costeReal || l.costeEstimado), 0), 0);

    const horasEstimadas = proyecto.ordenesTrabajo.reduce((s, ot) =>
      s + ot.tecnicos.reduce((s2, t) => s2 + t.horasEstimadas, 0), 0);

    const horasReales = proyecto.ordenesTrabajo.reduce((s, ot) =>
      s + ot.tecnicos.reduce((s2, t) => s2 + (t.horasReales || 0), 0), 0);

    // Asumimos coste/hora medio para el cálculo
    const costeHora = estimado.costeTrabajos > 0 && horasEstimadas > 0
      ? estimado.costeTrabajos / horasEstimadas
      : 35; // default

    const costeRealTrabajos = horasReales * costeHora;
    const costeRealTotal = costeRealMateriales + costeRealTrabajos;
    const margenReal = estimado.ingresoCliente - costeRealTotal;
    const margenRealPorcentaje = estimado.ingresoCliente > 0
      ? (margenReal / estimado.ingresoCliente) * 100
      : 0;

    const real = {
      costeTrabajos: costeRealTrabajos,
      costeMateriales: costeRealMateriales,
      costeTotal: costeRealTotal,
      margenBruto: margenReal,
      margenPorcentaje: Math.round(margenRealPorcentaje * 100) / 100,
    };

    const desviaciones = {
      horas: {
        estimadas: horasEstimadas,
        reales: horasReales,
        desviacion: horasReales - horasEstimadas,
        desviacionPorcentaje: horasEstimadas > 0 ? ((horasReales - horasEstimadas) / horasEstimadas) * 100 : 0,
      },
      materiales: {
        costeEstimado: estimado.costeMateriales,
        costeReal: costeRealMateriales,
        desviacion: costeRealMateriales - estimado.costeMateriales,
        desviacionPorcentaje: estimado.costeMateriales > 0
          ? ((costeRealMateriales - estimado.costeMateriales) / estimado.costeMateriales) * 100
          : 0,
      },
      margen: {
        estimado: estimado.margenBruto,
        real: margenReal,
        desviacion: margenReal - estimado.margenBruto,
      },
    };

    res.json({
      proyecto: { id: proyecto.id, codigo: proyecto.codigo, nombre: proyecto.nombre, cliente: proyecto.cliente.nombre },
      estimado,
      real,
      desviaciones,
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener control económico' });
  }
});

// ============================================================================
// RENTABILIDAD POR CLIENTE
// ============================================================================

router.get('/rentabilidad/clientes', async (_req: Request, res: Response) => {
  try {
    const empresas = await prisma.empresa.findMany({
      where: { activa: true },
      include: {
        proyectos: {
          include: {
            presupuestos: {
              where: { estado: 'ACEPTADO' },
              select: { totalCliente: true, costeTotal: true, margenBruto: true, margenPorcentaje: true },
            },
          },
        },
      },
    });

    const rentabilidad = empresas
      .map((e) => {
        const presupuestos = e.proyectos.flatMap((p) => p.presupuestos);
        const totalFacturado = presupuestos.reduce((s, p) => s + p.totalCliente, 0);
        const totalCoste = presupuestos.reduce((s, p) => s + p.costeTotal, 0);
        const margenBruto = totalFacturado - totalCoste;
        return {
          id: e.id,
          nombre: e.nombre,
          numProyectos: e.proyectos.length,
          totalFacturado,
          totalCoste,
          margenBruto,
          margenPorcentaje: totalFacturado > 0 ? Math.round((margenBruto / totalFacturado) * 10000) / 100 : 0,
        };
      })
      .filter((e) => e.numProyectos > 0)
      .sort((a, b) => b.totalFacturado - a.totalFacturado);

    res.json(rentabilidad);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener rentabilidad por clientes' });
  }
});

// ============================================================================
// RENTABILIDAD POR TIPO DE BUS
// ============================================================================

router.get('/rentabilidad/autobuses', async (_req: Request, res: Response) => {
  try {
    const replanteos = await prisma.replanteo.findMany({
      include: {
        tipoAutobus: true,
        presupuestos: {
          where: { estado: 'ACEPTADO' },
          select: { totalCliente: true, costeTotal: true, margenBruto: true },
        },
      },
    });

    const porTipo = new Map<number, { marca: string; modelo: string; facturado: number; coste: number; proyectos: number }>();
    for (const r of replanteos) {
      const key = r.tipoAutobusId;
      if (!porTipo.has(key)) {
        porTipo.set(key, { marca: r.tipoAutobus.marca, modelo: r.tipoAutobus.modelo, facturado: 0, coste: 0, proyectos: 0 });
      }
      const entry = porTipo.get(key)!;
      entry.proyectos++;
      for (const p of r.presupuestos) {
        entry.facturado += p.totalCliente;
        entry.coste += p.costeTotal;
      }
    }

    const result = Array.from(porTipo.values()).map((e) => ({
      ...e,
      margenBruto: e.facturado - e.coste,
      margenPorcentaje: e.facturado > 0 ? Math.round(((e.facturado - e.coste) / e.facturado) * 10000) / 100 : 0,
    })).sort((a, b) => b.facturado - a.facturado);

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener rentabilidad por tipo de bus' });
  }
});

// ============================================================================
// RENTABILIDAD POR TÉCNICO
// ============================================================================

router.get('/rentabilidad/tecnicos', async (_req: Request, res: Response) => {
  try {
    const tecnicos = await prisma.usuario.findMany({
      where: { perfil: 'TECNICO_INSTALADOR', activo: true },
      include: {
        ordenesTrabajoAsignadas: {
          include: {
            ordenTrabajo: {
              include: {
                proyecto: {
                  include: {
                    presupuestos: {
                      where: { estado: 'ACEPTADO' },
                      select: { totalCliente: true, costeTotal: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const result = tecnicos.map((t) => {
      const horasEstimadas = t.ordenesTrabajoAsignadas.reduce((s, a) => s + a.horasEstimadas, 0);
      const horasReales = t.ordenesTrabajoAsignadas.reduce((s, a) => s + (a.horasReales || 0), 0);
      const ordenesCompletadas = t.ordenesTrabajoAsignadas.filter((a) => a.ordenTrabajo.estado === 'COMPLETADA').length;

      return {
        id: t.id,
        nombre: `${t.nombre} ${t.apellidos}`,
        ordenesAsignadas: t.ordenesTrabajoAsignadas.length,
        ordenesCompletadas,
        horasEstimadas,
        horasReales,
        eficiencia: horasEstimadas > 0 ? Math.round((horasEstimadas / (horasReales || horasEstimadas)) * 10000) / 100 : 0,
      };
    }).sort((a, b) => b.eficiencia - a.eficiencia);

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener rentabilidad por técnico' });
  }
});

// ============================================================================
// RENTABILIDAD POR COCHERA
// ============================================================================

router.get('/rentabilidad/cocheras', async (_req: Request, res: Response) => {
  try {
    const cocheras = await prisma.cochera.findMany({
      where: { activa: true },
      include: {
        empresa: { select: { nombre: true } },
        ordenesTrabajo: {
          include: {
            proyecto: {
              include: {
                presupuestos: {
                  where: { estado: 'ACEPTADO' },
                  select: { totalCliente: true, costeTotal: true, margenBruto: true },
                },
              },
            },
          },
        },
      },
    });

    const result = cocheras.map((c) => {
      const presupuestos = c.ordenesTrabajo.flatMap((ot) => ot.proyecto.presupuestos);
      const totalFacturado = presupuestos.reduce((s, p) => s + p.totalCliente, 0);
      const totalCoste = presupuestos.reduce((s, p) => s + p.costeTotal, 0);
      const margenBruto = totalFacturado - totalCoste;

      return {
        id: c.id,
        nombre: c.nombre,
        empresa: c.empresa.nombre,
        numOrdenes: c.ordenesTrabajo.length,
        totalFacturado,
        totalCoste,
        margenBruto,
        margenPorcentaje: totalFacturado > 0 ? Math.round((margenBruto / totalFacturado) * 10000) / 100 : 0,
      };
    })
      .filter((c) => c.numOrdenes > 0)
      .sort((a, b) => b.totalFacturado - a.totalFacturado);

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener rentabilidad por cochera' });
  }
});

export default router;
