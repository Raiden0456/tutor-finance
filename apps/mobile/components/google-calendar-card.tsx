import * as React from 'react';
import { Linking, View } from 'react-native';
import { CalendarCheck, ExternalLink, RefreshCw } from 'lucide-react-native';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '~/components/ui/alert-dialog';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Checkbox } from '~/components/ui/checkbox';
import { Icon } from '~/components/ui/icon';
import { Spinner } from '~/components/ui/spinner';
import { Text } from '~/components/ui/text';
import { Notice } from '~/components/notice';
import { api } from '~/lib/api';
import { authClient } from '~/lib/auth-client';
import { useApiQuery } from '~/lib/use-query';
import { useI18n } from '~/lib/i18n';
import { formatDate } from '~/lib/format';
import type { CalendarConnectionStatus } from '~/lib/types';

const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.app.created';

export function GoogleCalendarCard() {
  const { t, locale } = useI18n();
  const status = useApiQuery(() => api.get<CalendarConnectionStatus>('google-calendar/status'), []);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [confirmDisconnect, setConfirmDisconnect] = React.useState(false);
  const [deleteRemote, setDeleteRemote] = React.useState(false);

  const s = status.data;

  const connect = async () => {
    setError(null);
    setBusy(true);
    try {
      await api.post('google-calendar/connect');
      await status.refetch();
    } catch {
      setError(t('Could not connect Google Calendar'));
    } finally {
      setBusy(false);
    }
  };

  const linkGoogle = async () => {
    setError(null);
    setBusy(true);
    try {
      const { error: err } = await authClient.linkSocial({
        provider: 'google',
        scopes: [CALENDAR_SCOPE],
        callbackURL: '/',
      });
      if (err) setError(t('Could not connect Google Calendar'));
      else await status.refetch();
    } catch {
      setError(t('Could not connect Google Calendar'));
    } finally {
      setBusy(false);
    }
  };

  const sync = async () => {
    setError(null);
    setBusy(true);
    try {
      await api.post('google-calendar/sync');
      await status.refetch();
    } catch {
      setError(t('Could not sync Google Calendar'));
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    setError(null);
    setBusy(true);
    try {
      await api.post('google-calendar/disconnect', { deleteRemoteCalendar: deleteRemote });
      setConfirmDisconnect(false);
      await status.refetch();
    } catch {
      setError(t('Could not disconnect Google Calendar'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <View className="flex-row items-center gap-2">
          <Icon as={CalendarCheck} size={18} className="text-primary" />
          <CardTitle>{t('Google Calendar')}</CardTitle>
        </View>
        <CardDescription>
          {t('Sync lessons to your Google Calendar. First, connect a Google account to this profile.')}
        </CardDescription>
      </CardHeader>
      <CardContent className="gap-3">
        <Notice message={error} />

        {status.loading && !s ? (
          <Spinner />
        ) : !s ? null : !s.hasGoogleAccount || !s.hasCalendarScope ? (
          <Button onPress={linkGoogle} disabled={busy}>
            {busy ? <Spinner color="#fff" /> : <Text>{t('Connect Google and Calendar')}</Text>}
          </Button>
        ) : !s.calendarEnabled ? (
          <Button onPress={connect} disabled={busy}>
            {busy ? <Spinner color="#fff" /> : <Text>{t('Finish setup')}</Text>}
          </Button>
        ) : (
          <View className="gap-3">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-medium text-income">{t('Connected')}</Text>
              {s.pendingJobs > 0 ? (
                <Text className="text-xs text-muted-foreground">
                  {t('{count} pending updates', { count: s.pendingJobs })}
                </Text>
              ) : null}
            </View>
            {s.lastSyncedAt ? (
              <Text className="text-xs text-muted-foreground">
                {t('Last sync: {when}', { when: formatDate(s.lastSyncedAt, 'd MMM HH:mm', locale) })}
              </Text>
            ) : null}
            <View className="flex-row flex-wrap gap-2">
              <Button size="sm" variant="secondary" onPress={sync} disabled={busy}>
                <Icon as={RefreshCw} size={15} />
                <Text>{t('Sync Google Calendar now')}</Text>
              </Button>
              {s.calendarUrl ? (
                <Button size="sm" variant="outline" onPress={() => Linking.openURL(s.calendarUrl!)}>
                  <Icon as={ExternalLink} size={15} />
                  <Text>{t('Open in Google Calendar')}</Text>
                </Button>
              ) : null}
            </View>
            <Button size="sm" variant="ghost" onPress={() => setConfirmDisconnect(true)}>
              <Text className="text-destructive">{t('Disconnect')}</Text>
            </Button>
          </View>
        )}
      </CardContent>

      <AlertDialog open={confirmDisconnect} onOpenChange={setConfirmDisconnect}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('Disconnect Google Calendar?')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('Future lesson changes will stop syncing. Existing events stay in Google unless you remove them.')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <View className="flex-row items-center gap-2">
            <Checkbox checked={deleteRemote} onCheckedChange={setDeleteRemote} />
            <Text className="flex-1 text-sm">
              {t('Also delete the Uchetka calendar from my Google account')}
            </Text>
          </View>
          <AlertDialogFooter>
            <AlertDialogCancel>
              <Text>{t('Cancel')}</Text>
            </AlertDialogCancel>
            <AlertDialogAction onPress={disconnect}>
              <Text>{t('Disconnect')}</Text>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
