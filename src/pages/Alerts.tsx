import { useState } from 'react';
import { CheckCheck } from 'lucide-react';
import AlertCard from '../components/alerts/AlertCard';
import DemoNotice from '../components/common/DemoNotice';
import EmptyState from '../components/common/EmptyState';
import PageHeader from '../components/common/PageHeader';
import { useApp } from '../context/AppContext';
import type { Severity } from '../types';
import { RANK, cx } from '../utils';

type Sev = 'all' | Severity;
type View = 'active' | 'history' | 'all';

export default function Alerts() {
  const { alerts, acknowledge, acknowledgeAllNonCritical, settings } = useApp();
  const [sev, setSev] = useState<Sev>('all');
  const [view, setView] = useState<View>('active');

  const count = (s: Sev) => alerts.filter((a) => (s === 'all' || a.severity === s) && !a.acknowledged).length;

  const shown = alerts
    .filter((a) => (sev === 'all' || a.severity === sev) && (view === 'all' || (view === 'active' ? !a.acknowledged : a.acknowledged)))
    .sort((x, y) => (view === 'history' ? 0 : RANK[y.severity] - RANK[x.severity]) || +new Date(y.timestamp) - +new Date(x.timestamp));

  const ackAll = () => acknowledgeAllNonCritical();

  return (
    <>
      <PageHeader
        title="Alerts &amp; Triage"
        subtitle="Operational triage queue. Critical anomalies take immediate priority and require verified manual acknowledgment."
      >
        <button className="btn-ghost btn-sm" onClick={ackAll}>
          <CheckCheck className="h-4 w-4 text-teal" aria-hidden />
          <span>Acknowledge warnings &amp; info</span>
        </button>
      </PageHeader>

      {/* ── Filters Bar ── */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-border">
        {/* Severity filter */}
        <div role="group" aria-label="Severity filter" className="flex flex-wrap gap-1.5">
          {(['all', 'critical', 'warning', 'info'] as Sev[]).map((s) => (
            <button
              key={s}
              aria-pressed={sev === s}
              onClick={() => setSev(s)}
              className={cx('chip', sev === s ? 'chip-on' : 'chip-off')}
            >
              <span>{s === 'all' ? 'All Severities' : s[0].toUpperCase() + s.slice(1)}</span>
              <span className="num ml-1 rounded-full bg-navy/8 px-1.5 py-0.2 text-[10px] font-bold">
                {count(s)}
              </span>
            </button>
          ))}
        </div>

        {/* Status view filter */}
        <div role="group" aria-label="Alert view status" className="flex gap-1.5">
          {([['active', 'Active Queue'], ['history', 'Acknowledged History'], ['all', 'All Records']] as [View, string][]).map(([k, l]) => (
            <button
              key={k}
              aria-pressed={view === k}
              onClick={() => setView(k)}
              className={cx('chip', view === k ? 'chip-on' : 'chip-off')}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* ── Alert Cards Grid ── */}
      {shown.length === 0 ? (
        <div className="card">
          <EmptyState
            title={view === 'active' ? 'No Unacknowledged Alerts' : 'No Records in this Filter'}
            hint="All clinical and environmental alarms have been addressed or reviewed."
          />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {shown.map((a) => (
            <AlertCard key={a.id} alert={a} onAcknowledge={acknowledge} hour12={settings.hour12} />
          ))}
        </div>
      )}

      <DemoNotice />
    </>
  );
}
