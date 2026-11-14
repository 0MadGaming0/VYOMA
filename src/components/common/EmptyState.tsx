import { Inbox } from 'lucide-react';

interface Props {
  title: string;
  hint?: string;
  /** 'data' shows the No-Data space illustration; 'alerts' shows the No-Alerts shield. */
  variant?: 'data' | 'alerts' | 'default';
}

export default function EmptyState({ title, hint, variant = 'default' }: Props) {
  const img =
    variant === 'data'
      ? '/assets/empty-data.jpg'
      : variant === 'alerts'
      ? '/assets/empty-alerts.jpg'
      : null;

  return (
    <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
      {img ? (
        <div className="mb-4 w-28 h-20 rounded-xl overflow-hidden border border-border shadow-sm">
          <img src={img} alt="" className="h-full w-full object-cover object-center" aria-hidden />
        </div>
      ) : (
        <div className="mb-3 grid h-10 w-10 place-items-center rounded-full bg-offwhite border border-border">
          <Inbox className="h-5 w-5 text-muted/50" aria-hidden />
        </div>
      )}
      <p className="text-sm font-medium text-body">{title}</p>
      {hint && <p className="mt-1 text-xs text-muted max-w-xs">{hint}</p>}
    </div>
  );
}
