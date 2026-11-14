import { Check } from 'lucide-react';
import type { Alert } from '../../types';
import { cx, fmtDateTime, timeAgo } from '../../utils';
import HealthStatusBadge, { STATUS_STYLE } from '../common/HealthStatusBadge';

interface Props {
  alert: Alert;
  onAcknowledge?: (id: string) => void;
  compact?: boolean;
  hour12?: boolean;
}

export default function AlertCard({ alert: a, onAcknowledge, compact, hour12 }: Props) {
  const s = STATUS_STYLE[a.severity];
  const Icon = s.icon;

  return (
    <article
      aria-label={`${s.label} alert: ${a.title}`}
      className={cx(
        'card overflow-hidden border-l-4 p-4 transition-opacity',
        s.borderL,
        a.severity === 'critical' && !a.acknowledged && 'bg-crit/[0.025]',
        a.acknowledged && 'opacity-55',
      )}
    >
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-start gap-2.5 min-w-0">
          <Icon className={cx('mt-0.5 h-4.5 w-4.5 h-[18px] w-[18px] shrink-0', s.text)} aria-hidden />
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-ink leading-snug">{a.title}</h3>
            <p className="text-xs text-muted mt-0.5">
              {a.indicator} ·{' '}
              <time dateTime={a.timestamp} title={fmtDateTime(a.timestamp, hour12)}>
                {timeAgo(a.timestamp)}
              </time>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {a.severity === 'critical' && !a.acknowledged && (
            <span className="text-xs font-bold text-crit">Action required</span>
          )}
          <HealthStatusBadge status={a.severity} />
        </div>
      </header>

      {/* Measurements */}
      <div className="my-3 grid grid-cols-2 gap-3 rounded-lg bg-offwhite border border-border/60 p-3 text-sm">
        <div>
          <dt className="label mb-0.5">Observed</dt>
          <dd className="num font-bold text-ink">{a.observed}</dd>
        </div>
        <div>
          <dt className="label mb-0.5">Baseline / Range</dt>
          <dd className="num text-body">{a.baseline}</dd>
        </div>
      </div>

      {/* Detail (not compact) */}
      {!compact && (
        <div className="space-y-1.5 text-sm">
          <p>
            <span className="font-semibold text-ink">Why it matters: </span>
            <span className="text-muted">{a.explanation}</span>
          </p>
          <p>
            <span className="font-semibold text-ink">Recommended: </span>
            <span className="text-muted">{a.action}</span>
          </p>
        </div>
      )}

      {/* Footer */}
      {onAcknowledge && (
        <footer className="mt-3 flex items-center justify-end">
          {a.acknowledged ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal">
              <Check className="h-3.5 w-3.5" aria-hidden />
              Acknowledged
            </span>
          ) : (
            <button className="btn-sm btn-primary" onClick={() => onAcknowledge(a.id)}>
              <Check className="h-3.5 w-3.5" aria-hidden />
              Acknowledge
            </button>
          )}
        </footer>
      )}
    </article>
  );
}
