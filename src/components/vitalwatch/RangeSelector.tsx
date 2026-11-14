import type { Range } from '../../types';
import { RANGES } from '../../data/mockData';
import { cx } from '../../utils';

export default function RangeSelector({ value, onChange }: { value: Range; onChange: (r: Range) => void }) {
  return (
    <div role="group" aria-label="Time range" className="flex flex-wrap gap-1.5">
      {RANGES.map((r) => (
        <button
          key={r}
          type="button"
          onClick={() => onChange(r)}
          aria-pressed={value === r}
          className={cx('chip num', value === r ? 'chip-on' : 'chip-off')}
        >
          {r === 'LIVE' && (
            <span
              className={cx(
                'mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-crit align-middle',
                value === 'LIVE' ? 'animate-pulseDot' : 'opacity-40',
              )}
              aria-hidden
            />
          )}
          {r}
        </button>
      ))}
    </div>
  );
}
