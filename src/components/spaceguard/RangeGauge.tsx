import type { LucideIcon } from 'lucide-react';
import type { RangeCfg } from '../../types';
import { cx, rangeStatus } from '../../utils';
import HealthStatusBadge, { STATUS_STYLE } from '../common/HealthStatusBadge';

interface Props {
  label: string;
  value: number;
  cfg: RangeCfg;
  icon: LucideIcon;
  decimals?: number;
  footnote?: string;
}

export default function RangeGauge({ label, value, cfg, icon: Icon, decimals = 0, footnote }: Props) {
  const st = rangeStatus(value, cfg);
  const s = STATUS_STYLE[st];
  const pct = (v: number) =>
    Math.max(0, Math.min(100, ((v - cfg.min) / (cfg.max - cfg.min)) * 100));
  const safeStart = pct(cfg.safeLo);
  const safeW = pct(cfg.safeHi) - pct(cfg.safeLo);
  const valuePct = pct(value);

  return (
    <section className="card p-4 flex flex-col justify-between" aria-label={label}>
      <div>
        {/* Header */}
        <header className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-md bg-offwhite border border-line">
              <Icon className="h-3.5 w-3.5 text-teal" aria-hidden />
            </span>
            <h3 className="text-xs font-bold text-ink">{label}</h3>
          </div>
          <HealthStatusBadge status={st} />
        </header>

        {/* Value */}
        <p className={cx('num text-2xl font-bold mt-1', s.text)}>
          {value.toFixed(decimals)}
          <span className="ml-1.5 text-xs font-normal text-muted">{cfg.unit}</span>
        </p>

        {/* Range bar */}
        <div className="relative mt-3.5 h-2 rounded-full bg-ghost overflow-visible" aria-hidden>
          {/* Safe zone */}
          <span
            className="absolute inset-y-0 rounded-full bg-teal/25"
            style={{ left: `${safeStart}%`, width: `${safeW}%` }}
          />
          {/* Current value marker */}
          <span
            className="absolute top-1/2 h-4 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-sm ring-2 ring-white"
            style={{
              left: `${valuePct}%`,
              background: s.hex,
            }}
          />
        </div>
      </div>

      <div className="mt-3 pt-2 border-t border-line flex items-center justify-between text-[11px] text-muted">
        <span>Safe: {cfg.safeLo}–{cfg.safeHi} {cfg.unit}</span>
        {footnote && <span className="font-medium text-teal-dark">{footnote}</span>}
      </div>
    </section>
  );
}