import { cx } from '../../utils';

interface Props {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}

export default function Toggle({ label, hint, checked, onChange }: Props) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 py-2.5 border-b border-border/60 last:border-0">
      <div className="min-w-0">
        <span className="block text-sm font-medium text-ink">{label}</span>
        {hint && <span className="block text-xs text-muted mt-0.5">{hint}</span>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cx(
          'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 transition-colors duration-200',
          checked
            ? 'border-teal bg-teal'
            : 'border-border bg-ghost',
        )}
      >
        <span
          className={cx(
            'pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform duration-200',
            checked ? 'translate-x-4' : 'translate-x-0',
          )}
          style={{ margin: '1px' }}
        />
      </button>
    </label>
  );
}
