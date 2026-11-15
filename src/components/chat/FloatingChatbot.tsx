import { useEffect, useRef, useState } from 'react';
import {
  Bot,
  Send,
  User,
  X,
  Minimize2,
  RotateCcw,
  Sparkles,
  AlertTriangle,
  Activity,
  Heart,
  ChevronUp,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { sendChat, type AssistantChatResponse } from '../../services/healthService';
import { cx } from '../../utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  time: string;
}

function renderInline(str: string) {
  const parts = str.split(/(\*\*.*?\*\*|`.*?`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold text-ink">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={i}
          className="font-mono bg-navy/5 text-teal-dark px-1 py-0.2 rounded text-[11px] font-semibold border border-line"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

function FormattedMessage({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <div className="space-y-1 text-xs leading-relaxed">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={idx} className="h-1" />;
        }
        if (trimmed.startsWith('### ')) {
          return (
            <h4 key={idx} className="font-display text-xs font-bold text-ink mt-2 mb-1">
              {trimmed.replace('### ', '')}
            </h4>
          );
        }
        if (trimmed.startsWith('- ') || trimmed.startsWith('• ') || trimmed.startsWith('* ')) {
          const itemText = trimmed.replace(/^[-•*]\s+/, '');
          return (
            <div key={idx} className="flex items-start gap-1.5 pl-1 my-0.5">
              <span className="text-teal font-bold leading-none mt-0.5">•</span>
              <span>{renderInline(itemText)}</span>
            </div>
          );
        }
        return <p key={idx}>{renderInline(trimmed)}</p>;
      })}
    </div>
  );
}

const DEFAULT_ACTIONS = [
  'Summarize my vitals',
  'Is my heart rate normal?',
  'Explain open alerts',
  'Pre-EVA readiness check',
];

const INITIAL_MESSAGE: Message = {
  id: 'init-1',
  role: 'assistant',
  content:
    'Greetings Astronaut. I am AstroAssist, your autonomous flight medical intelligence assistant. I monitor your live vitals, baselines, and safety alerts in real time. How can I assist your mission health today?',
  time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
};

export default function FloatingChatbot() {
  const { profile, alerts } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestedActions, setSuggestedActions] = useState<string[]>(DEFAULT_ACTIONS);
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = sessionStorage.getItem('vyoma_floating_chat');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return [INITIAL_MESSAGE];
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Unacknowledged alert count
  const unackAlerts = alerts.filter((a) => !a.acknowledged).length;

  // Persist messages across page navigation
  useEffect(() => {
    try {
      sessionStorage.setItem('vyoma_floating_chat', JSON.stringify(messages));
    } catch {
      // storage unavailable
    }
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSend = async (textToSend: string) => {
    const q = textToSend.trim();
    if (!q || loading) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: q,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // Extract numeric id if available
      const astroIdNum = parseInt(profile.id.replace(/\D/g, ''), 10) || 1;
      const historyPayload = messages.slice(-4).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res: AssistantChatResponse = await sendChat(q, astroIdNum, historyPayload);

      const botMsg: Message = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: res.reply,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
      };

      setMessages((prev) => [...prev, botMsg]);
      if (res.suggested_actions && res.suggested_actions.length > 0) {
        setSuggestedActions(res.suggested_actions);
      }
    } catch {
      const errorMsg: Message = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content:
          '⚠️ Telemetry uplink interruption. Could not reach onboard medical core. Please re-try in a moment or verify station connectivity.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setMessages([INITIAL_MESSAGE]);
    setSuggestedActions(DEFAULT_ACTIONS);
    sessionStorage.removeItem('vyoma_floating_chat');
  };

  return (
    <>
      {/* ── Floating Launcher Button (Minimized) ── */}
      {!isOpen && (
        <aside
          aria-label="AstroAssist Chat Launcher"
          className="fixed bottom-5 right-5 z-40 flex items-center gap-2"
        >
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="group flex items-center gap-2.5 rounded-full bg-navy px-4 py-2.5 text-white shadow-xl hover:bg-navy-dark hover:shadow-2xl transition-all duration-200 border border-teal/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
            aria-label="Open AstroAssist Chatbot"
          >
            <div className="relative grid h-7 w-7 place-items-center rounded-full bg-teal text-white shadow-inner group-hover:scale-105 transition-transform">
              <Bot className="h-4 w-4" />
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 animate-pulseDot ring-2 ring-navy" />
            </div>

            <div className="text-left hidden sm:block">
              <div className="flex items-center gap-1.5 leading-none">
                <span className="font-display text-xs font-bold tracking-wider">AstroAssist</span>
                <Sparkles className="h-3 w-3 text-teal-soft" />
              </div>
              <span className="text-[10px] text-white/60 font-mono leading-none">
                {profile.id || 'AST-001'} · Medical AI
              </span>
            </div>

            {/* Unack alert badge */}
            {unackAlerts > 0 && (
              <span
                className="grid h-5 min-w-5 place-items-center rounded-full bg-crit px-1 text-[11px] font-bold text-white shadow-sm ml-1"
                title={`${unackAlerts} active alerts`}
              >
                {unackAlerts}
              </span>
            )}
          </button>
        </aside>
      )}

      {/* ── Expanded Chat Window ── */}
      {isOpen && (
        <section
          aria-label="AstroAssist Medical Intelligence Chat"
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex flex-col w-[390px] sm:w-[430px] max-w-[calc(100vw-1.5rem)] h-[580px] max-h-[calc(100vh-5rem)] rounded-2xl bg-white shadow-2xl border border-line overflow-hidden animate-slideUp transition-all duration-200"
          style={{ boxShadow: '0 20px 45px -10px rgba(22, 50, 79, 0.35)' }}
        >
          {/* Header */}
          <header className="flex items-center justify-between border-b border-white/10 bg-navy px-4 py-3 text-white shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="relative grid h-8 w-8 place-items-center rounded-lg bg-teal text-white shadow">
                <Bot className="h-4.5 w-4.5" />
                <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-navy animate-pulseDot" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-display text-sm font-bold tracking-wide">AstroAssist AI</h3>
                  <span className="rounded bg-teal/20 px-1.5 py-0.2 text-[9px] font-bold font-mono text-teal-soft border border-teal/30 uppercase">
                    Live Telemetry
                  </span>
                </div>
                <p className="text-[11px] text-white/60 font-mono truncate max-w-[200px]">
                  Subject: {profile.name} ({profile.id || 'AST-001'})
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleClear}
                title="Reset conversation"
                className="grid h-7 w-7 place-items-center rounded text-white/60 hover:bg-white/10 hover:text-white transition-colors"
                aria-label="Reset chat history"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Minimize chat"
                className="grid h-7 w-7 place-items-center rounded text-white/60 hover:bg-white/10 hover:text-white transition-colors"
                aria-label="Minimize chatbot"
              >
                <Minimize2 className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Close chat"
                className="grid h-7 w-7 place-items-center rounded text-white/60 hover:bg-white/10 hover:text-white transition-colors"
                aria-label="Close chatbot"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </header>

          {/* Context Banner */}
          <div className="flex items-center justify-between border-b border-line bg-offwhite/80 px-3.5 py-1.5 text-[11px] text-muted shrink-0">
            <span className="flex items-center gap-1.5 font-medium">
              <Activity className="h-3.5 w-3.5 text-teal" />
              PostgreSQL Telemetry Linked
            </span>
            {unackAlerts > 0 ? (
              <span className="flex items-center gap-1 font-bold text-crit">
                <AlertTriangle className="h-3 w-3" />
                {unackAlerts} open alert(s)
              </span>
            ) : (
              <span className="flex items-center gap-1 font-semibold text-teal-dark">
                <span className="h-1.5 w-1.5 rounded-full bg-teal" />
                Vitals Nominal
              </span>
            )}
          </div>

          {/* Messages Scroll View */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-offwhite/20 scrollbar-thin scrollbar-thumb-line"
            role="log"
            aria-live="polite"
          >
            {messages.map((m) => (
              <div
                key={m.id}
                className={cx('flex gap-2.5', m.role === 'user' ? 'flex-row-reverse' : 'flex-row')}
              >
                <span
                  className={cx(
                    'grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold mt-0.5',
                    m.role === 'user'
                      ? 'bg-navy text-white shadow-sm'
                      : 'bg-teal/15 text-teal-dark border border-teal/30 shadow-sm'
                  )}
                >
                  {m.role === 'user' ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                </span>

                <div
                  className={cx(
                    'max-w-[85%] rounded-2xl px-3.5 py-2.5 shadow-sm transition-all',
                    m.role === 'user'
                      ? 'bg-navy text-white rounded-tr-none'
                      : 'bg-white border border-line text-body rounded-tl-none'
                  )}
                >
                  {m.role === 'user' ? (
                    <p className="text-xs leading-relaxed whitespace-pre-wrap">{m.content}</p>
                  ) : (
                    <FormattedMessage text={m.content} />
                  )}
                  <p
                    className={cx(
                      'num mt-1 text-[10px] text-right',
                      m.role === 'user' ? 'text-white/50' : 'text-muted'
                    )}
                  >
                    {m.time}
                  </p>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2.5 text-xs text-muted py-2" role="status">
                <div className="grid h-7 w-7 place-items-center rounded-full bg-teal/15 text-teal-dark border border-teal/30">
                  <Bot className="h-3.5 w-3.5 animate-pulse" />
                </div>
                <div className="flex items-center gap-1.5 rounded-2xl bg-white border border-line px-3 py-2 text-xs shadow-sm">
                  <span className="h-2 w-2 rounded-full bg-teal animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="h-2 w-2 rounded-full bg-teal animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="h-2 w-2 rounded-full bg-teal animate-bounce" style={{ animationDelay: '300ms' }} />
                  <span className="text-[11px] text-muted ml-1">Analyzing telemetry...</span>
                </div>
              </div>
            )}
          </div>

          {/* Quick Prompts / Suggested Actions */}
          <div className="border-t border-line/60 bg-white px-3 py-2 shrink-0">
            <div className="flex items-center gap-1 mb-1.5">
              <Sparkles className="h-2.5 w-2.5 text-teal" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Suggested Queries</span>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-16 overflow-y-auto">
              {suggestedActions.map((action) => (
                <button
                  key={action}
                  type="button"
                  onClick={() => handleSend(action)}
                  disabled={loading}
                  className="rounded-full bg-offwhite hover:bg-teal/10 hover:text-teal-dark hover:border-teal/30 border border-line px-2.5 py-1 text-[11px] font-medium text-body transition-colors disabled:opacity-50"
                >
                  {action}
                </button>
              ))}
            </div>
          </div>

          {/* Input Bar */}
          <footer className="border-t border-line bg-offwhite/50 p-2.5 shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend(input);
              }}
              className="flex items-center gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about vitals, alerts, EVA readiness..."
                disabled={loading}
                className="flex-1 rounded-xl border border-line bg-white px-3.5 py-2 text-xs text-ink placeholder:text-muted/70 focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="grid h-8 w-8 place-items-center rounded-xl bg-teal text-white hover:bg-teal-dark transition-colors disabled:opacity-40 disabled:hover:bg-teal"
                aria-label="Send message"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
          </footer>
        </section>
      )}
    </>
  );
}
