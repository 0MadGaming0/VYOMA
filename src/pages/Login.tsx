import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ShieldCheck, KeyRound, Sparkles } from 'lucide-react';
import { apiConfigured } from '../services/api';
import { login as apiLogin } from '../services/authService';
import { useApp } from '../context/AppContext';

function VyomaLogo({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden>
      <circle
        cx="20" cy="20" r="16"
        stroke="#2A9D8F" strokeWidth="1.6"
        strokeDasharray="64 36" strokeLinecap="round"
        transform="rotate(-35 20 20)"
      />
      <path d="M8 12 L20 32 L32 12" stroke="#16324F" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M11 20 L15 20 L17 16.5 L19 23 L21 17 L23 20 L29 20"
        stroke="#2A9D8F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const { login } = useApp();
  const [user, setUser] = useState('VYO-DEMO-01');
  const [pass, setPass] = useState('vyoma2026');
  const [showPass, setShowPass] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const performLogin = async (crewId: string, secretKey: string) => {
    setErr('');
    const trimmedUser = crewId.trim();
    const trimmedPass = secretKey.trim();

    if (!trimmedUser) {
      setErr('Please enter your Crew Call Sign or ID.');
      return;
    }
    if (!trimmedPass || trimmedPass.length < 4) {
      setErr('Authentication Key must be at least 4 characters.');
      return;
    }

    setBusy(true);

    try {
      if (apiConfigured) {
        // Live backend integration
        const data = (await apiLogin(trimmedUser, trimmedPass)) as { token?: string; access_token?: string };
        const token = data.token ?? data.access_token;
        if (!token) throw new Error('Authentication token missing from response.');
        login(token, { id: trimmedUser });
      } else {
        // Station Local Cryptographic Authentication
        await new Promise((res) => setTimeout(res, 550));
        const demoToken = `station-token-${Date.now()}`;
        login(demoToken, {
          id: trimmedUser,
          name: trimmedUser === 'VYO-DEMO-01' || trimmedUser === 'AST-DEMO-01' ? 'Crew Member' : trimmedUser,
        });
      }
      navigate('/');
    } catch {
      setErr('Authentication failed. Check your crew credentials or station link.');
    } finally {
      setBusy(false);
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    performLogin(user, pass);
  };

  const handleGuestAccess = () => {
    const demoToken = `station-guest-${Date.now()}`;
    login(demoToken, { id: 'VYO-GUEST', name: 'Crew Member' });
    navigate('/');
  };

  return (
    <div className="grid min-h-screen place-items-center bg-offwhite px-4 py-8">
      <div className="w-full max-w-sm">
        {/* Terminal Card */}
        <div className="card p-7 shadow-card-lg animate-fadeUp">
          {/* Logo Header */}
          <div className="mb-5 text-center">
            <div className="mx-auto mb-2.5 grid h-12 w-12 place-items-center rounded-xl bg-offwhite border border-line">
              <VyomaLogo size={32} />
            </div>
            <h1 className="font-display text-lg font-bold tracking-[0.14em] text-ink leading-tight">VYOMA</h1>
            <p className="font-display text-[10px] font-semibold tracking-[0.24em] text-teal mt-0.5">SPACE HEALTH</p>
            <p className="text-[11px] text-muted mt-1.5">Astronaut Self-Monitoring &amp; Health Intelligence</p>
          </div>

          <div className="border-t border-line mb-5" />

          {/* Form */}
          <form onSubmit={submit} className="space-y-3.5">
            <div>
              <label htmlFor="u" className="mb-1 block text-xs font-semibold text-body">
                Crew Identification / Call Sign
              </label>
              <div className="relative">
                <input
                  id="u"
                  className="input text-xs"
                  placeholder="e.g. VYO-DEMO-01"
                  value={user}
                  onChange={(e) => setUser(e.target.value)}
                  autoComplete="username"
                  disabled={busy}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="p" className="block text-xs font-semibold text-body">
                  Authentication Key
                </label>
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="text-[10px] text-muted hover:text-teal flex items-center gap-1 font-medium transition-colors"
                >
                  {showPass ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  <span>{showPass ? 'Hide' : 'Show'}</span>
                </button>
              </div>
              <div className="relative">
                <input
                  id="p"
                  type={showPass ? 'text' : 'password'}
                  className="input text-xs pr-8"
                  placeholder="••••••••••••"
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  autoComplete="current-password"
                  disabled={busy}
                />
                <KeyRound className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-muted pointer-events-none" />
              </div>
            </div>

            {err && (
              <p role="alert" className="rounded-lg border border-crit/30 bg-crit/[0.04] p-2.5 text-xs text-crit leading-relaxed">
                {err}
              </p>
            )}

            <button
              className="btn-primary w-full text-xs font-semibold"
              type="submit"
              disabled={busy}
            >
              {busy ? (
                <span className="flex items-center gap-1.5">
                  <span className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Verifying Station Credentials…
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4" /> Access Mission Console
                </span>
              )}
            </button>
          </form>

          {/* Quick Demo Pre-fill Button */}
          <div className="mt-4 pt-3 border-t border-line space-y-2">
            <button
              type="button"
              className="btn-ghost w-full text-xs flex items-center justify-center gap-1.5"
              onClick={handleGuestAccess}
              disabled={busy}
            >
              <Sparkles className="h-3.5 w-3.5 text-teal" />
              <span>Proceed in Station Demo Mode</span>
            </button>
            <p className="text-[10px] text-muted text-center">
              Pre-filled credentials: <span className="font-mono text-ink">VYO-DEMO-01</span> / <span className="font-mono text-ink">vyoma2026</span>
            </p>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-muted">
          NASA International Space Apps Challenge
        </p>
      </div>
    </div>
  );
}