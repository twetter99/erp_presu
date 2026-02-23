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
    <div className={cn('rounded-lg border border-slate-200 bg-white shadow-sm', className)}>
      {(title || actions) && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          {title && <h3 className="text-[15px] font-semibold text-slate-800">{title}</h3>}
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
}

const statColors = {
  blue: 'bg-primary/10 text-primary',
  green: 'bg-success/10 text-success',
  yellow: 'bg-accent/15 text-accent',
  red: 'bg-destructive/10 text-destructive',
  purple: 'bg-secondary/15 text-secondary',
};

export function StatCard({ title, value, subtitle, icon, color = 'blue' }: StatCardProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm p-5 transition-all hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[12px] font-medium text-slate-500">{title}</p>
          <p className="text-2xl font-bold text-slate-800 mt-1.5">{value}</p>
          {subtitle && <p className="text-[12px] text-slate-400 mt-1">{subtitle}</p>}
        </div>
        {icon && (
          <div className={`p-2.5 rounded-lg ${statColors[color]}`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
