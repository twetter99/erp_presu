import prisma from '../config/database';

const ESTADOS_COMERCIALES_ACTIVOS = ['BORRADOR', 'ENVIADO', 'NEGOCIACION'] as const;

export async function expirarPresupuestosVencidos(): Promise<number> {
  const candidatos = await prisma.presupuesto.findMany({
    where: {
      estado: { in: [...ESTADOS_COMERCIALES_ACTIVOS] },
    },
    select: {
      id: true,
      fecha: true,
      validezDias: true,
    },
  });

  const ahora = Date.now();
  const idsExpirados = candidatos
    .filter((presupuesto) => {
      const fechaCaducidad = new Date(presupuesto.fecha);
      fechaCaducidad.setDate(fechaCaducidad.getDate() + presupuesto.validezDias);
      return fechaCaducidad.getTime() < ahora;
    })
    .map((presupuesto) => presupuesto.id);

  if (idsExpirados.length === 0) {
    return 0;
  }

  await prisma.presupuesto.updateMany({
    where: { id: { in: idsExpirados } },
    data: { estado: 'EXPIRADO' },
  });

  return idsExpirados.length;
}

export function startPresupuestoExpiryJob() {
  const intervalMinutes = Number(process.env.PRESUPUESTOS_EXPIRY_INTERVAL_MINUTES || 15);
  const intervalMs = Number.isFinite(intervalMinutes) && intervalMinutes > 0
    ? intervalMinutes * 60 * 1000
    : 15 * 60 * 1000;

  const run = async () => {
    try {
      const total = await expirarPresupuestosVencidos();
      if (total > 0) {
        console.log(`⏰ Presupuestos expirados automáticamente: ${total}`);
      }
    } catch (error) {
      console.error('Error en job de expiración de presupuestos', error);
    }
  };

  run();
  const timer = setInterval(run, intervalMs);
  return timer;
}
