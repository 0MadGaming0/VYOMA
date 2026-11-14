import { FlaskConical, Database } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface Props { text?: string }

export default function DemoNotice({ text }: Props) {
  const { apiConnected, dbConnected } = useApp();

  return (
    <footer className="mt-10 pt-4 border-t border-border flex items-center justify-between text-xs text-muted" role="contentinfo">
      <div className="flex items-center gap-2">
        {apiConnected ? (
          <Database className="h-3.5 w-3.5 text-teal shrink-0" aria-hidden />
        ) : (
          <FlaskConical className="h-3.5 w-3.5 text-amber-500 shrink-0" aria-hidden />
        )}
        <span>
          {text ??
            (apiConnected
              ? `VYOMA Health Intelligence · Live FastAPI + PostgreSQL ${dbConnected ? '(Healthy)' : ''} · Automated Alert Engine Active`
              : 'Station cache mode · Operational telemetry simulation · Prototype triage rules')}
        </span>
      </div>
      <span className="text-[10px] font-mono text-muted hidden sm:inline">NASA STD-3001 Reference Spec</span>
    </footer>
  );
}
