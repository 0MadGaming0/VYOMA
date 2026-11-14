import { AlertOctagon, AlertTriangle, CheckCircle2, Info, type LucideIcon } from 'lucide-react';
import type { Status } from '../../types';
import { cx } from '../../utils';

export const STATUS_STYLE: Record<Status, {
  label: string; icon: LucideIcon; text: string;
  badge: string; borderL: string; hex: string;
}> = {
  normal:   { label: 'Normal',   icon: CheckCircle2,  text: 'text-teal',   badge: 'text-teal-dark bg-teal/10 border-teal/30',   borderL: 'border-l-teal',  hex: '#2A9D8F' },
  info:     { label: 'Info',     icon: Info,           text: 'text-info',   badge: 'text-info bg-info/10 border-info/25',         borderL: 'border-l-info',  hex: '#3A7FC1' },
  warning:  { label: 'Warning',  icon: AlertTriangle,  text: 'text-warn',   badge: 'text-warn bg-warn/10 border-warn/30',         borderL: 'border-l-warn',  hex: '#E8972D' },
  critical: { label: 'Critical', icon: AlertOctagon,   text: 'text-crit',   badge: 'text-crit bg-crit/10 border-crit/30',         borderL: 'border-l-crit',  hex: '#C0392B' },
};

export default function HealthStatusBadge({
  status, label, className,
}: { status: Status; label?: string; className?: string }) {
  const s = STATUS_STYLE[status];
  const Icon = s.icon;
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] font-semibold',
        s.badge, className,
      )}
    >
      <Icon className="h-3 w-3 shrink-0" aria-hidden />
      {label ?? s.label}
    </span>
  );
}
