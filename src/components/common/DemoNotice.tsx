import { FlaskConical } from 'lucide-react';

interface Props { text?: string }

export default function DemoNotice({ text }: Props) {
  return (
    <footer className="mt-10 pt-4 border-t border-border flex items-center gap-2 text-xs text-muted" role="contentinfo">
      <FlaskConical className="h-3.5 w-3.5 text-teal shrink-0" aria-hidden />
      <span>
        {text ??
          'Simulated telemetry · Demo astronaut · Not clinically validated · Not NASA-endorsed'}
      </span>
    </footer>
  );
}
