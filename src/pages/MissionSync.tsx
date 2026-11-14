import { useEffect, useRef, useState } from 'react';
import { Database, Plus, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import DataTable, { type Column } from '../components/common/DataTable';
import DemoNotice from '../components/common/DemoNotice';
import HealthStatusBadge from '../components/common/HealthStatusBadge';
import OfflineIndicator from '../components/common/OfflineIndicator';
import PageHeader from '../components/common/PageHeader';
import Toggle from '../components/common/Toggle';
import { useApp } from '../context/AppContext';
import { initialSync } from '../data/mockData';
import { fmtDateTime, timeAgo } from '../utils';

export default function MissionSync() {
  const { online, setOnline, settings } = useApp();
  const [pending, setPendingState] = useState<number>(() => {
    const v = localStorage.getItem('vyoma_sync_pending');
    return v !== null ? Number(v) : initialSync.pending;
  });
  const [synced, setSyncedState] = useState<number>(() => {
    const v = localStorage.getItem('vyoma_sync_synced');
    return v !== null ? Number(v) : initialSync.synced;
  });
  const [last, setLastState] = useState<string>(() => {
    return localStorage.getItem('vyoma_sync_last') || initialSync.lastSync;
  });
  const [history, setHistoryState] = useState<typeof initialSync.history>(() => {
    try {
      const v = localStorage.getItem('vyoma_sync_history');
      if (v) return JSON.parse(v);
    } catch {}
    return initialSync.history;
  });

  const setPending = (valOrFn: number | ((prev: number) => number)) => {
    setPendingState((prev) => {
      const next = typeof valOrFn === 'function' ? valOrFn(prev) : valOrFn;
      localStorage.setItem('vyoma_sync_pending', String(next));
      return next;
    });
  };

  const setSynced = (valOrFn: number | ((prev: number) => number)) => {
    setSyncedState((prev) => {
      const next = typeof valOrFn === 'function' ? valOrFn(prev) : valOrFn;
      localStorage.setItem('vyoma_sync_synced', String(next));
      return next;
    });
  };

  const setLast = (v: string) => {
    setLastState(v);
    localStorage.setItem('vyoma_sync_last', v);
  };

  const setHistory = (valOrFn: typeof initialSync.history | ((prev: typeof initialSync.history) => typeof initialSync.history)) => {
    setHistoryState((prev) => {
      const next = typeof valOrFn === 'function' ? valOrFn(prev) : valOrFn;
      localStorage.setItem('vyoma_sync_history', JSON.stringify(next));
      return next;
    });
  };

  const [progress, setProgress] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  const syncNow = () => {
    if (!online || syncing || pending === 0) return;
    const count = pending;
    const started = Date.now();
    setSyncing(true);
    setProgress(0);
    timer.current = setInterval(() => {
      setProgress((p) => {
        const n = Math.min(100, p + 10);
        if (n === 100) {
          if (timer.current) clearInterval(timer.current);
          setSyncing(false);
          setSynced((s) => s + count);
          setPending(0);
          const now = new Date().toISOString();
          setLast(now);
          setHistory((h) => [
            { id: `s${Date.now()}`, time: now, records: count, result: 'Success (simulated)', duration: `${((Date.now() - started) / 1000).toFixed(1)} s` },
            ...h,
          ]);
        }
        return n;
      });
    }, 200);
  };

  const cols: Column<(typeof history)[number]>[] = [
    { key: 't', header: 'Timestamp', render: (r) => <span className="num text-muted">{fmtDateTime(r.time, settings.hour12)}</span> },
    { key: 'r', header: 'Records Transferred', render: (r) => <span className="num font-semibold text-ink">{r.records} packets</span> },
    { key: 'd', header: 'Duration', render: (r) => <span className="num text-muted">{r.duration}</span> },
    { key: 's', header: 'Transfer Status', render: (r) => <HealthStatusBadge status={r.result.startsWith('Success') ? 'normal' : 'warning'} label={r.result} /> },
  ];

  const lcols: Column<(typeof initialSync.local)[number]>[] = [
    { key: 'n', header: 'Encrypted Telemetry Store', render: (r) => <span className="font-medium text-body">{r.name}</span> },
    { key: 'r', header: 'Local Entries', render: (r) => <span className="num font-semibold text-ink">{r.records.toLocaleString()}</span> },
    { key: 's', header: 'Volume', render: (r) => <span className="num text-muted">{r.size}</span> },
    { key: 'a', header: 'Local Cache State', render: () => <HealthStatusBadge status="normal" label="Encrypted &amp; Ready" /> },
  ];

  return (
    <>
      <PageHeader
        title="MissionSync"
        subtitle="Onboard cryptographic data synchronization. Health telemetry is persistently stored locally in isolated storage and securely uplinks to Earth Control when communication passes occur."
      >
        <OfflineIndicator />
        <button
          className="btn-primary"
          onClick={syncNow}
          disabled={!online || syncing || pending === 0}
        >
          <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} aria-hidden />
          <span>{syncing ? 'Synchronizing…' : 'Initiate Uplink'}</span>
        </button>
      </PageHeader>

      {/* Offline Alert Banner */}
      {!online && (
        <div role="status" className="mb-5 flex items-start gap-3 rounded-xl border border-warn/40 bg-warn/[0.04] p-4 text-sm">
          <WifiOff className="mt-0.5 h-5 w-5 shrink-0 text-warn" aria-hidden />
          <div>
            <p className="font-semibold text-ink">Deep Space Link Currently Offline</p>
            <p className="text-xs text-muted mt-0.5">
              Habitation telemetry and check-ins continue saving to onboard encrypted cache. Full sync will resume automatically upon scheduled ground station pass.
            </p>
          </div>
        </div>
      )}

      {/* ── Status Grid ── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-5">
        {/* Link Status */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="label">Telemetry Link</p>
            {online ? (
              <span className="flex items-center gap-1.5 text-xs text-teal font-medium">
                <Wifi className="h-3.5 w-3.5" /> Synchronized
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs text-warn font-medium">
                <WifiOff className="h-3.5 w-3.5" /> Disconnected
              </span>
            )}
          </div>
          <p className="font-display text-2xl font-bold text-ink mt-1">
            {online ? 'Online (Ground Link)' : 'Offline (Local Only)'}
          </p>
          <div className="mt-3 border-t border-border pt-1">
            <Toggle
              label="Simulate Link Disruption"
              hint="Test offline edge behavior"
              checked={!online}
              onChange={(v) => setOnline(!v)}
            />
          </div>
        </div>

        {/* Last Sync */}
        <div className="card p-4">
          <p className="label">Last Ground Uplink</p>
          <p className="num text-2xl font-bold text-ink mt-1">{timeAgo(last)}</p>
          <p className="num text-xs text-muted mt-1">{fmtDateTime(last, settings.hour12)}</p>
        </div>

        {/* Pending Records */}
        <div className="card p-4">
          <p className="label">Pending Transmission Queue</p>
          <p className="num text-2xl font-bold text-ink mt-1">
            {pending} <span className="text-xs font-normal text-muted">packets</span>
          </p>
          <button
            className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-teal hover:underline"
            onClick={() => setPending((p) => p + 5)}
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Generate 5 test telemetry samples
          </button>
        </div>

        {/* Synchronized Records */}
        <div className="card p-4">
          <p className="label">Verified Ground Records</p>
          <p className="num text-2xl font-bold text-teal mt-1">
            {synced.toLocaleString()}
          </p>
          <p className="text-xs text-muted mt-1">End-to-end verified</p>
        </div>
      </div>

      {/* ── Progress Bar ── */}
      <section className="card p-5 mb-5" aria-label="Uplink transmission progress">
        <div className="mb-2 flex items-center justify-between text-sm">
          <h2 className="font-display text-sm font-semibold text-ink">Transmission Pipeline</h2>
          <span className="num text-xs font-semibold text-muted">
            {syncing ? `Uplinking · ${progress}%` : pending === 0 ? 'All Queues Flushed (100%)' : `${pending} Packets Staged`}
          </span>
        </div>
        <div
          className="progress-bar h-2"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="progress-fill bg-teal"
            style={{ width: `${syncing ? progress : pending === 0 ? 100 : 0}%` }}
          />
        </div>
      </section>

      {/* ── Tables Grid ── */}
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card p-5" aria-label="Transmission history">
          <h2 className="font-display text-sm font-semibold text-ink mb-3">Historical Uplink Log</h2>
          <DataTable columns={cols} rows={history} />
        </section>

        <section className="card p-5" aria-label="Onboard storage allocation">
          <h2 className="font-display text-sm font-semibold text-ink mb-3 flex items-center gap-2">
            <Database className="h-4 w-4 text-teal" aria-hidden />
            Onboard Storage Partition Allocation
          </h2>
          <DataTable columns={lcols} rows={initialSync.local} />
        </section>
      </div>

      <DemoNotice text="Uplink synchronization protocol simulated entirely in client runtime. Persistent local storage relies on secure in-memory browser allocation." />
    </>
  );
}
