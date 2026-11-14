import type { ReactNode } from 'react';
import { cx } from '../../utils';

interface Props {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  height?: number;
}

export default function ChartCard({
  title, subtitle, actions, children, className, height = 260,
}: Props) {
  return (
    <section className={cx('card p-5 flex flex-col gap-4', className)} aria-label={title}>
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-ink">{title}</h3>
          {subtitle && <p className="text-xs text-muted mt-0.5">{subtitle}</p>}
        </div>
        {actions && <div>{actions}</div>}
      </header>
      <div style={{ height }} className="w-full min-w-0 overflow-hidden">
        {children}
      </div>
    </section>
  );
}
