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
import type { Settings } from '@/lib/types';

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
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
        <p className="text-xs text-muted-foreground">Personalise the app</p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Preferences</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label>Primary currency</Label>
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
            <Label>Language</Label>
            <Select value={locale} onValueChange={(v) => setLocale(v as Settings['locale'])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="ru">Russian (coming soon)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <Button onClick={save} disabled={saving} className="w-full sm:w-auto">
              {saving ? 'Saving…' : 'Save'}
            </Button>
            {saved ? <span className="text-sm text-rp-foam">Saved.</span> : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
