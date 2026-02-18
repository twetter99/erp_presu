type BadgeVariant = 'blue' | 'green' | 'yellow' | 'red' | 'gray' | 'purple' | 'indigo';

const colors: Record<BadgeVariant, string> = {
  blue: 'bg-blue-100 text-blue-800',
  green: 'bg-green-100 text-green-800',
  yellow: 'bg-yellow-100 text-yellow-800',
  red: 'bg-red-100 text-red-800',
  gray: 'bg-gray-100 text-gray-800',
  purple: 'bg-purple-100 text-purple-800',
  indigo: 'bg-indigo-100 text-indigo-800',
};

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
}

export default function Badge({ children, variant = 'blue' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[variant]}`}>
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
