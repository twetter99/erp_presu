import { cn } from '../../lib/utils';

interface GaugeChartProps {
  /** Value from 0-100 */
  value: number;
  /** Display label under the value */
  label?: string;
  /** Size in px */
  size?: number;
  /** Color of the gauge arc */
  color?: string;
  /** Track color */
  trackColor?: string;
}

export default function GaugeChart({
  value,
  label,
  size = 180,
  color = 'hsl(248, 76%, 63%)',
  trackColor = 'rgba(255,255,255,0.06)',
}: GaugeChartProps) {
  const clampedValue = Math.min(100, Math.max(0, value));
  const radius = 70;
  const strokeWidth = 10;
  const center = 90;

  // Semicircle from 180° to 0° (left to right)
  const startAngle = 180;
  const endAngle = 180 - (clampedValue / 100) * 180;

  const polarToCartesian = (angle: number) => {
    const rad = (angle * Math.PI) / 180;
    return {
      x: center + radius * Math.cos(rad),
      y: center - radius * Math.sin(rad),
    };
  };

  const start = polarToCartesian(startAngle);
  const end = polarToCartesian(endAngle);
  const largeArc = clampedValue > 50 ? 1 : 0;

  // Track (full semicircle)
  const trackEnd = polarToCartesian(0);

  const qualityLabel =
    clampedValue >= 80 ? 'Excelente' : clampedValue >= 60 ? 'Bueno' : clampedValue >= 40 ? 'Regular' : 'Bajo';

  const qualityColor =
    clampedValue >= 80
      ? 'text-success'
      : clampedValue >= 60
        ? 'text-primary'
        : clampedValue >= 40
          ? 'text-warning'
          : 'text-destructive';

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size * 0.6} viewBox="0 0 180 108">
        {/* Track */}
        <path
          d={`M ${start.x} ${start.y} A ${radius} ${radius} 0 1 1 ${trackEnd.x} ${trackEnd.y}`}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Value arc */}
        {clampedValue > 0 && (
          <path
            d={`M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
            style={{
              filter: `drop-shadow(0 0 6px ${color})`,
            }}
          />
        )}
        {/* Center value */}
        <text x={center} y={center - 10} textAnchor="middle" className="fill-foreground text-[28px] font-bold">
          {Math.round(clampedValue)}
        </text>
        <text x={center} y={center + 8} textAnchor="middle" className={cn('text-[11px] font-medium', qualityColor)}>
          {qualityLabel}
        </text>
      </svg>
      {label && <p className="text-[12px] text-muted-foreground mt-1">{label}</p>}
    </div>
  );
}
