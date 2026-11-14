import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ShieldCheck, KeyRound, UserPlus, Sparkles } from 'lucide-react';
import { login as apiLogin, register as apiRegister } from '../services/authService';
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

type Tab = 'signin' | 'register';

export default function Login() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useApp();
  const [tab, setTab] = useState<Tab>('signin');

  // Sign In state
  const [identifier, setIdentifier] = useState('testcrew@vyoma.space');
  const [pass, setPass] = useState('SecurePass2026!');
  const [showPass, setShowPass] = useState(false);

  // Register state
  const [regCode, setRegCode] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPass, setRegPass] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [showRegPass, setShowRegPass] = useState(false);
  const [showRegConfirm, setShowRegConfirm] = useState(false);

  // Shared state
  const [err, setErr] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [busy, setBusy] = useState(false);

  // Redirect authenticated users to their dashboard
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const switchTab = (t: Tab) => {
    setTab(t);
    setErr('');
    setSuccessMsg('');
  };

  // ── Sign In ──────────────────────────────────────────────────────────────────
  const handleSignIn = async (e: FormEvent) => {
    e.preventDefault();
    setErr('');
    const trimmedUser = identifier.trim();
    const trimmedPass = pass.trim();

    if (!trimmedUser) { setErr('Please enter your Email or Astronaut ID.'); return; }
    if (!trimmedPass) { setErr('Please enter your password.'); return; }

    setBusy(true);
    try {
      const data = await apiLogin(trimmedUser, trimmedPass);
      if (data?.access_token) {
        login(data.access_token, { id: data.email, name: data.name });
        navigate('/', { replace: true });
      }
    } catch (error: any) {
      const detail = error?.response?.data?.detail;
      setErr(typeof detail === 'string' ? detail : 'Invalid credentials or authentication failed. Check your station link.');
    } finally {
      setBusy(false);
    }
  };

  // ── Register ─────────────────────────────────────────────────────────────────
  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setErr('');
    setSuccessMsg('');

    if (!regEmail.trim()) { setErr('Please enter your email address.'); return; }
    if (regPass.length < 8) { setErr('Password must be at least 8 characters.'); return; }
    if (regPass !== regConfirm) { setErr('Passwords do not match.'); return; }

    setBusy(true);
    try {
      const data = await apiRegister(regCode.trim() || undefined, regEmail.trim(), regPass, regConfirm);
      if (data?.access_token) {
        login(data.access_token, { id: data.email, name: data.name });
        navigate('/', { replace: true });
      }
    } catch (error: any) {
      const detail = error?.response?.data?.detail;
      setErr(typeof detail === 'string' ? detail : 'Registration failed. Please check your details and try again.');
    } finally {
      setBusy(false);
    }
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

          {/* Tab Switcher */}
          <div className="flex border-b border-line mb-5">
            <button
              type="button"
              className={`flex-1 py-2 text-xs font-semibold transition-colors ${
                tab === 'signin'
                  ? 'text-teal border-b-2 border-teal -mb-px'
                  : 'text-muted hover:text-body'
              }`}
              onClick={() => switchTab('signin')}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`flex-1 py-2 text-xs font-semibold transition-colors ${
                tab === 'register'
                  ? 'text-teal border-b-2 border-teal -mb-px'
                  : 'text-muted hover:text-body'
              }`}
              onClick={() => switchTab('register')}
            >
              Register
            </button>
          </div>

          {/* ── Sign In Form ──────────────────────────────────────────────── */}
          {tab === 'signin' && (
            <form onSubmit={handleSignIn} className="space-y-3.5">
              <div>
                <label htmlFor="u" className="mb-1 block text-xs font-semibold text-body">
                  Email or Astronaut ID
                </label>
                <div className="relative">
                  <input
                    id="u"
                    className="input text-xs"
                    placeholder="e.g. AST-001 or crew@vyoma.space"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    autoComplete="username"
                    disabled={busy}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="p" className="block text-xs font-semibold text-body">
                    Password
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

              <button className="btn-primary w-full text-xs font-semibold" type="submit" disabled={busy}>
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

              {/* Quick-fill for provisioned accounts */}
              <div className="mt-1 pt-3 border-t border-line space-y-2">
                <button
                  type="button"
                  className="btn-ghost w-full text-xs flex items-center justify-center gap-1.5"
                  onClick={() => { setIdentifier('testcrew@vyoma.space'); setPass('SecurePass2026!'); setErr(''); }}
                  disabled={busy}
                >
                  <Sparkles className="h-3.5 w-3.5 text-teal" />
                  <span>Fill Provisioned Crew Account</span>
                </button>
                <p className="text-[10px] text-muted text-center">
                  Account: <span className="font-mono text-ink">testcrew@vyoma.space</span> / <span className="font-mono text-ink">AST-001</span>
                </p>
              </div>
            </form>
          )}

          {/* ── Register Form ─────────────────────────────────────────────── */}
          {tab === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div>
                <label htmlFor="reg-code" className="mb-1 block text-xs font-semibold text-body">
                  Astronaut Code <span className="text-[10px] text-muted font-normal">(optional)</span>
                </label>
                <input
                  id="reg-code"
                  className="input text-xs"
                  placeholder="e.g. AST-003 (auto-assigned if empty)"
                  value={regCode}
                  onChange={(e) => setRegCode(e.target.value)}
                  autoComplete="off"
                  disabled={busy}
                />
                <p className="mt-1 text-[10px] text-muted">
                  Custom or assigned code (e.g. AST-003). Auto-assigned if left blank.
                </p>
              </div>

              <div>
                <label htmlFor="reg-email" className="mb-1 block text-xs font-semibold text-body">
                  Email Address
                </label>
                <input
                  id="reg-email"
                  type="email"
                  className="input text-xs"
                  placeholder="crew@vyoma.space"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  autoComplete="email"
                  disabled={busy}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="reg-pass" className="block text-xs font-semibold text-body">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowRegPass((v) => !v)}
                    className="text-[10px] text-muted hover:text-teal flex items-center gap-1 font-medium transition-colors"
                  >
                    {showRegPass ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    <span>{showRegPass ? 'Hide' : 'Show'}</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    id="reg-pass"
                    type={showRegPass ? 'text' : 'password'}
                    className="input text-xs pr-8"
                    placeholder="Min. 8 characters"
                    value={regPass}
                    onChange={(e) => setRegPass(e.target.value)}
                    autoComplete="new-password"
                    disabled={busy}
                  />
                  <KeyRound className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-muted pointer-events-none" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="reg-confirm" className="block text-xs font-semibold text-body">
                    Confirm Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowRegConfirm((v) => !v)}
                    className="text-[10px] text-muted hover:text-teal flex items-center gap-1 font-medium transition-colors"
                  >
                    {showRegConfirm ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    <span>{showRegConfirm ? 'Hide' : 'Show'}</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    id="reg-confirm"
                    type={showRegConfirm ? 'text' : 'password'}
                    className="input text-xs pr-8"
                    placeholder="Re-enter password"
                    value={regConfirm}
                    onChange={(e) => setRegConfirm(e.target.value)}
                    autoComplete="new-password"
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
              {successMsg && (
                <p role="status" className="rounded-lg border border-teal/30 bg-teal/[0.04] p-2.5 text-xs text-teal leading-relaxed">
                  {successMsg}
                </p>
              )}

              <button className="btn-primary w-full text-xs font-semibold" type="submit" disabled={busy}>
                {busy ? (
                  <span className="flex items-center gap-1.5">
                    <span className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Creating Mission Account…
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <UserPlus className="h-4 w-4" /> Create Mission Account
                  </span>
                )}
              </button>

              <p className="text-[10px] text-muted text-center pt-1">
                Your mission profile and telemetry feed will be automatically configured.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
