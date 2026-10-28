/**
 * Admin settings — site profile, maintenance mode, dashboard leaderboard,
 * masked API keys. By AjiroDesu. Key values are never exposed; only presence
 * is shown.
 */

import { useEffect, useState } from 'react';
import { RotateCcw, Save } from 'lucide-react';
import { adminRequest, AdminApiError } from '../../lib/adminApi';
import type { AdminSettings } from '../../lib/adminTypes';
import { Alert, Dialog, SectionHeader, SuccessNote, Switch } from '../../components/AdminUI';
import { GifFrame } from '../../components/GifFrame';
import { H_SHELL_SCOPE } from '../../lib/shell';
import { cn } from '../../lib/cn';

function Panel({
  title,
  meta,
  children,
}: {
  title: string;
  meta?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="min-w-0 border border-hairline bg-surface-container-low">
      <header className="flex items-center justify-between gap-3 border-b border-hairline px-4 py-2.5">
        <h2 className="min-w-0 truncate font-brand text-title-md uppercase tracking-[0.06em] text-on-surface">
          {title}
        </h2>
        {meta && (
          <span className="shrink-0 font-mono text-[9px] uppercase tracking-[0.14em] text-on-surface-variant/80">
            {meta}
          </span>
        )}
      </header>
      <div className="px-4">{children}</div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5 border-b border-hairline py-4 sm:grid-cols-[9.5rem_minmax(0,1fr)] sm:items-start sm:gap-x-6 sm:gap-y-0">
      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-on-surface-variant sm:pt-2.5">
        {label}
      </span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function AdminSettingsPage() {
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('');
  const [gifUrl, setGifUrl] = useState('');
  const [previewGif, setPreviewGif] = useState('');
  const [telegram, setTelegram] = useState('');
  const [github, setGithub] = useState('');
  const [messenger, setMessenger] = useState('');
  const [maintenance, setMaintenance] = useState(false);
  const [leaderboardEnabled, setLeaderboardEnabled] = useState(true);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);

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
        setGifUrl(s.gifUrl);
        setTelegram(s.telegram);
        setGithub(s.github);
        setMessenger(s.messenger);
        setMaintenance(s.maintenance);
        setLeaderboardEnabled(s.leaderboardEnabled);
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
        body: {
          name,
          description,
          status,
          gifUrl,
          telegram,
          github,
          messenger,
          maintenance,
          leaderboardEnabled,
        },
      });
      setSettings(s);
      setNotice('Settings saved — live immediately, no restart needed');
      // Refresh the public shell's cached config (GIF, name, status) without a reload.
      window.dispatchEvent(new Event('aqua:site-config-updated'));
      // Let an open docs overview re-check the leaderboard's visibility.
      window.dispatchEvent(new Event('aqua:leaderboard-updated'));
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function resetLeaderboard() {
    setResetting(true);
    setNotice(null);
    try {
      await adminRequest('/api/admin/leaderboard/reset', { method: 'POST' });
      setConfirmReset(false);
      setNotice('Leaderboard counters reset — the ranking starts from zero');
      window.dispatchEvent(new Event('aqua:leaderboard-updated'));
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : 'Reset failed');
    } finally {
      setResetting(false);
    }
  }

  // Debounce the preview so typing a URL doesn't fire a request per keystroke.
  useEffect(() => {
    const next = gifUrl.trim();
    const timer = window.setTimeout(() => setPreviewGif(next), 500);
    return () => window.clearTimeout(timer);
  }, [gifUrl]);

  const header = (
    <SectionHeader
      title="Configuration"
      hint="Site identity, public links, maintenance, leaderboard, and key presence."
      right={
        settings ? (
          <button type="button" onClick={() => void save()} disabled={saving} className="btn-primary !min-h-9 !px-4">
            <Save className="h-3 w-3" strokeWidth={1.75} />
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        ) : undefined
      }
    />
  );

  if (loading || !settings) {
    return (
      <div className="flex flex-col gap-5">
        {header}
        <div className="h-[320px] animate-skeleton border border-hairline bg-surface-container-low" />
      </div>
    );
  }

  return (
    <div className="flex animate-fade-in-up flex-col gap-4">
      {header}

      {error && <Alert tone="error" title="Something went wrong" message={error} />}
      {notice && <SuccessNote message={notice} />}

      <Panel title="Site profile" meta="PUBLIC">
        <Row label="Identity">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="min-w-0">
              <label htmlFor="set-name" className="mb-1.5 block font-mono text-[9px] uppercase tracking-[0.12em] text-on-surface-variant/80">
                Name
              </label>
              <input id="set-name" value={name} onChange={(e) => setName(e.target.value)} className="input-field text-[13px]" />
            </div>
            <div className="min-w-0">
              <label htmlFor="set-status" className="mb-1.5 block font-mono text-[9px] uppercase tracking-[0.12em] text-on-surface-variant/80">
                Status line
              </label>
              <input id="set-status" value={status} onChange={(e) => setStatus(e.target.value)} className="input-field text-[13px]" />
            </div>
          </div>
        </Row>

        <Row label="Description">
          <textarea
            id="set-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="input-field resize-y text-[13px]"
          />
        </Row>

        <Row label="Hero GIF">
          <div className="min-w-0 space-y-3">
            <input
              id="set-gif"
              value={gifUrl}
              onChange={(e) => setGifUrl(e.target.value)}
              className="input-field font-mono text-[12px]"
              placeholder="https://…/animation.gif"
            />
            <p className="text-body-sm text-on-surface-variant">
              Direct http(s) link to the landing-page GIF. The frame matches the GIF&apos;s exact aspect
              ratio at every screen size. Leave empty to hide it.
            </p>
            {previewGif !== '' && (
              <div className="max-w-[240px]">
                <GifFrame
                  key={previewGif}
                  src={previewGif}
                  label="PREVIEW / HERO GIF"
                  loading="eager"
                />
              </div>
            )}
          </div>
        </Row>

        <Row label="Channels">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="min-w-0">
              <label htmlFor="set-tg" className="mb-1.5 block font-mono text-[9px] uppercase tracking-[0.12em] text-on-surface-variant/80">
                Telegram
              </label>
              <input id="set-tg" value={telegram} onChange={(e) => setTelegram(e.target.value)} className="input-field font-mono text-[12px]" placeholder="https://…" />
            </div>
            <div className="min-w-0">
              <label htmlFor="set-gh" className="mb-1.5 block font-mono text-[9px] uppercase tracking-[0.12em] text-on-surface-variant/80">
                GitHub
              </label>
              <input id="set-gh" value={github} onChange={(e) => setGithub(e.target.value)} className="input-field font-mono text-[12px]" placeholder="https://…" />
            </div>
            <div className="min-w-0 sm:col-span-2">
              <label htmlFor="set-msg" className="mb-1.5 block font-mono text-[9px] uppercase tracking-[0.12em] text-on-surface-variant/80">
                Messenger
              </label>
              <input id="set-msg" value={messenger} onChange={(e) => setMessenger(e.target.value)} className="input-field font-mono text-[12px]" placeholder="https://…" />
            </div>
          </div>
        </Row>

        <div className="flex items-center justify-between gap-3 py-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.08em] text-on-surface-variant/70">
            Saved changes apply immediately
          </p>
          <span className={H_SHELL_SCOPE}>REV 02</span>
        </div>
      </Panel>

      <Panel title="Maintenance mode" meta="PUBLIC API">
        <div className="flex flex-wrap items-center gap-4 py-4">
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em]">
              <span
                className={cn('h-1.5 w-1.5 rounded-[1px]', maintenance ? 'bg-warning' : 'bg-success')}
                aria-hidden="true"
              />
              <span className={maintenance ? 'text-warning' : 'text-success'}>
                {maintenance ? 'Paused' : 'Live'}
              </span>
            </p>
            <p className="mt-1.5 max-w-xl text-body-sm text-on-surface-variant">
              Pauses the public API with a 503. Dashboard, health probe, and site stay up.
            </p>
          </div>
          <Switch checked={maintenance} onChange={setMaintenance} label="Maintenance mode" />
        </div>
      </Panel>

      <Panel title="Dashboard leaderboard" meta="PUBLIC DOCS">
        <div className="flex flex-wrap items-center gap-4 border-b border-hairline py-4">
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em]">
              <span
                className={cn('h-1.5 w-1.5 rounded-[1px]', leaderboardEnabled ? 'bg-success' : 'bg-on-surface-variant/50')}
                aria-hidden="true"
              />
              <span className={leaderboardEnabled ? 'text-success' : 'text-on-surface-variant'}>
                {leaderboardEnabled ? 'Visible' : 'Hidden'}
              </span>
            </p>
            <p className="mt-1.5 max-w-xl text-body-sm text-on-surface-variant">
              Shows the “Most requested” usage ranking on the main dashboard. Turning it off hides
              the section from the public docs; usage counters keep recording.
            </p>
          </div>
          <Switch
            checked={leaderboardEnabled}
            onChange={setLeaderboardEnabled}
            label="Show API leaderboard on main dashboard"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 py-4">
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-on-surface">
              Reset leaderboard
            </p>
            <p className="mt-1.5 max-w-xl text-body-sm text-on-surface-variant">
              Clears every endpoint call counter so the ranking starts from zero. This cannot be
              undone.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            className="btn-secondary !min-h-9 !px-3"
          >
            <RotateCcw className="h-3 w-3" strokeWidth={1.75} />
            Reset counters
          </button>
        </div>
      </Panel>

      <Panel title="API keys" meta="READ ONLY">
        <div className="border-b border-hairline py-3">
          <p className="text-body-sm text-on-surface-variant">
            Values live in environment variables, never in the dashboard. Only presence is shown.
          </p>
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-hairline py-2 font-mono text-[9px] uppercase tracking-[0.14em] text-on-surface-variant/80">
          <span>KEY</span>
          <span className="text-right">STATE</span>
        </div>
        <ul>
          {Object.entries(settings.keys).map(([key, info]) => (
            <li
              key={key}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-hairline py-2.5 font-mono text-[11px] last:border-b-0"
            >
              <span className="min-w-0 truncate text-on-surface">{key}</span>
              <span className={cn('text-right', info.set ? 'text-success' : 'text-on-surface-variant/60')}>
                {info.set ? info.preview : 'not set'}
              </span>
            </li>
          ))}
        </ul>
        <div className="py-3" />
      </Panel>

      {confirmReset && (
        <Dialog
          title="Reset leaderboard counters"
          onClose={() => setConfirmReset(false)}
          body={
            <p className="text-body-sm text-on-surface-variant">
              Every recorded endpoint call will be deleted and the public ranking will restart from
              zero. This cannot be undone.
            </p>
          }
          actions={
            <>
              <button type="button" onClick={() => setConfirmReset(false)} className="btn-secondary">
                Cancel
              </button>
              <button
                type="button"
                disabled={resetting}
                onClick={() => void resetLeaderboard()}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-button bg-error px-4 font-mono text-[11px] uppercase tracking-[0.08em] text-on-error transition-colors duration-fast hover:bg-error/90 disabled:pointer-events-none disabled:opacity-[0.38]"
              >
                {resetting ? 'Resetting…' : 'Reset counters'}
              </button>
            </>
          }
        />
      )}
    </div>
  );
}
