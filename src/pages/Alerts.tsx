import { useEffect, useState } from 'react';
import { CheckCheck, ChevronLeft, ChevronRight, RefreshCw, Filter } from 'lucide-react';
import AlertCard from '../components/alerts/AlertCard';
import DemoNotice from '../components/common/DemoNotice';
import EmptyState from '../components/common/EmptyState';
import PageHeader from '../components/common/PageHeader';
import { useApp } from '../context/AppContext';
import type { Alert, Severity } from '../types';
import { cx } from '../utils';
import { getAlerts, mapBackendAlertToUi } from '../services/alertService';

type Sev = 'all' | Severity;
type StatusFilter = 'all' | 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED';

export default function Alerts() {
  const {
    alerts,
    acknowledge,
    resolveAlert,
    acknowledgeAllNonCritical,
    settings,
    astronauts,
    apiConnected,
    refreshAlerts,
  } = useApp();

  const [sev, setSev] = useState<Sev>('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [selectedAstroId, setSelectedAstroId] = useState<number | 'all'>('all');

  // Pagination state
  const [page, setPage] = useState<number>(0);
  const pageSize = 10;
  const [serverAlerts, setServerAlerts] = useState<Alert[]>([]);
  const [serverTotal, setServerTotal] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Fetch paginated alerts from backend if connected
  const fetchFilteredAlerts = async () => {
    if (!apiConnected) return;
    setIsLoading(true);
    try {
      const severityParam = sev === 'all' ? undefined : sev === 'critical' ? 'HIGH' : sev === 'warning' ? 'MEDIUM' : 'LOW';
      const statusParam = status === 'all' ? undefined : status;
      const astroParam = selectedAstroId === 'all' ? undefined : selectedAstroId;

      const res = await getAlerts({
        severity: severityParam,
        status: statusParam,
        astronaut_id: astroParam,
        skip: page * pageSize,
        limit: pageSize,
      });

      const mapped = res.alerts.map((a) => {
        const astro = astronauts.find((ast) => ast.id === a.astronaut_id);
        return mapBackendAlertToUi(a, astro?.astronaut_code);
      });

      setServerAlerts(mapped);
      setServerTotal(res.total);
    } catch (err) {
      console.warn('Error fetching filtered alerts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (apiConnected) {
      fetchFilteredAlerts();
    }
  }, [apiConnected, page, sev, status, selectedAstroId, astronauts]);

  // When a status change happens, reload
  const handleAcknowledge = async (id: string) => {
    await acknowledge(id);
    if (apiConnected) {
      await fetchFilteredAlerts();
      await refreshAlerts();
    }
  };

  const handleResolve = async (id: string) => {
    await resolveAlert(id);
    if (apiConnected) {
      await fetchFilteredAlerts();
      await refreshAlerts();
    }
  };

  const handleAckAll = async () => {
    await acknowledgeAllNonCritical();
    if (apiConnected) {
      await fetchFilteredAlerts();
      await refreshAlerts();
    }
  };

  // Local fallback filtering when offline
  const localFiltered = alerts.filter((a) => {
    if (sev !== 'all' && a.severity !== sev) return false;
    const aStatus = (a.status || (a.acknowledged ? 'ACKNOWLEDGED' : 'OPEN')).toUpperCase();
    if (status !== 'all' && aStatus !== status) return false;
    if (selectedAstroId !== 'all' && a.astronautId !== selectedAstroId) return false;
    return true;
  });

  const displayedAlerts = apiConnected ? serverAlerts : localFiltered;
  const totalCount = apiConnected ? serverTotal : localFiltered.length;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  // Counts for filters
  const openCount = alerts.filter((a) => (a.status || (a.acknowledged ? 'ACKNOWLEDGED' : 'OPEN')).toUpperCase() === 'OPEN').length;

  return (
    <>
      <PageHeader
        title="Alerts &amp; Triage"
        subtitle="Operational triage queue. Critical anomalies take immediate priority and require verified manual acknowledgment or resolution."
      >
        <button className="btn-ghost btn-sm" onClick={handleAckAll}>
          <CheckCheck className="h-4 w-4 text-teal" aria-hidden />
          <span>Acknowledge warnings &amp; info</span>
        </button>

        {apiConnected && (
          <button
            className="btn-ghost btn-sm text-xs"
            onClick={fetchFilteredAlerts}
            title="Refresh alerts from PostgreSQL"
          >
            <RefreshCw className={cx('h-3.5 w-3.5', isLoading && 'animate-spin')} />
            <span>Sync</span>
          </button>
        )}
      </PageHeader>

      {/* ── Filters & Controls Bar ── */}
      <div className="mb-6 space-y-3 pb-4 border-b border-border">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Status View Filter */}
          <div role="group" aria-label="Alert status view" className="flex flex-wrap gap-1.5">
            {([
              ['all', 'All Alerts'],
              ['OPEN', 'Open Triage'],
              ['ACKNOWLEDGED', 'Acknowledged'],
              ['RESOLVED', 'Resolved'],
            ] as [StatusFilter, string][]).map(([k, label]) => {
              const isActive = status === k;
              return (
                <button
                  key={k}
                  aria-pressed={isActive}
                  onClick={() => {
                    setStatus(k);
                    setPage(0);
                  }}
                  className={cx('chip', isActive ? 'chip-on' : 'chip-off')}
                >
                  <span>{label}</span>
                  {k === 'OPEN' && openCount > 0 && (
                    <span className="num ml-1 rounded-full bg-crit text-white px-1.5 py-0.2 text-[11px] font-bold">
                      {openCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Astronaut Selector Filter */}
          {astronauts.length > 0 && (
            <div className="flex items-center gap-1.5 bg-offwhite border border-line rounded-lg px-2.5 py-1 text-xs">
              <Filter className="h-3.5 w-3.5 text-muted" />
              <span className="text-muted font-medium">Crew Member:</span>
              <select
                aria-label="Filter alerts by astronaut"
                className="bg-transparent font-semibold text-ink text-xs focus:outline-none cursor-pointer"
                value={selectedAstroId}
                onChange={(e) => {
                  setSelectedAstroId(e.target.value === 'all' ? 'all' : Number(e.target.value));
                  setPage(0);
                }}
              >
                <option value="all">All Astronauts</option>
                {astronauts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.astronaut_code} - {a.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Severity filter row */}
        <div role="group" aria-label="Severity filter" className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted font-medium mr-1">Severity:</span>
          {(['all', 'critical', 'warning', 'info'] as Sev[]).map((s) => {
            const isActive = sev === s;
            return (
              <button
                key={s}
                aria-pressed={isActive}
                onClick={() => {
                  setSev(s);
                  setPage(0);
                }}
                className={cx('chip text-xs', isActive ? 'chip-on' : 'chip-off')}
              >
                <span>{s === 'all' ? 'All Severities' : s[0].toUpperCase() + s.slice(1)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Alert Cards Grid ── */}
      {displayedAlerts.length === 0 ? (
        <div className="card">
          <EmptyState
            title={status === 'OPEN' ? 'No Open Alerts' : 'No Records in this Filter'}
            hint="All clinical and telemetry alarms have been resolved or nominal bounds restored."
          />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {displayedAlerts.map((a) => (
            <AlertCard
              key={a.id}
              alert={a}
              onAcknowledge={handleAcknowledge}
              onResolve={handleResolve}
              hour12={settings.hour12}
            />
          ))}
        </div>
      )}

      {/* ── Pagination Bar ── */}
      {totalCount > pageSize && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4 text-xs text-muted">
          <div>
            Showing <span className="font-semibold text-ink">{page * pageSize + 1}</span>–
            <span className="font-semibold text-ink">{Math.min((page + 1) * pageSize, totalCount)}</span> of{' '}
            <span className="font-semibold text-ink">{totalCount}</span> alerts
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page === 0 || isLoading}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="btn-ghost text-xs px-2.5 py-1.5 flex items-center gap-1 disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Previous
            </button>

            <span className="font-mono text-xs px-2">
              Page {page + 1} of {totalPages}
            </span>

            <button
              type="button"
              disabled={page >= totalPages - 1 || isLoading}
              onClick={() => setPage((p) => p + 1)}
              className="btn-ghost text-xs px-2.5 py-1.5 flex items-center gap-1 disabled:opacity-40"
            >
              Next <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      <DemoNotice />
    </>
  );
}
