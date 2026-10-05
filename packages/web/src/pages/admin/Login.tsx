/**
 * Admin sign-in / registration gate — by AjiroDesu.
 * Accounts live in the database; registration requires the server setup
 * key (API_KEY). Passwords are hashed server-side and never stored.
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, UserPlus } from 'lucide-react';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { adminRequest, AdminApiError } from '../../lib/adminApi';
import { Alert } from '../../components/AdminUI';

function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
  placeholder: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="mb-2 block text-[13px] font-medium text-on-surface" htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          className="input-field !pr-11"
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? `Hide ${label}` : `Show ${label}`}
          aria-pressed={show}
          className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-on-surface-variant transition-colors duration-fast hover:bg-surface-container-high hover:text-on-surface"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
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

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-surface px-6 py-12">
      <div className="flex w-full max-w-sm flex-col items-center gap-2 text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/15">
          {mode === 'login' ? (
            <Lock className="h-8 w-8 text-primary" strokeWidth={1.8} />
          ) : (
            <UserPlus className="h-8 w-8 text-primary" strokeWidth={1.8} />
          )}
        </span>
        <h1 className="mt-2 text-xl font-bold tracking-tight text-on-surface">
          {mode === 'login' ? 'Admin Access' : 'Create admin account'}
        </h1>
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-surface-variant">
          Restricted area
        </p>
      </div>

      {mode === 'login' ? (
        <form
          onSubmit={(e) => void submitLogin(e)}
          className="mt-6 w-full max-w-sm rounded-card border border-hairline bg-surface-container-low p-4 shadow-card-rest"
        >
          {error && (
            <div className="mb-3">
              <Alert tone="error" title="Access denied" message={error} />
            </div>
          )}
          <label className="mb-2 block text-[13px] font-medium text-on-surface" htmlFor="admin-username">
            Username
          </label>
          <input
            id="admin-username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            className="input-field"
            placeholder="admin"
          />
          <div className="mt-4">
            <PasswordField
              id="admin-password"
              label="Password"
              value={password}
              onChange={setPassword}
              autoComplete="current-password"
              placeholder="••••••••"
            />
          </div>
          <button type="submit" disabled={busy || !loginValid} className="btn-primary mt-6 h-12 w-full rounded-lg text-[14px] disabled:opacity-[0.38]">
            {busy ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-on-primary/40 border-t-on-primary" />
            ) : (
              <Lock className="h-4 w-4" />
            )}
            {busy ? 'Verifying…' : 'Sign in'}
          </button>
          <button
            type="button"
            onClick={() => switchMode('register')}
            className="mt-3 w-full text-center text-[13px] font-medium text-primary hover:text-primary/80"
          >
            Need an account? Register
          </button>
        </form>
      ) : (
        <form
          onSubmit={(e) => void submitRegister(e)}
          className="mt-6 w-full max-w-sm rounded-card border border-hairline bg-surface-container-low p-4 shadow-card-rest"
        >
          {error && (
            <div className="mb-3">
              <Alert tone="error" title="Registration failed" message={error} />
            </div>
          )}
          <label className="mb-2 block text-[13px] font-medium text-on-surface" htmlFor="reg-username">
            Username
          </label>
          <input
            id="reg-username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            className="input-field"
            placeholder="admin"
          />
          <p className="mt-1 text-xs text-surface-variant">3–32 chars: lowercase letters, digits, _ or -</p>
          <div className="mt-4">
            <PasswordField
              id="reg-password"
              label="Password"
              value={password}
              onChange={setPassword}
              autoComplete="new-password"
              placeholder="Minimum 8 characters"
            />
          </div>
          <div className="mt-4">
            <PasswordField
              id="reg-confirm"
              label="Confirm password"
              value={confirm}
              onChange={setConfirm}
              autoComplete="new-password"
              placeholder="Repeat password"
            />
          </div>
          <div className="mt-4">
            <label className="mb-2 block text-[13px] font-medium text-on-surface" htmlFor="reg-key">
              Setup key
            </label>
            <input
              id="reg-key"
              value={setupKey}
              onChange={(e) => setSetupKey(e.target.value)}
              autoComplete="off"
              className="input-field font-mono text-[13px]"
              placeholder="API_KEY from the server .env"
            />
            <p className="mt-1 text-xs text-surface-variant">Proves you own the server — never stored.</p>
          </div>
          <button type="submit" disabled={busy || !registerValid} className="btn-primary mt-6 h-12 w-full rounded-lg text-[14px] disabled:opacity-[0.38]">
            {busy ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-on-primary/40 border-t-on-primary" />
            ) : (
              <UserPlus className="h-4 w-4" />
            )}
            {busy ? 'Creating…' : 'Create account'}
          </button>
          <button
            type="button"
            onClick={() => switchMode('login')}
            className="mt-3 w-full text-center text-[13px] font-medium text-primary hover:text-primary/80"
          >
            Already have an account? Sign in
          </button>
        </form>
      )}

      <p className="mt-4 text-xs text-surface-variant">
        <Link to="/" className="font-medium text-primary hover:text-primary/80">
          ← Back to site
        </Link>
      </p>
    </div>
  );
}
