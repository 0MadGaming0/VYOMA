import { useState, type FormEvent } from 'react';
import {
  Check, Lightbulb, Smile, Meh, Frown, Sparkles, Brain, Moon, Zap,
  Activity, Trash2, Plus, Clock, ShieldCheck
} from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import ChartCard from '../components/common/ChartCard';
import DemoNotice from '../components/common/DemoNotice';
import PageHeader from '../components/common/PageHeader';
import { useApp } from '../context/AppContext';
import { behavioralInsights, moodLabels, sleepWeek } from '../data/mockData';
import { cx, timeAgo } from '../utils';
import { grid, tick, tooltipProps, C_PRIMARY, C_SECONDARY } from '../utils/chart';

const MOOD_ICONS = [
  { icon: Frown, label: 'Exhausted', score: 1 },
  { icon: Frown, label: 'Strained',  score: 2 },
  { icon: Meh,   label: 'Neutral',   score: 3 },
  { icon: Smile, label: 'Focused',   score: 4 },
  { icon: Sparkles, label: 'Optimal', score: 5 },
];

function InteractiveSlider({
  id,
  label,
  value,
  onChange,
  hint,
  icon: Icon,
  unit = '/10',
}: {
  id: string;
  label: string;
  value: number;
  onChange: (n: number) => void;
  hint: string;
  icon: typeof Activity;
  unit?: string;
}) {
  return (
    <div className="rounded-lg bg-offwhite/70 border border-line p-3">
      <div className="mb-2 flex justify-between items-center">
        <label htmlFor={id} className="text-xs font-bold text-ink flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5 text-teal" aria-hidden />
          {label}
        </label>
        <span className="num text-xs font-bold text-teal-dark bg-white border border-line px-2 py-0.5 rounded shadow-sm">
          {value}<span className="text-[10px] font-normal text-muted">{unit}</span>
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={1}
        max={10}
        value={value}
        onChange={(e) => onChange(+e.target.value)}
        className="w-full h-1.5 rounded-full bg-ghost cursor-pointer accent-teal"
      />
      <div className="flex justify-between text-[10px] text-muted mt-1.5">
        <span>Low / Nominal</span>
        <span className="italic">{hint}</span>
        <span>High / Strained</span>
      </div>
    </div>
  );
}

export default function MindSpace() {
  const { moodHistory, addMoodEntry, notes, addNote, deleteNote } = useApp();
  const [mood, setMood] = useState(4);
  const [stress, setStress] = useState(4);
  const [fatigue, setFatigue] = useState(4);
  const [focus, setFocus] = useState(8);
  const [sleepH, setSleepH] = useState('7.5');
  const [sleepQ, setSleepQ] = useState(4);
  const [newNoteText, setNewNoteText] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Quick preset handlers
  const applyPreset = (preset: 'optimal' | 'nominal' | 'workload' | 'fatigued') => {
    if (preset === 'optimal') {
      setMood(5); setStress(2); setFatigue(2); setFocus(9); setSleepQ(5);
    } else if (preset === 'nominal') {
      setMood(4); setStress(4); setFatigue(4); setFocus(8); setSleepQ(4);
    } else if (preset === 'workload') {
      setMood(3); setStress(7); setFatigue(6); setFocus(7); setSleepQ(3);
    } else if (preset === 'fatigued') {
      setMood(2); setStress(8); setFatigue(8); setFocus(4); setSleepQ(2);
    }
  };

  const handleCheckinSubmit = (e: FormEvent) => {
    e.preventDefault();
    addMoodEntry({
      label: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      mood,
      stress,
      fatigue,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleAddJournalNote = (e: FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;
    addNote(newNoteText);
    setNewNoteText('');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="MindSpace"
        subtitle="Confidential astronaut neurocognitive and psychological surveillance. Self-reports calibrate automated fatigue detection and sleep scheduling."
      >
        <div className="flex items-center gap-1.5 text-xs text-muted font-medium bg-white border border-line px-3 py-1.5 rounded-lg shadow-sm">
          <ShieldCheck className="h-4 w-4 text-teal" />
          <span>HIPAA &amp; NASA Bio-Confidential Store</span>
        </div>
      </PageHeader>

      <div className="grid gap-6 xl:grid-cols-5">
        {/* ── LEFT COLUMN: Daily Check-in & Journal (2 Cols) ── */}
        <div className="xl:col-span-2 space-y-6">
          <form
            onSubmit={handleCheckinSubmit}
            className="card p-5 space-y-4"
            aria-label="Daily Check-in Form"
          >
            <div className="border-b border-line pb-3 flex items-center justify-between">
              <div>
                <h2 className="font-display text-sm font-bold text-ink flex items-center gap-2">
                  <Brain className="h-4 w-4 text-teal" />
                  Daily Psychological Check-in
                </h2>
                <p className="text-xs text-muted mt-0.5">Calibrate circadian autonomic baseline</p>
              </div>
              {savedSuccess && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-dark bg-teal/10 px-2 py-0.5 rounded animate-fadeUp">
                  <Check className="h-3 w-3" /> Saved
                </span>
              )}
            </div>

            {/* Quick State Presets */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-muted uppercase tracking-wider">Quick Presets</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5 text-xs">
                {[
                  { id: 'optimal', label: 'Optimal' },
                  { id: 'nominal', label: 'Nominal' },
                  { id: 'workload', label: 'High EVA' },
                  { id: 'fatigued', label: 'Fatigued' },
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => applyPreset(p.id as any)}
                    className="rounded border border-line bg-offwhite px-2 py-1 text-[11px] font-medium text-body hover:bg-white hover:border-teal hover:text-teal-dark transition-all text-center"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Mood selector with Lucide Icons (No emojis) */}
            <fieldset>
              <legend className="mb-2 text-xs font-bold text-ink">Affective Mood State</legend>
              <div className="grid grid-cols-5 gap-1.5">
                {MOOD_ICONS.map((m, i) => {
                  const Icon = m.icon;
                  const isSelected = mood === m.score;
                  return (
                    <button
                      key={m.label}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => setMood(m.score)}
                      className={cx(
                        'flex flex-col items-center justify-center rounded-lg border p-2 text-center transition-all duration-150',
                        isSelected
                          ? 'border-teal bg-teal/10 text-teal-dark font-bold shadow-sm'
                          : 'border-line bg-white text-muted hover:border-line hover:text-ink hover:bg-offwhite'
                      )}
                    >
                      <Icon className={cx('h-5 w-5 mb-1', isSelected ? 'text-teal' : 'text-muted')} />
                      <span className="text-[10px] leading-tight block truncate">{moodLabels[i]}</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            {/* Sleep Inputs */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="sh" className="mb-1 block text-xs font-bold text-ink">Sleep Duration</label>
                <div className="relative">
                  <input
                    id="sh"
                    className="input num pr-8 w-full font-semibold text-ink"
                    type="number"
                    min={0}
                    max={16}
                    step={0.5}
                    value={sleepH}
                    onChange={(e) => setSleepH(e.target.value)}
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-muted pointer-events-none">hrs</span>
                </div>
              </div>
              <div>
                <label htmlFor="sq" className="mb-1 block text-xs font-bold text-ink">Sleep Quality</label>
                <select
                  id="sq"
                  className="input text-xs w-full"
                  value={sleepQ}
                  onChange={(e) => setSleepQ(+e.target.value)}
                >
                  <option value={5}>5/5 · Fully Restorative</option>
                  <option value={4}>4/5 · Good Recovery</option>
                  <option value={3}>3/5 · Moderate / Average</option>
                  <option value={2}>2/5 · Fragmented Sleep</option>
                  <option value={1}>1/5 · Severe Insomnia</option>
                </select>
              </div>
            </div>

            {/* Sliders */}
            <div className="space-y-3 pt-1">
              <InteractiveSlider
                id="st"
                label="Operational Stress Load"
                value={stress}
                onChange={setStress}
                icon={Zap}
                hint="Tension / pressure"
              />
              <InteractiveSlider
                id="fa"
                label="Physical & Muscular Fatigue"
                value={fatigue}
                onChange={setFatigue}
                icon={Activity}
                hint="Cardio exhaustion"
              />
              <InteractiveSlider
                id="fo"
                label="Cognitive Alertness & Focus"
                value={focus}
                onChange={setFocus}
                icon={Brain}
                hint="Executive precision"
              />
            </div>

            <button type="submit" className="btn-primary w-full text-xs py-2 flex items-center justify-center gap-1.5 shadow-sm">
              <Check className="h-4 w-4" />
              Commit Daily Check-in
            </button>
          </form>

          {/* Confidential Flight Diary Notes */}
          <div className="card p-5 space-y-3">
            <div className="border-b border-line pb-2.5 flex items-center justify-between">
              <div>
                <h3 className="font-display text-sm font-bold text-ink flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-teal" />
                  Flight Surgeon Observation Log
                </h3>
                <p className="text-xs text-muted">Confidential journal records ({notes.length} entries)</p>
              </div>
            </div>

            <form onSubmit={handleAddJournalNote} className="space-y-2">
              <textarea
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                placeholder="Log subjective symptoms, microgravity adaptation, or workload notes..."
                className="input text-xs w-full min-h-[70px] resize-none"
              />
              <button
                type="submit"
                disabled={!newNoteText.trim()}
                className="btn-ghost text-xs px-3 py-1.5 border border-line bg-offwhite hover:bg-white flex items-center gap-1 text-ink disabled:opacity-40"
              >
                <Plus className="h-3.5 w-3.5 text-teal" /> Add Journal Entry
              </button>
            </form>

            <ul className="divide-y divide-line max-h-[220px] overflow-y-auto pr-1">
              {notes.length === 0 ? (
                <li className="py-3 text-xs text-muted text-center italic">No observations logged yet.</li>
              ) : (
                notes.map((n) => (
                  <li key={n.id} className="py-2.5 flex items-start justify-between gap-2 text-xs">
                    <div className="min-w-0 flex-1">
                      <p className="text-body leading-relaxed">{n.text}</p>
                      <span className="text-[10px] text-muted font-mono">{timeAgo(n.time)}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteNote(n.id)}
                      className="text-muted hover:text-crit p-1 rounded transition-colors"
                      title="Delete entry"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>

        {/* ── RIGHT COLUMN: 14-Day Trends & Algorithmic Observations (3 Cols) ── */}
        <div className="xl:col-span-3 space-y-6">
          {/* 14-Day Longitudinal Trend Chart */}
          <ChartCard
            title="14-Day Longitudinal Behavioral &amp; Stress Trend"
            subtitle="Automated correlation between self-reported affect, autonomic stress, and physical fatigue indices."
            height={240}
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={moodHistory} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
                <CartesianGrid stroke={grid} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={tick} stroke={grid} minTickGap={24} />
                <YAxis tick={tick} stroke={grid} domain={[0, 10]} />
                <Tooltip {...tooltipProps} />
                <Legend wrapperStyle={{ fontSize: 12, color: '#16324F', paddingTop: 8 }} />
                <Line dataKey="mood" name="Affect Score (1–5)" stroke={C_SECONDARY} strokeWidth={2.5} dot={{ r: 3 }} isAnimationActive={false} />
                <Line dataKey="stress" name="Stress Load (1–10)" stroke={C_PRIMARY} strokeWidth={2} strokeDasharray="4 2" dot={false} isAnimationActive={false} />
                <Line dataKey="fatigue" name="Fatigue Index (1–10)" stroke="#6B8AA6" strokeWidth={1.8} strokeDasharray="2 2" dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Sleep Architecture Breakdown */}
          <ChartCard
            title="Circadian Sleep Architecture &amp; Recovery"
            subtitle="Recorded sleep duration against subjective restorative quality across the orbital mission week."
            height={220}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sleepWeek} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
                <CartesianGrid stroke={grid} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" tick={tick} stroke={grid} />
                <YAxis tick={tick} stroke={grid} domain={[0, 10]} />
                <Tooltip {...tooltipProps} cursor={{ fill: '#F7F9FB' }} />
                <Legend wrapperStyle={{ fontSize: 12, color: '#16324F', paddingTop: 8 }} />
                <Bar dataKey="hours" name="Sleep Duration (Hours)" fill={C_PRIMARY} radius={[4, 4, 0, 0]} isAnimationActive={false} />
                <Bar dataKey="quality" name="Restorative Quality (1–5)" fill={C_SECONDARY} radius={[4, 4, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Algorithmic Behavioral Insights */}
          <section className="card p-5" aria-label="Behavioral Analysis">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="h-4 w-4 text-teal" />
              <h3 className="font-display text-sm font-bold text-ink">Algorithmic Behavioral Observations</h3>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {behavioralInsights.map((insight, idx) => (
                <div key={idx} className="rounded-lg bg-offwhite border border-line p-3.5 text-xs text-body leading-relaxed flex items-start gap-2.5">
                  <span className="h-2 w-2 rounded-full bg-teal shrink-0 mt-1" />
                  <p>{insight}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      <DemoNotice />
    </div>
  );
}