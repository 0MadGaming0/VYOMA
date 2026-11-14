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
  // A placeholder value means no reading exists yet: show a neutral "No data"
  // state instead of a status colour that would read as a clinical result.
  const noData = value === '—' || value === '' || value == null;

  return (
    <section
      className={cx(
        'card p-3 sm:p-4 flex flex-col gap-2',
        !noData && status === 'critical' && 'border-crit/40 bg-crit/[0.015]',
        !noData && status === 'warning'  && 'border-warn/30',
      )}
      aria-label={label}
    >
      {/* Header */}
      <header className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className={cx('p-1.5 rounded-md', noData ? 'bg-ghost' : status === 'normal' ? 'bg-teal/10' : status === 'critical' ? 'bg-crit/10' : status === 'warning' ? 'bg-warn/10' : 'bg-info/10')}>
            <Icon className={cx('h-3.5 w-3.5', noData ? 'text-muted' : s.text)} aria-hidden />
          </span>
          <h3 className="min-w-0 text-xs font-semibold text-muted leading-snug">{label}</h3>
        </div>
        {noData ? (
          <span className="inline-flex shrink-0 items-center rounded border border-border px-1.5 py-0.5 text-[11px] font-semibold text-muted bg-offwhite">
            No data
          </span>
        ) : (
          <HealthStatusBadge status={status} />
        )}
      </header>

      {/* Value */}
      <div className="flex items-baseline gap-1.5 mt-1">
        <span className={cx('num font-bold', noData ? 'text-dim' : 'text-ink', large ? 'text-3xl sm:text-4xl' : 'text-2xl sm:text-3xl')}>
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
        <footer className="mt-auto flex flex-wrap items-center justify-between gap-x-2 gap-y-1 pt-2 border-t border-border/60 text-xs text-muted">
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
