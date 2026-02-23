import { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface CardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  actions?: ReactNode;
}

export default function Card({ children, className = '', title, actions }: CardProps) {
  return (
    <div className={cn('rounded-2xl border border-white/[0.06] bg-card/80 backdrop-blur-sm shadow-card', className)}>
      {(title || actions) && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          {title && <h3 className="text-[15px] font-semibold text-foreground">{title}</h3>}
          {actions && <div className="flex items-center gap-3">{actions}</div>}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
  trend?: { value: number; positive: boolean };
}

const statColors = {
  blue: 'bg-primary/15 text-primary',
  green: 'bg-success/15 text-success',
  yellow: 'bg-warning/15 text-warning',
  red: 'bg-destructive/15 text-destructive',
  purple: 'bg-primary/15 text-primary',
};

export function StatCard({ title, value, subtitle, icon, color = 'blue', trend }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-card/80 backdrop-blur-sm p-5 transition-all duration-300 hover:border-white/[0.1] hover:shadow-lg group">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[12px] font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
          <p className="text-2xl font-bold text-foreground mt-2">{value}</p>
          <div className="flex items-center gap-2 mt-1.5">
            {trend && (
              <span className={cn('text-[12px] font-medium', trend.positive ? 'text-success' : 'text-destructive')}>
                {trend.positive ? '↑' : '↓'} {Math.abs(trend.value)}%
              </span>
            )}
            {subtitle && <p className="text-[12px] text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        {icon && (
          <div className={cn('p-2.5 rounded-xl transition-transform duration-300 group-hover:scale-110', statColors[color])}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
