import { Link } from 'react-router-dom';
import AlertCard from '../components/alerts/AlertCard';
import ChatInterface from '../components/astroassist/ChatInterface';
import DemoNotice from '../components/common/DemoNotice';
import HealthStatusBadge from '../components/common/HealthStatusBadge';
import PageHeader from '../components/common/PageHeader';
import { useApp } from '../context/AppContext';
import { currentVitals as v, envNow, sleepWeek, suggestions } from '../data/mockData';
import { RANK, deviation, deviationStatus } from '../utils';
import { apiConfigured } from '../services/api';
import { sendChat } from '../services/healthService';

export default function AstroAssist() {
  const { alerts, acknowledge, baselines: b, settings } = useApp();
  const related = alerts.filter((a) => !a.acknowledged).sort((x, y) => RANK[y.severity] - RANK[x.severity]).slice(0, 2);
  const avgSleep = (sleepWeek.reduce((n, d) => n + d.hours, 0) / sleepWeek.length).toFixed(1);
  const activeAlerts = alerts.filter((a) => !a.acknowledged);

  const respond = async (q: string): Promise<string> => {
    if (apiConfigured) {
      try {
        const res = await sendChat(q);
        return res.reply;
      } catch {
        // fallback to station intelligence
      }
    }

    await new Promise((res) => setTimeout(res, 650));
    const s = q.toLowerCase();

    if (s.includes('heart') || s.includes('hr') || s.includes('pulse')) {
      const diff = deviation(v.hr, b.restingHr);
      return `Your current resting heart rate is ${v.hr} BPM, which is ${diff > 0 ? '+' : ''}${diff.toFixed(1)}% compared to your calibrated baseline of ${b.restingHr} BPM. Contributing factors in telemetry log: short sleep duration (${sleepWeek[sleepWeek.length - 1].hours}h last night), slightly elevated cabin CO2 (${envNow.co2} ppm), and lower HRV (${v.hrv} ms). Re-calibrating after a 15-minute rest period is recommended.`;
    }

    if (s.includes('sleep') || s.includes('fatigue') || s.includes('rest')) {
      return `Over the last 7 sols, your sleep duration averaged ${avgSleep} hours (baseline target: 7.2h). Last night's rest was ${sleepWeek[sleepWeek.length - 1].hours} hours rated ${sleepWeek[sleepWeek.length - 1].quality}/5. Mild circadian disruption is indicated. You can record a recovery check-in under the MindSpace module.`;
    }

    if (s.includes('alert') || s.includes('warning') || s.includes('critical') || s.includes('triage')) {
      return `You have ${activeAlerts.length} open alert(s) requiring acknowledgment: ${
        activeAlerts.map((a) => `[${a.severity.toUpperCase()}] ${a.title}`).join('; ')
      }. Priority recommendation: acknowledge review on the Alerts & Triage console.`;
    }

    if (s.includes('environment') || s.includes('co2') || s.includes('radiation') || s.includes('cabin')) {
      return `Habitation atmospheric telemetry: Cabin CO2 is currently ${envNow.co2} ppm (safe ceiling: 2,500 ppm, trending upward). Ambient radiation flux is ${envNow.radiation} mSv/day (post-spike baseline nominal). Temperature is 22.4°C and relative humidity is 48%. Scrubber systems are operating nominally.`;
    }

    if (s.includes('status') || s.includes('summary') || s.includes('today') || s.includes('health')) {
      return `Mission Health Summary: Overall physiological status is STABLE WITH NOTICES. Primary observations: Resting HR is elevated at ${v.hr} BPM (+31% vs baseline ${b.restingHr} BPM), HRV is reduced to ${v.hrv} ms, and 7-sol sleep mean is ${avgSleep}h. ${activeAlerts.length} triage alert(s) pending review. No acute operational restrictions active.`;
    }

    return `AstroAssist analysis for "${q}": Telemetry channels indicate normal microgravity adaptation with moderate cardiovascular and circadian drift. Check the VitalWatch telemetry charts or HealthSense AI for deeper baseline correlation.`;
  };

  const cards = [
    { label: 'Resting Heart Rate', value: `${v.hr} BPM`, baseline: `${b.restingHr} BPM`, status: deviationStatus(deviation(v.hr, b.restingHr)) },
    { label: 'Heart Rate Variability', value: `${v.hrv} ms`, baseline: `${b.hrv} ms`, status: deviationStatus(deviation(v.hrv, b.hrv)) },
    { label: 'Weekly Sleep Mean', value: `${avgSleep} h`, baseline: '7.2 h target', status: 'info' as const },
  ];

  return (
    <>
      <PageHeader
        title="AstroAssist"
        subtitle="Conversational medical intelligence console. Query physiological states, environmental correlations, and anomaly rationales."
      />

      <div className="grid gap-5 xl:grid-cols-3">
        {/* Main Chat Interface */}
        <div className="xl:col-span-2">
          <ChatInterface respond={respond} suggestions={suggestions} demo={!apiConfigured} />
        </div>

        {/* Clinical Context Sidebar */}
        <aside className="space-y-5" aria-label="Clinical snapshot context">
          {/* Health Snapshot */}
          <section className="card p-5" aria-label="Live telemetry context">
            <h2 className="font-display text-sm font-semibold text-ink mb-3">Live Telemetry Snapshot</h2>
            <ul className="space-y-0">
              {cards.map((c) => (
                <li key={c.label} className="data-row">
                  <div>
                    <p className="text-xs text-muted">{c.label}</p>
                    <p className="num font-bold text-ink mt-0.5">{c.value}</p>
                    <p className="text-[10px] text-muted">Baseline: {c.baseline}</p>
                  </div>
                  <HealthStatusBadge status={c.status} />
                </li>
              ))}
            </ul>
          </section>

          {/* Related Alerts */}
          <section aria-label="Related priority alerts" className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-sm font-semibold text-ink">Correlated Mission Alerts</h2>
              <Link to="/alerts" className="text-xs font-semibold text-teal hover:underline">
                View all →
              </Link>
            </div>
            {related.length === 0 ? (
              <div className="card p-4 text-xs text-muted text-center">No correlated active alerts.</div>
            ) : (
              related.map((a) => (
                <AlertCard key={a.id} alert={a} compact onAcknowledge={acknowledge} hour12={settings.hour12} />
              ))
            )}
          </section>
        </aside>
      </div>

      <DemoNotice text="AstroAssist responses synthesize live station telemetry. If backend AI endpoint is connected, live neural inference will be utilized." />
    </>
  );
}
