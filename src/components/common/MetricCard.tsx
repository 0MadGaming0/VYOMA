import type { LucideIcon } from 'lucide-react';
import { Line, LineChart, ResponsiveContainer } from 'recharts';
import type { Status } from '../../types';
import { cx } from '../../utils';
import HealthStatusBadge, { STATUS_STYLE } from './HealthStatusBadge';

interface Props {
  label: string;
  value: string | number;
  unit?: string;
  status: Status;
  icon: LucideIcon;
  baseline?: string;
  spark?: number[];
  footnote?: string;
  large?: boolean;
}

export default function MetricCard({
  label, value, unit, status, icon: Icon,
  baseline, spark, footnote, large,
}: Props) {
  const s = STATUS_STYLE[status];

  return (
    <section
      className={cx(
        'card p-4 flex flex-col gap-2',
        status === 'critical' && 'border-crit/40 bg-crit/[0.015]',
        status === 'warning'  && 'border-warn/30',
      )}
      aria-label={label}
    >
      {/* Header */}
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={cx('p-1.5 rounded-md', status === 'normal' ? 'bg-teal/10' : status === 'critical' ? 'bg-crit/10' : status === 'warning' ? 'bg-warn/10' : 'bg-info/10')}>
            <Icon className={cx('h-3.5 w-3.5', s.text)} aria-hidden />
          </span>
          <h3 className="text-xs font-semibold text-muted">{label}</h3>
        </div>
        <HealthStatusBadge status={status} />
      </header>

      {/* Value */}
      <div className="flex items-baseline gap-1.5 mt-1">
        <span className={cx('num font-bold text-ink', large ? 'text-4xl' : 'text-3xl')}>
          {value}
        </span>
        {unit && <span className="num text-xs text-muted">{unit}</span>}
      </div>

      {/* Sparkline */}
      {spark && (
        <div className="h-10" aria-hidden>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={spark.map((v, i) => ({ i, v }))}>
              <Line
                type="monotone"
                dataKey="v"
                stroke={s.hex}
                strokeWidth={1.8}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Footer */}
      {(baseline || footnote) && (
        <footer className="mt-auto flex items-center justify-between gap-2 pt-2 border-t border-border/60 text-xs text-muted">
          {baseline && (
            <span>
              Baseline <span className="num font-semibold text-body">{baseline}</span>
            </span>
          )}
          {footnote && <span className="num text-muted">{footnote}</span>}
        </footer>
      )}
    </section>
  );
}
