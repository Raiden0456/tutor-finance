import { useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SUPPORTED_CURRENCIES, type Currency } from '@tutor-finance/shared';

interface Settings {
  primaryCurrency: Currency;
  theme: 'light' | 'dark' | 'system';
  locale: 'en' | 'ru';
}

interface Props {
  initial: Settings;
}

export function SettingsIsland({ initial }: Props) {
  const [primaryCurrency, setPrimary] = useState<Currency>(initial.primaryCurrency);
  const [theme, setTheme] = useState(initial.theme);
  const [locale, setLocale] = useState(initial.locale);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    setSaved(false);
    await api.patch('/settings/me', { primaryCurrency, theme, locale });
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', theme);
      const resolved =
        theme === 'system'
          ? window.matchMedia('(prefers-color-scheme: dark)').matches
            ? 'dark'
            : 'light'
          : theme;
      document.documentElement.setAttribute('data-theme', resolved);
    }
    setSaving(false);
    setSaved(true);
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label>Primary currency</Label>
            <Select value={primaryCurrency} onValueChange={(v) => setPrimary(v as Currency)}>
              <SelectTrigger className="w-48">
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
            <Label>Theme</Label>
            <Select value={theme} onValueChange={(v) => setTheme(v as Settings['theme'])}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Language</Label>
            <Select value={locale} onValueChange={(v) => setLocale(v as Settings['locale'])}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="ru">Russian (coming soon)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
            {saved ? <span className="text-sm text-emerald-600">Saved.</span> : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
