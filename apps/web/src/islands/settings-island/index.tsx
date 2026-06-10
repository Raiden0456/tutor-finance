import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { api } from '@/lib/api';
import { changePassword, signOut } from '@/lib/auth-client';
import { BrandMark } from '@/components/app-logo';
import { GitHubSourceLink } from '@/components/github-source-link';
import { type Currency, type WeekStartsOn } from '@tutor-finance/shared';
import { createTranslator, I18nProvider, localizePath, type Locale } from '@/lib/i18n';
import type { Settings } from '@/lib/types';
import { TabSwitcher } from '../transactions-island/tab-switcher';
import { AccountTab } from './account-tab';
import { PreferencesTab } from './preferences-tab';
import { SecurityTab } from './security-tab';

interface Props {
  initial: Settings;
  locale?: Locale;
}

type SettingsTab = 'account' | 'security' | 'preferences';

const EASE = [0.22, 1, 0.36, 1] as const;

export function SettingsIsland({ initial, locale: appLocale = 'en' }: Props) {
  const t = createTranslator(appLocale);
  const [activeTab, setActiveTab] = useState<SettingsTab>('account');
  const [primaryCurrency, setPrimary] = useState<Currency>(initial.primaryCurrency);
  const [weekStartsOn, setWeekStartsOn] = useState<WeekStartsOn>(initial.weekStartsOn);
  const [lessonReminderMinutes, setLessonReminderMinutes] = useState<number>(
    initial.lessonReminderMinutes ?? 30,
  );
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
    await api.patch('/settings/me', {
      primaryCurrency,
      theme: currentTheme,
      weekStartsOn,
      lessonReminderMinutes,
    });
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

        <div className="space-y-4">
          <TabSwitcher<SettingsTab>
            value={activeTab}
            onChange={setActiveTab}
            groupId="settings-main"
            tabs={[
              { key: 'account', label: t('Account') },
              { key: 'security', label: t('Security') },
              { key: 'preferences', label: t('Preferences') },
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
              {activeTab === 'account' ? (
                <AccountTab
                  initial={initial}
                  profileDisplayName={profileDisplayName}
                  t={t}
                  onSignOut={handleSignOut}
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
                  saving={saving}
                  saved={saved}
                  t={t}
                  onPrimaryCurrencyChange={setPrimary}
                  onWeekStartsOnChange={setWeekStartsOn}
                  onLessonReminderChange={setLessonReminderMinutes}
                  onSave={() => void save()}
                />
              ) : null}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </I18nProvider>
  );
}
