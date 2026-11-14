import { Inbox } from 'lucide-react';

interface Props { title: string; hint?: string }

export default function EmptyState({ title, hint }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
      <div className="mb-3 grid h-10 w-10 place-items-center rounded-full bg-offwhite border border-border">
        <Inbox className="h-5 w-5 text-muted/50" aria-hidden />
      </div>
      <p className="text-sm font-medium text-body">{title}</p>
      {hint && <p className="mt-1 text-xs text-muted max-w-xs">{hint}</p>}
    </div>
  );
}
