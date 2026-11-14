import { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';

const W = 720, H = 150, SECONDS = 4;
const g = (t: number, mu: number, a: number, w: number) => a * Math.exp(-(((t - mu) / w) ** 2));
const beat = (p: number) =>
  g(p, 0.15, 0.12, 0.035) + g(p, 0.28, -0.12, 0.012) +
  g(p, 0.31, 1, 0.009) + g(p, 0.34, -0.25, 0.012) +
  g(p, 0.58, 0.26, 0.05);

/** Synthetic ECG-style trace driven by the current BPM. Simulated, not a real signal. */
export default function EcgWaveform({ bpm, paused }: { bpm: number; paused?: boolean }) {
  const { settings } = useApp();
  const [phase, setPhase] = useState(0);
  const animate = !paused && !settings.reduceMotion;

  useEffect(() => {
    if (!animate) return;
    const id = setInterval(() => setPhase((p) => p + 0.05), 50);
    return () => clearInterval(id);
  }, [animate]);

  const bps = bpm / 60;
  let d = '';
  for (let x = 0; x <= W; x += 2) {
    const t = phase - ((W - x) / W) * SECONDS;
    const c = (((t * bps) % 1) + 1) % 1;
    const y = H * 0.72 - beat(c) * H * 0.58;
    d += `${x === 0 ? 'M' : 'L'}${x},${y.toFixed(1)} `;
  }

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-full w-full"
      role="img"
      aria-label={`Simulated ECG waveform at ${bpm} beats per minute`}
      preserveAspectRatio="none"
    >
      <defs>
        {/* White background grid */}
        <pattern id="ecg-grid" width="36" height="30" patternUnits="userSpaceOnUse">
          <path d="M36 0H0V30" fill="none" stroke="#E8EFF6" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width={W} height={H} fill="#FFFFFF" />
      <rect width={W} height={H} fill="url(#ecg-grid)" />
      {/* Teal waveform */}
      <path
        d={d}
        fill="none"
        stroke="#2A9D8F"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
