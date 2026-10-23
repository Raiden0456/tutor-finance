import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { api } from '@/lib/api';
import { changePassword } from '@/lib/auth-client';
import { BrandMark } from '@/components/app-logo';
import { GitHubSourceLink } from '@/components/github-source-link';
import { PageHeader } from '@/components/layout/page-header';
import { signOutAndRedirect } from '@/components/sign-out-button';
import { GoogleCalendarCard } from '@/islands/google-calendar-card';
import { AiSettingsCard } from '@/features/assistant';
import { applyTheme, readTheme, type Theme } from '@/utils/theme';
import { type AiLanguage, type Currency, type WeekStartsOn } from '@tutor-finance/shared';
import { createTranslator, I18nProvider, localizePath, type Locale } from '@/lib/i18n';
import type { Settings } from '@/lib/types';
import { syncClientSettings } from '@/lib/settings-sync';
import { useMutation } from '@/hooks/use-mutation';
import { TabSwitcher } from '@/components/tab-switcher';
import { AccountTab } from './account-tab';
import { PreferencesTab } from './preferences-tab';
import { SecurityTab } from './security-tab';

interface Props {
  initial: Settings;
  locale?: Locale;
}

type SettingsTab = 'profile' | 'preferences' | 'security' | 'integrations';

const EASE = [0.22, 1, 0.36, 1] as const;

export function SettingsIsland({ locale = 'en', initial }: Props) {
  return (
    <I18nProvider locale={locale}>
      <SettingsContent initial={initial} appLocale={locale} />
    </I18nProvider>
  );
}

function SettingsContent({ initial, appLocale }: { initial: Settings; appLocale: Locale }) {
  const t = createTranslator(appLocale);
  const { run } = useMutation();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [primaryCurrency, setPrimary] = useState<Currency>(initial.primaryCurrency);
  const [weekStartsOn, setWeekStartsOn] = useState<WeekStartsOn>(initial.weekStartsOn);
  const [aiLanguage, setAiLanguage] = useState<AiLanguage>(initial.aiLanguage ?? 'auto');
  const [lessonReminderMinutes, setLessonReminderMinutes] = useState<number>(
    initial.lessonReminderMinutes ?? 30,
  );
  const [theme, setTheme] = useState<Theme>(initial.theme);
  const [timezone, setTimezone] = useState(initial.timezone);
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

  useEffect(() => {
    setTheme(readTheme());
    const params = new URL(window.location.href).searchParams;
    if (params.has('calendar') || params.has('ai_chatgpt') || params.get('tab') === 'integrations')
      setActiveTab('integrations');
  }, []);

  useEffect(() => {
    syncClientSettings(appLocale)
      .then((synced) => synced && setTimezone(synced.timezone))
      .catch(() => undefined);
  }, [appLocale]);

  async function save() {
    setSaving(true);
    setSaved(false);
    const ok = await run(() =>
      api.patch('/settings/me', {
        primaryCurrency,
        weekStartsOn,
        lessonReminderMinutes,
        aiLanguage,
      }),
    );
    setSaving(false);
    if (!ok) return;
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function changeTheme(next: Theme) {
    setTheme(next);
    applyTheme(next);
    void run(() => api.patch('/settings/me', { theme: next }));
  }

  async function changeLocale(next: Locale) {
    if (next === appLocale) return;
    const ok = await run(() => api.patch('/settings/me', { locale: next }));
    if (ok) window.location.href = localizePath('/settings', next);
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
    <div className="page-enter space-y-5">
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm transition-all duration-200 ease-in-out md:hidden">
        <BrandMark className="h-11 w-11 rounded-xl" />
        <div>
          <p className="text-lg font-semibold tracking-tight">Uchetka</p>
          <p className="text-xs text-muted-foreground">{t('Tutor finance tracker')}</p>
        </div>
      </div>

      <PageHeader
        title={t('Settings')}
        subtitle={t('Personalise the app')}
        action={<GitHubSourceLink />}
      />

      <div className="space-y-4">
        <TabSwitcher<SettingsTab>
          value={activeTab}
          onChange={setActiveTab}
          groupId="settings-main"
          tabs={[
            { key: 'profile', label: t('Profile') },
            { key: 'preferences', label: t('Preferences') },
            { key: 'security', label: t('Security') },
            { key: 'integrations', label: t('Integrations') },
          ]}
        />

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: EASE }}
          >
            {activeTab === 'profile' ? (
              <AccountTab
                initial={initial}
                profileDisplayName={profileDisplayName}
                t={t}
                onSignOut={() => void signOutAndRedirect(appLocale)}
              />
            ) : null}

            {activeTab === 'security' ? (
              <SecurityTab
                hasPassword={hasPassword}
                currentPassword={currentPassword}
                newPassword={newPassword}
                confirmPassword={confirmPassword}
                passwordSaving={passwordSaving}
                passwordNotice={passwordNotice}
                passwordError={passwordError}
                appLocale={appLocale}
                t={t}
                localizePath={localizePath}
                onCurrentPasswordChange={setCurrentPassword}
                onNewPasswordChange={setNewPassword}
                onConfirmPasswordChange={setConfirmPassword}
                onSavePassword={() => void savePassword()}
              />
            ) : null}

            {activeTab === 'preferences' ? (
              <PreferencesTab
                appLocale={appLocale}
                primaryCurrency={primaryCurrency}
                weekStartsOn={weekStartsOn}
                lessonReminderMinutes={lessonReminderMinutes}
                timezone={timezone}
                aiLanguage={aiLanguage}
                theme={theme}
                saving={saving}
                saved={saved}
                t={t}
                onPrimaryCurrencyChange={setPrimary}
                onWeekStartsOnChange={setWeekStartsOn}
                onLessonReminderChange={setLessonReminderMinutes}
                onAiLanguageChange={setAiLanguage}
                onThemeChange={changeTheme}
                onLocaleChange={(next) => void changeLocale(next)}
                onSave={() => void save()}
              />
            ) : null}

            {activeTab === 'integrations' ? (
              <div className="space-y-4">
                <GoogleCalendarCard locale={appLocale} />
                <AiSettingsCard />
              </div>
            ) : null}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
