type BadgeVariant = 'blue' | 'green' | 'yellow' | 'red' | 'gray' | 'purple' | 'indigo';

const colors: Record<BadgeVariant, string> = {
  blue: 'bg-blue-50 text-blue-700 border-blue-200/60',
  green: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
  yellow: 'bg-amber-50 text-amber-700 border-amber-200/60',
  red: 'bg-red-50 text-red-700 border-red-200/60',
  gray: 'bg-slate-100 text-slate-600 border-slate-200/60',
  purple: 'bg-purple-50 text-purple-700 border-purple-200/60',
  indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200/60',
};

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
}

export default function Badge({ children, variant = 'blue' }: BadgeProps) {
  return (
    <span className={`inline-flex h-5 items-center rounded-full border px-2.5 text-[11px] font-medium tracking-wide leading-none ${colors[variant]}`}>
      {children}
    </span>
  );
}

// Mapeo de estados a colores
const estadoColors: Record<string, BadgeVariant> = {
  // Replanteo
  PENDIENTE: 'yellow',
  REVISADO: 'blue',
  VALIDADO: 'green',
  // Presupuesto
  BORRADOR: 'gray',
  ENVIADO: 'blue',
  NEGOCIACION: 'purple',
  ACEPTADO: 'green',
  RECHAZADO: 'red',
  EXPIRADO: 'gray',
  // Compra
  PEDIDO: 'blue',
  RECIBIDO_PARCIAL: 'yellow',
  RECIBIDO: 'green',
  FACTURADO: 'indigo',
  // Orden trabajo
  PLANIFICADA: 'blue',
  EN_CURSO: 'yellow',
  PAUSADA: 'purple',
  COMPLETADA: 'green',
  // Proyecto
  REPLANTEO: 'yellow',
  PRESUPUESTO: 'blue',
  EN_EJECUCION: 'purple',
  COMPLETADO: 'green',
  CANCELADO: 'red',
};

const estadoLabels: Record<string, string> = {
  PENDIENTE: 'Pendiente',
  REVISADO: 'Revisado',
  VALIDADO: 'Validado',
  BORRADOR: 'Borrador',
  ENVIADO: 'Enviado',
  NEGOCIACION: 'Negociación',
  ACEPTADO: 'Aceptado',
  RECHAZADO: 'Rechazado',
  EXPIRADO: 'Expirado',
  PEDIDO: 'Pedido',
  RECIBIDO_PARCIAL: 'Recibido parcial',
  RECIBIDO: 'Recibido',
  FACTURADO: 'Facturado',
  PLANIFICADA: 'Planificada',
  EN_CURSO: 'En curso',
  PAUSADA: 'Pausada',
  COMPLETADA: 'Completada',
  REPLANTEO: 'Replanteo',
  PRESUPUESTO: 'Presupuesto',
  EN_EJECUCION: 'En ejecución',
  COMPLETADO: 'Completado',
  CANCELADO: 'Cancelado',
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={estadoColors[status] || 'gray'}>
      {estadoLabels[status] || status}
    </Badge>
  );
}
