import { Check, ShieldCheck, User } from 'lucide-react';
import type { Alert } from '../../types';
import { cx, fmtDateTime, timeAgo } from '../../utils';
import HealthStatusBadge, { STATUS_STYLE } from '../common/HealthStatusBadge';

interface Props {
  alert: Alert;
  onAcknowledge?: (id: string) => void;
  onResolve?: (id: string) => void;
  compact?: boolean;
  hour12?: boolean;
}

export default function AlertCard({ alert: a, onAcknowledge, onResolve, compact, hour12 }: Props) {
  const s = STATUS_STYLE[a.severity];
  const Icon = s.icon;
  const statusUpper = (a.status || (a.acknowledged ? 'ACKNOWLEDGED' : 'OPEN')).toUpperCase();

  return (
    <article
      aria-label={`${s.label} alert: ${a.title}`}
      className={cx(
        'card overflow-hidden border-l-4 p-4 transition-all',
        s.borderL,
        statusUpper === 'OPEN' && a.severity === 'critical' && 'bg-crit/[0.025]',
        statusUpper === 'ACKNOWLEDGED' && 'opacity-80 bg-offwhite/40',
        statusUpper === 'RESOLVED' && 'opacity-60 bg-offwhite/60',
      )}
    >
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-start gap-2.5 min-w-0">
          <Icon className={cx('mt-0.5 h-[18px] w-[18px] shrink-0', s.text)} aria-hidden />
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-ink leading-snug">{a.title}</h3>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted mt-0.5">
              <span>{a.indicator}</span>
              <span>·</span>
              <time dateTime={a.timestamp} title={fmtDateTime(a.timestamp, hour12)}>
                {timeAgo(a.timestamp)}
              </time>
              {a.astronautCode && (
                <>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1 font-mono text-ink">
                    <User className="h-3 w-3 text-muted" /> {a.astronautCode}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {statusUpper === 'OPEN' && a.severity === 'critical' && (
            <span className="text-xs font-bold text-crit">Action required</span>
          )}
          {/* Status Badge */}
          <span
            className={cx(
              'px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider',
              statusUpper === 'OPEN' && 'bg-crit/10 text-crit border border-crit/20',
              statusUpper === 'ACKNOWLEDGED' && 'bg-warn/10 text-warn border border-warn/20',
              statusUpper === 'RESOLVED' && 'bg-teal/10 text-teal-dark border border-teal/20',
            )}
          >
            {statusUpper}
          </span>
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
          <dt className="label mb-0.5">Baseline / Threshold</dt>
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

      {/* Audit Timestamps */}
      {(a.acknowledgedAt || a.resolvedAt) && (
        <div className="mt-2 text-[10px] text-muted space-y-0.5 font-mono border-t border-line/40 pt-1.5">
          {a.acknowledgedAt && (
            <div>Ack: {fmtDateTime(a.acknowledgedAt, hour12)}</div>
          )}
          {a.resolvedAt && (
            <div className="text-teal-dark font-medium">Resolved: {fmtDateTime(a.resolvedAt, hour12)}</div>
          )}
        </div>
      )}

      {/* Footer Actions */}
      <footer className="mt-3 flex items-center justify-end gap-2">
        {statusUpper === 'RESOLVED' ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-dark">
            <ShieldCheck className="h-4 w-4 text-teal" aria-hidden />
            Resolved
          </span>
        ) : (
          <>
            {statusUpper === 'OPEN' && onAcknowledge && (
              <button
                type="button"
                className="btn-sm btn-ghost border border-line"
                onClick={() => onAcknowledge(a.id)}
              >
                <Check className="h-3.5 w-3.5 text-muted" aria-hidden />
                <span>Acknowledge</span>
              </button>
            )}

            {onResolve && (
              <button
                type="button"
                className="btn-sm btn-primary"
                onClick={() => onResolve(a.id)}
              >
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
                <span>Resolve</span>
              </button>
            )}
          </>
        )}
      </footer>
    </article>
  );
}
