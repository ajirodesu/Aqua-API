/**
 * Admin settings — site profile, maintenance mode, masked API keys.
 * By AjiroDesu. Key values are never exposed; only presence is shown.
 */

import { useEffect, useState } from 'react';
import { KeyRound, Save, Settings2 } from 'lucide-react';
import { adminRequest, AdminApiError } from '../../lib/adminApi';
import type { AdminSettings } from '../../lib/adminTypes';
import { Alert, SectionHeader, SuccessNote, Switch } from '../../components/AdminUI';

export function AdminSettingsPage() {
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('');
  const [telegram, setTelegram] = useState('');
  const [github, setGithub] = useState('');
  const [messenger, setMessenger] = useState('');
  const [maintenance, setMaintenance] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await adminRequest<AdminSettings>('/api/admin/settings');
        if (cancelled) return;
        setSettings(s);
        setName(s.name);
        setDescription(s.description);
        setStatus(s.status);
        setTelegram(s.telegram);
        setGithub(s.github);
        setMessenger(s.messenger);
        setMaintenance(s.maintenance);
      } catch (err) {
        if (!cancelled) setError(err instanceof AdminApiError ? err.message : 'Failed to load settings');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function save() {
    setSaving(true);
    setNotice(null);
    try {
      const s = await adminRequest<AdminSettings>('/api/admin/settings', {
        method: 'PUT',
        body: { name, description, status, telegram, github, messenger, maintenance },
      });
      setSettings(s);
      setNotice('Settings saved — live immediately, no restart needed');
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  if (loading || !settings) {
    return (
      <div className="flex animate-fade-in-up flex-col gap-4">
        <SectionHeader title="Settings" />
        <div className="h-[280px] animate-skeleton rounded-xl border border-hairline bg-surface-container-low" />
      </div>
    );
  }

  return (
    <div className="flex animate-fade-in-up flex-col gap-4">
      <SectionHeader
        title="Settings"
        hint="Site profile, maintenance mode, and key inventory."
        right={
          <button type="button" onClick={() => void save()} disabled={saving} className="btn-primary h-11 rounded-lg !px-5 text-[13px] disabled:opacity-[0.38]">
            <Save className="h-4 w-4" />
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        }
      />

      {error && <Alert tone="error" title="Something went wrong" message={error} />}
      {notice && <SuccessNote message={notice} />}

      <div className="rounded-xl border border-hairline bg-surface-container-low p-4">
        <h2 className="flex items-center gap-2 text-[13px] font-semibold text-on-surface">
          <Settings2 className="h-4 w-4 text-primary" />
          Site profile
        </h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-on-surface" htmlFor="set-name">Name</label>
            <input id="set-name" value={name} onChange={(e) => setName(e.target.value)} className="input-field text-[13px]" />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-on-surface" htmlFor="set-status">Status line</label>
            <input id="set-status" value={status} onChange={(e) => setStatus(e.target.value)} className="input-field text-[13px]" />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-[13px] font-medium text-on-surface" htmlFor="set-desc">Description</label>
            <textarea id="set-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="input-field resize-y text-[13px]" />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-on-surface" htmlFor="set-tg">Telegram</label>
            <input id="set-tg" value={telegram} onChange={(e) => setTelegram(e.target.value)} className="input-field font-mono text-[13px]" placeholder="https://…" />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-on-surface" htmlFor="set-gh">GitHub</label>
            <input id="set-gh" value={github} onChange={(e) => setGithub(e.target.value)} className="input-field font-mono text-[13px]" placeholder="https://…" />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-[13px] font-medium text-on-surface" htmlFor="set-msg">Messenger</label>
            <input id="set-msg" value={messenger} onChange={(e) => setMessenger(e.target.value)} className="input-field font-mono text-[13px]" placeholder="https://…" />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-hairline bg-surface-container-low p-4">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <h2 className="text-[13px] font-semibold text-on-surface">Maintenance mode</h2>
            <p className="mt-0.5 text-[13px] text-on-surface-variant">
              Pauses the public API with a 503. Dashboard, health probe, and site stay up.
            </p>
          </div>
          <Switch checked={maintenance} onChange={setMaintenance} label="Maintenance mode" />
        </div>
      </div>

      <div className="rounded-xl border border-hairline bg-surface-container-low p-4">
        <h2 className="flex items-center gap-2 text-[13px] font-semibold text-on-surface">
          <KeyRound className="h-4 w-4 text-primary" />
          API keys
        </h2>
        <p className="mt-0.5 text-[13px] text-on-surface-variant">
          Read-only inventory — values live in environment variables, never in the dashboard.
        </p>
        <ul className="mt-3 divide-y divide-outline-variant overflow-hidden rounded-input border border-outline-variant">
          {Object.entries(settings.keys).map(([key, info]) => (
            <li key={key} className="flex items-center gap-3 bg-surface-container-high px-3 py-2.5">
              <span className="font-mono text-xs text-on-surface">{key}</span>
              <span className={`ml-auto font-mono text-xs ${info.set ? 'text-success' : 'text-surface-variant'}`}>
                {info.set ? info.preview : 'not set'}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
