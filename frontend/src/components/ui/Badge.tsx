type BadgeVariant = 'blue' | 'green' | 'yellow' | 'red' | 'gray' | 'purple' | 'indigo';

const colors: Record<BadgeVariant, string> = {
  blue: 'bg-primary/15 text-primary border-primary/20',
  green: 'bg-success/15 text-success border-success/20',
  yellow: 'bg-warning/15 text-warning border-warning/20',
  red: 'bg-destructive/15 text-destructive border-destructive/20',
  gray: 'bg-white/[0.06] text-muted-foreground border-white/[0.08]',
  purple: 'bg-primary/15 text-primary border-primary/20',
  indigo: 'bg-primary/15 text-primary border-primary/20',
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
