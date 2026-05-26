import { useState } from 'react';
import { api } from '@/lib/api';
import { changePassword, signOut } from '@/lib/auth-client';
import { BrandMark } from '@/components/app-logo';
import { GitHubSourceLink } from '@/components/github-source-link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapse } from '@/components/ui/collapse';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Check, LogOut } from 'lucide-react';
import { SUPPORTED_CURRENCIES, type Currency, type WeekStartsOn } from '@tutor-finance/shared';
import { createTranslator, I18nProvider, localizePath, type Locale } from '@/lib/i18n';
import type { Settings } from '@/lib/types';

interface Props {
  initial: Settings;
  locale?: Locale;
}

const weekStartOptions: Array<{ value: WeekStartsOn; label: string }> = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 0, label: 'Sunday' },
];

export function SettingsIsland({ initial, locale: appLocale = 'en' }: Props) {
  const t = createTranslator(appLocale);
  const [primaryCurrency, setPrimary] = useState<Currency>(initial.primaryCurrency);
  const [weekStartsOn, setWeekStartsOn] = useState<WeekStartsOn>(initial.weekStartsOn);
  const [theme] = useState(initial.theme);
  const [hasPassword, setHasPassword] = useState(initial.accountSecurity.hasPassword);
  const profileName = initial.profile.name?.trim();
  const profileDisplayName = profileName || initial.profile.email;
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordNotice, setPasswordNotice] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  async function handleSignOut() {
    await signOut();
    window.location.href = localizePath('/login', appLocale);
  }

  async function save() {
    setSaving(true);
    setSaved(false);
    // Read the current theme from localStorage so a toggle made elsewhere isn't overwritten
    const currentTheme =
      (typeof window !== 'undefined'
        ? (localStorage.getItem('theme') as Settings['theme'] | null)
        : null) ?? theme;
    await api.patch('/settings/me', { primaryCurrency, theme: currentTheme, weekStartsOn });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  async function savePassword() {
    if (newPassword !== confirmPassword) {
      setPasswordError(t('Passwords do not match'));
      return;
    }

    setPasswordSaving(true);
    setPasswordError(null);
    setPasswordNotice(null);

    try {
      if (hasPassword) {
        const res = await changePassword({
          currentPassword,
          newPassword,
          revokeOtherSessions: true,
        });
        if (res.error) throw new Error(res.error.message ?? t('Could not update password'));
      } else {
        await api.post('/settings/password/set', { newPassword });
        setHasPassword(true);
      }

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordNotice(hasPassword ? t('Password updated') : t('Password added'));
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : t('Could not update password'));
    } finally {
      setPasswordSaving(false);
    }
  }

  return (
    <I18nProvider locale={appLocale}>
      <div className="page-enter space-y-5">
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm transition-all duration-200 ease-in-out md:hidden">
          <BrandMark className="h-11 w-11 rounded-xl" />
          <div>
            <p className="text-lg font-semibold tracking-tight">Uchetka</p>
            <p className="text-xs text-muted-foreground">{t('Tutor finance tracker')}</p>
          </div>
        </div>

        <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="hidden text-xl font-semibold tracking-tight md:block">
              {t('Settings')}
            </h1>
            <p className="text-xs text-muted-foreground">{t('Personalise the app')}</p>
          </div>
          <GitHubSourceLink />
        </header>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">{t('Profile')}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1 rounded-xl border border-border bg-muted/30 p-3 transition-colors duration-200">
              <span className="text-xs font-medium text-muted-foreground">{t('Name')}</span>
              <span className="truncate text-sm font-semibold">{profileDisplayName}</span>
            </div>
            <div className="grid gap-1 rounded-xl border border-border bg-muted/30 p-3 transition-colors duration-200">
              <span className="text-xs font-medium text-muted-foreground">{t('Email')}</span>
              <span className="truncate text-sm font-semibold">{initial.profile.email}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">{t('Preferences')}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label>{t('Primary currency')}</Label>
              <Select value={primaryCurrency} onValueChange={(v) => setPrimary(v as Currency)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>{t('Week starts on')}</Label>
              <Select
                value={String(weekStartsOn)}
                onValueChange={(v) => setWeekStartsOn(Number(v) as WeekStartsOn)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {weekStartOptions.map((option) => (
                    <SelectItem key={option.value} value={String(option.value)}>
                      {t(option.label)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="pt-2">
              <Button onClick={save} disabled={saving} className="w-full sm:w-auto">
                {saving ? (
                  t('Saving…')
                ) : saved ? (
                  <>
                    <Check className="mr-1.5 h-4 w-4" />
                    {t('Saved')}
                  </>
                ) : (
                  t('Save')
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              {hasPassword ? t('Change password') : t('Add password')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                void savePassword();
              }}
            >
              <p className="text-sm text-muted-foreground transition-colors duration-200">
                {hasPassword
                  ? t('Update your password for email sign-in.')
                  : t('Add a password to sign in with email as well as Google.')}
              </p>

              {hasPassword ? (
                <div className="grid gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
                  <Label htmlFor="current-password">{t('Current password')}</Label>
                  <PasswordInput
                    id="current-password"
                    autoComplete="current-password"
                    required
                    minLength={8}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                </div>
              ) : null}

              <div className="grid gap-2">
                <Label htmlFor="new-password">{t('New password')}</Label>
                <PasswordInput
                  id="new-password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="confirm-new-password">{t('Confirm password')}</Label>
                <PasswordInput
                  id="confirm-new-password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              <Collapse open={!!passwordNotice}>
                <p className="text-sm text-muted-foreground">{passwordNotice}</p>
              </Collapse>

              <Collapse open={!!passwordError}>
                <p role="alert" className="text-sm text-destructive">
                  {passwordError}
                </p>
              </Collapse>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button type="submit" disabled={passwordSaving} className="w-full sm:w-auto">
                  {passwordSaving
                    ? t('Updating…')
                    : hasPassword
                      ? t('Update password')
                      : t('Add password')}
                </Button>
                {hasPassword ? (
                  <a
                    href={localizePath('/forgot-password', appLocale)}
                    className="text-center text-sm text-muted-foreground underline-offset-4 transition-colors duration-200 hover:text-foreground hover:underline sm:text-left"
                  >
                    {t('Forgot password?')}
                  </a>
                ) : null}
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="md:hidden">
          <CardHeader>
            <CardTitle className="text-sm font-medium">{t('Account')}</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              variant="ghost"
              className="w-full justify-start text-destructive hover:text-destructive"
              onClick={handleSignOut}
            >
              <LogOut className="mr-2 h-4 w-4" />
              {t('Sign out')}
            </Button>
          </CardContent>
        </Card>
      </div>
    </I18nProvider>
  );
}
