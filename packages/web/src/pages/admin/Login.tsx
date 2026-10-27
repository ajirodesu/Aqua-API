/**
 * Admin sign-in / registration gate — by AjiroDesu.
 * Accounts live in the database; registration requires the server setup
 * key (API_KEY). Passwords are hashed server-side and never stored.
 * The screen is a printed form: ruled rows, mono labels, no floating card.
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, UserPlus } from 'lucide-react';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { adminRequest, AdminApiError } from '../../lib/adminApi';
import { Alert } from '../../components/AdminUI';
import { cn } from '../../lib/cn';
import { H_BRAND_TEXT, H_HEIGHT, H_SHELL_SCOPE } from '../../lib/shell';

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5 border-b border-hairline py-5 sm:grid-cols-[9.5rem_minmax(0,1fr)] sm:items-start sm:gap-x-6 sm:gap-y-0">
      <label
        htmlFor={htmlFor}
        className="font-mono text-[10px] uppercase tracking-[0.16em] text-on-surface-variant sm:pt-2.5"
      >
        {label}
      </label>
      <div className="min-w-0">
        {children}
        {hint && (
          <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-on-surface-variant/80">
            {hint}
          </p>
        )}
      </div>
    </div>
  );
}

function PasswordInput({
  id,
  value,
  onChange,
  autoComplete,
  placeholder,
  label,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
  placeholder: string;
  label: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        className="input-field !pr-12 font-mono text-[13px]"
        placeholder={placeholder}
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        aria-label={show ? `Hide ${label}` : `Show ${label}`}
        aria-pressed={show}
        className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-[var(--radius-compact)] text-on-surface-variant transition-colors duration-fast hover:bg-on-surface/[0.08] hover:text-on-surface focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
      >
        {show ? <EyeOff className="h-4 w-4" strokeWidth={1.75} /> : <Eye className="h-4 w-4" strokeWidth={1.75} />}
      </button>
    </div>
  );
}

export function AdminLogin() {
  const { login } = useAdminAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [setupKey, setSetupKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function switchMode(next: 'login' | 'register') {
    setMode(next);
    setError(null);
    setPassword('');
    setConfirm('');
    setSetupKey('');
  }

  async function submitLogin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(username.trim(), password);
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : 'Sign-in failed');
    } finally {
      setBusy(false);
    }
  }

  async function submitRegister(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await adminRequest<{ token: string; username: string }>(
        '/api/admin/register',
        {
          method: 'POST',
          body: { username: username.trim(), password, setupKey: setupKey.trim() },
          auth: false,
        }
      );
      await login(res.username, password);
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : 'Registration failed');
    } finally {
      setBusy(false);
    }
  }

  const loginValid = username.trim() !== '' && password !== '';
  const registerValid =
    username.trim() !== '' && password.length >= 8 && confirm !== '' && setupKey.trim() !== '';

  const meta = [
    { label: 'ACCESS', value: 'Restricted' },
    { label: 'SESSION', value: 'Bearer token' },
    { label: 'STORAGE', value: 'Server-side' },
    { label: 'MODE', value: mode === 'login' ? 'Sign in' : 'Register' },
  ];

  return (
    <div className="flex min-h-[100dvh] flex-col bg-surface text-on-surface">
      {/* Masthead — public mark + ADMIN scope + restricted notice */}
      <header className="border-b border-hairline">
        <div
          className={cn(
            'mx-auto flex w-full max-w-[var(--layout-nav-max)] items-center justify-between gap-3 px-[var(--layout-section-px)]',
            H_HEIGHT
          )}
        >
          <div className="flex min-w-0 items-center gap-3">
            <Link
              to="/"
              aria-label="Aqua API home"
              className="flex items-center gap-2 text-primary transition-opacity duration-fast hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <img src="/icon.png" alt="" className="h-5 w-5 rounded-[2px] object-contain" />
              <span className={cn(H_BRAND_TEXT, 'text-on-surface')}>AQUA</span>
            </Link>
            <span aria-hidden="true" className="h-3 w-px shrink-0 bg-hairline" />
            <span className={H_SHELL_SCOPE}>ADMIN</span>
          </div>

          <span className={cn(H_SHELL_SCOPE, 'text-right')}>RESTRICTED ACCESS</span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[var(--layout-nav-max)] flex-1 px-[var(--layout-section-px)] py-10 md:py-16">
        <div className="grid gap-0 lg:grid-cols-12">
          {/* Document header — numbered section + metadata ledger */}
          <header className="min-w-0 border-b border-hairline pb-8 lg:col-span-5 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-10">
            <div className="rule-label max-w-[15rem]">01 / ACCESS</div>

            <h1 className="mt-6 font-brand text-display-sm uppercase text-on-surface">
              {mode === 'login' ? 'Operator sign-in' : 'New operator'}
            </h1>

            <p className="mt-4 max-w-[38ch] text-body-md text-on-surface-variant">
              {mode === 'login'
                ? 'Enter your credentials to open the administration console.'
                : 'Create an account using the server setup key. No invitation is required.'}
            </p>

            <dl className="mt-10 hidden border-t border-hairline lg:block">
              {meta.map((row) => (
                <div
                  key={row.label}
                  className="flex items-baseline justify-between gap-4 border-b border-hairline py-3"
                >
                  <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-on-surface-variant/80">
                    {row.label}
                  </dt>
                  <dd className="text-right font-mono text-[10px] uppercase tracking-[0.1em] text-on-surface">
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
          </header>

          <div className="min-w-0 pt-8 lg:col-span-7 lg:pl-10 lg:pt-0">
            {/* Mode ledger tabs */}
            <div className="flex border-y border-hairline" role="tablist" aria-label="Access mode">
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'login'}
                onClick={() => switchMode('login')}
                className={cn(
                  '-mb-px flex h-11 flex-1 items-center justify-center border-b-2 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors duration-fast focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary',
                  mode === 'login'
                    ? 'border-primary text-on-surface'
                    : 'border-transparent text-on-surface-variant hover:text-on-surface'
                )}
              >
                01 / Sign in
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'register'}
                onClick={() => switchMode('register')}
                className={cn(
                  '-mb-px flex h-11 flex-1 items-center justify-center border-b-2 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors duration-fast focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary',
                  mode === 'register'
                    ? 'border-primary text-on-surface'
                    : 'border-transparent text-on-surface-variant hover:text-on-surface'
                )}
              >
                02 / Register
              </button>
            </div>

            {error && (
              <div className="pt-5">
                <Alert
                  tone="error"
                  title={mode === 'login' ? 'Access denied' : 'Registration failed'}
                  message={error}
                />
              </div>
            )}

            {mode === 'login' ? (
              <form onSubmit={(e) => void submitLogin(e)} noValidate>
                <Field label="Username" htmlFor="admin-username">
                  <input
                    id="admin-username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    className="input-field font-mono text-[13px]"
                    placeholder="admin"
                  />
                </Field>

                <Field label="Password" htmlFor="admin-password">
                  <PasswordInput
                    id="admin-password"
                    label="Password"
                    value={password}
                    onChange={setPassword}
                    autoComplete="current-password"
                    placeholder="••••••••"
                  />
                </Field>

                <div className="flex flex-col gap-3 py-5">
                  <button type="submit" disabled={busy || !loginValid} className="btn-primary min-h-12 w-full">
                    {busy ? (
                      <span className="h-3.5 w-3.5 animate-spin rounded-[1px] border border-on-primary/40 border-t-on-primary" />
                    ) : (
                      <Lock className="h-3.5 w-3.5" strokeWidth={1.75} />
                    )}
                    {busy ? 'Verifying…' : 'Open console'}
                  </button>
                  <button
                    type="button"
                    onClick={() => switchMode('register')}
                    className="font-mono text-[10px] uppercase tracking-[0.1em] text-primary transition-colors duration-fast hover:text-primary/80"
                  >
                    Need an account? Register
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={(e) => void submitRegister(e)} noValidate>
                <Field
                  label="Username"
                  htmlFor="reg-username"
                  hint="3–32 chars: lowercase letters, digits, _ or -"
                >
                  <input
                    id="reg-username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    className="input-field font-mono text-[13px]"
                    placeholder="admin"
                  />
                </Field>

                <Field label="Password" htmlFor="reg-password" hint="Minimum 8 characters">
                  <PasswordInput
                    id="reg-password"
                    label="Password"
                    value={password}
                    onChange={setPassword}
                    autoComplete="new-password"
                    placeholder="Minimum 8 characters"
                  />
                </Field>

                <Field label="Confirm" htmlFor="reg-confirm">
                  <PasswordInput
                    id="reg-confirm"
                    label="Confirm password"
                    value={confirm}
                    onChange={setConfirm}
                    autoComplete="new-password"
                    placeholder="Repeat password"
                  />
                </Field>

                <Field
                  label="Setup key"
                  htmlFor="reg-key"
                  hint="Proves you own the server — never stored."
                >
                  <input
                    id="reg-key"
                    value={setupKey}
                    onChange={(e) => setSetupKey(e.target.value)}
                    autoComplete="off"
                    className="input-field font-mono text-[13px]"
                    placeholder="API_KEY from the server .env"
                  />
                </Field>

                <div className="flex flex-col gap-3 py-5">
                  <button type="submit" disabled={busy || !registerValid} className="btn-primary min-h-12 w-full">
                    {busy ? (
                      <span className="h-3.5 w-3.5 animate-spin rounded-[1px] border border-on-primary/40 border-t-on-primary" />
                    ) : (
                      <UserPlus className="h-3.5 w-3.5" strokeWidth={1.75} />
                    )}
                    {busy ? 'Creating…' : 'Create account'}
                  </button>
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className="font-mono text-[10px] uppercase tracking-[0.1em] text-primary transition-colors duration-fast hover:text-primary/80"
                  >
                    Already have an account? Sign in
                  </button>
                </div>
              </form>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-hairline pt-4">
              <Link
                to="/"
                className="font-mono text-[10px] uppercase tracking-[0.1em] text-on-surface-variant transition-colors duration-fast hover:text-on-surface"
              >
                ← Back to site
              </Link>
              <span className={cn(H_SHELL_SCOPE, 'text-right')}>SESSION / TOKEN</span>
            </div>
          </div>
        </div>
      </main>

      <div className="border-t border-hairline">
        <div className="mx-auto flex w-full max-w-[var(--layout-nav-max)] items-center justify-between gap-3 px-[var(--layout-section-px)] py-4">
          <span className={H_SHELL_SCOPE}>AQUA / ADMIN CONSOLE</span>
          <span className={cn(H_SHELL_SCOPE, 'text-right')}>ONLY AUTHORISED OPERATORS</span>
        </div>
      </div>
    </div>
  );
}
