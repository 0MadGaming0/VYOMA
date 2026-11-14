export default function LoadingState() {
  return (
    <div className="flex items-center justify-center gap-2 py-8" role="status" aria-label="Loading">
      <span className="h-2 w-2 rounded-full bg-teal animate-pulseDot" style={{ animationDelay: '0ms' }} />
      <span className="h-2 w-2 rounded-full bg-teal animate-pulseDot" style={{ animationDelay: '220ms' }} />
      <span className="h-2 w-2 rounded-full bg-teal animate-pulseDot" style={{ animationDelay: '440ms' }} />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
