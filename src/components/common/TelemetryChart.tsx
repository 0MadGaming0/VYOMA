import { useId } from 'react';
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { grid, tick, tooltipProps } from '../../utils/chart';

interface Props {
  data: object[];
  dataKey: string;
  xKey?: string;
  color?: string;
  baseline?: number;
  unit?: string;
  domain?: [number | 'auto', number | 'auto'];
}

export default function TelemetryChart({
  data, dataKey, xKey = 'label',
  color = '#2A9D8F', baseline, unit,
  domain = ['auto', 'auto'],
}: Props) {
  const id = useId().replace(/:/g, '');
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={color} stopOpacity={0.18} />
            <stop offset="100%" stopColor={color} stopOpacity={0}    />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={grid} vertical={false} />
        <XAxis dataKey={xKey} tick={tick} stroke={grid} minTickGap={36} />
        <YAxis tick={tick} stroke={grid} domain={domain} width={44} unit={unit ? ` ${unit}` : undefined} />
        <Tooltip {...tooltipProps} />
        {baseline !== undefined && (
          <ReferenceLine
            y={baseline}
            stroke="#6B8AA6"
            strokeDasharray="5 4"
            label={{ value: 'Baseline', fill: '#6B8AA6', fontSize: 11, position: 'insideTopRight' }}
          />
        )}
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={2}
          fill={`url(#${id})`}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
