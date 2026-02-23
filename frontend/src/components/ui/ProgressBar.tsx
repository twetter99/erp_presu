import { cn } from '../../lib/utils';

interface ProgressBarProps {
  value: number; // 0-100
  color?: 'primary' | 'success' | 'warning' | 'destructive';
  size?: 'sm' | 'md';
  label?: string;
  showValue?: boolean;
}

const colorMap = {
  primary: 'bg-primary shadow-glow',
  success: 'bg-success shadow-glow-success',
  warning: 'bg-warning',
  destructive: 'bg-destructive',
};

export default function ProgressBar({
  value,
  color = 'primary',
  size = 'sm',
  label,
  showValue = false,
}: ProgressBarProps) {
  const clampedValue = Math.min(100, Math.max(0, value));

  return (
    <div className="w-full">
      {(label || showValue) && (
        <div className="flex items-center justify-between mb-1.5">
          {label && <span className="text-[12px] text-muted-foreground">{label}</span>}
          {showValue && <span className="text-[12px] font-medium text-foreground">{Math.round(clampedValue)}%</span>}
        </div>
      )}
      <div className={cn('w-full rounded-full bg-white/[0.06] overflow-hidden', size === 'sm' ? 'h-1.5' : 'h-2.5')}>
        <div
          className={cn('h-full rounded-full transition-all duration-500 ease-out', colorMap[color])}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
    </div>
  );
}
