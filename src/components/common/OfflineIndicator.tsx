import { useApp } from '../../context/AppContext';

export default function OfflineIndicator() {
  const { online } = useApp();

  if (online) return null;

  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-warn/30 bg-warn/8 px-2.5 py-1 text-xs font-semibold text-warn">
      <span className="h-1.5 w-1.5 rounded-full bg-warn animate-pulseDot" aria-hidden />
      Offline
    </span>
  );
}
