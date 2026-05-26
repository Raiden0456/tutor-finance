import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CalendarCheck, ExternalLink, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Toggle } from '@/components/ui/toggle';
import { Check } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { authClient } from '@/lib/auth-client';
import { createTranslator, type Locale } from '@/lib/i18n';

const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.app.created';
const EASE = [0.22, 1, 0.36, 1] as const;

interface CalendarStatus {
  hasGoogleAccount: boolean;
  hasCalendarScope: boolean;
  calendarEnabled: boolean;
  calendarUrl: string | null;
  lastSyncedAt: string | null;
  pendingJobs: number;
}

interface Props {
  locale: Locale;
}

export function GoogleCalendarCard({ locale }: Props) {
  const t = useMemo(() => createTranslator(locale), [locale]);
  const [status, setStatus] = useState<CalendarStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [syncBusy, setSyncBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteRemote, setDeleteRemote] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await api.get<CalendarStatus>('/google-calendar/status');
      setStatus(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('Could not load calendar status'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const finalize = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await api.post('/google-calendar/connect');
      await refresh();
    } catch (err) {
      setError(extractError(err, t('Could not enable Google Calendar sync')));
    } finally {
      setBusy(false);
    }
  }, [refresh, t]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (url.searchParams.get('calendar') !== 'connected') return;
    url.searchParams.delete('calendar');
    window.history.replaceState({}, '', url.toString());
    void finalize();
  }, [finalize]);

  async function linkAndConnect() {
    setBusy(true);
    setError(null);
    try {
      const callbackURL = `${window.location.pathname}?calendar=connected`;
      const res = await authClient.linkSocial({
        provider: 'google',
        scopes: [CALENDAR_SCOPE],
        callbackURL,
      });
      if (res?.error) {
        throw new Error(res.error.message ?? t('Could not connect Google Calendar'));
      }
    } catch (err) {
      setBusy(false);
      setError(extractError(err, t('Could not connect Google Calendar')));
    }
  }

  async function syncNow() {
    setSyncBusy(true);
    setError(null);
    try {
      await api.post('/google-calendar/sync');
      await refresh();
    } catch (err) {
      setError(extractError(err, t('Could not sync Google Calendar')));
    } finally {
      setSyncBusy(false);
    }
  }

  async function disconnect() {
    setBusy(true);
    setError(null);
    setConfirmOpen(false);
    try {
      await api.post('/google-calendar/disconnect', { deleteRemoteCalendar: deleteRemote });
      await refresh();
    } catch (err) {
      setError(extractError(err, t('Could not disconnect Google Calendar')));
    } finally {
      setBusy(false);
      setDeleteRemote(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <CalendarCheck className="h-4 w-4" />
          {t('Google Calendar')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <AnimatePresence mode="wait" initial={false}>
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, ease: EASE }}
              className="flex items-center gap-2 text-sm text-muted-foreground"
            >
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('Loading')}…
            </motion.div>
          ) : status ? (
            <motion.div
              key={describeState(status)}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: EASE }}
              className="space-y-3"
            >
              {renderBody({
                status,
                busy,
                syncBusy,
                t,
                linkAndConnect,
                finalize,
                syncNow,
                openConfirm: () => setConfirmOpen(true),
              })}
            </motion.div>
          ) : null}
        </AnimatePresence>

        <AnimatePresence>
          {error ? (
            <motion.p
              key="err"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.18, ease: EASE }}
              role="alert"
              className="mt-3 overflow-hidden text-sm text-destructive"
            >
              {error}
            </motion.p>
          ) : null}
        </AnimatePresence>
      </CardContent>

      <Dialog
        open={confirmOpen}
        onOpenChange={(open) => {
          setConfirmOpen(open);
          if (!open) setDeleteRemote(false);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Disconnect Google Calendar?')}</DialogTitle>
            <DialogDescription>
              {t(
                'Future lesson changes will stop syncing. Existing events stay in Google unless you remove them.',
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-3 transition-colors duration-200">
            <Toggle
              variant="outline"
              size="sm"
              pressed={deleteRemote}
              onPressedChange={setDeleteRemote}
              aria-label={t('Also delete the Uchetka calendar from my Google account')}
              className="shrink-0"
            >
              <Check
                className={`h-3.5 w-3.5 transition-opacity duration-200 ${deleteRemote ? 'opacity-100' : 'opacity-0'}`}
              />
            </Toggle>
            <span className="text-sm leading-relaxed">
              {t('Also delete the Uchetka calendar from my Google account')}
            </span>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              {t('Cancel')}
            </Button>
            <Button variant="destructive" disabled={busy} onClick={() => void disconnect()}>
              {t('Disconnect')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function describeState(status: CalendarStatus): string {
  if (!status.hasGoogleAccount) return 'no-google';
  if (!status.hasCalendarScope) return 'no-scope';
  if (!status.calendarEnabled) return 'scope-only';
  return 'connected';
}

function renderBody({
  status,
  busy,
  syncBusy,
  t,
  linkAndConnect,
  finalize,
  syncNow,
  openConfirm,
}: {
  status: CalendarStatus;
  busy: boolean;
  syncBusy: boolean;
  t: (k: string) => string;
  linkAndConnect: () => void;
  finalize: () => void;
  syncNow: () => void;
  openConfirm: () => void;
}) {
  if (!status.hasGoogleAccount) {
    return (
      <>
        <p className="text-sm text-muted-foreground">
          {t(
            'Sync lessons to your Google Calendar. First, connect a Google account to this profile.',
          )}
        </p>
        <Button onClick={linkAndConnect} disabled={busy} className="w-full sm:w-auto">
          {busy ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('Opening Google…')}
            </>
          ) : (
            t('Connect Google and Calendar')
          )}
        </Button>
      </>
    );
  }

  if (!status.hasCalendarScope) {
    return (
      <>
        <p className="text-sm text-muted-foreground">
          {t(
            'Grant access to a dedicated calendar so lessons can be added automatically. We only manage the calendar we create.',
          )}
        </p>
        <Button onClick={linkAndConnect} disabled={busy} className="w-full sm:w-auto">
          {busy ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('Opening Google…')}
            </>
          ) : (
            t('Connect Google Calendar')
          )}
        </Button>
      </>
    );
  }

  if (!status.calendarEnabled) {
    if (busy) {
      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t('Finishing setup…')}
        </div>
      );
    }
    return (
      <>
        <p className="text-sm text-muted-foreground">
          {t('Calendar scope granted. Tap Finish to create the calendar.')}
        </p>
        <Button onClick={finalize} disabled={busy} className="w-full sm:w-auto">
          {t('Finish setup')}
        </Button>
      </>
    );
  }

  return (
    <>
      <div className="flex gap-3 rounded-xl border border-border bg-muted/30 p-3 transition-colors justify-center items-center duration-200">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{t('Connected')}</p>
          <p className="text-xs text-muted-foreground">
            {status.lastSyncedAt
              ? t('Last sync: {when}').replace('{when}', formatRelative(status.lastSyncedAt))
              : t('Backfilling future lessons…')}
          </p>
          {status.pendingJobs > 0 ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {t('{count} pending updates').replace('{count}', String(status.pendingJobs))}
            </p>
          ) : null}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={busy || syncBusy}
          aria-label={t('Sync Google Calendar now')}
          title={t('Sync Google Calendar now')}
          onClick={syncNow}
          className="-mt-1 rounded-full text-muted-foreground transition-all duration-200 hover:text-foreground"
        >
          <RefreshCw
            className={`h-4 w-4 transition-transform duration-300 ${syncBusy ? 'animate-spin' : ''}`}
          />
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {status.calendarUrl ? (
          <a
            href={status.calendarUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 transition-colors duration-200 hover:text-foreground hover:underline"
          >
            {t('Open in Google Calendar')}
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        ) : null}
        <div className="grow" />
        <Button variant="outline" disabled={busy} onClick={openConfirm}>
          {t('Disconnect')}
        </Button>
      </div>
    </>
  );
}

function extractError(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    if (err.body && typeof err.body === 'object' && 'message' in err.body) {
      const msg = (err.body as { message?: unknown }).message;
      if (typeof msg === 'string') return msg;
    }
    return err.message || fallback;
  }
  return err instanceof Error ? err.message : fallback;
}

function formatRelative(iso: string): string {
  const date = new Date(iso);
  const diff = Date.now() - date.getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return date.toLocaleString();
}
