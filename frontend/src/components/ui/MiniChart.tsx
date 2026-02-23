import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';

interface MiniChartProps {
  data: { value: number }[];
  color?: string;
  height?: number;
}

export default function MiniChart({ data, color = '#6C5CE7', height = 40 }: MiniChartProps) {
  if (!data || data.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(220, 33%, 8%)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '12px',
            fontSize: '12px',
            color: '#EFF3F8',
            padding: '6px 10px',
          }}
          labelStyle={{ display: 'none' }}
          formatter={(val?: number | string) => [Number(val ?? 0).toLocaleString('es-ES'), '']}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          fill={`url(#grad-${color.replace('#', '')})`}
          dot={false}
          activeDot={{ r: 3, fill: color, stroke: 'none' }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
