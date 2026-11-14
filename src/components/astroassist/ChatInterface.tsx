import { useEffect, useRef, useState } from 'react';
import { Bot, Send, User, RotateCcw } from 'lucide-react';
import type { ChatMessage } from '../../types';
import { cx } from '../../utils';

interface Props {
  respond: (q: string) => Promise<string>;
  suggestions: string[];
  demo?: boolean;
}

const stamp = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
let uid = Date.now();
const mk = (role: ChatMessage['role'], text: string, demo?: boolean): ChatMessage => ({
  id: `c-${++uid}`,
  role,
  text,
  time: stamp(),
  demo,
});

const DEFAULT_INTRO =
  'Greetings Crew Member. I am AstroAssist, your autonomous clinical intelligence system. Ask me about your telemetry drift, circadian sleep indicators, active flight alerts, or cabin atmospheric conditions.';

export default function ChatInterface({ respond, suggestions, demo = true }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem('vyoma_chat_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return [mk('assistant', DEFAULT_INTRO, demo)];
  });

  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem('vyoma_chat_history', JSON.stringify(messages));
    } catch {
      // storage unavailable
    }
    if (box.current) {
      box.current.scrollTop = box.current.scrollHeight;
    }
  }, [messages, busy]);

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || busy) return;
    setMessages((m) => [...m, mk('user', q)]);
    setInput('');
    setBusy(true);

    try {
      const a = await respond(q);
      setMessages((m) => [...m, mk('assistant', a, demo)]);
    } catch {
      setMessages((m) => [
        ...m,
        mk('assistant', 'Unable to reach the clinical analysis engine. Check network synchronization and try again.'),
      ]);
    } finally {
      setBusy(false);
    }
  };

  const handleClear = () => {
    const reset = [mk('assistant', DEFAULT_INTRO, demo)];
    setMessages(reset);
    localStorage.removeItem('vyoma_chat_history');
  };

  return (
    <section className="card flex h-[calc(100vh-14rem)] min-h-[500px] flex-col" aria-label="AstroAssist clinical dialog">
      {/* ── Dialog Header ── */}
      <header className="flex items-center justify-between border-b border-line px-5 py-3.5 bg-offwhite/40">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-navy text-white">
            <Bot className="h-4.5 w-4.5" aria-hidden />
          </div>
          <div>
            <h2 className="font-display text-sm font-semibold text-ink">AstroAssist Clinical Intelligence</h2>
            <p className="text-[11px] text-muted">
              {demo ? 'Offline heuristic model · simulated telemetry context' : 'Connected to onboard neural core'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleClear}
            title="Reset conversation"
            aria-label="Reset conversation"
            className="text-[11px] font-medium text-muted hover:text-ink flex items-center gap-1 border border-line rounded px-2 py-1 bg-white hover:bg-offwhite transition-colors"
          >
            <RotateCcw className="h-3 w-3" />
            <span className="hidden sm:inline">Reset</span>
          </button>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-teal">
            <span className="h-1.5 w-1.5 rounded-full bg-teal animate-pulseDot" aria-hidden />
            <span>Active</span>
          </div>
        </div>
      </header>

      {/* ── Message Log ── */}
      <div ref={box} className="flex-1 space-y-4 overflow-y-auto p-5" role="log" aria-live="polite">
        {messages.map((m) => (
          <div key={m.id} className={cx('flex gap-3', m.role === 'user' ? 'flex-row-reverse' : 'flex-row')}>
            <span
              className={cx(
                'grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold',
                m.role === 'user' ? 'bg-navy text-white' : 'bg-teal/15 text-teal-dark border border-teal/20'
              )}
            >
              {m.role === 'user' ? <User className="h-4 w-4" aria-hidden /> : <Bot className="h-4 w-4" aria-hidden />}
            </span>

            <div
              className={cx(
                'max-w-[80%] rounded-xl px-4 py-3 text-sm leading-relaxed shadow-sm',
                m.role === 'user'
                  ? 'bg-navy text-white rounded-tr-sm'
                  : 'bg-white border border-line text-ink rounded-tl-sm'
              )}
            >
              <p className="whitespace-pre-line">{m.text}</p>
              <p className={cx('num mt-1.5 text-[11px]', m.role === 'user' ? 'text-white/60' : 'text-muted')}>
                {m.time}{m.demo && ' · synthetic response'}
              </p>
            </div>
          </div>
        ))}

        {busy && (
          <div className="flex items-center gap-2 text-xs text-muted py-1" role="status">
            <span className="h-1.5 w-1.5 rounded-full bg-teal animate-pulseDot" />
            <span>AstroAssist is analyzing clinical parameters…</span>
          </div>
        )}
      </div>

      {/* ── Footer / Suggestions & Input ── */}
      <div className="space-y-3 border-t border-line p-4 bg-offwhite/30">
        <div className="flex flex-wrap gap-1.5">
          {suggestions.map((s) => (
            <button
              key={s}
              className="chip chip-off text-[11px]"
              onClick={() => send(s)}
              disabled={busy}
            >
              {s}
            </button>
          ))}
        </div>

        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <input
            className="input text-sm"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Query health patterns, sleep correlations, or medical triage guidelines…"
            aria-label="Health query input"
            disabled={busy}
          />
          <button
            className="btn-primary shrink-0"
            type="submit"
            disabled={busy || !input.trim()}
            aria-label="Send message"
          >
            <Send className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">Ask</span>
          </button>
        </form>
      </div>
    </section>
  );
}
