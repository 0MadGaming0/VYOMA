import { Link } from 'react-router-dom';
import { CheckCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { RANK, timeAgo } from '../../utils';
import EmptyState from '../common/EmptyState';
import HealthStatusBadge from '../common/HealthStatusBadge';

export default function NotificationPanel({ onClose }: { onClose: () => void }) {
  const { alerts, acknowledge, acknowledgeAllNonCritical } = useApp();
  const open = alerts
    .filter((a) => !a.acknowledged)
    .sort((a, b) => RANK[b.severity] - RANK[a.severity])
    .slice(0, 5);

  const hasWarningsOrInfo = open.some((a) => a.severity !== 'critical');

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} aria-hidden />
      <div
        className="absolute right-0 top-12 z-50 w-[min(92vw,360px)] rounded-xl border border-line bg-white p-3.5 shadow-card-lg animate-fadeUp"
        role="dialog"
        aria-label="Mission Notifications"
        style={{ boxShadow: '0 8px 32px rgba(22,50,79,0.14)' }}
      >
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="font-display text-sm font-semibold text-ink">Mission Notifications</h2>
          {hasWarningsOrInfo && (
            <button
              type="button"
              onClick={acknowledgeAllNonCritical}
              className="text-[11px] font-semibold text-teal hover:underline flex items-center gap-1"
            >
              <CheckCheck className="h-3 w-3" /> Ack non-critical
            </button>
          )}
        </div>

        {open.length === 0 ? (
          <EmptyState title="All Caught Up" hint="No unacknowledged telemetry alerts in current queue." />
        ) : (
          <ul className="space-y-2 max-h-72 overflow-y-auto pr-0.5">
            {open.map((a) => (
              <li
                key={a.id}
                className="rounded-lg bg-offwhite border border-line/60 p-2.5 transition-colors hover:border-line"
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <HealthStatusBadge status={a.severity} />
                  <span className="num text-[11px] text-muted">{timeAgo(a.timestamp)}</span>
                </div>
                <p className="text-xs font-semibold text-ink leading-snug">{a.title}</p>
                <div className="mt-2 flex items-center justify-between text-[11px] pt-1.5 border-t border-line/40">
                  <span className="text-muted truncate max-w-[170px]">{a.observed}</span>
                  <button
                    type="button"
                    onClick={() => acknowledge(a.id)}
                    className="text-teal font-semibold hover:underline"
                  >
                    Acknowledge
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-3 pt-2 border-t border-line">
          <Link to="/alerts" onClick={onClose} className="btn-ghost w-full text-xs">
            Open Alerts &amp; Triage Console
          </Link>
        </div>
      </div>
    </>
  );
}
