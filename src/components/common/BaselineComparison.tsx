import { cx } from '../../utils';
import type { Status } from '../../types';
import { STATUS_STYLE } from './HealthStatusBadge';

interface Props {
  label: string;
  current: number;
  baseline: number;
  unit: string;
  decimals?: number;
}

export default function BaselineComparison({ label, current, baseline, unit, decimals = 0 }: Props) {
  const pct = ((current - baseline) / baseline) * 100;
  const absPct = Math.abs(pct);
  const status: Status =
    absPct < 5 ? 'normal' : absPct < 15 ? 'info' : absPct < 35 ? 'warning' : 'critical';
  const s = STATUS_STYLE[status];

  // Bar: 50% = baseline; fill width based on current vs baseline
  const barPct = Math.min(100, Math.max(0, (current / (baseline * 1.5)) * 50));

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="label">{label}</span>
        <span className={cx('num text-xs font-bold', s.text)}>
          {pct >= 0 ? '+' : ''}{pct.toFixed(1)}%
        </span>
      </div>
      {/* Bar */}
      <div className="relative h-1.5 rounded-full bg-ghost overflow-hidden">
        <div
          className="absolute left-0 top-0 h-full rounded-full transition-all"
          style={{ width: `${barPct}%`, background: s.hex }}
        />
        {/* Baseline marker at 33.3% (baseline/max = baseline/1.5*baseline) */}
        <div
          className="absolute top-0 h-full w-px bg-navy/30"
          style={{ left: '33.3%' }}
          aria-hidden
        />
      </div>
      <div className="flex justify-between mt-1.5 text-xs">
        <span className="num font-semibold text-ink">
          {current.toFixed(decimals)} <span className="text-muted">{unit}</span>
        </span>
        <span className="text-muted">
          Baseline <span className="num font-medium text-body">{baseline.toFixed(decimals)} {unit}</span>
        </span>
      </div>
    </div>
  );
}
